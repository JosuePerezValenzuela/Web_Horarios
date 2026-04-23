/**
 * Convenience hook for authentication
 */

import { useAuthStore } from "./authStore"
import type { User } from "../domain/types"

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: User | null
}

interface AuthActions {
  login: (token: string, user: User) => void
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
}

export function useAuth(): AuthState & AuthActions {
  return useAuthStore()
}
