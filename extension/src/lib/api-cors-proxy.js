// API service for Velto extension using CORS proxy for testing
// This is a temporary solution while backend CORS is being fixed

const API_BASE_URL = 'https://velto.onrender.com/api/v1'
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/' // Free CORS proxy for testing
const TEST_USER_ID = '689e5a217224da39efe7a47f'

class CorsProxyApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
    this.userId = TEST_USER_ID
    this.useProxy = true // Set to false when backend CORS is fixed
  }

  // Helper method to make API requests
  async request(endpoint, options = {}) {
    let url = `${this.baseUrl}${endpoint}`
    
    // Use CORS proxy if enabled
    if (this.useProxy) {
      url = `${CORS_PROXY}${url}`
    }
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId,
        'Origin': 'chrome-extension://cebgjihepddgocdapeffhfcbhgdimloc',
        ...options.headers
      },
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Contexts API
  async getContexts(params = {}) {
    const queryString = new URLSearchParams({
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/contexts?${queryString}`)
  }

  async getContextById(contextId) {
    return this.request(`/contexts/${contextId}?userId=${this.userId}`)
  }

  async createContext(contextData) {
    return this.request('/contexts', {
      method: 'POST',
      body: JSON.stringify({
        ...contextData,
        userId: this.userId
      })
    })
  }

  async updateContext(contextId, updateData) {
    return this.request(`/contexts/${contextId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updateData,
        userId: this.userId
      })
    })
  }

  async deleteContext(contextId) {
    return this.request(`/contexts/${contextId}`, {
      method: 'DELETE'
    })
  }

  // Search API
  async searchContexts(query, params = {}) {
    const queryString = new URLSearchParams({
      q: query,
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/search?${queryString}`)
  }

  // Analytics API
  async getAnalytics(params = {}) {
    const queryString = new URLSearchParams({
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/analytics?${queryString}`)
  }

  // Health check
  async healthCheck() {
    let url = 'https://velto.onrender.com/health'
    
    // Use CORS proxy if enabled
    if (this.useProxy) {
      url = `${CORS_PROXY}${url}`
    }
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId,
        'Origin': 'chrome-extension://cebgjihepddgocdapeffhfcbhgdimloc'
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
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

  // Toggle CORS proxy usage
  setUseProxy(useProxy) {
    this.useProxy = useProxy
  }
}

// Export singleton instance
export const corsProxyApiService = new CorsProxyApiService()
export default corsProxyApiService
