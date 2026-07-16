import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"
import { assignLanes } from "./normalizers"
import type { NormalizedSchedule, Pagination } from "../domain/types"

export interface HorarioClaseItem {
  id: number
  dia: number // 1..6 (1=Lunes)
  hora_inicio: string // "HH:mm"
  hora_fin: string // "HH:mm"
  fecha_inicio: string // "YYYY-MM-DD"
  fecha_fin: string // "YYYY-MM-DD"
  aula_id: number
  aula_codigo?: string | null
  modalidad?: string
  persona_grupo_id: number
  persona?: {
    codigo: string
    documento: string
    nombres: string
  } | null
  tipo_designacion?: string
  grupo: string
  gestion: number
  periodo: number
  asignatura?: {
    codigo: string
    nombre: string
  } | null
  plan_estudio?: {
    codigo: string
    nombre: string
  } | null
  facultad?: {
    codigo: string
    nombre: string
  } | null
}

interface HorariosListApiResponse {
  success: boolean
  items: HorarioClaseItem[]
  pagination: Pagination
}

export interface HorariosListFilters {
  facultad_codigo?: string
  plan_estudio_codigo?: string
  asignatura_codigo?: string[]
  grupo?: string[]
  persona_documento?: string
  gestion?: number
  periodo?: number
  fecha_desde?: string
  fecha_hasta?: string
  hora_desde?: string
  hora_hasta?: string
  dia?: number
  aula_id?: string
  solo_conflicto: boolean
  persona_grupo_activo: boolean

  // Nuevos filtros de infraestructura
  infra_campus_id?: string
  infra_facultad_id?: string
  infra_bloque_id?: string
  infra_ambiente_id?: string
}

interface HorariosListState {
  horarios: HorarioClaseItem[]
  normalizedSchedules: NormalizedSchedule[]
  filters: HorariosListFilters
  pagination: Pagination
  loading: boolean
  error: string | null
  sortField: string | undefined

  // Acciones
  setFilter: <K extends keyof HorariosListFilters>(key: K, value: HorariosListFilters[K]) => void
  setPage: (page: number) => void
  setSort: (sortField: string) => void
  fetchHorarios: () => Promise<void>
  resetFilters: () => void
}

const defaultFilters: HorariosListFilters = {
  facultad_codigo: undefined,
  plan_estudio_codigo: undefined,
  asignatura_codigo: [],
  grupo: [],
  persona_documento: undefined,
  gestion: undefined,
  periodo: undefined,
  fecha_desde: undefined,
  fecha_hasta: undefined,
  hora_desde: undefined,
  hora_hasta: undefined,
  dia: undefined,
  aula_id: undefined,
  solo_conflicto: false,
  persona_grupo_activo: true, // Fijo por defecto
  infra_campus_id: undefined,
  infra_facultad_id: undefined,
  infra_bloque_id: undefined,
  infra_ambiente_id: undefined,
}

const defaultPagination: Pagination = {
  currentPage: 1,
  pageSize: 1000, // Cambio solicitado por el usuario
  totalRecords: 0,
  totalPages: 0,
  nextPage: null,
  previousPage: null,
}

// Helper para convertir hora "HH:mm" a minutos
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

// Normalizador para la grilla semanal
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const parts = datePart.split("-")
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

function normalizeHorarioToSchedule(item: HorarioClaseItem, index: number): NormalizedSchedule {
  const startMin = timeToMinutes(item.hora_inicio)
  const endMin = timeToMinutes(item.hora_fin)

  // Use aula_codigo directly. If not present, fall back to aula_id. Do not hardcode prefixes in the store.
  const rawAula = item.aula_codigo || (item.aula_id ? String(item.aula_id) : "")
  const ambienteLabel = rawAula || "Sin aula"

  return {
    scheduleId: `list-${item.id}-${index}`,
    groupKey: `${item.asignatura?.codigo || "MAT"}-${item.grupo}`,
    persona_grupo_id: item.persona_grupo_id,
    ambienteId: item.aula_id,
    colorIndex: (item.persona_grupo_id || index) % 8, // Color basado en grupo para consistencia
    day: item.dia as 1 | 2 | 3 | 4 | 5 | 6,
    startMin,
    endMin,
    durationMin: endMin - startMin,
    laneIndex: 0,
    laneCount: 1,
    materia: item.asignatura?.nombre || item.plan_estudio?.nombre || "Materia no especificada",
    grupo: item.grupo,
    carreras: item.plan_estudio?.nombre ? [item.plan_estudio.nombre] : [],
    ambienteLabel,
    tipoLabel: item.modalidad === "C" ? "Presencial" : "Virtual",
    fechasLabel: `${formatDate(item.fecha_inicio)} al ${formatDate(item.fecha_fin)}`,
    dbId: item.id,
    fechaInicioRaw: item.fecha_inicio,
    fechaFinRaw: item.fecha_fin,
    docente: item.persona?.nombres || "Docente no asignado",
    materiaCodigo: item.asignatura?.codigo || undefined,
  }
}

