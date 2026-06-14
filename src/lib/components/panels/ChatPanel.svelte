<script lang="ts">
  import type { ChunkKind } from '../../ai/rag';

  interface Source { label: string; kind: ChunkKind }
  interface Message { role: 'user' | 'assistant'; content: string; sources?: Source[] }

  interface Props {
    modelReady: boolean;
    ontologyLabel: string;
    onAsk: (question: string, history: { role: 'user' | 'assistant'; content: string }[])
      => Promise<{ answer: string; sources: Source[] }>;
    onClose: () => void;
  }

  let { modelReady, ontologyLabel, onAsk, onClose }: Props = $props();

  let messages = $state<Message[]>([]);
  let input = $state('');
  let busy = $state(false);
  let error = $state('');
  let listEl = $state<HTMLDivElement | null>(null);

  const SUGGESTIONS = [
    'Summarize this ontology',
    'What are the main classes?',
    'List the individuals and their types',
  ];

  const kindIcon: Record<ChunkKind, string> = {
    class: 'C', objectProperty: 'OP', dataProperty: 'DP', individual: 'i',
  };

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy || !modelReady) return;
    error = '';
    input = '';
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    messages = [...messages, { role: 'user', content: q }];
    scrollSoon();
    busy = true;
    try {
      const { answer, sources } = await onAsk(q, history);
      messages = [...messages, { role: 'assistant', content: answer.trim(), sources }];
    } catch (e) {
      error = String(e);
      messages = [...messages, { role: 'assistant', content: '⚠ Could not answer — see the error below.' }];
    } finally {
      busy = false;
      scrollSoon();
    }
  }

  function scrollSoon() {
    setTimeout(() => { if (listEl) listEl.scrollTop = listEl.scrollHeight; }, 30);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div class="header-left">
        <span class="wizard-icon">💬</span>
        <div>
          <div class="modal-title">Chat with your ontology</div>
          <div class="modal-sub">Grounded on <strong>{ontologyLabel}</strong> · retrieval-augmented (RAG)</div>
        </div>
      </div>
      <button class="close-btn" onclick={onClose}>✕</button>
    </div>

    {#if !modelReady}
      <div class="notice">
        <span class="info-icon">⚠</span>
        <p>Load an AI model first (top bar → <strong>Load AI Model</strong>). The chat runs entirely in your browser and answers using only the facts in this ontology.</p>
      </div>
    {/if}

    <div class="messages" bind:this={listEl}>
      {#if messages.length === 0}
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <p>Ask anything about the entities, relationships and individuals in <strong>{ontologyLabel}</strong>.</p>
          <div class="suggestions">
            {#each SUGGESTIONS as s}
              <button class="suggestion" disabled={!modelReady || busy} onclick={() => send(s)}>{s}</button>
            {/each}
          </div>
        </div>
      {/if}

      {#each messages as m}
        <div class="msg {m.role}">
          <div class="bubble">{m.content}</div>
          {#if m.sources && m.sources.length}
            <div class="sources">
              <span class="sources-label">Retrieved facts:</span>
              {#each m.sources as s}
                <span class="source-chip" title={s.kind}><span class="src-badge">{kindIcon[s.kind]}</span>{s.label}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      {#if busy}
        <div class="msg assistant">
          <div class="bubble thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        </div>
      {/if}
    </div>

    {#if error}<div class="error">{error}</div>{/if}

    <div class="composer">
      <textarea
        bind:value={input}
        onkeydown={onKey}
        placeholder={modelReady ? 'Ask a question…  (Enter to send, Shift+Enter for newline)' : 'Load an AI model to start chatting…'}
        rows="2"
        disabled={!modelReady || busy}
      ></textarea>
      <button class="send-btn" disabled={!modelReady || busy || !input.trim()} onclick={() => send()}>
        {busy ? '…' : 'Send'}
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
    background: #fff; border-radius: 12px;
    width: 640px; max-width: 96vw; height: 82vh; max-height: 760px;
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
  .modal-sub { font-size: 11px; opacity: .85; margin-top: 1px; }
  .close-btn { background: rgba(255,255,255,.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; }
  .close-btn:hover { background: rgba(255,255,255,.3); }

  .notice {
    display: flex; gap: 10px; padding: 10px 16px; background: #fffbeb;
    border-bottom: 1px solid #fde68a; flex-shrink: 0;
  }
  .notice p { margin: 0; font-size: 12.5px; color: #92400e; line-height: 1.5; }
  .info-icon { flex-shrink: 0; }

  .messages { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; background: #f8fafc; }

  .empty { margin: auto; text-align: center; color: #64748b; max-width: 380px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .empty-icon { font-size: 32px; }
  .empty p { margin: 0; font-size: 13px; line-height: 1.6; }
  .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 6px; }
  .suggestion { padding: 7px 12px; background: #fff; border: 1px solid #c7d6f7; color: #3b5998; border-radius: 16px; font-size: 12px; cursor: pointer; }
  .suggestion:hover:not(:disabled) { background: #eef2fb; }
  .suggestion:disabled { opacity: .5; cursor: not-allowed; }

  .msg { display: flex; flex-direction: column; gap: 5px; max-width: 86%; }
  .msg.user { align-self: flex-end; align-items: flex-end; }
  .msg.assistant { align-self: flex-start; align-items: flex-start; }
  .bubble { padding: 10px 13px; border-radius: 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
  .msg.user .bubble { background: #3b5998; color: #fff; border-bottom-right-radius: 4px; }
  .msg.assistant .bubble { background: #fff; color: #1a202c; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }

  .bubble.thinking { display: flex; gap: 4px; align-items: center; }
  .bubble.thinking .dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; animation: blink 1.2s infinite both; }
  .bubble.thinking .dot:nth-child(2) { animation-delay: .2s; }
  .bubble.thinking .dot:nth-child(3) { animation-delay: .4s; }
  @keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }

  .sources { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding-left: 2px; }
  .sources-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; }
  .source-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #475569; background: #eef2fb; border: 1px solid #dbe4f8; border-radius: 10px; padding: 2px 7px 2px 3px; }
  .src-badge { font-size: 9px; font-weight: 700; color: #3b5998; background: #fff; border-radius: 7px; padding: 1px 4px; }

  .error { margin: 0 18px; background: #fde8e8; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #c0392b; flex-shrink: 0; }

  .composer { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #fff; flex-shrink: 0; }
  textarea { flex: 1; padding: 9px 11px; border: 1px solid #d0d5dd; border-radius: 8px; font-size: 13px; font-family: inherit; resize: none; line-height: 1.5; }
  textarea:focus { outline: none; border-color: #3b5998; }
  textarea:disabled { background: #f8fafc; }
  .send-btn { padding: 0 18px; background: #3b5998; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; align-self: stretch; }
  .send-btn:hover:not(:disabled) { background: #2d4577; }
  .send-btn:disabled { opacity: .4; cursor: not-allowed; }
</style>
