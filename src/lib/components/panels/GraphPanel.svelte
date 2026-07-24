<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Ontology } from '../../ontology/types';
  import { GraphRenderer, type SimpleGraph } from '../../graph/sigmaGraph';

  interface Props { ontology: Ontology; }
  let { ontology }: Props = $props();

  type ViewMode = 'schema' | 'instances';
  let mode = $state<ViewMode>('schema');

  let container: HTMLDivElement;
  let renderer: GraphRenderer | null = null;

  const individualCount = $derived(Object.keys(ontology.individuals).length);

  // Schema view: classes as nodes, subClassOf + object-property edges between classes.
  function buildSchemaKG(onto: Ontology): SimpleGraph {
    const nodes = Object.values(onto.classes).map((c) => ({ id: c.id, label: c.label, type: 'Class' }));
    const edges = Object.values(onto.classes).flatMap((c) =>
      c.subClassOf.map((p) => ({ source: c.id, target: p, label: 'subClassOf' })),
    );
    for (const op of Object.values(onto.objectProperties)) {
      for (const d of op.domain) {
        for (const r of op.range) edges.push({ source: d, target: r, label: op.label });
      }
    }
    return { nodes, edges };
  }

  // Instances view: individuals as nodes, their type-class as nodes, rdf:type edges,
  // and object-property assertions as edges between individuals.
  function buildInstanceKG(onto: Ontology): SimpleGraph {
    const nodes: SimpleGraph['nodes'] = [];
    const edges: SimpleGraph['edges'] = [];
    const classSeen = new Set<string>();

    for (const ind of Object.values(onto.individuals)) {
      nodes.push({ id: ind.id, label: ind.label, type: 'Individual' });
      for (const t of ind.types) {
        const cls = onto.classes[t];
        if (cls && !classSeen.has(cls.id)) {
          nodes.push({ id: cls.id, label: cls.label, type: 'Class' });
          classSeen.add(cls.id);
        }
        edges.push({ source: ind.id, target: t, label: 'type' });
      }
    }
    // assertion edges (only when the target individual exists in the graph)
    const indIds = new Set(Object.keys(onto.individuals));
    for (const ind of Object.values(onto.individuals)) {
      for (const opa of ind.objectPropertyAssertions) {
        if (!indIds.has(opa.target)) continue;
        const label = onto.objectProperties[opa.property]?.label ?? opa.property;
        edges.push({ source: ind.id, target: opa.target, label });
      }
    }
    return { nodes, edges };
  }

  function build(onto: Ontology): SimpleGraph {
    return mode === 'instances' ? buildInstanceKG(onto) : buildSchemaKG(onto);
  }

  onMount(() => {
    renderer = new GraphRenderer(container, () => {});
    renderer.render(build(ontology));
  });

  onDestroy(() => renderer?.destroy());

  $effect(() => {
    // re-render when the ontology or the view mode changes
    mode;
    if (renderer) renderer.render(build(ontology));
  });
</script>

<div class="graph-wrap">
  <div class="graph-header">
    <span class="gh-title">
      {mode === 'instances' ? 'Instance Graph' : 'Class Hierarchy Graph'} (secondary view)
    </span>
    <div class="mode-toggle">
      <button class="mt-btn" class:active={mode === 'schema'} onclick={() => (mode = 'schema')}>
        Schema
      </button>
      <button
        class="mt-btn"
        class:active={mode === 'instances'}
        disabled={individualCount === 0}
        title={individualCount === 0 ? 'No individuals yet' : `${individualCount} individuals`}
        onclick={() => (mode = 'instances')}
      >
        Instances{individualCount > 0 ? ` (${individualCount})` : ''}
      </button>
    </div>
    <div class="legend">
      <span class="lg"><span class="dot cls"></span>Class</span>
      {#if mode === 'instances'}<span class="lg"><span class="dot ind"></span>Individual</span>{/if}
    </div>
  </div>
  <div class="graph-container" bind:this={container}></div>
</div>

<style>
  .graph-wrap { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
  .graph-header {
    display: flex; align-items: center; gap: 14px; padding: 7px 12px;
    border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
  }
  .gh-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
  .mode-toggle { display: flex; border: 1px solid #d0d5dd; border-radius: 6px; overflow: hidden; }
  .mt-btn { padding: 4px 12px; background: #fff; border: none; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; }
  .mt-btn + .mt-btn { border-left: 1px solid #d0d5dd; }
  .mt-btn.active { background: #3b5998; color: #fff; }
  .mt-btn:disabled { opacity: .4; cursor: not-allowed; }
  .legend { display: flex; gap: 12px; margin-left: auto; }
  .lg { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
  .dot.cls { background: #4f86c6; }
  .dot.ind { background: #e8a838; }
  .graph-container { flex: 1; }
</style>
