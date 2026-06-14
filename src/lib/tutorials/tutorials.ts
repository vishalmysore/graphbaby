// Prepopulated tutorial ontologies users can load and explore with one click.
//
// Each tutorial bundles a short description with a `build()` function that
// returns a complete, self-consistent `Ontology`. Loading a tutorial replaces
// the current ontology (the editor offers it from the Tutorials panel).

import type {
  Ontology, OWLClass, ObjectProperty, DataProperty,
  AnnotationProperty, Individual, PropertyCharacteristic,
} from '../ontology/types';

export interface Tutorial {
  id: string;
  title: string;
  icon: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  /** Bullet points describing what the learner will see / try. */
  highlights: string[];
  build: () => Ontology;
}

// ── Small builders to keep each tutorial readable ────────────────────────────

interface ClassSpec {
  id: string;
  label: string;
  parents?: string[];
  disjointWith?: string[];
  comment?: string;
}
interface ObjPropSpec {
  id: string;
  label: string;
  domain?: string[];
  range?: string[];
  inverseOf?: string;
  characteristics?: PropertyCharacteristic[];
  comment?: string;
}
interface DataPropSpec {
  id: string;
  label: string;
  domain?: string[];
  range?: string[];
  functional?: boolean;
  comment?: string;
}
interface IndividualSpec {
  id: string;
  label: string;
  types: string[];
  objectAssertions?: { property: string; target: string }[];
  dataAssertions?: { property: string; value: string; type?: string }[];
  comment?: string;
}
interface OntologySpec {
  id: string;
  iri: string;
  label: string;
  description: string;
  classes?: ClassSpec[];
  objectProperties?: ObjPropSpec[];
  dataProperties?: DataPropSpec[];
  individuals?: IndividualSpec[];
}

function comment(text?: string) {
  return text ? [{ property: 'rdfs:comment', value: text }] : [];
}

function buildOntology(spec: OntologySpec): Ontology {
  const now = Date.now();
  const iri = spec.iri;

  const classes: Record<string, OWLClass> = {
    owl_Thing: {
      id: 'owl_Thing', iri: 'owl:Thing', label: 'Thing',
      subClassOf: [], equivalentClasses: [], disjointWith: [], annotations: [],
    },
  };
  for (const c of spec.classes ?? []) {
    classes[c.id] = {
      id: c.id, iri: `${iri}#${c.id}`, label: c.label,
      subClassOf: c.parents && c.parents.length ? c.parents : ['owl_Thing'],
      equivalentClasses: [],
      disjointWith: c.disjointWith ?? [],
      annotations: comment(c.comment),
    };
  }

  const objectProperties: Record<string, ObjectProperty> = {};
  for (const p of spec.objectProperties ?? []) {
    objectProperties[p.id] = {
      id: p.id, iri: `${iri}#${p.id}`, label: p.label,
      subPropertyOf: [], domain: p.domain ?? [], range: p.range ?? [],
      inverseOf: p.inverseOf,
      characteristics: p.characteristics ?? [],
      annotations: comment(p.comment),
    };
  }

  const dataProperties: Record<string, DataProperty> = {};
  for (const p of spec.dataProperties ?? []) {
    dataProperties[p.id] = {
      id: p.id, iri: `${iri}#${p.id}`, label: p.label,
      subPropertyOf: [], domain: p.domain ?? [], range: p.range ?? ['xsd:string'],
      characteristics: p.functional ? ['Functional'] : [],
      annotations: comment(p.comment),
    };
  }

  const annotationProperties: Record<string, AnnotationProperty> = {
    rdfs_label: { id: 'rdfs_label', iri: 'rdfs:label', label: 'label', subPropertyOf: [], annotations: [] },
    rdfs_comment: { id: 'rdfs_comment', iri: 'rdfs:comment', label: 'comment', subPropertyOf: [], annotations: [] },
  };

  const individuals: Record<string, Individual> = {};
  for (const i of spec.individuals ?? []) {
    individuals[i.id] = {
      id: i.id, iri: `${iri}#${i.id}`, label: i.label,
      types: i.types, sameAs: [], differentFrom: [],
      objectPropertyAssertions: (i.objectAssertions ?? []).map((a) => ({ property: a.property, target: a.target })),
      dataPropertyAssertions: (i.dataAssertions ?? []).map((a) => ({ property: a.property, value: a.value, type: a.type ?? 'xsd:string' })),
      annotations: comment(i.comment),
    };
  }

  return {
    id: spec.id, iri, label: spec.label, description: spec.description, version: '1.0.0',
    classes, objectProperties, dataProperties, annotationProperties, individuals,
    createdAt: now, updatedAt: now,
  };
}

