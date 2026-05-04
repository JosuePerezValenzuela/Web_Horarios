import { create } from "zustand"

import { getDocenteHorariosById, hydrateSchedulesWithAmbienteDetails } from "./api"
import { buildRows, normalizeDocenteHorarios, resolveDefaultPeriod } from "./normalizers"
import type {
  GroupSummary,
  NormalizedSchedule,
  TimeRange,
  TimeRow,
  DocenteScheduleMeta,
} from "../domain/types"

interface DocenteHorariosState {
  docente: DocenteScheduleMeta | null
  schedules: NormalizedSchedule[]
  groups: GroupSummary[]
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

      set({
        docente: normalized.docente,
        schedules: hydratedSchedules,
        groups: normalized.groups,
        period,
        timeRange: normalized.timeRange,
        rows: buildRows(normalized.timeRange, period),
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
