import { useEffect, useState } from 'react'
import Search from './Search.jsx'

export default function Projets() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState('unknown')

  useEffect(() => {
    loadProjects()
    checkBackendStatus()
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

  async function loadProjects() {
    try {
      setLoading(true)
      setError('')
      
      console.log('[Velto] Loading projects from backend...')
      
      // Try to load from backend first
      const response = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            type: 'API_REQUEST',
            payload: { method: 'GET', endpoint: 'projects' }
          }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(result)
            }
          })
        } catch (error) {
          reject(error)
        }
      })
      
      console.log('[Velto] Projects API response received:', response)
      
      if (response.success && response.data) {
        console.log('Projects API response:', response)
        
        // Check if data is an array
        if (Array.isArray(response.data)) {
          // Transform backend data to local format for compatibility
          const backendProjects = response.data.map(project => ({
            id: project.id || project._id || `project_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: project.name || 'Untitled Project',
            description: project.description || '',
            createdAt: project.createdAt ? new Date(project.createdAt).getTime() : Date.now(),
            backendId: project.id || project._id
          }))
          setProjects(backendProjects)
          
          // Also store locally for offline access
          chrome.storage.local.set({ velto_projects: backendProjects })
        } else if (response.data && typeof response.data === 'object') {
          // Handle case where data might be a single object or have a different structure
          console.log('Projects data is not an array:', response.data)
          
          // Try to extract projects from different possible structures
          let projectsArray = []
          
          if (response.data.projects && Array.isArray(response.data.projects)) {
            projectsArray = response.data.projects
          } else if (response.data.items && Array.isArray(response.data.items)) {
            projectsArray = response.data.items
          } else if (response.data.data && Array.isArray(response.data.data)) {
            projectsArray = response.data.data
          } else {
            // If we can't find an array, treat the data as a single project
            projectsArray = [response.data]
          }
          
          if (projectsArray.length > 0) {
            const backendProjects = projectsArray.map(project => ({
              id: project.id || project._id || `project_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              name: project.name || 'Untitled Project',
              description: project.description || '',
              createdAt: project.createdAt ? new Date(project.createdAt).getTime() : Date.now(),
              backendId: project.id || project._id
            }))
            setProjects(backendProjects)
            
            // Also store locally for offline access
            chrome.storage.local.set({ velto_projects: backendProjects })
          } else {
            console.warn('No projects found in response data')
            setProjects([])
          }
        } else {
          console.warn('Projects data is not in expected format:', response.data)
          setProjects([])
        }
      } else {
        console.warn('Projects API response not successful:', response)
        // Fallback to local storage
        chrome.storage.local.get(['velto_projects'], (res) => {
          const items = Array.isArray(res?.velto_projects) ? res.velto_projects : []
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          setProjects(items)
        })
      }
    } catch (e) {
      console.error('Failed to load projects:', e)
      setError('Failed to load projects: ' + e.message)
      
      // Fallback to local storage
      chrome.storage.local.get(['velto_projects'], (res) => {
        const items = Array.isArray(res?.velto_projects) ? res.velto_projects : []
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setProjects(items)
      })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    try {
      setLoading(true)
      
      // Create project in backend
      const projectData = {
        name: name.trim(),
        description: description.trim(),
        isPublic: false,
        tags: [],
        settings: {
          autoCategorize: true,
          chunkSize: 1000,
          maxTokens: 4000,
          aiModel: 'gemini'
        }
      }
      
      const response = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            type: 'API_REQUEST',
            payload: { 
              method: 'POST', 
              endpoint: 'projects', 
              data: projectData 
            }
          }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(result)
            }
          })
        } catch (error) {
          reject(error)
        }
      })
      
      if (response.success && response.data) {
        const newProject = {
          id: response.data.id || response.data._id || `project_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: response.data.name || name.trim(),
          description: response.data.description || description.trim(),
          createdAt: response.data.createdAt ? new Date(response.data.createdAt).getTime() : Date.now(),
          backendId: response.data.id || response.data._id
        }
        
        // Update local state
        setProjects(prev => [newProject, ...prev])
        
        // Store locally for offline access
        chrome.storage.local.get(['velto_projects'], (res) => {
          const existing = Array.isArray(res?.velto_projects) ? res.velto_projects : []
          const updated = [newProject, ...existing]
          chrome.storage.local.set({ velto_projects: updated })
        })
        
        resetForm()
      } else {
        throw new Error(response.error || 'Failed to create project in backend')
      }
    } catch (e) {
      console.error('Failed to create project:', e)
      setError('Failed to create project: ' + e.message)
      
      // Fallback to local creation
      try {
        const newProject = {
          id: (crypto?.randomUUID && crypto.randomUUID()) || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: name.trim(),
          description: description.trim(),
          createdAt: Date.now(),
          localOnly: true
        }
        
        chrome.storage.local.get(['velto_projects'], (res) => {
          const existing = Array.isArray(res?.velto_projects) ? res.velto_projects : []
          const updated = [newProject, ...existing]
          chrome.storage.local.set({ velto_projects: updated }, () => {
            if (chrome.runtime.lastError) {
              setError('Failed to save project locally')
              return
            }
            setProjects(updated)
            resetForm()
          })
        })
      } catch (localError) {
        setError('Failed to create project locally: ' + localError.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-semibold">Projets</h2>
        <button
          onClick={loadProjects}
          className="text-xs text-accent hover:text-accent-bright px-2 py-1 rounded border border-accent/30"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Backend Status */}
      <div className="border border-gray-700 rounded-md p-3 bg-card/60">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' ? 'bg-green-500' : 
            backendStatus === 'unknown' ? 'bg-gray-500' : 'bg-red-500'
          }`} />
          <span className={`text-xs ${
            backendStatus === 'connected' ? 'text-green-400' : 
            backendStatus === 'unknown' ? 'text-gray-400' : 'bg-red-400'
          }`}>
            {backendStatus === 'connected' ? 'Backend Connected' : 
             backendStatus === 'unknown' ? 'Checking...' : 'Backend Disconnected'}
          </span>
        </div>
      </div>

      {/* Embedded Search */}
      <div className="border border-gray-700 rounded-md p-0 bg-transparent">
        <Search embedded />
      </div>

      {error && (
        <div className="border border-red-500 rounded-md p-3 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create project */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <h3 className="text-white font-semibold mb-3">Create a project</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="e.g. Onboarding revamp"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent min-h-[70px]"
              placeholder="Short description"
              disabled={loading}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>

      {/* List projects */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Your projects</h3>
          <div className="text-xs text-gray-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No projects yet. Create your first project above.</div>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-auto pr-1 no-scrollbar">
            {projects.map((p) => (
              <div key={p.id} className="p-3 bg-gray-800/50 rounded border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-gray-400 text-xs mt-0.5">{p.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {p.localOnly ? 'Local only' : 'Synced with backend'}
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
