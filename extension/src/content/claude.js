import { MSG } from '../lib/constants.js';
import grad from '../assets/grad.jpg';

console.log('[Velto] Claude content script loaded');

// --- Lightweight Markdown renderer for popup content ---
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(md) {
  if (!md) return '';
  // Preserve code fences first
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, (m, p1) => {
    codeBlocks.push(`<pre style="background: rgba(17,24,39,0.7); border:1px solid #374151; padding:12px; border-radius:8px; overflow:auto; color:#e5e7eb;"><code>${escapeHtml(p1.trim())}</code></pre>`);
    return `§§CODEBLOCK_${codeBlocks.length - 1}§§`;
  });

  // Escape everything else
  md = escapeHtml(md);

  // Headings
  md = md.replace(/^######\s?(.*)$/gm, '<h6 style="margin:8px 0; font-size:12px; color:#d1d5db;">$1</h6>')
         .replace(/^#####\s?(.*)$/gm, '<h5 style="margin:8px 0; font-size:13px; color:#e5e7eb;">$1</h5>')
         .replace(/^####\s?(.*)$/gm, '<h4 style="margin:10px 0; font-size:14px; color:#fff; font-weight:600;">$1</h4>')
         .replace(/^###\s?(.*)$/gm, '<h3 style="margin:12px 0; font-size:15px; color:#fff; font-weight:600;">$1</h3>')
         .replace(/^##\s?(.*)$/gm, '<h2 style="margin:14px 0; font-size:16px; color:#fff; font-weight:700;">$1</h2>')
         .replace(/^#\s?(.*)$/gm, '<h1 style="margin:16px 0; font-size:18px; color:#fff; font-weight:700;">$1</h1>');

  // Bold, italics, inline code
  md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.*?)\*/g, '<em>$1</em>')
         .replace(/`([^`]+)`/g, '<code style="background: rgba(17,24,39,0.7); border:1px solid #374151; padding:2px 6px; border-radius:4px; color:#e5e7eb;">$1</code>');

  // Lists
  md = md.replace(/^(\s*)-\s+(.*)$/gm, '$1• $2');

  // Newlines to paragraphs
  md = md.split(/\n{2,}/).map(p => `<p style=\"margin:8px 0; line-height:1.6; color:#e5e7eb;\">${p.replace(/\n/g, '<br/>')}</p>`).join('');

  // Restore code blocks
  md = md.replace(/§§CODEBLOCK_(\d+)§§/g, (_, i) => codeBlocks[Number(i)] || '');

  return md;
}

function getSelectedText() {
  const sel = window.getSelection?.();
  const text = sel ? sel.toString() : '';
  return text?.trim() || '';
}

// Fallback: get text from active Claude input when nothing is selected
function getActiveInputText() {
  const inputSelector = [
    '[data-testid="chat-input"]',
    '.ProseMirror',
    '[contenteditable="true"]:not([data-testid="chat-output"])',
    'textarea',
  ].join(', ');

  // Prefer focused element if it matches
  const active = document.activeElement;
  const isMatch = (el) => el && (el.matches?.(inputSelector));
  const getVal = (el) => (typeof el?.value === 'string' ? el.value : (el?.innerText || el?.textContent || ''));

  if (isMatch(active)) {
    const v = getVal(active).trim();
    if (v) return v;
  }

  // Otherwise, find the first input-like element with content
  const candidates = Array.from(document.querySelectorAll(inputSelector));
  for (const el of candidates) {
    const v = getVal(el).trim();
    if (v) return v;
  }
  return '';
}

async function handleCapture() {
  const content = getSelectedText() || getActiveInputText();
  if (!content) {
    console.log('[Velto] No selection to capture');
    return;
  }
  chrome.runtime.sendMessage({
    type: MSG.CONTEXTS_CREATE,
    payload: {
      content,
      title: 'Claude selection',
      url: location.href,
      host: location.host,
      tool: 'Claude',
    },
  }, (res) => {
    if (res?.ok) console.log('[Velto] snippet saved', res);
    else console.warn('[Velto] failed to save snippet', res);
  });
}

// Enhanced conversation monitoring for Claude
let isMonitoring = false;
let inputObserver = null;
let responseObserver = null;
let conversationContext = {
  conversationTurns: [], // Array of {prompt: string, response: string, timestamp: number}
  sessionId: Date.now().toString(36),
  startTime: Date.now(),
  currentPrompt: '', // Track current prompt being typed
  waitingForResponse: false // Track if we're waiting for AI response
};

function startConversationMonitoring() {
  if (conversationContext.isMonitoring) {
    console.log('[Velto] 🔄 Conversation monitoring already active');
    return;
  }

  console.log('[Velto] 🚀 Starting conversation monitoring...');
  
  // Initialize conversation context
  conversationContext = {
    isMonitoring: true,
    conversationTurns: [],
    currentPrompt: '',
    waitingForResponse: false,
    startTime: new Date()
  };

  // Fetch all contexts for local fallback search
  fetchAllContexts();

  // Set up monitoring
  setupInputMonitoring();
  setupResponseMonitoring();
  
  console.log('[Velto] ✅ Conversation monitoring started');
}

// Set up input monitoring
function setupInputMonitoring() {
  // Monitor user input
  monitorUserInput();
}

// Set up response monitoring
function setupResponseMonitoring() {
  // Monitor AI responses
  monitorAIResponses();
}

function stopConversationMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  console.log('[Velto] ⏹️ Stopped monitoring Claude conversations');

  // Save final conversation context if we have content
  if (conversationContext.conversationTurns.length > 0) {
    saveConversationContext();
  }

  try { inputObserver?.disconnect(); } catch (_) {}
  try { responseObserver?.disconnect(); } catch (_) {}
  inputObserver = null;
  responseObserver = null;

  const inputs = document.querySelectorAll('[data-velto-monitored="true"], [data-testid="chat-input"], .ProseMirror, [contenteditable="true"]:not([data-testid="chat-output"]), textarea');
  inputs.forEach((el) => {
    try {
      if (el._veltoOnInput) el.removeEventListener('input', el._veltoOnInput);
      if (el._veltoOnCompositionEnd) el.removeEventListener('compositionend', el._veltoOnCompositionEnd);
      if (el._veltoOnKeydown) el.removeEventListener('keydown', el._veltoOnKeydown);
      if (el._veltoTypingTimer) clearTimeout(el._veltoTypingTimer);
      if (el._veltoContextSearchTimer) clearTimeout(el._veltoContextSearchTimer);
      if (el._veltoForm && el._veltoOnFormSubmit) el._veltoForm.removeEventListener('submit', el._veltoOnFormSubmit);
      if (el._veltoSendButton && el._veltoOnSendClick) el._veltoSendButton.removeEventListener('click', el._veltoOnSendClick);
      delete el.dataset.veltoMonitored;
      delete el._veltoOnInput;
      delete el._veltoOnCompositionEnd;
      delete el._veltoOnKeydown;
      delete el._veltoTypingTimer;
      delete el._veltoContextSearchTimer;
      delete el._veltoForm;
      delete el._veltoOnFormSubmit;
      delete el._veltoSendButton;
      delete el._veltoOnSendClick;
    } catch (_) {}
  });
}

function saveConversationContext() {
  if (conversationContext.conversationTurns.length === 0) {
    return;
  }

  // Create a comprehensive conversation context
  const conversationData = {
    title: `Claude Conversation - ${new Date().toLocaleString()}`,
    content: buildConversationContent(),
    type: 'conversation',
    source: {
      type: 'claude',
      agentId: 'Claude',
      sessionId: conversationContext.sessionId,
      timestamp: new Date()
    },
    metadata: {
      url: location.href,
      host: location.href,
      tool: 'Claude',
      turnCount: conversationContext.conversationTurns.length,
      sessionDuration: Date.now() - conversationContext.startTime
    },
    conversation: {
      conversationTurns: conversationContext.conversationTurns,
      sessionId: conversationContext.sessionId,
      startTime: conversationContext.startTime,
      endTime: Date.now()
    }
  };

  // Send to background for storage
  console.log('[Velto] 📤 Sending conversation context to background:', conversationData);
  
  chrome.runtime.sendMessage({
    type: MSG.CONTEXTS_CREATE,
    payload: conversationData,
  }, (res) => {
    console.log('[Velto] 📥 Response from background:', res);
    if (res?.ok) {
      console.log('[Velto] ✅ Conversation context saved:', res);
      // Reset conversation context
      conversationContext = {
        conversationTurns: [],
        sessionId: Date.now().toString(36),
        startTime: Date.now(),
        currentPrompt: '',
        waitingForResponse: false
      };
    } else {
      console.warn('[Velto] ❌ Failed to save conversation context:', res);
    }
  });
}

function buildConversationContent() {
  let content = '';
  
  // Build structured conversation with prompt-response pairs
  if (conversationContext.conversationTurns.length > 0) {
    content += '# Claude Conversation\n\n';
    
    conversationContext.conversationTurns.forEach((turn, index) => {
      content += `## Turn ${index + 1}\n\n`;
      content += `**User Prompt:**\n${turn.prompt}\n\n`;
      content += `**AI Response:**\n${turn.response}\n\n`;
      content += `**Timestamp:** ${new Date(turn.timestamp).toLocaleString()}\n\n`;
      content += `---\n\n`; // Separator between turns
    });
  }
  
  return content.trim();
}

function monitorUserInput() {
  // Watch for Claude's input areas
  const inputSelector = '[data-testid="chat-input"], .ProseMirror, [contenteditable="true"]:not([data-testid="chat-output"]), textarea';
  
  // Set up mutation observer to catch dynamically created inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const inputs = node.matches?.(inputSelector) ? [node] : 
                        node.querySelectorAll?.(inputSelector) || [];
          inputs.forEach(setupInputListener);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  inputObserver = observer;

  // Setup listeners for existing inputs
  document.querySelectorAll(inputSelector).forEach(setupInputListener);
}

function setupInputListener(inputElement) {
  if (inputElement.dataset.veltoMonitored) return;
  inputElement.dataset.veltoMonitored = 'true';

  // Live typing logging (debounced)
  const getValue = () => (typeof inputElement.value === 'string' ? inputElement.value : (inputElement.innerText || ''));
  const logTyping = () => {
    const message = getValue();
    if (message && message.trim() && message.trim() !== inputElement.dataset.veltoLastTyped) {
      inputElement.dataset.veltoLastTyped = message.trim();
      console.log('[Velto] 👤 USER TYPING:', inputElement.dataset.veltoLastTyped);
      
      // Search for context suggestions in real-time (debounced)
      if (message.trim().length > 3) { // Only search if message is longer than 3 characters
        clearTimeout(inputElement._veltoContextSearchTimer);
        inputElement._veltoContextSearchTimer = setTimeout(() => {
          searchContextSuggestions(message.trim());
        }, 800); // 800ms debounce to avoid too many API calls
      }
    }
  };
  const onInput = () => {
    clearTimeout(inputElement._veltoTypingTimer);
    inputElement._veltoTypingTimer = setTimeout(logTyping, 500);
  };
  inputElement._veltoOnInput = onInput;
  inputElement._veltoOnCompositionEnd = onInput;
  inputElement.addEventListener('input', inputElement._veltoOnInput);
  inputElement.addEventListener('compositionend', inputElement._veltoOnCompositionEnd);

  // Listen for Enter key
  const onKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const message = getValue() || '';
      if (message.trim()) {
        console.log('[Velto] 👤 USER INPUT:', message.trim());
        
        // Add to conversation context - always add new prompts
        conversationContext.conversationTurns.push({
          prompt: message.trim(),
          response: '', // Will be filled by AI response observer
          timestamp: Date.now()
        });
        
        // Update current prompt for reference
        conversationContext.currentPrompt = message.trim();
        console.log('[Velto] ✅ Added prompt to conversation. Total turns:', conversationContext.conversationTurns.length);
        
        // Set a flag to indicate we're waiting for a response
        conversationContext.waitingForResponse = true;
        
        // Clear any pending context search
        if (inputElement._veltoContextSearchTimer) {
          clearTimeout(inputElement._veltoContextSearchTimer);
        }
        
        // Search for context suggestions
        searchContextSuggestions(message.trim());
      }
    }
  };
  inputElement._veltoOnKeydown = onKeydown;
  inputElement.addEventListener('keydown', inputElement._veltoOnKeydown);

  // Monitor send button clicks by watching for form submissions
  const form = inputElement.closest('form') || inputElement.closest('[role="form"]');
  if (form) {
    const onFormSubmit = () => {
      const message = getValue() || '';
      if (message.trim()) {
        console.log('[Velto] 👤 USER INPUT (form):', message.trim());
        
        // Add to conversation context - always add new prompts
        conversationContext.conversationTurns.push({
          prompt: message.trim(),
          response: '', // Will be filled by AI response observer
          timestamp: Date.now()
        });
        
        // Update current prompt for reference
        conversationContext.currentPrompt = message.trim();
        console.log('[Velto] ✅ Added prompt to conversation (form). Total turns:', conversationContext.conversationTurns.length);
        
        // Set a flag to indicate we're waiting for a response
        conversationContext.waitingForResponse = true;
        
        // Clear any pending context search
        if (inputElement._veltoContextSearchTimer) {
          clearTimeout(inputElement._veltoContextSearchTimer);
        }
        
        // Search for context suggestions
        searchContextSuggestions(message.trim());
      }
    };
    inputElement._veltoForm = form;
    inputElement._veltoOnFormSubmit = onFormSubmit;
    form.addEventListener('submit', inputElement._veltoOnFormSubmit);
  }

  // Also monitor for button clicks near the input
  const sendButton = document.querySelector('[data-testid="send-button"], button[type="submit"]');
  if (sendButton) {
    const onSendClick = () => {
      setTimeout(() => {
        const message = getValue() || '';
        if (message.trim()) {
          console.log('[Velto] 👤 USER INPUT (button):', message.trim());
          
          // Add to conversation context - always add new prompts
          conversationContext.conversationTurns.push({
            prompt: message.trim(),
            response: '', // Will be filled by AI response observer
            timestamp: Date.now()
          });
          
          // Update current prompt for reference
          conversationContext.currentPrompt = message.trim();
          console.log('[Velto] ✅ Added prompt to conversation (button). Total turns:', conversationContext.conversationTurns.length);
          
          // Set a flag to indicate we're waiting for a response
          conversationContext.waitingForResponse = true;
          
          // Clear any pending context search
          if (inputElement._veltoContextSearchTimer) {
            clearTimeout(inputElement._veltoContextSearchTimer);
          }
          
          // Search for context suggestions
          searchContextSuggestions(message.trim());
        }
      }, 100);
    };
    inputElement._veltoSendButton = sendButton;
    inputElement._veltoOnSendClick = onSendClick;
    sendButton.addEventListener('click', inputElement._veltoOnSendClick);
  }
}

