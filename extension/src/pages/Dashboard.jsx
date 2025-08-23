import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faMagnifyingGlass, faRocket } from '@fortawesome/free-solid-svg-icons'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalContexts: 0,
    totalSnippets: 0,
    recentActivity: 0,
    topTools: []
  })
  const [recentContexts, setRecentContexts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState('unknown')

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    setError('')
    
    try {
      // Check backend connection
      const connectionTest = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' }, resolve)
      })
      setBackendStatus(connectionTest.success ? 'connected' : 'disconnected')

      if (connectionTest.success) {
        // Load analytics
        const analyticsResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'API_REQUEST',
            payload: { method: 'GET', endpoint: 'analytics' }
          }, resolve)
        })
        
        if (analyticsResponse.success && analyticsResponse.data) {
          setStats({
            totalContexts: analyticsResponse.data.totalContexts || 0,
            totalSnippets: analyticsResponse.data.totalSnippets || 0,
            recentActivity: analyticsResponse.data.recentActivity || 0,
            topTools: analyticsResponse.data.topTools || []
          })
        }

        // Load recent contexts
        const contextsResponse = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'API_REQUEST',
            payload: { method: 'GET', endpoint: 'contexts', params: { limit: 5 } }
          }, resolve)
        })
        
        if (contextsResponse.success && contextsResponse.data) {
          setRecentContexts(contextsResponse.data)
        }
      } else {
        // Fallback to local data
        chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
          const items = res?.items || []
          const totalSnippets = items.reduce((sum, item) => sum + (item.snippetCount || 0), 0)
          setStats({
            totalContexts: items.length,
            totalSnippets,
            recentActivity: 0,
            topTools: []
          })
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError('Failed to load dashboard data: ' + error.message)
      
      // Fallback to local data
      chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
        const items = res?.items || []
        const totalSnippets = items.reduce((sum, item) => sum + (item.snippetCount || 0), 0)
        setStats({
          totalContexts: items.length,
          totalSnippets,
          recentActivity: 0,
          topTools: []
        })
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncBackend() {
    try {
      await loadDashboardData()
    } catch (error) {
      setError('Sync failed: ' + error.message)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-semibold">Dashboard</h2>
        <button 
          onClick={handleSyncBackend}
          className="text-xs text-accent hover:text-accent-bright px-2 py-1 rounded border border-accent/30"
        >
          Sync
        </button>
      </div>

      {/* Backend Status */}
      <div className="border border-gray-700 rounded-md p-3 bg-card/60">
        <div className="flex items-center gap-2">
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

      {/* Error Display */}
      {error && (
        <div className="border border-red-500 rounded-md p-3 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-700 rounded-md p-3 bg-card/60 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalContexts}</div>
          <div className="text-xs text-gray-400">Total Contexts</div>
        </div>
        <div className="border border-gray-700 rounded-md p-3 bg-card/60 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalSnippets}</div>
          <div className="text-xs text-gray-400">Total Snippets</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link 
            to="/capture" 
            className="flex flex-col items-center p-3 bg-gray-800/50 rounded-md hover:bg-gray-800/70 transition-colors"
          >
            <div className="text-2xl mb-2" aria-hidden><FontAwesomeIcon icon={faCamera} /></div>
            <span className="text-white text-sm">Capture</span>
            <span className="text-gray-400 text-xs">New context</span>
          </Link>
          <Link 
            to="/search" 
            className="flex flex-col items-center p-3 bg-gray-800/50 rounded-md hover:bg-gray-800/70 transition-colors"
          >
            <div className="text-2xl mb-2" aria-hidden><FontAwesomeIcon icon={faMagnifyingGlass} /></div>
            <span className="text-white text-sm">Search</span>
            <span className="text-gray-400 text-xs">Find contexts</span>
          </Link>
        </div>
      </div>

      {/* Recent Contexts */}
      {recentContexts.length > 0 && (
        <div className="border border-gray-700 rounded-md p-4 bg-card/60">
          <h3 className="text-white font-semibold mb-3">Recent Contexts</h3>
          <div className="space-y-2">
            {recentContexts.map((context) => (
              <div key={context._id || context.id} className="p-2 bg-gray-800/50 rounded">
                <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tools */}
      {stats.topTools.length > 0 && (
        <div className="border border-gray-700 rounded-md p-4 bg-card/60">
          <h3 className="text-white font-semibold mb-3">Top Tools</h3>
          <div className="space-y-2">
            {stats.topTools.map((tool, index) => (
              <div key={tool.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">#{index + 1}</span>
                  <span className="text-white text-sm">{tool.name}</span>
                </div>
                <span className="text-gray-400 text-xs">{tool.count} contexts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && stats.totalContexts === 0 && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2" aria-hidden><FontAwesomeIcon icon={faRocket} /></div>
          <p>Welcome to Velto!</p>
          <p className="text-sm mt-1">Start by capturing your first context</p>
          <Link 
            to="/capture"
            className="inline-block mt-3 bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Capture Context
          </Link>
        </div>
      )}
    </section>
  )
}
