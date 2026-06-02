import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"

export interface Facultad {
  id: number | string
  codigo: string
  nombre: string
}

interface FacultadesResponse {
  success?: boolean
  data: Facultad[]
}

interface FacultadesState {
  facultades: Facultad[]
  loading: boolean
  error: string | null
  fetchFacultades: () => Promise<void>
  clear: () => void
}

export const useFacultadesStore = create<FacultadesState>()((set, get) => ({
  facultades: [],
  loading: false,
  error: null,

  fetchFacultades: async () => {
    // Si ya tenemos facultades cargadas, evitamos la llamada (caché en memoria)
    if (get().facultades.length > 0) return

    set({ loading: true, error: null })
    try {
      // Intentamos obtener desde el endpoint principal
      const response = await apiClient.get<FacultadesResponse | Facultad[]>("/facultad/all")

      let data: Facultad[] = []
      if (Array.isArray(response)) {
        data = response
      } else if (response && response.data) {
        data = response.data
      }

      set({ facultades: data, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar facultades",
        loading: false,
      })
    }
  },

  clear: () => set({ facultades: [], error: null, loading: false }),
}))
