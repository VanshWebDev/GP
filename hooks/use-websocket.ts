import { useEffect, useRef, useState, useCallback } from "react"

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error"

export interface UseWebSocketOptions {
  url: string
  onMessage?: (event: MessageEvent) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  protocols?: string | string[]
}

export interface UseWebSocketReturn {
  sendMessage: (message: string | object) => void
  status: WebSocketStatus
  lastMessage: MessageEvent | null
  reconnect: () => void
  disconnect: () => void
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect: shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    protocols,
  } = options

  const [status, setStatus] = useState<WebSocketStatus>("disconnected")
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const shouldReconnectRef = useRef(shouldReconnect)
  const isManualCloseRef = useRef(false)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setStatus("connecting")
      const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url)

      ws.onopen = (event) => {
        setStatus("connected")
        reconnectAttemptsRef.current = 0
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        setLastMessage(event)
        onMessage?.(event)
      }

      ws.onerror = (event) => {
        setStatus("error")
        onError?.(event)
      }

      ws.onclose = (event) => {
        setStatus("disconnected")
        onClose?.(event)

        // Only reconnect if it wasn't a manual close and we should reconnect
        if (!isManualCloseRef.current && shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setStatus("error")
        }
      }

      wsRef.current = ws
    } catch (error) {
      setStatus("error")
      console.error("WebSocket connection error:", error)
    }
  }, [url, protocols, onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts])

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === "string" ? message : JSON.stringify(message)
      wsRef.current.send(data)
    } else {
      console.warn("WebSocket is not connected. Message not sent.")
    }
  }, [])

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true
    shouldReconnectRef.current = false
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus("disconnected")
  }, [])

  const reconnect = useCallback(() => {
    isManualCloseRef.current = false
    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0
    disconnect()
    setTimeout(() => {
      connect()
    }, 100)
  }, [connect, disconnect])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    sendMessage,
    status,
    lastMessage,
    reconnect,
    disconnect,
  }
}


