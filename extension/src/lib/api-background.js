// API service for Velto extension that uses background script to avoid CORS issues
class BackgroundApiService {
  constructor() {
    this.userId = '689e5a217224da39efe7a47f'
  }

  // Helper method to make API requests through background script
  async request(method, endpoint, data = null, params = {}) {
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: {
            method,
            endpoint,
            data,
            params
          }
        }, resolve)
      })
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'API request failed')
      }
    } catch (error) {
      console.error('Background API request failed:', error)
      throw error
    }
  }

  // Contexts API
  async getContexts(params = {}) {
    return this.request('GET', 'contexts', null, params)
  }

  async getContextById(contextId) {
    // For now, we'll get all contexts and filter
    const contexts = await this.getContexts({ limit: 100 })
    if (contexts.success && contexts.data) {
      return contexts.data.find(ctx => ctx._id === contextId || ctx.id === contextId)
    }
    return null
  }

  async createContext(contextData) {
    return this.request('POST', 'contexts', contextData)
  }

  async updateContext(contextId, updateData) {
    // TODO: Implement PUT method in background script
    throw new Error('Update not implemented yet')
  }

  async deleteContext(contextId) {
    // TODO: Implement DELETE method in background script
    throw new Error('Delete not implemented yet')
  }

  // Search API
  async searchContexts(query, params = {}) {
    return this.request('GET', 'search', null, { query, ...params })
  }

  // Analytics API
  async getAnalytics(params = {}) {
    return this.request('GET', 'analytics', null, params)
  }

  // Health check
  async healthCheck() {
    return this.request('GET', 'health')
  }

  // Test connection
  async testConnection() {
    try {
      const health = await this.healthCheck()
      return { success: true, data: health }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const backgroundApiService = new BackgroundApiService()
export default backgroundApiService
