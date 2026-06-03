<script lang="ts">
  import type { KGGraph, KGNode, ModelStatus } from './lib/types';
  import { WebLLMEngine } from './lib/ai/webllm';
  import { saveGraph, loadGraphs, deleteGraph } from './lib/storage/db';
  import ModelLoader from './lib/components/ModelLoader.svelte';
  import InputPanel from './lib/components/InputPanel.svelte';
  import GraphCanvas from './lib/components/GraphCanvas.svelte';
  import NodeInspector from './lib/components/NodeInspector.svelte';

  const llm = new WebLLMEngine();

  let modelStatus = $state<ModelStatus>('idle');
  let modelProgress = $state(0);
  let modelProgressText = $state('');
  let selectedModel = $state('');

  let graph = $state<KGGraph>({ nodes: [], edges: [] });
  let selectedNode = $state<KGNode | null>(null);
  let nodeSummary = $state('');
  let loadingSummary = $state(false);

  let error = $state('');
  let savedGraphs = $state<KGGraph[]>([]);

  async function handleLoadModel(modelId: string) {
    modelStatus = 'loading';
    selectedModel = modelId;
    error = '';
    try {
      await llm.load(modelId, (report) => {
        modelProgress = Math.round(report.progress * 100);
        modelProgressText = report.text;
      });
      modelStatus = 'ready';
      await refreshSavedGraphs();
    } catch (e) {
      modelStatus = 'error';
      error = String(e);
    }
  }

  async function handleGenerate(text: string) {
    modelStatus = 'running';
    error = '';
    try {
      const result = await llm.extractGraph(text);
      result.rawInput = text;
      graph = result;
      selectedNode = null;
      nodeSummary = '';
      const id = await saveGraph(result);
      graph = { ...result, id };
      await refreshSavedGraphs();
    } catch (e) {
      error = String(e);
    } finally {
      modelStatus = 'ready';
    }
  }

  async function handleCommand(cmd: string) {
    if (graph.nodes.length === 0) { error = 'Generate a graph first.'; return; }
    modelStatus = 'running';
    error = '';
    try {
      const result = await llm.refineGraph(graph, cmd);
      graph = { ...result, id: graph.id, rawInput: graph.rawInput };
      selectedNode = null;
      nodeSummary = '';
      if (graph.id) await saveGraph(graph);
      await refreshSavedGraphs();
    } catch (e) {
      error = String(e);
    } finally {
      modelStatus = 'ready';
    }
  }

  async function handleSummarize(node: KGNode) {
    loadingSummary = true;
    nodeSummary = '';
    try {
      nodeSummary = await llm.summarizeNode(node.id, graph);
    } catch (e) {
      nodeSummary = 'Could not generate summary.';
    } finally {
      loadingSummary = false;
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `graphbaby_${Date.now()}.json`;
    a.click();
  }

  function handleReset() {
    graph = { nodes: [], edges: [] };
    selectedNode = null;
    nodeSummary = '';
    error = '';
  }

  function handleNodeClick(node: KGNode) {
    selectedNode = node;
    nodeSummary = '';
  }

  async function refreshSavedGraphs() {
    savedGraphs = await loadGraphs();
  }

  async function loadSavedGraph(g: KGGraph) {
    graph = g;
    selectedNode = null;
    nodeSummary = '';
  }

  async function deleteSavedGraph(id: string) {
    await deleteGraph(id);
    await refreshSavedGraphs();
  }
</script>

<div class="app">
  <header class="topbar">
    <div class="logo">
      <span class="logo-icon">⬡</span>
      <span class="logo-text">GraphBaby</span>
      <span class="logo-tag">AI Knowledge Graph Editor</span>
    </div>
    <div class="model-area">
      <ModelLoader
        status={modelStatus}
        progress={modelProgress}
        progressText={modelProgressText}
        selectedModel={selectedModel}
        onLoad={handleLoadModel}
      />
    </div>
  </header>

  {#if error}
    <div class="error-banner">
      <strong>Error:</strong> {error}
      <button onclick={() => (error = '')}>✕</button>
    </div>
  {/if}

  <div class="workspace">
    <aside class="left-panel">
      <InputPanel
        modelReady={modelStatus === 'ready'}
        running={modelStatus === 'running'}
        onGenerate={handleGenerate}
        onCommand={handleCommand}
        onExport={handleExport}
        onReset={handleReset}
      />

      {#if savedGraphs.length > 0}
        <div class="saved-section">
          <div class="saved-title">Saved Graphs</div>
          {#each savedGraphs as sg}
            <div class="saved-item">
              <button class="saved-name" onclick={() => loadSavedGraph(sg)}>
                {sg.nodes.length}N · {sg.edges.length}E ·
                {new Date(sg.createdAt ?? 0).toLocaleTimeString()}
              </button>
              <button class="delete-btn" onclick={() => sg.id && deleteSavedGraph(sg.id)}>✕</button>
            </div>
          {/each}
        </div>
      {/if}
    </aside>

    <main class="graph-area">
      <GraphCanvas {graph} onNodeClick={handleNodeClick} />
      {#if modelStatus === 'running'}
        <div class="running-overlay">
          <div class="spinner"></div>
          <span>AI thinking…</span>
        </div>
      {/if}
    </main>

    <aside class="right-panel">
      <NodeInspector
        node={selectedNode}
        {graph}
        summary={nodeSummary}
        {loadingSummary}
        onSummarize={handleSummarize}
      />
    </aside>
  </div>

  <footer class="statusbar">
    <span>Nodes: {graph.nodes.length}</span>
    <span>Edges: {graph.edges.length}</span>
    <span>Runs 100% in-browser · No data sent to servers</span>
  </footer>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) { margin: 0; background: #0f172a; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; height: 100vh; overflow: hidden; }
  :global(#app) { height: 100vh; }

  .app { display: flex; flex-direction: column; height: 100vh; }

  .topbar {
    display: flex; align-items: center; gap: 20px; padding: 10px 20px;
    background: #0f172a; border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
  }
  .logo { display: flex; align-items: center; gap: 8px; }
  .logo-icon { font-size: 22px; color: #6366f1; }
  .logo-text { font-size: 18px; font-weight: 800; color: #e2e8f0; }
  .logo-tag { font-size: 11px; color: #475569; }
  .model-area { margin-left: auto; min-width: 320px; }

  .error-banner {
    display: flex; align-items: center; gap: 12px; padding: 8px 20px;
    background: #7f1d1d; color: #fca5a5; font-size: 13px; flex-shrink: 0;
  }
  .error-banner button { margin-left: auto; background: none; border: none; color: inherit; cursor: pointer; font-size: 16px; }

  .workspace { display: flex; flex: 1; overflow: hidden; }

  .left-panel {
    width: 280px; flex-shrink: 0; padding: 16px;
    background: #0f172a; border-right: 1px solid #1e293b;
    overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
  }

  .graph-area { flex: 1; position: relative; overflow: hidden; }

  .running-overlay {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; gap: 12px; background: #0f172a80;
    font-size: 14px; color: #818cf8;
  }
  .spinner {
    width: 24px; height: 24px; border: 3px solid #334155;
    border-top-color: #6366f1; border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .right-panel {
    width: 260px; flex-shrink: 0; padding: 16px;
    background: #0f172a; border-left: 1px solid #1e293b; overflow-y: auto;
  }

  .statusbar {
    display: flex; gap: 20px; padding: 5px 20px;
    background: #0a0f1e; border-top: 1px solid #1e293b;
    font-size: 11px; color: #475569; flex-shrink: 0;
  }
  .statusbar span:last-child { margin-left: auto; }

  .saved-section { border-top: 1px solid #1e293b; padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .saved-title { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .saved-item { display: flex; gap: 4px; align-items: center; }
  .saved-name { flex: 1; text-align: left; padding: 5px 8px; background: #1e293b; border: none; border-radius: 6px; color: #94a3b8; font-size: 11px; cursor: pointer; }
  .saved-name:hover { background: #334155; color: #e2e8f0; }
  .delete-btn { background: none; border: none; color: #475569; cursor: pointer; font-size: 12px; padding: 4px; }
  .delete-btn:hover { color: #f87171; }
</style>
