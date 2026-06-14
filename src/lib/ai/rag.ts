// Lightweight, offline-first RAG over the ontology graph.
//
// The graph is chunked into one short "document" per entity (class, property,
// individual). Retrieval is lexical (TF-IDF-style term overlap) plus a
// graph-expansion pass that pulls in directly connected entities — so asking
// about one individual also surfaces its neighbours. No embedding model and no
// network: everything runs in the browser, and the chunk index persists in
// IndexedDB (see storage/db.ts).

import type { Ontology } from '../ontology/types';

export type ChunkKind = 'class' | 'objectProperty' | 'dataProperty' | 'individual';

export interface GraphChunk {
  key: string;          // `${ontologyId}::${entityId}` — IndexedDB primary key
  ontologyId: string;   // indexed in IndexedDB
  kind: ChunkKind;
  entityId: string;
  label: string;
  text: string;         // human-readable serialization fed to the LLM
  terms: string[];      // pre-tokenized terms for lexical scoring
  neighbors: string[];  // entityIds of directly related entities
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'with', 'that', 'this', 'has', 'have', 'was', 'who',
  'what', 'which', 'how', 'does', 'did', 'can', 'you', 'tell', 'show', 'give', 'about',
  'from', 'into', 'all', 'any', 'its', 'their', 'them', 'they', 'a', 'an', 'of', 'to',
  'in', 'on', 'is', 'it', 'or', 'be', 'as', 'do', 'me', 'my',
]);

const OVERVIEW_TERMS = new Set([
  'summary', 'summarize', 'summarise', 'overview', 'describe', 'structure',
  'everything', 'whole', 'entire', 'list', 'main',
]);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

// ── Serialization ────────────────────────────────────────────────────────────

export function serializeOntologyToChunks(onto: Ontology): GraphChunk[] {
  const labelOf = (id: string): string =>
    onto.classes[id]?.label ??
    onto.objectProperties[id]?.label ??
    onto.dataProperties[id]?.label ??
    onto.annotationProperties[id]?.label ??
    onto.individuals[id]?.label ??
    id;

  const chunks: GraphChunk[] = [];
  const push = (kind: ChunkKind, entityId: string, label: string, text: string, neighbors: string[]) => {
    chunks.push({
      key: `${onto.id}::${entityId}`,
      ontologyId: onto.id,
      kind,
      entityId,
      label,
      text,
      terms: tokenize(`${label} ${text}`),
      neighbors: [...new Set(neighbors.filter(Boolean))],
    });
  };

  // Classes
  for (const c of Object.values(onto.classes)) {
    if (c.id === 'owl_Thing') continue;
    const parents = c.subClassOf.filter((p) => p !== 'owl_Thing').map(labelOf);
    const children = Object.values(onto.classes).filter((x) => x.subClassOf.includes(c.id)).map((x) => x.label);
    const disjoint = c.disjointWith.map(labelOf);
    const comment = c.annotations.find((a) => a.property === 'rdfs:comment')?.value;
    let text = `Class "${c.label}".`;
    if (parents.length) text += ` Subclass of: ${parents.join(', ')}.`;
    if (children.length) text += ` Has subclasses: ${children.join(', ')}.`;
    if (disjoint.length) text += ` Disjoint with: ${disjoint.join(', ')}.`;
    if (comment) text += ` ${comment}`;
    push('class', c.id, c.label, text, [
      ...c.subClassOf, ...c.disjointWith,
      ...Object.values(onto.classes).filter((x) => x.subClassOf.includes(c.id)).map((x) => x.id),
    ]);
  }

  // Object properties
  for (const p of Object.values(onto.objectProperties)) {
    const dom = p.domain.map(labelOf);
    const ran = p.range.map(labelOf);
    let text = `Object property "${p.label}" — a relationship`;
    if (dom.length) text += ` from ${dom.join('/')}`;
    if (ran.length) text += ` to ${ran.join('/')}`;
    text += '.';
    if (p.characteristics.length) text += ` Characteristics: ${p.characteristics.join(', ')}.`;
    if (p.inverseOf) text += ` Inverse of: ${labelOf(p.inverseOf)}.`;
    push('objectProperty', p.id, p.label, text, [...p.domain, ...p.range, ...(p.inverseOf ? [p.inverseOf] : [])]);
  }

  // Data properties
  for (const p of Object.values(onto.dataProperties)) {
    const dom = p.domain.map(labelOf);
    let text = `Data property "${p.label}" — an attribute`;
    if (dom.length) text += ` of ${dom.join('/')}`;
    text += ` with value type ${p.range.join(', ') || 'xsd:string'}.`;
    if (p.characteristics.length) text += ` Characteristics: ${p.characteristics.join(', ')}.`;
    push('dataProperty', p.id, p.label, text, [...p.domain]);
  }

  // Individuals
  for (const i of Object.values(onto.individuals)) {
    const types = i.types.map(labelOf);
    let text = `Individual "${i.label}"`;
    if (types.length) text += `, a ${types.join(' and ')}`;
    text += '.';
    const neighbors: string[] = [...i.types];
    for (const a of i.objectPropertyAssertions) {
      text += ` ${labelOf(a.property)} ${labelOf(a.target)}.`;
      neighbors.push(a.property, a.target);
    }
    for (const a of i.dataPropertyAssertions) {
      text += ` ${labelOf(a.property)}: "${a.value}".`;
      neighbors.push(a.property);
    }
    push('individual', i.id, i.label, text, neighbors);
  }

  return chunks;
}

