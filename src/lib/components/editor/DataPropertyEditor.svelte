<script lang="ts">
  import type { DataProperty, Ontology } from '../../ontology/types';
  import { XSD_TYPES } from '../../ontology/types';
  import AxiomSection from './AxiomSection.svelte';

  interface Props {
    prop: DataProperty;
    ontology: Ontology;
    onUpdate: (patch: Partial<DataProperty>) => void;
  }

  let { prop, ontology, onUpdate }: Props = $props();

  const classOptions = $derived(
    Object.values(ontology.classes).map((c) => ({ id: c.id, label: c.label }))
  );
</script>

<div class="editor">
  <div class="editor-header">
    <span class="entity-badge dp">Data Property</span>
    <input
      class="label-input"
      value={prop.label}
      oninput={(e) => onUpdate({ label: (e.target as HTMLInputElement).value })}
    />
  </div>
  <div class="iri-row">
    <span class="iri-prefix">IRI:</span>
    <input class="iri-input" value={prop.iri} onchange={(e) => onUpdate({ iri: (e.target as HTMLInputElement).value })} />
  </div>

  <AxiomSection
    title="Domain"
    items={prop.domain}
    allOptions={classOptions}
    placeholder="Add domain class…"
    onAdd={(v) => onUpdate({ domain: [...new Set([...prop.domain, v])] })}
    onRemove={(v) => onUpdate({ domain: prop.domain.filter((x) => x !== v) })}
    color="#7c3aed"
  />

  <div class="range-section">
    <div class="range-title">Range (XSD Type)</div>
    <div class="range-chips">
      {#each prop.range as r}
        <div class="range-chip">
          {r}
          <button onclick={() => onUpdate({ range: prop.range.filter((x) => x !== r) })}>✕</button>
        </div>
      {/each}
    </div>
    <select
      class="xsd-select"
      onchange={(e) => {
        const v = (e.target as HTMLSelectElement).value;
        if (v && !prop.range.includes(v)) onUpdate({ range: [...prop.range, v] });
        (e.target as HTMLSelectElement).value = '';
      }}
    >
      <option value="">Add XSD type…</option>
      {#each XSD_TYPES as t}
        <option value={t}>{t}</option>
      {/each}
    </select>
  </div>

  <label class="functional-check">
    <input
      type="checkbox"
      checked={prop.characteristics.includes('Functional')}
      onchange={(e) =>
        onUpdate({
          characteristics: (e.target as HTMLInputElement).checked ? ['Functional'] : [],
        })
      }
    />
    Functional
  </label>
</div>

<style>
  .editor { display: flex; flex-direction: column; gap: 10px; }
  .editor-header { display: flex; align-items: center; gap: 10px; }
  .entity-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; flex-shrink: 0; }
  .entity-badge.dp { background: #fef3c7; color: #92400e; }
  .label-input { flex: 1; font-size: 20px; font-weight: 700; border: none; border-bottom: 2px solid #e2e8f0; padding: 2px 4px; color: #1a202c; background: transparent; }
  .label-input:focus { outline: none; border-bottom-color: #92400e; }
  .iri-row { display: flex; align-items: center; gap: 8px; }
  .iri-prefix { font-size: 11px; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
  .iri-input { flex: 1; font-size: 11px; font-family: monospace; padding: 3px 6px; border: 1px solid #e2e8f0; border-radius: 4px; color: #64748b; background: #f8fafc; }
  .range-section { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .range-title { font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .range-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
  .range-chip { display: flex; align-items: center; gap: 5px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 4px; padding: 3px 8px; font-size: 12px; font-family: monospace; color: #92400e; }
  .range-chip button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 10px; }
  .xsd-select { padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; font-family: monospace; }
  .functional-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #374151; cursor: pointer; }
</style>
