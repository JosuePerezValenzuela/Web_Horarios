import { toast } from "@umss/estilos-base/components"

const PARTES_BASE_URL = process.env.NEXT_PUBLIC_PARTES_URL ?? "http://localhost:3006"

export interface PartesApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  loadingMessage?: string
  successMessage?: string | ((data: unknown) => string)
  showSuccessToast?: boolean
  showErrorToast?: boolean
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

  private async handleResponse<T>(
    response: Response,
    toastId?: string | number,
    options: PartesApiClientOptions = {}
  ): Promise<T> {
    if (!response.ok) {
      const error: PartesApiError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as PartesApiError
      error.status = response.status

      let apiMsg = `Error del servicio de partes (${response.status})`
      try {
        const body = await response.json()
        error.body = body
        if (body?.message) {
          apiMsg = body.message
        } else if (Array.isArray(body?.errors)) {
          apiMsg = body.errors.join(", ")
        }
      } catch {
        apiMsg = `Error del servicio de partes (${response.status}: ${response.statusText})`
      }

      // 404 is handled specifically by views (e.g. "parte no generado" opening the generate dialog)
      if (response.status !== 404 && options.showErrorToast !== false) {
        if (toastId) {
          toast.error(apiMsg, { id: toastId })
        } else {
          toast.error(apiMsg, { id: apiMsg })
        }
      } else if (toastId) {
        toast.dismiss(toastId)
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

    const toastId = options.loadingMessage ? toast.loading(options.loadingMessage) : undefined

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
      })

      const data = await this.handleResponse<T>(response, toastId, options)

      // Handle global success toast if applicable
      if (options.showSuccessToast !== false) {
        let msg: string | undefined
        if (typeof options.successMessage === "function") {
          msg = options.successMessage(data)
        } else if (typeof options.successMessage === "string") {
          msg = options.successMessage
        } else if (
          options.method &&
          options.method !== "GET" &&
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as Record<string, unknown>).message === "string"
        ) {
          msg = (data as Record<string, unknown>).message as string
        }

        if (msg) {
          if (toastId) {
            toast.success(msg, { id: toastId })
          } else {
            toast.success(msg)
          }
        } else if (toastId) {
          toast.dismiss(toastId)
        }
      } else if (toastId) {
        toast.dismiss(toastId)
      }

      return data
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) {
        throw error
      }
      // Network / connectivity failure (e.g. server down, connection refused, DNS error, timeout)
      const networkError: PartesApiError = new Error(
        "No se pudo conectar con el servicio de partes diarios. El servidor no responde."
      ) as PartesApiError
      networkError.status = 0
      if (options.showErrorToast !== false) {
        if (toastId) {
          toast.error(networkError.message, { id: toastId })
        } else {
          toast.error(networkError.message, { id: "partes-network-error" })
        }
      } else if (toastId) {
        toast.dismiss(toastId)
      }
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

  async post<T>(
    endpoint: string,
    body?: unknown,
    options: PartesApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options: PartesApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body })
  }

  async delete<T>(endpoint: string, options: PartesApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export const partesApiClient = new PartesApiClient()
