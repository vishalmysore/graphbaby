import * as webllm from '@mlc-ai/web-llm';
import type { Ontology } from '../ontology/types';
import { emptyOntology } from '../ontology/types';

const ONTOLOGY_SYSTEM_PROMPT = `You are an OWL ontology extraction engine.
Convert input text into a structured OWL-lite ontology.

Return ONLY valid JSON matching this exact structure:
{
  "classes": [
    { "id": "snake_case_id", "label": "Human Label", "subClassOf": ["parent_id_or_owl_Thing"], "annotations": [] }
  ],
  "objectProperties": [
    { "id": "snake_case_id", "label": "Human Label", "domain": ["class_id"], "range": ["class_id"], "characteristics": [] }
  ],
  "dataProperties": [
    { "id": "snake_case_id", "label": "Human Label", "domain": ["class_id"], "range": ["xsd:string"] }
  ],
  "individuals": [
    { "id": "snake_case_id", "label": "Human Label", "types": ["class_id"],
      "objectPropertyAssertions": [{"property": "prop_id", "target": "individual_id"}],
      "dataPropertyAssertions": [{"property": "prop_id", "value": "...", "type": "xsd:string"}]
    }
  ]
}

Rules:
- All IDs must be unique snake_case strings
- subClassOf must reference a class id in the response, or "owl_Thing"
- Characteristics options: Functional, InverseFunctional, Transitive, Symmetric, Asymmetric, Reflexive, Irreflexive
- Keep ontology minimal but complete
- Prefer reusing defined classes in domain/range over creating new ones`;

export class WebLLMEngine {
  private engine: webllm.MLCEngine | null = null;

  async load(modelId: string, onProgress: (r: webllm.InitProgressReport) => void): Promise<void> {
    this.engine = await webllm.CreateMLCEngine(modelId, { initProgressCallback: onProgress });
  }

  isReady(): boolean { return this.engine !== null; }

  async extractOntology(text: string, baseIRI: string): Promise<Partial<Ontology>> {
    if (!this.engine) throw new Error('Model not loaded');

    const resp = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: ONTOLOGY_SYSTEM_PROMPT },
        { role: 'user', content: `Extract an OWL ontology from this text:\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });

    return parseOntologyJSON(resp.choices[0].message.content ?? '', baseIRI);
  }

  async suggestSubclasses(classLabel: string, ontology: Ontology): Promise<string[]> {
    if (!this.engine) throw new Error('Model not loaded');
    const existing = Object.values(ontology.classes).map((c) => c.label).join(', ');
    const resp = await this.engine.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Suggest 3-5 meaningful subclasses of "${classLabel}" in an ontology that already contains: ${existing}. Return ONLY a JSON array of label strings.`,
      }],
      temperature: 0.3,
      max_tokens: 256,
    });
    try {
      const raw = resp.choices[0].message.content ?? '[]';
      const match = raw.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : [];
    } catch { return []; }
  }

  /** Step 1 of wizard: extract ONLY class hierarchy from domain text */
  async extractClassHierarchy(text: string, baseIRI: string): Promise<ProposedClass[]> {
    if (!this.engine) throw new Error('Model not loaded');

    const resp = await this.engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an OWL ontology class hierarchy designer.
From the given text, identify the key domain classes and their hierarchy.
Return ONLY valid JSON — an array of class objects:
[
  { "id": "snake_case_id", "label": "Human Label", "subClassOf": "parent_id_or_owl_Thing", "description": "one sentence definition" }
]
Rules:
- Every id must be unique snake_case
- subClassOf must reference another id in the list, or "owl_Thing"
- Keep to 6-15 meaningful classes — not too granular
- Focus on the DOMAIN (what types of things exist), not individual instances`,
        },
        { role: 'user', content: `Extract the class hierarchy for this domain:\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 1500,
    });

    return parseProposedClasses(resp.choices[0].message.content ?? '', baseIRI);
  }

  /** Step 2 of wizard: extract individuals using already-approved classes */
  async extractIndividuals(
    text: string,
    classes: { id: string; label: string }[],
    objectProps: { id: string; label: string }[],
    dataProps: { id: string; label: string }[],
  ): Promise<ProposedIndividual[]> {
    if (!this.engine) throw new Error('Model not loaded');

    const classStr = classes.map((c) => `"${c.id}" (${c.label})`).join(', ');
    const opStr = objectProps.map((p) => `"${p.id}" (${p.label})`).join(', ') || 'none';
    const dpStr = dataProps.map((p) => `"${p.id}" (${p.label})`).join(', ') || 'none';

    const resp = await this.engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an OWL individual (instance) extractor.
Using ONLY the classes and properties listed below, extract named individuals from the text.
DO NOT invent new classes.

Available classes: ${classStr}
Available object properties: ${opStr}
Available data properties: ${dpStr}

Return ONLY valid JSON — an array of individual objects:
[
  {
    "id": "snake_case_id",
    "label": "Human Name",
    "types": ["class_id"],
    "objectPropertyAssertions": [{"property": "prop_id", "target": "individual_id"}],
    "dataPropertyAssertions": [{"property": "prop_id", "value": "...", "type": "xsd:string"}]
  }
]
Rules:
- Use only class ids from the available classes list
- Individual ids must be unique snake_case
- Extract real named entities (people, places, things) — not abstract concepts`,
        },
        { role: 'user', content: `Extract individuals from this text:\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 2500,
    });

    return parseProposedIndividuals(resp.choices[0].message.content ?? '');
  }

  async generateClassDescription(classLabel: string, context: string): Promise<string> {
    if (!this.engine) throw new Error('Model not loaded');
    const resp = await this.engine.chat.completions.create({
      messages: [{
        role: 'user',
        content: `Write a 1-2 sentence ontology definition for the class "${classLabel}". Context: ${context}`,
      }],
      temperature: 0.3,
      max_tokens: 200,
    });
    return resp.choices[0].message.content ?? '';
  }
}

