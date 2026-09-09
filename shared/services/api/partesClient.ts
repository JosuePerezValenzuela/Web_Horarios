import { toast } from "@umss/estilos-base/components"

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
  private inFlightGetRequests = new Map<string, Promise<unknown>>()

  constructor(baseUrl: string = PARTES_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: PartesApiError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as PartesApiError
      error.status = response.status

      try {
        const body = await response.json()
        error.body = body
        // Only show toast if it's not a 404 (404 is handled specifically by views, e.g. "parte no generado")
        if (response.status !== 404) {
          const apiMsg =
            body?.message ||
            (Array.isArray(body?.errors) ? body.errors.join(", ") : null) ||
            `Error del servicio de partes (${response.status})`
          toast.error(apiMsg, { id: apiMsg })
        }
      } catch {
        if (response.status !== 404) {
          const msg = `Error del servicio de partes (${response.status}: ${response.statusText})`
          toast.error(msg, { id: msg })
        }
      }

      throw error
    }

    if (response.status === 204) {
      return null as unknown as T
    }

    return response.json() as Promise<T>
  }

  async request<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "omit",
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) {
        throw error
      }
      // Network / connectivity failure (e.g. server down, connection refused, DNS error, timeout)
      const networkError: PartesApiError = new Error(
        "No se pudo conectar con el servicio de partes diarios. El servidor no responde."
      ) as PartesApiError
      networkError.status = 0
      toast.error(networkError.message, { id: "partes-network-error" })
      throw networkError
    }
  }

  async get<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    const cacheKey = `GET:${endpoint}`
    if (this.inFlightGetRequests.has(cacheKey)) {
      return this.inFlightGetRequests.get(cacheKey) as Promise<T>
    }

    const promise = this.request<T>(endpoint, { ...options, method: "GET" }).finally(() => {
      this.inFlightGetRequests.delete(cacheKey)
    })

    this.inFlightGetRequests.set(cacheKey, promise)
    return promise
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
