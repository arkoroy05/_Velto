"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  CheckCircle,
  BarChart3,
  Code,
  Play,
  ArrowLeft,
} from "lucide-react"
import type { Context, AnalysisResult, PromptVersion, NavigationItem } from "@/components/dashboard/types"
import ReplayModal from "@/components/dashboard/ReplayModal"
import ModularCard from "@/components/dashboard/ModularCard"
import ContextDetailView from "@/components/dashboard/ContextDetailView"

interface DashboardHomeProps {
  contexts: Context[]
  analysisResults: AnalysisResult[]
  promptVersions: PromptVersion[]
  isLoading: boolean
  onSetActiveView: (view: NavigationItem) => void
}

export default function DashboardHome({
  contexts,
  analysisResults,
  promptVersions,
  isLoading,
  onSetActiveView,
}: DashboardHomeProps) {
  const [openContextId, setOpenContextId] = useState<string | null>(null)
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null)
  // If a project is opened, show detail with a back button
  if (selectedContextId) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => setSelectedContextId(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <ContextDetailView contextId={selectedContextId} onBack={() => setSelectedContextId(null)} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Replay Modal (JSON schema-driven) */}
      <ReplayModal
        open={!!openContextId}
        contextId={openContextId}
        onOpenChange={(o) => !o && setOpenContextId(null)}
      />
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">Overview of your active projects and activity</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModularCard icon={FileText} iconColor="blue" title="Total Contexts" value={contexts.length} />
        <ModularCard icon={CheckCircle} iconColor="green" title="Active Contexts" value={contexts.filter((c) => c.status === "Active").length} />
        <ModularCard icon={BarChart3} iconColor="purple" title="Analyzed" value={analysisResults.filter((a) => a.status === "Completed").length} />
        <ModularCard icon={Code} iconColor="amber" title="Prompt Versions" value={promptVersions.length} />
      </div>

      {/* Quick Actions */}
    

      {/* Active Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Active Projects</h2>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" onClick={() => onSetActiveView("contexts")}>View All</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={`mem-skel-${i}`} className="bg-[#1a1a1a] border-[#333333]">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-5 h-5 rounded bg-gray-700 animate-pulse mt-1" />
                      <div className="flex-1">
                        <div className="w-40 h-4 rounded bg-gray-700/70 animate-pulse mb-2" />
                        <div className="w-24 h-3 rounded bg-gray-700/50 animate-pulse" />
                      </div>
                    </div>
                    <div className="w-full h-4 rounded bg-gray-700/50 animate-pulse mb-3" />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="w-32 h-3 rounded bg-gray-700/40 animate-pulse" />
                      <div className="flex gap-2">
                        <div className="w-10 h-6 rounded bg-gray-700/40 animate-pulse" />
                        <div className="w-10 h-6 rounded bg-gray-700/40 animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : contexts.slice(0, 3).map((context) => (
                <ModularCard
                  key={context.id}
                  icon={context.icon as any}
                  iconColor={context.color as any}
                  title={context.name}
                  subtitle={context.aiModel}
                  badges={context.tags}
                  onClick={() => setSelectedContextId(context.id)}
                  actions={[
                    { label: "Replay", icon: Play, onClick: () => setOpenContextId(context.id) },
                    { label: "Share", onClick: () => console.log("[v0] Share") },
                  ]}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{context.created} • {context.snippets} snippets</span>
                    <Badge variant="secondary" className={`bg-${context.color}-600/20 text-${context.color}-400`}>Active</Badge>
                  </div>
                </ModularCard>
              ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <ModularCard title="Recent Context Activity" subtitle="Latest updates across your projects">
        <div className="space-y-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div className="flex items-start gap-3" key={`act-skel-${i}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
                  <div className="flex-1">
                    <div className="w-64 h-4 rounded bg-gray-700/70 animate-pulse mb-2" />
                    <div className="w-40 h-3 rounded bg-gray-700/50 animate-pulse" />
                  </div>
                  <div className="w-16 h-6 rounded bg-gray-700/60 animate-pulse" />
                </div>
              ))
            : contexts.slice(0, 3).map((context) => (
                <div className="flex items-start gap-3" key={`act-${context.id}`}>
                  <div className={`w-8 h-8 bg-${context.color}-600 rounded-full flex items-center justify-center`}>
                    <context.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">Context updated: "{context.name}"</div>
                    <div className="text-sm text-gray-400">{context.created} • {context.aiModel}</div>
                  </div>
                  <Badge variant="secondary" className={`bg-${context.color}-600/20 text-${context.color}-400`}>
                    Recent
                  </Badge>
                </div>
              ))}
        </div>
      </ModularCard>
    </div>
  )
}
