import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localOnly, setLocalOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState('checking') // checking | connected | disconnected
  const [backendInfo, setBackendInfo] = useState(null)

  useEffect(() => {
    // If already logged in, go home
    chrome.storage.local.get(['velto_settings']).then((res) => {
      const s = res?.velto_settings || {}
      if (s.loggedIn) navigate('/')
    })

    // Test backend connection
    testBackendConnection()
  }, [navigate])

  async function testBackendConnection() {
    try {
      setBackendStatus('checking')
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' }, resolve)
      })
      
      if (result.success) {
        setBackendStatus('connected')
        setBackendInfo(result.data)
      } else {
        setBackendStatus('disconnected')
        setBackendInfo(null)
        console.warn('Backend connection failed:', result.error)
      }
    } catch (error) {
      console.error('Backend connection test failed:', error)
      setBackendStatus('disconnected')
      setBackendInfo(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // For now, accept any non-empty password. You can swap with real auth later.
      if (!password?.trim()) {
        setError('Please enter a password')
        setLoading(false)
        return
      }
      const settings = {
        loggedIn: true,
        auth: localOnly ? { mode: 'local' } : { mode: 'email', email },
        backendConnected: backendStatus === 'connected',
        updatedAt: Date.now(),
      }
      await chrome.storage.local.set({ velto_settings: settings })
      navigate('/')
    } catch (e) {
      setError('Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="h-full flex flex-col justify-between">
      <div className="px-2 py-3 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shadow-glow" aria-hidden>
            <span className="text-accent">🧠</span>
          </div>
          <h1 className="text-white text-lg font-semibold">Velto</h1>
          <p className="text-gray-300 text-sm">Shared memory for AI tools</p>
        </div>

        {/* Backend Status */}
        <div className="border border-gray-700 rounded-md p-3 bg-card/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Backend Status</span>
            <button 
              onClick={testBackendConnection}
              className="text-xs text-accent hover:text-accent-bright"
              disabled={backendStatus === 'checking'}
            >
              {backendStatus === 'checking' ? 'Checking...' : 'Refresh'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 
              backendStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`text-xs ${
              backendStatus === 'connected' ? 'text-green-400' : 
              backendStatus === 'checking' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {backendStatus === 'connected' ? 'Connected' : 
               backendStatus === 'checking' ? 'Checking...' : 'Disconnected'}
            </span>
          </div>
          
          {backendInfo && (
            <div className="mt-2 text-xs text-gray-400">
              <div>Version: {backendInfo.version}</div>
              <div>Database: {backendInfo.database}</div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
            Use local auth (no account)
          </label>

          {!localOnly && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 text-gray-200 px-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="you@domain.com"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-gray-200 px-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-error text-xs">{error}</div>}

          <button disabled={loading} className="w-full bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-gray-400 pb-2">v0.1.0</div>
    </section>
  )
}
