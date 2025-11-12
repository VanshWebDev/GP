import { useEffect, useRef, useState, useCallback } from "react"
import { RealtimeChannel } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

export type SupabaseWebSocketStatus = "connecting" | "connected" | "disconnected" | "error"

export interface UseSupabaseWebSocketOptions {
  channelName: string
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  onError?: (error: Error) => void
  enabled?: boolean
}

export interface UseSupabaseWebSocketReturn {
  status: SupabaseWebSocketStatus
  channel: RealtimeChannel | null
  reconnect: () => void
  disconnect: () => void
}

/**
 * Enhanced WebSocket hook for Supabase real-time with better connection management
 * This provides explicit WebSocket control while using Supabase's real-time infrastructure
 */
export function useSupabaseWebSocket(options: UseSupabaseWebSocketOptions): UseSupabaseWebSocketReturn {
  const {
    channelName,
    table,
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onError,
    enabled = true,
  } = options

  const [status, setStatus] = useState<SupabaseWebSocketStatus>("disconnected")
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  
  // Create supabase client once and store in ref to avoid recreating on every render
  const supabaseRef = useRef(createClient())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const maxReconnectAttempts = 10
  const reconnectInterval = 3000
  
  // Store callbacks in refs to avoid recreating connect function
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onError })
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete, onError }
  }, [onInsert, onUpdate, onDelete, onError])

  const connect = useCallback(() => {
    if (!enabled) {
      setStatus("disconnected")
      return
    }

    // Clean up existing channel before creating a new one
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
      setChannel(null)
    }

    try {
      setStatus("connecting")

      // Create a new channel with a unique name
      const newChannel = supabaseRef.current
        .channel(channelName, {
          config: {
            broadcast: { self: true },
            presence: { key: channelName },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table,
            filter: filter ? filter : undefined,
          },
          (payload) => {
            callbacksRef.current.onInsert?.(payload)
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table,
            filter: filter ? filter : undefined,
          },
          (payload) => {
            callbacksRef.current.onUpdate?.(payload)
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table,
            filter: filter ? filter : undefined,
          },
          (payload) => {
            callbacksRef.current.onDelete?.(payload)
          },
        )
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            setStatus("connected")
            reconnectAttemptsRef.current = 0
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setStatus("error")
            callbacksRef.current.onError?.(new Error(err?.message || "Channel error"))
            // Attempt to reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current += 1
              reconnectTimeoutRef.current = setTimeout(() => {
                connect()
              }, reconnectInterval)
            }
          } else if (status === "CLOSED") {
            setStatus("disconnected")
          }
        })

      channelRef.current = newChannel
      setChannel(newChannel)
    } catch (error) {
      setStatus("error")
      callbacksRef.current.onError?.(error as Error)
      console.error("Supabase WebSocket connection error:", error)
    }
  }, [enabled, channelName, table, filter])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
      setChannel(null)
    }
    setStatus("disconnected")
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    setTimeout(() => {
      connect()
    }, 100)
  }, [connect, disconnect])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channelName, table, filter])

  return {
    status,
    channel,
    reconnect,
    disconnect,
  }
}


