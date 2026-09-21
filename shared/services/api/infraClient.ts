import { toast } from "@umss/estilos-base/components"

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
  private inFlightGetRequests = new Map<string, Promise<unknown>>()

  constructor(baseUrl: string = INFRA_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: InfraError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      ) as InfraError
      error.status = response.status
      try {
        const body = await response.json()
        error.body = body
        const apiMsg = body?.message || `Error de infraestructura (${response.status})`
        toast.error(apiMsg, { id: apiMsg })
      } catch {
        const msg = `Error de infraestructura (${response.status}: ${response.statusText})`
        toast.error(msg, { id: msg })
      }
      throw error
    }
    return response.json() as Promise<T>
  }

  async request<T>(endpoint: string, options: InfraApiClientOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
      })

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) {
        throw error
      }
      const networkError: InfraError = new Error(
        "No se pudo conectar con el servicio de infraestructura."
      ) as InfraError
      networkError.status = 0
      toast.error(networkError.message, { id: "infra-network-error" })
      throw networkError
    }
  }

  async get<T>(endpoint: string, options: InfraApiClientOptions = {}): Promise<T> {
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

  async post<T>(endpoint: string, body: unknown, options: InfraApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }
}

export const infraApiClient = new InfraApiClient()

export interface Campus {
  id: number | string
  nombre: string
}

export interface FacultadInfra {
  id: number | string
  nombre: string
  codigo?: string
}

export interface Bloque {
  id: number | string
  nombre: string
  facultadId?: number | string
  campusId?: number | string
}

export interface Ambiente {
  id: number | string
  nombre: string
  bloqueId?: number | string
  codigo?: string
  tipoAmbiente?: string
}

export interface TipoAmbienteInfra {
  id: number | string
  nombre: string
  codigo?: string
}

export const infraService = {
  getCampus: async () => {
    return infraApiClient.get<{ success: boolean; data: Campus[] }>(
      "/campus?page=1&limit=1000&orderBy=nombre&orderDir=asc&activo=true"
    )
  },

  getFacultades: async () => {
    return infraApiClient.get<{
      success: boolean
      data?: FacultadInfra[]
      items?: FacultadInfra[]
    }>("/facultades?page=1&limit=200&orderBy=nombre&orderDir=asc&activo=true")
  },

  getTiposAmbiente: async () => {
    return infraApiClient.get<{
      success: boolean
      data?: TipoAmbienteInfra[]
      items?: TipoAmbienteInfra[]
    }>("/tipo_ambientes?page=1&limit=1000&activo=true&orderDir=asc&orderBy=nombre")
  },

  getBloques: async (facultadId?: string, campusId?: string) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "1000",
      activo: "true",
      orderBy: "nombre",
      orderDir: "asc",
    })
    if (facultadId) params.append("facultadId", facultadId)
    if (campusId) params.append("campusId", campusId)
    return infraApiClient.get<{ success: boolean; data: Bloque[] }>(`/bloques?${params.toString()}`)
  },

  getAmbientes: async (bloqueId?: string, facultadId?: string, campusId?: string) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "1000",
      orderBy: "nombre",
      orderDir: "asc",
      activo: "true",
      clases: "true",
    })
    if (bloqueId) params.append("bloqueId", bloqueId)
    if (facultadId) params.append("facultadId", facultadId)
    if (campusId) params.append("campusId", campusId)
    return infraApiClient.get<{ success: boolean; data: Ambiente[] }>(
      `/ambientes?${params.toString()}`
    )
  },
}
