import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState('unknown')
  const [recentContexts, setRecentContexts] = useState([])

  useEffect(() => {
    checkBackendStatus()
    loadRecentContexts()
  }, [])

  async function checkBackendStatus() {
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' }, resolve)
      })
      setBackendStatus(result.success ? 'connected' : 'disconnected')
    } catch (error) {
      setBackendStatus('disconnected')
    }
  }

  async function loadRecentContexts() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: { method: 'GET', endpoint: 'contexts', params: { limit: 10 } }
        }, resolve)
      })
      
      if (response.success && response.data) {
        setRecentContexts(response.data)
      } else {
        console.warn('Failed to load recent contexts:', response.error)
        setRecentContexts([])
      }
    } catch (error) {
      console.error('Failed to load recent contexts:', error)
      setRecentContexts([])
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: { method: 'GET', endpoint: 'search', params: { query, limit: 20 } }
        }, resolve)
      })
      
      if (response.success && response.data) {
        setResults(response.data)
      } else {
        setError(response.error || 'Search failed')
        setResults([])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setError('Search failed: ' + error.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleContextClick(contextId) {
    try {
      // Get context details from backend
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: { method: 'GET', endpoint: 'contexts', params: { contextId } }
        }, resolve)
      })
      
      if (response.success && response.data) {
        const context = response.data
        if (context) {
          // For now, just show an alert with the context details
          // In a real app, you'd navigate to a detail view
          alert(`Context: ${context.title}\n\n${context.content}`)
        }
      } else {
        setError('Failed to load context: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to load context:', error)
      setError('Failed to load context: ' + error.message)
    }
  }

  return (
    <section className="space-y-4">
      {/* Backend Status */}
      <div className="border border-gray-700 rounded-md p-3 bg-card/60">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' ? 'bg-green-500' : 
            backendStatus === 'unknown' ? 'bg-gray-500' : 'bg-red-500'
          }`} />
          <span className={`text-xs ${
            backendStatus === 'connected' ? 'text-green-400' : 
            backendStatus === 'unknown' ? 'text-gray-400' : 'text-red-400'
          }`}>
            {backendStatus === 'connected' ? 'Backend Connected' : 
             backendStatus === 'unknown' ? 'Checking...' : 'Backend Disconnected'}
          </span>
        </div>
      </div>

      {/* Search Form */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <h3 className="text-white font-semibold mb-3">Search Contexts</h3>
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for contexts, code, conversations..."
              className="flex-1 bg-gray-800 text-gray-200 px-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow disabled:opacity-60"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border border-red-500 rounded-md p-3 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="border border-gray-700 rounded-md p-4 bg-card/60">
          <h4 className="text-white font-semibold mb-3">Search Results ({results.length})</h4>
          <div className="space-y-3">
            {results.map((result) => (
              <div 
                key={result._id || result.id} 
                className="border border-gray-600 rounded-md p-3 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => handleContextClick(result._id || result.id)}
              >
                <div className="flex items-start justify-between">
                  <h5 className="text-white font-medium text-sm">{result.title}</h5>
                  <span className="text-xs text-gray-400">
                    {new Date(result.createdAt || result.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mt-1 line-clamp-2">
                  {result.content?.substring(0, 150)}...
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {result.type || 'context'}
                  </span>
                  {result.source?.type && (
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                      {result.source.type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Contexts */}
      {recentContexts.length > 0 && (
        <div className="border border-gray-700 rounded-md p-4 bg-card/60">
          <h4 className="text-white font-semibold mb-3">Recent Contexts</h4>
          <div className="space-y-2">
            {recentContexts.map((context) => (
              <div 
                key={context._id || context.id} 
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => handleContextClick(context._id || context.id)}
              >
                <div>
                  <div className="text-white text-sm">{context.title}</div>
                  <div className="text-gray-400 text-xs">
                    {new Date(context.createdAt || context.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-gray-400 text-xs">
                  {context.type || 'context'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && query && results.length === 0 && !error && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2" aria-hidden><FontAwesomeIcon icon={faMagnifyingGlass} /></div>
          <p>No contexts found for "{query}"</p>
          <p className="text-sm mt-1">Try different keywords or check your spelling</p>
        </div>
      )}
    </section>
  )
}
