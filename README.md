# GraphBaby ⬡

> AI-powered knowledge graph editor that runs entirely in your browser — no backend, no cloud inference.

**Live demo:** https://vishalmysore.github.io/graphbaby/

---

## What it does

Paste any text (articles, notes, bullet points) and GraphBaby uses a local AI model to extract entities and relationships, then renders them as an interactive knowledge graph you can explore and edit.

```
text → entities + relationships → interactive graph
```

Think of it as a modern, lightweight, AI-assisted ontology editor.

---

## Features

- **100% client-side** — AI runs in the browser via [WebLLM](https://github.com/mlc-ai/web-llm) (WebGPU/WASM)
- **Local inference** — no data leaves your device
- **PDF ingestion** — drag a PDF into the extraction wizard; text is parsed in-browser via [pdf.js](https://mozilla.github.io/pdf.js/)
- **Database → Graph** — load a `.sqlite`/`.db` file or write SQL ([sql.js](https://sql.js.org)) and map tables → classes, columns → data properties, foreign keys → object properties, rows → individuals — deterministically, no model needed
- **Interactive graph** — zoom, pan, drag nodes, click to inspect; **Schema** and **Instances** views
- **AI commands** — "simplify graph", "merge duplicate nodes", "expand key concepts"
- **Node inspector** — AI-generated summary per node
- **Persistent storage** — graphs saved to IndexedDB
- **Export** — JSON, OWL/XML, **SQL** (tables + rows) and **CSV** (`.zip`, one file per table)
- **GitHub Pages deployable** — static build, no server needed

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Frontend | [Svelte 5](https://svelte.dev) + TypeScript |
| Build | [Vite](https://vitejs.dev) |
| Graph | [Sigma.js](https://www.sigmajs.org) + [Graphology](https://graphology.github.io) |
| AI | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) |
| Database | [sql.js](https://sql.js.org) (SQLite/WASM) |
| PDF | [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) |
| Storage | [idb](https://github.com/jakearchibald/idb) (IndexedDB) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A WebGPU-capable browser: **Chrome 113+** or **Edge 113+**

### Install & run locally

```bash
git clone https://github.com/vishalmysore/graphbaby.git
cd graphbaby
npm install
npm run dev
```

Open http://localhost:5173/graphbaby/

### Build for production

```bash
npm run build
# output in dist/
```

---

## Usage

1. **Load a model** — choose a model (Phi-3 Mini is fastest) and click *Load Model*. The model downloads once and is cached locally.
2. **Paste text** — drop any text into the input panel.
3. **Generate Graph** — AI extracts entities and relationships and renders the graph.
4. **Explore** — click nodes to inspect them; use quick commands to refine the graph.
5. **Export** — download the graph as JSON for use in other tools.

### Supported AI Models

| Model | Size | Best for |
|-------|------|----------|
| Phi-3 Mini (4K) | ~2 GB | Speed, everyday use |
| Llama 3.2 1B | ~1 GB | Low-VRAM devices |
| Llama 3.2 3B | ~2 GB | Better accuracy |

---

## Deployment

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys to GitHub Pages automatically on every push to `main`.

Enable GitHub Pages in your repo settings → *Pages* → Source: **GitHub Actions**.

---

## Graph Data Format

```ts
type Node = { id: string; label: string; type?: string };
type Edge = { source: string; target: string; label: string };
type Graph = { nodes: Node[]; edges: Edge[] };
```

---

## Database → Graph

Beyond text extraction, GraphBaby can map a **relational database** straight into an ontology — a deterministic "direct mapping" (in the spirit of [R2RML](https://www.w3.org/TR/r2rml/)), no AI model required:

| Relational | → | Ontology |
|---|---|---|
| table | → | Class |
| plain column | → | Data Property (xsd type inferred from the SQL type) |
| foreign key | → | Object Property (domain = table, range = referenced table) |
| row *(optional)* | → | Individual, with column values as data/object-property assertions |

Click **🗄 Database** in the top bar, then either **write SQL** (there's a sample schema) or **drop a `.sqlite`/`.db` file**. Preview the schema, choose whether to import rows, and convert. Everything runs in-browser via [sql.js](https://sql.js.org). The mapping is invertible — **Export → SQL / CSV** turns the ontology back into tables and rows.

## Roadmap

- [x] PDF input
- [x] Database (SQLite) → graph, with SQL/CSV export
- [ ] URL input
- [ ] GraphML export
- [ ] Multi-document graph merging
- [ ] Path-finding explanations
- [ ] Domain ontology plugins

---

## Acknowledgements

Built on these open-source libraries:

| Library | License |
|---------|---------|
| [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) | Apache-2.0 |
| [sql.js](https://sql.js.org) | MIT |
| [pdf.js](https://mozilla.github.io/pdf.js/) | Apache-2.0 |
| [Svelte](https://svelte.dev) | MIT |
| [Sigma.js](https://www.sigmajs.org) | MIT |
| [Graphology](https://graphology.github.io) | MIT |
| [idb](https://github.com/jakearchibald/idb) | ISC |
| [Vite](https://vitejs.dev) | MIT |

All dependencies are under permissive licenses compatible with this project's MIT license.

---

## License

[MIT](LICENSE) © 2026 Vishal Mysore
