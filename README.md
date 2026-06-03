# GraphBaby ⬡

> AI-powered knowledge graph editor that runs entirely in your browser — no backend, no cloud inference.

**Live demo:** https://vishalmysore.github.io/graphbaby/

---

## What it does

Paste any text (articles, notes, bullet points) and GraphBaby uses a local AI model to extract entities and relationships, then renders them as an interactive knowledge graph you can explore and edit.

```
text → entities + relationships → interactive graph
```

Think of it as a modern, lightweight, AI-assisted [Protégé](https://protege.stanford.edu/).

---

## Features

- **100% client-side** — AI runs in the browser via [WebLLM](https://github.com/mlc-ai/web-llm) (WebGPU/WASM)
- **Local inference** — no data leaves your device
- **Interactive graph** — zoom, pan, drag nodes, click to inspect
- **AI commands** — "simplify graph", "merge duplicate nodes", "expand key concepts"
- **Node inspector** — AI-generated summary per node
- **Persistent storage** — graphs saved to IndexedDB
- **Export** — download graph as JSON
- **GitHub Pages deployable** — static build, no server needed

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Frontend | [Svelte 5](https://svelte.dev) + TypeScript |
| Build | [Vite](https://vitejs.dev) |
| Graph | [Sigma.js](https://www.sigmajs.org) + [Graphology](https://graphology.github.io) |
| AI | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) |
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

## Roadmap

- [ ] PDF / URL input
- [ ] GraphML export
- [ ] Multi-document graph merging
- [ ] Path-finding explanations
- [ ] Domain ontology plugins

---

## License

[MIT](LICENSE) © 2026 Vishal Mysore
