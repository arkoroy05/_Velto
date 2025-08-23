// API client for Velto web dashboard (follows extension/src/lib/api.js)

const API_BASE_URL = 'https://velto.onrender.com/api/v1'
const TEST_USER_ID = '689e5a217224da39efe7a47f'

export interface BackendContext {
  _id: string
  id?: string
  title?: string
  name?: string
  content?: string
  type?: string
  source?: { type?: string; agentId?: string; timestamp?: string | Date }
  metadata?: Record<string, any>
  snippets?: any[]
  createdAt?: string
  updatedAt?: string
}

class ApiService {
  baseUrl: string
  userId: string
  constructor() {
    this.baseUrl = API_BASE_URL
    this.userId = TEST_USER_ID
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const config: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId,
        ...(options.headers || {}),
      },
      ...options,
    }
    const res = await fetch(url, config)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  }

  async getContexts(params: Record<string, any> = {}) {
    const query = new URLSearchParams({ userId: this.userId, ...params }).toString()
    return this.request(`/contexts?${query}`)
  }

  async getContextById(contextId: string) {
    return this.request(`/contexts/${contextId}?userId=${this.userId}`)
  }

  async createContext(data: Partial<BackendContext>) {
    return this.request('/contexts', {
      method: 'POST',
      body: JSON.stringify({ ...data, userId: this.userId }),
    })
  }

  async updateContext(contextId: string, data: Partial<BackendContext>) {
    return this.request(`/contexts/${contextId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, userId: this.userId }),
    })
  }

  async deleteContext(contextId: string) {
    return this.request(`/contexts/${contextId}`, { method: 'DELETE' })
  }

  async analyzeContext(contextId: string) {
    return this.request(`/contexts/${contextId}/analyze`, { method: 'POST' })
  }

  async generatePromptVersion(contextId: string) {
    return this.request(`/contexts/${contextId}/prompt-version`, { method: 'POST' })
  }

  async healthCheck() {
    const url = `${this.baseUrl.replace('/api/v1', '')}/health`
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': this.userId },
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  }

  async docs() {
    return this.request(`/docs`)
  }
}

export const api = new ApiService()
export default api
