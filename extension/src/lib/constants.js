export const MSG = {
  PING: 'PING',
  PONG: 'PONG',
  CAPTURE_REQUEST: 'CAPTURE_REQUEST',
  INJECT_REQUEST: 'INJECT_REQUEST',
  CONTEXTS_LIST: 'CONTEXTS_LIST',
  CONTEXTS_CREATE: 'CONTEXTS_CREATE',
  CONTEXTS_UPDATE: 'CONTEXTS_UPDATE',
  CONTEXTS_DELETE: 'CONTEXTS_DELETE',
};

export const CMD = { CAPTURE: 'capture' };

export const HOSTS = {
  CHATGPT: 'https://chat.openai.com/*',
  CLAUDE: 'https://claude.ai/*',
  CURSOR1: 'https://www.cursor.com/*',
  CURSOR2: 'https://cursor.sh/*',
};

export const STORAGE_KEYS = {
  SETTINGS: 'velto_settings',
  CONTEXTS_CACHE: 'velto_contexts_cache',
};
