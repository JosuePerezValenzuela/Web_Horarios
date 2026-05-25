import { create } from "zustand"
import type { DateRange } from "react-day-picker"

import type {
  GroupInfo,
  HorarioEntry,
  InfraAmbiente,
  InfraBloque,
  InfraFacultad,
  InfraTipoAmbiente,
  NormalizedSchedule,
  SolapamientoInfo,
} from "../domain/types"
import {
  horariosApi,
  type BuscarAmbienteRequest,
  type AsignarHorariosBatchRequest,
} from "@/shared/services/api/client"
import { infraApiClient } from "@/shared/services/api/infraClient"

interface BulkAsignacionState {
  // Modal
  isOpen: boolean
  selectedGroup: GroupInfo | null

  // Global date
  dateRange: DateRange | undefined

  // Global filters
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null

  // Entries
  entries: HorarioEntry[]

  // Per-entry filter overrides: entryId -> filters
  entryFilters: Record<
    string,
    {
      selectedFacultades: InfraFacultad[]
      selectedBloques: InfraBloque[]
      selectedTipos: InfraTipoAmbiente[]
      estudiantes: number | null
    }
  >

  // Ambiente search results per entry cache
  ambienteCache: Record<string, InfraAmbiente[]>
  loadingAmbientesForEntry: string | null

  // Error state
  initialLoadError: string | null

  // Submission
  submitting: boolean
  solapamientos: SolapamientoInfo[]

  // Actions
  openModal: (group: GroupInfo) => void
  closeModal: () => void
  setDateRange: (range: DateRange | undefined) => void
  setSelectedFacultades: (f: InfraFacultad[]) => void
  setSelectedBloques: (b: InfraBloque[]) => void
  setSelectedTipos: (t: InfraTipoAmbiente[]) => void
  setEstudiantes: (n: number | null) => void

  // Entry management
  addEntry: () => void
  removeEntry: (id: string) => void
  updateEntry: (id: string, partial: Partial<HorarioEntry>) => void
  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => void

  // Per-entry filter overrides
  setEntryFilters: (
    entryId: string,
    filters: Partial<{
      selectedFacultades: InfraFacultad[]
      selectedBloques: InfraBloque[]
      selectedTipos: InfraTipoAmbiente[]
      estudiantes: number | null
    }>
  ) => void

  // Ambiente search
  fetchAmbientesForEntry: (entryId: string) => Promise<void>

  // Solapamiento
  checkSolapamientos: (existingSchedules: NormalizedSchedule[]) => SolapamientoInfo[]

  // Submit
  submitBatch: (
    personaGrupoId: number
  ) => Promise<{ success: boolean; message?: string; errorIndex?: number }>

  fetchInitialData: () => Promise<void>
  reset: () => void
}

const INITIAL_STATE = {
  isOpen: false,
  selectedGroup: null,
  dateRange: undefined,
  facultades: [],
  tiposAmbiente: [],
  selectedFacultades: [],
  selectedBloques: [],
  selectedTipos: [],
  estudiantes: null,
  entries: [],
  entryFilters: {},
  ambienteCache: {},
  loadingAmbientesForEntry: null,
  initialLoadError: null,
  submitting: false,
  solapamientos: [],
}

