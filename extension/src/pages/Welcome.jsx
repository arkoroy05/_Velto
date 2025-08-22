export default function Welcome() {
  return (
    <section className="flex flex-col items-center justify-center text-center gap-3 py-6">
      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shadow-glow" aria-hidden>
        <span className="text-accent">🧠</span>
      </div>
      <h1 className="text-white text-lg font-semibold">Shared Memory for AI Tools</h1>
      <p className="text-gray-300 text-sm max-w-xs">
        Eliminate copy-paste between ChatGPT, Claude, and Cursor. Capture snippets and replay context anywhere.
      </p>
      <div className="flex gap-2 mt-2">
        <button className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow">
          Continue with GitHub
        </button>
        <button className="bg-gradient-to-r from-accent to-accent-bright text-white px-4 py-2 rounded-md text-sm font-medium shadow-glow">
          Continue with Google
        </button>
      </div>
    </section>
  )
}
