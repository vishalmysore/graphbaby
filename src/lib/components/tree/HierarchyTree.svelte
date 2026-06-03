<script lang="ts">
  import type { TreeNode } from '../../ontology/hierarchy';
  import TreeItem from './TreeItem.svelte';

  interface Props {
    nodes: TreeNode[];
    selectedId: string | null;
    entityType: string;
    onSelect: (id: string) => void;
    onAdd: (parentId?: string) => void;
    onDelete: (id: string) => void;
    searchQuery: string;
    onSearch: (q: string) => void;
  }

  let { nodes, selectedId, entityType, onSelect, onAdd, onDelete, searchQuery, onSearch }: Props = $props();

  const LABELS: Record<string, string> = {
    class: 'Class',
    objectProperty: 'Object Property',
    dataProperty: 'Data Property',
    annotationProperty: 'Annotation Property',
    individual: 'Individual',
  };
</script>

<div class="tree-panel">
  <div class="tree-toolbar">
    <input
      class="search"
      placeholder="Search…"
      value={searchQuery}
      oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
    />
    <button class="btn-add" onclick={() => onAdd()} title="Add {LABELS[entityType]}">＋</button>
  </div>

  <div class="tree-body">
    {#if nodes.length === 0}
      <p class="empty">No {LABELS[entityType]}s found.</p>
    {:else}
      {#each nodes as node}
        <TreeItem
          {node}
          {selectedId}
          {onSelect}
          onAdd={(parentId) => onAdd(parentId)}
          {onDelete}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .tree-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .tree-toolbar { display: flex; gap: 6px; padding: 8px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; background: #fafbfc; }
  .search { flex: 1; padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; background: #fff; }
  .search:focus { outline: none; border-color: #3b5998; }
  .btn-add { padding: 5px 10px; background: #3b5998; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  .btn-add:hover { background: #2d4577; }
  .tree-body { flex: 1; overflow-y: auto; padding: 4px 0; }
  .empty { font-size: 12px; color: #94a3b8; text-align: center; padding: 20px; }
</style>
