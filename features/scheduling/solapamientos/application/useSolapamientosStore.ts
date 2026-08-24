import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"
import type {
  SolapamientoDocente,
  DetectarSolapamientosResponse,
  LocalOverlapConflict,
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr
  const parts = datePart.split("-")
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
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

const parseTimeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

const formatMinutes = (value: number): string => {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

// Check date overlap [start, end)
const datesOverlap = (
  startAStr: string,
  endAStr: string | null,
  startBStr: string,
  endBStr: string | null
): boolean => {
  const startA = new Date(startAStr).getTime()
  const endA = endAStr ? new Date(endAStr).getTime() : Infinity
  const startB = new Date(startBStr).getTime()
  const endB = endBStr ? new Date(endBStr).getTime() : Infinity

  return startA < endB && startB < endA
}

// Find local conflicts for a docente
export function detectLocalConflicts(
  docente: SolapamientoDocente,
  toleranciaMinutos: number
): LocalOverlapConflict[] {
  const conflicts: LocalOverlapConflict[] = []
  const classSchedules = docente.horario_clases
  const adminSchedules = docente.horario_administrativo

  interface ScheduleInstance {
    id: number
    type: "clase" | "administrativo"
    dia: number
    startMin: number
    endMin: number
    fechaInicio: string
    fechaFin: string | null
    label: string
    carreras?: string[]
  }

  const instances: ScheduleInstance[] = []

  // Add class instances
  classSchedules.forEach((c) => {
    instances.push({
      id: c.id,
      type: "clase",
      dia: c.dia,
      startMin: parseTimeToMinutes(c.hora_inicio),
      endMin: parseTimeToMinutes(c.hora_fin),
      fechaInicio: c.fecha_inicio,
      fechaFin: c.fecha_fin,
      label: `${c.asignatura_nombre} (Grupo ${c.grupo})`,
      carreras: c.carreras.map((car) => car.nombre),
    })
  })

  // Add admin instances (specific day 1..5 returned by the backend)
  adminSchedules.forEach((a) => {
    const dayVal = typeof a.dia === "number" ? a.dia : 1
    instances.push({
      id: a.id,
      type: "administrativo",
      dia: dayVal,
      startMin: parseTimeToMinutes(a.hora_inicio),
      endMin: parseTimeToMinutes(a.hora_fin),
      fechaInicio: a.fecha_inicio,
      fechaFin: a.fecha_fin,
      label: a.horario_descripcion || "Horario Administrativo",
      carreras: [],
    })
  })

  // Compare all pairs
  for (let i = 0; i < instances.length; i++) {
    for (let j = i + 1; j < instances.length; j++) {
      const a = instances[i]
      const b = instances[j]

      // Same schedule ID and type (e.g. admin schedule expanded to multiple days) shouldn't conflict with itself
      if (a.id === b.id && a.type === b.type) continue

      // Must be same day
      if (a.dia !== b.dia) continue

      // Must overlap in dates
      if (!datesOverlap(a.fechaInicio, a.fechaFin, b.fechaInicio, b.fechaFin)) continue

      // Calculate time overlap duration
      const overlapStart = Math.max(a.startMin, b.startMin)
      const overlapEnd = Math.min(a.endMin, b.endMin)
      const overlapDuration = overlapEnd - overlapStart

      if (overlapDuration > toleranciaMinutos) {
        const diaLabel = DAY_LABELS[a.dia] || `Día ${a.dia}`
        const rangeA = a.fechaFin ? `${a.fechaInicio} a ${a.fechaFin}` : `Desde ${a.fechaInicio}`
        const rangeB = b.fechaFin ? `${b.fechaInicio} a ${b.fechaFin}` : `Desde ${b.fechaInicio}`

        let conflictType: LocalOverlapConflict["tipo"] = "clase-clase"
        if (a.type === "clase" && b.type === "administrativo") conflictType = "clase-admin"
        else if (a.type === "administrativo" && b.type === "clase") conflictType = "clase-admin"
        else if (a.type === "administrativo" && b.type === "administrativo")
          conflictType = "admin-admin"

        conflicts.push({
          id: `${a.type}-${a.id}-${b.type}-${b.id}-${a.dia}`,
          tipo: conflictType,
          horarioA: {
            id: a.id,
            tipo: a.type,
            label: a.label,
            hora: `${formatMinutes(a.startMin)} - ${formatMinutes(a.endMin)}`,
            rangoFechas: rangeA,
            diaLabel,
            startMin: a.startMin,
            carreras: a.carreras,
          },
          horarioB: {
            id: b.id,
            tipo: b.type,
            label: b.label,
            hora: `${formatMinutes(b.startMin)} - ${formatMinutes(b.endMin)}`,
            rangoFechas: rangeB,
            diaLabel,
            startMin: b.startMin,
            carreras: b.carreras,
          },
          overlapDuration,
          dia: a.dia,
        })
      }
    }
  }

  // Sort: Monday (1) to Sunday (7) and earliest to latest within the day
  conflicts.sort((x, y) => {
    if (x.dia !== y.dia) {
      return x.dia - y.dia
    }
    const minStartX = Math.min(x.horarioA.startMin, x.horarioB.startMin)
    const minStartY = Math.min(y.horarioA.startMin, y.horarioB.startMin)
    return minStartX - minStartY
  })

  return conflicts
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
  timeRange: EMPTY_RANGE,
  rows: buildRows(EMPTY_RANGE, DEFAULT_PERIOD),
  period: DEFAULT_PERIOD,
}

export const useSolapamientosStore = create<SolapamientosState>()((set, get) => {
  const updateCurrentDocenteComputedData = (
    docentes: SolapamientoDocente[],
    index: number,
    tolerancia: number,
    currentPeriod: number = DEFAULT_PERIOD
  ) => {
    if (docentes.length === 0 || index < 0 || index >= docentes.length) {
      set({
        schedules: [],
        adminSchedules: [],
        conflicts: [],
        timeRange: EMPTY_RANGE,
        rows: buildRows(EMPTY_RANGE, currentPeriod),
      })
      return
    }

    const docente = docentes[index]

    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    const todayStr = `${y}-${m}-${d}`

    // Filter active class schedules
    const activeClassSchedules = docente.horario_clases.filter((c) => {
      const startOk = c.fecha_inicio <= todayStr
      const endOk = c.fecha_fin === null || c.fecha_fin >= todayStr
      return startOk && endOk
    })

    // Filter active admin schedules
    const activeAdminSchedules = docente.horario_administrativo.filter((a) => {
      const startOk = a.fecha_inicio <= todayStr
      const endOk = a.fecha_fin === null || a.fecha_fin >= todayStr
      return startOk && endOk
    })

    // Map stable color index to each groupKey
    const groupKeys = Array.from(
      new Set(activeClassSchedules.map((c) => `${c.asignatura_nombre}::${c.grupo}`))
    )
    const colorByGroupKey = new Map<string, number>()
    groupKeys.forEach((key, index) => {
      colorByGroupKey.set(key, index)
    })

    // Normalize Class Schedules
    const rawSchedules: NormalizedSchedule[] = activeClassSchedules.map((c) => {
      const startMin = parseTimeToMinutes(c.hora_inicio)
      const endMin = parseTimeToMinutes(c.hora_fin)
      const groupKey = `${c.asignatura_nombre}::${c.grupo}`
      const rawAula = c.aula_codigo ?? c.aulaCodigo ?? c.ambiente
      const ambienteLabel = rawAula ? String(rawAula).trim() : "Sin ambiente"

      return {
        scheduleId: `clase-${c.id}`,
        groupKey,
        persona_grupo_id: 0,
        ambienteId: null,
        colorIndex: colorByGroupKey.get(groupKey) ?? 0,
        day: c.dia as 1 | 2 | 3 | 4 | 5 | 6,
        startMin,
        endMin,
        durationMin: endMin - startMin,
        laneIndex: 0,
        laneCount: 1,
        materia: c.asignatura_nombre,
        materiaCodigo: c.asignatura_codigo,
        grupo: c.grupo,
        docente: docente.nombres,
        carreras: c.carreras.map((car) => car.nombre),
        ambienteLabel,
        tipoLabel: c.tipo_designacion || "TITULAR",
        fechasLabel: c.fecha_fin
          ? `${formatDate(c.fecha_inicio)} a ${formatDate(c.fecha_fin)}`
          : `Desde ${formatDate(c.fecha_inicio)}`,
        dbId: c.id,
        fechaInicioRaw: c.fecha_inicio,
        fechaFinRaw: c.fecha_fin,
      }
    })

    const schedules = assignLanes(rawSchedules)

    // Normalize Admin Schedules
    const adminSchedules: AdminSchedule[] = activeAdminSchedules.map((a) => {
      const startMin = parseTimeToMinutes(a.hora_inicio)
      const endMin = parseTimeToMinutes(a.hora_fin)
      const dayVal = typeof a.dia === "number" ? a.dia : 1
      return {
        id: a.id,
        startMin,
        endMin,
        label: a.horario_descripcion || "Horario Administrativo",
        days: [dayVal],
      }
    })

    // Compute active time ranges
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
    const conflicts = detectLocalConflicts(docente, tolerancia)
    const resolvedPeriod = resolveDefaultPeriod(schedules)

    set({
      schedules,
      adminSchedules,
      conflicts,
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
        queryParams.append("tolerancia_minutos", String(filters.tolerancia_minutos))

        if (filters.persona_codigo.trim()) {
          queryParams.append("persona_codigo", filters.persona_codigo.trim())
        }
        if (filters.facultad_codigo && filters.facultad_codigo !== "none") {
          queryParams.append("facultad_codigo", filters.facultad_codigo)
        }

        const response = await apiClient.get<DetectarSolapamientosResponse>(
          `/detectar-solapamientos?${queryParams.toString()}`
        )

        const docentes = response?.docentes || []
        const totalDocentes = response?.metadata?.total_docentes || docentes.length

        set({
          docentes,
          totalDocentes,
          currentDocenteIndex: 0,
          loading: false,
        })

        updateCurrentDocenteComputedData(docentes, 0, filters.tolerancia_minutos, period)
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Error al cargar solapamientos",
          loading: false,
          docentes: [],
          totalDocentes: 0,
        })
        updateCurrentDocenteComputedData([], 0, filters.tolerancia_minutos, period)
      }
    },

    setCurrentDocenteIndex: (index) => {
      const { docentes, filters, period } = get()
      if (index >= 0 && index < docentes.length) {
        set({ currentDocenteIndex: index })
        updateCurrentDocenteComputedData(docentes, index, filters.tolerancia_minutos, period)
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
      const { timeRange, docentes, currentDocenteIndex, filters } = get()
      set({
        period: safePeriod,
        rows: buildRows(timeRange, safePeriod),
      })
      updateCurrentDocenteComputedData(
        docentes,
        currentDocenteIndex,
        filters.tolerancia_minutos,
        safePeriod
      )
    },

    reset: () => {
      set({ ...INITIAL_STATE })
    },
  }
})
