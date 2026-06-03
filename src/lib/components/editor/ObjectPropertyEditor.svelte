<script lang="ts">
  import type { ObjectProperty, Ontology, PropertyCharacteristic } from '../../ontology/types';
  import AxiomSection from './AxiomSection.svelte';

  interface Props {
    prop: ObjectProperty;
    ontology: Ontology;
    onUpdate: (patch: Partial<ObjectProperty>) => void;
  }

  let { prop, ontology, onUpdate }: Props = $props();

  const CHARACTERISTICS: PropertyCharacteristic[] = [
    'Functional', 'InverseFunctional', 'Transitive', 'Symmetric',
    'Asymmetric', 'Reflexive', 'Irreflexive',
  ];

  const classOptions = $derived(
    Object.values(ontology.classes).map((c) => ({ id: c.id, label: c.label }))
  );

  const propOptions = $derived(
    Object.values(ontology.objectProperties)
      .filter((p) => p.id !== prop.id)
      .map((p) => ({ id: p.id, label: p.label }))
  );

  function toggleChar(c: PropertyCharacteristic) {
    const has = prop.characteristics.includes(c);
    onUpdate({
      characteristics: has
        ? prop.characteristics.filter((x) => x !== c)
        : [...prop.characteristics, c],
    });
  }
</script>

<div class="editor">
  <div class="editor-header">
    <span class="entity-badge op">Object Property</span>
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
    title="Sub Property Of"
    items={prop.subPropertyOf}
    allOptions={propOptions}
    placeholder="Add super-property…"
    onAdd={(v) => onUpdate({ subPropertyOf: [...new Set([...prop.subPropertyOf, v])] })}
    onRemove={(v) => onUpdate({ subPropertyOf: prop.subPropertyOf.filter((x) => x !== v) })}
    color="#0369a1"
  />

  <AxiomSection
    title="Domain"
    items={prop.domain}
    allOptions={classOptions}
    placeholder="Add domain class…"
    onAdd={(v) => onUpdate({ domain: [...new Set([...prop.domain, v])] })}
    onRemove={(v) => onUpdate({ domain: prop.domain.filter((x) => x !== v) })}
    color="#7c3aed"
  />

  <AxiomSection
    title="Range"
    items={prop.range}
    allOptions={classOptions}
    placeholder="Add range class…"
    onAdd={(v) => onUpdate({ range: [...new Set([...prop.range, v])] })}
    onRemove={(v) => onUpdate({ range: prop.range.filter((x) => x !== v) })}
    color="#b45309"
  />

  <div class="char-section">
    <div class="char-title">Characteristics</div>
    <div class="char-grid">
      {#each CHARACTERISTICS as c}
        <label class="char-chip" class:active={prop.characteristics.includes(c)}>
          <input type="checkbox" checked={prop.characteristics.includes(c)} onchange={() => toggleChar(c)} />
          {c}
        </label>
      {/each}
    </div>
  </div>

  <div class="inverse-row">
    <span class="inv-label">Inverse Of:</span>
    <select
      class="inv-select"
      value={prop.inverseOf ?? ''}
      onchange={(e) => onUpdate({ inverseOf: (e.target as HTMLSelectElement).value || undefined })}
    >
      <option value="">— none —</option>
      {#each propOptions as o}
        <option value={o.id}>{o.label}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .editor { display: flex; flex-direction: column; gap: 10px; }
  .editor-header { display: flex; align-items: center; gap: 10px; }
  .entity-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; flex-shrink: 0; }
  .entity-badge.op { background: #dcfce7; color: #166534; }
  .label-input { flex: 1; font-size: 20px; font-weight: 700; border: none; border-bottom: 2px solid #e2e8f0; padding: 2px 4px; color: #1a202c; background: transparent; }
  .label-input:focus { outline: none; border-bottom-color: #166534; }
  .iri-row { display: flex; align-items: center; gap: 8px; }
  .iri-prefix { font-size: 11px; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
  .iri-input { flex: 1; font-size: 11px; font-family: monospace; padding: 3px 6px; border: 1px solid #e2e8f0; border-radius: 4px; color: #64748b; background: #f8fafc; }
  .char-section { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .char-title { font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .char-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .char-chip { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border: 1px solid #d0d5dd; border-radius: 14px; font-size: 12px; cursor: pointer; background: #f8fafc; color: #555; transition: all .15s; }
  .char-chip.active { background: #dcfce7; border-color: #86efac; color: #166534; font-weight: 600; }
  .char-chip input { display: none; }
  .inverse-row { display: flex; align-items: center; gap: 8px; }
  .inv-label { font-size: 12px; color: #64748b; flex-shrink: 0; }
  .inv-select { flex: 1; padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; }
</style>
