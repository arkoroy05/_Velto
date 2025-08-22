import { MSG } from '../lib/constants.js';

console.log('[Velto] ChatGPT content script loaded');

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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    handleCapture();
  }
});