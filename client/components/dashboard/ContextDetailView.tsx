"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  CheckCircle,
  Brain,
  Calendar,
  FileText,
  Tag,
  Globe,
  User,
} from "lucide-react"
import api, { type BackendContext } from "@/lib/api"

interface ContextDetailViewProps {
  contextId: string
  onBack: () => void
}

// Lightweight Markdown renderer similar to extension
function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(md: string) {
  if (!md) return '';
  
  // Preserve code fences first
  const codeBlocks: string[] = [];
  md = md.replace(/```([\s\S]*?)```/g, (m, p1) => {
    codeBlocks.push(`<pre style="background: rgba(17,24,39,0.7); border:1px solid #374151; padding:12px; border-radius:8px; overflow:auto; color:#e5e7eb;"><code>${escapeHtml(p1.trim())}</code></pre>`);
    return `§§CODEBLOCK_${codeBlocks.length - 1}§§`;
  });

  // Escape everything else
  md = escapeHtml(md);

  // Headings
  md = md.replace(/^######\s?(.*)$/gm, '<h6 style="margin:8px 0; font-size:12px; color:#d1d5db;">$1</h6>')
         .replace(/^#####\s?(.*)$/gm, '<h5 style="margin:8px 0; font-size:13px; color:#e5e7eb;">$1</h5>')
         .replace(/^####\s?(.*)$/gm, '<h4 style="margin:10px 0; font-size:14px; color:#fff; font-weight:600;">$1</h4>')
         .replace(/^###\s?(.*)$/gm, '<h3 style="margin:12px 0; font-size:15px; color:#fff; font-weight:600;">$1</h3>')
         .replace(/^##\s?(.*)$/gm, '<h2 style="margin:14px 0; font-size:16px; color:#fff; font-weight:700;">$1</h2>')
         .replace(/^#\s?(.*)$/gm, '<h1 style="margin:16px 0; font-size:18px; color:#fff; font-weight:700;">$1</h1>');

  // Bold, italics, inline code
  md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
         .replace(/\*(.*?)\*/g, '<em>$1</em>')
         .replace(/`([^`]+)`/g, '<code style="background: rgba(17,24,39,0.7); border:1px solid #374151; padding:2px 6px; border-radius:4px; color:#e5e7eb;">$1</code>');

  // Markdown links: [text](url)
  md = md.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#60a5fa; text-decoration:underline; word-break:break-all;">$1<\/a>');

  // Auto-link bare URLs, avoiding ones already inside href attributes
  md = md.replace(/(https?:\/\/[^\s<]+)/g, (m, _p1, offset, full) => {
    const prev = full.slice(Math.max(0, offset - 7), offset) // check for 'href="'
    if (/href=\"$/i.test(prev)) return m // already a link attribute
    return `<a href="${m}" target="_blank" rel="noopener noreferrer" style="color:#60a5fa; text-decoration:underline; word-break:break-all;">${m}<\/a>`
  });

  // Horizontal rules (---)
  md = md.replace(/^---$/gm, '<hr style="border-color:#374151; opacity:0.6; margin:12px 0;" \/>');

  // Lists
  md = md.replace(/^(\s*)-\s+(.*)$/gm, '$1• $2');

  // Newlines to paragraphs
  md = md.split(/\n{2,}/).map(p => `<p style="margin:8px 0; line-height:1.6; color:#e5e7eb;">${p.replace(/\n/g, '<br/>')}</p>`).join('');

  // Restore code blocks
  md = md.replace(/§§CODEBLOCK_(\d+)§§/g, (_, i) => codeBlocks[Number(i)] || '');

  return md;
}

export default function ContextDetailView({ contextId, onBack: _onBack }: ContextDetailViewProps) {
  const [context, setContext] = useState<BackendContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  const isUrl = (s: string) => /^https?:\/\//i.test(s)
  const renderMetaValue = (key: string, value: any) => {
    if (typeof value === 'string' && isUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline break-all hover:text-blue-300"
        >
          {value}
        </a>
      )
    }
    if (typeof value === 'object') {
      try {
        return <span className="text-white break-all">{JSON.stringify(value)}</span>
      } catch {
        return <span className="text-white break-all">{String(value)}</span>
      }
    }
    return <span className="text-white break-all">{String(value)}</span>
  }

  useEffect(() => {
    const loadContext = async () => {
      setIsLoading(true)
      try {
        const res = await api.getContextById(contextId)
        // Unwrap API response if it's in the shape { success, data }
        const ctx = res && typeof res === 'object' && 'data' in (res as any)
          ? (res as any).data
          : res
        setContext(ctx as BackendContext)
      } catch (error) {
        console.error('Failed to load context:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadContext()
  }, [contextId])

  const handleCopyPrompt = async () => {
    if (!context?.content) return
    
    try {
      await navigator.clipboard.writeText(context.content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="w-80 h-7 bg-gray-700 animate-pulse rounded mb-2" />
            <div className="w-40 h-4 bg-gray-700/70 animate-pulse rounded" />
          </div>
          <div className="w-28 h-9 bg-gray-700/70 animate-pulse rounded" />
        </div>
        <div className="space-y-6">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <div className="w-32 h-5 bg-gray-700/80 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="w-full h-64 bg-gray-700/50 animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-[#1a1a1a] border-[#333333]">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400">Context not found</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prefer tags from metadata.tags, otherwise fall back to top-level tags when present
  const resolvedTags: string[] = Array.isArray(context.metadata?.tags)
    ? (context.metadata!.tags as string[])
    : (Array.isArray((context as any).tags) ? (context as any).tags as string[] : [])

  // Header title with timestamp like: Title - 8/24/2025, 3:19:38 AM
  const headerTitle = `${context.title || 'Untitled Context'}${context.createdAt ? ` - ${new Date(context.createdAt).toLocaleString()}` : ''}`

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
        <div className="min-w-0 pr-4">
          <h1 className="text-2xl font-semibold text-white truncate" title={headerTitle}>
            {headerTitle}
          </h1>
          <p className="text-gray-400">Context Details</p>
        </div>
        
        <Button
          onClick={handleCopyPrompt}
          className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
          disabled={!context.content}
        >
          {copySuccess ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Prompt
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 py-4 overflow-hidden">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="bg-[#0f172a]/60 border border-[#374151] rounded-xl p-4 h-full text-[14px] leading-relaxed text-gray-200 overflow-y-auto">
                <div 
                  className="prose prose-invert max-w-none [&_a]:text-blue-400 [&_a]:underline [&_a]:break-all"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(context.content || 'No content available')
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 overflow-y-auto">
          {/* Metadata */}
          <Card className="bg-[#1a1a1a] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">Type:</span>
                <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                  {context.type || 'Context'}
                </Badge>
              </div>
              
              {context.source?.type && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">Source:</span>
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                    {context.source.type}
                  </Badge>
                </div>
              )}
              
              {context.source?.agentId && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">Agent:</span>
                  <span className="text-white">{context.source.agentId}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400">Created:</span>
                <span className="text-white">
                  {context.createdAt ? new Date(context.createdAt).toLocaleString() : 'Unknown'}
                </span>
              </div>
              
              {context.updatedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-gray-400">Updated:</span>
                  <span className="text-white">
                    {new Date(context.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {resolvedTags.length > 0 && (
            <Card className="bg-[#1a1a1a] border-[#333333]">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {resolvedTags.map((tag: string, index: number) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-700/50 text-gray-300"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Metadata */}
          {context.metadata && Object.keys(context.metadata).length > 0 && (
            <Card className="bg-[#1a1a1a] border-[#333333]">
              <CardHeader>
                <CardTitle className="text-white text-sm">Additional Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(context.metadata).map(([key, value]) => {
                  if (key === 'tags') return null // Already shown above
                  return (
                    <div key={key} className="text-sm">
                      <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="ml-2">
                        {renderMetaValue(key, value)}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
