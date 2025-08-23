import { MSG } from '../lib/constants.js';

console.log('[Velto] Claude content script loaded');

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
  if (isMonitoring) return;
  isMonitoring = true;
  console.log('[Velto] 🎯 Started monitoring Claude conversations');
  
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
      if (message.trim() && message !== conversationContext.currentPrompt) {
        conversationContext.currentPrompt = message.trim();
        console.log('[Velto] 👤 USER INPUT:', conversationContext.currentPrompt);
        
        // Add to conversation context
        conversationContext.conversationTurns.push({
          prompt: conversationContext.currentPrompt,
          response: '', // Will be filled by AI response observer
          timestamp: Date.now()
        });
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
        if (message.trim() && message !== conversationContext.currentPrompt) {
          conversationContext.currentPrompt = message.trim();
          console.log('[Velto] 👤 USER INPUT:', conversationContext.currentPrompt);
          
          // Add to conversation context
          conversationContext.conversationTurns.push({
            prompt: conversationContext.currentPrompt,
            response: '', // Will be filled by AI response observer
            timestamp: Date.now()
          });
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
                        console.log('[Velto] ✅ Mapped response to prompt:', latestTurn.prompt.substring(0, 50) + '...');
                      } else {
                        // If no prompt found, create a new turn with empty prompt
                        conversationContext.conversationTurns.push({
                          prompt: '[Previous conversation]',
                          response: responseText.trim(),
                          timestamp: Date.now()
                        });
                        console.log('[Velto] ⚠️ No prompt found, created turn with empty prompt');
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