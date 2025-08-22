export const storage = {
    async getSync(keys) { return chrome.storage.sync.get(keys); },
    async setSync(items) { return chrome.storage.sync.set(items); },
    async removeSync(keys) { return chrome.storage.sync.remove(keys); },
  
    async getLocal(keys) { return chrome.storage.local.get(keys); },
    async setLocal(items) { return chrome.storage.local.set(items); },
    async removeLocal(keys) { return chrome.storage.local.remove(keys); },
  };