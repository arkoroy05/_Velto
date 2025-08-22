export function sendMessage(message) {
    return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  }
  
  export function onMessage(handler) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const maybePromise = handler(msg, sender);
      if (maybePromise instanceof Promise) {
        maybePromise.then(sendResponse);
        return true;
      } else {
        sendResponse(maybePromise);
      }
    });
  }