import { create } from "zustand"
import type { User } from "../domain/types"
import { authApi } from "@/shared/services/api/client"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setUser: (user: User | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setLoading: (isLoading: boolean) => void
  checkAuth: () => Promise<void>
  logout: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },

  setIsAuthenticated: (isAuthenticated: boolean) => {
    set({ isAuthenticated })
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await authApi.me()
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },
}))
