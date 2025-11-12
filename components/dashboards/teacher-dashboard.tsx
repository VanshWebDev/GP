"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseWebSocket } from "@/hooks/use-supabase-websocket"
import { WebSocketStatus } from "@/components/websocket-status"

interface StudentInfo {
  student_name?: string
  student_id_number?: string
  mobile_no?: string
  email?: string
  branch?: string
  course?: string
  section?: string
  teacher_comment?: string
}

interface GatePassRequest {
  id: string
  student_id: string
  destination: string
  reason: string
  departure_time: string
  status: string
  teacher_notes: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
    email: string
  }
}

// Helper function to parse student info from teacher_notes
const parseStudentInfo = (teacherNotes: string | null): { studentInfo: StudentInfo | null; actualNotes: string | null } => {
  if (!teacherNotes) return { studentInfo: null, actualNotes: null }
  
  try {
    const parsed = JSON.parse(teacherNotes)
    // Check if it's student info (has student_name or student_id_number)
    if (parsed.student_name || parsed.student_id_number) {
      return { studentInfo: parsed as StudentInfo, actualNotes: null }
    }
    // Otherwise it's actual teacher notes
    return { studentInfo: null, actualNotes: teacherNotes }
  } catch {
    // Not JSON, so it's actual teacher notes
    return { studentInfo: null, actualNotes: teacherNotes }
  }
}