// ── Tutorial 1: Pizza (the classic OWL teaching ontology) ────────────────────

function pizzaOntology(): Ontology {
  return buildOntology({
    id: 'tutorial_pizza',
    iri: 'http://example.org/tutorial/pizza',
    label: 'Pizza Tutorial',
    description: 'The classic Protégé pizza ontology — a gentle introduction to classes, subclasses and properties.',
    classes: [
      { id: 'pizza', label: 'Pizza', comment: 'A delicious base topped with cheese and other ingredients.' },
      { id: 'pizza_base', label: 'PizzaBase', disjointWith: ['pizza_topping'] },
      { id: 'pizza_topping', label: 'PizzaTopping', disjointWith: ['pizza_base'] },
      { id: 'thin_and_crispy_base', label: 'ThinAndCrispyBase', parents: ['pizza_base'] },
      { id: 'deep_pan_base', label: 'DeepPanBase', parents: ['pizza_base'] },
      { id: 'cheese_topping', label: 'CheeseTopping', parents: ['pizza_topping'] },
      { id: 'meat_topping', label: 'MeatTopping', parents: ['pizza_topping'] },
      { id: 'vegetable_topping', label: 'VegetableTopping', parents: ['pizza_topping'] },
      { id: 'mozzarella_topping', label: 'MozzarellaTopping', parents: ['cheese_topping'] },
      { id: 'pepperoni_topping', label: 'PepperoniTopping', parents: ['meat_topping'] },
      { id: 'tomato_topping', label: 'TomatoTopping', parents: ['vegetable_topping'] },
      { id: 'mushroom_topping', label: 'MushroomTopping', parents: ['vegetable_topping'] },
      { id: 'margherita_pizza', label: 'MargheritaPizza', parents: ['pizza'], comment: 'A pizza with only mozzarella and tomato toppings.' },
      { id: 'american_pizza', label: 'AmericanPizza', parents: ['pizza'], comment: 'A pizza with pepperoni.' },
    ],
    objectProperties: [
      { id: 'has_base', label: 'hasBase', domain: ['pizza'], range: ['pizza_base'], characteristics: ['Functional'], inverseOf: 'is_base_of', comment: 'Every pizza has exactly one base.' },
      { id: 'is_base_of', label: 'isBaseOf', domain: ['pizza_base'], range: ['pizza'], inverseOf: 'has_base' },
      { id: 'has_topping', label: 'hasTopping', domain: ['pizza'], range: ['pizza_topping'] },
    ],
    dataProperties: [
      { id: 'has_calorie_content', label: 'hasCalorieContent', domain: ['pizza'], range: ['xsd:integer'], functional: true },
    ],
    individuals: [
      {
        id: 'my_margherita', label: 'My Margherita', types: ['margherita_pizza'],
        objectAssertions: [
          { property: 'has_base', target: 'thin_crispy_instance' },
          { property: 'has_topping', target: 'cheese_instance' },
          { property: 'has_topping', target: 'tomato_instance' },
        ],
        dataAssertions: [{ property: 'has_calorie_content', value: '850', type: 'xsd:integer' }],
        comment: 'A sample pizza assembled from the toppings below.',
      },
      { id: 'thin_crispy_instance', label: 'A Thin Crispy Base', types: ['thin_and_crispy_base'] },
      { id: 'cheese_instance', label: 'Some Mozzarella', types: ['mozzarella_topping'] },
      { id: 'tomato_instance', label: 'Some Tomato', types: ['tomato_topping'] },
    ],
  });
}

// ── Tutorial 2: Family relationships ─────────────────────────────────────────

