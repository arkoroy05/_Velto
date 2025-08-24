"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Archive,
  Code,
  Download,
  Edit,
  Eye,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Context } from "@/components/dashboard/types"
import { getStatusColor } from "@/components/dashboard/utils"
import ContextDetailView from "./ContextDetailView"

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

      <Card className="bg-[#1a1a1a] border-[#333333]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#333333]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Context Name</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">AI Model</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Snippets</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Size</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="border-b border-[#2a2a2a]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-gray-700 animate-pulse" />
                          <div className="w-40 h-4 rounded bg-gray-700/70 animate-pulse" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-20 h-5 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="w-24 h-4 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="w-12 h-4 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="w-16 h-4 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="w-32 h-4 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="w-16 h-5 rounded bg-gray-700/70 animate-pulse" />
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded bg-gray-700/70 animate-pulse" />
                          <div className="w-6 h-6 rounded bg-gray-700/70 animate-pulse" />
                          <div className="w-6 h-6 rounded bg-gray-700/70 animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  contexts.map((context) => (
                    <tr key={context.id} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors cursor-pointer" onClick={() => setSelectedContextId(context.id)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <context.icon className={`w-4 h-4 text-${context.color}-400`} />
                          <div>
                            <div className="text-white font-medium">{context.name}</div>
                            <div className="text-xs text-gray-500 flex gap-1 mt-1">
                              {context.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs px-1 py-0 bg-gray-700/50 text-gray-400"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className={`bg-${context.color}-600/20 text-${context.color}-400`}>
                          {context.type}
                        </Badge>
                      </td>
                      <td className="p-4 text-gray-400">{context.aiModel}</td>
                      <td className="p-4 text-gray-400">{context.snippets}</td>
                      <td className="p-4 text-gray-400">{context.size}</td>
                      <td className="p-4 text-gray-400">{context.created}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={getStatusColor(context.status)}>
                          {context.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={() => setSelectedContextId(context.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white"
                            onClick={() => console.log(`[v0] Edit context ${context.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1a1a1a] border-[#333333]">
                              <DropdownMenuItem
                                className="text-gray-300 hover:bg-[#2a2a2a]"
                                onClick={() => onAction("analyze", context.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-Analyze
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-gray-300 hover:bg-[#2a2a2a]"
                                onClick={() => onAction("generate", context.id)}
                              >
                                <Code className="w-4 h-4 mr-2" />
                                Generate Prompt
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-[#2a2a2a]">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-gray-300 hover:bg-[#2a2a2a]">
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-[#2a2a2a]"
                                onClick={() => onAction("delete", context.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
