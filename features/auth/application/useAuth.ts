import { useAuthStore } from "./authStore"
import type { User } from "../domain/types"

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
}

interface AuthActions {
  setUser: (user: User | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setLoading: (isLoading: boolean) => void
  checkAuth: () => Promise<void>
  logout: () => void
}

export function useAuth(): AuthState & AuthActions {
  return useAuthStore()
}
