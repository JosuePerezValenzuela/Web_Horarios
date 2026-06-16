"use client"

import { useEffect } from "react"
import { useAuth } from "../application/useAuth"

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return <>{children}</>
}
