export default function Settings() {
  return (
    <section className="space-y-4 text-sm">
      <h2 className="text-white text-base font-semibold">Settings</h2>

      <div className="space-y-2">
        <h3 className="text-white font-semibold">Hotkeys</h3>
        <div className="flex items-center justify-between border border-gray-700 rounded-md p-3 bg-card/60">
          <div className="text-gray-300">Capture</div>
          <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">✎ Edit</button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-semibold">AI Tool Integration</h3>
        <ul className="space-y-1 text-gray-300">
          <li>✅ ChatGPT enabled</li>
          <li>✅ Claude enabled</li>
          <li>✅ Cursor enabled</li>
          <li>⚠️ Copilot pending</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-semibold">Data Privacy</h3>
        <div className="grid gap-2">
          <label className="flex items-center justify-between border border-gray-700 rounded-md p-3 bg-card/60"><span>Auto-capture</span><input type="checkbox"/></label>
          <label className="flex items-center justify-between border border-gray-700 rounded-md p-3 bg-card/60"><span>Local encryption</span><input type="checkbox"/></label>
          <label className="flex items-center justify-between border border-gray-700 rounded-md p-3 bg-card/60"><span>Usage data sharing</span><input type="checkbox"/></label>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-semibold">Account</h3>
        <div className="flex items-center justify-between border border-gray-700 rounded-md p-3 bg-card/60">
          <div className="text-gray-300">user@example.com</div>
          <div className="flex gap-2">
            <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Change Password</button>
            <button className="border border-gray-600 text-gray-200 px-3 py-2 rounded-md">Sign Out</button>
          </div>
        </div>
      </div>
    </section>
  )
}