function familyOntology(): Ontology {
  return buildOntology({
    id: 'tutorial_family',
    iri: 'http://example.org/tutorial/family',
    label: 'Family Tutorial',
    description: 'Model people and how they relate — a great way to learn inverse, symmetric and transitive properties.',
    classes: [
      { id: 'person', label: 'Person', comment: 'A human being.' },
      { id: 'man', label: 'Man', parents: ['person'], disjointWith: ['woman'] },
      { id: 'woman', label: 'Woman', parents: ['person'], disjointWith: ['man'] },
      { id: 'parent', label: 'Parent', parents: ['person'], comment: 'A person who has at least one child.' },
    ],
    objectProperties: [
      { id: 'has_parent', label: 'hasParent', domain: ['person'], range: ['person'], inverseOf: 'has_child' },
      { id: 'has_child', label: 'hasChild', domain: ['person'], range: ['person'], inverseOf: 'has_parent' },
      { id: 'has_spouse', label: 'hasSpouse', domain: ['person'], range: ['person'], characteristics: ['Symmetric'] },
      { id: 'has_sibling', label: 'hasSibling', domain: ['person'], range: ['person'], characteristics: ['Symmetric'] },
      { id: 'has_ancestor', label: 'hasAncestor', domain: ['person'], range: ['person'], characteristics: ['Transitive'], comment: 'If A is an ancestor of B and B of C, then A is an ancestor of C.' },
    ],
    dataProperties: [
      { id: 'has_first_name', label: 'hasFirstName', domain: ['person'], range: ['xsd:string'], functional: true },
      { id: 'has_birth_year', label: 'hasBirthYear', domain: ['person'], range: ['xsd:integer'], functional: true },
    ],
    individuals: [
      {
        id: 'john', label: 'John', types: ['man', 'parent'],
        objectAssertions: [
          { property: 'has_spouse', target: 'mary' },
          { property: 'has_child', target: 'alice' },
          { property: 'has_child', target: 'bob' },
        ],
        dataAssertions: [
          { property: 'has_first_name', value: 'John' },
          { property: 'has_birth_year', value: '1965', type: 'xsd:integer' },
        ],
      },
      {
        id: 'mary', label: 'Mary', types: ['woman', 'parent'],
        objectAssertions: [
          { property: 'has_spouse', target: 'john' },
          { property: 'has_child', target: 'alice' },
          { property: 'has_child', target: 'bob' },
        ],
        dataAssertions: [
          { property: 'has_first_name', value: 'Mary' },
          { property: 'has_birth_year', value: '1968', type: 'xsd:integer' },
        ],
      },
      {
        id: 'alice', label: 'Alice', types: ['woman'],
        objectAssertions: [
          { property: 'has_parent', target: 'john' },
          { property: 'has_parent', target: 'mary' },
          { property: 'has_sibling', target: 'bob' },
        ],
        dataAssertions: [{ property: 'has_birth_year', value: '1992', type: 'xsd:integer' }],
      },
      {
        id: 'bob', label: 'Bob', types: ['man'],
        objectAssertions: [
          { property: 'has_parent', target: 'john' },
          { property: 'has_parent', target: 'mary' },
          { property: 'has_sibling', target: 'alice' },
        ],
        dataAssertions: [{ property: 'has_birth_year', value: '1995', type: 'xsd:integer' }],
      },
    ],
  });
}

// ── Tutorial 3: Solar System ─────────────────────────────────────────────────

