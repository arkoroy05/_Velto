"use client";

import { Card, CardContent } from "@/components/ui/card";

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

export function ContextCard({ item, onOpen, onReplay, onEdit, onDelete }) {
  const { id, displayTitle, snippet, source, time } = item;
  return (
    <Card className="bg-[#1e2642] border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Title and meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate text-white">{displayTitle}</h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                  (SOURCE_STYLES[source]?.bg || "bg-[#374151]") +
                  " " +
                  (SOURCE_STYLES[source]?.text || "text-[#9ca3af]") +
                  " " +
                  (SOURCE_STYLES[source]?.ring || "ring-1 ring-[#374151]")
                }`}
              >
                {source}
              </span>
            </div>
            {snippet ? (
              <p className="text-sm text-[#9ca3af] mt-1 line-clamp-2">{snippet}</p>
            ) : null}
            {time ? <p className="text-xs text-[#4a5c8c] mt-1">{time}</p> : null}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            <button
              title="Replay"
              className="text-[#9ca3af] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
              onClick={() => onReplay?.(id)}
            >
              ▶
            </button>
            <button
              title="Edit"
              className="text-[#9ca3af] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
              onClick={() => onEdit?.(id)}
            >
              ✏
            </button>
            <button
              title="Delete"
              className="text-[#ef4444] hover:text-white px-2 py-1 rounded-md hover:bg-white/5"
              onClick={() => onDelete?.(id)}
            >
              🗑
            </button>
          </div>
        </div>

        {/* Click area to open detail */}
        <button
          className="mt-3 w-full text-left text-sm text-[#8b5cf6] hover:underline"
          onClick={() => onOpen?.(id)}
        >
          Open details →
        </button>
      </CardContent>
    </Card>
  );
}
