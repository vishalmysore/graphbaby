export type NodeType = 'Person' | 'Concept' | 'Organization' | 'Object' | 'Event' | 'Place' | 'Unknown';

export interface KGNode {
  id: string;
  label: string;
  type?: NodeType | string;
}

export interface KGEdge {
  source: string;
  target: string;
  label: string;
}

export interface KGGraph {
  id?: string;
  nodes: KGNode[];
  edges: KGEdge[];
  createdAt?: number;
  rawInput?: string;
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';

export interface ModelInfo {
  id: string;
  label: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', label: 'Phi-3 Mini (4K, faster)' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B (smallest)' },
  { id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', label: 'Llama 3.2 3B (balanced)' },
];
