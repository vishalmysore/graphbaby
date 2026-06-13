# Ontologies, Knowledge Graphs, and Why GraphBaby Lives in the Middle

> A practical guide to what an ontology *actually* is, how it differs from a knowledge graph, and where a browser-based tool like **GraphBaby** fits in.

---

## 1. Starting with the confusion

If you have spent any time around the words "ontology," "knowledge graph," "semantic web," or "RDF triples," you have probably noticed that people use them almost interchangeably — and almost always incorrectly. They are related, they overlap, and they are routinely confused, but they are *not* the same thing.

GraphBaby — the project this article lives in — is a fully client-side AI tool that turns plain text into an interactive knowledge graph in your browser. Its README cheekily calls it "a modern, lightweight, AI-assisted [Protégé](https://protege.stanford.edu/)." Protégé is the most famous *ontology* editor in the world. GraphBaby builds *knowledge graphs*. That single sentence already contains the whole tension this article unpacks.

Let's untangle it properly.

---

## 2. What is an ontology?

An **ontology** is a formal, explicit specification of the *concepts* in a domain and the *rules* that govern how those concepts relate. It is the **schema of meaning** — the blueprint, not the building.

Borrowed from philosophy (where "ontology" is the study of *what exists*), in computer science it answers three questions about a domain:

1. **What kinds of things exist?** (classes / types) — e.g. `Person`, `Organization`, `Disease`, `Medication`.
2. **How can they relate?** (properties / relationships) — e.g. a `Person` can `worksAt` an `Organization`; a `Medication` `treats` a `Disease`.
3. **What rules must hold?** (axioms / constraints) — e.g. "every `Patient` *is a* `Person`," "`treats` only connects a `Medication` to a `Disease`," "a `Person` has exactly one `dateOfBirth`."

### The defining feature: rules you can reason over

The thing that makes an ontology an ontology — and not just a labelled diagram — is that it encodes **logic a machine can reason with**. If your ontology states:

- `Cardiologist` is a subclass of `Doctor`
- `Doctor` is a subclass of `Person`

…then a reasoner can *infer*, with no extra data, that every Cardiologist is a Person. Nobody had to write that fact down. That capacity for **inference** is the heart of the concept.

Ontologies are typically written in formal languages:

| Language | What it gives you |
|----------|-------------------|
| **RDFS** | basic classes, subclasses, properties |
| **OWL** (Web Ontology Language) | rich logic: cardinality, disjointness, transitivity, equivalence |
| **SHACL** | shape constraints / validation rules |

A tiny ontology fragment in Turtle (RDF syntax) looks like this:

```turtle
:Doctor      rdfs:subClassOf :Person .
:Cardiologist rdfs:subClassOf :Doctor .

:treats   rdfs:domain :Medication ;
          rdfs:range  :Disease .
```

This says nothing about any *specific* doctor. It describes the **shape of reality** for the medical domain. That is an ontology: **the vocabulary and the rules, divorced from any particular data.**

---

## 3. What is a knowledge graph?

A **knowledge graph** is a network of **real, concrete facts** represented as a graph: nodes (entities) connected by edges (relationships). It is the **data**, the populated instance — the building, not the blueprint.

Facts are stored as **triples**:

```
(subject) --[predicate]--> (object)
```

For example:

```
(Albert Einstein) --[developed]--> (Theory of Relativity)
(Albert Einstein) --[worked_at]--> (Princeton University)
```

This is exactly GraphBaby's internal model. From the spec:

```ts
type Node = { id: string; label: string; type?: string };
type Edge = { source: string; target: string; label: string };
type Graph = { nodes: Node[]; edges: Edge[] };
```

A knowledge graph answers questions like *"Where did Einstein work?"* by traversing edges. It is **specific, instance-level, and grows by adding more facts.** Google's Knowledge Graph (the info boxes in search results), Wikidata, and enterprise customer-360 graphs are all knowledge graphs: huge collections of concrete entities and relationships.

---

## 4. The core difference, stated plainly

> **An ontology is the *schema*. A knowledge graph is the *data*.**
>
> The ontology says *"a Person can work at an Organization."*
> The knowledge graph says *"Einstein works at Princeton."*

A helpful analogy from databases:

| Database world | Semantic world | Role |
|----------------|----------------|------|
| Table schema / `CREATE TABLE` | **Ontology** | defines what *can* exist and the rules |
| Rows in the table | **Knowledge graph** | the actual records |
| `JOIN` / query | **Reasoner / traversal** | derives answers |

And the crucial relationship between them:

