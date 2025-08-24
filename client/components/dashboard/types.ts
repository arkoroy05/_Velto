// Shared TypeScript types for the Velto Dashboard UI

import type { LucideIcon } from "lucide-react"

export type NavigationItem =
  | "dashboard"
  | "contexts"
  | "analysis"
  | "prompts"
  | "analytics"
  | "settings"
  | "swap"

export type ApiStatus = "healthy" | "degraded" | "offline"

export interface Context {
  id: string
  name: string
  type: string
  created: string
  lastAnalyzed: string
  status: string
  icon: LucideIcon
  color: string
  snippets: number
  aiModel: string
  tags: string[]
  size: string
}

export interface AnalysisResult {
  id: number
  contextName: string
  analysisType: string
  completedAt: string
  insights: number
  recommendations: number
  severity: string
  status: string
  aiModel: string
  processingTime: string
}

export interface PromptVersion {
  id: number
  name: string
  version: string
  contextId: number
  createdAt: string
  performance: number
  usage: number
  status: string
  aiModel: string
  category: string
}