function monitorAIResponses() {
  const respObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Look for Claude response containers
          const responseSelectors = [
            '[data-testid="chat-output"]',
            '[data-is-streaming="true"]',
            '[data-is-streaming="false"]',
            '.font-claude-message',
            '[class*="assistant"]',
            '[role="assistant"]'
          ];

          responseSelectors.forEach(selector => {
            const responses = node.matches?.(selector) ? [node] : 
                             node.querySelectorAll?.(selector) || [];
            
            responses.forEach((responseElement) => {
              if (!responseElement.dataset.veltoProcessed) {
                responseElement.dataset.veltoProcessed = 'true';
                
                // Wait a bit for the content to fully load
                setTimeout(() => {
                  const responseText = responseElement.innerText || responseElement.textContent || '';
                  if (responseText.trim()) {
                    console.log('[Velto] 🤖 CLAUDE RESPONSE:', responseText.trim());
                    
                    // Map response to the latest prompt
                    if (conversationContext.conversationTurns.length > 0) {
                      const latestTurn = conversationContext.conversationTurns[conversationContext.conversationTurns.length - 1];
                      if (latestTurn && !latestTurn.response) {
                        latestTurn.response = responseText.trim();
                        conversationContext.waitingForResponse = false; // Reset the flag
                        console.log('[Velto] ✅ Mapped response to prompt:', latestTurn.prompt.substring(0, 50) + '...');
                      } else {
                        // If the latest turn already has a response, look for an earlier one without response
                        let turnToUpdate = null;
                        for (let i = conversationContext.conversationTurns.length - 1; i >= 0; i--) {
                          if (!conversationContext.conversationTurns[i].response) {
                            turnToUpdate = conversationContext.conversationTurns[i];
                            break;
                          }
                        }
                        
                        if (turnToUpdate) {
                          turnToUpdate.response = responseText.trim();
                          conversationContext.waitingForResponse = false; // Reset the flag
                          console.log('[Velto] ✅ Mapped response to earlier prompt:', turnToUpdate.prompt.substring(0, 50) + '...');
                        } else {
                          // If no prompt found, create a new turn with empty prompt
                          conversationContext.conversationTurns.push({
                            prompt: '[Previous conversation]',
                            response: responseText.trim(),
                            timestamp: Date.now()
                          });
                          console.log('[Velto] ⚠️ No prompt found, created turn with empty prompt');
                        }
                      }
                    } else {
                      // If no turns exist yet, create first turn
                      conversationContext.conversationTurns.push({
                        prompt: '[Initial conversation]',
                        response: responseText.trim(),
                        timestamp: Date.now()
                      });
                      console.log('[Velto] 🆕 Created first turn with response');
                    }
                  }
                }, 1000);
              }
            });
          });

          // Also check for streaming responses that update incrementally
          if (node.dataset?.isStreaming === 'true' || node.classList?.contains('streaming')) {
            const observer = new MutationObserver(() => {
                const responseText = node.innerText || node.textContent || '';
              if (responseText.trim()) {
                console.log('[Velto] 🤖 CLAUDE RESPONSE (streaming):', responseText.trim());
              }
            });
            
            observer.observe(node, { childList: true, subtree: true, characterData: true });
            
            // Stop observing after the streaming ends
            setTimeout(() => observer.disconnect(), 30000);
          }
        }
      });
    });
  });

  respObserver.observe(document.body, { childList: true, subtree: true });
  responseObserver = respObserver;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    console.log('[Velto] ▶️ Capture clicked: enabling Claude monitoring');
    startConversationMonitoring();
    handleCapture();
  } else if (msg?.type === MSG.CAPTURE_STOP) {
    console.log('[Velto] ⏹️ End capture requested');
    stopConversationMonitoring();
  } else if (msg?.type === MSG.FLUSH_CONTEXT) {
    // Flush accumulated conversation context on tab/nav change
    try {
      if (conversationContext?.conversationTurns?.length > 0) {
        console.log('[Velto] 🔄 FLUSH_CONTEXT received; saving Claude conversation context');
        saveConversationContext();
      }
    } catch (_) {}
  } else if (msg?.type === MSG.CAPTURE_STATE_GET) {
    sendResponse?.({ monitoring: isMonitoring });
    return true;
  }
});

