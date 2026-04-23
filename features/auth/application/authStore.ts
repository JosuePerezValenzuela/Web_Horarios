/**
 * Authentication store with Zustand and persist middleware
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User } from "../domain/types"

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (token: string, user: User) => void
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      },

      setToken: (token: string) => {
        set((state) => ({
          token,
          isAuthenticated: !!token && !!state.user,
        }))
      },

      setUser: (user: User) => {
        set((state) => ({
          user,
          isAuthenticated: !!state.token && !!user,
        }))
      },
    }),
    {
      name: "auth_token",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
