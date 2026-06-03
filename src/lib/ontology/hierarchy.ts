import type { OWLClass, ObjectProperty, DataProperty, AnnotationProperty, Individual, Ontology } from './types';

export interface TreeNode {
  id: string;
  label: string;
  iri: string;
  children: TreeNode[];
  depth: number;
}

export function buildClassTree(classes: Record<string, OWLClass>, query = ''): TreeNode[] {
  const q = query.toLowerCase();

  function matches(cls: OWLClass): boolean {
    if (!q) return true;
    return cls.label.toLowerCase().includes(q) || cls.id.toLowerCase().includes(q);
  }

  function build(id: string, depth: number, visited = new Set<string>()): TreeNode | null {
    if (visited.has(id)) return null;
    visited.add(id);
    const cls = classes[id];
    if (!cls) return null;

    const children: TreeNode[] = [];
    for (const c of Object.values(classes)) {
      if (c.subClassOf.includes(id) && c.id !== id) {
        const child = build(c.id, depth + 1, new Set(visited));
        if (child) children.push(child);
      }
    }

    if (!matches(cls) && children.length === 0) return null;

    return { id, label: cls.label, iri: cls.iri, children, depth };
  }

  const root = build('owl_Thing', 0);
  return root ? [root] : [];
}

export function buildPropertyTree<T extends { id: string; label: string; iri: string; subPropertyOf: string[] }>(
  props: Record<string, T>,
  query = '',
): TreeNode[] {
  const q = query.toLowerCase();
  const all = Object.values(props);
  const roots = all.filter((p) => p.subPropertyOf.length === 0);

  function build(id: string, depth: number): TreeNode {
    const prop = props[id]!;
    const children = all
      .filter((p) => p.subPropertyOf.includes(id))
      .map((p) => build(p.id, depth + 1));
    return { id, label: prop.label, iri: prop.iri, children, depth };
  }

  let nodes = roots.map((r) => build(r.id, 0));
  if (q) nodes = nodes.filter((n) => flatLabel(n).toLowerCase().includes(q));
  return nodes;
}

function flatLabel(n: TreeNode): string {
  return n.label + n.children.map(flatLabel).join('');
}

export function getClassUsage(classId: string, ontology: Ontology): { label: string; iri: string }[] {
  const usages: { label: string; iri: string }[] = [];

  for (const cls of Object.values(ontology.classes)) {
    if (cls.subClassOf.includes(classId) && cls.id !== classId)
      usages.push({ label: `SubClass: ${cls.label}`, iri: cls.iri });
    if (cls.equivalentClasses.includes(classId))
      usages.push({ label: `Equivalent: ${cls.label}`, iri: cls.iri });
  }
  for (const op of Object.values(ontology.objectProperties)) {
    if (op.domain.includes(classId)) usages.push({ label: `Domain of: ${op.label}`, iri: op.iri });
    if (op.range.includes(classId)) usages.push({ label: `Range of: ${op.label}`, iri: op.iri });
  }
  for (const ind of Object.values(ontology.individuals)) {
    if (ind.types.includes(classId)) usages.push({ label: `Instance: ${ind.label}`, iri: ind.iri });
  }
  return usages;
}
