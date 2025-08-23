import { MSG } from '../lib/constants.js';

console.log('[Velto] Cursor content script loaded');

let isMonitoring = false;

function getSelectedText() {
  const sel = window.getSelection?.();
  const text = sel ? sel.toString() : '';
  return text?.trim() || '';
}

async function handleCapture() {
  const content = getSelectedText();
  if (!content) {
    console.log('[Velto] No selection to capture');
    return;
  }
  chrome.runtime.sendMessage({
    type: MSG.CONTEXTS_CREATE,
    payload: {
      content,
      title: 'Cursor selection',
      url: location.href,
      host: location.host,
      tool: 'Cursor',
    },
  }, (res) => {
    if (res?.ok) console.log('[Velto] snippet saved', res);
    else console.warn('[Velto] failed to save snippet', res);
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    isMonitoring = true; // minimal toggle for Cursor
    handleCapture();
  } else if (msg?.type === MSG.CAPTURE_STOP) {
    isMonitoring = false;
  } else if (msg?.type === MSG.CAPTURE_STATE_GET) {
    sendResponse?.({ monitoring: isMonitoring });
    return true;
  }
});