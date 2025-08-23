import { useEffect, useState } from 'react'
import { MSG } from '../lib/constants.js'

export default function Capture() {
  const [status, setStatus] = useState('idle') // idle | capturing | saved | error
  const [message, setMessage] = useState('Select text in ChatGPT, Claude, or Cursor, then press Capture.')
  const [preview, setPreview] = useState(null)
  const [countBefore, setCountBefore] = useState(0)
  const [backendStatus, setBackendStatus] = useState('unknown') // unknown | connected | disconnected
  const [lastSync, setLastSync] = useState(null)
  const [monitoring, setMonitoring] = useState(false)

  useEffect(() => {
    // read current inbox count for later diff
    chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
      const items = res?.items || []
      const inbox = items.find(i => i.id === 'inbox')
      setCountBefore(inbox?.snippetCount || 0)
    })

    // Check backend status
    checkBackendStatus()

    // Query current capture monitoring state on active tab
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) return
        chrome.tabs.sendMessage(tab.id, { type: MSG.CAPTURE_STATE_GET }, (res) => {
          if (chrome.runtime.lastError) {
            setMonitoring(false)
            return
          }
          setMonitoring(!!res?.monitoring)
        })
      } catch (_) {
        setMonitoring(false)
      }
    })()
  }, [])

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

            // We just started monitoring on supported pages
            setMonitoring(true)
            
            // Update backend status
            checkBackendStatus()
          } else {
            setStatus('saved')
            setMessage('✅ Capture request sent. If nothing saved, make sure you selected text on a supported site.')
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
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
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
        setMessage('✅ Synced with backend')
        setLastSync(new Date().toLocaleTimeString())
        // Refresh count
        chrome.runtime.sendMessage({ type: 'CONTEXTS_LIST' }, (res) => {
          const items = res?.items || []
          const inbox = items.find(i => i.id === 'inbox')
          setCountBefore(inbox?.snippetCount || 0)
        })
      } else {
        setMessage('❌ Sync failed: ' + result.error)
      }
    } catch (error) {
      setMessage('❌ Sync failed: ' + error.message)
    }
  }

  return (
    <section className="space-y-3">
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
        <div className="text-2xl" aria-hidden>📸</div>
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
