import { create } from "zustand"
import { toast } from "sonner"

import {
  getDocenteHorariosById,
  hydrateSchedulesWithAmbienteDetails,
  fetchDocenteAdminHorarios,
} from "./api"
import {
  buildRows,
  normalizeDocenteHorarios,
  resolveDefaultPeriod,
  normalizeAdminSchedules,
} from "./normalizers"
import type {
  GroupSummary,
  NormalizedSchedule,
  TimeRange,
  TimeRow,
  DocenteScheduleMeta,
  AdminSchedule,
  AdminScheduleRaw,
} from "../domain/types"

interface DocenteHorariosState {
  docente: DocenteScheduleMeta | null
  schedules: NormalizedSchedule[]
  groups: GroupSummary[]
  adminSchedules: AdminSchedule[]
  rawAdminSchedules: AdminScheduleRaw[]
  period: number
  timeRange: TimeRange
  rows: TimeRow[]
  loading: boolean
  error: string | null
  fetchByDocenteId: (id: string) => Promise<void>
  setPeriod: (period: number) => void
  clear: () => void
}

const EMPTY_RANGE: TimeRange = {
  startMin: 8 * 60,
  endMin: 18 * 60,
}

const DEFAULT_PERIOD = 90

const INITIAL_STATE = {
  docente: null,
  schedules: [],
  groups: [],
  adminSchedules: [],
  rawAdminSchedules: [],
  period: DEFAULT_PERIOD,
  timeRange: EMPTY_RANGE,
  rows: buildRows(EMPTY_RANGE, DEFAULT_PERIOD),
  loading: false,
  error: null,
}

export const useDocenteHorariosStore = create<DocenteHorariosState>()((set, get) => ({
  ...INITIAL_STATE,

  fetchByDocenteId: async (id: string) => {
    set({ loading: true, error: null })

    try {
      const response = await getDocenteHorariosById(id)
      const normalized = normalizeDocenteHorarios(response)
      const hydratedSchedules = await hydrateSchedulesWithAmbienteDetails(normalized.schedules)
      const period = resolveDefaultPeriod(hydratedSchedules)

      // Fetch administrative schedule if teacher code is available
      let adminSchedules: AdminSchedule[] = []
      let rawAdminSchedules: AdminScheduleRaw[] = []
      if (normalized.docente?.codigo && normalized.docente.codigo !== "Sin dato") {
        try {
          const adminResponse = await fetchDocenteAdminHorarios(normalized.docente.codigo)
          rawAdminSchedules = adminResponse.data.horarios

          // Get local today string in YYYY-MM-DD
          const today = new Date()
          const y = today.getFullYear()
          const m = String(today.getMonth() + 1).padStart(2, "0")
          const d = String(today.getDate()).padStart(2, "0")
          const todayStr = `${y}-${m}-${d}`

          // Filter only active schedules for the grid (adminSchedules)
          const activeSchedules = rawAdminSchedules.filter((h) => {
            const startOk = h.fecha_inicio <= todayStr
            const endOk = h.fecha_fin === null || h.fecha_fin >= todayStr
            return startOk && endOk
          })

          // Normalize only active ones for display in the grid
          adminSchedules = normalizeAdminSchedules({
            ...adminResponse,
            data: {
              ...adminResponse.data,
              horarios: activeSchedules,
            },
          })
        } catch (err) {
          console.error("Failed to load administrative schedules:", err)
        }
      }

      // Adjust timeRange to incorporate administrative hours
      let startMin = normalized.timeRange.startMin
      let endMin = normalized.timeRange.endMin
      adminSchedules.forEach((admin) => {
        startMin = Math.min(startMin, admin.startMin)
        endMin = Math.max(endMin, admin.endMin)
      })
      const adjustedTimeRange = { startMin, endMin }

      set({
        docente: normalized.docente,
        schedules: hydratedSchedules,
        groups: normalized.groups,
        adminSchedules,
        rawAdminSchedules,
        period,
        timeRange: adjustedTimeRange,
        rows: buildRows(adjustedTimeRange, period),
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "No se pudieron cargar los horarios",
        loading: false,
      })
    }
  },

  setPeriod: (period: number) => {
    const safePeriod = Number.isFinite(period) && period > 0 ? Math.trunc(period) : DEFAULT_PERIOD
    const { timeRange } = get()
    set({
      period: safePeriod,
      rows: buildRows(timeRange, safePeriod),
    })
  },

  clear: () => set({ ...INITIAL_STATE }),
}))