function solarSystemOntology(): Ontology {
  return buildOntology({
    id: 'tutorial_solar_system',
    iri: 'http://example.org/tutorial/solar-system',
    label: 'Solar System Tutorial',
    description: 'Stars, planets and moons connected by "orbits" — practice data properties and richer individuals.',
    classes: [
      { id: 'celestial_body', label: 'CelestialBody', comment: 'Any natural object in space.' },
      { id: 'star', label: 'Star', parents: ['celestial_body'] },
      { id: 'planet', label: 'Planet', parents: ['celestial_body'] },
      { id: 'moon', label: 'Moon', parents: ['celestial_body'] },
      { id: 'dwarf_planet', label: 'DwarfPlanet', parents: ['celestial_body'] },
    ],
    objectProperties: [
      { id: 'orbits', label: 'orbits', domain: ['celestial_body'], range: ['celestial_body'], comment: 'The body this object revolves around.' },
      { id: 'has_satellite', label: 'hasSatellite', domain: ['celestial_body'], range: ['celestial_body'], inverseOf: 'orbits' },
    ],
    dataProperties: [
      { id: 'has_mass_kg', label: 'hasMassKg', domain: ['celestial_body'], range: ['xsd:double'], functional: true },
      { id: 'has_radius_km', label: 'hasRadiusKm', domain: ['celestial_body'], range: ['xsd:double'], functional: true },
      { id: 'has_moon_count', label: 'hasMoonCount', domain: ['planet'], range: ['xsd:integer'], functional: true },
    ],
    individuals: [
      {
        id: 'sun', label: 'Sun', types: ['star'],
        dataAssertions: [
          { property: 'has_mass_kg', value: '1.989e30', type: 'xsd:double' },
          { property: 'has_radius_km', value: '696340', type: 'xsd:double' },
        ],
      },
      {
        id: 'earth', label: 'Earth', types: ['planet'],
        objectAssertions: [{ property: 'orbits', target: 'sun' }],
        dataAssertions: [
          { property: 'has_mass_kg', value: '5.972e24', type: 'xsd:double' },
          { property: 'has_radius_km', value: '6371', type: 'xsd:double' },
          { property: 'has_moon_count', value: '1', type: 'xsd:integer' },
        ],
      },
      {
        id: 'luna', label: 'The Moon', types: ['moon'],
        objectAssertions: [{ property: 'orbits', target: 'earth' }],
        dataAssertions: [
          { property: 'has_mass_kg', value: '7.342e22', type: 'xsd:double' },
          { property: 'has_radius_km', value: '1737', type: 'xsd:double' },
        ],
      },
      {
        id: 'mars', label: 'Mars', types: ['planet'],
        objectAssertions: [{ property: 'orbits', target: 'sun' }],
        dataAssertions: [
          { property: 'has_mass_kg', value: '6.417e23', type: 'xsd:double' },
          { property: 'has_radius_km', value: '3389', type: 'xsd:double' },
          { property: 'has_moon_count', value: '2', type: 'xsd:integer' },
        ],
      },
      {
        id: 'pluto', label: 'Pluto', types: ['dwarf_planet'],
        objectAssertions: [{ property: 'orbits', target: 'sun' }],
        dataAssertions: [{ property: 'has_radius_km', value: '1188', type: 'xsd:double' }],
      },
    ],
  });
}

// ── Public catalogue ─────────────────────────────────────────────────────────

export const TUTORIALS: Tutorial[] = [
  {
    id: 'tutorial_pizza',
    title: 'Pizza',
    icon: '🍕',
    difficulty: 'Beginner',
    description: 'The classic OWL teaching ontology. Explore a class hierarchy of pizzas, bases and toppings, then see how a real pizza is assembled from individuals.',
    highlights: [
      '14 classes across a 3-level hierarchy',
      'Functional + inverse object properties (hasBase / isBaseOf)',
      'A sample "My Margherita" individual you can edit',
    ],
    build: pizzaOntology,
  },
  {
    id: 'tutorial_family',
    title: 'Family',
    icon: '👪',
    difficulty: 'Intermediate',
    description: 'Model a small family tree. The perfect playground for understanding inverse (parent/child), symmetric (spouse, sibling) and transitive (ancestor) properties.',
    highlights: [
      'Symmetric & transitive object properties',
      'Four connected individuals (John, Mary, Alice, Bob)',
      'Data properties for names and birth years',
    ],
    build: familyOntology,
  },
  {
    id: 'tutorial_solar_system',
    title: 'Solar System',
    icon: '🪐',
    difficulty: 'Intermediate',
    description: 'Stars, planets, moons and a dwarf planet linked by "orbits". A good example of richer individuals carrying several typed data values.',
    highlights: [
      'Self-referential "orbits" relationship',
      'Typed numeric data (mass, radius, moon count)',
      'Five individuals from the Sun to Pluto',
    ],
    build: solarSystemOntology,
  },
];
