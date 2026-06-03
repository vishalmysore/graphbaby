<script lang="ts">
  import { AVAILABLE_MODELS } from '../types';

  interface Props {
    status: string;
    progress: number;
    progressText: string;
    selectedModel: string;
    onLoad: (modelId: string) => void;
  }

  let { status, progress, progressText, selectedModel, onLoad }: Props = $props();

  let model = $state(selectedModel || AVAILABLE_MODELS[0].id);
</script>

<div class="model-loader">
  {#if status === 'idle'}
    <div class="model-select">
      <label for="model-select">AI Model</label>
      <select id="model-select" bind:value={model}>
        {#each AVAILABLE_MODELS as m}
          <option value={m.id}>{m.label}</option>
        {/each}
      </select>
      <button class="btn-primary" onclick={() => onLoad(model)}>Load Model</button>
    </div>
    <p class="hint">Model runs entirely in your browser. No data leaves your device.</p>
  {:else if status === 'loading'}
    <div class="progress-wrap">
      <div class="progress-bar" style="width: {progress}%"></div>
    </div>
    <p class="progress-text">{progressText}</p>
  {:else if status === 'ready' || status === 'running'}
    <div class="status-badge ready">
      <span class="dot"></span> Model ready
    </div>
  {:else if status === 'error'}
    <div class="status-badge error">Model load failed. Reload and try a smaller model.</div>
  {/if}

  {#if status === 'idle' || status === 'error'}
    <div class="webgpu-warning">
      ⚠ Requires WebGPU. Works in Chrome 113+ / Edge 113+.
    </div>
  {/if}
</div>

<style>
  .model-loader { display: flex; flex-direction: column; gap: 8px; }
  .model-select { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  select { flex: 1; min-width: 0; padding: 6px 8px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #e2e8f0; font-size: 13px; }
  .btn-primary { padding: 6px 14px; background: #6366f1; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap; }
  .btn-primary:hover { background: #4f46e5; }
  .progress-wrap { height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
  .progress-bar { height: 100%; background: #6366f1; transition: width 0.3s; }
  .progress-text { font-size: 12px; color: #94a3b8; }
  .status-badge { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .status-badge.ready { color: #4ade80; }
  .status-badge.error { color: #f87171; }
  .dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .hint { font-size: 11px; color: #64748b; margin: 0; }
  .webgpu-warning { font-size: 11px; color: #f59e0b; }
  label { font-size: 12px; color: #94a3b8; white-space: nowrap; }
</style>