export const useHorariosListStore = create<HorariosListState>()((set, get) => ({
  horarios: [],
  normalizedSchedules: [],
  filters: defaultFilters,
  pagination: defaultPagination,
  loading: false,
  error: null,
  sortField: undefined as string | undefined,

  setFilter: (key, value) => {
    set((state) => {
      const newFilters = { ...state.filters, [key]: value }

      // Regla funcional: si quitamos la asignatura, el grupo también se debe limpiar
      if (key === "asignatura_codigo" && (!value || (value as string[]).length === 0)) {
        newFilters.grupo = []
      }

      // Al cambiar cualquier filtro, la paginación vuelve a la página 1
      return {
        filters: newFilters,
        pagination: { ...state.pagination, currentPage: 1 },
      }
    })
  },

  setPage: (page: number) => {
    const { pagination } = get()
    if (page >= 1 && page <= (pagination.totalPages || 1)) {
      set({ pagination: { ...pagination, currentPage: page } })
      get().fetchHorarios()
    }
  },

  setSort: (sortField: string) => {
    set({ sortField })
    get().fetchHorarios()
  },

  fetchHorarios: async () => {
    const { filters, pagination, sortField } = get()

    // Validar filtros obligatorios
    if (!filters.facultad_codigo || !filters.gestion || filters.periodo === undefined) {
      set({ horarios: [], normalizedSchedules: [], loading: false, error: null })
      return
    }

    // Validaciones de negocio antes de consultar la API
    if (
      filters.grupo &&
      filters.grupo.length > 0 &&
      (!filters.asignatura_codigo || filters.asignatura_codigo.length === 0)
    ) {
      set({ error: "No podés filtrar por grupo sin seleccionar una asignatura primero." })
      return
    }

    if (filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta) {
      set({ error: "La fecha de inicio no puede ser posterior a la fecha de fin." })
      return
    }

    if (filters.hora_desde && filters.hora_hasta && filters.hora_desde >= filters.hora_hasta) {
      set({ error: "La hora de inicio debe ser estrictamente menor a la hora de fin." })
      return
    }

    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()

      // Filtros opcionales
      if (filters.facultad_codigo) searchParams.set("facultad_codigo", filters.facultad_codigo)
      if (filters.plan_estudio_codigo)
        searchParams.set("plan_estudio_codigo", filters.plan_estudio_codigo)
      if (filters.asignatura_codigo && filters.asignatura_codigo.length > 0)
        searchParams.set("asignatura_codigo", filters.asignatura_codigo.join(","))
      if (filters.grupo && filters.grupo.length > 0)
        searchParams.set("grupo", filters.grupo.join(","))
      if (filters.persona_documento)
        searchParams.set("persona_documento", filters.persona_documento)
      if (filters.gestion) searchParams.set("gestion", filters.gestion.toString())
      if (filters.periodo !== undefined) searchParams.set("periodo", filters.periodo.toString())
      if (filters.fecha_desde) searchParams.set("fecha_desde", filters.fecha_desde)
      if (filters.fecha_hasta) searchParams.set("fecha_hasta", filters.fecha_hasta)
      if (filters.hora_desde) searchParams.set("hora_desde", filters.hora_desde)
      if (filters.hora_hasta) searchParams.set("hora_hasta", filters.hora_hasta)
      if (filters.dia !== undefined) searchParams.set("dia", filters.dia.toString())
      if (filters.aula_id) searchParams.set("aula_id", filters.aula_id)

      // Filtros de infraestructura
      if (filters.infra_campus_id) searchParams.set("infra_campus_id", filters.infra_campus_id)
      if (filters.infra_facultad_id)
        searchParams.set("infra_facultad_id", filters.infra_facultad_id)
      if (filters.infra_bloque_id) searchParams.set("infra_bloque_id", filters.infra_bloque_id)
      if (filters.infra_ambiente_id)
        searchParams.set("infra_ambiente_id", filters.infra_ambiente_id)

      // Filtros fijos
      searchParams.set("persona_grupo_activo", filters.persona_grupo_activo.toString())
      searchParams.set("pageSize", pagination.pageSize.toString())
      searchParams.set("page", pagination.currentPage.toString())

      if (sortField) {
        searchParams.set("sort", sortField)
      }

      const response = await apiClient.get<HorariosListApiResponse>(
        `/horario-clases?${searchParams.toString()}`
      )

      const items = response.items || []
      const rawNormalized = items.map((item, idx) => normalizeHorarioToSchedule(item, idx))
      const normalizedSchedules = assignLanes(rawNormalized)

      set({
        horarios: items,
        normalizedSchedules,
        pagination: {
          currentPage: response.pagination?.currentPage || 1,
          pageSize: response.pagination?.pageSize || pagination.pageSize,
          totalRecords: response.pagination?.totalRecords || items.length,
          totalPages: response.pagination?.totalPages || 1,
          nextPage: response.pagination?.nextPage || null,
          previousPage: response.pagination?.previousPage || null,
        },
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar horarios de clases",
        loading: false,
      })
    }
  },

  resetFilters: () => {
    set({
      filters: defaultFilters,
      pagination: defaultPagination,
      error: null,
    })
    get().fetchHorarios()
  },
}))
