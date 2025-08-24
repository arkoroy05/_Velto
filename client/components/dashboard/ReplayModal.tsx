"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import api, { type BackendContext } from "@/lib/api"
import profile from "@/app/JSON.json"
import { Copy, CheckCircle, Play, X, Bold, Italic, Underline, Code, Type, AlignLeft, AlignCenter, AlignRight, Link, List } from "lucide-react"

// Lightweight Markdown renderer (same spirit as ContextDetailView)
function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function renderMarkdown(md: string) {
  if (!md) return ""

  const codeBlocks: string[] = []
  md = md.replace(/```([\s\S]*?)```/g, (m, p1) => {
    codeBlocks.push(
      `<pre style="background: rgba(17,24,39,0.7); border:1px solid #374151; padding:12px; border-radius:8px; overflow:auto; color:#e5e7eb;"><code>${escapeHtml(
        p1.trim()
      )}</code></pre>`
    )
    return `§§CODEBLOCK_${codeBlocks.length - 1}§§`
  })

  md = escapeHtml(md)
  md = md
    .replace(/^######\s?(.*)$/gm, '<h6 style="margin:8px 0; font-size:12px; color:#374151;">$1</h6>')
    .replace(/^#####\s?(.*)$/gm, '<h5 style="margin:8px 0; font-size:13px; color:#1f2937;">$1</h5>')
    .replace(/^####\s?(.*)$/gm, '<h4 style="margin:10px 0; font-size:14px; color:#111827; font-weight:600;">$1</h4>')
    .replace(/^###\s?(.*)$/gm, '<h3 style="margin:12px 0; font-size:15px; color:#111827; font-weight:600;">$1</h3>')
    .replace(/^##\s?(.*)$/gm, '<h2 style="margin:14px 0; font-size:16px; color:#111827; font-weight:700;">$1</h2>')
    .replace(/^#\s?(.*)$/gm, '<h1 style="margin:16px 0; font-size:18px; color:#111827; font-weight:700;">$1</h1>')

  md = md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code style=\"background:#f3f4f6;border:1px solid #e5e7eb;padding:2px 6px;border-radius:4px;color:#111827;\">$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline; word-break:break-all;">$1<\/a>')

  md = md.replace(/(https?:\/\/[^\s<]+)/g, (m, _p1, offset, full) => {
    const prev = full.slice(Math.max(0, offset - 7), offset)
    if (/href=\"$/i.test(prev)) return m
    return `<a href="${m}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline; word-break:break-all;">${m}<\/a>`
  })

  md = md.replace(/^---$/gm, '<hr style="border-color:#e5e7eb; opacity:0.8; margin:12px 0;" \/>')
  md = md.replace(/^(\s*)-\s+(.*)$/gm, "$1• $2")
  md = md
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:8px 0; line-height:1.65; color:#111827;">${p.replace(/\n/g, "<br/>")}</p>`) 
    .join("")

  md = md.replace(/§§CODEBLOCK_(\d+)§§/g, (_, i) => codeBlocks[Number(i)] || "")
  return md
}

function mergeStyles<T extends React.CSSProperties>(base?: T, override?: Partial<T>): T {
  return { ...(base || {}), ...(override || {}) } as T
}

type Theme = keyof typeof profile.variants.themes

interface ReplayModalProps {
  open: boolean
  contextId: string | null
  onOpenChange: (open: boolean) => void
}

export default function ReplayModal({ open, contextId, onOpenChange }: ReplayModalProps) {
  const isMobile = useIsMobile()
  const [theme] = useState<Theme>("dark")
  const [context, setContext] = useState<BackendContext | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (!contextId || !open) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.getContextById(contextId)
        const ctx = res && typeof res === "object" && "data" in (res as any) ? (res as any).data : res
        if (!cancelled) setContext(ctx as BackendContext)
      } catch (e) {
        console.error("Failed to load context", e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [contextId, open])

  const styles = useMemo(() => {
    const m = profile.modal as any
    const t = (profile.variants?.themes?.[theme] || {}) as Record<string, string>
    const r = (isMobile ? profile.responsive?.mobile : undefined) as Record<string, string> | undefined

    // Base
    const container: React.CSSProperties = { ...(m.container as React.CSSProperties) }
    const content: React.CSSProperties = { ...(m.content as React.CSSProperties) }
    const header: React.CSSProperties = { ...(m.header as React.CSSProperties) }
    const headerLeft: React.CSSProperties = { ...(m.headerLeft as React.CSSProperties) }
    const icon: React.CSSProperties = { ...(m.icon as React.CSSProperties) }
    const title: React.CSSProperties = { ...(m.title as React.CSSProperties) }
    const subtitle: React.CSSProperties = { ...(m.subtitle as React.CSSProperties) }
    const headerRight: React.CSSProperties = { ...(m.headerRight as React.CSSProperties) }
    const actionButton: React.CSSProperties = { ...(m.actionButton as React.CSSProperties) }
    const primaryButton: React.CSSProperties = mergeStyles(actionButton, m.primaryButton)
    const secondaryButton: React.CSSProperties = mergeStyles(actionButton, m.secondaryButton)
    const iconButton: React.CSSProperties = { ...(m.iconButton as React.CSSProperties) }
    const body: React.CSSProperties = { ...(m.body as React.CSSProperties) }
    const toolbar: React.CSSProperties = { ...(m.toolbar as React.CSSProperties) }
    const toolbarGroup: React.CSSProperties = { ...(m.toolbarGroup as React.CSSProperties) }
    const toolbarButton: React.CSSProperties = { ...(m.toolbarButton as React.CSSProperties) }
    const toolbarSeparator: React.CSSProperties = { ...(m.toolbarSeparator as React.CSSProperties) }
    const editor: React.CSSProperties = { ...(m.editor as React.CSSProperties) }
    const footer: React.CSSProperties = { ...(m.footer as React.CSSProperties) }
    const footerLeft: React.CSSProperties = { ...(m.footerLeft as React.CSSProperties) }
    const footerRight: React.CSSProperties = { ...(m.footerRight as React.CSSProperties) }
    const statusText: React.CSSProperties = { ...(m.statusText as React.CSSProperties) }

    const map: Record<string, React.CSSProperties> = {
      "modal.container": container,
      "modal.content": content,
      "modal.header": header,
      "modal.headerLeft": headerLeft,
      "modal.icon": icon,
      "modal.title": title,
      "modal.subtitle": subtitle,
      "modal.headerRight": headerRight,
      "modal.actionButton": actionButton,
      "modal.primaryButton": primaryButton,
      "modal.secondaryButton": secondaryButton,
      "modal.iconButton": iconButton,
      "modal.body": body,
      "modal.toolbar": toolbar,
      "modal.toolbarGroup": toolbarGroup,
      "modal.toolbarButton": toolbarButton,
      "modal.toolbarSeparator": toolbarSeparator,
      "modal.editor": editor,
      "modal.footer": footer,
      "modal.footerLeft": footerLeft,
      "modal.footerRight": footerRight,
      "modal.statusText": statusText,
    }

    const setByPath = (path: string, value: string) => {
      const lastDot = path.lastIndexOf(".")
      if (lastDot === -1) return
      const section = path.slice(0, lastDot)
      const key = path.slice(lastDot + 1)
      const target = map[section]
      if (target) (target as any)[key] = value
    }

    // Theme overrides (dot keys)
    Object.entries(t).forEach(([k, v]) => setByPath(k, v as any))

    // Responsive overrides
    if (r) Object.entries(r).forEach(([k, v]) => setByPath(k, v as any))

    return {
      container,
      content,
      header,
      headerLeft,
      icon,
      title,
      subtitle,
      headerRight,
      actionButton,
      primaryButton,
      secondaryButton,
      iconButton,
      body,
      toolbar,
      toolbarGroup,
      toolbarButton,
      toolbarSeparator,
      editor,
      footer,
      footerLeft,
      footerRight,
      statusText,
    }
  }, [isMobile, theme])

  const handleCopy = async () => {
    if (!context?.content) return
    try {
      await navigator.clipboard.writeText(context.content)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (e) {
      console.error("copy failed", e)
    }
  }

  const headerTitle = context
    ? `${context.title || context.name || "Untitled"}${context.createdAt ? ` • ${new Date(context.createdAt).toLocaleString()}` : ""}`
    : "Replay"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="backdrop-blur-sm"
        overlayStyle={{
          backgroundColor: (profile.modal.container as any).backgroundColor,
        }}
        className="p-0 border-0 shadow-2xl"
        style={{
          width: styles.content.width,
          maxWidth: styles.content.maxWidth,
          height: styles.content.height,
          maxHeight: styles.content.maxHeight,
          backgroundColor: styles.content.backgroundColor,
          borderRadius: styles.content.borderRadius,
          boxShadow: styles.content.boxShadow,
          display: styles.content.display as any,
          flexDirection: styles.content.flexDirection as any,
          overflow: styles.content.overflow as any,
          position: styles.content.position as any,
        }}
      >
        <DialogTitle className="sr-only">Replay</DialogTitle>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.icon}>
              {(context?.title || context?.name || "R").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={styles.title as React.CSSProperties}>{headerTitle}</div>
              <div style={styles.subtitle as React.CSSProperties}>Cross-AI Replay • One workflow. Every model.</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.iconButton as React.CSSProperties} onClick={handleCopy} title="Copy">
              {copySuccess ? <CheckCircle className="size-4" /> : <Copy className="size-4" />}
            </button>
            <button style={styles.iconButton as React.CSSProperties} onClick={() => onOpenChange(false)} title="Close">
              <X className="size-4" />
            </button>
            <button
              style={{ ...(styles.actionButton as React.CSSProperties), ...(styles.primaryButton as React.CSSProperties) }}
              onClick={() => {/* future: trigger replay */}}
            >
              <Play className="w-4 h-4" />
              <span className="ml-1">Run Replay</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarGroup}>
              <button style={styles.toolbarButton as React.CSSProperties}><Bold className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><Italic className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><Underline className="size-4" /></button>
              <div style={styles.toolbarSeparator} />
              <button style={styles.toolbarButton as React.CSSProperties}><Code className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><Type className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><AlignLeft className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><AlignCenter className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><AlignRight className="size-4" /></button>
              <div style={styles.toolbarSeparator} />
              <button style={styles.toolbarButton as React.CSSProperties}><Link className="size-4" /></button>
              <button style={styles.toolbarButton as React.CSSProperties}><List className="size-4" /></button>
            </div>
          </div>

          {/* Editor */}
          <div style={styles.editor}>
            <div
              className="max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(context?.content || "No content available.") }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <span style={styles.statusText as React.CSSProperties}>
              {context?.updatedAt ? `Last updated ${new Date(context.updatedAt).toLocaleString()}` : context?.createdAt ? `Created ${new Date(context.createdAt).toLocaleString()}` : "Ready"}
            </span>
          </div>
          <div style={styles.footerRight}>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Close
            </Button>
            <Button onClick={() => {/* future: trigger save/apply */}} className="text-xs">
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
