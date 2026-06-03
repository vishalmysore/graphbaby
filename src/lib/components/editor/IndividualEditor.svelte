<script lang="ts">
  import type { Individual, Ontology } from '../../ontology/types';
  import AxiomSection from './AxiomSection.svelte';

  interface Props {
    individual: Individual;
    ontology: Ontology;
    onUpdate: (patch: Partial<Individual>) => void;
  }

  let { individual, ontology, onUpdate }: Props = $props();

  const classOptions = $derived(
    Object.values(ontology.classes).map((c) => ({ id: c.id, label: c.label }))
  );
  const individualOptions = $derived(
    Object.values(ontology.individuals)
      .filter((i) => i.id !== individual.id)
      .map((i) => ({ id: i.id, label: i.label }))
  );
  const opOptions = $derived(
    Object.values(ontology.objectProperties).map((p) => ({ id: p.id, label: p.label }))
  );
  const dpOptions = $derived(
    Object.values(ontology.dataProperties).map((p) => ({ id: p.id, label: p.label }))
  );

  let newOPProp = $state('');
  let newOPTarget = $state('');
  let newDPProp = $state('');
  let newDPValue = $state('');

  function resolveLabel(id: string, options: { id: string; label: string }[]): string {
    return options.find((o) => o.id === id)?.label ?? id;
  }

  function addOPA() {
    if (!newOPProp || !newOPTarget) return;
    onUpdate({
      objectPropertyAssertions: [
        ...individual.objectPropertyAssertions,
        { property: newOPProp, target: newOPTarget },
      ],
    });
    newOPProp = ''; newOPTarget = '';
  }

  function addDPA() {
    if (!newDPProp || !newDPValue) return;
    onUpdate({
      dataPropertyAssertions: [
        ...individual.dataPropertyAssertions,
        { property: newDPProp, value: newDPValue, type: 'xsd:string' },
      ],
    });
    newDPProp = ''; newDPValue = '';
  }
</script>

<div class="editor">
  <div class="editor-header">
    <span class="entity-badge ind">Individual</span>
    <input
      class="label-input"
      value={individual.label}
      oninput={(e) => onUpdate({ label: (e.target as HTMLInputElement).value })}
    />
  </div>
  <div class="iri-row">
    <span class="iri-prefix">IRI:</span>
    <input class="iri-input" value={individual.iri} onchange={(e) => onUpdate({ iri: (e.target as HTMLInputElement).value })} />
  </div>

  <AxiomSection
    title="Types"
    items={individual.types}
    allOptions={classOptions}
    placeholder="Add type class…"
    onAdd={(v) => onUpdate({ types: [...new Set([...individual.types, v])] })}
    onRemove={(v) => onUpdate({ types: individual.types.filter((x) => x !== v) })}
    color="#7c3aed"
  />

  <AxiomSection
    title="Same As"
    items={individual.sameAs}
    allOptions={individualOptions}
    placeholder="Add same individual…"
    onAdd={(v) => onUpdate({ sameAs: [...new Set([...individual.sameAs, v])] })}
    onRemove={(v) => onUpdate({ sameAs: individual.sameAs.filter((x) => x !== v) })}
    color="#0369a1"
  />

  <!-- Object property assertions -->
  <div class="assert-section">
    <div class="assert-title">Object Property Assertions</div>
    {#each individual.objectPropertyAssertions as opa, i}
      <div class="assert-row">
        <span class="assert-prop">{resolveLabel(opa.property, opOptions)}</span>
        <span class="assert-arrow">→</span>
        <span class="assert-val">{resolveLabel(opa.target, individualOptions)}</span>
        <button onclick={() => onUpdate({ objectPropertyAssertions: individual.objectPropertyAssertions.filter((_, j) => j !== i) })}>✕</button>
      </div>
    {/each}
    <div class="assert-add">
      <select bind:value={newOPProp} class="mini-select">
        <option value="">Property…</option>
        {#each opOptions as o}<option value={o.id}>{o.label}</option>{/each}
      </select>
      <select bind:value={newOPTarget} class="mini-select">
        <option value="">Individual…</option>
        {#each individualOptions as o}<option value={o.id}>{o.label}</option>{/each}
      </select>
      <button class="btn-add" onclick={addOPA}>Add</button>
    </div>
  </div>

  <!-- Data property assertions -->
  <div class="assert-section">
    <div class="assert-title">Data Property Assertions</div>
    {#each individual.dataPropertyAssertions as dpa, i}
      <div class="assert-row">
        <span class="assert-prop">{resolveLabel(dpa.property, dpOptions)}</span>
        <span class="assert-arrow">:</span>
        <span class="assert-val">"{dpa.value}"</span>
        <button onclick={() => onUpdate({ dataPropertyAssertions: individual.dataPropertyAssertions.filter((_, j) => j !== i) })}>✕</button>
      </div>
    {/each}
    <div class="assert-add">
      <select bind:value={newDPProp} class="mini-select">
        <option value="">Property…</option>
        {#each dpOptions as o}<option value={o.id}>{o.label}</option>{/each}
      </select>
      <input bind:value={newDPValue} placeholder="Value…" class="mini-input" onkeydown={(e) => e.key === 'Enter' && addDPA()} />
      <button class="btn-add" onclick={addDPA}>Add</button>
    </div>
  </div>
</div>

<style>
  .editor { display: flex; flex-direction: column; gap: 10px; }
  .editor-header { display: flex; align-items: center; gap: 10px; }
  .entity-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; flex-shrink: 0; }
  .entity-badge.ind { background: #fce7f3; color: #9d174d; }
  .label-input { flex: 1; font-size: 20px; font-weight: 700; border: none; border-bottom: 2px solid #e2e8f0; padding: 2px 4px; color: #1a202c; background: transparent; }
  .label-input:focus { outline: none; border-bottom-color: #9d174d; }
  .iri-row { display: flex; align-items: center; gap: 8px; }
  .iri-prefix { font-size: 11px; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
  .iri-input { flex: 1; font-size: 11px; font-family: monospace; padding: 3px 6px; border: 1px solid #e2e8f0; border-radius: 4px; color: #64748b; background: #f8fafc; }
  .assert-section { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .assert-title { font-size: 12px; font-weight: 700; color: #9d174d; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .assert-row { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 5px; }
  .assert-prop { color: #3b5998; font-weight: 600; }
  .assert-arrow { color: #94a3b8; }
  .assert-val { color: #374151; flex: 1; }
  .assert-row button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 10px; }
  .assert-row button:hover { color: #c0392b; }
  .assert-add { display: flex; gap: 6px; margin-top: 6px; }
  .mini-select { flex: 1; padding: 4px 6px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; }
  .mini-input { flex: 1; padding: 4px 6px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; }
  .btn-add { padding: 4px 10px; background: #3b5998; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-add:hover { background: #2d4577; }
</style>
