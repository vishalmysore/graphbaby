<script lang="ts">
  import type { TreeNode } from '../../ontology/hierarchy';
  import TreeItem from './TreeItem.svelte';

  interface Props {
    node: TreeNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: (parentId: string) => void;
    onDelete: (id: string) => void;
  }

  let { node, selectedId, onSelect, onAdd, onDelete }: Props = $props();

  let expanded = $state(true);

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    expanded = !expanded;
  }
</script>

<div class="tree-item-wrap">
  <div
    class="tree-row"
    class:selected={selectedId === node.id}
    style="padding-left: {node.depth * 16 + 8}px"
    onclick={() => onSelect(node.id)}
    role="treeitem"
    aria-selected={selectedId === node.id}
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && onSelect(node.id)}
  >
    {#if node.children.length > 0}
      <button class="expander" onclick={toggle} tabindex="-1">
        {expanded ? '▾' : '▸'}
      </button>
    {:else}
      <span class="leaf-indent"></span>
    {/if}

    <span class="entity-icon">○</span>
    <span class="node-label" title={node.iri}>{node.label}</span>

    <div class="row-actions">
      {#if node.id !== 'owl_Thing'}
        <button class="action-btn add" onclick={(e) => { e.stopPropagation(); onAdd(node.id); }} title="Add subclass">＋</button>
        <button class="action-btn del" onclick={(e) => { e.stopPropagation(); onDelete(node.id); }} title="Delete">✕</button>
      {/if}
    </div>
  </div>

  {#if expanded && node.children.length > 0}
    {#each node.children as child}
      <TreeItem node={child} {selectedId} {onSelect} {onAdd} {onDelete} />
    {/each}
  {/if}
</div>

<style>
  .tree-row {
    display: flex; align-items: center; gap: 4px;
    padding-top: 3px; padding-bottom: 3px; padding-right: 8px;
    cursor: pointer; user-select: none; border-radius: 0;
    min-height: 26px;
  }
  .tree-row:hover { background: #eef2fb; }
  .tree-row.selected { background: #dbe4f8; }
  .expander { background: none; border: none; cursor: pointer; color: #666; font-size: 10px; padding: 0 2px; line-height: 1; flex-shrink: 0; }
  .leaf-indent { width: 18px; flex-shrink: 0; }
  .entity-icon { font-size: 9px; color: #3b5998; flex-shrink: 0; }
  .node-label { font-size: 13px; color: #1a202c; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-row.selected .node-label { color: #3b5998; font-weight: 600; }
  .row-actions { display: none; gap: 2px; }
  .tree-row:hover .row-actions, .tree-row.selected .row-actions { display: flex; }
  .action-btn { background: none; border: none; cursor: pointer; font-size: 11px; padding: 1px 4px; border-radius: 3px; }
  .action-btn.add { color: #3b5998; }
  .action-btn.add:hover { background: #dbe4f8; }
  .action-btn.del { color: #c0392b; }
  .action-btn.del:hover { background: #fde8e8; }
</style>
