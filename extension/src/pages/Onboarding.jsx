import { useState } from 'react'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  return (
    <section className="text-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white text-base font-semibold">Onboarding</h2>
        <div className="text-gray-400">Step {step} / 3</div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Capture Hotkey</h3>
          <p className="text-gray-300">Default: <span className="px-2 py-1 bg-gray-800 rounded">Cmd+Shift+V</span></p>
          <div className="flex gap-2">
            <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Edit</button>
            <button onClick={next} className="bg-gradient-to-r from-accent to-accent-bright text-white px-3 py-2 rounded-md">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold">AI Tool Integration</h3>
          <ul className="text-gray-300 space-y-1">
            <li>✅ ChatGPT connected</li>
            <li>✅ Claude connected</li>
            <li>✅ Cursor connected</li>
            <li>⚠️ GitHub Copilot (coming soon)</li>
          </ul>
          <div className="flex gap-2">
            <button onClick={prev} className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Back</button>
            <button onClick={next} className="bg-gradient-to-r from-accent to-accent-bright text-white px-3 py-2 rounded-md">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Try it now</h3>
          <pre className="bg-gray-800 text-gray-200 p-3 rounded-md overflow-auto"><code>{`// Sample JavaScript\nfunction greet(name){\n  console.log('Hello, ' + name)\n}`}</code></pre>
          <div className="flex gap-2">
            <button onClick={prev} className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Back</button>
            <button className="bg-gradient-to-r from-accent to-accent-bright text-white px-3 py-2 rounded-md">Finish</button>
          </div>
        </div>
      )}
    </section>
  )
}
