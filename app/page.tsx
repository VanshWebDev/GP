"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        router.push("/dashboard")
      }
    }

    checkUser()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">Gate Pass Manager</h1>
          <p className="text-xl text-gray-600">Streamlined gate pass requests and approvals</p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => router.push("/auth/login")} className="bg-blue-600 hover:bg-blue-700">
            Login
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/auth/sign-up")}>
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
