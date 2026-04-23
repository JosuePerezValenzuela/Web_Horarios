/**
 * API client using native fetch
 */

import type { LoginRequest, LoginResponse } from "@/features/auth/domain/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

interface ApiError extends Error {
  status: number
  body?: unknown
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null

    // Zustand persist stores: { state: { token: "...", ... }, version: 0 }
    const stored = localStorage.getItem("auth_token")
    if (!stored) return null

    try {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    } catch {
      // Fallback for direct token storage
      return stored
    }
  }

  private handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as ApiError
      error.status = response.status
      return response
        .json()
        .then((body) => {
          error.body = body
          throw error
        })
        .catch(() => {
          throw error
        })
    }
    return response.json() as Promise<T>
  }

  async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    const token = this.getAuthToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (response.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token")
        window.location.href = "/login"
      }
      const error: ApiError = new Error("Unauthorized") as ApiError
      error.status = 401
      throw error
    }

    return this.handleResponse<T>(response)
  }

  async get<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }
}

export const apiClient = new ApiClient()

// Auth-specific methods
export const authApi = {
  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/auth/login", credentials)
  },
}
