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
  Rocket,
  Upload,
  Zap,
  Play,
} from "lucide-react"
import type { Context, AnalysisResult, PromptVersion, NavigationItem } from "@/components/dashboard/types"
import ReplayModal from "@/components/dashboard/ReplayModal"

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
  return (
    <div className="max-w-7xl mx-auto">
      {/* Replay Modal (JSON schema-driven) */}
      <ReplayModal
        open={!!openContextId}
        contextId={openContextId}
        onOpenChange={(o) => !o && setOpenContextId(null)}
      />
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Welcome back, Developer</h1>
        <p className="text-gray-400">Manage your AI context threads and analyze conversations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{contexts.length}</div>
                <div className="text-sm text-gray-400">Total Contexts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {contexts.filter((c) => c.status === "Active").length}
                </div>
                <div className="text-sm text-gray-400">Active Contexts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {analysisResults.filter((a) => a.status === "Completed").length}
                </div>
                <div className="text-sm text-gray-400">Recently Analyzed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{promptVersions.length}</div>
                <div className="text-sm text-gray-400">Prompt Versions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent"
            onClick={() => console.log("[v0] Quick import")}
            disabled={isLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Quick Import
          </Button>
          <Button
            variant="outline"
            className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent"
            onClick={() => console.log("[v0] Analyze all contexts")}
            disabled={isLoading}
          >
            <Zap className="w-4 h-4 mr-2" />
            Analyze All
          </Button>
          <Button
            variant="outline"
            className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent"
            onClick={() => console.log("[v0] Generate prompts")}
            disabled={isLoading}
          >
            <Code className="w-4 h-4 mr-2" />
            Generate Prompts
          </Button>
        </div>
      </div>

      {/* Active Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Projects</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            onClick={() => onSetActiveView("contexts")}
          >
            View All
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                <Card key={context.id} className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <context.icon className={`w-5 h-5 text-${context.color}-400 mt-1`} />
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{context.name}</h3>
                        <p className="text-sm text-gray-400">{context.aiModel}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      {context.type === "Debug" && "Fixed authentication error in React hook..."}
                      {context.type === "Performance" && "Optimized API response times by 40%..."}
                      {context.type === "Optimization" && "Refactored custom hooks for better performance..."}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {context.created} • {context.snippets} snippets
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => setOpenContextId(context.id)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Replay
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Context Activity</h2>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            Refresh
          </Button>
        </div>
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
