import { useEffect, useState } from 'react'
import { MSG } from '../lib/constants.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera } from '@fortawesome/free-solid-svg-icons'

export default function Capture() {
  const [status, setStatus] = useState('idle') // idle | capturing | saved | error
  const [message, setMessage] = useState('Select text in ChatGPT, Claude, or Cursor, then press Capture.')
  const [preview, setPreview] = useState(null)
  const [countBefore, setCountBefore] = useState(0)
  const [backendStatus, setBackendStatus] = useState('unknown') // unknown | connected | disconnected
  const [lastSync, setLastSync] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('inbox')
  const [promptPick, setPromptPick] = useState(false)

  function queryActiveTab() {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) return resolve(null)
          resolve(Array.isArray(tabs) && tabs.length ? tabs[0] : null)
        })
      } catch (_) {
        resolve(null)
      }
    })
  }

  useEffect(() => {
    // read current count for selected project for later diff
    chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
      const items = res?.items || []
      const ctx = items.find(i => i.id === selectedProject)
      setCountBefore(ctx?.snippetCount || 0)
    })

    // Check backend status
    checkBackendStatus()

    // Query current capture monitoring state on active tab
    queryActiveTab().then((tab) => {
      if (!tab?.id) return
      chrome.tabs.sendMessage(tab.id, { type: MSG.CAPTURE_STATE_GET }, (res) => {
        if (chrome.runtime.lastError) {
          setMonitoring(false)
          return
        }
        setMonitoring(!!res?.monitoring)
      })
    })

    // Load projects and last selected project
    loadProjectsAndSelectedProject()
  }, [])

  // Recompute baseline count whenever the selected project changes
  useEffect(() => {
    if (!selectedProject) return
    chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
      const items = res?.items || []
      const ctx = items.find(i => i.id === selectedProject)
      setCountBefore(ctx?.snippetCount || 0)
    })
  }, [selectedProject])

  async function checkBackendStatus() {
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TEST_CONNECTION' }, resolve)
      })
      setBackendStatus(result.success ? 'connected' : 'disconnected')
      if (result.success) {
        setLastSync(new Date().toLocaleTimeString())
      }
    } catch (error) {
      setBackendStatus('disconnected')
    }
  }

  async function handleCaptureClick() {
    try {
      setStatus('capturing')
      setMessage('Capturing selection from the active tab…')
      // Persist selected project for background to use
      try { await chrome.storage.local.set({ velto_selected_project: selectedProject || 'inbox' }) } catch (_) {}
      const tab = await queryActiveTab()
      if (!tab?.id) throw new Error('No active tab')

      await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { type: MSG.CAPTURE_REQUEST }, () => {
          // We won't get a real response from content-scripts; ignore errors
          resolve()
        })
      })

      // Give background a moment to persist the snippet
      setTimeout(async () => {
        chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, async (res) => {
          const items = res?.items || []
          const ctx = items.find(i => i.id === (selectedProject || 'inbox'))
          const newCount = ctx?.snippetCount || 0
          if (newCount > countBefore) {
            // fetch latest snippet for preview from selected project
            const detail = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'CONTEXT_DETAIL', payload: { id: selectedProject || 'inbox' } }, resolve)
            })
            const latest = detail?.context?.snippets?.[0]
            if (latest) setPreview(latest)
            setStatus('saved')
            setMessage('Snippet saved to Velto')

            // We just started monitoring on supported pages
            setMonitoring(true)
            
            // Update backend status
            checkBackendStatus()
          } else {
            setStatus('saved')
            setMessage('Capture request sent. If nothing saved, make sure you selected text on a supported site.')
            setMonitoring(true)
          }
        })
      }, 400)
    } catch (e) {
      setStatus('error')
      setMessage('Failed to capture. Open ChatGPT, Claude, or Cursor and select some text.')
    }
  }

  async function handleToggleClick() {
    if (monitoring) {
      try {
        const tab = await queryActiveTab()
        if (tab?.id) {
          await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { type: MSG.CAPTURE_STOP }, () => resolve())
          })
          setMonitoring(false)
          setStatus('idle')
          setMessage('Capture stopped. Press Capture to start again.')
        }
      } catch (_) {
        // noop
      }
    } else {
      // Start capture flow
      handleCaptureClick()
    }
  }

  async function handleSyncBackend() {
    try {
      setMessage('Syncing with backend...')
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'SYNC_BACKEND' }, resolve)
      })
      
      if (result.ok) {
        setMessage('Synced with backend')
        setLastSync(new Date().toLocaleTimeString())
        // Refresh count
        chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
          const items = res?.items || []
          const inbox = items.find(i => i.id === 'inbox')
          setCountBefore(inbox?.snippetCount || 0)
        })
      } else {
        setMessage('Sync failed: ' + result.error)
      }
    } catch (error) {
      setMessage('Sync failed: ' + error.message)
    }
  }

  async function loadProjectsAndSelectedProject() {
    try {
      // Try to load projects from backend first
      const projectsResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: { method: 'GET', endpoint: 'projects' }
        }, resolve)
      })
      
      if (projectsResponse.success && projectsResponse.data) {
        const backendProjects = projectsResponse.data.map(project => ({
          id: project._id || project.id,
          name: project.name,
          description: project.description,
          createdAt: new Date(project.createdAt).getTime(),
          backendId: project._id || project.id
        }))
        setProjects(backendProjects)
        
        // Store locally for offline access
        chrome.storage.local.set({ velto_projects: backendProjects })
      } else {
        // Fallback to local storage
        chrome.storage.local.get(['velto_projects'], (res) => {
          const items = Array.isArray(res?.velto_projects) ? res.velto_projects : []
          setProjects(items)
        })
      }
      
      // Load selected project
      chrome.storage.local.get(['velto_selected_project', 'velto_capture_pick'], (res) => {
        const sel = res?.velto_selected_project || 'inbox'
        setSelectedProject(sel)
        if (res?.velto_capture_pick) {
          setPromptPick(true)
          // clear the flag so it doesn't loop
          chrome.storage.local.set({ velto_capture_pick: false })
        }
      })
    } catch (e) {
      console.error('Failed to load projects:', e)
      // Fallback to local storage
      chrome.storage.local.get(['velto_projects', 'velto_selected_project', 'velto_capture_pick'], (res) => {
        const items = Array.isArray(res?.velto_projects) ? res.velto_projects : []
        setProjects(items)
        const sel = res?.velto_selected_project || 'inbox'
        setSelectedProject(sel)
        if (res?.velto_capture_pick) {
          setPromptPick(true)
          chrome.storage.local.set({ velto_capture_pick: false })
        }
      })
    }
  }

  return (
    <section className="space-y-3">
      {/* Project Picker */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">Capture target</h3>
          {promptPick && (
            <span className="text-xs text-accent">Pick a project to continue</span>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-300">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="inbox">Inbox (Quick Captures)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {projects.length === 0 && (
            <div className="text-xs text-gray-400">No projects yet. You can create one in Projects tab; capturing will go to Inbox by default.</div>
          )}
        </div>
      </div>

      {/* Backend Status */}
      <div className="border border-gray-700 rounded-md p-3 bg-card/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Backend Status</span>
          <button 
            onClick={handleSyncBackend}
            className="text-xs text-accent hover:text-accent-bright px-2 py-1 rounded"
          >
            Sync
          </button>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' ? 'bg-green-500' : 
            backendStatus === 'unknown' ? 'bg-gray-500' : 'bg-red-500'
          }`} />
          <span className={`text-xs ${
            backendStatus === 'connected' ? 'text-green-400' : 
            backendStatus === 'unknown' ? 'text-gray-400' : 'text-red-400'
          }`}>
            {backendStatus === 'connected' ? 'Connected' : 
             backendStatus === 'unknown' ? 'Checking...' : 'Disconnected'}
          </span>
        </div>
        
        {lastSync && (
          <div className="text-xs text-gray-400">
            Last sync: {lastSync}
          </div>
        )}
      </div>

      <div className="border border-gray-700 rounded-md p-4 bg-card/60 text-center space-y-3">
        <div className="text-2xl" aria-hidden>
          <FontAwesomeIcon icon={faCamera} />
        </div>
        <h3 className="text-white font-semibold">Manual Capture</h3>
        <p className="text-gray-300 text-sm">{message}</p>
        <button onClick={handleToggleClick} disabled={status==='capturing'} className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow disabled:opacity-60">
          {status === 'capturing' ? 'Capturing…' : (monitoring ? 'End Capture' : 'Capture from current tab')}
        </button>
      </div>

      {preview && (
        <article className="border border-gray-700 rounded-md p-3 bg-card/60">
          <header className="flex items-center justify-between">
            <h4 className="text-white font-semibold">{preview.title}</h4>
            <span className="text-xs text-gray-400">{new Date(preview.timestamp).toLocaleTimeString()}</span>
          </header>
          <div className="text-gray-400 text-xs">From: {preview.source}</div>
          <pre className="bg-gray-800 text-gray-200 p-2 rounded-md overflow-auto mt-2 max-h-40"><code>{preview.content}</code></pre>
        </article>
      )}
    </section>
  )
}
