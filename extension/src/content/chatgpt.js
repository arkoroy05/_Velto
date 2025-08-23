import { MSG } from '../lib/constants.js';
import grad from '../assets/grad.jpg';

console.log('[Velto] ChatGPT content script loaded');

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
  md = md.split(/\n{2,}/).map(p => `<p style="margin:8px 0; line-height:1.6; color:#e5e7eb;">${p.replace(/\n/g, '<br/>')}</p>`).join('');

  // Restore code blocks
  md = md.replace(/§§CODEBLOCK_(\d+)§§/g, (_, i) => codeBlocks[Number(i)] || '');

  return md;
}

function getSelectedText() {
  const sel = window.getSelection?.();
  const text = sel ? sel.toString() : '';
  return text?.trim() || '';
}

// Fallback: get text from active ChatGPT input when nothing is selected
function getActiveInputText() {
  const inputSelector = [
    'textarea[data-testid="prompt-textarea"]',
    '[data-testid="prompt-textarea"]',
    'div[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"][data-testid]',
    'main textarea',
    'form textarea',
    'footer textarea'
  ].join(', ');

  const active = document.activeElement;
  const isMatch = (el) => el && el.matches?.(inputSelector);
  const getVal = (el) => (typeof el?.value === 'string' ? el.value : (el?.innerText || el?.textContent || ''));

  if (isMatch(active)) {
    const v = getVal(active).trim();
    if (v) return v;
  }

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
      title: 'ChatGPT selection',
      url: location.href,
      host: location.host,
      tool: 'ChatGPT',
    },
  }, (res) => {
    if (res?.ok) console.log('[Velto] snippet saved', res);
    else console.warn('[Velto] failed to save snippet', res);
  });
}

// Enhanced conversation monitoring
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
  if (isMonitoring) return;
  isMonitoring = true;
  console.log('[Velto] 🎯 Started monitoring ChatGPT conversations');
  
  // Reset conversation context
  conversationContext = {
    conversationTurns: [],
    sessionId: Date.now().toString(36),
    startTime: Date.now(),
    currentPrompt: '',
    waitingForResponse: false
  };

  // Monitor user input
  monitorUserInput();
  
  // Monitor AI responses
  monitorAIResponses();
}

function stopConversationMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  console.log('[Velto] ⏹️ Stopped monitoring ChatGPT conversations');

  // Save final conversation context if we have content
  if (conversationContext.conversationTurns.length > 0) {
    saveConversationContext();
  }

  try { inputObserver?.disconnect(); } catch (_) {}
  try { responseObserver?.disconnect(); } catch (_) {}
  inputObserver = null;
  responseObserver = null;

  const inputs = document.querySelectorAll('[data-velto-monitored="true"], textarea[data-testid="prompt-textarea"], [data-testid="prompt-textarea"], [data-id="root"] textarea, div[role="textbox"][contenteditable="true"], [contenteditable="true"][data-testid], main textarea, form textarea, footer textarea');
  inputs.forEach((el) => {
    try {
      if (el._veltoOnInput) el.removeEventListener('input', el._veltoOnInput);
      if (el._veltoOnCompositionEnd) el.removeEventListener('compositionend', el._veltoOnCompositionEnd);
      if (el._veltoOnKeydown) el.removeEventListener('keydown', el._veltoOnKeydown);
      if (el._veltoTypingTimer) clearTimeout(el._veltoTypingTimer);
      if (el._veltoForm && el._veltoOnFormSubmit) el._veltoForm.removeEventListener('submit', el._veltoOnFormSubmit);
      if (el._veltoSendButton && el._veltoOnSendClick) el._veltoSendButton.removeEventListener('click', el._veltoOnSendClick);
      delete el.dataset.veltoMonitored;
      delete el._veltoOnInput;
      delete el._veltoOnCompositionEnd;
      delete el._veltoOnKeydown;
      delete el._veltoTypingTimer;
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
    title: `ChatGPT Conversation - ${new Date().toLocaleString()}`,
    content: buildConversationContent(),
    type: 'conversation',
    source: {
      type: 'manual',
      agentId: 'ChatGPT',
      sessionId: conversationContext.sessionId,
      timestamp: new Date()
    },
    metadata: {
      url: location.href,
      host: location.href,
      tool: 'ChatGPT',
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
    content += '# ChatGPT Conversation\n\n';
    
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
  // Watch for the main input textarea
  const inputSelector = [
    'textarea[data-testid="prompt-textarea"]',
    '[data-testid="prompt-textarea"]',
    '[data-id="root"] textarea',
    'div[role="textbox"][contenteditable="true"]',
    '[contenteditable="true"][data-testid]',
    'main textarea',
    'form textarea',
    'footer textarea'
  ].join(', ');
  
  // Set up mutation observer to catch dynamically created textareas
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const textareas = node.matches?.(inputSelector) ? [node] : 
                           node.querySelectorAll?.(inputSelector) || [];
          textareas.forEach(setupInputListener);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  inputObserver = observer;

  // Setup listeners for existing textareas
  document.querySelectorAll(inputSelector).forEach(setupInputListener);
}

function setupInputListener(textarea) {
  if (textarea.dataset.veltoMonitored) return;
  textarea.dataset.veltoMonitored = 'true';

  // Live typing logging (debounced)
  const getValue = () => (typeof textarea.value === 'string' ? textarea.value : (textarea.innerText || ''));
  const logTyping = () => {
    const message = getValue();
    if (message && message.trim() && message.trim() !== textarea.dataset.veltoLastTyped) {
      textarea.dataset.veltoLastTyped = message.trim();
      console.log('[Velto] 👤 USER TYPING:', textarea.dataset.veltoLastTyped);
    }
  };
  const onInput = () => {
    clearTimeout(textarea._veltoTypingTimer);
    textarea._veltoTypingTimer = setTimeout(logTyping, 500);
  };
  textarea._veltoOnInput = onInput;
  textarea._veltoOnCompositionEnd = onInput;
  textarea.addEventListener('input', textarea._veltoOnInput);
  textarea.addEventListener('compositionend', textarea._veltoOnCompositionEnd);

  // Listen for Enter key or send button clicks
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
        
        // Search for context suggestions
        searchContextSuggestions(message.trim());
      }
    }
  };
  textarea._veltoOnKeydown = onKeydown;
  textarea.addEventListener('keydown', textarea._veltoOnKeydown);

  // Also monitor explicit send button clicks near the input
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
          
          // Search for context suggestions
          searchContextSuggestions(message.trim());
        }
      }, 100);
    };
    textarea._veltoSendButton = sendButton;
    textarea._veltoOnSendClick = onSendClick;
    sendButton.addEventListener('click', textarea._veltoOnSendClick);
  }

    // Monitor form submissions
    const form = textarea.closest('form');
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
          
          // Search for context suggestions
          searchContextSuggestions(message.trim());
        }
      };
      textarea._veltoForm = form;
      textarea._veltoOnFormSubmit = onFormSubmit;
      form.addEventListener('submit', textarea._veltoOnFormSubmit);
    }
}

