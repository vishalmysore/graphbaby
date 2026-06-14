# Ontologies, Knowledge Graphs, and Artificial Intelligence

> Why I built **GraphBaby** — a hands-on experiment to see how these three ideas interchange, blur, and reinforce each other.

---

## 1. Why I built this

I kept running into the same three words — **ontology**, **knowledge graph**, and **artificial intelligence** — used as if they were interchangeable. They are related, they overlap, and they are constantly confused, but they are *not* the same thing. I didn't want to settle the question with another diagram in a slide deck; I wanted to *feel* where one ends and the next begins.

So I built **GraphBaby**: a fully client-side AI tool that turns plain text into an interactive knowledge graph, right in the browser. The whole point was to put all three concepts in one place and watch them interact — an AI model doing the extraction, a knowledge graph holding the result, and the open question of how much *ontology* I'd need to make any of it trustworthy.

I describe GraphBaby in its README as "a modern, lightweight, AI-assisted [Protégé](https://protege.stanford.edu/)." Protégé is the most famous *ontology* editor in the world. GraphBaby builds *knowledge graphs* with *AI*. That one sentence is the whole experiment — and this article is what I learned by running it.

Let's untangle the three properly.

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

This is exactly GraphBaby's internal model. I kept the data structure deliberately minimal:

```ts
type Node = { id: string; label: string; type?: string };
type Edge = { source: string; target: string; label: string };
type Graph = { nodes: Node[]; edges: Edge[] };
```

A knowledge graph answers questions like *"Where did Einstein work?"* by traversing edges. It is **specific, instance-level, and grows by adding more facts.** Google's Knowledge Graph (the info boxes in search results), Wikidata, and enterprise customer-360 graphs are all knowledge graphs: huge collections of concrete entities and relationships.

---

## 4. Where artificial intelligence enters

Here is the part that makes GraphBaby a 2026 project rather than a 2006 one.

Classically, knowledge graphs were built by **humans** (Wikidata editors) or by **brittle rule-based extractors** (regex, hand-tuned NLP pipelines). The ontology came first, painstakingly authored, and data was poured into its mould.

