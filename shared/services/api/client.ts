/**
 * API client using native fetch
 */

import type { User } from "@/features/auth/domain/types"
import type {
  EliminarHorariosBatchRequest,
  EliminarHorariosBatchResponse,
  EditarHorariosBatchRequest,
  EditarHorariosBatchResponse,
  HorarioCatalogoItem,
  CrearAsignacionHorarioRequest,
  CrearAsignacionHorarioResponse,
  PatchAsignacionHorarioRequest,
  PatchAsignacionHorarioResponse,
  TipoAsignacionAdministrativo,
  TipoCargosApiResponse,
} from "@/features/scheduling/docentes/domain/types"

import { toast } from "@umss/estilos-base/components"

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
  private inFlightGetRequests = new Map<string, Promise<unknown>>()

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
          // Extract specific error messages if available from API client (ApiError)
          const apiMsg = body?.message || `Error del servidor (${response.status})`
          toast.error(apiMsg, { id: apiMsg })
          throw error
        })
        .catch((err) => {
          if (!err.status) {
            const msg = `Error de red: ${response.statusText}`
            toast.error(msg, { id: msg })
          }
          throw err
        })
    }
    return response.json() as Promise<T>
  }

  async request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
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

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          const { useAuthStore } = await import("@/features/auth/application/authStore")
          useAuthStore.getState().logout()

          if (window.location.pathname !== "/") {
            window.location.href = "/"
          }
        }
        const error: ApiError = new Error("Unauthorized") as ApiError
        error.status = 401
        throw error
      }

      return await this.handleResponse<T>(response)
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) {
        throw error
      }
      const networkError: ApiError = new Error(
        "No se pudo conectar con el servidor principal. Verifique su conexión o intente más tarde."
      ) as ApiError
      networkError.status = 0
      toast.error(networkError.message, { id: "main-network-error" })
      throw networkError
    }
  }

  async get<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
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
  persona_grupo_id: number
  dia: number // 1-7: lunes=1, domingo=7
  hora_inicio: string // "HH:mm"
  hora_fin: string // "HH:mm"
  fecha_inicio: string // "YYYY-MM-DD"
  fecha_fin: string // "YYYY-MM-DD"
  facultad_ids?: number[]
  bloque_ids?: number[]
  tipo_ambiente_ids?: number[]
  capacidad_min?: number
  mismo_piso?: number
  page?: number
  take?: number
}

export interface BuscarAmbienteResponse {
  success?: boolean
  message?: string
  data?: {
    ambientes: Array<{
      id: number
      codigo: string
      nombre: string
      nombre_corto?: string | null
      piso?: number
      capacidad?: number
      capacidad_total?: number
      capacidad_examen?: number
      tipo?: string
      tipo_ambiente_id?: number
      tipo_ambiente_nombre?: string
      bloque_id?: number
      bloque_nombre?: string
      facultad_id?: number
      facultad_nombre?: string
      campus_id?: number
      campus_nombre?: string
      edificio_id?: number
      edificio_nombre?: string
      edificio_bloque?: string
      tiene_solapamiento_propio: boolean
    }>
    total: number
    page?: number
    take?: number
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

  getHorarioCatalogo: (
    page: number,
    pageSize: number
  ): Promise<{ success: boolean; data: HorarioCatalogoItem[] }> => {
    return apiClient.get<{ success: boolean; data: HorarioCatalogoItem[] }>(
      `/horario-catalogo?page=${page}&pageSize=${pageSize}`
    )
  },

  crearAsignacionHorario: (
    payload: CrearAsignacionHorarioRequest
  ): Promise<CrearAsignacionHorarioResponse> => {
    return apiClient.post<CrearAsignacionHorarioResponse>("/asignacion-horario", payload)
  },

  patchAsignacionHorario: (
    id: number,
    payload: PatchAsignacionHorarioRequest
  ): Promise<PatchAsignacionHorarioResponse> => {
    return apiClient.patch<PatchAsignacionHorarioResponse>(`/asignacion-horario/${id}`, payload)
  },

  eliminarAsignacionHorario: (
    id: number
  ): Promise<{ success: boolean; data?: { message?: string } }> => {
    return apiClient.delete<{ success: boolean; data?: { message?: string } }>(
      `/asignacion-horario/${id}`
    )
  },

  getTipoAsignacionHorarioAdministrativo: (
    page: number,
    pageSize: number
  ): Promise<{ success: boolean; data: TipoAsignacionAdministrativo[] }> => {
    return apiClient.get<{ success: boolean; data: TipoAsignacionAdministrativo[] }>(
      `/tipo-asignacion-horario-administrativo?page=${page}&pageSize=${pageSize}`
    )
  },

  getTipoCargos: (page: number = 1, pageSize: number = 50): Promise<TipoCargosApiResponse> => {
    return apiClient.get<TipoCargosApiResponse>(`/tipo-cargos?page=${page}&pageSize=${pageSize}`)
  },
}
