export type EntityType = 'class' | 'objectProperty' | 'dataProperty' | 'annotationProperty' | 'individual';

export type PropertyCharacteristic =
  | 'Functional'
  | 'InverseFunctional'
  | 'Transitive'
  | 'Symmetric'
  | 'Asymmetric'
  | 'Reflexive'
  | 'Irreflexive';

export const XSD_TYPES = [
  'xsd:string', 'xsd:integer', 'xsd:decimal', 'xsd:boolean',
  'xsd:dateTime', 'xsd:date', 'xsd:float', 'xsd:double',
  'xsd:anyURI', 'xsd:long', 'xsd:int', 'xsd:nonNegativeInteger',
] as const;

export type XSDType = (typeof XSD_TYPES)[number];

export interface Annotation {
  property: string;
  value: string;
  lang?: string;
}

export interface OWLClass {
  id: string;
  iri: string;
  label: string;
  subClassOf: string[];
  equivalentClasses: string[];
  disjointWith: string[];
  annotations: Annotation[];
  deprecated?: boolean;
}

export interface ObjectProperty {
  id: string;
  iri: string;
  label: string;
  subPropertyOf: string[];
  domain: string[];
  range: string[];
  inverseOf?: string;
  characteristics: PropertyCharacteristic[];
  annotations: Annotation[];
}

export interface DataProperty {
  id: string;
  iri: string;
  label: string;
  subPropertyOf: string[];
  domain: string[];
  range: string[];
  characteristics: ('Functional')[];
  annotations: Annotation[];
}

export interface AnnotationProperty {
  id: string;
  iri: string;
  label: string;
  subPropertyOf: string[];
  annotations: Annotation[];
}

export interface ObjectPropertyAssertion {
  property: string;
  target: string;
}

export interface DataPropertyAssertion {
  property: string;
  value: string;
  type: string;
}

export interface Individual {
  id: string;
  iri: string;
  label: string;
  types: string[];
  sameAs: string[];
  differentFrom: string[];
  objectPropertyAssertions: ObjectPropertyAssertion[];
  dataPropertyAssertions: DataPropertyAssertion[];
  annotations: Annotation[];
}

export interface Ontology {
  id: string;
  iri: string;
  label: string;
  description: string;
  version: string;
  classes: Record<string, OWLClass>;
  objectProperties: Record<string, ObjectProperty>;
  dataProperties: Record<string, DataProperty>;
  annotationProperties: Record<string, AnnotationProperty>;
  individuals: Record<string, Individual>;
  createdAt: number;
  updatedAt: number;
}

export function makeIRI(base: string, localName: string): string {
  return `${base}#${localName}`;
}

export function localName(iri: string): string {
  return iri.split('#').pop() ?? iri.split('/').pop() ?? iri;
}

export function emptyOntology(): Ontology {
  const now = Date.now();
  return {
    id: `onto_${now}`,
    iri: 'http://example.org/ontology',
    label: 'New Ontology',
    description: '',
    version: '1.0.0',
    classes: {
      owl_Thing: {
        id: 'owl_Thing', iri: 'owl:Thing', label: 'Thing',
        subClassOf: [], equivalentClasses: [], disjointWith: [], annotations: [],
      },
    },
    objectProperties: {},
    dataProperties: {},
    annotationProperties: {
      rdfs_label: { id: 'rdfs_label', iri: 'rdfs:label', label: 'label', subPropertyOf: [], annotations: [] },
      rdfs_comment: { id: 'rdfs_comment', iri: 'rdfs:comment', label: 'comment', subPropertyOf: [], annotations: [] },
    },
    individuals: {},
    createdAt: now,
    updatedAt: now,
  };
}
