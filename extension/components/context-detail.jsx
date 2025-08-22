"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, ArrowLeft, RotateCw, Play, Pencil } from "lucide-react";

const SOURCE_STYLES = {
  Claude: { bg: "bg-[#10b981]/15", text: "text-[#10b981]", ring: "ring-1 ring-[#10b981]/25" },
  ChatGPT: { bg: "bg-[#6366f1]/15", text: "text-[#6366f1]", ring: "ring-1 ring-[#6366f1]/25" },
  Cursor: { bg: "bg-[#8b5cf6]/15", text: "text-[#8b5cf6]", ring: "ring-1 ring-[#8b5cf6]/25" },
};

export default function ContextDetail() {
  const router = useRouter();
  const params = useParams();
  const { id } = params || {};

  const [meta, setMeta] = useState({ title: "", source: "Cursor", tags: ["snippet"], ts: Date.now() });
  const [snippets, setSnippets] = useState([]); // array of {id, lang, code, ts}
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // session guard
  useEffect(() => {
    const session = typeof window !== "undefined" && localStorage.getItem("velto-session");
    if (!session) router.push("/");
  }, [router]);

  // load mock
  useEffect(() => {
    const now = Date.now();
    const ctx = {
      id: String(id),
      title: "Prompt engineering tips",
      source: "Claude",
      tags: ["prompt", "tips"],
      ts: now - 1000 * 60 * 40,
      logs: [
        {
          id: "s1",
          lang: "js",
          code: "function greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet('Velto'));",
          ts: now - 1000 * 60 * 39,
        },
        {
          id: "s2",
          lang: "bash",
          code: "curl -X POST https://api.example.com/analyze -d '{\"text\":\"hello\"}'",
          ts: now - 1000 * 60 * 30,
        },
      ],
    };
    setMeta({ title: ctx.title, source: ctx.source, tags: ctx.tags, ts: ctx.ts });
    setSnippets(ctx.logs);
    setTitleDraft(ctx.title);
  }, [id]);

  const time = useMemo(() => new Date(meta.ts).toLocaleString(), [meta.ts]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1600);
  };

  const saveTitle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/v1/contexts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft }),
      });
      setMeta((m) => ({ ...m, title: titleDraft }));
      setEditingTitle(false);
      showToast("Title updated");
    } finally {
      setBusy(false);
    }
  };

  const addSnippet = async () => {
    setBusy(true);
    try {
      const newItem = {
        id: `s${Math.floor(Math.random() * 10000)}`,
        lang: "js",
        code: "// New snippet\nconsole.log('Edit me');",
        ts: Date.now(),
      };
      setSnippets((arr) => [newItem, ...arr]);
      await fetch(`/api/v1/contexts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ snippet: newItem.code }) });
      showToast("Snippet added");
    } finally {
      setBusy(false);
    }
  };

  const reAnalyze = async () => {
    setBusy(true);
    try {
      await fetch(`/api/v1/contexts/${id}/analyze`, { method: "POST" });
      showToast("Re-analysis started");
    } finally {
      setBusy(false);
    }
  };

  const promptVersion = async () => {
    setBusy(true);
    try {
      await fetch(`/api/v1/contexts/${id}/prompt-version`, { method: "POST" });
      showToast("Prompt version created");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-[#0a0e1a]/80 backdrop-blur border-b border-[#2d3561]/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-semibold cursor-pointer" onClick={() => router.push("/home")}>
            <Brain className="w-5 h-5 text-[#8b5cf6]" /> <span>Velto</span>
          </div>
          <Button variant="ghost" className="text-[#9ca3af] hover:text-white p-2" onClick={() => router.push("/home")} title="Back to Home">
            <ArrowLeft size={18} />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          {editingTitle ? (
            <div className="flex items-center gap-2 w-full">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="bg-[#1a1f3a] border-[#2d3561] text-white max-w-xl"
              />
              <Button className="bg-[#6366f1] hover:bg-[#8b5cf6]" onClick={saveTitle} disabled={busy}>Save</Button>
              <Button variant="ghost" className="text-[#9ca3af]" onClick={() => setEditingTitle(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{meta.title || "Untitled"}</h1>
              <button className="text-[#9ca3af] hover:text-white text-sm px-2 py-1 rounded-full hover:bg-white/5 flex items-center gap-1" onClick={() => setEditingTitle(true)}>
                <Pencil size={14} /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${SOURCE_STYLES[meta.source]?.bg} ${SOURCE_STYLES[meta.source]?.text} ${SOURCE_STYLES[meta.source]?.ring}`}>{meta.source}</span>
          <div className="flex items-center gap-2">
            {meta.tags?.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-[#1a1f3a] border border-[#2d3561] text-[#9ca3af]">#{t}</span>
            ))}
          </div>
          <span className="text-[#4a5c8c]">{time}</span>
        </div>

        {/* Thread layout: snippets/logs */}
        <Card className="bg-[#0b1022] border border-[#2d3561]/50 rounded-xl shadow-inner">
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#1a1f3a]">
              {snippets.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="text-xs text-[#9ca3af] mb-2">{new Date(s.ts).toLocaleString()}</div>
                  <pre className="whitespace-pre-wrap text-sm leading-6 font-mono text-[#e5e7eb] bg-[#0b1022] p-3 rounded-lg border border-[#2d3561]/40">
                    <code>{s.code}</code>
                  </pre>
                </div>
              ))}
              {snippets.length === 0 && (
                <div className="p-6 text-center text-[#9ca3af]">No snippets yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <button onClick={reAnalyze} disabled={busy} className="px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#2d3561] text-[#e5e7eb] hover:border-[#6366f1] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition flex items-center gap-1">
            <RotateCw size={14} /> Re-analyze
          </button>
          <button onClick={promptVersion} disabled={busy} className="px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#2d3561] text-[#e5e7eb] hover:border-[#6366f1] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition flex items-center gap-1">
            <Play size={14} /> Replay in another model
          </button>
          <button onClick={addSnippet} disabled={busy} className="px-3 py-1.5 rounded-full bg-[#1a1f3a] border border-[#2d3561] text-[#e5e7eb] hover:border-[#6366f1] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition flex items-center gap-1">
            <Pencil size={14} /> Edit / Add snippet
          </button>
        </div>

        {toast && (
          <div className="animate-fade-in-up text-center text-sm text-white bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg py-2">{toast}</div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 300ms ease-out; }
      `}</style>
    </div>
  );
}
