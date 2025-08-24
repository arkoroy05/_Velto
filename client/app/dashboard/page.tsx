"use client"

import { useState, useEffect } from "react"
import {
  Home,
  Settings,
  Plus,
  BarChart3,
  FileText,
  Zap,
  Upload,
  Eye,
  Edit,
  MoreHorizontal,
  Brain,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Code,
  Rocket,
  Filter,
  Star,
  ChevronDown,
  Trash2,
  RefreshCw,
  Play,
  TrendingUp,
  Calendar,
  Download,
  Share,
  Copy,
  Archive,
  GitBranch,
  Database,
  Palette,
  LineChart,
  PieChart,
  BarChart,
  Target,
  CloudLightning as Lightning,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import Sidebar from "@/components/dashboard/Sidebar"
import Topbar from "@/components/dashboard/Topbar"
import { getStatusColor, getSeverityColor } from "@/components/dashboard/utils"
import type { NavigationItem, ApiStatus, Context } from "@/components/dashboard/types"
import api, { type BackendContext } from "@/lib/api"
import DashboardHome from "@/components/dashboard/DashboardHome"
import AllContexts from "@/components/dashboard/AllContexts"
import { Swap } from "@/components/sections/swap"
 

export default function VeltoDashboard() {
  const [activeView, setActiveView] = useState<NavigationItem>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>("healthy")

  const [contexts, setContexts] = useState<Context[]>([])

  const [analysisResults, setAnalysisResults] = useState([
    {
      id: 1,
      contextName: "Authentication Debug Session",
      analysisType: "Code Review",
      completedAt: "1 hour ago",
      insights: 8,
      recommendations: 5,
      severity: "Medium",
      status: "Completed",
      aiModel: "ChatGPT",
      processingTime: "2m 34s",
    },
    {
      id: 2,
      contextName: "API Performance Analysis",
      analysisType: "Performance Audit",
      completedAt: "3 hours ago",
      insights: 12,
      recommendations: 8,
      severity: "High",
      status: "Completed",
      aiModel: "Claude",
      processingTime: "4m 12s",
    },
    {
      id: 3,
      contextName: "React Hook Optimization",
      analysisType: "Code Optimization",
      completedAt: "Processing...",
      insights: 0,
      recommendations: 0,
      severity: "Low",
      status: "Processing",
      aiModel: "GPT-4",
      processingTime: "1m 45s",
    },
  ])

  const [promptVersions, setPromptVersions] = useState([
    {
      id: 1,
      name: "Debug Authentication Flow",
      version: "v2.3",
      contextId: 1,
      createdAt: "2 hours ago",
      performance: 94,
      usage: 156,
      status: "Active",
      aiModel: "ChatGPT",
      category: "Debugging",
    },
    {
      id: 2,
      name: "Optimize API Performance",
      version: "v1.8",
      contextId: 2,
      createdAt: "4 hours ago",
      performance: 87,
      usage: 89,
      status: "Active",
      aiModel: "Claude",
      category: "Performance",
    },
    {
      id: 3,
      name: "Refactor React Components",
      version: "v3.1",
      contextId: 3,
      createdAt: "1 day ago",
      performance: 91,
      usage: 234,
      status: "Deprecated",
      aiModel: "GPT-4",
      category: "Refactoring",
    },
  ])

 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("search-input")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.healthCheck()
        setApiStatus("healthy")
      } catch (e) {
        setApiStatus("offline")
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])


  const mapBackendToUI = (ctx: BackendContext): Context => {
    const id = (ctx._id || (ctx as any).id || "") as string
    const title = (ctx.title || (ctx as any).name || "Untitled") as string
    const createdAt = ctx.createdAt || ctx.updatedAt || new Date().toISOString()
    const snippetCount = Array.isArray(ctx.snippets) ? ctx.snippets.length : 0
    const type = ctx.type || ctx.source?.type || "Context"
    const size = ctx.content ? `${Math.ceil(ctx.content.length / 1024)} KB` : "-"

    // Keep colors constrained to existing classes used elsewhere
    const color: Context["color"] = "blue"

    return {
      id,
      name: title,
      type,
      created: new Date(createdAt).toLocaleString(),
      lastAnalyzed: "-",
      status: "Active",
      icon: Brain,
      color,
      snippets: snippetCount,
      aiModel: ctx.metadata?.aiModel || "-",
      tags: Array.isArray((ctx as any).tags) ? ((ctx as any).tags as string[]) : [],
      size,
    }
  }

  const loadContexts = async () => {
    setIsLoading(true)
    try {
      const res: any = await api.getContexts({ limit: 100 })
      const list: BackendContext[] = Array.isArray(res)
        ? res
        : (res?.data && Array.isArray(res.data))
        ? res.data
        : []
      // Sort by most recent timestamp (updatedAt, then createdAt)
      const ts = (d?: string) => (d ? new Date(d).getTime() : 0)
      const getTs = (c: BackendContext) => ts(c.updatedAt) || ts(c.createdAt)
      const sorted = [...list].sort((a, b) => getTs(b) - getTs(a))
      setContexts(sorted.map(mapBackendToUI))
    } catch (e) {
      console.warn("Failed to load contexts", e)
      setContexts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial data load
    loadContexts()
  }, [])

  const handleContextAction = async (action: string, contextId: string) => {
    setIsLoading(true)
    try {
      if (action === "delete") {
        await api.deleteContext(contextId)
        setContexts((prev) => prev.filter((c) => c.id !== contextId))
      } else if (action === "analyze") {
        setContexts((prev) => prev.map((c) => (c.id === contextId ? { ...c, status: "Processing" } : c)))
        await api.analyzeContext(contextId)
        await loadContexts()
      } else if (action === "generate") {
        await api.generatePromptVersion(contextId)
        await loadContexts()
      }
    } catch (e) {
      console.error("Action failed", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateContext = async () => {
    setIsLoading(true)
    try {
      await api.createContext({
        title: "New Context",
        content: "New context created from dashboard.",
        type: "manual",
        source: { type: "manual", agentId: "dashboard" },
        metadata: { createdBy: "dashboard" },
      })
      await loadContexts()
    } catch (e) {
      console.error("Create context failed", e)
    } finally {
      setIsLoading(false)
    }
  }

  // Removed legacy inline AllContexts and duplicate renderCurrentView from previous refactor

  const renderAnalysisResults = () => (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Analysis Results</h1>
          <p className="text-gray-400">Review AI-generated insights and recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {analysisResults.filter((a) => a.status === "Completed").length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {analysisResults.filter((a) => a.status === "Processing").length}
                </div>
                <div className="text-sm text-gray-400">Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {analysisResults.reduce((acc, a) => acc + a.insights, 0)}
                </div>
                <div className="text-sm text-gray-400">Total Insights</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1a1a] border-[#333333]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#333333]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Context</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Analysis Type</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">AI Model</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Insights</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Recommendations</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Severity</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Processing Time</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.map((result) => (
                  <tr key={result.id} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                    <td className="p-4">
                      <div className="text-white font-medium">{result.contextName}</div>
                      <div className="text-xs text-gray-500">{result.completedAt}</div>
                    </td>
                    <td className="p-4 text-gray-400">{result.analysisType}</td>
                    <td className="p-4 text-gray-400">{result.aiModel}</td>
                    <td className="p-4 text-white font-medium">{result.insights}</td>
                    <td className="p-4 text-white font-medium">{result.recommendations}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className={getSeverityColor(result.severity)}>
                        {result.severity}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-400">{result.processingTime}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => console.log(`[v0] View analysis ${result.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => console.log(`[v0] Download analysis ${result.id}`)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => console.log(`[v0] Share analysis ${result.id}`)}
                        >
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPromptVersions = () => (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Prompt Versions</h1>
          <p className="text-gray-400">Manage and track your AI prompt iterations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent">
            <GitBranch className="w-4 h-4 mr-2" />
            Compare Versions
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {promptVersions.map((prompt) => (
          <Card key={prompt.id} className="bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">{prompt.name}</CardTitle>
                <Badge variant="secondary" className={getStatusColor(prompt.status)}>
                  {prompt.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Code className="w-4 h-4" />
                <span>{prompt.version}</span>
                <span>•</span>
                <span>{prompt.aiModel}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Performance</span>
                  <span className="text-sm text-white font-medium">{prompt.performance}%</span>
                </div>
                <Progress value={prompt.performance} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Usage: {prompt.usage} times</span>
                  <Badge variant="secondary" className="bg-purple-600/20 text-purple-400">
                    {prompt.category}
                  </Badge>
                </div>

                <div className="text-xs text-gray-500">{prompt.createdAt}</div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white flex-1">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white flex-1">
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white flex-1">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Track performance and usage metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent">
            <Calendar className="w-4 h-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="border-[#333333] text-gray-300 hover:bg-[#1a1a1a] bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">847</div>
                <div className="text-sm text-gray-400">Total Queries</div>
                <div className="text-xs text-green-400">+12% from last month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">94.2%</div>
                <div className="text-sm text-gray-400">Success Rate</div>
                <div className="text-xs text-green-400">+2.1% from last month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">2.4s</div>
                <div className="text-sm text-gray-400">Avg Response Time</div>
                <div className="text-xs text-red-400">+0.3s from last month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                <Lightning className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">156</div>
                <div className="text-sm text-gray-400">Active Contexts</div>
                <div className="text-xs text-green-400">+8% from last month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Usage Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chart visualization would go here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              AI Model Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-300">ChatGPT</span>
                </div>
                <span className="text-white font-medium">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-300">Claude</span>
                </div>
                <span className="text-white font-medium">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-300">GPT-4</span>
                </div>
                <span className="text-white font-medium">20%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1a1a] border-[#333333]">
        <CardHeader>
          <CardTitle className="text-white">Top Performing Contexts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contexts.slice(0, 3).map((context, index) => (
              <div key={context.id} className="flex items-center gap-4 p-3 bg-[#0f0f0f] rounded-lg">
                <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                <context.icon className={`w-5 h-5 text-${context.color}-400`} />
                <div className="flex-1">
                  <div className="text-white font-medium">{context.name}</div>
                  <div className="text-sm text-gray-400">
                    {context.snippets} snippets • {context.aiModel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">98.{index + 1}%</div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your Velto dashboard preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#1a1a1a] border-[#333333]">
          <TabsTrigger value="general" className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white">
            General
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white">
            Integrations
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Dark Mode</div>
                  <div className="text-sm text-gray-400">Use dark theme across the dashboard</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Auto-save Contexts</div>
                  <div className="text-sm text-gray-400">Automatically save context changes</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Real-time Updates</div>
                  <div className="text-sm text-gray-400">Show live updates for context changes</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="space-y-2">
                <label className="text-white font-medium">Default AI Model</label>
                <select className="w-full p-2 bg-[#2a2a2a] border border-[#333333] rounded text-white">
                  <option>ChatGPT</option>
                  <option>Claude</option>
                  <option>GPT-4</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white">AI Model Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-sm">🤖</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">ChatGPT</div>
                      <div className="text-sm text-gray-400">Connected • Last sync: 5m ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <Button variant="outline" size="sm" className="border-[#333333] text-gray-300 bg-transparent">
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-sm">🧠</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">Claude</div>
                      <div className="text-sm text-gray-400">Connected • Last sync: 2m ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <Button variant="outline" size="sm" className="border-[#333333] text-gray-300 bg-transparent">
                      Configure
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0f0f0f] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-sm">⚡</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">GPT-4</div>
                      <div className="text-sm text-gray-400">Not connected</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Analysis Complete</div>
                  <div className="text-sm text-gray-400">Notify when context analysis finishes</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">New Context Created</div>
                  <div className="text-sm text-gray-400">Notify when new contexts are added</div>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">API Status Changes</div>
                  <div className="text-sm text-gray-400">Notify about API health status</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Weekly Reports</div>
                  <div className="text-sm text-gray-400">Receive weekly analytics summaries</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-white font-medium">API Keys</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder="ChatGPT API Key"
                        className="bg-[#2a2a2a] border-[#333333] text-white"
                        defaultValue="sk-••••••••••••••••••••••••••••••••"
                      />
                      <Button variant="outline" size="sm" className="border-[#333333] text-gray-300 bg-transparent">
                        Update
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        placeholder="Claude API Key"
                        className="bg-[#2a2a2a] border-[#333333] text-white"
                        defaultValue="sk-••••••••••••••••••••••••••••••••"
                      />
                      <Button variant="outline" size="sm" className="border-[#333333] text-gray-300 bg-transparent">
                        Update
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-400">Add extra security to your account</div>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                    Enable
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Session Timeout</div>
                    <div className="text-sm text-gray-400">Auto-logout after inactivity</div>
                  </div>
                  <select className="p-2 bg-[#2a2a2a] border border-[#333333] rounded text-white">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )

  const renderCurrentView = () => {
    switch (activeView) {
      case "contexts":
        return (
          <AllContexts
            contexts={contexts}
            isLoading={isLoading}
            onAction={handleContextAction}
          />
        )
      case "swap":
        return <Swap />
      default:
        return (
          <DashboardHome
            contexts={contexts}
            analysisResults={analysisResults}
            promptVersions={promptVersions}
            isLoading={isLoading}
            onSetActiveView={setActiveView}
          />
        )
    }
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
      {/* Left Sidebar */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} contexts={contexts} apiStatus={apiStatus} isLoading={isLoading} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Topbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewContext={handleCreateContext}
          isLoading={isLoading}
        />

        <div className="flex-1 p-6 overflow-auto bg-[#0f0f0f]">{renderCurrentView()}</div>
      </div>
    </div>
  )
}