// ── Retrieval ────────────────────────────────────────────────────────────────

export interface RetrieveOptions {
  maxChunks?: number;
  seeds?: number;
}

export function retrieve(
  query: string,
  chunks: GraphChunk[],
  { maxChunks = 14, seeds = 6 }: RetrieveOptions = {},
): GraphChunk[] {
  if (chunks.length === 0) return [];
  const qTerms = tokenize(query);
  const overview = qTerms.some((t) => OVERVIEW_TERMS.has(t));

  // For a summary/overview, prefer the schema (classes + properties) — that's
  // the most useful context for "describe this ontology".
  if (overview || qTerms.length === 0) {
    const order: ChunkKind[] = ['class', 'objectProperty', 'dataProperty', 'individual'];
    return [...chunks]
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
      .slice(0, maxChunks);
  }

  // Document frequency for IDF weighting.
  const df = new Map<string, number>();
  for (const c of chunks) for (const t of new Set(c.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = chunks.length;
  const idf = (t: string) => Math.log(1 + N / (1 + (df.get(t) ?? 0)));

  const score = (c: GraphChunk): number => {
    const termSet = new Set(c.terms);
    const labelSet = new Set(tokenize(c.label));
    let s = 0;
    for (const qt of qTerms) {
      if (termSet.has(qt)) s += idf(qt);
      if (labelSet.has(qt)) s += 0.75; // boost direct label hits
    }
    return s;
  };

  const scored = chunks
    .map((c) => ({ c, s: score(c) }))
    .sort((a, b) => b.s - a.s);

  const byEntity = new Map(chunks.map((c) => [c.entityId, c] as const));
  const chosen = new Map<string, GraphChunk>();

  // Seeds: top lexical hits.
  for (const { c, s } of scored) {
    if (s <= 0 || chosen.size >= seeds) break;
    chosen.set(c.entityId, c);
  }

  // Graph expansion: pull in neighbours of the seeds.
  for (const seed of [...chosen.values()]) {
    for (const nb of seed.neighbors) {
      if (chosen.size >= maxChunks) break;
      const nc = byEntity.get(nb);
      if (nc && !chosen.has(nb)) chosen.set(nb, nc);
    }
  }

  // Nothing matched lexically — fall back to the highest-scoring chunks.
  if (chosen.size === 0) {
    for (const { c } of scored.slice(0, maxChunks)) chosen.set(c.entityId, c);
  }

  return [...chosen.values()].slice(0, maxChunks);
}
