import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"
import type {
  SolapamientoDocente,
  DetectarSolapamientosResponse,
  LocalOverlapConflict,
  SolapamientoHorario,
  SolapamientoHorarioClase,
  SolapamientoHorarioAdministrativo,
} from "../domain/types"
import type {
  NormalizedSchedule,
  AdminSchedule,
  TimeRange,
  TimeRow,
} from "../../docentes/domain/types"
import {
  buildRows,
  assignLanes,
  resolveDefaultPeriod,
} from "../../docentes/application/normalizers"

export const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const parts = datePart.split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return ""
  const parts = timeStr.split(":")
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
  }
  return timeStr
}

export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Transforma los pares de solapamiento provistos directamente por el backend
 * al formato de visualización del frontend. El backend es la única fuente de verdad
 * para la detección y filtrado de solapamientos.
 */
export function mapDocenteConflicts(docente: SolapamientoDocente): LocalOverlapConflict[] {
  if (!docente?.solapamientos || !Array.isArray(docente.solapamientos)) return []

  return docente.solapamientos.map((par, index) => {
    const a = par.horario_a
    const b = par.horario_b

    const startMinA = parseTimeToMinutes(a.hora_inicio)
    const endMinA = parseTimeToMinutes(a.hora_fin)
    const startMinB = parseTimeToMinutes(b.hora_inicio)
    const endMinB = parseTimeToMinutes(b.hora_fin)

    const overlapStart = Math.max(startMinA, startMinB)
    const overlapEnd = Math.min(endMinA, endMinB)
    const overlapDuration = Math.max(0, overlapEnd - overlapStart)

    const dia = a.dia || b.dia || 1
    const diaLabel = DAY_LABELS[dia] || `Día ${dia}`

    const labelA =
      a.tipo === "clase"
        ? `${a.asignatura_nombre} (Grupo ${a.grupo})`
        : a.horario_descripcion ||
          a.tipo_asignacion_horario_administrativo?.descripcion ||
          "Horario Administrativo"

    const labelB =
      b.tipo === "clase"
        ? `${b.asignatura_nombre} (Grupo ${b.grupo})`
        : b.horario_descripcion ||
          b.tipo_asignacion_horario_administrativo?.descripcion ||
          "Horario Administrativo"

    const rangeA = a.fecha_fin
      ? `${formatDate(a.fecha_inicio)} a ${formatDate(a.fecha_fin)}`
      : `Desde ${formatDate(a.fecha_inicio)}`

    const rangeB = b.fecha_fin
      ? `${formatDate(b.fecha_inicio)} a ${formatDate(b.fecha_fin)}`
      : `Desde ${formatDate(b.fecha_inicio)}`

    return {
      id: `${a.tipo}-${a.id}-${b.tipo}-${b.id}-${dia}-${index}`,
      tipo: par.categoria,
      horarioA: {
        id: a.id,
        tipo: a.tipo,
        label: labelA,
        hora: `${formatTime(a.hora_inicio)} - ${formatTime(a.hora_fin)}`,
        rangoFechas: rangeA,
        diaLabel,
        startMin: startMinA,
        carreras: (a.carreras || []).map((car) => car.nombre),
      },
      horarioB: {
        id: b.id,
        tipo: b.tipo,
        label: labelB,
        hora: `${formatTime(b.hora_inicio)} - ${formatTime(b.hora_fin)}`,
        rangoFechas: rangeB,
        diaLabel,
        startMin: startMinB,
        carreras: (b.carreras || []).map((car) => car.nombre),
      },
      overlapDuration,
      dia,
    }
  })
}

/**
 * Extrae todos los horarios únicos del docente (tanto los que se solapan
 * como los que no tienen solapamiento) para alimentar la grilla semanal completa.
 */
export function extractDocenteSchedules(docente: SolapamientoDocente): {
  classSchedules: SolapamientoHorarioClase[]
  adminSchedules: SolapamientoHorarioAdministrativo[]
} {
  const classMap = new Map<number, SolapamientoHorarioClase>()
  const adminMap = new Map<number, SolapamientoHorarioAdministrativo>()

  const processSchedule = (h: SolapamientoHorario | undefined | null) => {
    if (!h) return
    if (h.tipo === "clase") {
      classMap.set(h.id, h)
    } else if (h.tipo === "administrativo") {
      adminMap.set(h.id, h)
    }
  }

  for (const sol of docente?.solapamientos || []) {
    processSchedule(sol.horario_a)
    processSchedule(sol.horario_b)
  }

  for (const h of docente?.horarios_sin_solapamiento || []) {
    processSchedule(h)
  }

  return {
    classSchedules: Array.from(classMap.values()),
    adminSchedules: Array.from(adminMap.values()),
  }
}

