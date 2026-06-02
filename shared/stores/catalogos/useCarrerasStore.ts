import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"

export interface Carrera {
  id: number | string
  codigo: string
  nombre: string
  facultad_id?: number | string
}

interface CarrerasResponse {
  success?: boolean
  data: Carrera[]
}

interface CarrerasState {
  carreras: Carrera[]
  loading: boolean
  error: string | null
  // Caché simple por facultad_id ("global" si no hay facultadId)
  loadedFacultadId: string | null
  fetchCarreras: (facultadId?: string) => Promise<void>
  clear: () => void
}

export const useCarrerasStore = create<CarrerasState>()((set, get) => ({
  carreras: [],
  loading: false,
  error: null,
  loadedFacultadId: null,

  fetchCarreras: async (facultadId?: string) => {
    const activeFacultadId = facultadId || "global"

    // Evitamos llamar si ya cargamos este contexto
    if (get().carreras.length > 0 && get().loadedFacultadId === activeFacultadId) {
      return
    }

    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()
      if (facultadId) {
        searchParams.set("facultad_id", facultadId)
      }

      const queryString = searchParams.toString()
      const response = await apiClient.get<CarrerasResponse | Carrera[]>(
        `/carrera/all${queryString ? `?${queryString}` : ""}`
      )

      let data: Carrera[] = []
      if (Array.isArray(response)) {
        data = response
      } else if (response && response.data) {
        data = response.data
      }

      set({ carreras: data, loadedFacultadId: activeFacultadId, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar carreras",
        loading: false,
      })
    }
  },

  clear: () => set({ carreras: [], loadedFacultadId: null, error: null, loading: false }),
}))
