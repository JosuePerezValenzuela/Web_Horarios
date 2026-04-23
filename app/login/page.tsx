"use client"

/**
 * Login page - renders LoginForm component
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { LoginForm } from "@/features/auth/ui/LoginForm"
import { useAuth } from "@/features/auth/application/useAuth"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-2xl font-bold">Sistema de Horarios</h1>
        <LoginForm />
      </div>
    </main>
  )
}
