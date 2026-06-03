<script lang="ts">
  import type { ModelStatus } from './lib/types';
  import type { EntityType, OWLClass, Ontology } from './lib/ontology/types';
  import { emptyOntology } from './lib/ontology/types';
  import { store } from './lib/ontology/store.svelte';
  import { buildClassTree, buildPropertyTree, getClassUsage } from './lib/ontology/hierarchy';
  import { WebLLMEngine } from './lib/ai/webllm';
  import { saveOntology, loadOntologies, deleteOntology } from './lib/storage/db';

  import TopBar from './lib/components/layout/TopBar.svelte';
  import TabBar from './lib/components/layout/TabBar.svelte';
  import HierarchyTree from './lib/components/tree/HierarchyTree.svelte';
  import ClassEditor from './lib/components/editor/ClassEditor.svelte';
  import ObjectPropertyEditor from './lib/components/editor/ObjectPropertyEditor.svelte';
  import DataPropertyEditor from './lib/components/editor/DataPropertyEditor.svelte';
  import IndividualEditor from './lib/components/editor/IndividualEditor.svelte';
  import UsagePanel from './lib/components/panels/UsagePanel.svelte';
  import GraphPanel from './lib/components/panels/GraphPanel.svelte';
  import AIImportPanel from './lib/components/panels/AIImportPanel.svelte';

  // ── AI engine ─────────────────────────────────────────────────────────────
  const llm = new WebLLMEngine();
  let modelStatus = $state<ModelStatus>('idle');
  let modelProgress = $state(0);
  let modelProgressText = $state('');
  let selectedModel = $state('');

  // ── UI state ───────────────────────────────────────────────────────────────
  let showAIImport = $state(false);
  let showGraph = $state(false);
  let aiRunning = $state(false);
  let aiSuggestion = $state('');
  let error = $state('');
  let searchQuery = $state('');
  let savedOntologies = $state<Ontology[]>([]);
  let showSaved = $state(false);

  // ── Derived tree data ──────────────────────────────────────────────────────
  const classTree = $derived(buildClassTree(store.ontology.classes, searchQuery));

  const opTree = $derived(buildPropertyTree(store.ontology.objectProperties, searchQuery));
  const dpTree = $derived(buildPropertyTree(store.ontology.dataProperties, searchQuery));
  const apTree = $derived(buildPropertyTree(store.ontology.annotationProperties, searchQuery));

  const individualTree = $derived(
    Object.values(store.ontology.individuals)
      .filter((i) => !searchQuery || i.label.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((i) => ({ id: i.id, label: i.label, iri: i.iri, children: [], depth: 0 })),
  );

  const tabCounts = $derived({
    class: Object.keys(store.ontology.classes).length,
    objectProperty: Object.keys(store.ontology.objectProperties).length,
    dataProperty: Object.keys(store.ontology.dataProperties).length,
    annotationProperty: Object.keys(store.ontology.annotationProperties).length,
    individual: Object.keys(store.ontology.individuals).length,
  });

  const usages = $derived(
    store.selectedEntityId && store.selectedEntityType === 'class'
      ? getClassUsage(store.selectedEntityId, store.ontology)
      : [],
  );

  // ── Model loading ──────────────────────────────────────────────────────────
  async function handleLoadModel(modelId: string) {
    modelStatus = 'loading'; selectedModel = modelId; error = '';
    try {
      await llm.load(modelId, (r) => {
        modelProgress = Math.round(r.progress * 100);
        modelProgressText = r.text;
      });
      modelStatus = 'ready';
      savedOntologies = await loadOntologies();
    } catch (e) {
      modelStatus = 'error'; error = String(e);
    }
  }

  // ── AI extraction ──────────────────────────────────────────────────────────
  async function handleAIExtract(text: string, iri: string) {
    showAIImport = false;
    modelStatus = 'running'; aiRunning = true; error = '';
    try {
      const result = await llm.extractOntology(text, iri);
      const merged: Ontology = {
        ...emptyOntology(),
        ...result,
        id: store.ontology.id,
        label: store.ontology.label,
        // Preserve owl:Thing
        classes: { owl_Thing: store.ontology.classes.owl_Thing, ...result.classes },
      };
      store.loadOntology(merged);
      await saveOntology(store.ontology);
      savedOntologies = await loadOntologies();
    } catch (e) {
      error = String(e);
    } finally {
      modelStatus = 'ready'; aiRunning = false;
    }
  }

  // ── Class AI actions ───────────────────────────────────────────────────────
  async function handleSuggestSubclasses() {
    const cls = store.selectedClass;
    if (!cls) return;
    aiRunning = true; aiSuggestion = '';
    try {
      const labels = await llm.suggestSubclasses(cls.label, store.ontology);
      aiSuggestion = `Suggested subclasses:\n${labels.map((l: string) => `• ${l}`).join('\n')}`;
    } finally { aiRunning = false; }
  }

  async function handleGenerateDesc() {
    const cls = store.selectedClass;
    if (!cls) return;
    aiRunning = true; aiSuggestion = '';
    try {
      aiSuggestion = await llm.generateClassDescription(cls.label, store.ontology.label);
    } finally { aiRunning = false; }
  }

  // ── Tree add / delete ──────────────────────────────────────────────────────
  function handleAdd(parentId?: string) {
    const t = store.activeTab;
    const label = prompt(
      t === 'class' ? 'New class name:' :
      t === 'objectProperty' ? 'New object property name:' :
      t === 'dataProperty' ? 'New data property name:' :
      t === 'annotationProperty' ? 'New annotation property name:' :
      'New individual name:',
    );
    if (!label) return;
    let id: string;
    if (t === 'class') id = store.addClass(label, parentId ?? 'owl_Thing');
    else if (t === 'objectProperty') id = store.addObjectProperty(label);
    else if (t === 'dataProperty') id = store.addDataProperty(label);
    else if (t === 'annotationProperty') id = store.addAnnotationProperty(label);
    else id = store.addIndividual(label);
    store.select(id, t);
    persist();
  }

  function handleDelete(id: string) {
    const t = store.activeTab;
    if (!confirm(`Delete "${id}"?`)) return;
    if (t === 'class') store.deleteClass(id);
    else if (t === 'objectProperty') store.deleteObjectProperty(id);
    else if (t === 'dataProperty') store.deleteDataProperty(id);
    else if (t === 'annotationProperty') store.deleteAnnotationProperty(id);
    else store.deleteIndividual(id);
    aiSuggestion = '';
    persist();
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportJSON() {
    const blob = new Blob([JSON.stringify(store.ontology, null, 2)], { type: 'application/json' });
    download(blob, `${store.ontology.label}.json`);
  }

  function exportOWL() {
    const xml = buildOWLXML(store.ontology);
    const blob = new Blob([xml], { type: 'application/rdf+xml' });
    download(blob, `${store.ontology.label}.owl`);
  }

  function download(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  function buildOWLXML(onto: Ontology): string {
    const cls = Object.values(onto.classes)
      .filter((c) => c.id !== 'owl_Thing')
      .map((c) => `  <owl:Class rdf:about="${c.iri}">\n    <rdfs:label>${c.label}</rdfs:label>\n${c.subClassOf.map((s) => `    <rdfs:subClassOf rdf:resource="${onto.classes[s]?.iri ?? s}"/>`).join('\n')}\n  </owl:Class>`)
      .join('\n');
    const ops = Object.values(onto.objectProperties)
      .map((p) => `  <owl:ObjectProperty rdf:about="${p.iri}">\n    <rdfs:label>${p.label}</rdfs:label>\n  </owl:ObjectProperty>`)
      .join('\n');
    return `<?xml version="1.0"?>\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n         xmlns:owl="http://www.w3.org/2002/07/owl#"\n         xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">\n  <owl:Ontology rdf:about="${onto.iri}"/>\n${cls}\n${ops}\n</rdf:RDF>`;
  }

  // ── Import JSON ────────────────────────────────────────────────────────────
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const onto: Ontology = JSON.parse(text);
        store.loadOntology(onto);
        await saveOntology(onto);
        savedOntologies = await loadOntologies();
      } catch { error = 'Invalid ontology JSON file.'; }
    };
    input.click();
  }

  // ── New ontology ───────────────────────────────────────────────────────────
  async function handleNew() {
    if (!confirm('Discard current ontology and start new?')) return;
    store.loadOntology(emptyOntology());
    aiSuggestion = '';
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  async function persist() {
    await saveOntology(store.ontology);
  }

  $effect(() => {
    // Auto-save on any ontology change
    const _ = store.ontology.updatedAt;
    saveOntology(store.ontology);
  });
</script>

<div class="app">
  <TopBar
    ontologyLabel={store.ontology.label}
    ontologyIRI={store.ontology.iri}
    modelStatus={modelStatus}
    modelProgress={modelProgress}
    modelProgressText={modelProgressText}
    selectedModel={selectedModel}
    onLoadModel={handleLoadModel}
    onOpenSettings={() => (showSaved = !showSaved)}
    onNewOntology={handleNew}
    onImport={handleImport}
    onExportJSON={exportJSON}
    onExportOWL={exportOWL}
  />

  {#if error}
    <div class="error-bar">
      <strong>Error:</strong> {error}
      <button onclick={() => (error = '')}>✕</button>
    </div>
  {/if}

  <TabBar
    active={store.activeTab}
    counts={tabCounts}
    onSelect={(t) => { store.setActiveTab(t); searchQuery = ''; aiSuggestion = ''; }}
  />

  <div class="workspace">
    <!-- Left: hierarchy tree -->
    <aside class="tree-col">
      <!-- Ontology header -->
      <div class="onto-header">
        <input
          class="onto-name-input"
          value={store.ontology.label}
          oninput={(e) => { store.ontology.label = (e.target as HTMLInputElement).value; }}
        />
        <div class="onto-meta">{store.ontology.iri}</div>
      </div>

      {#if store.activeTab === 'class'}
        <HierarchyTree
          nodes={classTree}
          selectedId={store.selectedEntityId}
          entityType="class"
          onSelect={(id) => { store.select(id, 'class'); aiSuggestion = ''; }}
          onAdd={handleAdd}
          onDelete={handleDelete}
          {searchQuery}
          onSearch={(q) => (searchQuery = q)}
        />
      {:else if store.activeTab === 'objectProperty'}
        <HierarchyTree
          nodes={opTree}
          selectedId={store.selectedEntityId}
          entityType="objectProperty"
          onSelect={(id) => store.select(id, 'objectProperty')}
          onAdd={handleAdd}
          onDelete={handleDelete}
          {searchQuery}
          onSearch={(q) => (searchQuery = q)}
        />
      {:else if store.activeTab === 'dataProperty'}
        <HierarchyTree
          nodes={dpTree}
          selectedId={store.selectedEntityId}
          entityType="dataProperty"
          onSelect={(id) => store.select(id, 'dataProperty')}
          onAdd={handleAdd}
          onDelete={handleDelete}
          {searchQuery}
          onSearch={(q) => (searchQuery = q)}
        />
      {:else if store.activeTab === 'annotationProperty'}
        <HierarchyTree
          nodes={apTree}
          selectedId={store.selectedEntityId}
          entityType="annotationProperty"
          onSelect={(id) => store.select(id, 'annotationProperty')}
          onAdd={handleAdd}
          onDelete={handleDelete}
          {searchQuery}
          onSearch={(q) => (searchQuery = q)}
        />
      {:else}
        <HierarchyTree
          nodes={individualTree}
          selectedId={store.selectedEntityId}
          entityType="individual"
          onSelect={(id) => store.select(id, 'individual')}
          onAdd={handleAdd}
          onDelete={handleDelete}
          {searchQuery}
          onSearch={(q) => (searchQuery = q)}
        />
      {/if}

      <!-- AI Import button at bottom of tree -->
      <div class="tree-footer">
        <button
          class="ai-import-btn"
          onclick={() => (showAIImport = true)}
          disabled={!llm.isReady()}
        >
          ✦ AI Extract from Text
        </button>
      </div>
    </aside>

    <!-- Center: entity editor -->
    <main class="editor-col">
      {#if showGraph}
        <GraphPanel ontology={store.ontology} />
      {:else if !store.selectedEntityId}
        <div class="no-selection">
          <div class="no-sel-icon">⬡</div>
          <p>Select an entity from the tree to edit it,<br/>or click <strong>＋</strong> to create one.</p>
          <button class="graph-toggle" onclick={() => (showGraph = true)}>
            View Class Graph
          </button>
        </div>
      {:else}
        <div class="editor-scroll">
          {#if store.selectedClass}
            <ClassEditor
              cls={store.selectedClass}
              ontology={store.ontology}
              onUpdate={(patch) => store.updateClass(store.selectedEntityId!, patch)}
              onSuggestSubclasses={handleSuggestSubclasses}
              onGenerateDesc={handleGenerateDesc}
              aiRunning={aiRunning}
              aiSuggestion={aiSuggestion}
            />
          {:else if store.selectedObjectProperty}
            <ObjectPropertyEditor
              prop={store.selectedObjectProperty}
              ontology={store.ontology}
              onUpdate={(patch) => store.updateObjectProperty(store.selectedEntityId!, patch)}
            />
          {:else if store.selectedDataProperty}
            <DataPropertyEditor
              prop={store.selectedDataProperty}
              ontology={store.ontology}
              onUpdate={(patch) => store.updateDataProperty(store.selectedEntityId!, patch)}
            />
          {:else if store.selectedIndividual}
            <IndividualEditor
              individual={store.selectedIndividual}
              ontology={store.ontology}
              onUpdate={(patch) => store.updateIndividual(store.selectedEntityId!, patch)}
            />
          {/if}
        </div>
      {/if}

      {#if showGraph}
        <button class="graph-close" onclick={() => (showGraph = false)}>← Back to Editor</button>
      {/if}
    </main>

    <!-- Right: usage + saved ontologies -->
    <aside class="right-col">
      {#if store.selectedEntityId && store.selectedEntityType === 'class'}
        <UsagePanel usages={usages} entityLabel={store.selectedClass?.label ?? ''} />
      {:else}
        <div class="right-placeholder">
          <p>Select a class to see where it is used across the ontology.</p>
        </div>
      {/if}

      {#if savedOntologies.length > 0}
        <div class="saved-section">
          <div class="saved-title">Saved Ontologies</div>
          {#each savedOntologies as so}
            <div class="saved-row">
              <button
                class="saved-btn"
                onclick={() => store.loadOntology(so)}
              >{so.label}</button>
              <button
                class="saved-del"
                onclick={async () => { await deleteOntology(so.id); savedOntologies = await loadOntologies(); }}
              >✕</button>
            </div>
          {/each}
        </div>
      {/if}
    </aside>
  </div>

  <!-- Status bar -->
  <footer class="statusbar">
    <span>Classes: {tabCounts.class}</span>
    <span>Object Props: {tabCounts.objectProperty}</span>
    <span>Data Props: {tabCounts.dataProperty}</span>
    <span>Individuals: {tabCounts.individual}</span>
    <span class="status-right">
      {store.ontology.iri} · v{store.ontology.version}
      · Saved {new Date(store.ontology.updatedAt).toLocaleTimeString()}
    </span>
  </footer>
</div>

{#if showAIImport}
  <AIImportPanel
    modelReady={modelStatus === 'ready'}
    running={aiRunning}
    baseIRI={store.ontology.iri}
    onExtract={handleAIExtract}
    onClose={() => (showAIImport = false)}
  />
{/if}

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(body) {
    margin: 0; background: #f0f2f5;
    color: #1a202c; font-family: system-ui, -apple-system, sans-serif;
    height: 100vh; overflow: hidden;
  }
  :global(#app) { height: 100vh; }

  .app { display: flex; flex-direction: column; height: 100vh; }

  .error-bar {
    display: flex; align-items: center; gap: 10px; padding: 6px 16px;
    background: #fde8e8; border-bottom: 1px solid #fca5a5;
    font-size: 13px; color: #c0392b; flex-shrink: 0;
  }
  .error-bar button { margin-left: auto; background: none; border: none; cursor: pointer; color: #c0392b; font-size: 16px; }

  .workspace { display: flex; flex: 1; overflow: hidden; }

  /* Tree column */
  .tree-col {
    width: 260px; flex-shrink: 0; display: flex; flex-direction: column;
    background: #fff; border-right: 1px solid #d0d5dd; overflow: hidden;
  }
  .onto-header { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; }
  .onto-name-input {
    width: 100%; font-size: 13px; font-weight: 700; border: none; background: transparent;
    color: #1a202c; padding: 0; margin-bottom: 2px;
  }
  .onto-name-input:focus { outline: none; }
  .onto-meta { font-size: 10px; font-family: monospace; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-footer { padding: 8px; border-top: 1px solid #e2e8f0; flex-shrink: 0; background: #fafbfc; }
  .ai-import-btn {
    width: 100%; padding: 7px; background: #3b5998; color: #fff;
    border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
  }
  .ai-import-btn:hover:not(:disabled) { background: #2d4577; }
  .ai-import-btn:disabled { opacity: .4; cursor: not-allowed; }

  /* Editor column */
  .editor-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; border-right: 1px solid #d0d5dd; position: relative; }
  .editor-scroll { flex: 1; overflow-y: auto; padding: 20px 24px; }
  .no-selection {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 12px; color: #94a3b8;
  }
  .no-sel-icon { font-size: 48px; color: #d0d5dd; }
  .no-selection p { font-size: 14px; text-align: center; margin: 0; line-height: 1.6; }
  .graph-toggle { padding: 8px 20px; background: #3b5998; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .graph-toggle:hover { background: #2d4577; }
  .graph-close { position: absolute; top: 10px; left: 10px; padding: 5px 12px; background: #fff; border: 1px solid #d0d5dd; border-radius: 6px; cursor: pointer; font-size: 12px; z-index: 5; }
  .graph-close:hover { background: #f0f0f0; }

  /* Right column */
  .right-col {
    width: 220px; flex-shrink: 0; padding: 14px; background: #f8fafc;
    overflow-y: auto; display: flex; flex-direction: column; gap: 16px;
  }
  .right-placeholder { font-size: 12px; color: #94a3b8; line-height: 1.6; }

  .saved-section { border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; flex-direction: column; gap: 5px; }
  .saved-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-bottom: 4px; }
  .saved-row { display: flex; gap: 4px; }
  .saved-btn { flex: 1; padding: 5px 8px; background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 12px; cursor: pointer; text-align: left; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .saved-btn:hover { border-color: #3b5998; color: #3b5998; }
  .saved-del { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 11px; padding: 2px 5px; }
  .saved-del:hover { color: #c0392b; }

  /* Status bar */
  .statusbar {
    display: flex; gap: 16px; align-items: center;
    padding: 4px 16px; background: #fff; border-top: 1px solid #d0d5dd;
    font-size: 11px; color: #64748b; flex-shrink: 0;
  }
  .status-right { margin-left: auto; font-family: monospace; }
</style>
