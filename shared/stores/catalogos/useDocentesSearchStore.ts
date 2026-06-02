import { create } from "zustand"
import { apiClient } from "@/shared/services/api/client"

export interface Docente {
  id: number
  codigo: string
  documento: string | null
  nombres: string
}

interface DocentesApiResponse {
  success: boolean
  items: Docente[]
  pagination: {
    currentPage: number
    pageSize: number
    totalRecords: number
    totalPages: number
  }
}

interface DocentesSearchState {
  docentes: Docente[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchDocentes: (term: string) => Promise<void>
  clear: () => void
}

export const useDocentesSearchStore = create<DocentesSearchState>()((set, get) => ({
  docentes: [],
  loading: false,
  error: null,
  searchTerm: "",

  setSearchTerm: (term: string) => {
    set({ searchTerm: term })
  },

  searchDocentes: async (term: string) => {
    // Si la búsqueda está vacía, limpiamos resultados y evitamos pegarle a la API
    if (!term.trim()) {
      set({ docentes: [], error: null })
      return
    }

    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()
      searchParams.set("search", term)
      searchParams.set("page", "1")
      searchParams.set("pageSize", "15") // Un número pequeño y razonable para el buscador

      const response = await apiClient.get<DocentesApiResponse>(
        `/docentes?${searchParams.toString()}`
      )

      set({
        docentes: response.items || [],
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al buscar docentes",
        loading: false,
      })
    }
  },

  clear: () => set({ docentes: [], searchTerm: "", error: null, loading: false }),
}))
