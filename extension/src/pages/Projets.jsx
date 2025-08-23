import { useEffect, useState } from 'react'

export default function Projets() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  function loadProjects() {
    try {
      setLoading(true)
      chrome.storage.local.get(['velto_projects'], (res) => {
        const items = Array.isArray(res?.velto_projects) ? res.velto_projects : []
        // sort newest first
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setProjects(items)
        setLoading(false)
      })
    } catch (e) {
      setError('Failed to load projects: ' + e.message)
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
  }

  function handleCreate(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    try {
      chrome.storage.local.get(['velto_projects'], (res) => {
        const existing = Array.isArray(res?.velto_projects) ? res.velto_projects : []
        const newProject = {
          id: (crypto?.randomUUID && crypto.randomUUID()) || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: name.trim(),
          description: description.trim(),
          createdAt: Date.now(),
        }
        const updated = [newProject, ...existing]
        chrome.storage.local.set({ velto_projects: updated }, () => {
          if (chrome.runtime.lastError) {
            setError('Failed to save project')
            return
          }
          setProjects(updated)
          resetForm()
        })
      })
    } catch (e) {
      setError('Failed to create project: ' + e.message)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white text-xl font-semibold">Projets</h2>
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
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-300">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-accent min-h-[70px]"
              placeholder="Short description"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create
            </button>
          </div>
        </form>
      </div>

      {/* List projects */}
      <div className="border border-gray-700 rounded-md p-4 bg-card/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Your projects</h3>
          <button
            onClick={loadProjects}
            className="text-xs text-accent hover:text-accent-bright px-2 py-1 rounded border border-accent/30"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No projects yet. Create your first project above.</div>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-auto pr-1">
            {projects.map((p) => (
              <div key={p.id} className="p-3 bg-gray-800/50 rounded border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-gray-400 text-xs mt-0.5">{p.description}</div>
                    )}
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
