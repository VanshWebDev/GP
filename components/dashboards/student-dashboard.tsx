"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import GatePassRequestForm from "@/components/forms/gate-pass-request-form"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseWebSocket } from "@/hooks/use-supabase-websocket"
import { WebSocketStatus } from "@/components/websocket-status"

interface GatePassRequest {
  id: string
  destination: string
  reason: string
  departure_time: string
  status: string
  teacher_notes: string | null
  created_at: string
}

export default function StudentDashboard({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<GatePassRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("gate_pass_requests")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })

    if (error) console.error("Error fetching requests:", error)
    else setRequests(data || [])
    setIsLoading(false)
  }

  // Enhanced WebSocket connection with better management
  const { status: wsStatus, reconnect: reconnectWebSocket } = useSupabaseWebSocket({
    channelName: `gate_pass:${userId}`,
    table: "gate_pass_requests",
    filter: `student_id=eq.${userId}`,
    onUpdate: (payload) => {
      const updatedRequest = payload.new as GatePassRequest
      setRequests((prev) => prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req)))

      // Show toast notification on status change
      if (updatedRequest.status === "approved") {
        toast({
          title: "Request Approved!",
          description: `Your gate pass to ${updatedRequest.destination} has been approved.`,
        })
      } else if (updatedRequest.status === "denied") {
        toast({
          title: "Request Denied",
          description: `Your gate pass request has been denied.${
            updatedRequest.teacher_notes ? ` Reason: ${updatedRequest.teacher_notes}` : ""
          }`,
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      console.error("WebSocket error:", error)
      toast({
        title: "Connection Error",
        description: "Real-time updates may be delayed. Attempting to reconnect...",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "denied":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "✓"
      case "denied":
        return "✕"
      default:
        return "○"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
            <WebSocketStatus status={wsStatus} />
            {wsStatus === "error" && (
              <Button variant="outline" size="sm" onClick={reconnectWebSocket}>
                Reconnect
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Gate Pass Requests</h2>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                Request Gate Pass
              </Button>
            </div>

            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No requests yet. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <div className="flex">
                      <div
                        className={`w-1 ${
                          request.status === "approved"
                            ? "bg-green-500"
                            : request.status === "denied"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{request.destination}</CardTitle>
                              <CardDescription>{request.reason}</CardDescription>
                            </div>
                            <Badge className={getStatusColor(request.status)}>
                              <span className="mr-1">{getStatusIcon(request.status)}</span>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="font-semibold">Departure:</span>{" "}
                              {new Date(request.departure_time).toLocaleString()}
                            </p>
                            <p>
                              <span className="font-semibold">Requested:</span>{" "}
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            {request.teacher_notes && (
                              <p className="bg-blue-50 p-2 rounded">
                                <span className="font-semibold">Teacher Notes:</span> {request.teacher_notes}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <GatePassRequestForm
            userId={userId}
            onSuccess={() => {
              setShowForm(false)
              fetchRequests()
            }}
          />
        )}
      </main>
    </div>
  )
}
