"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react"

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

interface WebSocketStatusProps {
  status: ConnectionStatus
  showLabel?: boolean
  className?: string
}

export function WebSocketStatus({ status, showLabel = true, className = "" }: WebSocketStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: "Connected",
          variant: "default" as const,
          bgColor: "bg-green-100 text-green-800 border-green-200",
        }
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: "Connecting",
          variant: "secondary" as const,
          bgColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
        }
      case "error":
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Connection Error",
          variant: "destructive" as const,
          bgColor: "bg-red-100 text-red-800 border-red-200",
        }
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Disconnected",
          variant: "outline" as const,
          bgColor: "bg-gray-100 text-gray-800 border-gray-200",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1.5 ${config.bgColor} ${className}`}
      title={`WebSocket Status: ${config.label}`}
    >
      {config.icon}
      {showLabel && <span className="text-xs">{config.label}</span>}
    </Badge>
  )
}


