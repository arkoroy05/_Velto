import { CMD, MSG, STORAGE_KEYS } from '../lib/constants.js';
import apiService from '../lib/api.js';

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

// Sync contexts with backend
async function syncWithBackend() {
  try {
    const response = await apiService.getContexts({ limit: 100 });
    if (response.success && response.data) {
      // Transform backend data to local format
      const backendContexts = response.data.map(ctx => ({
        id: ctx._id || ctx.id,
        name: ctx.title || ctx.name,
        snippets: ctx.snippets || [],
        updatedAt: new Date(ctx.updatedAt || ctx.createdAt).getTime(),
        lastTool: ctx.source?.type || 'Unknown'
      }));
      
      // Merge with local contexts
      const localContexts = await readAllContexts();
      const merged = [...backendContexts, ...localContexts.filter(local => 
        !backendContexts.find(backend => backend.id === local.id)
      )];
      
      await writeAllContexts(merged);
      return merged;
    }
  } catch (error) {
    console.warn('[Velto] Failed to sync with backend:', error);
  }
  return await readAllContexts();
}

// ----- Commands (hotkeys) -----
async function isTabMonitoring(tabId) {
  return await new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: MSG.CAPTURE_STATE_GET }, (res) => {
        if (chrome.runtime.lastError) {
          // No content script or cannot reach; assume not monitoring
          return resolve(false);
        }
        resolve(!!res?.monitoring);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== CMD.CAPTURE) return;
  try {
    // Open the popup and ask user to pick a project
    await chrome.storage.local.set({ velto_capture_pick: true });
    await chrome.action.openPopup();
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
        // Try to sync with backend first
        const list = await syncWithBackend();
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

        try {
          // Determine target context: use payload-provided contextId or selected project, else inbox
          const sel = await chrome.storage.local.get(['velto_selected_project']);
          const targetId = contextId || sel?.velto_selected_project || 'inbox';
          // Create context in backend
          const backendContext = await apiService.createContext({
            title: title || (content.split('\n')[0]?.slice(0, 80) || 'Snippet'),
            content: content,
            type: 'conversation',
            source: {
              type: tool?.toLowerCase() || 'manual',
              agentId: tool || 'Unknown'
            },
            metadata: {
              url: url || sender?.tab?.url || '',
              host: host || sender?.tab?.url || '',
              tool: tool || 'Unknown'
            }
          });

          if (backendContext.success) {
            // Also store locally for offline access
            const list = await readAllContexts();
            let ctx = list.find((c) => c.id === (targetId));
            if (!ctx) {
              ctx = { id: targetId, name: targetId !== 'inbox' ? 'Context' : 'Quick Captures', snippets: [], updatedAt: Date.now(), lastTool: tool || 'Unknown' };
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
            
            sendResponse({ ok: true, contextId: ctx.id, snippetId: snippet.id, backendId: backendContext.data?._id });
          } else {
            throw new Error(backendContext.error || 'Failed to create context in backend');
          }
        } catch (error) {
          console.error('[Velto] Failed to create context:', error);
          // Fallback to local storage only
          const list = await readAllContexts();
          const sel = await chrome.storage.local.get(['velto_selected_project']);
          const targetId = contextId || sel?.velto_selected_project || 'inbox';
          let ctx = list.find((c) => c.id === (targetId));
          if (!ctx) {
            ctx = { id: targetId, name: targetId !== 'inbox' ? 'Context' : 'Quick Captures', snippets: [], updatedAt: Date.now(), lastTool: tool || 'Unknown' };
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
          
          sendResponse({ ok: true, contextId: ctx.id, snippetId: snippet.id, localOnly: true });
        }
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

      case 'SYNC_BACKEND': {
        try {
          const contexts = await syncWithBackend();
          sendResponse({ ok: true, contexts });
        } catch (error) {
          sendResponse({ ok: false, error: error.message });
        }
        return;
      }

      case 'TEST_CONNECTION': {
        try {
          const result = await apiService.testConnection()
          sendResponse(result)
        } catch (error) {
          sendResponse({ success: false, error: error.message })
        }
        return
      }

      case 'API_REQUEST': {
        try {
          const { method, endpoint, data, params } = message.payload
          let result
          
          switch (method) {
            case 'GET':
              if (endpoint === 'health') {
                result = await apiService.healthCheck()
              } else if (endpoint === 'contexts') {
                result = await apiService.getContexts(params || {})
              } else if (endpoint === 'search') {
                result = await apiService.searchContexts(params?.query || '', params || {})
              } else if (endpoint === 'analytics') {
                result = await apiService.getAnalytics(params || {})
              } else {
                throw new Error(`Unknown GET endpoint: ${endpoint}`)
              }
              break
              
            case 'POST':
              if (endpoint === 'contexts') {
                result = await apiService.createContext(data)
              } else {
                throw new Error(`Unknown POST endpoint: ${endpoint}`)
              }
              break
              
            default:
              throw new Error(`Unsupported method: ${method}`)
          }
          
          sendResponse({ success: true, data: result })
        } catch (error) {
          sendResponse({ success: false, error: error.message })
        }
        return
      }

      default:
        return;
    }
  })();
  return true; // keep the message channel open for async sendResponse
});