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
let lastUserMessage = '';
let isMonitoring = false;

function startConversationMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  console.log('[Velto] 🎯 Started monitoring Claude conversations');

  // Monitor user input
  monitorUserInput();
  
  // Monitor AI responses
  monitorAIResponses();
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
  inputElement.addEventListener('input', onInput);
  inputElement.addEventListener('compositionend', onInput);

  // Listen for Enter key
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const message = getValue() || '';
      if (message.trim() && message !== lastUserMessage) {
        lastUserMessage = message.trim();
        console.log('[Velto] 👤 USER INPUT:', lastUserMessage);
      }
    }
  });

  // Monitor send button clicks by watching for form submissions
  const form = inputElement.closest('form') || inputElement.closest('[role="form"]');
  if (form) {
    form.addEventListener('submit', () => {
      const message = getValue() || '';
      if (message.trim() && message !== lastUserMessage) {
        lastUserMessage = message.trim();
        console.log('[Velto] 👤 USER INPUT:', lastUserMessage);
      }
    });
  }

  // Also monitor for button clicks near the input
  const sendButton = document.querySelector('[data-testid="send-button"], button[type="submit"]');
  if (sendButton) {
    sendButton.addEventListener('click', () => {
      setTimeout(() => {
        const message = getValue() || '';
        if (message.trim() && message !== lastUserMessage) {
          lastUserMessage = message.trim();
          console.log('[Velto] 👤 USER INPUT:', lastUserMessage);
        }
      }, 100);
    });
  }
}

function monitorAIResponses() {
  const responseObserver = new MutationObserver((mutations) => {
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

  responseObserver.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    console.log('[Velto] ▶️ Capture clicked: enabling Claude monitoring');
    startConversationMonitoring();
    handleCapture();
  }
});