import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

export default function ContextDetail() {
  const { id } = useParams()
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    chrome.runtime.sendMessage({ type: 'CONTEXT_DETAIL', payload: { id } }, (res) => {
      setContext(res?.context || null)
      setLoading(false)
    })
  }, [id])

  const snippets = useMemo(() => context?.snippets || [], [context])

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="Back" className="text-gray-300">←</Link>
          <h2 className="text-white text-base font-semibold">{context?.name || `Context ${id}`}</h2>
        </div>
        <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Settings</button>
      </header>

      <div className="flex gap-2 text-sm">
        <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">+ Add Tag</button>
      </div>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-2">
        <button className="bg-gray-800 text-gray-200 px-3 py-2 rounded-md">Copy All Context</button>
        <button className="bg-gray-800 text-gray-200 px-3 py-2 rounded-md">Replay in ChatGPT</button>
        <button className="bg-gray-800 text-gray-200 px-3 py-2 rounded-md">Replay in Claude</button>
        <button className="bg-gray-800 text-gray-200 px-3 py-2 rounded-md">Replay in Cursor</button>
      </section>

      <section className="space-y-2">
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : snippets.length === 0 ? (
          <div className="text-gray-400 text-sm">No snippets yet.</div>
        ) : (
          snippets.map((s) => (
            <article key={s.id} className="border border-gray-700 rounded-md p-3 bg-card/60">
              <header className="flex items-center justify-between">
                <h4 className="text-white font-semibold">{s.title}</h4>
                <button className="text-xs border border-gray-600 text-gray-200 px-2 py-1 rounded" onClick={() => navigator.clipboard.writeText(s.content)}>Copy</button>
              </header>
              <div className="text-gray-400 text-xs">{new Date(s.timestamp).toLocaleString()} • From: {s.source}</div>
              <pre className="bg-gray-800 text-gray-200 p-2 rounded-md overflow-auto mt-2"><code>{s.content}</code></pre>
            </article>
          ))
        )}
      </section>
    </section>
  )
}
