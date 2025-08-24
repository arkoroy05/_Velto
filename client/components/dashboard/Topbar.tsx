"use client"

import React from "react"
import { Loader2, Bell } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAICTContract } from "@/hooks/use-aict-contract"


interface TopbarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  onNewContext: () => void
  isLoading?: boolean
}

export default function Topbar({ searchQuery, setSearchQuery, onNewContext: _onNewContext, isLoading: _isLoading }: TopbarProps) {
  const placeholders = [
    "Search threads, snippets, or AI conversations...",
    "Filter by model or tag",
    "Find context: Authentication Debug Session",
    "Search: API Performance Analysis",
  ]
  const { isConnected, address } = useAccount()
  const { getTokenBalance } = useAICTContract()
  const [aictBalance, setAictBalance] = React.useState<string | null>(null)
  const [balLoading, setBalLoading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!isConnected) {
        setAictBalance(null)
        return
      }
      try {
        setBalLoading(true)
        const bal = await getTokenBalance()
        if (mounted) setAictBalance(bal)
      } catch (e) {
        if (mounted) setAictBalance("0")
      } finally {
        if (mounted) setBalLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isConnected, address, getTokenBalance])
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
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-sm min-w-[140px] text-center">
            {isConnected ? (
              balLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching AICT...
                </span>
              ) : (
                <span>
                  AICT: <span className="font-semibold">{aictBalance ?? "0"}</span>
                </span>
              )
            ) : (
              <span>AICT: —</span>
            )}
          </div>
          <ConnectButton />
          <Bell className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-[#333333] text-white">D</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}