function monitorAIResponses() {
  const respObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Look for ChatGPT response containers
          const responseSelectors = [
            '[data-message-author-role="assistant"]',
            '.group.w-full.text-gray-800',
            '[class*="assistant"]',
            '.markdown.prose'
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
                    console.log('[Velto] 🤖 CHATGPT RESPONSE:', responseText.trim());
                    
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
        }
      });
    });
  });

  respObserver.observe(document.body, { childList: true, subtree: true });
  responseObserver = respObserver;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    console.log('[Velto] ▶️ Capture clicked: enabling ChatGPT monitoring');
    startConversationMonitoring();
    handleCapture();
  } else if (msg?.type === MSG.CAPTURE_STOP) {
    console.log('[Velto] ⏹️ End capture requested');
    stopConversationMonitoring();
  } else if (msg?.type === MSG.FLUSH_CONTEXT) {
    // Flush accumulated conversation context on tab/nav change
    try {
      if (conversationContext?.conversationTurns?.length > 0) {
        console.log('[Velto] 🔄 FLUSH_CONTEXT received; saving ChatGPT conversation context');
        saveConversationContext();
      }
    } catch (_) {}
  } else if (msg?.type === MSG.CAPTURE_STATE_GET) {
    sendResponse?.({ monitoring: isMonitoring });
    return true;
  }
});

// Auto-start conversation monitoring when page loads
console.log('[Velto] 🚀 Auto-starting ChatGPT conversation monitoring...');
setTimeout(() => {
  startConversationMonitoring();
}, 2000); // Wait 2 seconds for page to fully load

// Context suggestion functionality
async function searchContextSuggestions(userPrompt) {
  try {
    console.log('[Velto] 🔍 Searching for context suggestions for:', userPrompt);
    
    // Get selected project
    const projectSelection = await chrome.storage.local.get(['velto_selected_project']);
    const projectId = projectSelection?.velto_selected_project || 'inbox';
    
    // Search contexts using the search API
    const response = await fetch(`https://velto.onrender.com/api/v1/search?q=${encodeURIComponent(userPrompt)}&userId=689e5a217224da39efe7a47f&projectId=${projectId}&limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': '689e5a217224da39efe7a47f'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const suggestions = data.data?.contexts || data.data || [];
      
      if (suggestions.length > 0) {
        console.log('[Velto] ✅ Found context suggestions:', suggestions.length);
        showContextSuggestionPopup(userPrompt, suggestions);
      } else {
        console.log('[Velto] ℹ️ No context suggestions found');
      }
    } else {
      console.warn('[Velto] ❌ Failed to search contexts:', response.status);
    }
  } catch (error) {
    console.error('[Velto] ❌ Context suggestion search error:', error);
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
    
    // Call the prompt version API
    const response = await fetch(`https://velto.onrender.com/api/v1/contexts/${contextId}/prompt-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': '689e5a217224da39efe7a47f'
      },
      body: JSON.stringify({
        userId: '689e5a217224da39efe7a47f',
        userPrompt: userPrompt
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const promptVersion = data.data?.promptVersion || data.data?.content || 'No prompt version generated';
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
  const inputSelector = 'textarea[data-testid="prompt-textarea"], [data-testid="prompt-textarea"], [data-id="root"] textarea, div[role="textbox"][contenteditable="true"], [contenteditable="true"][data-testid], main textarea, form textarea, footer textarea';
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