<script lang="ts">
  import type { Database } from 'sql.js';
  import { openDatabase, introspect, type DbSchema } from '../../db/sqlEngine';
  import { mapDatabaseToGraph, type DbGraphResult } from '../../db/dbToOntology';

  interface Props {
    baseIRI: string;
    onApply: (result: DbGraphResult) => void;
    onClose: () => void;
  }

  let { baseIRI, onApply, onClose }: Props = $props();

  type Mode = 'file' | 'sql';
  let mode = $state<Mode>('sql');
  let db = $state<Database | null>(null);
  let schema = $state<DbSchema | null>(null);
  let busy = $state(false);
  let error = $state('');
  let dragOver = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  let sqlText = $state('');
  let includeRows = $state(true);
  let maxRows = $state(200);

  const SAMPLE_SQL = `-- A tiny film domain. Edit freely, then click "Build Database".
CREATE TABLE Director (
  id INTEGER PRIMARY KEY,
  name TEXT,
  birth_year INTEGER
);
CREATE TABLE Film (
  id INTEGER PRIMARY KEY,
  title TEXT,
  year INTEGER,
  director_id INTEGER REFERENCES Director(id)
);
CREATE TABLE Actor (
  id INTEGER PRIMARY KEY,
  name TEXT
);
CREATE TABLE Role (
  id INTEGER PRIMARY KEY,
  film_id INTEGER REFERENCES Film(id),
  actor_id INTEGER REFERENCES Actor(id),
  character TEXT
);

INSERT INTO Director VALUES (1, 'Ramesh Sippy', 1947);
INSERT INTO Film VALUES (1, 'Sholay', 1975, 1);
INSERT INTO Actor VALUES (1, 'Amitabh Bachchan'), (2, 'Dharmendra');
INSERT INTO Role VALUES (1, 1, 1, 'Jai'), (2, 1, 2, 'Veeru');`;

  const totalRows = $derived(
    schema ? schema.tables.reduce((n, t) => n + t.rowCount, 0) : 0,
  );

  async function buildFromSql() {
    busy = true;
    error = '';
    schema = null;
    try {
      const fresh = await openDatabase(null);
      fresh.run(sqlText);
      db = fresh;
      schema = introspect(fresh);
      if (schema.tables.length === 0) error = 'No tables found. Add at least one CREATE TABLE statement.';
    } catch (e) {
      error = `SQL error: ${String(e)}`;
    } finally {
      busy = false;
    }
  }

  async function loadFile(file: File | undefined | null) {
    error = '';
    schema = null;
    if (!file) return;
    busy = true;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const opened = await openDatabase(bytes);
      db = opened;
      schema = introspect(opened);
      if (schema.tables.length === 0) error = 'This database has no tables.';
    } catch (e) {
      error = `Could not open database: ${String(e)}`;
    } finally {
      busy = false;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    loadFile(e.dataTransfer?.files?.[0]);
  }

  function convert() {
    if (!db) return;
    busy = true;
    error = '';
    try {
      const result = mapDatabaseToGraph(db, baseIRI, {
        includeRows,
        maxRowsPerTable: Math.max(0, Number(maxRows) || 0),
      });
      onApply(result);
    } catch (e) {
      error = `Conversion failed: ${String(e)}`;
      busy = false;
    }
  }

  function loadSample() {
    sqlText = SAMPLE_SQL;
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div class="header-left">
        <span class="wizard-icon">🗄</span>
        <div>
          <div class="modal-title">Database → Knowledge Graph</div>
          <div class="modal-sub">Map SQL tables, columns &amp; foreign keys into your ontology</div>
        </div>
      </div>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <!-- Mode tabs -->
    <div class="mode-tabs">
      <button class="mode-tab" class:active={mode === 'sql'} onclick={() => (mode = 'sql')}>
        ✎ Write SQL
      </button>
      <button class="mode-tab" class:active={mode === 'file'} onclick={() => (mode = 'file')}>
        📁 Upload .sqlite / .db
      </button>
    </div>

    <div class="modal-body">
      {#if mode === 'sql'}
        <div class="field">
          <div class="field-head">
            <span class="field-label">SQL — CREATE TABLE / INSERT statements</span>
            <button class="link-btn" onclick={loadSample}>Load sample schema</button>
          </div>
          <textarea
            bind:value={sqlText}
            placeholder="Paste or type SQL to build an in-browser SQLite database…"
            spellcheck="false"
            rows="9"
          ></textarea>
          <button class="btn-secondary self-start" disabled={busy || !sqlText.trim()} onclick={buildFromSql}>
            {busy ? 'Building…' : '⚙ Build Database'}
          </button>
        </div>
      {:else}
        <div
          class="dropzone"
          class:over={dragOver}
          role="button"
          tabindex="0"
          ondrop={onDrop}
          ondragover={(e) => { e.preventDefault(); dragOver = true; }}
          ondragleave={() => (dragOver = false)}
          onclick={() => fileInput?.click()}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); }}
        >
          <input
            bind:this={fileInput}
            type="file"
            accept=".sqlite,.sqlite3,.db,application/x-sqlite3,application/vnd.sqlite3"
            hidden
            onchange={(e) => loadFile((e.target as HTMLInputElement).files?.[0])}
          />
          <span class="dz-icon">🗄</span>
          <span class="dz-text">
            <strong>Drop a SQLite file here</strong> or <span class="link">browse</span>
            <span class="dz-sub">— .sqlite / .db, opened in your browser</span>
          </span>
        </div>
      {/if}

      {#if error}<div class="error">{error}</div>{/if}

      <!-- Schema preview -->
      {#if schema && schema.tables.length > 0}
        <div class="preview">
          <div class="preview-head">
            Schema — <strong>{schema.tables.length}</strong> tables, <strong>{totalRows}</strong> rows
          </div>
          <div class="tables">
            {#each schema.tables as t}
              <div class="table-card">
                <div class="table-name">
                  <span class="tbl-badge">T</span>{t.name}
                  <span class="row-count">{t.rowCount} rows</span>
                </div>
                <div class="cols">
                  {#each t.columns as c}
                    {@const isFk = t.foreignKeys.some((fk) => fk.from === c.name)}
                    <span class="col" class:pk={c.pk} class:fk={isFk}>
                      {c.name}
                      {#if c.pk}<span class="tag pk-tag">PK</span>{/if}
                      {#if isFk}<span class="tag fk-tag">FK→{t.foreignKeys.find((fk) => fk.from === c.name)?.table}</span>{/if}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <div class="options">
            <label class="opt-check">
              <input type="checkbox" bind:checked={includeRows} />
              Import rows as individuals
            </label>
            <label class="opt-num" class:disabled={!includeRows}>
              max rows / table
              <input type="number" min="0" max="5000" bind:value={maxRows} disabled={!includeRows} />
            </label>
          </div>

          <div class="mapping-legend">
            tables → <b>classes</b> · columns → <b>data properties</b> · foreign keys → <b>object properties</b>{includeRows ? ' · rows → individuals' : ''}
          </div>
        </div>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" onclick={onClose}>Cancel</button>
      <div class="spacer"></div>
      <button
        class="btn-primary"
        disabled={!schema || schema.tables.length === 0 || busy}
        onclick={convert}
      >
        {busy ? 'Converting…' : '→ Convert to Graph'}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    background: #fff; border-radius: 12px; width: 640px; max-width: 96vw; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px rgba(0,0,0,.25);
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #3b5998 0%, #2d4577 100%);
    color: #fff; flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .wizard-icon { font-size: 22px; }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-sub { font-size: 11px; opacity: .8; margin-top: 1px; }
  .close-btn { background: rgba(255,255,255,.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; }
  .close-btn:hover { background: rgba(255,255,255,.3); }

  .mode-tabs { display: flex; gap: 6px; padding: 12px 20px 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
  .mode-tab { padding: 8px 14px; border: 1px solid transparent; border-bottom: none; background: none; font-size: 13px; font-weight: 600; color: #94a3b8; cursor: pointer; border-radius: 7px 7px 0 0; }
  .mode-tab.active { background: #fff; color: #3b5998; border-color: #e2e8f0; margin-bottom: -1px; }

  .modal-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-head { display: flex; align-items: center; justify-content: space-between; }
  .field-label { font-size: 12px; font-weight: 700; color: #374151; }
  .link-btn { background: none; border: none; color: #3b5998; font-size: 12px; cursor: pointer; text-decoration: underline; padding: 0; }
  textarea {
    padding: 10px; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 12.5px;
    font-family: ui-monospace, Menlo, Consolas, monospace; resize: vertical; line-height: 1.5;
  }
  textarea:focus { outline: none; border-color: #3b5998; }
  .self-start { align-self: flex-start; }

  .dropzone {
    display: flex; align-items: center; gap: 10px; padding: 20px 16px;
    border: 1.5px dashed #c7d0e0; border-radius: 8px; background: #f8fafc; cursor: pointer;
    transition: border-color .15s, background .15s;
  }
  .dropzone:hover, .dropzone.over { border-color: #3b5998; background: #eef2fb; }
  .dropzone.over { border-style: solid; }
  .dz-icon { font-size: 22px; }
  .dz-text { font-size: 13px; color: #475569; line-height: 1.4; }
  .dz-text strong { color: #1a202c; }
  .link { color: #3b5998; text-decoration: underline; }
  .dz-sub { color: #94a3b8; font-size: 11px; }

  .error { background: #fde8e8; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #c0392b; }

  .preview { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  .preview-head { font-size: 13px; color: #374151; }
  .tables { display: flex; flex-direction: column; gap: 8px; }
  .table-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .table-name { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: #1a202c; margin-bottom: 7px; }
  .tbl-badge { width: 18px; height: 18px; border-radius: 4px; background: #dbeafe; color: #1d4ed8; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .row-count { margin-left: auto; font-size: 11px; font-weight: 500; color: #94a3b8; }
  .cols { display: flex; flex-wrap: wrap; gap: 5px; }
  .col { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: #f1f5f9; border-radius: 6px; font-size: 12px; color: #475569; }
  .col.pk { background: #fef9c3; color: #854d0e; }
  .col.fk { background: #ede9fe; color: #6d28d9; }
  .tag { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; }
  .pk-tag { background: #fde68a; color: #854d0e; }
  .fk-tag { background: #ddd6fe; color: #5b21b6; }

  .options { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 4px 0; }
  .opt-check, .opt-num { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #374151; }
  .opt-num.disabled { opacity: .45; }
  .opt-num input { width: 72px; padding: 4px 6px; border: 1px solid #d0d5dd; border-radius: 5px; font-size: 12px; }

  .mapping-legend { font-size: 11px; color: #94a3b8; line-height: 1.6; }
  .mapping-legend b { color: #64748b; }

  .modal-footer { display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; }
  .spacer { flex: 1; }
  .btn-primary { padding: 9px 20px; background: #3b5998; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .btn-primary:hover:not(:disabled) { background: #2d4577; }
  .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
  .btn-cancel { padding: 9px 16px; background: #fff; border: 1px solid #d0d5dd; border-radius: 7px; font-size: 13px; cursor: pointer; color: #555; }
  .btn-cancel:hover { background: #f0f0f0; }
  .btn-secondary { padding: 8px 14px; background: #eef2fb; color: #3b5998; border: 1px solid #c7d6f7; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-secondary:hover:not(:disabled) { background: #dbe4f8; }
  .btn-secondary:disabled { opacity: .4; cursor: not-allowed; }
</style>
