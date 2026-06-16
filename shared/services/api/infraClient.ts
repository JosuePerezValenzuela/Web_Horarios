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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
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

export interface Campus {
  id: number | string
  nombre: string
}

export interface FacultadInfra {
  id: number | string
  nombre: string
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
}

export const infraService = {
  getCampus: async () => {
    return infraApiClient.get<{ success: boolean; data: Campus[] }>(
      "/campus?page=1&limit=1000&orderBy=nombre&orderDir=asc&activo=true"
    )
  },

  getFacultades: async () => {
    return infraApiClient.get<{ success: boolean; data: FacultadInfra[] }>(
      "/facultad?page=1&limit=200&orderBy=nombre&orderDir=asc&activo=true"
    )
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

  getAmbientes: async (bloqueId?: string) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "1000",
      orderBy: "nombre",
      orderDir: "asc",
      activo: "true",
      clases: "true",
    })
    if (bloqueId) params.append("bloquesId", bloqueId)
    return infraApiClient.get<{ success: boolean; data: Ambiente[] }>(
      `/ambientes?${params.toString()}`
    )
  },
}
