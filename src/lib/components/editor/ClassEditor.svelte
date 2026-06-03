<script lang="ts">
  import type { OWLClass, Ontology } from '../../ontology/types';
  import AxiomSection from './AxiomSection.svelte';

  interface Props {
    cls: OWLClass;
    ontology: Ontology;
    onUpdate: (patch: Partial<OWLClass>) => void;
    onSuggestSubclasses: () => void;
    onGenerateDesc: () => void;
    aiRunning: boolean;
    aiSuggestion: string;
  }

  let { cls, ontology, onUpdate, onSuggestSubclasses, onGenerateDesc, aiRunning, aiSuggestion }: Props = $props();

  const classOptions = $derived(
    Object.values(ontology.classes).map((c) => ({ id: c.id, label: c.label }))
  );

  function setLabel(e: Event) {
    onUpdate({ label: (e.target as HTMLInputElement).value });
  }

  function setIRI(e: Event) {
    onUpdate({ iri: (e.target as HTMLInputElement).value });
  }

  function addComment(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const val = (e.target as HTMLInputElement).value.trim();
    if (!val) return;
    onUpdate({ annotations: [...cls.annotations, { property: 'rdfs:comment', value: val }] });
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="editor">
  <div class="editor-header">
    <span class="entity-badge class">Class</span>
    <input class="label-input" value={cls.label} oninput={setLabel} />
    {#if cls.id === 'owl_Thing'}
      <span class="builtin-tag">Built-in</span>
    {/if}
  </div>

  <div class="iri-row">
    <span class="iri-prefix">IRI:</span>
    <input class="iri-input" value={cls.iri} onchange={setIRI} disabled={cls.id === 'owl_Thing'} />
  </div>

  <div class="sections">
    <AxiomSection
      title="SubClass Of"
      items={cls.subClassOf}
      allOptions={classOptions.filter((c) => c.id !== cls.id)}
      placeholder="Add superclass…"
      onAdd={(v) => onUpdate({ subClassOf: [...new Set([...cls.subClassOf, v])] })}
      onRemove={(v) => onUpdate({ subClassOf: cls.subClassOf.filter((x) => x !== v) })}
      color="#7c3aed"
    />

    <AxiomSection
      title="Equivalent Classes"
      items={cls.equivalentClasses}
      allOptions={classOptions.filter((c) => c.id !== cls.id)}
      placeholder="Add equivalent class…"
      onAdd={(v) => onUpdate({ equivalentClasses: [...new Set([...cls.equivalentClasses, v])] })}
      onRemove={(v) => onUpdate({ equivalentClasses: cls.equivalentClasses.filter((x) => x !== v) })}
      color="#0369a1"
    />

    <AxiomSection
      title="Disjoint With"
      items={cls.disjointWith}
      allOptions={classOptions.filter((c) => c.id !== cls.id)}
      placeholder="Add disjoint class…"
      onAdd={(v) => onUpdate({ disjointWith: [...new Set([...cls.disjointWith, v])] })}
      onRemove={(v) => onUpdate({ disjointWith: cls.disjointWith.filter((x) => x !== v) })}
      color="#b91c1c"
    />

    <!-- Annotations -->
    <div class="annotation-section">
      <div class="ann-title">Annotations</div>
      {#each cls.annotations as ann, i}
        <div class="ann-row">
          <span class="ann-prop">{ann.property}</span>
          <span class="ann-value">{ann.value}</span>
          <button class="ann-del" onclick={() => onUpdate({ annotations: cls.annotations.filter((_, j) => j !== i) })}>✕</button>
        </div>
      {/each}
      <input class="ann-input" placeholder="Add rdfs:comment (press Enter)…" onkeydown={addComment} />
    </div>
  </div>

  <!-- AI panel -->
  <div class="ai-panel">
    <div class="ai-title">✦ AI Assistance</div>
    <div class="ai-buttons">
      <button class="ai-btn" disabled={aiRunning} onclick={onSuggestSubclasses}>
        Suggest Subclasses
      </button>
      <button class="ai-btn" disabled={aiRunning} onclick={onGenerateDesc}>
        Generate Description
      </button>
    </div>
    {#if aiRunning}
      <p class="ai-thinking">Thinking…</p>
    {:else if aiSuggestion}
      <div class="ai-result">{aiSuggestion}</div>
    {/if}
  </div>
</div>

<style>
  .editor { display: flex; flex-direction: column; gap: 12px; }
  .editor-header { display: flex; align-items: center; gap: 10px; }
  .entity-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: .05em; }
  .entity-badge.class { background: #ede9fe; color: #7c3aed; }
  .label-input { flex: 1; font-size: 20px; font-weight: 700; border: none; border-bottom: 2px solid #e2e8f0; padding: 2px 4px; color: #1a202c; background: transparent; }
  .label-input:focus { outline: none; border-bottom-color: #3b5998; }
  .builtin-tag { font-size: 10px; background: #fef9c3; color: #92400e; padding: 2px 8px; border-radius: 10px; }
  .iri-row { display: flex; align-items: center; gap: 8px; }
  .iri-prefix { font-size: 11px; color: #94a3b8; font-weight: 600; flex-shrink: 0; }
  .iri-input { flex: 1; font-size: 11px; font-family: monospace; padding: 3px 6px; border: 1px solid #e2e8f0; border-radius: 4px; color: #64748b; background: #f8fafc; }
  .iri-input:disabled { opacity: .6; }
  .sections { display: flex; flex-direction: column; gap: 0; }
  .annotation-section { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
  .ann-title { font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
  .ann-row { display: flex; gap: 8px; align-items: center; font-size: 12px; margin-bottom: 4px; }
  .ann-prop { font-family: monospace; color: #7c3aed; font-size: 11px; flex-shrink: 0; }
  .ann-value { flex: 1; color: #374151; }
  .ann-del { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 10px; }
  .ann-del:hover { color: #c0392b; }
  .ann-input { width: 100%; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; margin-top: 4px; }
  .ann-input:focus { outline: none; border-color: #059669; }
  .ai-panel { background: #f0f4fb; border: 1px solid #c7d6f7; border-radius: 8px; padding: 12px; }
  .ai-title { font-size: 11px; font-weight: 700; color: #3b5998; margin-bottom: 8px; letter-spacing: .05em; text-transform: uppercase; }
  .ai-buttons { display: flex; gap: 8px; }
  .ai-btn { padding: 5px 12px; background: #3b5998; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .ai-btn:hover:not(:disabled) { background: #2d4577; }
  .ai-btn:disabled { opacity: .4; cursor: not-allowed; }
  .ai-thinking { font-size: 12px; color: #3b5998; margin: 6px 0 0; }
  .ai-result { margin-top: 8px; font-size: 12px; color: #374151; line-height: 1.6; background: #fff; border-radius: 4px; padding: 8px; border: 1px solid #dbe4f8; white-space: pre-wrap; }
</style>
