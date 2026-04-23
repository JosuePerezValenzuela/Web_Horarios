/**
 * Docentes Zustand store
 */

import { create } from "zustand"
import type { Docente, DocentesFilters, Pagination } from "../domain/types"
import {
  fetchDocentes,
  fetchFacultades,
  fetchCarreras,
  fetchAsignaturas,
  type Facultad,
  type Carrera,
  type Asignatura,
} from "./api"

interface DocentesState {
  // Data
  docentes: Docente[]
  facultades: Facultad[]
  carreras: Carrera[]
  asignaturas: Asignatura[]

  // Filters
  filters: DocentesFilters
  search: string

  // Pagination
  pagination: Pagination

  // Loading states
  loading: boolean
  loadingFacultades: boolean
  loadingCarreras: boolean
  loadingAsignaturas: boolean
  loadingDocentes: boolean

  // Error
  error: string | null

  // Actions
  setFilters: (filters: Partial<DocentesFilters>) => void
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void

  fetchDocentes: () => Promise<void>
  fetchFacultades: () => Promise<void>
  fetchCarreras: (facultadId?: string) => Promise<void>
  fetchAsignaturas: (carreraId?: string, facultadId?: string) => Promise<void>

  // Reset helpers
  resetCarreras: () => void
  resetAsignaturas: () => void
  clearFilters: () => void
}

const defaultPagination: Pagination = {
  currentPage: 1,
  pageSize: 10,
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
  facultades: [],
  carreras: [],
  asignaturas: [],

  filters: defaultFilters,
  search: "",

  pagination: defaultPagination,

  loading: false,
  loadingFacultades: false,
  loadingCarreras: false,
  loadingAsignaturas: false,
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

  fetchFacultades: async () => {
    set({ loadingFacultades: true, error: null })

    try {
      const data = await fetchFacultades()
      set({ facultades: data, loadingFacultades: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch facultades",
        loadingFacultades: false,
      })
    }
  },

  fetchCarreras: async (facultadId?: string) => {
    set({ loadingCarreras: true, error: null })

    try {
      const data = await fetchCarreras(facultadId)
      set({ carreras: data, loadingCarreras: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch carreras",
        loadingCarreras: false,
      })
    }
  },

  fetchAsignaturas: async (carreraId?: string, facultadId?: string) => {
    set({ loadingAsignaturas: true, error: null })

    try {
      const data = await fetchAsignaturas(carreraId, facultadId)
      set({ asignaturas: data, loadingAsignaturas: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch asignaturas",
        loadingAsignaturas: false,
      })
    }
  },

  // Reset helpers
  resetCarreras: () => {
    set({ carreras: [], filters: { ...get().filters, carreraId: undefined } })
  },

  resetAsignaturas: () => {
    set({ asignaturas: [], filters: { ...get().filters, asignaturaId: undefined } })
  },

  clearFilters: () => {
    set({
      filters: defaultFilters,
      search: "",
      pagination: { ...defaultPagination },
      docentes: [],
      carreras: [],
      asignaturas: [],
    })
  },
}))
