import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MSG } from '../lib/constants.js'

export default function Search() {
  const [query, setQuery] = useState('')
  const [contexts, setContexts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    try {
      chrome.runtime.sendMessage({ type: MSG.CONTEXTS_LIST }, (res) => {
        const items = res?.items || []
        setContexts(items)
        setResults(items)
        setLoading(false)
      })
    } catch (e) {
      console.warn('[Velto] Failed to load contexts', e)
      setLoading(false)
    }
  }, [])

  // naive search: match name first, then fetch detail and match snippets lazily
  useEffect(() => {
    let cancelled = false
    const q = query.trim().toLowerCase()
    if (!q) { setResults(contexts); return }

    async function run() {
      setSearching(true)
      // Start with quick filter by name
      let prelim = contexts.filter(c => c.name?.toLowerCase().includes(q))
      // If we already have enough, show them; also look deeper by snippets for all contexts
      const byId = new Map(prelim.map(c => [c.id, c]))
      for (const c of contexts) {
        try {
          await new Promise(r => setTimeout(r)) // yield
          const detail = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'CONTEXT_DETAIL', payload: { id: c.id } }, resolve)
          })
          const snippets = detail?.context?.snippets || []
          const has = snippets.some(s => (
            s.title?.toLowerCase().includes(q) || s.content?.toLowerCase().includes(q)
          ))
          if (has && !byId.has(c.id)) byId.set(c.id, c)
        } catch {}
        if (cancelled) return
      }
      if (!cancelled) setResults(Array.from(byId.values()))
      setSearching(false)
    }
    run()
    return () => { cancelled = true }
  }, [query, contexts])

  const list = useMemo(() => results, [results])

  return (
    <section className="space-y-3">
      <div className="relative">
        <span className="absolute left-2 top-2.5 text-gray-400">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-800 text-gray-200 pl-8 pr-3 py-2 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Search by keyword, error, or snippet code…"
          aria-label="Search contexts"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-gray-400 text-sm">No results.</div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <Link key={c.id} to={`/context/${c.id}`} className="block border border-gray-700 rounded-md p-3 bg-card/60 hover:scale-[1.01] transition-transform">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{c.name}</h4>
                <span className="text-xs text-gray-400">{c.snippetCount} • {c.timeAgo}</span>
              </div>
              <div className="text-gray-400 text-xs">Last used in {c.lastTool}</div>
            </Link>
          ))}
        </div>
      )}

      {searching && <div className="text-[11px] text-gray-500">Searching snippets…</div>}
    </section>
  )
}
