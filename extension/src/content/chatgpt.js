import { MSG } from '../lib/constants.js';

console.log('[Velto] ChatGPT content script loaded');

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
let lastUserMessage = '';
let isMonitoring = false;

function startConversationMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  console.log('[Velto] 🎯 Started monitoring ChatGPT conversations');

  // Monitor user input
  monitorUserInput();
  
  // Monitor AI responses
  monitorAIResponses();
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
  textarea.addEventListener('input', onInput);
  textarea.addEventListener('compositionend', onInput);

  // Listen for Enter key or send button clicks
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const message = getValue() || '';
      if (message.trim() && message !== lastUserMessage) {
        lastUserMessage = message.trim();
        console.log('[Velto] 👤 USER INPUT:', lastUserMessage);
      }
    }
  });

  // Also monitor send button clicks
  const form = textarea.closest('form');
  if (form) {
    form.addEventListener('submit', () => {
      const message = getValue() || '';
      if (message.trim() && message !== lastUserMessage) {
        lastUserMessage = message.trim();
        console.log('[Velto] 👤 USER INPUT:', lastUserMessage);
      }
    });
  }

  // Also monitor explicit send button clicks near the input
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
                  }
                }, 1000);
              }
            });
          });
        }
      });
    });
  });

  responseObserver.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    console.log('[Velto] ▶️ Capture clicked: enabling ChatGPT monitoring');
    startConversationMonitoring();
    handleCapture();
  }
});