interface SolapamientosFilters {
  tolerancia_minutos: number
  persona_codigo: string
  facultad_codigo: string
}

interface SolapamientosState {
  docentes: SolapamientoDocente[]
  totalDocentes: number
  loading: boolean
  error: string | null
  filters: SolapamientosFilters
  currentDocenteIndex: number

  // Computed values for active docente
  schedules: NormalizedSchedule[]
  adminSchedules: AdminSchedule[]
  conflicts: LocalOverlapConflict[]
  horariosSinSolapamiento: SolapamientoHorario[]
  timeRange: TimeRange
  rows: TimeRow[]
  period: number

  // Actions
  setFilter: <K extends keyof SolapamientosFilters>(key: K, value: SolapamientosFilters[K]) => void
  fetchSolapamientos: () => Promise<void>
  setCurrentDocenteIndex: (index: number) => void
  nextDocente: () => void
  prevDocente: () => void
  setPeriod: (period: number) => void
  reset: () => void
}

const DEFAULT_PERIOD = 90
const EMPTY_RANGE: TimeRange = {
  startMin: 8 * 60,
  endMin: 18 * 60,
}

const INITIAL_STATE = {
  docentes: [],
  totalDocentes: 0,
  loading: false,
  error: null,
  filters: {
    tolerancia_minutos: 0,
    persona_codigo: "",
    facultad_codigo: "",
  },
  currentDocenteIndex: 0,
  schedules: [],
  adminSchedules: [],
  conflicts: [],
  horariosSinSolapamiento: [],
  timeRange: EMPTY_RANGE,
  rows: buildRows(EMPTY_RANGE, DEFAULT_PERIOD),
  period: DEFAULT_PERIOD,
}

