<script lang="ts">
  interface Props {
    title: string;
    items: string[];
    placeholder?: string;
    allOptions?: { id: string; label: string }[];
    onAdd: (value: string) => void;
    onRemove: (value: string) => void;
    color?: string;
  }

  let { title, items, placeholder = 'Add…', allOptions, onAdd, onRemove, color = '#3b5998' }: Props = $props();

  let open = $state(true);
  let inputVal = $state('');
  let showDropdown = $state(false);

  const filtered = $derived(
    allOptions
      ? allOptions.filter(
          (o) => o.label.toLowerCase().includes(inputVal.toLowerCase()) && !items.includes(o.id),
        )
      : [],
  );

  function add() {
    const val = inputVal.trim();
    if (!val) return;
    // If options mode, match by label or use raw id
    const match = allOptions?.find((o) => o.label.toLowerCase() === val.toLowerCase());
    onAdd(match ? match.id : val);
    inputVal = '';
    showDropdown = false;
  }

  function pick(id: string) {
    onAdd(id);
    inputVal = '';
    showDropdown = false;
  }

  function resolveLabel(id: string): string {
    return allOptions?.find((o) => o.id === id)?.label ?? id;
  }
</script>

<div class="axiom-section">
  <button class="section-header" onclick={() => (open = !open)} style="--color:{color}">
    <span class="chevron">{open ? '▾' : '▸'}</span>
    <span class="section-title">{title}</span>
    <span class="count">{items.length}</span>
  </button>

  {#if open}
    <div class="section-body">
      {#each items as item}
        <div class="axiom-chip">
          <span class="chip-label">{resolveLabel(item)}</span>
          <button class="chip-remove" onclick={() => onRemove(item)}>✕</button>
        </div>
      {/each}

      <div class="add-row">
        <div class="input-wrap">
          <input
            bind:value={inputVal}
            {placeholder}
            onfocus={() => (showDropdown = true)}
            onblur={() => setTimeout(() => (showDropdown = false), 150)}
            onkeydown={(e) => e.key === 'Enter' && add()}
            oninput={() => (showDropdown = true)}
          />
          {#if showDropdown && filtered.length > 0}
            <div class="dropdown">
              {#each filtered.slice(0, 8) as opt}
                <button class="drop-item" onclick={() => pick(opt.id)}>{opt.label}</button>
              {/each}
            </div>
          {/if}
        </div>
        <button class="btn-add" onclick={add}>Add</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .axiom-section { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
  .section-header {
    display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px;
    background: #f8fafc; border: none; cursor: pointer; text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-header:hover { background: #f0f4fb; }
  .chevron { font-size: 10px; color: #64748b; width: 12px; }
  .section-title { font-size: 12px; font-weight: 700; color: var(--color); text-transform: uppercase; letter-spacing: .04em; flex: 1; }
  .count { font-size: 10px; background: #e2e8f0; padding: 1px 6px; border-radius: 10px; color: #555; }
  .section-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 5px; }
  .axiom-chip { display: inline-flex; align-items: center; gap: 6px; background: #eef2fb; border: 1px solid #c7d6f7; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: #3b5998; }
  .chip-remove { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 10px; padding: 0; line-height: 1; }
  .chip-remove:hover { color: #c0392b; }
  .add-row { display: flex; gap: 6px; margin-top: 4px; }
  .input-wrap { position: relative; flex: 1; }
  input { width: 100%; padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 4px; font-size: 12px; }
  input:focus { outline: none; border-color: #3b5998; }
  .dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #d0d5dd; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,.1); z-index: 50; max-height: 160px; overflow-y: auto; }
  .drop-item { display: block; width: 100%; padding: 6px 10px; background: none; border: none; text-align: left; font-size: 12px; cursor: pointer; color: #333; }
  .drop-item:hover { background: #f0f4fb; }
  .btn-add { padding: 5px 10px; background: #3b5998; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; }
  .btn-add:hover { background: #2d4577; }
</style>
