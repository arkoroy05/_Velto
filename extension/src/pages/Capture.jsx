import { useEffect, useState } from 'react'
import { MSG } from '../lib/constants.js'

export default function Capture() {
  const [status, setStatus] = useState('idle') // idle | capturing | saved | error
  const [message, setMessage] = useState('Select text in ChatGPT, Claude, or Cursor, then press Capture.')
  const [preview, setPreview] = useState(null)
  const [countBefore, setCountBefore] = useState(0)

  useEffect(() => {
    // read current inbox count for later diff
    chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
      const items = res?.items || []
      const inbox = items.find(i => i.id === 'inbox')
      setCountBefore(inbox?.snippetCount || 0)
    })
  }, [])

  async function handleCaptureClick() {
    try {
      setStatus('capturing')
      setMessage('Capturing selection from the active tab…')
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
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
          const inbox = items.find(i => i.id === 'inbox')
          const newCount = inbox?.snippetCount || 0
          if (newCount > countBefore) {
            // fetch latest snippet for preview
            const detail = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'CONTEXT_DETAIL', payload: { id: 'inbox' } }, resolve)
            })
            const latest = detail?.context?.snippets?.[0]
            if (latest) setPreview(latest)
            setStatus('saved')
            setMessage('✅ Snippet saved to Velto')
          } else {
            setStatus('saved')
            setMessage('✅ Capture request sent. If nothing saved, make sure you selected text on a supported site.')
          }
        })
      }, 400)
    } catch (e) {
      setStatus('error')
      setMessage('Failed to capture. Open ChatGPT, Claude, or Cursor and select some text.')
    }
  }

  return (
    <section className="space-y-3">
      <div className="border border-gray-700 rounded-md p-4 bg-card/60 text-center space-y-3">
        <div className="text-2xl" aria-hidden>📸</div>
        <h3 className="text-white font-semibold">Manual Capture</h3>
        <p className="text-gray-300 text-sm">{message}</p>
        <button onClick={handleCaptureClick} disabled={status==='capturing'} className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow disabled:opacity-60">
          {status === 'capturing' ? 'Capturing…' : 'Capture from current tab'}
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
