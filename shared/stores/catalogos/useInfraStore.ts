import { create } from "zustand"
import {
  infraService,
  Campus,
  FacultadInfra,
  Bloque,
  Ambiente,
} from "@/shared/services/api/infraClient"

interface InfraStoreState {
  campus: Campus[]
  facultades: FacultadInfra[]
  bloques: Bloque[]
  ambientes: Ambiente[]
  loading: boolean
  error: string | null

  fetchCampus: () => Promise<void>
  fetchFacultades: () => Promise<void>
  fetchBloques: (facultadId?: string, campusId?: string) => Promise<void>
  fetchAmbientes: (bloqueId?: string) => Promise<void>
  clearBloques: () => void
  clearAmbientes: () => void
}

// Helper helper function to parse responses dynamically without 'any'
function parseResponseData<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[]
  }
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    if (Array.isArray(obj.data)) {
      return obj.data as T[]
    }
    if (Array.isArray(obj.items)) {
      return obj.items as T[]
    }
  }
  return []
}

export const useInfraStore = create<InfraStoreState>()((set, get) => ({
  campus: [],
  facultades: [],
  bloques: [],
  ambientes: [],
  loading: false,
  error: null,

  fetchCampus: async () => {
    // Avoid double fetch if already loaded
    if (get().campus.length > 0) return

    set({ loading: true, error: null })
    try {
      const response = await infraService.getCampus()
      const data = parseResponseData<Campus>(response)
      set({ campus: data, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar campus",
        loading: false,
      })
    }
  },

  fetchFacultades: async () => {
    // Avoid double fetch if already loaded
    if (get().facultades.length > 0) return

    set({ loading: true, error: null })
    try {
      const response = await infraService.getFacultades()
      const data = parseResponseData<FacultadInfra>(response)
      set({ facultades: data, loading: false })
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar facultades de infraestructura",
        loading: false,
      })
    }
  },

  fetchBloques: async (facultadId?: string, campusId?: string) => {
    set({ loading: true, error: null })
    try {
      const response = await infraService.getBloques(facultadId, campusId)
      const data = parseResponseData<Bloque>(response)
      set({ bloques: data, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar bloques",
        loading: false,
      })
    }
  },

  fetchAmbientes: async (bloqueId?: string) => {
    set({ loading: true, error: null })
    try {
      const response = await infraService.getAmbientes(bloqueId)
      const data = parseResponseData<Ambiente>(response)
      set({ ambientes: data, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar ambientes",
        loading: false,
      })
    }
  },

  clearBloques: () => set({ bloques: [] }),
  clearAmbientes: () => set({ ambientes: [] }),
}))
