import { CMD, MSG } from '../lib/constants.js';

console.log('[Velto] service worker booted');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Velto] installed');
});

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.type) {
    case MSG.PING:
      sendResponse({ type: MSG.PONG, ts: Date.now() });
      return true;

    case MSG.CONTEXTS_LIST:
      // TODO: hook APIs later; return cached placeholder for now
      sendResponse({ items: [], cached: true });
      return true;

    default:
      break;
  }
});