"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Archive,
  Code,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react"
import type { Context } from "@/components/dashboard/types"
import { getStatusColor } from "@/components/dashboard/utils"
import ContextDetailView from "./ContextDetailView"
import ModularCard from "@/components/dashboard/ModularCard"

interface AllContextsProps {
  contexts: Context[]
  isLoading: boolean
  onAction: (action: string, contextId: string) => void
}

export default function AllContexts({ contexts, isLoading, onAction }: AllContextsProps) {
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null)

  if (selectedContextId) {
    return (
      <ContextDetailView
        contextId={selectedContextId}
        onBack={() => setSelectedContextId(null)}
      />
    )
  }
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Active Projects</h1>
          <p className="text-gray-400">Manage and organize your AI conversation contexts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent"
            disabled={isLoading}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={`ctx-skel-${i}`} className="h-44 rounded-xl bg-[#1a1a1a] border border-[#333333] animate-pulse" />
            ))
          : contexts.map((context) => (
              <ModularCard
                key={context.id}
                icon={context.icon as any}
                iconColor={context.color as any}
                title={context.name}
                subtitle={context.aiModel}
                badges={context.tags}
                onClick={() => setSelectedContextId(context.id)}
                actions={[
                  { label: "View", icon: Eye, onClick: () => setSelectedContextId(context.id) },
                  { label: "Re-Analyze", icon: RefreshCw, onClick: () => onAction("analyze", context.id) },
                ]}
                menuActions={[
                  { label: "Generate Prompt", icon: Code, onClick: () => onAction("generate", context.id) },
                  { label: "Export", icon: Download, onClick: () => console.log(`[v0] Export ${context.id}`) },
                  { label: "Archive", icon: Archive, onClick: () => console.log(`[v0] Archive ${context.id}`) },
                  { label: "Delete", icon: Trash2, destructive: true, onClick: () => onAction("delete", context.id) },
                ]}
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {context.created} • {context.snippets} snippets • {context.size}
                  </span>
                  <Badge variant="secondary" className={getStatusColor(context.status)}>
                    {context.status}
                  </Badge>
                </div>
              </ModularCard>
            ))}
      </div>
    </div>
  )
}