function parseOntologyJSON(raw: string, baseIRI: string): Partial<Ontology> {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : raw;

  let parsed: {
    classes?: { id: string; label: string; subClassOf?: string[]; annotations?: [] }[];
    objectProperties?: { id: string; label: string; domain?: string[]; range?: string[]; characteristics?: string[] }[];
    dataProperties?: { id: string; label: string; domain?: string[]; range?: string[] }[];
    individuals?: { id: string; label: string; types?: string[]; objectPropertyAssertions?: { property: string; target: string }[]; dataPropertyAssertions?: { property: string; value: string; type: string }[] }[];
  };

  try {
    parsed = JSON.parse(jsonStr.trim());
  } catch {
    throw new Error('AI did not return valid JSON');
  }

  const onto = emptyOntology();
  onto.iri = baseIRI;

  for (const c of parsed.classes ?? []) {
    onto.classes[c.id] = {
      id: c.id,
      iri: `${baseIRI}#${c.id}`,
      label: c.label,
      subClassOf: c.subClassOf?.length ? c.subClassOf : ['owl_Thing'],
      equivalentClasses: [],
      disjointWith: [],
      annotations: c.annotations ?? [],
    };
  }

  for (const p of parsed.objectProperties ?? []) {
    onto.objectProperties[p.id] = {
      id: p.id, iri: `${baseIRI}#${p.id}`, label: p.label,
      subPropertyOf: [], domain: p.domain ?? [], range: p.range ?? [],
      characteristics: (p.characteristics ?? []) as [],
      annotations: [],
    };
  }

  for (const p of parsed.dataProperties ?? []) {
    onto.dataProperties[p.id] = {
      id: p.id, iri: `${baseIRI}#${p.id}`, label: p.label,
      subPropertyOf: [], domain: p.domain ?? [], range: p.range ?? ['xsd:string'],
      characteristics: [], annotations: [],
    };
  }

  for (const ind of parsed.individuals ?? []) {
    onto.individuals[ind.id] = {
      id: ind.id, iri: `${baseIRI}#${ind.id}`, label: ind.label,
      types: ind.types ?? [], sameAs: [], differentFrom: [],
      objectPropertyAssertions: ind.objectPropertyAssertions ?? [],
      dataPropertyAssertions: ind.dataPropertyAssertions ?? [],
      annotations: [],
    };
  }

  return onto;
}

// ── Wizard types ─────────────────────────────────────────────────────────────

export interface ProposedClass {
  id: string;
  label: string;
  subClassOf: string;       // single parent id or 'owl_Thing'
  description: string;
  approved: boolean;
}

export interface ProposedIndividual {
  id: string;
  label: string;
  types: string[];
  objectPropertyAssertions: { property: string; target: string }[];
  dataPropertyAssertions: { property: string; value: string; type: string }[];
  approved: boolean;
}

function extractJSON(raw: string): string {
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();
  const arr = raw.match(/(\[[\s\S]*\])/);
  if (arr) return arr[1].trim();
  const obj = raw.match(/(\{[\s\S]*\})/);
  if (obj) return obj[1].trim();
  return raw.trim();
}

function parseProposedClasses(raw: string, _baseIRI: string): ProposedClass[] {
  try {
    const parsed = JSON.parse(extractJSON(raw));
    if (!Array.isArray(parsed)) throw new Error('not array');
    return parsed.map((c: { id: string; label: string; subClassOf?: string; description?: string }) => ({
      id: c.id ?? `class_${Math.random().toString(36).slice(2, 7)}`,
      label: c.label ?? c.id,
      subClassOf: c.subClassOf ?? 'owl_Thing',
      description: c.description ?? '',
      approved: true,
    }));
  } catch {
    throw new Error(`Could not parse class hierarchy from AI response:\n${raw}`);
  }
}

function parseProposedIndividuals(raw: string): ProposedIndividual[] {
  try {
    const parsed = JSON.parse(extractJSON(raw));
    if (!Array.isArray(parsed)) throw new Error('not array');
    return parsed.map((i: {
      id: string; label: string; types?: string[];
      objectPropertyAssertions?: { property: string; target: string }[];
      dataPropertyAssertions?: { property: string; value: string; type: string }[];
    }) => ({
      id: i.id ?? `ind_${Math.random().toString(36).slice(2, 7)}`,
      label: i.label ?? i.id,
      types: i.types ?? [],
      objectPropertyAssertions: i.objectPropertyAssertions ?? [],
      dataPropertyAssertions: i.dataPropertyAssertions ?? [],
      approved: true,
    }));
  } catch {
    throw new Error(`Could not parse individuals from AI response:\n${raw}`);
  }
}