// Auto-start conversation monitoring when page loads
console.log('[Velto] 🚀 Auto-starting Claude conversation monitoring...');
setTimeout(() => {
  startConversationMonitoring();
}, 2000); // Wait 2 seconds for page to fully load

// Context suggestion functionality with fallback
let allContexts = []; // Store all contexts locally as fallback

async function searchContextSuggestions(userPrompt) {
  try {
    console.log('[Velto] 🔍 Searching for context suggestions for:', userPrompt);
    
    // Get selected project
    const projectSelection = await chrome.storage.local.get(['velto_selected_project']);
    const projectId = projectSelection?.velto_selected_project || 'inbox';
    
    // Try the backend search first
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONTEXT_SUGGESTION_REQUEST',
        payload: {
          userPrompt: userPrompt,
          projectId: projectId
        }
      });
      
      if (response?.ok && response.suggestions && response.suggestions.length > 0) {
        console.log('[Velto] ✅ Backend search successful:', response.suggestions.length);
        showContextSuggestionPopup(userPrompt, response.suggestions);
        return;
      }
    } catch (backendError) {
      console.warn('[Velto] Backend search failed, using fallback:', backendError);
    }
    
    // Fallback: Search through locally stored contexts
    console.log('[Velto] 🔄 Using fallback search through local contexts');
    const localSuggestions = await searchLocalContexts(userPrompt, projectId);
    
    if (localSuggestions.length > 0) {
      console.log('[Velto] ✅ Local search found suggestions:', localSuggestions.length);
      showContextSuggestionPopup(userPrompt, localSuggestions);
    } else {
      console.log('[Velto] ℹ️ No context suggestions found');
    }
  } catch (error) {
    console.error('[Velto] ❌ Context suggestion search error:', error);
  }
}

