import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import type { KGGraph, KGNode } from '../types';

const NODE_TYPE_COLORS: Record<string, string> = {
  Person: '#4f86c6',
  Concept: '#e8a838',
  Organization: '#5cb85c',
  Object: '#9b59b6',
  Event: '#e74c3c',
  Place: '#1abc9c',
  Unknown: '#95a5a6',
};

function nodeColor(type?: string): string {
  return NODE_TYPE_COLORS[type ?? 'Unknown'] ?? NODE_TYPE_COLORS.Unknown;
}

export class GraphRenderer {
  private sigma: Sigma | null = null;
  private layout: FA2Layout | null = null;
  private graphology: Graph = new Graph();
  private onNodeClick: (node: KGNode) => void;

  constructor(container: HTMLElement, onNodeClick: (node: KGNode) => void) {
    this.onNodeClick = onNodeClick;
    this.init(container);
  }

  private init(container: HTMLElement): void {
    this.graphology = new Graph();
    this.sigma = new Sigma(this.graphology, container, {
      renderEdgeLabels: true,
      defaultEdgeColor: '#aaa',
      defaultNodeColor: '#999',
    });

    this.sigma.on('clickNode', ({ node }) => {
      const attrs = this.graphology.getNodeAttributes(node);
      this.onNodeClick({ id: node, label: attrs.label, type: attrs.nodeType });
    });
  }

  render(kg: KGGraph): void {
    if (!this.sigma) return;

    this.stopLayout();
    this.graphology.clear();

    for (const node of kg.nodes) {
      this.graphology.addNode(node.id, {
        label: node.label,
        nodeType: node.type ?? 'Unknown',
        color: nodeColor(node.type),
        size: 12,
        x: Math.random() * 100,
        y: Math.random() * 100,
      });
    }

    for (const edge of kg.edges) {
      if (
        this.graphology.hasNode(edge.source) &&
        this.graphology.hasNode(edge.target) &&
        !this.graphology.hasEdge(edge.source, edge.target)
      ) {
        this.graphology.addEdge(edge.source, edge.target, {
          label: edge.label,
          size: 2,
        });
      }
    }

    this.startLayout();
  }

  private startLayout(): void {
    this.layout = new FA2Layout(this.graphology, {
      settings: { gravity: 1, scalingRatio: 2 },
    });
    this.layout.start();
    setTimeout(() => this.stopLayout(), 3000);
  }

  private stopLayout(): void {
    if (this.layout) {
      this.layout.stop();
      this.layout.kill();
      this.layout = null;
    }
  }

  highlightNode(id: string): void {
    if (!this.graphology.hasNode(id)) return;
    this.graphology.setNodeAttribute(id, 'highlighted', true);
  }

  destroy(): void {
    this.stopLayout();
    this.sigma?.kill();
    this.sigma = null;
  }
}