export const useBulkAsignacionStore = create<BulkAsignacionState>()((set, get) => ({
  ...INITIAL_STATE,

  openModal: (group: GroupInfo) => {
    set({ isOpen: true, selectedGroup: group })
    get().fetchInitialData()
  },

  closeModal: () => {
    set({ isOpen: false })
    setTimeout(() => get().reset(), 300)
  },

  setDateRange: (range: DateRange | undefined) => set({ dateRange: range }),

  setSelectedFacultades: (f: InfraFacultad[]) => set({ selectedFacultades: f }),

  setSelectedBloques: (b: InfraBloque[]) => set({ selectedBloques: b }),

  setSelectedTipos: (t: InfraTipoAmbiente[]) => set({ selectedTipos: t }),

  setEstudiantes: (n: number | null) => set({ estudiantes: n }),

  addEntry: () => {
    const entry: HorarioEntry = {
      id: crypto.randomUUID(),
      dia: null,
      horaInicio: "",
      horaFin: "",
    }
    set((state) => ({ entries: [...state.entries, entry] }))
  },

  removeEntry: (id: string) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      entryFilters: Object.fromEntries(
        Object.entries(state.entryFilters).filter(([key]) => key !== id)
      ),
      ambienteCache: Object.fromEntries(
        Object.entries(state.ambienteCache).filter(([key]) => !key.startsWith(id))
      ),
    }))
  },

  updateEntry: (id: string, partial: Partial<HorarioEntry>) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...partial } : e)),
    }))
  },

  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, ambienteId: ambiente.id, ambienteLabel: ambiente.nombre } : e
      ),
    }))
  },

  setEntryFilters: (entryId: string, filters) => {
    set((state) => ({
      entryFilters: {
        ...state.entryFilters,
        [entryId]: {
          selectedFacultades:
            filters.selectedFacultades ?? state.entryFilters[entryId]?.selectedFacultades ?? [],
          selectedBloques:
            filters.selectedBloques ?? state.entryFilters[entryId]?.selectedBloques ?? [],
          selectedTipos: filters.selectedTipos ?? state.entryFilters[entryId]?.selectedTipos ?? [],
          estudiantes:
            filters.estudiantes !== undefined
              ? filters.estudiantes
              : (state.entryFilters[entryId]?.estudiantes ?? null),
        },
      },
    }))
  },

  fetchAmbientesForEntry: async (entryId: string) => {
    const state = get()
    const entry = state.entries.find((e) => e.id === entryId)
    if (!entry || entry.dia === null || !entry.horaInicio || !entry.horaFin) return

    // Resolve filters: entry overrides fallback to global
    const entryF = state.entryFilters[entryId]
    const facultadIds = (entryF?.selectedFacultades ?? state.selectedFacultades).map((f) => f.id)
    const bloqueIds = (entryF?.selectedBloques ?? state.selectedBloques).map((b) => b.id)
    const tipoIds = (entryF?.selectedTipos ?? state.selectedTipos).map((t) => t.id)
    const capacidadMin = entryF?.estudiantes ?? state.estudiantes

    // Build cache key
    const filtersHash = `${facultadIds.join(",")}|${bloqueIds.join(",")}|${tipoIds.join(",")}|${capacidadMin ?? ""}`
    const cacheKey = `${entryId}-${entry.dia}-${entry.horaInicio}-${entry.horaFin}-${filtersHash}`

    // Check cache
    if (state.ambienteCache[cacheKey]) return

    set({ loadingAmbientesForEntry: entryId })

    try {
      const payload: BuscarAmbienteRequest = {
        dia: entry.dia,
        hora_inicio: entry.horaInicio,
        hora_fin: entry.horaFin,
        fecha_inicio: state.dateRange?.from?.toISOString().split("T")[0],
        fecha_fin: state.dateRange?.to?.toISOString().split("T")[0],
        persona_grupo_id: state.selectedGroup?.persona_grupo_id,
        facultad_ids: facultadIds.length > 0 ? facultadIds : undefined,
        bloque_ids: bloqueIds.length > 0 ? bloqueIds : undefined,
        tipo_ambiente_ids: tipoIds.length > 0 ? tipoIds : undefined,
        capacidad_min: capacidadMin ?? undefined,
        page: 1,
        take: 30,
      }

      const response = await horariosApi.buscarAmbientes(payload)
      const ambientes = response.data?.ambientes || []

      set((s) => ({
        ambienteCache: { ...s.ambienteCache, [cacheKey]: ambientes },
        loadingAmbientesForEntry: null,
      }))
    } catch (error) {
      const apiError = error as { status?: number; body?: { message?: string } }
      const msg = apiError?.body?.message || error
      console.error("Error fetching ambientes for entry:", msg)
      set({ loadingAmbientesForEntry: null })
    }
  },

  checkSolapamientos: (existingSchedules: NormalizedSchedule[]) => {
    const { entries } = get()
    const solapamientos: SolapamientoInfo[] = []

    const toMinutes = (time: string): number => {
      const [h, m] = time.split(":").map(Number)
      return h * 60 + m
    }

    // Intra-bulk checks
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]
        const b = entries[j]
        if (a.dia === null || b.dia === null || a.dia !== b.dia) continue
        if (!a.horaInicio || !a.horaFin || !b.horaInicio || !b.horaFin) continue

        const aStart = toMinutes(a.horaInicio)
        const aEnd = toMinutes(a.horaFin)
        const bStart = toMinutes(b.horaInicio)
        const bEnd = toMinutes(b.horaFin)

        if (aStart < bEnd && aEnd > bStart) {
          solapamientos.push({
            type: "intra-bulk",
            entryIndex: i,
            conflictingEntryIndex: j,
            message: `Horario ${i + 1} y horario ${j + 1} se solapan el mismo día`,
          })
        }
      }
    }

    // Against existing schedules
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.dia === null || !entry.horaInicio || !entry.horaFin) continue

      const eStart = toMinutes(entry.horaInicio)
      const eEnd = toMinutes(entry.horaFin)

      for (const schedule of existingSchedules) {
        // NormalizedSchedule.day is 1-6 (1=Lunes)
        // entry.dia is 0-6 (0=Lunes), so entry.dia + 1 === schedule.day
        if (entry.dia + 1 !== schedule.day) continue

        if (eStart < schedule.endMin && eEnd > schedule.startMin) {
          solapamientos.push({
            type: "existing-schedule",
            entryIndex: i,
            message: `Horario ${i + 1} se solapa con horario existente: ${schedule.materia} - ${schedule.grupo}`,
          })
        }
      }
    }

    return solapamientos
  },

  submitBatch: async (personaGrupoId: number) => {
    const { entries, dateRange, selectedGroup } = get()

    if (!selectedGroup || !dateRange?.from || !dateRange?.to) {
      return { success: false, message: "Seleccione un rango de fechas" }
    }

    const fechaInicio = dateRange.from.toISOString().split("T")[0]
    const fechaFin = dateRange.to.toISOString().split("T")[0]

    // Filter entries with valid data
    const validEntries = entries.filter(
      (e) => e.dia !== null && e.horaInicio && e.horaFin && e.ambienteId
    )

    if (validEntries.length === 0) {
      return { success: false, message: "No hay horarios válidos para asignar" }
    }

    set({ submitting: true })

    try {
      const payload: AsignarHorariosBatchRequest = {
        persona_grupo_id: personaGrupoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        horarios: validEntries.map((e) => ({
          dia: e.dia!,
          hora_inicio: e.horaInicio,
          hora_fin: e.horaFin,
          aula_id: e.ambienteId!,
        })),
      }

      const response = await horariosApi.asignarBatch(payload)
      set({ submitting: false })
      return { success: true, message: response.message }
    } catch (error: unknown) {
      set({ submitting: false })

      if (error && typeof error === "object" && "status" in error) {
        const apiError = error as { status: number; body?: { message?: string } }
        if (apiError.status === 400) {
          const message = apiError.body?.message || "Error en la asignación"
          // Parse "Error en horario N: ..." to extract errorIndex
          const match = message.match(/Error en horario (\d+)/)
          const errorIndex = match ? parseInt(match[1], 10) - 1 : undefined
          return { success: false, message, errorIndex }
        }
        return {
          success: false,
          message: apiError.body?.message || "Error en la asignación",
        }
      }

      return { success: false, message: "Error inesperado en la asignación" }
    }
  },

  fetchInitialData: async () => {
    try {
      const facultadesRes = await infraApiClient.get<{ items: InfraFacultad[] }>(
        "/facultades?page=1&limit=200&activo=true&orderBy=nombre&orderDir=asc"
      )

      const tiposRes = await infraApiClient.get<{ items: InfraTipoAmbiente[] }>(
        "/tipo_ambientes?page=1&limit=1000&activo=true&orderDir=asc&orderBy=nombre"
      )

      set({
        facultades: facultadesRes.items || [],
        tiposAmbiente: tiposRes.items || [],
      })
    } catch (error) {
      const apiError = error as { status?: number; body?: { message?: string } }
      const msg = apiError?.body?.message || "Error al cargar datos iniciales"
      console.error("Error fetching initial data:", error)
      set({ initialLoadError: msg })
    }
  },

  reset: () => set({ ...INITIAL_STATE }),
}))
