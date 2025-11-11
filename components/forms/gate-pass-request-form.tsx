"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface GatePassRequestFormProps {
  userId: string
  onSuccess: () => void
}

export default function GatePassRequestForm({ userId, onSuccess }: GatePassRequestFormProps) {
  const [destination, setDestination] = useState("")
  const [reason, setReason] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!destination || !reason || !departureTime) {
      setError("Please fill in all fields")
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
        destination,
        reason,
        departure_time: selectedTime.toISOString(),
        status: "pending",
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
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Library, Medical Center"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">{destination.length}/100 characters</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
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
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDestination("")
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
