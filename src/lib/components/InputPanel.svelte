<script lang="ts">
  interface Props {
    modelReady: boolean;
    running: boolean;
    onGenerate: (text: string) => void;
    onCommand: (cmd: string) => void;
    onExport: () => void;
    onReset: () => void;
  }

  let { modelReady, running, onGenerate, onCommand, onExport, onReset }: Props = $props();

  let text = $state('');
  let customCmd = $state('');

  const QUICK_COMMANDS = [
    'Simplify graph',
    'Merge duplicate nodes',
    'Find missing relationships',
    'Expand key concepts',
  ];
</script>

<div class="input-panel">
  <section>
    <label for="text-input">Input Text</label>
    <textarea
      id="text-input"
      bind:value={text}
      placeholder="Paste any text — article, notes, bullet points…"
      rows="10"
    ></textarea>
    <button
      class="btn-primary full"
      disabled={!modelReady || running || !text.trim()}
      onclick={() => onGenerate(text)}
    >
      {running ? 'Generating…' : 'Generate Graph'}
    </button>
  </section>

  <section>
    <label>Quick Commands</label>
    <div class="quick-cmds">
      {#each QUICK_COMMANDS as cmd}
        <button
          class="btn-outline"
          disabled={!modelReady || running}
          onclick={() => onCommand(cmd)}
        >{cmd}</button>
      {/each}
    </div>
  </section>

  <section>
    <label for="custom-cmd">Custom Command</label>
    <div class="row">
      <input
        id="custom-cmd"
        bind:value={customCmd}
        placeholder="e.g. expand Albert Einstein"
        disabled={!modelReady || running}
      />
      <button
        class="btn-outline"
        disabled={!modelReady || running || !customCmd.trim()}
        onclick={() => { onCommand(customCmd); customCmd = ''; }}
      >Run</button>
    </div>
  </section>

  <section class="actions">
    <button class="btn-ghost" onclick={onExport}>Export JSON</button>
    <button class="btn-ghost danger" onclick={onReset}>Reset Graph</button>
  </section>
</div>

<style>
  .input-panel { display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto; }
  section { display: flex; flex-direction: column; gap: 6px; }
  label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
  textarea { resize: vertical; padding: 10px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font-size: 13px; font-family: inherit; min-height: 160px; }
  textarea:focus { outline: none; border-color: #6366f1; }
  input { flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font-size: 13px; }
  input:focus { outline: none; border-color: #6366f1; }
  .row { display: flex; gap: 6px; }
  .quick-cmds { display: flex; flex-direction: column; gap: 5px; }
  .actions { flex-direction: row; gap: 8px; margin-top: auto; }
  .btn-primary { padding: 9px 16px; background: #6366f1; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .btn-primary:hover:not(:disabled) { background: #4f46e5; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-outline { padding: 7px 12px; background: transparent; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-size: 12px; text-align: left; }
  .btn-outline:hover:not(:disabled) { border-color: #6366f1; color: #e2e8f0; }
  .btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost { flex: 1; padding: 8px; background: transparent; color: #64748b; border: 1px solid #1e293b; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .btn-ghost:hover { color: #e2e8f0; border-color: #334155; }
  .btn-ghost.danger:hover { color: #f87171; }
  .full { width: 100%; }
</style>