// Fallback: Search through locally stored contexts
async function searchLocalContexts(userPrompt, projectId) {
  if (allContexts.length === 0) {
    console.log('[Velto] ℹ️ No local contexts available, fetching from backend...');
    await fetchAllContexts();
  }
  
  if (allContexts.length === 0) {
    return [];
  }
  
  // Filter contexts by project if specified
  let filteredContexts = allContexts;
  if (projectId && projectId !== 'inbox') {
    filteredContexts = allContexts.filter(ctx => ctx.projectId === projectId);
  }
  
  // Simple text search through local contexts
  const query = userPrompt.toLowerCase();
  const suggestions = filteredContexts
    .filter(ctx => {
      const title = (ctx.title || '').toLowerCase();
      const content = (ctx.content || '').toLowerCase();
      const tags = (ctx.tags || []).map(tag => tag.toLowerCase());
      
      return title.includes(query) || 
             content.includes(query) || 
             tags.some(tag => tag.includes(query));
    })
    .sort((a, b) => {
      // Simple relevance scoring
      const aScore = calculateRelevanceScore(a, query);
      const bScore = calculateRelevanceScore(b, query);
      return bScore - aScore;
    })
    .slice(0, 5); // Limit to top 5
  
  return suggestions;
}

// Calculate simple relevance score for local search
function calculateRelevanceScore(context, query) {
  let score = 0;
  const title = (context.title || '').toLowerCase();
  const content = (context.content || '').toLowerCase();
  const tags = (context.tags || []).map(tag => tag.toLowerCase());
  
  // Title matches get highest score
  if (title.includes(query)) score += 10;
  
  // Content matches get medium score
  if (content.includes(query)) score += 5;
  
  // Tag matches get lower score
  tags.forEach(tag => {
    if (tag.includes(query)) score += 2;
  });
  
  return score;
}

