<script lang="ts">
  import type { KGGraph, KGNode } from '../types';

  interface Props {
    node: KGNode | null;
    graph: KGGraph;
    summary: string;
    loadingSummary: boolean;
    onSummarize: (node: KGNode) => void;
  }

  let { node, graph, summary, loadingSummary, onSummarize }: Props = $props();

  const connectedEdges = $derived(
    node
      ? graph.edges.filter((e) => e.source === node.id || e.target === node.id)
      : [],
  );
</script>

<div class="inspector">
  <div class="inspector-header">Node Inspector</div>

  {#if !node}
    <p class="empty">Click a node in the graph to inspect it.</p>
  {:else}
    <div class="node-card">
      <div class="node-label">{node.label}</div>
      <div class="node-type-badge">{node.type ?? 'Unknown'}</div>
    </div>

    <section>
      <div class="section-title">Connections ({connectedEdges.length})</div>
      {#if connectedEdges.length === 0}
        <p class="empty">No connections.</p>
      {:else}
        <ul class="edge-list">
          {#each connectedEdges as edge}
            <li>
              <span class="edge-src">{edge.source}</span>
              <span class="edge-rel">—[{edge.label}]→</span>
              <span class="edge-tgt">{edge.target}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <div class="section-title">AI Summary</div>
      {#if loadingSummary}
        <p class="loading">Generating summary…</p>
      {:else if summary}
        <p class="summary-text">{summary}</p>
      {:else}
        <button class="btn-outline" onclick={() => node && onSummarize(node)}>
          Generate Summary
        </button>
      {/if}
    </section>
  {/if}
</div>

<style>
  .inspector { display: flex; flex-direction: column; gap: 14px; height: 100%; overflow-y: auto; }
  .inspector-header { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
  .empty { font-size: 13px; color: #475569; margin: 0; }
  .node-card { background: #1e293b; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .node-label { font-size: 18px; font-weight: 700; color: #e2e8f0; }
  .node-type-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #6366f120; color: #818cf8; border: 1px solid #6366f140; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-bottom: 4px; }
  .edge-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
  .edge-list li { font-size: 12px; display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
  .edge-src, .edge-tgt { color: #93c5fd; font-weight: 500; }
  .edge-rel { color: #64748b; font-size: 11px; }
  .summary-text { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0; }
  .loading { font-size: 13px; color: #6366f1; margin: 0; animation: blink 1s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.4} }
  .btn-outline { padding: 7px 14px; background: transparent; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .btn-outline:hover { border-color: #6366f1; color: #e2e8f0; }
  section { display: flex; flex-direction: column; gap: 6px; }
</style>
