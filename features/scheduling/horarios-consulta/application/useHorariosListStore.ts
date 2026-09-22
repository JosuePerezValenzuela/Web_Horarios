import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"
import { assignLanes } from "@/features/scheduling/docentes/application/normalizers"
import type { NormalizedSchedule } from "@/features/scheduling/docentes/domain/types"

export interface HorarioClaseItem {
  id: number
  dia: number // 1..6 (1=Lunes)
  hora_inicio: string // "HH:mm"
  hora_fin: string // "HH:mm"
  fecha_inicio: string | null // "YYYY-MM-DD"
  fecha_fin: string | null // "YYYY-MM-DD"
  aula_id: number | null
  aula_codigo: string | null
  modalidad: string | null
  persona_grupo_id: number
  persona: {
    codigo: string
    documento: string
    nombres: string
  } | null
  tipo_designacion?: string | null
  grupo: string
  gestion: number
  periodo: number
  asignatura: {
    codigo: string
    nombre: string
  } | null
  plan_estudios: Array<{
    codigo: string
    nombre: string
  }>
}

interface HorariosListApiResponse {
  items: HorarioClaseItem[]
}

export interface HorariosListFilters {
  facultad_codigo?: string
  gestion?: number
  periodo?: number
  plan_estudio_codigo?: string
  asignatura_codigo?: string
  grupo?: string
  fecha_desde?: string
  fecha_hasta?: string
  infraCampusId?: number
  infraFacultadId?: number
  infraBloqueId?: number
  infraAulaId?: number
}

interface HorariosListState {
  horarios: HorarioClaseItem[]
  normalizedSchedules: NormalizedSchedule[]
  filters: HorariosListFilters
  loading: boolean
  error: string | null

  // Acciones
  setFilter: <K extends keyof HorariosListFilters>(key: K, value: HorariosListFilters[K]) => void
  fetchHorarios: () => Promise<void>
  resetFilters: () => void
}

const defaultFilters: HorariosListFilters = {
  facultad_codigo: undefined,
  gestion: undefined,
  periodo: undefined,
  plan_estudio_codigo: undefined,
  asignatura_codigo: undefined,
  grupo: undefined,
  fecha_desde: undefined,
  fecha_hasta: undefined,
  infraCampusId: undefined,
  infraFacultadId: undefined,
  infraBloqueId: undefined,
  infraAulaId: undefined,
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

  const carreras = Array.isArray(item.plan_estudios)
    ? item.plan_estudios.map((p) => p.nombre).filter(Boolean)
    : []

  const materia =
    item.asignatura?.nombre || item.plan_estudios?.[0]?.nombre || "Materia no especificada"

  const fechasLabel =
    item.fecha_inicio && item.fecha_fin
      ? `${formatDate(item.fecha_inicio)} al ${formatDate(item.fecha_fin)}`
      : ""

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
    materia,
    grupo: item.grupo,
    carreras,
    ambienteLabel,
    tipoLabel: item.modalidad === "C" ? "Presencial" : "Virtual",
    fechasLabel,
    dbId: item.id,
    fechaInicioRaw: item.fecha_inicio,
    fechaFinRaw: item.fecha_fin,
    docente: item.persona?.nombres || "Docente no asignado",
    materiaCodigo: item.asignatura?.codigo || undefined,
    ambienteCodigo: item.aula_codigo || undefined,
  }
}

export const useHorariosListStore = create<HorariosListState>()((set, get) => ({
  horarios: [],
  normalizedSchedules: [],
  filters: defaultFilters,
  loading: false,
  error: null,

  setFilter: (key, value) => {
    set((state) => {
      const newFilters = { ...state.filters, [key]: value }

      // Regla funcional: si quitamos la asignatura, el grupo también se debe limpiar
      if (key === "asignatura_codigo" && !value) {
        newFilters.grupo = undefined
      }

      return {
        filters: newFilters,
      }
    })
  },

  fetchHorarios: async () => {
    const { filters } = get()

    // Validar filtros obligatorios
    if (!filters.facultad_codigo || !filters.gestion || filters.periodo === undefined) {
      set({ horarios: [], normalizedSchedules: [], loading: false, error: null })
      return
    }

    if (filters.fecha_desde && filters.fecha_hasta && filters.fecha_desde > filters.fecha_hasta) {
      set({ error: "La fecha de inicio no puede ser posterior a la fecha de fin." })
      return
    }

    if (
      (filters.infraCampusId && !filters.infraFacultadId) ||
      (!filters.infraCampusId && filters.infraFacultadId)
    ) {
      set({
        error:
          "Para filtrar por espacio físico se requiere seleccionar tanto Campus como Facultad.",
      })
      return
    }

    if (
      (filters.infraBloqueId || filters.infraAulaId) &&
      (!filters.infraCampusId || !filters.infraFacultadId)
    ) {
      set({
        error: "Para filtrar por bloque o ambiente se requiere seleccionar Campus y Facultad.",
      })
      return
    }

    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()

      // Filtros obligatorios
      searchParams.set("facultad_codigo", filters.facultad_codigo)
      searchParams.set("gestion", filters.gestion.toString())
      searchParams.set("periodo", filters.periodo.toString())

      // Filtros opcionales
      if (filters.plan_estudio_codigo) {
        searchParams.set("plan_estudio_codigo", filters.plan_estudio_codigo)
      }
      if (filters.asignatura_codigo) {
        searchParams.set("asignatura_codigo", filters.asignatura_codigo)
      }
      if (filters.grupo) {
        searchParams.set("grupo", filters.grupo)
      }
      if (filters.fecha_desde) {
        searchParams.set("fecha_desde", filters.fecha_desde)
      }
      if (filters.fecha_hasta) {
        searchParams.set("fecha_hasta", filters.fecha_hasta)
      }

      // Filtros de infraestructura (entero positivo)
      if (filters.infraCampusId && filters.infraFacultadId) {
        searchParams.set("infraCampusId", filters.infraCampusId.toString())
        searchParams.set("infraFacultadId", filters.infraFacultadId.toString())
        if (filters.infraBloqueId) {
          searchParams.set("infraBloqueId", filters.infraBloqueId.toString())
        }
        if (filters.infraAulaId) {
          searchParams.set("infraAulaId", filters.infraAulaId.toString())
        }
      }

      const response = await apiClient.get<HorariosListApiResponse>(
        `/horario-clases?${searchParams.toString()}`
      )

      const items = response?.items || []
      const rawNormalized = items.map((item, idx) => normalizeHorarioToSchedule(item, idx))
      const normalizedSchedules = assignLanes(rawNormalized)

      set({
        horarios: items,
        normalizedSchedules,
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
      error: null,
    })
    get().fetchHorarios()
  },
}))