export default function TeacherDashboard({ userId }: { userId: string }) {
  const [pendingRequests, setPendingRequests] = useState<GatePassRequest[]>([])
  const [allRequests, setAllRequests] = useState<GatePassRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<GatePassRequest | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("gate_pass_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (error) console.error("Error fetching requests:", error)
    else setPendingRequests(data || [])
    setIsLoading(false)
  }

  const fetchAllRequests = async () => {
    const { data, error } = await supabase
      .from("gate_pass_requests")
      .select("*")
      .in("status", ["approved", "denied"])
      .order("updated_at", { ascending: false })

    if (error) console.error("Error fetching all requests:", error)
    else setAllRequests(data || [])
  }

  // Enhanced WebSocket connection with better management
  const { status: wsStatus, reconnect: reconnectWebSocket } = useSupabaseWebSocket({
    channelName: "gate_pass_all",
    table: "gate_pass_requests",
    onInsert: (payload) => {
      const newRequest = payload.new as GatePassRequest
      if (newRequest.status === "pending") {
        setPendingRequests((prev) => [newRequest, ...prev])
        toast({
          title: "New Request",
          description: `New gate pass request to ${newRequest.destination}`,
        })
      }
    },
    onUpdate: (payload) => {
      const updatedRequest = payload.new as GatePassRequest
      setPendingRequests((prev) => prev.filter((req) => req.id !== updatedRequest.id))
      setAllRequests((prev) => [updatedRequest, ...prev.filter((req) => req.id !== updatedRequest.id)])
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
    fetchAllRequests()
  }, [])

  const handleApprove = async (requestId: string) => {
    // Preserve student info if it exists in teacher_notes
    const { studentInfo } = parseStudentInfo(selectedRequest?.teacher_notes || null)
    const finalNotes = studentInfo 
      ? JSON.stringify({ ...studentInfo, teacher_comment: notes })
      : notes

    const { error } = await supabase
      .from("gate_pass_requests")
      .update({
        status: "approved",
        teacher_id: userId,
        teacher_notes: finalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    if (error) console.error("Error approving:", error)
    else {
      setSelectedRequest(null)
      setNotes("")
      fetchRequests()
      fetchAllRequests()
      toast({
        title: "Request Approved",
        description: "The gate pass request has been approved.",
      })
    }
  }

  const handleDeny = async (requestId: string) => {
    // Preserve student info if it exists in teacher_notes
    const { studentInfo } = parseStudentInfo(selectedRequest?.teacher_notes || null)
    const finalNotes = studentInfo 
      ? JSON.stringify({ ...studentInfo, teacher_comment: notes })
      : notes

    const { error } = await supabase
      .from("gate_pass_requests")
      .update({
        status: "denied",
        teacher_id: userId,
        teacher_notes: finalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    if (error) console.error("Error denying:", error)
    else {
      setSelectedRequest(null)
      setNotes("")
      fetchRequests()
      fetchAllRequests()
      toast({
        title: "Request Denied",
        description: "The gate pass request has been denied.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "denied":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
            <WebSocketStatus status={wsStatus} />
            {wsStatus === "error" && (
              <Button variant="outline" size="sm" onClick={reconnectWebSocket}>
                Reconnect
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant={showHistory ? "default" : "outline"} onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? "Pending" : "History"}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showHistory ? (
          <div>
            <h2 className="text-xl font-semibold mb-6">Pending Gate Pass Requests ({pendingRequests.length})</h2>

            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-yellow-500"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{request.destination}</CardTitle>
                      <CardDescription>{request.reason}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const { studentInfo } = parseStudentInfo(request.teacher_notes)
                          if (studentInfo) {
                            return (
                              <>
                                <p><span className="font-semibold">Name:</span> {studentInfo.student_name}</p>
                                <p><span className="font-semibold">Student ID:</span> {studentInfo.student_id_number}</p>
                                <p><span className="font-semibold">Branch:</span> {studentInfo.branch} - {studentInfo.course} - Section {studentInfo.section}</p>
                              </>
                            )
                          }
                          return (
                            <p>
                              <span className="font-semibold">Student ID:</span> {request.student_id.slice(0, 8)}...
                            </p>
                          )
                        })()}
                        <p>
                          <span className="font-semibold">Requested:</span>{" "}
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-semibold">Departure:</span>{" "}
                          {new Date(request.departure_time).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-6">Request History</h2>

            {allRequests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-500">No processed requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {allRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{request.destination}</CardTitle>
                          <CardDescription>{request.reason}</CardDescription>
                        </div>
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Student ID:</span> {request.student_id.slice(0, 8)}...
                        </p>
                        <p>
                          <span className="font-semibold">Processed:</span>{" "}
                          {new Date(request.updated_at).toLocaleDateString()}
                        </p>
                        {(() => {
                          const { studentInfo, actualNotes } = parseStudentInfo(request.teacher_notes)
                          return (
                            <>
                              {studentInfo && (
                                <div className="bg-blue-50 p-3 rounded space-y-1 text-sm">
                                  <p className="font-semibold text-blue-900 mb-2">Student Information:</p>
                                  <p><span className="font-medium">Name:</span> {studentInfo.student_name}</p>
                                  <p><span className="font-medium">Student ID:</span> {studentInfo.student_id_number}</p>
                                  <p><span className="font-medium">Mobile:</span> {studentInfo.mobile_no}</p>
                                  <p><span className="font-medium">Email:</span> {studentInfo.email}</p>
                                  <p><span className="font-medium">Branch:</span> {studentInfo.branch}</p>
                                  <p><span className="font-medium">Course:</span> {studentInfo.course}</p>
                                  <p><span className="font-medium">Section:</span> {studentInfo.section}</p>
                                  {studentInfo.teacher_comment && (
                                    <p className="mt-2 pt-2 border-t border-blue-200">
                                      <span className="font-medium">Teacher Comment:</span> {studentInfo.teacher_comment}
                                    </p>
                                  )}
                                </div>
                              )}
                              {actualNotes && !studentInfo && (
                                <p className="bg-gray-100 p-2 rounded">
                                  <span className="font-semibold">Notes:</span> {actualNotes}
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Review Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const { studentInfo } = parseStudentInfo(selectedRequest.teacher_notes)
                  return (
                    <>
                      {studentInfo && (
                        <div className="bg-blue-50 p-3 rounded space-y-1 text-sm border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-2">Student Information:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <p><span className="font-medium">Name:</span> {studentInfo.student_name}</p>
                            <p><span className="font-medium">Student ID:</span> {studentInfo.student_id_number}</p>
                            <p><span className="font-medium">Mobile:</span> {studentInfo.mobile_no}</p>
                            <p><span className="font-medium">Email:</span> {studentInfo.email}</p>
                            <p><span className="font-medium">Branch:</span> {studentInfo.branch}</p>
                            <p><span className="font-medium">Course:</span> {studentInfo.course}</p>
                            <p><span className="font-medium">Section:</span> {studentInfo.section}</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Destination:</span> {selectedRequest.destination}
                        </p>
                        <p>
                          <span className="font-semibold">Reason:</span> {selectedRequest.reason}
                        </p>
                        <p>
                          <span className="font-semibold">Departure:</span>{" "}
                          {new Date(selectedRequest.departure_time).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-semibold">Requested:</span>{" "}
                          {new Date(selectedRequest.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </>
                  )
                })()}

                <div>
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add approval/denial notes..."
                    className="w-full p-2 border rounded text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(null)
                      setNotes("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeny(selectedRequest.id)}>
                    Deny
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedRequest.id)}>
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