GraphBaby inverts that. The **AI does the extraction**: I paste raw, unstructured text, and a local large language model — running entirely in the browser via [WebLLM](https://github.com/mlc-ai/web-llm) on WebGPU — reads it and emits the triples directly. The system prompt is essentially: *"You are a knowledge graph extraction engine. Convert this text into nodes and edges as JSON."*

This is the crux of the experiment, and it cuts both ways:

- **AI makes knowledge graphs cheap.** What used to need an ontologist and an NLP team is now a paste-and-click. The barrier to a *first* graph collapses to near zero.
- **AI makes knowledge graphs unreliable.** The model will happily invent a relationship, mislabel an entity's `type`, or merge two things that shouldn't be merged. It has *no* enforced notion of what is allowed — because I gave it no ontology to obey.

And that is precisely how the three concepts revealed their relationship to me: **AI generates the graph fast and loose; an ontology is what would make the graph correct.** The LLM is the engine; the ontology is the guardrail. The knowledge graph is the thing they fight over.

---

## 5. The core difference, stated plainly

> **An ontology is the *schema*. A knowledge graph is the *data*. AI is the *engine* that can produce (or pollute) the data.**
>
> The ontology says *"a Person can work at an Organization."*
> The knowledge graph says *"Einstein works at Princeton."*
> The AI is what turned the sentence "Einstein worked at Princeton" into that triple — guess and all.

A helpful analogy from databases:

| Database world | Semantic world | Role |
|----------------|----------------|------|
| Table schema / `CREATE TABLE` | **Ontology** | defines what *can* exist and the rules |
| Rows in the table | **Knowledge graph** | the actual records |
| `JOIN` / query | **Reasoner / traversal** | derives answers |
| The app writing rows | **AI extraction** | produces the records from raw input |

And the crucial relationship between the first two:

- A knowledge graph **can** be built on top of an ontology (then it's a "semantically rich" or "ontology-backed" knowledge graph — it can be validated and reasoned over).
- A knowledge graph **can also exist without one** — just nodes and edges with free-form labels, no enforced rules. These are sometimes called "labelled property graphs." *This is what GraphBaby produces today.*

| Dimension | Ontology | Knowledge Graph | AI (LLM) |
|-----------|----------|-----------------|----------|
| **What it is** | Schema of concepts + rules | Network of concrete facts | A model that maps text → structure |
| **Level** | Class / type level | Instance / data level | The transformation step |
| **Example** | "A Medication *treats* a Disease" | "Aspirin *treats* Headache" | Reads "aspirin helps with headaches" → emits that edge |
| **Primary value** | Consistency + inference | Connected facts to query | Speed + flexibility |
| **Failure mode** | Rigid, slow to author | Messy without a schema | Hallucination, no guarantees |
| **Analogy** | Blueprint / grammar | Building / sentence | The author who writes the sentence |

---

## 6. What GraphBaby actually is — and what running the experiment taught me

GraphBaby is, strictly speaking, an **AI-driven knowledge graph builder, not an ontology editor.** Here is the pipeline I built, mapped to the three concepts:

1. **Input** — I paste unstructured text.
2. **Extraction (AI)** — a local LLM via WebLLM pulls out **entities** and **relationships** as triples, in-browser, no server.
3. **Render (knowledge graph)** — those triples become an interactive graph drawn with [Sigma.js](https://www.sigmajs.org) and [Graphology](https://graphology.github.io).
4. **Refine (AI again)** — natural-language commands like *"merge duplicate nodes"* or *"expand this node"* reshape the graph.
5. **Persist & export** — graphs save to IndexedDB and export as JSON.

Notice that my nodes carry an optional `type` field (`Person`, `Concept`, `Organization`…) and edges carry free-form labels (`developed`, `worked_at`). That `type` field is a **whisper of an ontology** — a lightweight nod to "what kind of thing is this" — but GraphBaby does **not** enforce ontological rules. Nothing stops the AI from claiming a `Disease` `worked_at` a `Concept`. There is no reasoner, no OWL axioms, no validation that `treats` only connects medications to diseases.

That gap is not an oversight — **it's the result.** By deliberately leaving the ontology out, I got to watch exactly what AI-plus-knowledge-graph looks like *without* a schema holding it accountable. And the answer is: fast, delightful, and quietly wrong at the edges.

### The Protégé contrast

Protégé is where humans *carefully, manually* author ontologies — defining classes, subclass hierarchies, property domains and ranges, then running reasoners to check consistency. It is rigorous, powerful, and, for most people, slow and intimidating.

GraphBaby flips the workflow:

| | Protégé | GraphBaby |
|---|---------|-----------|
| **Authoring** | Human, manual, formal | AI, automatic, from text |
| **Output** | Rigorous ontology (OWL) | Lightweight knowledge graph (JSON) |
| **Reasoning** | Full logical inference | None (yet) |
| **Barrier to entry** | High | Paste text, click a button |
| **Runs** | Desktop Java app | 100% in a browser tab |

I traded **formal rigor** for **accessibility and speed** — on purpose, to isolate the AI half of the equation.

### Where the ontology earns its way back in

The roadmap I set for GraphBaby is essentially "add back the ontology, one disciplined piece at a time, without making the user hand-author OWL":

- **Domain ontology plugins** — pre-defined schemas (medical, legal, academic) that would constrain and enrich the AI's extraction. This is literally bolting an ontology onto the AI.
- **Path-finding explanations** and a **graph reasoning layer** — the beginnings of *inference*, the defining feature of ontologies.
- **Multi-document graph merging** — entity resolution, which is far more reliable when an ontology tells you two nodes are the same *kind* of thing.

Each of those is a step from "AI guesses a graph" toward "AI fills in a graph whose rules are guaranteed." That arc — from loose to grounded — is the whole reason I started the project.

---

## 7. When do you actually need which?

A practical decision guide from building this:

**Lean on AI + a plain knowledge graph when you want to:**
- Explore connections in a body of text fast
- Build a quick mental map of a topic
- Power a "related items" feature
- Move fast and tolerate some messiness

→ *This is GraphBaby's sweet spot.*

**Invest in an ontology when you need to:**
- Guarantee consistency across many data sources
- Run automated reasoning ("infer all the cardiologists")
- Validate AI-generated data against strict rules
- Share an unambiguous vocabulary across teams (interoperability)
- Operate in regulated, high-stakes domains (healthcare, finance, law)

→ *This is Protégé / OWL / SHACL territory — and where AI extraction most needs a leash.*

The mature systems use **all three**: an ontology defines the rules, an AI populates a knowledge graph at scale, and a reasoner keeps the result honest.

---

## 8. The one-paragraph takeaway

An **ontology** is the formal schema of a domain — the classes, allowed relationships, and logical rules a machine can *reason* over. A **knowledge graph** is the populated data — concrete entities and the facts linking them. **Artificial intelligence** is the engine that can turn raw text into that data in seconds — brilliantly, and without any built-in guarantee of being right. I built **GraphBaby** to put all three in one browser tab and watch them interchange: the AI builds knowledge graphs from text effortlessly, and the absence of an ontology is exactly what shows you why ontologies exist. The blueprint, the building, and the machine that pours the concrete — you only really understand each one once you've tried to build with just two of them.

---

*Built with Svelte 5, Sigma.js, and WebLLM. No backend, no cloud inference — your text never leaves your device.*
