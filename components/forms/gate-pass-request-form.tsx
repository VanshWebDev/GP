"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface GatePassRequestFormProps {
  userId: string
  onSuccess: () => void
}

const BRANCHES = ["CSE", "Electrical", "AI", "Mechanical", "Electronics", "Civil", "Chemical", "Aerospace", "Biotechnology", "Other"]
const COURSES = ["BCA", "BTech", "MCA", "MTech", "BSc", "MSc", "MBA", "Other"]
const SECTIONS = ["A", "B", "C", "D", "E", "F"]

export default function GatePassRequestForm({ userId, onSuccess }: GatePassRequestFormProps) {
  const [name, setName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [mobileNo, setMobileNo] = useState("")
  const [email, setEmail] = useState("")
  const [branch, setBranch] = useState("")
  const [course, setCourse] = useState("")
  const [section, setSection] = useState("")
  const [reason, setReason] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEmail, setIsLoadingEmail] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch user email on component mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.email) {
          setEmail(user.email)
        } else {
          // Fallback to profile email
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .single()
          if (profile?.email) {
            setEmail(profile.email)
          }
        }
      } catch (err) {
        console.error("Error fetching user email:", err)
      } finally {
        setIsLoadingEmail(false)
      }
    }
    fetchUserEmail()
  }, [userId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate all required fields
    if (!name || !studentId || !mobileNo || !email || !branch || !course || !section || !reason || !departureTime) {
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/
    if (!mobileRegex.test(mobileNo)) {
      setError("Mobile number must be exactly 10 digits")
      setIsLoading(false)
      return
    }

    const selectedTime = new Date(departureTime)
    if (selectedTime <= new Date()) {
      setError("Departure time must be in the future")
      setIsLoading(false)
      return
    }

    try {
      const { error: insertError } = await supabase.from("gate_pass_requests").insert({
        student_id: userId,
        destination: `${branch} - ${course} - Section ${section}`, // Store branch/course/section as destination for now
        reason,
        departure_time: selectedTime.toISOString(),
        status: "pending",
        // Store additional info in teacher_notes field as JSON for now (until schema is updated)
        teacher_notes: JSON.stringify({
          student_name: name,
          student_id_number: studentId,
          mobile_no: mobileNo,
          email: email,
          branch: branch,
          course: course,
          section: section,
        }),
      })

      if (insertError) throw insertError

      toast({
        title: "Request Submitted",
        description: "Your gate pass request has been submitted for approval.",
      })
      onSuccess()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Request Gate Pass</CardTitle>
        <CardDescription>Fill in the details of your gate pass request</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="student-id">Student ID</Label>
              <Input
                id="student-id"
                placeholder="Enter your student ID"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mobile-no">Mobile Number</Label>
              <Input
                id="mobile-no"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                required
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
              />
              <p className="text-xs text-gray-500">10 digits only</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                readOnly
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Email is auto-filled and cannot be edited</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branch">Branch</Label>
                <Select value={branch} onValueChange={setBranch} required>
                  <SelectTrigger id="branch" className="w-full">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="course">Course</Label>
                <Select value={course} onValueChange={setCourse} required>
                  <SelectTrigger id="course" className="w-full">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="section">Section</Label>
                <Select value={section} onValueChange={setSection} required>
                  <SelectTrigger id="section" className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Leaving</Label>
              <textarea
                id="reason"
                placeholder="Explain the purpose of your gate pass request"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="p-2 border rounded text-sm resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">{reason.length}/500 characters</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="departure-time">Departure Time</Label>
              <Input
                id="departure-time"
                type="datetime-local"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
              <p className="text-xs text-gray-500">Must be a future date and time</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoading || isLoadingEmail}>
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName("")
                  setStudentId("")
                  setMobileNo("")
                  setBranch("")
                  setCourse("")
                  setSection("")
                  setReason("")
                  setDepartureTime("")
                  setError(null)
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
