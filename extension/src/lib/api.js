// API service for Velto extension backend communication
const API_BASE_URL = 'https://velto.onrender.com/api/v1'

// Hardcoded user ID for testing
const TEST_USER_ID = '689e5a217224da39efe7a47f'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
    this.userId = TEST_USER_ID
  }

  // Helper method to make API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId,
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
      query: query, // Changed from 'q' to 'query' to match backend expectation
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/search?${queryString}`)
  }

  // Prompt Version API - Generate injectable prompts from contexts
  async generatePromptVersion(contextId, userPrompt) {
    return this.request(`/contexts/${contextId}/prompt-version`, {
      method: 'POST',
      body: JSON.stringify({
        userId: this.userId,
        userPrompt: userPrompt
      })
    })
  }

  // Analytics API
  async getAnalytics(params = {}) {
    const queryString = new URLSearchParams({
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/analytics?${queryString}`)
  }

  // Projects API
  async getProjects(params = {}) {
    const queryString = new URLSearchParams({
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/projects?${queryString}`)
  }

  // Contexts API
  async getContexts(params = {}) {
    const queryString = new URLSearchParams({
      userId: this.userId,
      ...params
    }).toString()
    
    return this.request(`/contexts?${queryString}`)
  }

  async createProject(projectData) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        ...projectData,
        userId: this.userId
      })
    })
  }

  async updateProject(projectId, updateData) {
    return this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updateData,
        userId: this.userId
      })
    })
  }

  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, {
      method: 'DELETE'
    })
  }

  // Health check
  async healthCheck() {
    const url = `${this.baseUrl.replace('/api/v1', '')}/health`
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId
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
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService
