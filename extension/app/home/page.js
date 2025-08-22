"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain } from "lucide-react";
import BottomNav from "@/components/bottom-nav";

// Source badge colors based on extension/design.json palette
const SOURCE_STYLES = {
  Claude: {
    bg: "bg-[#10b981]/15",
    text: "text-[#10b981]",
    ring: "ring-1 ring-[#10b981]/25",
  },
  ChatGPT: {
    bg: "bg-[#6366f1]/15",
    text: "text-[#6366f1]",
    ring: "ring-1 ring-[#6366f1]/25",
  },
  Cursor: {
    bg: "bg-[#8b5cf6]/15",
    text: "text-[#8b5cf6]",
    ring: "ring-1 ring-[#8b5cf6]/25",
  },
};

export default function HomePage() {
  const router = useRouter();
  const [contexts, setContexts] = useState([]);

  // Mock session guard
  useEffect(() => {
    const session = typeof window !== "undefined" && localStorage.getItem("velto-session");
    if (!session) router.push("/");
  }, [router]);

  // Mock data for now
  useEffect(() => {
    const now = Date.now();
    const mock = [
      {
        id: "1",
        title: "Prompt engineering tips",
        snippet: "Try few-shot examples and iterate with feedback...",
        source: "Claude",
        ts: now - 1000 * 60 * 5,
      },
      {
        id: "2",
        title: "",
        snippet: "Refactor the auth middleware to support JWT rotation",
        source: "ChatGPT",
        ts: now - 1000 * 60 * 60,
      },
      {
        id: "3",
        title: "Debugging Next.js RSC hydration",
        snippet: "Ensure components marked 'use client' where needed.",
        source: "Cursor",
        ts: now - 1000 * 60 * 60 * 24,
      },
    ];
    setContexts(mock);
  }, []);

  const formatted = useMemo(
    () =>
      contexts.map((c) => ({
        ...c,
        displayTitle: c.title?.trim() || c.snippet?.slice(0, 60) || "Untitled",
        time: new Date(c.ts).toLocaleString(),
      })),
    [contexts]
  );

  const handleOpen = (id) => router.push(`/context/${id}`);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-[#0a0e1a]/80 backdrop-blur border-b border-[#2d3561]/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Brain className="w-6 h-6 text-[#8b5cf6]" />
            <span>Velto</span>
          </div>
          <Button
            onClick={() => alert("New Context (mock)")}
            className="bg-[#6366f1] hover:bg-[#8b5cf6] transition-transform hover:scale-[1.02]"
          >
            + New Context
          </Button>
        </div>
      </header>

      {/* Content List */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        <div className="h-[calc(100vh-68px)] overflow-y-auto pr-1 space-y-3">
          {formatted.map((c) => (
            <Card
              key={c.id}
              className="bg-[#1e2642] border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Title and meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate text-white">{c.displayTitle}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          (SOURCE_STYLES[c.source]?.bg || "bg-[#374151]") +
                          " " +
                          (SOURCE_STYLES[c.source]?.text || "text-[#9ca3af]") +
                          " " +
                          (SOURCE_STYLES[c.source]?.ring || "ring-1 ring-[#374151]")
                        }`}
                      >
                        {c.source}
                      </span>
                    </div>
                    <p className="text-sm text-[#9ca3af] mt-1 line-clamp-2">{c.snippet}</p>
                    <p className="text-xs text-[#4a5c8c] mt-1">{c.time}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      title="Replay"
                      className="text-[#9ca3af] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
                      onClick={() => alert("Replay context (mock)")}
                    >
                      ▶
                    </button>
                    <button
                      title="Edit"
                      className="text-[#9ca3af] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
                      onClick={() => alert("Edit context (mock)")}
                    >
                      ✏
                    </button>
                    <button
                      title="Delete"
                      className="text-[#ef4444] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
                      onClick={() => setContexts((prev) => prev.filter((x) => x.id !== c.id))}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Click area to open detail */}
                <button
                  className="mt-3 w-full text-left text-sm text-[#8b5cf6] hover:underline"
                  onClick={() => handleOpen(c.id)}
                >
                  Open details →
                </button>
              </CardContent>
            </Card>
          ))}

          {formatted.length === 0 && (
            <div className="text-center text-[#9ca3af] py-10">No contexts yet.</div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
