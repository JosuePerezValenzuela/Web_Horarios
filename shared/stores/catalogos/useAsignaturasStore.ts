import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"

export interface Asignatura {
  id: number | string
  codigo: string
  nombre: string
  carrera_id?: number | string
}

interface AsignaturasResponse {
  success?: boolean
  data: Asignatura[]
}

interface AsignaturasState {
  asignaturas: Asignatura[]
  loading: boolean
  error: string | null
  // Clave de caché para identificar los filtros que cargaron el estado actual
  loadedCacheKey: string | null
  fetchAsignaturas: (carreraId?: string, facultadId?: string) => Promise<void>
  clear: () => void
}

export const useAsignaturasStore = create<AsignaturasState>()((set, get) => ({
  asignaturas: [],
  loading: false,
  error: null,
  loadedCacheKey: null,

  fetchAsignaturas: async (carreraId?: string, facultadId?: string) => {
    const cacheKey = `${carreraId || "all"}-${facultadId || "all"}`

    // Evitamos llamar si ya cargamos este mismo contexto de filtros
    if (get().asignaturas.length > 0 && get().loadedCacheKey === cacheKey) {
      return
    }

    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()
      if (facultadId) searchParams.set("facultad_id", facultadId)
      if (carreraId) searchParams.set("carrera_id", carreraId)

      const queryString = searchParams.toString()
      const response = await apiClient.get<AsignaturasResponse | Asignatura[]>(
        `/asignatura/all${queryString ? `?${queryString}` : ""}`
      )

      let data: Asignatura[] = []
      if (Array.isArray(response)) {
        data = response
      } else if (response && response.data) {
        data = response.data
      }

      set({ asignaturas: data, loadedCacheKey: cacheKey, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar asignaturas",
        loading: false,
      })
    }
  },

  clear: () => set({ asignaturas: [], loadedCacheKey: null, error: null, loading: false }),
}))
