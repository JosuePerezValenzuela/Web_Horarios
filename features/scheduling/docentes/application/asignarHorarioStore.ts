import { create } from "zustand"
import type { DateRange } from "react-day-picker"

import type {
  GroupInfo,
  InfraAmbiente,
  InfraBloque,
  InfraFacultad,
  InfraTipoAmbiente,
} from "../domain/types"

interface AsignarHorarioState {
  // Modal state
  isOpen: boolean
  selectedGroup: GroupInfo | null

  // Filters
  facultades: InfraFacultad[]
  bloques: InfraBloque[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null

  // Date/Time
  dateRange: DateRange | undefined
  dia: number | null
  horaInicio: string
  horaFin: string

  // Ambientes list
  ambientes: InfraAmbiente[]
  loadingAmbientes: boolean

  // Actions
  openModal: (group: GroupInfo) => void
  closeModal: () => void
  setDateRange: (range: DateRange | undefined) => void
  setDia: (dia: number | null) => void
  setHoraInicio: (hora: string) => void
  setHoraFin: (hora: string) => void
  setEstudiantes: (value: number | null) => void
  setSelectedFacultades: (facultades: InfraFacultad[]) => void
  setSelectedBloques: (bloques: InfraBloque[]) => void
  setSelectedTipos: (tipos: InfraTipoAmbiente[]) => void
  fetchInitialData: () => Promise<void>
  fetchAmbientes: () => Promise<void>
  reset: () => void
}

const INITIAL_STATE = {
  isOpen: false,
  selectedGroup: null,
  facultades: [],
  bloques: [],
  tiposAmbiente: [],
  selectedFacultades: [],
  selectedBloques: [],
  selectedTipos: [],
  estudiantes: null,
  dateRange: undefined,
  dia: null,
  horaInicio: "",
  horaFin: "",
  ambientes: [],
  loadingAmbientes: false,
}

export const useAsignarHorarioStore = create<AsignarHorarioState>()((set, get) => ({
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
  setDia: (dia: number | null) => set({ dia }),
  setHoraInicio: (hora: string) => set({ horaInicio: hora }),
  setHoraFin: (hora: string) => set({ horaFin: hora }),
  setEstudiantes: (value: number | null) => set({ estudiantes: value }),

  setSelectedFacultades: (facultades: InfraFacultad[]) => set({ selectedFacultades: facultades }),
  setSelectedBloques: (bloques: InfraBloque[]) => set({ selectedBloques: bloques }),
  setSelectedTipos: (tipos: InfraTipoAmbiente[]) => set({ selectedTipos: tipos }),

  fetchInitialData: async () => {
    try {
      // Fetch facultades - INFRA API
      const facultadesRes = await fetch(
        `${process.env.NEXT_PUBLIC_INFRA_URL}/facultades?page=1&limit=200&activo=true&orderBy=nombre&orderDir=asc`
      ).then((r) => r.json())

      // Fetch tipos de ambiente - INFRA API
      const tiposRes = await fetch(
        `${process.env.NEXT_PUBLIC_INFRA_URL}/tipo_ambientes?page=1&limit=1000&activo=true&orderDir=asc&orderBy=nombre`
      ).then((r) => r.json())

      set({
        facultades: facultadesRes.items || [],
        tiposAmbiente: tiposRes.items || [],
      })
    } catch (error) {
      console.error("Error fetching initial data:", error)
    }
  },

  fetchAmbientes: async () => {
    const {
      selectedFacultades,
      selectedBloques,
      selectedTipos,
      selectedGroup,
      dateRange,
      dia,
      horaInicio,
      horaFin,
      estudiantes,
    } = get()

    set({ loadingAmbientes: true })

    try {
      // Get JWT token
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("auth_token") || "{}")?.state?.token ||
            localStorage.getItem("auth_token")
          : null

      // Build request body according to contract
      const body = {
        dia: Number(dia) - 1,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        fecha_inicio: dateRange?.from ? dateRange.from.toISOString().split("T")[0] : undefined,
        fecha_fin: dateRange?.to ? dateRange.to.toISOString().split("T")[0] : undefined,
        persona_grupo_id: selectedGroup?.persona_grupo_id,
        mismo_piso: 0,
        capacidad_min: estudiantes ?? undefined,
        Facultad_ids:
          selectedFacultades.length > 0 ? selectedFacultades.map((f) => f.id) : undefined,
        bloque_ids: selectedBloques.length > 0 ? selectedBloques.map((b) => b.id) : undefined,
        tipo_ambiente_ids: selectedTipos.length > 0 ? selectedTipos.map((t) => t.id) : undefined,
        page: 1,
        take: 30,
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/horario-clases/asignar/buscar-ambientes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(body),
        }
      ).then((r) => r.json())

      set({
        ambientes: response.data?.ambientes || [],
        loadingAmbientes: false,
      })
    } catch (error) {
      console.error("Error fetching ambientes:", error)
      set({ loadingAmbientes: false })
    }
  },

  reset: () => set(INITIAL_STATE),
}))
