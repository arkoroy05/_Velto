import { CMD, MSG, STORAGE_KEYS } from '../lib/constants.js';

console.log('[Velto] service worker booted');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Velto] installed');
  (async () => { try { await ensureInbox() } catch (_) {} })();
});

// ----- Storage helpers -----
const CK = STORAGE_KEYS.CONTEXTS_CACHE; // 'velto_contexts'
async function readAllContexts() {
  const data = await chrome.storage.local.get([CK]);
  return Array.isArray(data[CK]) ? data[CK] : [];
}
async function writeAllContexts(list) {
  await chrome.storage.local.set({ [CK]: list });
}
function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

// Ensure default inbox context exists
async function ensureInbox() {
  const list = await readAllContexts();
  let inbox = list.find((c) => c.id === 'inbox');
  if (!inbox) {
    inbox = { id: 'inbox', name: 'Quick Captures', snippets: [], updatedAt: Date.now(), lastTool: 'Unknown' };
    list.unshift(inbox);
    await writeAllContexts(list);
  }
  return inbox;
}

// ----- Commands (hotkeys) -----
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== CMD.CAPTURE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: MSG.CAPTURE_REQUEST });
    }
  } catch (e) {
    console.warn('[Velto] capture command failed:', e);
  }
});

// ----- Message handling -----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case MSG.PING: {
        sendResponse({ type: MSG.PONG, ts: Date.now() });
        return;
      }

      case MSG.CONTEXTS_LIST: {
        await ensureInbox();
        const list = await readAllContexts();
        const items = list.map((c) => ({
          id: c.id,
          name: c.name,
          snippetCount: c.snippets?.length || 0,
          timeAgo: timeAgo(c.updatedAt || Date.now()),
          lastTool: c.lastTool || 'Unknown',
        }));
        sendResponse({ items, cached: true });
        return;
      }

      case MSG.CONTEXTS_CREATE: {
        const { content, title, contextId, url, host, tool } = message.payload || {};
        if (!content || typeof content !== 'string' || !content.trim()) {
          sendResponse({ ok: false, error: 'Empty content' });
          return;
        }
        const list = await readAllContexts();
        let ctx = list.find((c) => c.id === (contextId || 'inbox'));
        if (!ctx) {
          ctx = { id: contextId || 'inbox', name: contextId ? 'Context' : 'Quick Captures', snippets: [], updatedAt: Date.now(), lastTool: tool || 'Unknown' };
          list.unshift(ctx);
        }
        const snippet = {
          id: genId('snip'),
          title: title || (content.split('\n')[0]?.slice(0, 80) || 'Snippet'),
          content,
          url: url || sender?.tab?.url || '',
          source: host || sender?.tab?.url || '',
          tool: tool || 'Unknown',
          timestamp: Date.now(),
        };
        ctx.snippets.unshift(snippet);
        ctx.updatedAt = Date.now();
        ctx.lastTool = tool || ctx.lastTool || 'Unknown';
        await writeAllContexts(list);
        sendResponse({ ok: true, contextId: ctx.id, snippetId: snippet.id });
        return;
      }

      case MSG.CONTEXTS_UPDATE: {
        // No-op placeholder for future edits
        sendResponse({ ok: false, error: 'Not implemented' });
        return;
      }

      case MSG.CONTEXTS_DELETE: {
        // No-op placeholder for future delete
        sendResponse({ ok: false, error: 'Not implemented' });
        return;
      }

      case 'CONTEXT_DETAIL': {
        const { id } = message.payload || {};
        const list = await readAllContexts();
        const ctx = list.find((c) => c.id === id) || null;
        sendResponse({ ok: !!ctx, context: ctx });
        return;
      }

      default:
        return;
    }
  })();
  return true; // keep the message channel open for async sendResponse
});