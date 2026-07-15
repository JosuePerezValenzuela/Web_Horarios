/**
 * API client for PARTES system (daily attendance control)
 */

const PARTES_BASE_URL = process.env.NEXT_PUBLIC_PARTES_URL ?? "http://localhost:3006"

interface PartesApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

export interface PartesApiError extends Error {
  status: number
  body?: unknown
}

class PartesApiClient {
  private baseUrl: string

  constructor(baseUrl: string = PARTES_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: PartesApiError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as PartesApiError
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

  async request<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "omit",
    })

    return this.handleResponse<T>(response)
  }

  async get<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, body: unknown, options: PartesApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }
}

export const partesApiClient = new PartesApiClient()
