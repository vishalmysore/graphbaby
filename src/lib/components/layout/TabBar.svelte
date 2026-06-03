<script lang="ts">
  import type { EntityType } from '../../ontology/types';

  interface Props {
    active: EntityType;
    counts: Record<EntityType, number>;
    onSelect: (tab: EntityType) => void;
  }

  let { active, counts, onSelect }: Props = $props();

  const TABS: { id: EntityType; label: string; short: string }[] = [
    { id: 'class', label: 'Classes', short: 'C' },
    { id: 'objectProperty', label: 'Object Properties', short: 'OP' },
    { id: 'dataProperty', label: 'Data Properties', short: 'DP' },
    { id: 'annotationProperty', label: 'Annotation Properties', short: 'AP' },
    { id: 'individual', label: 'Individuals', short: 'I' },
  ];
</script>

<div class="tabbar">
  {#each TABS as tab}
    <button
      class="tab"
      class:active={active === tab.id}
      onclick={() => onSelect(tab.id)}
    >
      <span class="tab-label">{tab.label}</span>
      <span class="tab-count">{counts[tab.id]}</span>
    </button>
  {/each}
</div>

<style>
  .tabbar {
    display: flex; align-items: stretch; flex-shrink: 0;
    background: #f0f2f5; border-bottom: 1px solid #d0d5dd;
    overflow-x: auto;
  }
  .tab {
    display: flex; align-items: center; gap: 6px;
    padding: 0 18px; height: 36px; border: none; background: none;
    font-size: 13px; color: #555; cursor: pointer;
    border-bottom: 3px solid transparent; white-space: nowrap;
    transition: color .15s;
  }
  .tab:hover { color: #3b5998; background: rgba(59,89,152,.05); }
  .tab.active { color: #3b5998; border-bottom-color: #3b5998; font-weight: 600; background: #fff; }
  .tab-count { font-size: 10px; background: #e2e8f0; color: #555; padding: 1px 6px; border-radius: 10px; }
  .tab.active .tab-count { background: #dbe4f8; color: #3b5998; }
</style>
