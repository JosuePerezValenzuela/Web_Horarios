import { create } from "zustand"
import type { DateRange } from "react-day-picker"

import type {
  AmbienteSearchContract,
  EditScheduleEntry,
  EditarHorarioItem,
  EditarHorariosBatchRequest,
  EditarHorariosBatchResponse,
  EntryFilterOverrides,
  GroupInfo,
  InfraAmbiente,
  InfraBloque,
  InfraFacultad,
  InfraTipoAmbiente,
  NormalizedSchedule,
  SolapamientoInfo,
} from "../domain/types"
import { horariosApi, type BuscarAmbienteRequest } from "@/shared/services/api/client"
import { infraApiClient } from "@/shared/services/api/infraClient"

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function mapScheduleToEntry(schedule: NormalizedSchedule): EditScheduleEntry {
  return {
    id: crypto.randomUUID(),
    dbId: schedule.dbId,
    dia: schedule.day - 1, // 1-6 → 0-5 (infra format)
    horaInicio: formatMinutes(schedule.startMin),
    horaFin: formatMinutes(schedule.endMin),
    ambienteId: schedule.ambienteId ?? undefined,
    ambienteLabel:
      schedule.ambienteLabel && schedule.ambienteLabel !== "Sin ambiente"
        ? schedule.ambienteLabel
        : undefined,
    fechaInicio: schedule.fechaInicioRaw ?? undefined,
    fechaFin: schedule.fechaFinRaw ?? undefined,
  }
}

interface EditScheduleState {
  // Modal
  isOpen: boolean
  selectedGroup: GroupInfo | null
  existingSchedules: NormalizedSchedule[]

  // Global date range (for creates in mixed mode)
  dateRange: DateRange | undefined

  // Entries
  entries: EditScheduleEntry[]

  // Global filters (shared across entries unless overridden)
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null

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

  // Highlighted entry (from grid click)
  highlightedEntryId: string | null

  // Submission
  submitting: boolean
  solapamientos: SolapamientoInfo[]

  // Actions
  open: (group: GroupInfo, schedules: NormalizedSchedule[], highlightDbId?: number) => void
  close: () => void
  setDateRange: (range: DateRange | undefined) => void
  setSelectedFacultades: (f: InfraFacultad[]) => void
  setSelectedBloques: (b: InfraBloque[]) => void
  setSelectedTipos: (t: InfraTipoAmbiente[]) => void
  setEstudiantes: (n: number | null) => void

  // Entry management
  addEntry: () => void
  removeEntry: (id: string) => void
  updateEntry: (id: string, partial: Partial<EditScheduleEntry>) => void
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
  submitEdit: () => Promise<{
    success: boolean
    message?: string
    errorIndex?: number
    erroredEntryId?: string
  }>

  fetchInitialData: () => Promise<void>
  reset: () => void
}

const INITIAL_STATE = {
  isOpen: false,
  selectedGroup: null,
  existingSchedules: [],
  dateRange: undefined,
  entries: [],
  facultades: [],
  tiposAmbiente: [],
  selectedFacultades: [],
  selectedBloques: [],
  selectedTipos: [],
  estudiantes: null,
  entryFilters: {},
  ambienteCache: {},
  loadingAmbientesForEntry: null,
  initialLoadError: null,
  highlightedEntryId: null,
  submitting: false,
  solapamientos: [],
}

