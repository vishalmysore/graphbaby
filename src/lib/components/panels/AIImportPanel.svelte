<script lang="ts">
  interface Props {
    modelReady: boolean;
    running: boolean;
    baseIRI: string;
    onExtract: (text: string, iri: string) => void;
    onClose: () => void;
  }

  let { modelReady, running, baseIRI, onExtract, onClose }: Props = $props();

  let text = $state('');
  let iri = $state(baseIRI);
</script>

<div class="overlay" onclick={onClose} role="dialog" aria-modal="true">
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <span class="modal-title">✦ AI Ontology Extraction</span>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <div class="modal-body">
      <label>
        <span>Ontology Base IRI</span>
        <input bind:value={iri} placeholder="http://example.org/myontology" />
      </label>

      <label>
        <span>Source Text</span>
        <textarea
          bind:value={text}
          placeholder="Paste any text — articles, notes, domain descriptions…&#10;&#10;Example: 'A Person works at an Organization and can have a JobTitle. Organizations have Departments. Departments employ Persons.'"
          rows="12"
        ></textarea>
      </label>

      <p class="hint">
        The AI will extract Classes, Object Properties, Data Properties, and Individuals
        and populate the ontology editor. Runs 100% in your browser.
      </p>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" onclick={onClose}>Cancel</button>
      <button
        class="btn-extract"
        disabled={!modelReady || running || !text.trim()}
        onclick={() => onExtract(text, iri)}
      >
        {running ? 'Extracting…' : 'Extract Ontology'}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.4);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    background: #fff; border-radius: 10px; width: 560px; max-width: 95vw;
    box-shadow: 0 20px 60px rgba(0,0,0,.25); display: flex; flex-direction: column; overflow: hidden;
  }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
  .modal-title { font-size: 14px; font-weight: 700; color: #3b5998; }
  .close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: #94a3b8; }
  .close-btn:hover { color: #374151; }
  .modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  label { display: flex; flex-direction: column; gap: 5px; }
  label span { font-size: 12px; font-weight: 600; color: #374151; }
  input, textarea { padding: 8px 10px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 13px; font-family: inherit; }
  input:focus, textarea:focus { outline: none; border-color: #3b5998; }
  textarea { resize: vertical; }
  .hint { font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 18px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
  .btn-cancel { padding: 8px 16px; background: none; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 13px; cursor: pointer; color: #555; }
  .btn-cancel:hover { background: #f0f0f0; }
  .btn-extract { padding: 8px 20px; background: #3b5998; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-extract:hover:not(:disabled) { background: #2d4577; }
  .btn-extract:disabled { opacity: .4; cursor: not-allowed; }
</style>
