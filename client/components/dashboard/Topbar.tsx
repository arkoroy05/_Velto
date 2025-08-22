"use client"

import React from "react"
import { Plus, Loader2, Bell } from "lucide-react"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"

interface TopbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onNewContext: () => void
  isLoading?: boolean
}

export default function Topbar({ searchQuery, setSearchQuery, onNewContext, isLoading }: TopbarProps) {
  const placeholders = [
    "Search threads, snippets, or AI conversations...",
    "Filter by model or tag",
    "Find context: Authentication Debug Session",
    "Search: API Performance Analysis",
  ]
  return (
    <div className="border-b border-[#2a2a2a] p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmit={(e) => {
              e.preventDefault()
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <RainbowButton className="gap-2" onClick={onNewContext} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Context
          </RainbowButton>
          <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#333333] text-white">D</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}