// Fetch all contexts from backend for local fallback
async function fetchAllContexts() {
  try {
    console.log('[Velto] 📥 Fetching all contexts for local fallback...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_ALL_CONTEXTS',
      payload: {}
    });
    
    if (response?.ok && response.contexts) {
      allContexts = response.contexts;
      console.log(`[Velto] ✅ Fetched ${allContexts.length} contexts for local fallback`);
    } else {
      console.warn('[Velto] Failed to fetch contexts for fallback:', response?.error);
    }
  } catch (error) {
    console.error('[Velto] Error fetching contexts for fallback:', error);
  }
}

function showContextSuggestionPopup(userPrompt, suggestions) {
  // Close any existing popup first
  const existingPopup = document.getElementById('velto-context-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup container
  const popup = document.createElement('div');
  popup.id = 'velto-context-popup';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    max-height: 600px;
    color: #e5e7eb;
    background: #1a1f3a url(${grad}) center/cover no-repeat;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    border: 1px solid #374151;
  `;
  
  // Create popup content
  popup.innerHTML = `
    <div style="padding: 12px 16px; border-bottom: 1px solid #374151; background: rgba(31,41,55,0.5); display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span aria-label="Velto" style="color:#fff; font-family: 'Playfair Display', 'Edu AU VIC WA NT Hand', serif; font-weight:724; font-size: 20px;">Velto</span>
        <span style="font-size: 12px; color:#d1d5db;">Context Suggestions</span>
      </div>
      <button id="velto-popup-close" style="background: none; border: none; color: #d1d5db; cursor: pointer; font-size: 18px; padding:4px; border-radius:6px;" onmouseover="this.style.backgroundColor='#374151'" onmouseout="this.style.backgroundColor='transparent'">×</button>
    </div>
    
    <div style="padding: 16px; max-height: 520px; overflow-y: auto;">
      <div style="background: rgba(31,41,55,0.5); border:1px solid #374151; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #d1d5db;">Your prompt:</p>
        <div id="velto-user-prompt" style="margin: 0;">${renderMarkdown(userPrompt)}</div>
      </div>
      
      <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #ffffff;">Relevant Contexts:</h4>
      
      <div id="velto-suggestions-list" style="">
        ${suggestions.map((context, index) => `
          <div class="velto-suggestion-item" data-context-id="${context._id || context.id || index}" style="
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 8px;
            background: rgba(31,41,55,0.5);
          " onmouseover="this.style.borderColor='rgba(99,102,241,0.3)'; this.style.boxShadow='0 0 20px rgba(99,102,241,0.3)';" onmouseout="this.style.borderColor='#374151'; this.style.boxShadow='none';">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="flex: 1;">
                <h5 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 500; color: #ffffff;">
                  ${context.title || 'Untitled Context'}
                </h5>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #d1d5db; line-height: 1.4;">
                  ${context.summary || context.content?.substring(0, 100) || 'No summary available'}
                </p>
                <div style="display: flex; gap: 6px;">
                  <span style="font-size: 10px; background: rgba(31,41,55,0.7); border:1px solid #374151; color: #d1d5db; padding: 2px 6px; border-radius: 4px;">
                    ${context.type || 'conversation'}
                  </span>
                  ${context.source?.type ? `
                    <span style="font-size: 10px; color: #6366f1; background: rgba(99,102,241,0.2); border:1px solid rgba(99,102,241,0.3); padding: 2px 6px; border-radius: 4px;">
                      ${context.source.type}
                    </span>
                  ` : ''}
                </div>
              </div>
              <div style="color: #9ca3af; font-size: 12px;">→</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div id="velto-prompt-version" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid #374151;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #ffffff;">Generated Prompt:</h4>
        <div id="velto-prompt-content" style="
          background: rgba(31,41,55,0.5);
          border:1px solid #374151;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
          line-height: 1.5;
          color: #e5e7eb;
          white-space: pre-wrap;
        "></div>
        
        <div style="display: flex; gap: 8px;">
          <button id="velto-insert-btn" style="
            flex: 1;
            background: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#4338ca';" onmouseout="this.style.backgroundColor='#4f46e5';">
            Insert into AI
          </button>
          <button id="velto-copy-btn" style="
            padding: 8px 16px;
            border: 1px solid #374151;
            background: rgba(31,41,55,0.5);
            color: #e5e7eb;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(31,41,55,0.7)';" onmouseout="this.style.backgroundColor='rgba(31,41,55,0.5)';">
            Copy
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add popup to page
  document.body.appendChild(popup);
  
  // Add event listeners
  document.getElementById('velto-popup-close').addEventListener('click', () => {
    popup.remove();
  });
  
  // Handle suggestion item clicks
  document.querySelectorAll('.velto-suggestion-item').forEach(item => {
    item.addEventListener('click', async () => {
      const contextId = item.dataset.contextId;
      const context = suggestions.find(s => (s._id || s.id) == contextId);
      
      if (context) {
        // Generate prompt version
        await generatePromptVersion(contextId, userPrompt, popup);
      }
    });
  });
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      popup.remove();
    }
  }, 30000);
}

async function generatePromptVersion(contextId, userPrompt, popup) {
  try {
    // Show loading state
    const promptVersionDiv = document.getElementById('velto-prompt-version');
    const promptContent = document.getElementById('velto-prompt-content');
    promptContent.innerHTML = '<p style="margin:0; color:#d1d5db;"><em>Generating prompt version...</em></p>';
    promptVersionDiv.style.display = 'block';
    
    // Use chrome.runtime.sendMessage to avoid CORS issues
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_PROMPT_VERSION',
      payload: {
        contextId: contextId,
        userPrompt: userPrompt
      }
    });
    
    if (response?.success && response.data?.promptVersion) {
      const promptVersion = response.data.promptVersion;
      // Pretty render using Markdown-to-HTML
      promptContent.innerHTML = renderMarkdown(promptVersion);
      
      // Add event listeners for buttons
      document.getElementById('velto-insert-btn').addEventListener('click', () => {
        insertPromptIntoAI(promptVersion);
        popup.remove();
      });
      
      document.getElementById('velto-copy-btn').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(promptVersion);
          const btn = document.getElementById('velto-copy-btn');
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 2000);
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
        }
      });
      
    } else {
      promptContent.innerHTML = '<p style="margin:0; color:#fca5a5;">Failed to generate prompt version</p>';
    }
  } catch (error) {
    console.error('Failed to generate prompt version:', error);
    document.getElementById('velto-prompt-content').innerHTML = '<p style="margin:0; color:#fca5a5;">Error generating prompt version</p>';
  }
}

function insertPromptIntoAI(promptText) {
  // Find the input field and insert the prompt
  const inputSelector = '[data-testid="chat-input"], .ProseMirror, [contenteditable="true"]:not([data-testid="chat-output"]), textarea';
  const inputElement = document.querySelector(inputSelector);
  
  if (inputElement) {
    if (inputElement.tagName === 'TEXTAREA') {
      inputElement.value = promptText;
    } else if (inputElement.contentEditable === 'true') {
      inputElement.textContent = promptText;
    }
    
    // Trigger input event to update the UI
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('[Velto] ✅ Inserted prompt into AI input');
  } else {
    console.warn('[Velto] ❌ Could not find AI input field');
  }
}