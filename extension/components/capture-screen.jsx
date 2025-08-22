"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, ArrowLeft, Camera as CameraIcon } from "lucide-react";
import BottomNav from "@/components/bottom-nav";

export default function CaptureScreen() {
  const router = useRouter();
  const [captured, setCaptured] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contexts, setContexts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");

  // Session guard
  useEffect(() => {
    const session = typeof window !== "undefined" && localStorage.getItem("velto-session");
    if (!session) router.push("/");
  }, [router]);

  // Load existing contexts for dropdown
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/contexts?query=");
        const json = await res.json();
        setContexts(json.items || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleCapture = () => {
    // Mock capture content
    const sample = `function greet(name) {\n  return ` + "`Hello, ${name}!`" + `;\n}\n\nconsole.log(greet('Velto'));`;
    setCaptured(sample);
    if (!title) setTitle("Captured Snippet");
  };

  const animateSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1600);
  };

  const saveNew = async () => {
    if (!captured) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, snippet: captured, source: "Cursor" }),
      });
      await res.json();
      animateSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const saveExisting = async () => {
    if (!captured || !selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/contexts/${encodeURIComponent(selectedId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snippet: captured }),
      });
      await res.json();
      animateSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0e1a]/80 backdrop-blur border-b border-[#2d3561]/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/home')} title="Back to Home" className="text-[#9ca3af] hover:text-white p-1 rounded-md hover:bg-white/5"><ArrowLeft size={18} /></button>
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <span className="text-sm text-[#9ca3af]">Capture</span>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
        {/* Capture CTA */}
        {!captured && (
          <div className="flex items-center justify-center">
            <button
              onClick={handleCapture}
              className="relative h-40 w-40 rounded-full bg-[#1a1f3a] border border-[#2d3561] shadow-[0_0_40px_rgba(99,102,241,0.35)] hover:shadow-[0_0_60px_rgba(139,92,246,0.45)] transition-all duration-300 flex items-center justify-center"
              title="Capture Snippet"
            >
              <CameraIcon className="w-16 h-16 text-[#8b5cf6]" />
              <span className="absolute inset-0 rounded-full ring-1 ring-[#6366f1]/40" />
            </button>
          </div>
        )}

        {/* Preview */}
        {captured && (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm text-[#9ca3af] mb-1">Title</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short title for this snippet"
                className="bg-[#1a1f3a] border-[#2d3561] text-white placeholder:text-[#4a5c8c] focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f3a]"
              />
            </div>
            <div className="rounded-xl bg-[#0b1022] border border-[#2d3561]/60 shadow-inner overflow-hidden">
              <div className="px-4 py-2 text-xs text-[#9ca3af] bg-[#121836] border-b border-[#2d3561]/40">Preview</div>
              <pre className="p-4 text-sm leading-6 overflow-x-auto text-[#e5e7eb]"><code>{captured}</code></pre>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Button
                onClick={saveNew}
                disabled={saving}
                className="bg-[#6366f1] hover:bg-[#8b5cf6] w-full sm:w-auto"
              >
                Save as New Context
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="flex-1 bg-[#1a1f3a] border border-[#2d3561] text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[#6366f1]"
                >
                  <option value="">Select existing context…</option>
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.snippet?.slice(0, 30) || `Context ${c.id}`}
                    </option>
                  ))}
                </select>
                <Button onClick={saveExisting} disabled={!selectedId || saving} variant="secondary" className="bg-[#374151] hover:bg-[#4b5563] text-white">
                  Save to Existing
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success toast-ish banner */}
        {showSuccess && (
          <div className="animate-fade-in-up text-center text-sm text-white bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg py-2">
            ✅ Snippet saved to Velto
          </div>
        )}
        <BottomNav />
      </div>

      <style jsx global>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 300ms ease-out; }
      `}</style>
    </div>
  );
}
