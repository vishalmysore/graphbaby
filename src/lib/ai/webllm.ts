import * as webllm from '@mlc-ai/web-llm';
import type { KGGraph } from '../types';

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine.
Convert input text into a structured graph of entities and relationships.

Return ONLY valid JSON with no extra commentary:

{
  "nodes": [{"id": "...", "label": "...", "type": "..."}],
  "edges": [{"source": "...", "target": "...", "label": "..."}]
}

Rules:
- Keep nodes minimal but meaningful
- Merge duplicates
- Prefer canonical entity names
- Use simple relationship labels (is, part_of, causes, works_at, developed, etc.)
- Node types: Person, Concept, Organization, Object, Event, Place
- IDs must be lowercase snake_case with no spaces`;

export class WebLLMEngine {
  private engine: webllm.MLCEngine | null = null;
  private modelId: string = '';

  async load(
    modelId: string,
    onProgress: (report: webllm.InitProgressReport) => void,
  ): Promise<void> {
    this.engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: onProgress,
    });
    this.modelId = modelId;
  }

  isReady(): boolean {
    return this.engine !== null;
  }

  async extractGraph(text: string): Promise<KGGraph> {
    if (!this.engine) throw new Error('Model not loaded');

    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract a knowledge graph from this text:\n\n${text}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const raw = response.choices[0].message.content ?? '';
    return parseGraphJSON(raw);
  }

  async refineGraph(graph: KGGraph, command: string): Promise<KGGraph> {
    if (!this.engine) throw new Error('Model not loaded');

    const graphJson = JSON.stringify(graph, null, 2);
    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Given this knowledge graph:\n${graphJson}\n\nApply this command and return the updated graph as JSON:\n"${command}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const raw = response.choices[0].message.content ?? '';
    return parseGraphJSON(raw);
  }

  async summarizeNode(nodeLabel: string, graph: KGGraph): Promise<string> {
    if (!this.engine) throw new Error('Model not loaded');

    const connected = graph.edges
      .filter((e) => e.source === nodeLabel || e.target === nodeLabel)
      .map((e) => `${e.source} --[${e.label}]--> ${e.target}`)
      .join('\n');

    const response = await this.engine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `In 2-3 sentences, summarize "${nodeLabel}" based on these relationships:\n${connected}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    return response.choices[0].message.content ?? '';
  }
}

function parseGraphJSON(raw: string): KGGraph {
  // Extract JSON block if wrapped in markdown
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : raw;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      throw new Error('Invalid graph structure');
    }
    return { nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    throw new Error(`Failed to parse AI response as graph JSON:\n${raw}`);
  }
}
