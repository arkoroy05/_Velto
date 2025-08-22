"use client"

import React from "react"
import {
  Brain,
  ChevronDown,
  Home,
  FileText,
  BarChart3,
  Code,
  Activity,
  Settings as SettingsIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getApiStatusColor } from "@/components/dashboard/utils"
import type { NavigationItem, Context, ApiStatus } from "@/components/dashboard/types"

interface SidebarProps {
  activeView: NavigationItem
  setActiveView: (view: NavigationItem) => void
  contexts: Context[]
  apiStatus: ApiStatus
}

export default function Sidebar({ activeView, setActiveView, contexts, apiStatus }: SidebarProps) {
  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col">
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Velto</span>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
        </div>
      </div>

      <div className="flex-1 p-2">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "dashboard" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("dashboard")}
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "contexts" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("contexts")}
          >
            <FileText className="w-4 h-4" />
            All Contexts
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "analysis" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("analysis")}
          >
            <BarChart3 className="w-4 h-4" />
            Analysis Results
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "prompts" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("prompts")}
          >
            <Code className="w-4 h-4" />
            Prompt Versions
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "analytics" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("analytics")}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 ${activeView === "settings" ? "text-white bg-[#2a2a2a]" : "text-gray-400"} hover:text-white hover:bg-[#2a2a2a]`}
            onClick={() => setActiveView("settings")}
          >
            <SettingsIcon className="w-4 h-4" />
            Settings
          </Button>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2">Quick Filters</div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => console.log("[v0] Filter: Recently Created")}
            >
              <Clock className="w-4 h-4" />
              Recently Created
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => console.log("[v0] Filter: Recently Analyzed")}
            >
              <CheckCircle className="w-4 h-4" />
              Recently Analyzed
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => console.log("[v0] Filter: Needs Analysis")}
            >
              <AlertCircle className="w-4 h-4" />
              Needs Analysis
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              onClick={() => console.log("[v0] Filter: Favorites")}
            >
              <Star className="w-4 h-4" />
              Favorites
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium text-gray-500 mb-2 px-2">Recent Contexts</div>
          <div className="space-y-1">
            {contexts.slice(0, 3).map((context) => (
              <Button
                key={context.id}
                variant="ghost"
                className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                onClick={() => {
                  setActiveView("contexts")
                  console.log(`[v0] Open context: ${context.name}`)
                }}
              >
                <div className={`w-4 h-4 bg-${context.color}-500 rounded-sm flex items-center justify-center`}>
                  <context.icon className="w-3 h-3 text-white" />
                </div>
                <span className="truncate">{context.name}</span>
              </Button>
            ))}
          </div>
        </div>

      </div>

      <div className="p-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${getApiStatusColor(apiStatus)}`}></div>
          <span className="text-xs text-gray-400">
            API Status: {apiStatus === "healthy" ? "Healthy" : apiStatus === "degraded" ? "Degraded" : "Offline"}
          </span>
          {apiStatus === "offline" && <WifiOff className="w-3 h-3 text-red-400" />}
          {apiStatus === "healthy" && <Wifi className="w-3 h-3 text-green-400" />}
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="bg-blue-600 text-white text-xs">D</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-300">Developer</span>
        </div>
      </div>
    </div>
  )
}