export const useSolapamientosStore = create<SolapamientosState>()((set, get) => {
  const updateCurrentDocenteComputedData = (
    docentes: SolapamientoDocente[],
    index: number,
    currentPeriod: number = DEFAULT_PERIOD
  ) => {
    if (!docentes || docentes.length === 0 || index < 0 || index >= docentes.length) {
      set({
        schedules: [],
        adminSchedules: [],
        conflicts: [],
        horariosSinSolapamiento: [],
        timeRange: EMPTY_RANGE,
        rows: buildRows(EMPTY_RANGE, currentPeriod),
      })
      return
    }

    const docente = docentes[index]
    const conflicts = mapDocenteConflicts(docente)
    const { classSchedules, adminSchedules: rawAdminSchedules } = extractDocenteSchedules(docente)

    // Map stable color index to each groupKey
    const groupKeys = Array.from(
      new Set(classSchedules.map((c) => `${c.asignatura_nombre}::${c.grupo}`))
    )
    const colorByGroupKey = new Map<string, number>()
    groupKeys.forEach((key, idx) => {
      colorByGroupKey.set(key, idx)
    })

    // Normalizar horarios de clase para la grilla
    const rawSchedules: NormalizedSchedule[] = classSchedules.map((c) => {
      const startMin = parseTimeToMinutes(c.hora_inicio)
      const endMin = parseTimeToMinutes(c.hora_fin)
      const groupKey = `${c.asignatura_nombre}::${c.grupo}`
      const rawAula = c.aula_codigo ?? c.aulaCodigo ?? c.ambiente
      const ambienteLabel = rawAula ? String(rawAula).trim() : "Sin ambiente"

      return {
        scheduleId: `clase-${c.id}`,
        groupKey,
        persona_grupo_id: c.persona_grupo?.id ?? 0,
        ambienteId: c.aula_id ?? null,
        colorIndex: colorByGroupKey.get(groupKey) ?? 0,
        day: (c.dia || 1) as 1 | 2 | 3 | 4 | 5 | 6,
        startMin,
        endMin,
        durationMin: Math.max(0, endMin - startMin),
        laneIndex: 0,
        laneCount: 1,
        materia: c.asignatura_nombre,
        materiaCodigo: c.asignatura_codigo,
        grupo: c.grupo,
        docente: docente.nombres,
        carreras: (c.carreras || []).map((car) => car.nombre),
        ambienteLabel,
        tipoLabel: c.tipo_designacion || "TITULAR",
        fechasLabel: c.fecha_fin
          ? `${formatDate(c.fecha_inicio)} a ${formatDate(c.fecha_fin)}`
          : `Desde ${formatDate(c.fecha_inicio)}`,
        dbId: c.id,
        fechaInicioRaw: c.fecha_inicio,
        fechaFinRaw: c.fecha_fin,
        primario: c.persona_grupo?.primario,
        primario_id: c.persona_grupo?.primario_id,
        virtual: Boolean(c.virtual),
      }
    })

    const schedules = assignLanes(rawSchedules)

    // Normalizar horarios administrativos para la grilla
    const adminSchedules: AdminSchedule[] = rawAdminSchedules.map((a) => {
      const startMin = parseTimeToMinutes(a.hora_inicio)
      const endMin = parseTimeToMinutes(a.hora_fin)
      const dayVal = typeof a.dia === "number" ? a.dia : 1
      return {
        id: a.id,
        startMin,
        endMin,
        label:
          a.horario_descripcion ||
          a.tipo_asignacion_horario_administrativo?.descripcion ||
          "Horario Administrativo",
        days: [dayVal],
      }
    })

    // Calcular rangos de tiempo activos para la grilla
    let startMin = Infinity
    let endMin = -Infinity

    schedules.forEach((s) => {
      startMin = Math.min(startMin, s.startMin)
      endMin = Math.max(endMin, s.endMin)
    })

    adminSchedules.forEach((a) => {
      startMin = Math.min(startMin, a.startMin)
      endMin = Math.max(endMin, a.endMin)
    })

    if (startMin === Infinity || endMin === -Infinity) {
      startMin = 8 * 60
      endMin = 18 * 60
    }

    const timeRange = { startMin, endMin }
    const resolvedPeriod = resolveDefaultPeriod(schedules)

    set({
      schedules,
      adminSchedules,
      conflicts,
      horariosSinSolapamiento: docente.horarios_sin_solapamiento || [],
      timeRange,
      period: resolvedPeriod,
      rows: buildRows(timeRange, resolvedPeriod),
    })
  }

  return {
    ...INITIAL_STATE,

    setFilter: (key, value) => {
      set((state) => ({
        filters: {
          ...state.filters,
          [key]: value,
        },
      }))
    },

    fetchSolapamientos: async () => {
      set({ loading: true, error: null })
      const { filters, period } = get()

      try {
        const queryParams = new URLSearchParams()
        queryParams.append("tolerancia_minutos", String(filters.tolerancia_minutos ?? 0))

        if (filters.persona_codigo?.trim()) {
          queryParams.append("persona_codigo", filters.persona_codigo.trim())
        }
        if (filters.facultad_codigo && filters.facultad_codigo !== "none") {
          queryParams.append("facultad_codigo", filters.facultad_codigo)
        }

        const response = await apiClient.get<DetectarSolapamientosResponse>(
          `/detectar-solapamientos?${queryParams.toString()}`
        )

        const docentes = response?.docentes || []
        const totalDocentes = response?.metadata?.total_docentes ?? docentes.length

        set({
          docentes,
          totalDocentes,
          currentDocenteIndex: 0,
          loading: false,
        })

        updateCurrentDocenteComputedData(docentes, 0, period)
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Error al cargar solapamientos",
          loading: false,
          docentes: [],
          totalDocentes: 0,
        })
        updateCurrentDocenteComputedData([], 0, period)
      }
    },

    setCurrentDocenteIndex: (index) => {
      const { docentes, period } = get()
      if (index >= 0 && index < docentes.length) {
        set({ currentDocenteIndex: index })
        updateCurrentDocenteComputedData(docentes, index, period)
      }
    },

    nextDocente: () => {
      const { currentDocenteIndex, docentes } = get()
      if (currentDocenteIndex < docentes.length - 1) {
        get().setCurrentDocenteIndex(currentDocenteIndex + 1)
      }
    },

    prevDocente: () => {
      const { currentDocenteIndex } = get()
      if (currentDocenteIndex > 0) {
        get().setCurrentDocenteIndex(currentDocenteIndex - 1)
      }
    },

    setPeriod: (period) => {
      const safePeriod = Number.isFinite(period) && period > 0 ? Math.trunc(period) : DEFAULT_PERIOD
      const { timeRange, docentes, currentDocenteIndex } = get()
      set({
        period: safePeriod,
        rows: buildRows(timeRange, safePeriod),
      })
      updateCurrentDocenteComputedData(docentes, currentDocenteIndex, safePeriod)
    },

    reset: () => {
      set({ ...INITIAL_STATE })
    },
  }
})
