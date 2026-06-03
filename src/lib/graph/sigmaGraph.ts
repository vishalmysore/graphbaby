import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';

export interface SimpleNode { id: string; label: string; type?: string; }
export interface SimpleEdge { source: string; target: string; label: string; }
export interface SimpleGraph { nodes: SimpleNode[]; edges: SimpleEdge[]; }

const TYPE_COLORS: Record<string, string> = {
  Class: '#4f86c6',
  Person: '#4f86c6',
  Concept: '#e8a838',
  Organization: '#5cb85c',
  Object: '#9b59b6',
  Event: '#e74c3c',
  Place: '#1abc9c',
};

function nodeColor(type?: string): string {
  return TYPE_COLORS[type ?? ''] ?? '#95a5a6';
}

export class GraphRenderer {
  private sigma: Sigma | null = null;
  private layout: FA2Layout | null = null;
  private g: Graph = new Graph();
  private onClick: (node: SimpleNode) => void;

  constructor(container: HTMLElement, onClick: (node: SimpleNode) => void) {
    this.onClick = onClick;
    this.g = new Graph();
    this.sigma = new Sigma(this.g, container, {
      renderEdgeLabels: true,
      defaultEdgeColor: '#ccc',
    });
    this.sigma.on('clickNode', ({ node }) => {
      const a = this.g.getNodeAttributes(node);
      this.onClick({ id: node, label: a.label, type: a.nodeType });
    });
  }

  render(kg: SimpleGraph): void {
    this.stopLayout();
    this.g.clear();

    for (const n of kg.nodes) {
      if (!this.g.hasNode(n.id)) {
        this.g.addNode(n.id, {
          label: n.label, nodeType: n.type ?? 'Class',
          color: nodeColor(n.type), size: 12,
          x: Math.random() * 100, y: Math.random() * 100,
        });
      }
    }

    for (const e of kg.edges) {
      if (this.g.hasNode(e.source) && this.g.hasNode(e.target)) {
        try {
          this.g.addEdge(e.source, e.target, { label: e.label, size: 2 });
        } catch { /* skip duplicate edges */ }
      }
    }

    this.startLayout();
  }

  private startLayout(): void {
    if (this.g.order < 2) return;
    this.layout = new FA2Layout(this.g, { settings: { gravity: 1, scalingRatio: 2 } });
    this.layout.start();
    setTimeout(() => this.stopLayout(), 3000);
  }

  private stopLayout(): void {
    if (this.layout) { this.layout.stop(); this.layout.kill(); this.layout = null; }
  }

  destroy(): void { this.stopLayout(); this.sigma?.kill(); this.sigma = null; }
}
