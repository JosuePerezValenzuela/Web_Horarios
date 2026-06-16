/**
 * API client using native fetch
 */

import type { User } from "@/features/auth/domain/types"
import type {
  EliminarHorariosBatchRequest,
  EliminarHorariosBatchResponse,
  EditarHorariosBatchRequest,
  EditarHorariosBatchResponse,
} from "@/features/scheduling/docentes/domain/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

export interface ApiError extends Error {
  status: number
  body?: unknown
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
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

    if (response.status === 401) {
      if (typeof window !== "undefined" && !endpoint.includes("/auth/me")) {
        window.location.href = "/"
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

  async patch<T>(endpoint: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body })
  }

  async delete<T>(endpoint: string, body?: unknown, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE", body })
  }
}

export const apiClient = new ApiClient()

export interface BuscarAmbienteRequest {
  dia: number
  hora_inicio: string
  hora_fin: string
  fecha_inicio?: string
  fecha_fin?: string
  persona_grupo_id?: number
  capacidad_min?: number
  mismo_piso?: number
  facultad_ids?: number[]
  bloque_ids?: number[]
  tipo_ambiente_ids?: number[]
  page: number
  take?: number
}

export interface BuscarAmbienteResponse {
  success: boolean
  message?: string
  data?: {
    ambientes: Array<{
      id: number
      codigo: string
      nombre: string
      tipo?: string
      capacidad: number
      edificio_id?: number
      edificio_nombre?: string
      edificio_bloque?: string
      facultad_id?: number
      facultad_nombre?: string
      tiene_solapamiento_propio: boolean
    }>
    total: number
    page: number
    take: number
  }
}

export interface AsignarHorarioRequest {
  persona_grupo_id: number
  aula_id: number
  dia: number
  hora_inicio: string
  hora_fin: string
  fecha_inicio: string
  fecha_fin: string
}

export interface AsignarHorarioResponse {
  success: boolean
  message?: string
  data?: {
    id: number
    persona_grupo_id: number
    aula_id: number
    dia: number
    hora_inicio: string
    hora_fin: string
    fecha_inicio: string
    fecha_fin: string
  }
}

export interface HorarioItem {
  dia: number // 0=Lunes...6=Domingo (Infraestructura format)
  hora_inicio: string // "HH:mm"
  hora_fin: string // "HH:mm"
  aula_id: number
}

export interface AsignarHorariosBatchRequest {
  persona_grupo_id: number
  fecha_inicio: string // "YYYY-MM-DD"
  fecha_fin: string // "YYYY-MM-DD"
  horarios: HorarioItem[]
}

export interface AsignarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: Array<{
    id: number
    persona_grupo_id: number
    dia: number
    hora_inicio: string
    hora_fin: string
    fecha_inicio: string
    fecha_fin: string
    aula_id: number
    modalidad: string | null
    created_at: string
  }>
}

// Auth-specific methods
export const authApi = {
  me: (): Promise<User> => {
    return apiClient.get<User>("/auth/me")
  },
}

// Horarios methods
export const horariosApi = {
  buscarAmbientes: (payload: BuscarAmbienteRequest): Promise<BuscarAmbienteResponse> => {
    return apiClient.post<BuscarAmbienteResponse>(
      "/horario-clases/asignar/buscar-ambientes",
      payload
    )
  },

  asignar: (payload: AsignarHorarioRequest): Promise<AsignarHorarioResponse> => {
    return apiClient.post<AsignarHorarioResponse>("/horario-clases/asignar", payload)
  },

  asignarBatch: (payload: AsignarHorariosBatchRequest): Promise<AsignarHorariosBatchResponse> => {
    return apiClient.post<AsignarHorariosBatchResponse>("/horario-clases/asignar", payload)
  },

  editarBatch: (payload: EditarHorariosBatchRequest): Promise<EditarHorariosBatchResponse> => {
    return apiClient.patch<EditarHorariosBatchResponse>("/horario-clases", payload)
  },

  eliminarBatch: (
    payload: EliminarHorariosBatchRequest
  ): Promise<EliminarHorariosBatchResponse> => {
    return apiClient.delete<EliminarHorariosBatchResponse>("/horario-clases", payload)
  },
}
