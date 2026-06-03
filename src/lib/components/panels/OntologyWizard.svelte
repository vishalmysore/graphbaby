<script lang="ts">
  import type { ProposedClass, ProposedIndividual } from '../../ai/webllm';
  import type { Ontology } from '../../ontology/types';

  interface Props {
    modelReady: boolean;
    running: boolean;
    ontology: Ontology;
    onExtractClasses: (text: string) => Promise<ProposedClass[]>;
    onApplyClasses: (classes: ProposedClass[]) => void;
    onExtractIndividuals: (text: string) => Promise<ProposedIndividual[]>;
    onApplyIndividuals: (individuals: ProposedIndividual[]) => void;
    onClose: () => void;
  }

  let {
    modelReady, running, ontology,
    onExtractClasses, onApplyClasses,
    onExtractIndividuals, onApplyIndividuals,
    onClose,
  }: Props = $props();

  // ── State machine ──────────────────────────────────────────────────────────
  type WizardStep = 'input' | 'preview_classes' | 'classes_done' | 'preview_individuals' | 'done';
  let step = $state<WizardStep>('input');
  let text = $state('');
  let indText = $state('');
  let proposedClasses = $state<ProposedClass[]>([]);
  let proposedIndividuals = $state<ProposedIndividual[]>([]);
  let error = $state('');
  let busy = $state(false);

  // Has the ontology any real classes beyond owl:Thing?
  const hasClasses = $derived(
    Object.keys(ontology.classes).filter((k) => k !== 'owl_Thing').length > 0,
  );

  const approvedClasses = $derived(proposedClasses.filter((c) => c.approved));
  const approvedIndividuals = $derived(proposedIndividuals.filter((i) => i.approved));

  // ── Helpers ────────────────────────────────────────────────────────────────
  function classLabel(id: string): string {
    // check ontology first, then proposed
    return (
      ontology.classes[id]?.label ??
      proposedClasses.find((c) => c.id === id)?.label ??
      id
    );
  }

  function parentChain(cls: ProposedClass, depth = 0): string {
    if (depth > 5 || cls.subClassOf === 'owl_Thing') return 'Thing';
    const parent = proposedClasses.find((c) => c.id === cls.subClassOf);
    if (!parent) return classLabel(cls.subClassOf);
    return `${parentChain(parent, depth + 1)} › ${parent.label}`;
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function runExtractClasses() {
    busy = true; error = '';
    try {
      proposedClasses = await onExtractClasses(text);
      step = 'preview_classes';
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  function applyClasses() {
    onApplyClasses(approvedClasses);
    step = 'classes_done';
    indText = text; // pre-fill individual text with same source
  }

  async function runExtractIndividuals() {
    busy = true; error = '';
    try {
      proposedIndividuals = await onExtractIndividuals(indText);
      if (proposedIndividuals.length === 0) {
        error = 'No individuals found. Try pasting more detailed text with named entities.';
      } else {
        step = 'preview_individuals';
      }
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  function applyIndividuals() {
    onApplyIndividuals(approvedIndividuals);
    step = 'done';
  }

  function startOver() {
    step = 'input'; text = ''; indText = '';
    proposedClasses = []; proposedIndividuals = []; error = '';
  }

  function toggleClass(id: string) {
    proposedClasses = proposedClasses.map((c) =>
      c.id === id ? { ...c, approved: !c.approved } : c,
    );
  }

  function toggleIndividual(id: string) {
    proposedIndividuals = proposedIndividuals.map((i) =>
      i.id === id ? { ...i, approved: !i.approved } : i,
    );
  }
</script>

<!-- ── Overlay ──────────────────────────────────────────────────────────────── -->
<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal">

    <!-- Header -->
    <div class="modal-header">
      <div class="header-left">
        <span class="wizard-icon">✦</span>
        <div>
          <div class="modal-title">Guided Ontology Builder</div>
          <div class="modal-sub">
            {step === 'input' ? 'Step 1 of 2 — Build Class Hierarchy'
            : step === 'preview_classes' ? 'Step 1 of 2 — Review Proposed Classes'
            : step === 'classes_done' ? 'Step 2 of 2 — Extract Individuals'
            : step === 'preview_individuals' ? 'Step 2 of 2 — Review Proposed Individuals'
            : 'Done!'}
          </div>
        </div>
      </div>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <!-- Step indicators -->
    <div class="steps">
      <div class="step" class:active={step === 'input' || step === 'preview_classes'} class:done={step === 'classes_done' || step === 'preview_individuals' || step === 'done'}>
        <span class="step-num">{step === 'classes_done' || step === 'preview_individuals' || step === 'done' ? '✓' : '1'}</span>
        <span class="step-label">Class Hierarchy</span>
      </div>
      <div class="step-connector"></div>
      <div class="step" class:active={step === 'classes_done' || step === 'preview_individuals'} class:done={step === 'done'}>
        <span class="step-num">{step === 'done' ? '✓' : '2'}</span>
        <span class="step-label">Individuals</span>
      </div>
    </div>

    <!-- ── STEP 1: Text input ───────────────────────────────────────────────── -->
    {#if step === 'input'}
      <div class="modal-body">

        <!-- Warning if no classes yet but user comes in fresh -->
        {#if !hasClasses}
          <div class="info-banner">
            <span class="info-icon">💡</span>
            <p>
              <strong>Start with the class hierarchy.</strong> Paste a domain description
              (e.g. "Sholay is a 1975 Bollywood action film directed by Ramesh Sippy…")
              and the AI will build the class taxonomy first. You'll add individual instances in Step 2.
            </p>
          </div>
        {:else}
          <div class="info-banner warn">
            <span class="info-icon">⚠</span>
            <p>
              Your ontology already has <strong>{Object.keys(ontology.classes).length - 1}</strong> classes.
              Building a new hierarchy will <em>add</em> to them (not replace).
              Skip to Step 2 if you just want to extract individuals from new text.
            </p>
          </div>
        {/if}

        <label class="field">
          <span class="field-label">Domain description or article text</span>
          <textarea
            bind:value={text}
            placeholder="Paste any text describing the domain — a Wikipedia article, a plot summary, a domain description…

Examples:
• 'Sholay is a 1975 Indian action film directed by Ramesh Sippy. It stars Amitabh Bachchan as Jai and Dharmendra as Veeru, two criminals hired by a retired police officer Thakur Baldev Singh to capture the bandit Gabbar Singh…'
• 'Build an ontology for the Harry Potter universe'
• 'A hospital has Doctors, Nurses, Patients and Departments. Doctors treat Patients…'"
            rows="10"
          ></textarea>
        </label>

        {#if error}<div class="error">{error}</div>{/if}
      </div>

      <div class="modal-footer">
        {#if hasClasses}
          <button class="btn-secondary" onclick={() => { step = 'classes_done'; indText = text; }}>
            Skip to Step 2 (Extract Individuals)
          </button>
        {/if}
        <div class="spacer"></div>
        <button class="btn-cancel" onclick={onClose}>Cancel</button>
        <button
          class="btn-primary"
          disabled={!modelReady || busy || running || !text.trim()}
          onclick={runExtractClasses}
        >
          {busy ? 'Analysing…' : '→ Build Class Hierarchy'}
        </button>
      </div>

    <!-- ── STEP 1: Preview classes ─────────────────────────────────────────── -->
    {:else if step === 'preview_classes'}
      <div class="modal-body">
        <div class="preview-hint">
          AI proposed <strong>{proposedClasses.length}</strong> classes.
          Uncheck any you don't want. You can always add more manually later.
        </div>

        <div class="class-tree">
          {#each proposedClasses as cls}
            <div class="class-row" class:unchecked={!cls.approved}>
              <label class="class-check">
                <input type="checkbox" checked={cls.approved} onchange={() => toggleClass(cls.id)} />
                <span class="class-badge">C</span>
                <span class="class-label">{cls.label}</span>
                <span class="class-parent">⊂ {parentChain(cls)}</span>
              </label>
              {#if cls.description}
                <p class="class-desc">{cls.description}</p>
              {/if}
            </div>
          {/each}
        </div>

        <div class="approve-summary">
          <span class="sum-ok">{approvedClasses.length} selected</span>
          <span class="sum-skip">{proposedClasses.length - approvedClasses.length} skipped</span>
        </div>

        {#if error}<div class="error">{error}</div>{/if}
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={() => (step = 'input')}>← Back</button>
        <div class="spacer"></div>
        <button
          class="btn-primary"
          disabled={approvedClasses.length === 0}
          onclick={applyClasses}
        >
          ✓ Apply {approvedClasses.length} Classes → Step 2
        </button>
      </div>

    <!-- ── STEP 2: Individual text input ──────────────────────────────────── -->
    {:else if step === 'classes_done'}
      <div class="modal-body">
        <div class="info-banner success">
          <span class="info-icon">✓</span>
          <p>
            <strong>Class hierarchy ready!</strong> Your ontology now has
            {Object.keys(ontology.classes).length - 1} classes.
            Now paste detailed text to extract named individuals (people, places, objects).
          </p>
        </div>

        <!-- Show current classes as reference -->
        <div class="class-chips-wrap">
          <div class="chips-label">Available classes:</div>
          <div class="class-chips">
            {#each Object.values(ontology.classes).filter(c => c.id !== 'owl_Thing') as cls}
              <span class="chip">{cls.label}</span>
            {/each}
          </div>
        </div>

        <label class="field">
          <span class="field-label">Text with named entities (individuals)</span>
          <textarea
            bind:value={indText}
            placeholder="Paste a detailed article, plot summary, or description with names of specific people, places, and things…

The AI will assign each individual to one of your defined classes."
            rows="9"
          ></textarea>
        </label>

        {#if error}<div class="error">{error}</div>{/if}
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={() => (step = 'preview_classes')}>← Back</button>
        <div class="spacer"></div>
        <button class="btn-skip" onclick={onClose}>Finish without individuals</button>
        <button
          class="btn-primary"
          disabled={!modelReady || busy || running || !indText.trim()}
          onclick={runExtractIndividuals}
        >
          {busy ? 'Extracting…' : '→ Extract Individuals'}
        </button>
      </div>

    <!-- ── STEP 2: Preview individuals ────────────────────────────────────── -->
    {:else if step === 'preview_individuals'}
      <div class="modal-body">
        <div class="preview-hint">
          AI found <strong>{proposedIndividuals.length}</strong> individuals.
          Uncheck any you don't want.
        </div>

        <div class="individual-list">
          {#each proposedIndividuals as ind}
            <div class="ind-row" class:unchecked={!ind.approved}>
              <label class="ind-check">
                <input type="checkbox" checked={ind.approved} onchange={() => toggleIndividual(ind.id)} />
                <span class="ind-badge">i</span>
                <span class="ind-label">{ind.label}</span>
                <div class="ind-types">
                  {#each ind.types as t}
                    <span class="type-chip">{classLabel(t)}</span>
                  {/each}
                  {#if ind.types.length === 0}
                    <span class="type-chip unknown">⚠ no type</span>
                  {/if}
                </div>
              </label>
              {#if ind.objectPropertyAssertions.length > 0 || ind.dataPropertyAssertions.length > 0}
                <div class="ind-assertions">
                  {#each ind.objectPropertyAssertions as opa}
                    <span class="assertion">
                      <em>{opa.property.replace(/_/g, ' ')}</em> → {opa.target.replace(/_/g, ' ')}
                    </span>
                  {/each}
                  {#each ind.dataPropertyAssertions as dpa}
                    <span class="assertion">
                      <em>{dpa.property.replace(/_/g, ' ')}</em>: "{dpa.value}"
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="approve-summary">
          <span class="sum-ok">{approvedIndividuals.length} selected</span>
          <span class="sum-skip">{proposedIndividuals.length - approvedIndividuals.length} skipped</span>
        </div>

        {#if error}<div class="error">{error}</div>{/if}
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={() => (step = 'classes_done')}>← Back</button>
        <div class="spacer"></div>
        <button
          class="btn-primary"
          disabled={approvedIndividuals.length === 0}
          onclick={applyIndividuals}
        >
          ✓ Apply {approvedIndividuals.length} Individuals
        </button>
      </div>

    <!-- ── Done ───────────────────────────────────────────────────────────── -->
    {:else if step === 'done'}
      <div class="modal-body done-body">
        <div class="done-icon">🎉</div>
        <h2 class="done-title">Ontology Built!</h2>
        <div class="done-stats">
          <div class="stat">
            <span class="stat-num">{Object.keys(ontology.classes).length - 1}</span>
            <span class="stat-label">Classes</span>
          </div>
          <div class="stat">
            <span class="stat-num">{Object.keys(ontology.objectProperties).length}</span>
            <span class="stat-label">Object Props</span>
          </div>
          <div class="stat">
            <span class="stat-num">{Object.keys(ontology.individuals).length}</span>
            <span class="stat-label">Individuals</span>
          </div>
        </div>
        <p class="done-hint">You can now browse the class hierarchy, edit axioms, and export as JSON or OWL/XML.</p>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={startOver}>Build another ontology</button>
        <div class="spacer"></div>
        <button class="btn-primary" onclick={onClose}>Open in Editor →</button>
      </div>
    {/if}

  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    background: #fff; border-radius: 12px;
    width: 620px; max-width: 96vw; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,.25);
  }

  /* Header */
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #3b5998 0%, #2d4577 100%); color: #fff;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .wizard-icon { font-size: 22px; }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-sub { font-size: 11px; opacity: .8; margin-top: 1px; }
  .close-btn { background: rgba(255,255,255,.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; }
  .close-btn:hover { background: rgba(255,255,255,.3); }

  /* Step indicators */
  .steps {
    display: flex; align-items: center; padding: 12px 24px;
    background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; gap: 0;
  }
  .step { display: flex; align-items: center; gap: 7px; }
  .step-num {
    width: 24px; height: 24px; border-radius: 50%; border: 2px solid #d0d5dd;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #94a3b8; background: #fff;
    flex-shrink: 0;
  }
  .step.active .step-num { border-color: #3b5998; color: #3b5998; background: #eef2fb; }
  .step.done .step-num { border-color: #22c55e; background: #22c55e; color: #fff; }
  .step-label { font-size: 12px; font-weight: 600; color: #94a3b8; }
  .step.active .step-label { color: #3b5998; }
  .step.done .step-label { color: #22c55e; }
  .step-connector { flex: 1; height: 2px; background: #e2e8f0; margin: 0 12px; }

  /* Body */
  .modal-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }

  .info-banner {
    display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px;
    background: #eff6ff; border: 1px solid #bfdbfe;
  }
  .info-banner.warn { background: #fffbeb; border-color: #fde68a; }
  .info-banner.success { background: #f0fdf4; border-color: #bbf7d0; }
  .info-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .info-banner p { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 12px; font-weight: 700; color: #374151; }
  textarea {
    padding: 10px; border: 1px solid #d0d5dd; border-radius: 8px;
    font-size: 13px; font-family: inherit; resize: vertical; line-height: 1.5;
  }
  textarea:focus { outline: none; border-color: #3b5998; }

  .error { background: #fde8e8; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #c0392b; }

  /* Class preview */
  .preview-hint { font-size: 13px; color: #374151; }
  .class-tree { display: flex; flex-direction: column; gap: 6px; }
  .class-row {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
    transition: opacity .15s; background: #fff;
  }
  .class-row.unchecked { opacity: .45; background: #f8fafc; }
  .class-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .class-badge {
    width: 20px; height: 20px; border-radius: 50%; background: #ede9fe;
    color: #7c3aed; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .class-label { font-size: 14px; font-weight: 600; color: #1a202c; flex: 1; }
  .class-parent { font-size: 11px; color: #94a3b8; font-style: italic; }
  .class-desc { margin: 4px 0 0 28px; font-size: 12px; color: #64748b; line-height: 1.5; }

  .approve-summary { display: flex; gap: 14px; font-size: 13px; font-weight: 600; }
  .sum-ok { color: #22c55e; }
  .sum-skip { color: #94a3b8; }

  /* Class chips */
  .class-chips-wrap { display: flex; flex-direction: column; gap: 5px; }
  .chips-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
  .class-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip { padding: 3px 10px; background: #ede9fe; color: #7c3aed; border-radius: 12px; font-size: 12px; font-weight: 500; }

  /* Individual preview */
  .individual-list { display: flex; flex-direction: column; gap: 6px; }
  .ind-row {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
    transition: opacity .15s; background: #fff;
  }
  .ind-row.unchecked { opacity: .45; background: #f8fafc; }
  .ind-check { display: flex; align-items: center; gap: 8px; cursor: pointer; flex-wrap: wrap; }
  .ind-badge {
    width: 20px; height: 20px; border-radius: 50%; background: #fce7f3;
    color: #9d174d; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ind-label { font-size: 14px; font-weight: 600; color: #1a202c; }
  .ind-types { display: flex; gap: 4px; flex-wrap: wrap; margin-left: 4px; }
  .type-chip { padding: 2px 8px; background: #ede9fe; color: #7c3aed; border-radius: 10px; font-size: 11px; }
  .type-chip.unknown { background: #fef3c7; color: #92400e; }
  .ind-assertions { margin: 5px 0 0 28px; display: flex; flex-wrap: wrap; gap: 6px; }
  .assertion { font-size: 11px; color: #64748b; background: #f8fafc; padding: 2px 7px; border-radius: 4px; border: 1px solid #e2e8f0; }
  .assertion em { color: #3b5998; font-style: normal; font-weight: 600; }

  /* Done */
  .done-body { align-items: center; justify-content: center; text-align: center; padding: 36px 20px; }
  .done-icon { font-size: 48px; }
  .done-title { font-size: 22px; font-weight: 800; color: #1a202c; margin: 10px 0; }
  .done-stats { display: flex; gap: 32px; margin: 16px 0; }
  .stat { display: flex; flex-direction: column; gap: 3px; }
  .stat-num { font-size: 28px; font-weight: 800; color: #3b5998; }
  .stat-label { font-size: 12px; color: #64748b; }
  .done-hint { font-size: 13px; color: #64748b; max-width: 380px; line-height: 1.6; }

  /* Footer */
  .modal-footer {
    display: flex; align-items: center; gap: 10px; padding: 14px 20px;
    border-top: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0;
  }
  .spacer { flex: 1; }
  .btn-primary { padding: 9px 20px; background: #3b5998; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .btn-primary:hover:not(:disabled) { background: #2d4577; }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
  .btn-cancel { padding: 9px 16px; background: #fff; border: 1px solid #d0d5dd; border-radius: 7px; font-size: 13px; cursor: pointer; color: #555; }
  .btn-cancel:hover { background: #f0f0f0; }
  .btn-secondary { padding: 9px 16px; background: #eef2fb; color: #3b5998; border: 1px solid #c7d6f7; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-secondary:hover { background: #dbe4f8; }
  .btn-skip { padding: 9px 14px; background: none; border: none; color: #94a3b8; font-size: 13px; cursor: pointer; }
  .btn-skip:hover { color: #374151; }
</style>
