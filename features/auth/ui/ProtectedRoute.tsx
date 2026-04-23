"use client"

/**
 * Protected route wrapper component
 */

import type { ReactNode } from "react"
import { useAuth } from "../application/useAuth"
import { useSyncExternalStore, useEffect } from "react"
import { useRouter } from "next/navigation"

interface ProtectedRouteProps {
  children: ReactNode
}

// Helper to get token from localStorage
function getAuthFromStorage() {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("auth_token")
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    return parsed.state?.token || null
  } catch {
    return null
  }
}

const emptySubscribe = () => () => {}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { token } = useAuth()

  // Get token from localStorage
  const tokenFromStorage = useSyncExternalStore(emptySubscribe, getAuthFromStorage, () => null)

  // Check if we have a valid token
  const hasToken = token || tokenFromStorage

  // Only redirect inside useEffect and only after hydration
  useEffect(() => {
    // If still no token after hydration, redirect to login
    const currentToken = token || (typeof window !== "undefined" ? getAuthFromStorage() : null)
    if (!currentToken) {
      router.push("/login")
    }
  }, [])

  if (!hasToken) {
    return null
  }

  return <>{children}</>
}
