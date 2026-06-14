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

// ── Tutorial 4: Ramayana ─────────────────────────────────────────────────────

function ramayanaOntology(): Ontology {
  return buildOntology({
    id: 'tutorial_ramayana',
    iri: 'http://example.org/tutorial/ramayana',
    label: 'Ramayana Tutorial',
    description: 'The epic of Rama — model gods, humans, vanaras and rakshasas linked by family, devotion and rivalry.',
    classes: [
      { id: 'character', label: 'Character', comment: 'Any being in the epic.' },
      { id: 'deity', label: 'Deity', parents: ['character'] },
      { id: 'human', label: 'Human', parents: ['character'] },
      { id: 'vanara', label: 'Vanara', parents: ['character'], comment: 'The forest-dwelling monkey people.' },
      { id: 'rakshasa', label: 'Rakshasa', parents: ['character'], comment: 'Demon beings of Lanka.' },
      { id: 'kingdom', label: 'Kingdom' },
    ],
    objectProperties: [
      { id: 'has_spouse', label: 'hasSpouse', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'has_parent', label: 'hasParent', domain: ['character'], range: ['character'], inverseOf: 'has_child' },
      { id: 'has_child', label: 'hasChild', domain: ['character'], range: ['character'], inverseOf: 'has_parent' },
      { id: 'has_sibling', label: 'hasSibling', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'ally_of', label: 'allyOf', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'enemy_of', label: 'enemyOf', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'devotee_of', label: 'devoteeOf', domain: ['character'], range: ['character'] },
      { id: 'avatar_of', label: 'avatarOf', domain: ['character'], range: ['deity'] },
      { id: 'rules', label: 'rules', domain: ['character'], range: ['kingdom'] },
    ],
    dataProperties: [
      { id: 'has_epithet', label: 'hasEpithet', domain: ['character'], range: ['xsd:string'] },
      { id: 'is_immortal', label: 'isImmortal', domain: ['character'], range: ['xsd:boolean'], functional: true },
    ],
    individuals: [
      { id: 'vishnu', label: 'Vishnu', types: ['deity'], dataAssertions: [{ property: 'is_immortal', value: 'true', type: 'xsd:boolean' }] },
      {
        id: 'rama', label: 'Rama', types: ['human'],
        objectAssertions: [
          { property: 'avatar_of', target: 'vishnu' },
          { property: 'has_spouse', target: 'sita' },
          { property: 'has_parent', target: 'dasharatha' },
          { property: 'has_sibling', target: 'lakshmana' },
          { property: 'has_sibling', target: 'bharata' },
          { property: 'has_sibling', target: 'shatrughna' },
          { property: 'enemy_of', target: 'ravana' },
          { property: 'rules', target: 'ayodhya' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Maryada Purushottama' }],
      },
      {
        id: 'sita', label: 'Sita', types: ['human'],
        objectAssertions: [
          { property: 'has_spouse', target: 'rama' },
          { property: 'has_parent', target: 'janaka' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Janaki' }],
      },
      {
        id: 'lakshmana', label: 'Lakshmana', types: ['human'],
        objectAssertions: [
          { property: 'has_sibling', target: 'rama' },
          { property: 'has_parent', target: 'dasharatha' },
          { property: 'ally_of', target: 'rama' },
        ],
      },
      { id: 'bharata', label: 'Bharata', types: ['human'], objectAssertions: [{ property: 'has_sibling', target: 'rama' }, { property: 'has_parent', target: 'dasharatha' }] },
      { id: 'shatrughna', label: 'Shatrughna', types: ['human'], objectAssertions: [{ property: 'has_sibling', target: 'rama' }, { property: 'has_parent', target: 'dasharatha' }] },
      {
        id: 'dasharatha', label: 'Dasharatha', types: ['human'],
        objectAssertions: [
          { property: 'has_child', target: 'rama' },
          { property: 'has_child', target: 'lakshmana' },
          { property: 'has_child', target: 'bharata' },
          { property: 'has_child', target: 'shatrughna' },
          { property: 'rules', target: 'ayodhya' },
        ],
      },
      { id: 'janaka', label: 'Janaka', types: ['human'], objectAssertions: [{ property: 'has_child', target: 'sita' }, { property: 'rules', target: 'mithila' }] },
      {
        id: 'hanuman', label: 'Hanuman', types: ['vanara'],
        objectAssertions: [
          { property: 'devotee_of', target: 'rama' },
          { property: 'ally_of', target: 'rama' },
        ],
        dataAssertions: [
          { property: 'has_epithet', value: 'Bajrangbali' },
          { property: 'is_immortal', value: 'true', type: 'xsd:boolean' },
        ],
      },
      {
        id: 'sugriva', label: 'Sugriva', types: ['vanara'],
        objectAssertions: [
          { property: 'ally_of', target: 'rama' },
          { property: 'has_sibling', target: 'vali' },
          { property: 'rules', target: 'kishkindha' },
        ],
      },
      { id: 'vali', label: 'Vali', types: ['vanara'], objectAssertions: [{ property: 'has_sibling', target: 'sugriva' }] },
      {
        id: 'ravana', label: 'Ravana', types: ['rakshasa'],
        objectAssertions: [
          { property: 'enemy_of', target: 'rama' },
          { property: 'has_sibling', target: 'vibhishana' },
          { property: 'has_sibling', target: 'kumbhakarna' },
          { property: 'rules', target: 'lanka' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Dashanana (the ten-headed)' }],
      },
      {
        id: 'vibhishana', label: 'Vibhishana', types: ['rakshasa'],
        objectAssertions: [
          { property: 'ally_of', target: 'rama' },
          { property: 'has_sibling', target: 'ravana' },
        ],
      },
      { id: 'kumbhakarna', label: 'Kumbhakarna', types: ['rakshasa'], objectAssertions: [{ property: 'has_sibling', target: 'ravana' }] },
      { id: 'ayodhya', label: 'Ayodhya', types: ['kingdom'] },
      { id: 'mithila', label: 'Mithila', types: ['kingdom'] },
      { id: 'kishkindha', label: 'Kishkindha', types: ['kingdom'] },
      { id: 'lanka', label: 'Lanka', types: ['kingdom'] },
    ],
  });
}

// ── Tutorial 5: Mahabharata ──────────────────────────────────────────────────

function mahabharataOntology(): Ontology {
  return buildOntology({
    id: 'tutorial_mahabharata',
    iri: 'http://example.org/tutorial/mahabharata',
    label: 'Mahabharata Tutorial',
    description: 'The great war of Kurukshetra — Pandavas, Kauravas and Krishna, woven together by kinship, alliance and enmity.',
    classes: [
      { id: 'character', label: 'Character', comment: 'Any being in the epic.' },
      { id: 'pandava', label: 'Pandava', parents: ['character'], comment: 'The five sons of Pandu.', disjointWith: ['kaurava'] },
      { id: 'kaurava', label: 'Kaurava', parents: ['character'], comment: 'The sons of Dhritarashtra.', disjointWith: ['pandava'] },
      { id: 'deity', label: 'Deity', parents: ['character'] },
      { id: 'kingdom', label: 'Kingdom' },
      { id: 'battle', label: 'Battle' },
    ],
    objectProperties: [
      { id: 'has_spouse', label: 'hasSpouse', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'has_parent', label: 'hasParent', domain: ['character'], range: ['character'], inverseOf: 'has_child' },
      { id: 'has_child', label: 'hasChild', domain: ['character'], range: ['character'], inverseOf: 'has_parent' },
      { id: 'has_sibling', label: 'hasSibling', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'ally_of', label: 'allyOf', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'enemy_of', label: 'enemyOf', domain: ['character'], range: ['character'], characteristics: ['Symmetric'] },
      { id: 'charioteer_of', label: 'charioteerOf', domain: ['character'], range: ['character'] },
      { id: 'mentor_of', label: 'mentorOf', domain: ['character'], range: ['character'] },
      { id: 'avatar_of', label: 'avatarOf', domain: ['character'], range: ['deity'] },
      { id: 'rules', label: 'rules', domain: ['character'], range: ['kingdom'] },
      { id: 'fought_in', label: 'foughtIn', domain: ['character'], range: ['battle'] },
    ],
    dataProperties: [
      { id: 'has_epithet', label: 'hasEpithet', domain: ['character'], range: ['xsd:string'] },
    ],
    individuals: [
      { id: 'vishnu', label: 'Vishnu', types: ['deity'] },
      {
        id: 'krishna', label: 'Krishna', types: ['character'],
        objectAssertions: [
          { property: 'avatar_of', target: 'vishnu' },
          { property: 'charioteer_of', target: 'arjuna' },
          { property: 'ally_of', target: 'arjuna' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Govinda' }],
      },
      {
        id: 'yudhishthira', label: 'Yudhishthira', types: ['pandava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'bhima' },
          { property: 'has_sibling', target: 'arjuna' },
          { property: 'has_sibling', target: 'nakula' },
          { property: 'has_sibling', target: 'sahadeva' },
          { property: 'has_parent', target: 'pandu' },
          { property: 'has_parent', target: 'kunti' },
          { property: 'has_spouse', target: 'draupadi' },
          { property: 'enemy_of', target: 'duryodhana' },
          { property: 'rules', target: 'indraprastha' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Dharmaraja' }],
      },
      {
        id: 'bhima', label: 'Bhima', types: ['pandava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'yudhishthira' },
          { property: 'has_parent', target: 'pandu' },
          { property: 'has_parent', target: 'kunti' },
          { property: 'has_spouse', target: 'draupadi' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      {
        id: 'arjuna', label: 'Arjuna', types: ['pandava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'yudhishthira' },
          { property: 'has_parent', target: 'pandu' },
          { property: 'has_parent', target: 'kunti' },
          { property: 'has_spouse', target: 'draupadi' },
          { property: 'ally_of', target: 'krishna' },
          { property: 'enemy_of', target: 'karna' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Partha' }],
      },
      {
        id: 'nakula', label: 'Nakula', types: ['pandava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'yudhishthira' },
          { property: 'has_parent', target: 'pandu' },
          { property: 'has_spouse', target: 'draupadi' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      {
        id: 'sahadeva', label: 'Sahadeva', types: ['pandava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'yudhishthira' },
          { property: 'has_parent', target: 'pandu' },
          { property: 'has_spouse', target: 'draupadi' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      {
        id: 'draupadi', label: 'Draupadi', types: ['character'],
        objectAssertions: [
          { property: 'has_spouse', target: 'yudhishthira' },
          { property: 'has_spouse', target: 'bhima' },
          { property: 'has_spouse', target: 'arjuna' },
          { property: 'has_spouse', target: 'nakula' },
          { property: 'has_spouse', target: 'sahadeva' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Panchali' }],
      },
      {
        id: 'kunti', label: 'Kunti', types: ['character'],
        objectAssertions: [
          { property: 'has_child', target: 'yudhishthira' },
          { property: 'has_child', target: 'bhima' },
          { property: 'has_child', target: 'arjuna' },
          { property: 'has_child', target: 'karna' },
        ],
      },
      {
        id: 'pandu', label: 'Pandu', types: ['character'],
        objectAssertions: [
          { property: 'has_child', target: 'yudhishthira' },
          { property: 'has_child', target: 'bhima' },
          { property: 'has_child', target: 'arjuna' },
          { property: 'has_child', target: 'nakula' },
          { property: 'has_child', target: 'sahadeva' },
          { property: 'has_sibling', target: 'dhritarashtra' },
        ],
      },
      {
        id: 'dhritarashtra', label: 'Dhritarashtra', types: ['character'],
        objectAssertions: [
          { property: 'has_child', target: 'duryodhana' },
          { property: 'has_child', target: 'dushasana' },
          { property: 'has_sibling', target: 'pandu' },
          { property: 'has_spouse', target: 'gandhari' },
          { property: 'rules', target: 'hastinapura' },
        ],
      },
      {
        id: 'gandhari', label: 'Gandhari', types: ['character'],
        objectAssertions: [
          { property: 'has_child', target: 'duryodhana' },
          { property: 'has_child', target: 'dushasana' },
          { property: 'has_spouse', target: 'dhritarashtra' },
        ],
      },
      {
        id: 'duryodhana', label: 'Duryodhana', types: ['kaurava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'dushasana' },
          { property: 'has_parent', target: 'dhritarashtra' },
          { property: 'has_parent', target: 'gandhari' },
          { property: 'enemy_of', target: 'yudhishthira' },
          { property: 'ally_of', target: 'karna' },
          { property: 'ally_of', target: 'shakuni' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Suyodhana' }],
      },
      {
        id: 'dushasana', label: 'Dushasana', types: ['kaurava'],
        objectAssertions: [
          { property: 'has_sibling', target: 'duryodhana' },
          { property: 'has_parent', target: 'dhritarashtra' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      {
        id: 'bhishma', label: 'Bhishma', types: ['character'],
        objectAssertions: [
          { property: 'ally_of', target: 'duryodhana' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Pitamaha (the grandsire)' }],
      },
      {
        id: 'drona', label: 'Drona', types: ['character'],
        objectAssertions: [
          { property: 'mentor_of', target: 'arjuna' },
          { property: 'mentor_of', target: 'duryodhana' },
          { property: 'ally_of', target: 'duryodhana' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      {
        id: 'karna', label: 'Karna', types: ['character'],
        objectAssertions: [
          { property: 'has_parent', target: 'kunti' },
          { property: 'ally_of', target: 'duryodhana' },
          { property: 'enemy_of', target: 'arjuna' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
        dataAssertions: [{ property: 'has_epithet', value: 'Radheya' }],
      },
      {
        id: 'shakuni', label: 'Shakuni', types: ['character'],
        objectAssertions: [
          { property: 'ally_of', target: 'duryodhana' },
          { property: 'fought_in', target: 'kurukshetra' },
        ],
      },
      { id: 'hastinapura', label: 'Hastinapura', types: ['kingdom'] },
      { id: 'indraprastha', label: 'Indraprastha', types: ['kingdom'] },
      { id: 'kurukshetra', label: 'Kurukshetra War', types: ['battle'] },
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
  {
    id: 'tutorial_ramayana',
    title: 'Ramayana',
    icon: '🏹',
    difficulty: 'Advanced',
    description: 'The epic of Rama, told as an ontology. Gods, humans, vanaras and rakshasas connected by family ties, devotion, alliances and the great rivalry with Ravana.',
    highlights: [
      'Four character types (deity, human, vanara, rakshasa)',
      'Rich relationships: family, allyOf, enemyOf, devoteeOf, avatarOf',
      '17 individuals from Rama and Sita to Hanuman and Ravana',
    ],
    build: ramayanaOntology,
  },
  {
    id: 'tutorial_mahabharata',
    title: 'Mahabharata',
    icon: '⚔️',
    difficulty: 'Advanced',
    description: 'The Kurukshetra war as a knowledge graph. The Pandavas, Kauravas and Krishna tied together by kinship, mentorship, alliance and enmity — all converging on one battle.',
    highlights: [
      'Pandava vs Kaurava disjoint classes',
      'charioteerOf, mentorOf and foughtIn relationships',
      '20 individuals centered on the Kurukshetra War',
    ],
    build: mahabharataOntology,
  },
];
