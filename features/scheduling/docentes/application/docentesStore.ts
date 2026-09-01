/**
 * Docentes Zustand store
 */

import { create } from "zustand"
import type { Docente, DocentesFilters, Pagination } from "../domain/types"
import { fetchDocentes } from "./api"

interface DocentesState {
  // Data
  docentes: Docente[]

  // Filters
  filters: DocentesFilters
  search: string

  // Pagination
  pagination: Pagination

  // Loading states
  loadingDocentes: boolean

  // Error
  error: string | null

  // Actions
  setFilters: (filters: Partial<DocentesFilters>) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void

  fetchDocentes: () => Promise<void>
  clearFilters: () => void
}

const defaultPagination: Pagination = {
  currentPage: 1,
  pageSize: 5,
  totalRecords: 0,
  totalPages: 0,
  nextPage: null,
  previousPage: null,
}

const defaultFilters: DocentesFilters = {
  facultadId: undefined,
  carreraId: undefined,
  asignaturaId: undefined,
  search: undefined,
}

export const useDocentesStore = create<DocentesState>()((set, get) => ({
  // Initial state
  docentes: [],

  filters: defaultFilters,
  search: "",

  pagination: defaultPagination,

  loadingDocentes: false,
  error: null,

  // Filter actions
  setFilters: (newFilters: Partial<DocentesFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, currentPage: 1 }, // Reset to page 1 on filter change
    }))
    get().fetchDocentes()
  },

  setSearch: (search: string) => {
    set({ search })
    if (search) {
      set((state) => ({
        filters: { ...state.filters, search },
        pagination: { ...state.pagination, currentPage: 1 },
      }))
    } else {
      set((state) => ({
        filters: { ...state.filters, search: undefined },
        pagination: { ...state.pagination, currentPage: 1 },
      }))
    }
    get().fetchDocentes()
  },

  setPage: (page: number) => {
    const { pagination } = get()
    if (page >= 1 && page <= pagination.totalPages) {
      set({ pagination: { ...pagination, currentPage: page } })
      get().fetchDocentes()
    }
  },

  setPageSize: (pageSize: number) => {
    set((state) => ({
      pagination: { ...state.pagination, pageSize, currentPage: 1 },
    }))
    get().fetchDocentes()
  },

  // Data fetching actions
  fetchDocentes: async () => {
    // Salvaguarda: evitar peticiones paralelas concurrentes
    if (get().loadingDocentes) return

    const { filters, pagination } = get()
    set({ loadingDocentes: true, error: null })

    try {
      const response = await fetchDocentes({
        ...filters,
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        sortBy: "nombres",
        sortOrder: "asc",
      })

      set({
        docentes: response.items,
        pagination: {
          currentPage: response.pagination.currentPage,
          pageSize: response.pagination.pageSize,
          totalRecords: response.pagination.totalRecords,
          totalPages: response.pagination.totalPages,
          nextPage: response.pagination.nextPage,
          previousPage: response.pagination.previousPage,
        },
        loadingDocentes: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch docentes",
        loadingDocentes: false,
      })
    }
  },

  clearFilters: () => {
    set({
      filters: defaultFilters,
      search: "",
      pagination: { ...defaultPagination },
      docentes: [],
    })
  },
}))
