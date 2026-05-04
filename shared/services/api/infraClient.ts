/**
 * API client for INFRA system (physical resources)
 */

const INFRA_BASE_URL = process.env.NEXT_PUBLIC_INFRA_URL ?? "http://localhost:3002/api"

interface InfraApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

interface InfraError extends Error {
  status: number
  body?: unknown
}

class InfraApiClient {
  private baseUrl: string

  constructor(baseUrl: string = INFRA_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null

    const stored = localStorage.getItem("auth_token")
    if (!stored) return null

    try {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    } catch {
      return stored
    }
  }

  private handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: InfraError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as InfraError
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

  async request<T>(endpoint: string, options: InfraApiClientOptions = {}): Promise<T> {
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

    return this.handleResponse<T>(response)
  }

  async get<T>(endpoint: string, options: InfraApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, body: unknown, options: InfraApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }
}

export const infraApiClient = new InfraApiClient()
