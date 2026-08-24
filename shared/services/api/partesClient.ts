import { toast } from "sonner"

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
          // Extract specific error messages if available from API client (ApiError)
          const apiMsg = body?.message || `Error del servidor (${response.status})`
          toast.error(apiMsg)
          throw error
        })
        .catch((err) => {
          if (!err.status) {
            toast.error(`Error de red: ${response.statusText}`)
          }
          throw err
        })
    }
    if (response.status === 204) {
      return Promise.resolve(null as unknown as T)
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

  async patch<T>(
    endpoint: string,
    body: unknown,
    options: PartesApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body })
  }

  async delete<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export const partesApiClient = new PartesApiClient()
