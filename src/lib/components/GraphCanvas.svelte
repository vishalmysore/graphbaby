<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GraphRenderer } from '../graph/sigmaGraph';
  import type { KGGraph, KGNode } from '../types';

  interface Props {
    graph: KGGraph;
    onNodeClick: (node: KGNode) => void;
  }

  let { graph, onNodeClick }: Props = $props();

  let container: HTMLDivElement;
  let renderer: GraphRenderer | null = null;

  onMount(() => {
    renderer = new GraphRenderer(container, onNodeClick);
    if (graph.nodes.length > 0) renderer.render(graph);
  });

  onDestroy(() => renderer?.destroy());

  $effect(() => {
    if (renderer && graph) {
      renderer.render(graph);
    }
  });
</script>

<div class="canvas-wrap">
  <div class="graph-container" bind:this={container}></div>
  {#if graph.nodes.length === 0}
    <div class="empty-state">
      <div class="empty-icon">⬡</div>
      <p>No graph yet. Paste text and click <strong>Generate Graph</strong>.</p>
    </div>
  {/if}
</div>

<style>
  .canvas-wrap { position: relative; width: 100%; height: 100%; }
  .graph-container { width: 100%; height: 100%; }
  .empty-state {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px;
    color: #334155; pointer-events: none;
  }
  .empty-icon { font-size: 64px; opacity: .3; }
  p { margin: 0; font-size: 14px; text-align: center; }
</style>
