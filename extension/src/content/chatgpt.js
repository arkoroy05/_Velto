import { MSG } from '../lib/constants.js';

console.log('[Velto] ChatGPT content script loaded');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === MSG.CAPTURE_REQUEST) {
    console.log('[Velto] capture requested on ChatGPT page');
    // TODO: implement tooltip/inline UI later
  }
});