export const useEditScheduleStore = create<EditScheduleState>()((set, get) => ({
  ...INITIAL_STATE,

  open: (group: GroupInfo, schedules: NormalizedSchedule[], highlightDbId?: number) => {
    const entries = schedules.map((s) => mapScheduleToEntry(s))
    const highlightedEntryId =
      highlightDbId !== undefined
        ? (entries.find((e) => e.dbId === highlightDbId)?.id ?? null)
        : null
    const firstWithDates = schedules.find((s) => s.fechaInicioRaw && s.fechaFinRaw)
    const dateRange: DateRange | undefined =
      firstWithDates?.fechaInicioRaw && firstWithDates?.fechaFinRaw
        ? {
            from: new Date(`${firstWithDates.fechaInicioRaw}T00:00:00`),
            to: new Date(`${firstWithDates.fechaFinRaw}T00:00:00`),
          }
        : undefined
    set({
      isOpen: true,
      selectedGroup: group,
      existingSchedules: schedules,
      dateRange,
      entries,
      highlightedEntryId,
    })
    get().fetchInitialData()
  },

  close: () => {
    set({ isOpen: false })
    setTimeout(() => get().reset(), 300)
  },

  setDateRange: (range: DateRange | undefined) => set({ dateRange: range }),

  setSelectedFacultades: (f: InfraFacultad[]) => set({ selectedFacultades: f }),

  setSelectedBloques: (b: InfraBloque[]) => set({ selectedBloques: b }),

  setSelectedTipos: (t: InfraTipoAmbiente[]) => set({ selectedTipos: t }),

  setEstudiantes: (n: number | null) => set({ estudiantes: n }),

  addEntry: () => {
    const { dateRange } = get()
    const entry: EditScheduleEntry = {
      id: crypto.randomUUID(),
      dbId: null,
      dia: null,
      horaInicio: "",
      horaFin: "",
      fechaInicio: dateRange?.from?.toISOString().split("T")[0],
      fechaFin: dateRange?.to?.toISOString().split("T")[0],
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

  updateEntry: (id: string, partial: Partial<EditScheduleEntry>) => {
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
      const fechaInicio = entry.fechaInicio ?? state.dateRange?.from?.toISOString().split("T")[0]
      const fechaFin = entry.fechaFin ?? state.dateRange?.to?.toISOString().split("T")[0]
      const payload: BuscarAmbienteRequest = {
        dia: entry.dia,
        hora_inicio: entry.horaInicio,
        hora_fin: entry.horaFin,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
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

    // Against existing schedules — self-exclude by dbId
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.dia === null || !entry.horaInicio || !entry.horaFin) continue

      const eStart = toMinutes(entry.horaInicio)
      const eEnd = toMinutes(entry.horaFin)

      for (const schedule of existingSchedules) {
        // Self-exclusion: skip if entry's dbId matches this schedule's dbId
        if (entry.dbId !== null && schedule.dbId !== null && entry.dbId === schedule.dbId) continue

        // entry.dia is 0-6, schedule.day is 1-6 → entry.dia + 1 === schedule.day
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

  submitEdit: async () => {
    const { entries, selectedGroup, dateRange } = get()

    if (!selectedGroup) {
      return { success: false, message: "No hay grupo seleccionado" }
    }

    const updateItems = entries.filter(
      (e) => e.dbId !== null && e.dia !== null && e.horaInicio && e.horaFin
    )
    const createItems = entries.filter(
      (e) => e.dbId === null && e.dia !== null && e.horaInicio && e.horaFin && e.ambienteId != null
    )

    if (updateItems.length === 0 && createItems.length === 0) {
      return { success: false, message: "No hay horarios válidos para guardar" }
    }

    const needsRootFields = createItems.length > 0
    if (needsRootFields && (!dateRange?.from || !dateRange?.to)) {
      return { success: false, message: "Seleccione un rango de fechas para los nuevos horarios" }
    }

    set({ submitting: true })

    let payloadEntries: { entryId: string; item: EditarHorarioItem }[] = []

    try {
      // Build payload with entryId tracking for accurate error mapping
      payloadEntries = [
        ...updateItems.map((e) => ({
          entryId: e.id,
          item: {
            id: e.dbId!,
            ...(e.dia !== null && { dia: e.dia }),
            ...(e.horaInicio && { hora_inicio: e.horaInicio }),
            ...(e.horaFin && { hora_fin: e.horaFin }),
            ...(e.ambienteId != null && { aula_id: e.ambienteId }),
            ...(e.fechaInicio && { fecha_inicio: e.fechaInicio }),
            ...(e.fechaFin && { fecha_fin: e.fechaFin }),
          } as EditarHorarioItem,
        })),
        ...createItems.map((e) => ({
          entryId: e.id,
          item: {
            dia: e.dia!,
            hora_inicio: e.horaInicio,
            hora_fin: e.horaFin,
            aula_id: e.ambienteId!,
          } as EditarHorarioItem,
        })),
      ]

      const horarios = payloadEntries.map((pe) => pe.item)

      const payload: EditarHorariosBatchRequest = { horarios }

      // Root fields required for creates
      if (needsRootFields) {
        payload.persona_grupo_id = selectedGroup.persona_grupo_id
        payload.fecha_inicio = dateRange!.from!.toISOString().split("T")[0]
        payload.fecha_fin = dateRange!.to!.toISOString().split("T")[0]
      }

      const response: EditarHorariosBatchResponse = await horariosApi.editarBatch(payload)
      set({ submitting: false })
      return { success: true, message: response.message }
    } catch (error: unknown) {
      set({ submitting: false })

      if (error && typeof error === "object" && "status" in error) {
        const apiError = error as { status: number; body?: { message?: string } }
        if (apiError.status === 400) {
          const message = apiError.body?.message || "Error al editar horarios"
          // Parse "Error en horario N: ..." to extract errorIndex
          const match = message.match(/Error en horario (\d+)/)
          const errorIndex = match ? parseInt(match[1], 10) - 1 : undefined
          const erroredEntryId =
            errorIndex !== undefined ? payloadEntries[errorIndex]?.entryId : undefined
          return { success: false, message, errorIndex, erroredEntryId }
        }
        return {
          success: false,
          message: apiError.body?.message || "Error al editar horarios",
        }
      }

      return { success: false, message: "Error inesperado al editar horarios" }
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

// ── Adapter: wraps useEditScheduleStore into AmbienteSearchContract ──
export function createEditAmbienteAdapter(
  store: typeof useEditScheduleStore
): AmbienteSearchContract {
  return {
    getEntry: (entryId: string) => store.getState().entries.find((e) => e.id === entryId),
    getEntryFilters: (entryId: string) =>
      store.getState().entryFilters[entryId] as EntryFilterOverrides | undefined,
    get facultades() {
      return store.getState().facultades
    },
    get tiposAmbiente() {
      return store.getState().tiposAmbiente
    },
    get selectedFacultades() {
      return store.getState().selectedFacultades
    },
    get selectedBloques() {
      return store.getState().selectedBloques
    },
    get selectedTipos() {
      return store.getState().selectedTipos
    },
    get estudiantes() {
      return store.getState().estudiantes
    },
    get dateRange() {
      return store.getState().dateRange
    },
    get loadingAmbientesForEntry() {
      return store.getState().loadingAmbientesForEntry
    },
    get ambienteCache() {
      return store.getState().ambienteCache
    },
    setEntryAmbiente: (entryId, ambiente) => store.getState().setEntryAmbiente(entryId, ambiente),
    setEntryFilters: (entryId, filters) => store.getState().setEntryFilters(entryId, filters),
    fetchAmbientesForEntry: (entryId) => store.getState().fetchAmbientesForEntry(entryId),
  }
}
