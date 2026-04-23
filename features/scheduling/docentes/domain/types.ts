/**
 * Docente domain types
 */

export interface Docente {
  id?: number
  codigo: string
  documento?: string | null
  nombres: string
}

export interface DocentesFilters {
  facultadId?: string
  carreraId?: string
  asignaturaId?: string
  search?: string
}

export interface Pagination {
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
  nextPage: number | null
  previousPage: number | null
}

export interface PaginationState {
  currentPage: number
  pageSize: number
}

export interface ApiResponse<T> {
  data: T
  pagination?: Pagination
}