- A knowledge graph **can** be built on top of an ontology (then it's a "semantically rich" or "ontology-backed" knowledge graph — it can be validated and reasoned over).
- A knowledge graph **can also exist without one** — just nodes and edges with free-form labels, no enforced rules. These are sometimes called "labelled property graphs."

| Dimension | Ontology | Knowledge Graph |
|-----------|----------|-----------------|
| **What it is** | Schema of concepts + rules | Network of concrete facts |
| **Level** | Class / type level | Instance / data level |
| **Example** | "A Medication *treats* a Disease" | "Aspirin *treats* Headache" |
| **Primary value** | Consistency + inference | Connected facts to query |
| **Changes when** | The domain model changes | New facts arrive |
| **Analogy** | Blueprint, recipe, grammar | Building, meal, sentence |
| **Typical tooling** | Protégé, OWL, SHACL | Neo4j, RDF stores, Sigma.js |

---

## 5. Where GraphBaby actually sits

Now the honest part — and where the technical and the functional meet.

GraphBaby is, strictly speaking, a **knowledge graph builder, not an ontology editor.** Here is what it does, mapped to the concepts above:

1. **Input** — you paste unstructured text.
2. **Extraction** — a local LLM (via [WebLLM](https://github.com/mlc-ai/web-llm), running entirely in your browser via WebGPU) pulls out **entities** and **relationships** as triples.
3. **Render** — those triples become an interactive graph (nodes + edges) drawn with [Sigma.js](https://www.sigmajs.org) and [Graphology](https://graphology.github.io).
4. **Refine** — natural-language commands like *"merge duplicate nodes"* or *"expand this node"* let you reshape the graph.
5. **Persist & export** — graphs are saved to IndexedDB and can be exported as JSON.

Notice that GraphBaby's nodes have an optional `type` field (`Person`, `Concept`, `Organization`…) and edges have free-form labels (`developed`, `worked_at`). That `type` field is a **whisper of an ontology** — a lightweight nod to "what kind of thing is this" — but GraphBaby does **not** enforce ontological rules. Nothing stops the AI from saying a `Disease` `worked_at` a `Concept`. There is no reasoner, no OWL axioms, no validation that `treats` only connects medications to diseases.

So why compare it to Protégé at all?

### The Protégé connection — and the gap

Protégé is where humans *carefully, manually* author ontologies: defining classes, drawing subclass hierarchies, declaring property domains and ranges, and running reasoners to check consistency. It is rigorous, powerful, and — for most people — intimidating and slow.

GraphBaby flips the workflow:

| | Protégé | GraphBaby |
|---|---------|-----------|
| **Authoring** | Human, manual, formal | AI, automatic, from text |
| **Output** | Rigorous ontology (OWL) | Lightweight knowledge graph (JSON) |
| **Reasoning** | Full logical inference | None (yet) |
| **Barrier to entry** | High | Paste text, click a button |
| **Runs** | Desktop Java app | 100% in your browser tab |

GraphBaby trades **formal rigor** for **accessibility and speed**. It gets you 80% of the *intuition* of a knowledge model with 5% of the effort — which is exactly the right trade for exploration, note-taking, sense-making, and learning. It is the "baby" step: graph-thinking without the semantic-web ceremony.

### The roadmap is where the ontology creeps back in

Look at GraphBaby's own roadmap and you can see it reaching *toward* ontologies:

- **"Domain ontology plugins"** — pre-defined schemas (medical, legal, academic) that would constrain and enrich extraction. This is literally adding an ontology layer.
- **"Path-finding explanations"** and a **"graph reasoning layer"** — the beginnings of *inference*, the defining feature of ontologies.
- **"Multi-document graph merging"** — entity resolution, which is far easier when an ontology tells you two nodes are the same *kind* of thing.

In other words: GraphBaby starts as a pure knowledge-graph tool, and its natural growth path is to gradually borrow the disciplined parts of ontologies — *without* forcing the user to hand-author OWL.

---

## 6. When do you actually need which?

A practical decision guide:

**Use a (plain) knowledge graph when you want to:**
- Explore connections in a body of text or data
- Build a quick mental map of a topic
- Power a recommendation or "related items" feature
- Move fast and tolerate some messiness

→ *This is GraphBaby's sweet spot.*

**Invest in an ontology when you need to:**
- Guarantee consistency across many data sources
- Run automated reasoning ("infer all the cardiologists")
- Validate incoming data against strict rules
- Share a common, unambiguous vocabulary across teams or organizations (interoperability)
- Operate in regulated, high-stakes domains (healthcare, finance, law)

→ *This is Protégé / OWL / SHACL territory.*

The mature systems use **both**: an ontology defines the rules, and a knowledge graph holds millions of facts that obey those rules — with a reasoner connecting the two.

---

## 7. The one-paragraph summary

An **ontology** is the formal schema of a domain — the classes, the allowed relationships, and the logical rules a machine can *reason* over. A **knowledge graph** is the populated data — concrete entities and the facts linking them. The ontology is the blueprint; the knowledge graph is the building. **GraphBaby** is an AI-assisted knowledge-graph builder that turns text into an explorable graph entirely in your browser — borrowing the *spirit* of ontology tools like Protégé (typed nodes, a roadmap toward domain schemas and reasoning) while deliberately dropping their formality, so that anyone can go from a paragraph of text to a living graph in a single click.

---

*Built with Svelte 5, Sigma.js, and WebLLM. No backend, no cloud inference — your text never leaves your device.*
