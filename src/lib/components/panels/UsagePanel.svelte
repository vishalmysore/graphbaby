<script lang="ts">
  interface Usage {
    label: string;
    iri: string;
  }

  interface Props {
    usages: Usage[];
    entityLabel: string;
  }

  let { usages, entityLabel }: Props = $props();
</script>

<div class="usage-panel">
  <div class="panel-title">Usage</div>

  {#if usages.length === 0}
    <p class="empty">"{entityLabel}" is not referenced elsewhere in the ontology.</p>
  {:else}
    <ul class="usage-list">
      {#each usages as u}
        <li class="usage-item">
          <span class="usage-label">{u.label}</span>
          <span class="usage-iri">{u.iri}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .usage-panel { display: flex; flex-direction: column; gap: 8px; }
  .panel-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .empty { font-size: 12px; color: #94a3b8; margin: 0; }
  .usage-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px; }
  .usage-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; }
  .usage-label { font-size: 12px; color: #374151; }
  .usage-iri { font-size: 10px; font-family: monospace; color: #94a3b8; }
</style>
