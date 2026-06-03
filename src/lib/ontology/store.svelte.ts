import { emptyOntology } from './types';
import type {
  Ontology, OWLClass, ObjectProperty, DataProperty,
  AnnotationProperty, Individual, EntityType,
} from './types';

function makeId(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function makeIRI(base: string, id: string): string {
  return `${base}#${id}`;
}

class OntologyStore {
  ontology = $state<Ontology>(emptyOntology());
  selectedEntityId = $state<string | null>(null);
  selectedEntityType = $state<EntityType>('class');
  activeTab = $state<EntityType>('class');
  searchQuery = $state('');

  get selectedClass(): OWLClass | null {
    if (this.selectedEntityType !== 'class' || !this.selectedEntityId) return null;
    return this.ontology.classes[this.selectedEntityId] ?? null;
  }

  get selectedObjectProperty(): ObjectProperty | null {
    if (this.selectedEntityType !== 'objectProperty' || !this.selectedEntityId) return null;
    return this.ontology.objectProperties[this.selectedEntityId] ?? null;
  }

  get selectedDataProperty(): DataProperty | null {
    if (this.selectedEntityType !== 'dataProperty' || !this.selectedEntityId) return null;
    return this.ontology.dataProperties[this.selectedEntityId] ?? null;
  }

  get selectedAnnotationProperty(): AnnotationProperty | null {
    if (this.selectedEntityType !== 'annotationProperty' || !this.selectedEntityId) return null;
    return this.ontology.annotationProperties[this.selectedEntityId] ?? null;
  }

  get selectedIndividual(): Individual | null {
    if (this.selectedEntityType !== 'individual' || !this.selectedEntityId) return null;
    return this.ontology.individuals[this.selectedEntityId] ?? null;
  }

  select(id: string, type: EntityType) {
    this.selectedEntityId = id;
    this.selectedEntityType = type;
  }

  setActiveTab(tab: EntityType) {
    this.activeTab = tab;
    this.selectedEntityId = null;
  }

  addClass(label: string, parentId: string = 'owl_Thing'): string {
    const id = makeId(label) || `class_${Date.now()}`;
    const unique = this.uniqueId(id, 'classes');
    this.ontology.classes[unique] = {
      id: unique,
      iri: makeIRI(this.ontology.iri, unique),
      label,
      subClassOf: [parentId],
      equivalentClasses: [],
      disjointWith: [],
      annotations: [],
    };
    this.touch();
    return unique;
  }

  deleteClass(id: string) {
    if (id === 'owl_Thing') return;
    delete this.ontology.classes[id];
    // Remove from other classes' subClassOf / disjointWith / equivalentClasses
    for (const cls of Object.values(this.ontology.classes)) {
      cls.subClassOf = cls.subClassOf.filter((s) => s !== id);
      cls.disjointWith = cls.disjointWith.filter((s) => s !== id);
      cls.equivalentClasses = cls.equivalentClasses.filter((s) => s !== id);
    }
    if (this.selectedEntityId === id) this.selectedEntityId = null;
    this.touch();
  }

  updateClass(id: string, patch: Partial<OWLClass>) {
    if (!this.ontology.classes[id]) return;
    this.ontology.classes[id] = { ...this.ontology.classes[id], ...patch };
    this.touch();
  }

  addObjectProperty(label: string): string {
    const id = this.uniqueId(makeId(label) || `op_${Date.now()}`, 'objectProperties');
    this.ontology.objectProperties[id] = {
      id, iri: makeIRI(this.ontology.iri, id), label,
      subPropertyOf: [], domain: [], range: [], characteristics: [], annotations: [],
    };
    this.touch();
    return id;
  }

  updateObjectProperty(id: string, patch: Partial<ObjectProperty>) {
    if (!this.ontology.objectProperties[id]) return;
    this.ontology.objectProperties[id] = { ...this.ontology.objectProperties[id], ...patch };
    this.touch();
  }

  deleteObjectProperty(id: string) {
    delete this.ontology.objectProperties[id];
    if (this.selectedEntityId === id) this.selectedEntityId = null;
    this.touch();
  }

  addDataProperty(label: string): string {
    const id = this.uniqueId(makeId(label) || `dp_${Date.now()}`, 'dataProperties');
    this.ontology.dataProperties[id] = {
      id, iri: makeIRI(this.ontology.iri, id), label,
      subPropertyOf: [], domain: [], range: ['xsd:string'], characteristics: [], annotations: [],
    };
    this.touch();
    return id;
  }

  updateDataProperty(id: string, patch: Partial<DataProperty>) {
    if (!this.ontology.dataProperties[id]) return;
    this.ontology.dataProperties[id] = { ...this.ontology.dataProperties[id], ...patch };
    this.touch();
  }

  deleteDataProperty(id: string) {
    delete this.ontology.dataProperties[id];
    if (this.selectedEntityId === id) this.selectedEntityId = null;
    this.touch();
  }

  addAnnotationProperty(label: string): string {
    const id = this.uniqueId(makeId(label) || `ap_${Date.now()}`, 'annotationProperties');
    this.ontology.annotationProperties[id] = {
      id, iri: makeIRI(this.ontology.iri, id), label, subPropertyOf: [], annotations: [],
    };
    this.touch();
    return id;
  }

  deleteAnnotationProperty(id: string) {
    if (id === 'rdfs_label' || id === 'rdfs_comment') return;
    delete this.ontology.annotationProperties[id];
    if (this.selectedEntityId === id) this.selectedEntityId = null;
    this.touch();
  }

  addIndividual(label: string, typeId?: string): string {
    const id = this.uniqueId(makeId(label) || `ind_${Date.now()}`, 'individuals');
    this.ontology.individuals[id] = {
      id, iri: makeIRI(this.ontology.iri, id), label,
      types: typeId ? [typeId] : [],
      sameAs: [], differentFrom: [],
      objectPropertyAssertions: [], dataPropertyAssertions: [], annotations: [],
    };
    this.touch();
    return id;
  }

  updateIndividual(id: string, patch: Partial<Individual>) {
    if (!this.ontology.individuals[id]) return;
    this.ontology.individuals[id] = { ...this.ontology.individuals[id], ...patch };
    this.touch();
  }

  deleteIndividual(id: string) {
    delete this.ontology.individuals[id];
    if (this.selectedEntityId === id) this.selectedEntityId = null;
    this.touch();
  }

  loadOntology(onto: Ontology) {
    this.ontology = onto;
    this.selectedEntityId = null;
  }

  private uniqueId(base: string, store: keyof Ontology): string {
    const bucket = this.ontology[store] as Record<string, unknown>;
    if (!bucket[base]) return base;
    let i = 1;
    while (bucket[`${base}_${i}`]) i++;
    return `${base}_${i}`;
  }

  private touch() {
    this.ontology.updatedAt = Date.now();
  }
}

export const store = new OntologyStore();
