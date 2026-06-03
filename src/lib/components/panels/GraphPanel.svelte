<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Ontology } from '../../ontology/types';
  import { GraphRenderer } from '../../graph/sigmaGraph';

  interface Props { ontology: Ontology; }
  let { ontology }: Props = $props();

  let container: HTMLDivElement;
  let renderer: GraphRenderer | null = null;

  function buildKG(onto: Ontology) {
    const nodes = Object.values(onto.classes).map((c) => ({
      id: c.id, label: c.label, type: 'Class',
    }));
    const edges = Object.values(onto.classes).flatMap((c) =>
      c.subClassOf.map((p) => ({ source: c.id, target: p, label: 'subClassOf' }))
    );
    // add object property edges between classes
    for (const op of Object.values(onto.objectProperties)) {
      for (const d of op.domain) {
        for (const r of op.range) {
          edges.push({ source: d, target: r, label: op.label });
        }
      }
    }
    return { nodes, edges };
  }

  onMount(() => {
    renderer = new GraphRenderer(container, () => {});
    renderer.render(buildKG(ontology));
  });

  onDestroy(() => renderer?.destroy());

  $effect(() => {
    if (renderer) renderer.render(buildKG(ontology));
  });
</script>

<div class="graph-wrap">
  <div class="graph-header">Class Hierarchy Graph (secondary view)</div>
  <div class="graph-container" bind:this={container}></div>
</div>

<style>
  .graph-wrap { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
  .graph-header { padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
  .graph-container { flex: 1; }
</style>
