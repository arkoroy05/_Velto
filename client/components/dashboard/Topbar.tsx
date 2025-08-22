"use client"

import React from "react"
import { Search, Plus, Loader2, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TopbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onNewContext: () => void
  isLoading?: boolean
}

export default function Topbar({ searchQuery, setSearchQuery, onNewContext, isLoading }: TopbarProps) {
  return (
    <div className="border-b border-[#2a2a2a] p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              id="search-input"
              placeholder="Search threads, snippets, or AI conversations... (⌘K)"
              className="w-full bg-[#1a1a1a] border-[#333333] text-white pl-10 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onNewContext} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            New Context
          </Button>
          <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#333333] text-white">D</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}
