"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ContextCard } from "@/components/context-card";
import { Brain, ArrowLeft } from "lucide-react";
import BottomNav from "@/components/bottom-nav";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Session guard for extension flow
  useEffect(() => {
    const session = typeof window !== "undefined" && localStorage.getItem("velto-session");
    if (!session) router.push("/");
  }, [router]);

  // Debounced search
  useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/contexts?query=${encodeURIComponent(query)}`, {
          method: "GET",
          signal: controller.signal,
        });
        const json = await res.json();
        const formatted = (json.items || []).map((c) => ({
          ...c,
          displayTitle: c.title?.trim() || c.snippet?.slice(0, 60) || "Untitled",
          time: new Date(c.ts).toLocaleString(),
        }));
        setItems(formatted);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [query]);

  const empty = useMemo(() => !loading && items.length === 0, [loading, items]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Top search bar with back */}
      <div className="p-4 bg-gradient-to-b from-[#1a1f3a]/60 to-transparent border-b border-[#2d3561]/40 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/home')} title="Back to Home" className="text-[#9ca3af] hover:text-white p-1 rounded-md hover:bg-white/5"><ArrowLeft size={18} /></button>
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <div className="w-full">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contexts..."
              className="w-full bg-[#1a1f3a] border-[#2d3561] text-white placeholder:text-[#4a5c8c] focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f3a]"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto p-3 space-y-3 overflow-y-auto" style={{ minHeight: "calc(100vh - 120px)" }}>
        {loading && (
          <div className="text-[#9ca3af] text-sm px-1">Searching…</div>
        )}
        {empty && (
          <div className="text-[#9ca3af] text-sm px-1">No results.</div>
        )}
        {items.map((item) => (
          <ContextCard
            key={item.id}
            item={item}
            onOpen={(id) => router.push(`/context/${id}`)}
            onReplay={() => alert("Replay (mock)")}
            onEdit={() => alert("Edit (mock)")}
            onDelete={() => alert("Delete (mock)")}
          />
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
