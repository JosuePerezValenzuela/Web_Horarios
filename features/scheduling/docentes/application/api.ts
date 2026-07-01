/**
 * Docentes API functions
 */

import { apiClient, horariosApi } from "@/shared/services/api/client"
import type {
  ApiResponse,
  DocenteHorariosApiResponse,
  DocentesFilters,
  AdminScheduleApiResponse,
  HorarioCatalogoItem,
  CrearAsignacionHorarioRequest,
  CrearAsignacionHorarioResponse,
  PatchAsignacionHorarioRequest,
  PatchAsignacionHorarioResponse,
  NormalizedSchedule,
} from "../domain/types"

export interface Facultad {
  id: string
  nombre: string
}

export interface Carrera {
  id: string
  nombre: string
  facultadId: string
}

export interface Asignatura {
  id: string
  nombre: string
  carreraId: string
}

interface FetchDocentesParams extends DocentesFilters {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

interface DocentesApiResponse {
  success: boolean
  items: {
    id: number
    codigo: string
    documento: string | null
    nombres: string
  }[]
  pagination: {
    currentPage: number
    pageSize: number
    totalRecords: number
    totalPages: number
    nextPage: number | null
    previousPage: number | null
  }
}

/**
 * Fetch paginated list of docentes with filters and search
 */
export async function fetchDocentes(
  params: FetchDocentesParams = {}
): Promise<DocentesApiResponse> {
  const searchParams = new URLSearchParams()

  // Default pageSize to 6 if not provided
  const pageSize = params.pageSize ?? 6

  // Build filter object for json filter
  const filter: Record<string, string | number> = {}
  if (params.facultadId) filter.facultad_id = Number(params.facultadId)
  if (params.carreraId) filter.carrera_id = Number(params.carreraId)
  if (params.asignaturaId) filter.asignatura_id = Number(params.asignaturaId)

  // Add filter as JSON string if there are filters
  if (Object.keys(filter).length > 0) {
    searchParams.set("filter", JSON.stringify(filter))
  }

  if (params.search) searchParams.set("search", params.search)
  if (params.page) searchParams.set("page", params.page.toString())
  searchParams.set("pageSize", pageSize.toString())
  if (params.sortBy) searchParams.set("sort", params.sortBy)
  if (params.sortOrder)
    searchParams.set("sort", `${params.sortOrder === "desc" ? "-" : ""}${params.sortBy}`)

  const queryString = searchParams.toString()
  const endpoint = `/docentes${queryString ? `?${queryString}` : ""}`

  return apiClient.get<DocentesApiResponse>(endpoint)
}

/**
 * Fetch all facultades
 */
export async function fetchFacultades(): Promise<Facultad[]> {
  const response = await apiClient.get<ApiResponse<Facultad[]>>("/facultad/all")
  return response.data
}

/**
 * Fetch all carreras, optionally filtered by facultad
 */
export async function fetchCarreras(facultadId?: string): Promise<Carrera[]> {
  const searchParams = new URLSearchParams()
  if (facultadId) searchParams.set("facultad_id", facultadId)

  const queryString = searchParams.toString()
  const endpoint = `/carrera/all${queryString ? `?${queryString}` : ""}`

  const response = await apiClient.get<ApiResponse<Carrera[]>>(endpoint)
  return response.data
}

/**
 * Fetch all asignaturas, optionally filtered by carrera
 */
export async function fetchAsignaturas(
  carreraId?: string,
  facultadId?: string
): Promise<Asignatura[]> {
  const searchParams = new URLSearchParams()
  if (facultadId) searchParams.set("facultad_id", facultadId)
  if (carreraId) searchParams.set("carrera_id", carreraId)

  const queryString = searchParams.toString()
  const endpoint = `/asignatura/all${queryString ? `?${queryString}` : ""}`

  const response = await apiClient.get<ApiResponse<Asignatura[]>>(endpoint)
  return response.data
}

/**
 * Fetch horarios by docente id
 */
export async function getDocenteHorariosById(
  id: string | number
): Promise<DocenteHorariosApiResponse> {
  return apiClient.get<DocenteHorariosApiResponse>(`/docentes/${id}/horarios`)
}

export async function hydrateSchedulesWithAmbienteDetails(
  schedules: NormalizedSchedule[]
): Promise<NormalizedSchedule[]> {
  return schedules
}

export async function fetchDocenteAdminHorarios(
  codigoPersona: string
): Promise<AdminScheduleApiResponse> {
  return apiClient.get<AdminScheduleApiResponse>(
    `/asignacion-horario?codigo_persona=${encodeURIComponent(codigoPersona)}`
  )
}

export async function fetchHorarioCatalogo(
  page: number,
  pageSize: number
): Promise<{ success: boolean; data: HorarioCatalogoItem[] }> {
  return horariosApi.getHorarioCatalogo(page, pageSize)
}

export async function crearAsignacionHorario(
  payload: CrearAsignacionHorarioRequest
): Promise<CrearAsignacionHorarioResponse> {
  return horariosApi.crearAsignacionHorario(payload)
}

export async function patchAsignacionHorario(
  id: number,
  payload: PatchAsignacionHorarioRequest
): Promise<PatchAsignacionHorarioResponse> {
  return horariosApi.patchAsignacionHorario(id, payload)
}
