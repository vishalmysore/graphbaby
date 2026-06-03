<script lang="ts">
  interface Props {
    ontologyLabel: string;
    ontologyIRI: string;
    modelStatus: string;
    modelProgress: number;
    modelProgressText: string;
    selectedModel: string;
    onLoadModel: (id: string) => void;
    onOpenSettings: () => void;
    onNewOntology: () => void;
    onImport: () => void;
    onExportJSON: () => void;
    onExportOWL: () => void;
  }

  import { AVAILABLE_MODELS } from '../../types';

  let {
    ontologyLabel, ontologyIRI, modelStatus, modelProgress,
    modelProgressText, selectedModel, onLoadModel,
    onOpenSettings, onNewOntology, onImport, onExportJSON, onExportOWL,
  }: Props = $props();

  let chosenModel = $state(selectedModel || AVAILABLE_MODELS[0].id);
  let showExportMenu = $state(false);
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo">⬡</span>
    <span class="brand-name">GraphBaby</span>
  </div>

  <div class="divider"></div>

  <div class="onto-info">
    <span class="onto-label">{ontologyLabel}</span>
    <span class="onto-iri">{ontologyIRI}</span>
  </div>

  <div class="spacer"></div>

  <!-- AI Model area -->
  <div class="model-area">
    {#if modelStatus === 'idle' || modelStatus === 'error'}
      <select bind:value={chosenModel} class="model-select">
        {#each AVAILABLE_MODELS as m}
          <option value={m.id}>{m.label}</option>
        {/each}
      </select>
      <button class="btn-topbar" onclick={() => onLoadModel(chosenModel)}>
        Load AI Model
      </button>
    {:else if modelStatus === 'loading'}
      <div class="progress-wrap">
        <div class="progress-fill" style="width:{modelProgress}%"></div>
      </div>
      <span class="progress-label">{modelProgressText.slice(0, 40)}</span>
    {:else if modelStatus === 'ready' || modelStatus === 'running'}
      <span class="model-ready">
        <span class="dot"></span> AI Ready
        {#if modelStatus === 'running'}<span class="thinking"> — thinking…</span>{/if}
      </span>
    {/if}
  </div>

  <div class="divider"></div>

  <div class="actions">
    <button class="btn-topbar" onclick={onNewOntology} title="New Ontology">New</button>
    <button class="btn-topbar" onclick={onImport} title="Import">Import</button>
    <div class="export-wrap">
      <button class="btn-topbar" onclick={() => (showExportMenu = !showExportMenu)}>
        Export ▾
      </button>
      {#if showExportMenu}
        <div class="dropdown" onmouseleave={() => (showExportMenu = false)}>
          <button onclick={() => { onExportJSON(); showExportMenu = false; }}>Export JSON</button>
          <button onclick={() => { onExportOWL(); showExportMenu = false; }}>Export OWL/XML</button>
        </div>
      {/if}
    </div>
    <button class="btn-topbar icon" onclick={onOpenSettings} title="Settings">⚙</button>
  </div>
</header>

<style>
  .topbar {
    display: flex; align-items: center; gap: 10px;
    padding: 0 14px; height: 48px; flex-shrink: 0;
    background: #3b5998; color: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.3);
    position: relative; z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .logo { font-size: 20px; }
  .brand-name { font-size: 15px; font-weight: 700; letter-spacing: -.3px; }
  .divider { width: 1px; height: 24px; background: rgba(255,255,255,.25); flex-shrink: 0; }
  .onto-info { display: flex; flex-direction: column; gap: 1px; }
  .onto-label { font-size: 13px; font-weight: 600; }
  .onto-iri { font-size: 10px; opacity: .7; font-family: monospace; }
  .spacer { flex: 1; }
  .model-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .model-select { padding: 4px 6px; border-radius: 4px; border: none; font-size: 12px; background: rgba(255,255,255,.15); color: #fff; max-width: 180px; }
  .model-select option { background: #3b5998; }
  .btn-topbar { padding: 5px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); color: #fff; font-size: 12px; cursor: pointer; white-space: nowrap; }
  .btn-topbar:hover { background: rgba(255,255,255,.25); }
  .btn-topbar.icon { padding: 5px 8px; font-size: 14px; }
  .progress-wrap { width: 120px; height: 6px; background: rgba(255,255,255,.2); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: #7ee8a2; transition: width .3s; }
  .progress-label { font-size: 10px; opacity: .8; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .model-ready { font-size: 12px; display: flex; align-items: center; gap: 5px; }
  .dot { width: 7px; height: 7px; background: #7ee8a2; border-radius: 50%; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .thinking { opacity: .7; }
  .actions { display: flex; align-items: center; gap: 6px; }
  .export-wrap { position: relative; }
  .dropdown { position: absolute; top: 100%; right: 0; margin-top: 4px; background: #fff; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.15); overflow: hidden; z-index: 100; min-width: 140px; }
  .dropdown button { display: block; width: 100%; padding: 9px 14px; background: none; border: none; text-align: left; font-size: 13px; color: #333; cursor: pointer; }
  .dropdown button:hover { background: #f0f0f0; }
</style>
