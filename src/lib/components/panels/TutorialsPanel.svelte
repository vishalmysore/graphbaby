<script lang="ts">
  import type { Ontology } from '../../ontology/types';
  import { TUTORIALS, type Tutorial } from '../../tutorials/tutorials';

  interface Props {
    onLoad: (onto: Ontology) => void;
    onClose: () => void;
  }

  let { onLoad, onClose }: Props = $props();

  function stats(t: Tutorial) {
    const o = t.build();
    return {
      classes: Object.keys(o.classes).length - 1, // exclude owl:Thing
      objectProperties: Object.keys(o.objectProperties).length,
      dataProperties: Object.keys(o.dataProperties).length,
      individuals: Object.keys(o.individuals).length,
    };
  }

  function load(t: Tutorial) {
    onLoad(t.build());
    onClose();
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div class="header-left">
        <span class="wizard-icon">🎓</span>
        <div>
          <div class="modal-title">Tutorials</div>
          <div class="modal-sub">Load a ready-made ontology and start exploring — no AI model needed</div>
        </div>
      </div>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    <div class="modal-body">
      <div class="intro-banner">
        <span class="info-icon">💡</span>
        <p>
          Pick a tutorial to load a fully populated ontology into the editor. Browse the class
          hierarchy, click individuals to inspect their properties, open the graph view, then tweak
          and export it. <strong>Loading replaces your current ontology</strong> (it stays saved and
          re-loadable from the Settings ⚙ panel).
        </p>
      </div>

      <div class="tutorial-grid">
        {#each TUTORIALS as t}
          {@const s = stats(t)}
          <div class="tutorial-card">
            <div class="card-top">
              <span class="card-icon">{t.icon}</span>
              <div class="card-titles">
                <div class="card-title">{t.title}</div>
                <span class="diff diff-{t.difficulty.toLowerCase()}">{t.difficulty}</span>
              </div>
            </div>

            <p class="card-desc">{t.description}</p>

            <ul class="card-highlights">
              {#each t.highlights as h}
                <li>{h}</li>
              {/each}
            </ul>

            <div class="card-stats">
              <span class="stat"><b>{s.classes}</b> classes</span>
              <span class="stat"><b>{s.objectProperties}</b> obj props</span>
              <span class="stat"><b>{s.dataProperties}</b> data props</span>
              <span class="stat"><b>{s.individuals}</b> individuals</span>
            </div>

            <button class="card-load" onclick={() => load(t)}>Load &amp; Try →</button>
          </div>
        {/each}
      </div>
    </div>

    <div class="modal-footer">
      <div class="spacer"></div>
      <button class="btn-cancel" onclick={onClose}>Close</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.45);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    background: #fff; border-radius: 12px;
    width: 860px; max-width: 96vw; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,.25);
  }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
    background: linear-gradient(135deg, #3b5998 0%, #2d4577 100%); color: #fff;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .wizard-icon { font-size: 22px; }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-sub { font-size: 11px; opacity: .8; margin-top: 1px; }
  .close-btn { background: rgba(255,255,255,.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; }
  .close-btn:hover { background: rgba(255,255,255,.3); }

  .modal-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }

  .intro-banner {
    display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px;
    background: #eff6ff; border: 1px solid #bfdbfe;
  }
  .info-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .intro-banner p { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }

  .tutorial-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }
  .tutorial-card {
    border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
    display: flex; flex-direction: column; gap: 10px; background: #fff;
    transition: border-color .15s, box-shadow .15s;
  }
  .tutorial-card:hover { border-color: #c7d6f7; box-shadow: 0 6px 18px rgba(59,89,152,.10); }

  .card-top { display: flex; align-items: center; gap: 10px; }
  .card-icon { font-size: 30px; line-height: 1; }
  .card-titles { display: flex; flex-direction: column; gap: 4px; }
  .card-title { font-size: 16px; font-weight: 700; color: #1a202c; }
  .diff { align-self: flex-start; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 2px 8px; border-radius: 10px; }
  .diff-beginner { background: #dcfce7; color: #15803d; }
  .diff-intermediate { background: #fef3c7; color: #b45309; }
  .diff-advanced { background: #fee2e2; color: #b91c1c; }

  .card-desc { margin: 0; font-size: 12.5px; color: #475569; line-height: 1.5; }

  .card-highlights { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 3px; }
  .card-highlights li { font-size: 12px; color: #64748b; line-height: 1.4; }

  .card-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
  .stat { font-size: 11px; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; }
  .stat b { color: #3b5998; }

  .card-load {
    padding: 8px 12px; background: #3b5998; color: #fff; border: none;
    border-radius: 7px; font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .card-load:hover { background: #2d4577; }

  .modal-footer {
    display: flex; align-items: center; gap: 10px; padding: 14px 20px;
    border-top: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0;
  }
  .spacer { flex: 1; }
  .btn-cancel { padding: 9px 16px; background: #fff; border: 1px solid #d0d5dd; border-radius: 7px; font-size: 13px; cursor: pointer; color: #555; }
  .btn-cancel:hover { background: #f0f0f0; }
</style>
