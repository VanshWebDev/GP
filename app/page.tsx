"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Shield, Clock, CheckCircle, Users, ArrowRight } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  const features = [
    {
      icon: Clock,
      title: "Efficient Processing",
      description: "Streamlined approval workflow that saves time for everyone",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and security protocols",
    },
    {
      icon: CheckCircle,
      title: "Seamless Workflow",
      description: "Intuitive interface designed for educators and students",
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Instant updates and notifications across the platform",
    },
  ]

  return (
    <div className="min-h-screen relative bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto pt-20 sm:pt-32 pb-16 sm:pb-24">
          <div
            className={`text-center space-y-8 transition-opacity duration-700 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-slate-700 text-xs font-medium tracking-wide uppercase">
                <Shield className="w-3.5 h-3.5" />
                <span>Trusted Platform</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-slate-900 tracking-tight leading-[1.1]">
                Gate Pass
                <br />
                <span className="font-normal text-slate-700">Management System</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
                Professional gate pass management solution for educational institutions.
                Streamlined workflows, secure processes, and real-time collaboration.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-6">
              <Button
                size="lg"
                onClick={() => router.push("/auth/login")}
                className="group bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-base font-medium rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                Sign In
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/sign-up")}
                className="px-8 py-6 text-base font-medium rounded-md border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto pb-24 sm:pb-32">
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 transition-opacity duration-700 delay-200 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
          >
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group relative bg-white rounded-lg p-8 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg group-hover:bg-slate-900 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 mb-2 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed font-light">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
