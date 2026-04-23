"use client"

/**
 * Login form component with username/password inputs
 */

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authApi } from "@/shared/services/api/client"
import { useAuth } from "../application/useAuth"
import type { LoginRequest } from "../domain/types"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const credentials: LoginRequest = { username, password }
      const response = await authApi.login(credentials)

      // API returns only { access_token: "..." }
      if (response.access_token) {
        // Store token and user in auth store
        const user = { id: "", username, permissions: ["VER_DOCENTES"] }
        login(response.access_token, user)
        // Small delay to ensure state is saved, then redirect
        setTimeout(() => {
          router.push("/dashboard")
        }, 100)
      } else {
        setError("Credenciales inválidas")
      }
    } catch {
      setError("Credenciales inválidas")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  )
}
