import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MSG } from '../lib/constants.js'

export default function Dashboard() {
  const [contexts, setContexts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ type: MSG.CONTEXTS_LIST }, (res) => {
        setContexts(res?.items || [])
        setLoading(false)
      })
    } catch (e) {
      console.warn('[Velto] Failed to load contexts', e)
      setLoading(false)
    }
  }, [])
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-2.5 text-gray-400">🔍</span>
          <input className="w-full bg-gray-800 text-gray-200 pl-8 pr-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Search contexts..." aria-label="Search contexts" />
        </div>
        <button className="bg-gradient-to-r from-accent to-accent-bright text-white px-3 py-2 rounded-md text-sm font-medium shadow-glow flex items-center gap-1">
          <span>＋</span> New
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-white text-base font-semibold">Recent Contexts</h2>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : contexts.length === 0 ? (
        <div className="border border-gray-700 rounded-md p-4 bg-card/60 text-center space-y-2">
          <div className="text-2xl" aria-hidden>🧠</div>
          <h3 className="text-white font-semibold">Your AI brain is empty!</h3>
          <p className="text-gray-300 text-sm">Press Cmd+Shift+V to capture content and build your shared memory.</p>
          <ol className="text-gray-400 text-xs text-left list-decimal list-inside space-y-1">
            <li>Select text/code</li>
            <li>Press capture hotkey</li>
            <li>Save to a new or existing context</li>
          </ol>
          <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">View Tutorial</button>
        </div>
      ) : (
        <div className="space-y-2">
          {contexts.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="block border border-gray-700 rounded-md p-3 bg-card/60 hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{c.name}</h4>
                <span title="Quick inject" aria-label="Quick inject">⚡️⬆️</span>
              </div>
              <div className="text-gray-400 text-xs">{c.timeAgo} • {c.snippetCount} snippets • Last used in {c.lastTool}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
