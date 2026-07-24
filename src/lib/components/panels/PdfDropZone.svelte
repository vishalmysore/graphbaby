<script lang="ts">
  import { extractPdfText } from '../../pdf/extractPdfText';

  interface Props {
    disabled?: boolean;
    // Called with the extracted text and the source filename.
    onText: (text: string, filename: string) => void;
  }

  let { disabled = false, onText }: Props = $props();

  let dragOver = $state(false);
  let busy = $state(false);
  let progress = $state('');
  let error = $state('');
  let lastFile = $state('');
  let inputEl = $state<HTMLInputElement | null>(null);

  function isPdf(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  async function handleFile(file: File | undefined | null) {
    error = '';
    if (!file) return;
    if (!isPdf(file)) {
      error = 'Please choose a PDF file.';
      return;
    }
    busy = true;
    progress = 'Reading PDF…';
    try {
      const text = await extractPdfText(file, ({ page, total }) => {
        progress = `Extracting text — page ${page} of ${total}…`;
      });
      if (!text.trim()) {
        error =
          'No selectable text found. This PDF is likely scanned images (OCR is not supported).';
        return;
      }
      lastFile = file.name;
      onText(text, file.name);
    } catch (e) {
      error = `Could not read this PDF: ${String(e)}`;
    } finally {
      busy = false;
      progress = '';
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (disabled || busy) return;
    handleFile(e.dataTransfer?.files?.[0]);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled && !busy) dragOver = true;
  }

  function onPick(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    handleFile(file);
    // reset so the same file can be re-selected
    if (inputEl) inputEl.value = '';
  }
</script>

<div
  class="dropzone"
  class:over={dragOver}
  class:busy
  class:disabled
  role="button"
  tabindex="0"
  ondrop={onDrop}
  ondragover={onDragOver}
  ondragleave={() => (dragOver = false)}
  onclick={() => !disabled && !busy && inputEl?.click()}
  onkeydown={(e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && !busy) inputEl?.click();
  }}
>
  <input
    bind:this={inputEl}
    type="file"
    accept="application/pdf,.pdf"
    onchange={onPick}
    hidden
  />
  {#if busy}
    <span class="dz-icon spin">⟳</span>
    <span class="dz-text">{progress}</span>
  {:else}
    <span class="dz-icon">📄</span>
    <span class="dz-text">
      <strong>Drop a PDF here</strong> or <span class="link">browse</span>
      <span class="dz-sub">— text is extracted in your browser</span>
    </span>
  {/if}
</div>

{#if lastFile && !busy && !error}
  <div class="dz-status ok">✓ Loaded text from <strong>{lastFile}</strong></div>
{/if}
{#if error}
  <div class="dz-status err">{error}</div>
{/if}

<style>
  .dropzone {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1.5px dashed #c7d0e0;
    border-radius: 8px;
    background: #f8fafc;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .dropzone:hover:not(.disabled):not(.busy) { border-color: #3b5998; background: #f2f6ff; }
  .dropzone.over { border-color: #3b5998; background: #eef2fb; border-style: solid; }
  .dropzone.busy { cursor: progress; border-color: #3b5998; }
  .dropzone.disabled { opacity: 0.5; cursor: not-allowed; }
  .dz-icon { font-size: 20px; flex-shrink: 0; }
  .dz-icon.spin { animation: dzspin 1s linear infinite; }
  @keyframes dzspin { to { transform: rotate(360deg); } }
  .dz-text { font-size: 13px; color: #475569; line-height: 1.4; }
  .dz-text strong { color: #1a202c; }
  .link { color: #3b5998; text-decoration: underline; }
  .dz-sub { color: #94a3b8; font-size: 11px; }
  .dz-status { font-size: 12px; margin-top: 6px; padding: 6px 10px; border-radius: 6px; }
  .dz-status.ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .dz-status.err { background: #fde8e8; border: 1px solid #fca5a5; color: #c0392b; }
</style>
