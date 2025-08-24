"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ModularCardProps {
  icon?: LucideIcon
  iconColor?: string
  title: string
  subtitle?: string
  value?: string | number
  trend?: {
    value: string
    positive: boolean
  }
  badges?: string[]
  actions?: Array<{
    label: string
    icon?: LucideIcon
    onClick: () => void
  }>
  menuActions?: Array<{
    label: string
    icon?: LucideIcon
    onClick: () => void
    destructive?: boolean
  }>
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export default function ModularCard({
  icon: Icon,
  iconColor = "blue",
  title,
  subtitle,
  value,
  trend,
  badges,
  actions,
  menuActions,
  onClick,
  className = "",
  children,
}: ModularCardProps) {
  const iconColorClasses = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    amber: "bg-amber-600",
    red: "bg-red-600",
    gray: "bg-gray-600",
  }

  return (
    <Card 
      className={`bg-[#1a1a1a] border-[#333333] hover:bg-[#1f1f1f] transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {(Icon || menuActions) && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            {Icon && (
              <div className={`w-10 h-10 ${iconColorClasses[iconColor] || iconColorClasses.blue} rounded-lg flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            {menuActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1a1a1a] border-[#333333]" align="end">
                  {menuActions.map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      className={`${action.destructive ? 'text-red-400' : 'text-gray-300'} hover:bg-[#2a2a2a]`}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                    >
                      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent className={`${Icon || menuActions ? 'pt-0' : 'pt-6'} pb-6`}>
        <div className="space-y-3">
          {/* Title and Value Section */}
          <div>
            <h3 className="text-white font-medium text-lg">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
            {value !== undefined && (
              <div className="mt-2">
                <span className="text-2xl font-bold text-white">{value}</span>
                {trend && (
                  <span className={`text-xs ml-2 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {trend.positive ? '↑' : '↓'} {trend.value}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Badges */}
          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, idx) => (
                <Badge key={idx} variant="secondary" className="bg-gray-700/50 text-gray-300 text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Custom Children Content */}
          {children}

          {/* Action Buttons */}
          {actions && actions.length > 0 && (
            <div className="flex gap-2 pt-2">
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                  onClick={(e) => {
                    e.stopPropagation()
                    action.onClick()
                  }}
                >
                  {action.icon && <action.icon className="w-3 h-3 mr-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
