export interface TipoJustificacion {
  id: number
  codigo: string
  nombre: string
}

export type EstadoJustificacion = "pendiente" | "aprobada" | "rechazada"

export interface JustificacionOcurrencia {
  fecha: string
  dia: number // 0=Lunes, ..., 6=Domingo
  hora_inicio: string
  hora_fin: string
  aula_id: number | null
  aula_codigo: string | null
  virtual: boolean
}

export interface JustificacionHorarioItem {
  horario_id: number
  ocurrencias: JustificacionOcurrencia[]
}

export interface PersonaJustificacion {
  nombres?: string | null
}

export interface JustificacionListItem {
  id: number
  persona_id: number
  persona?: PersonaJustificacion | null
  horario_ids: number[]
  fecha_desde: string
  fecha_hasta: string
  descripcion: string
  uuid_doc: string | null
  con_goce_haberes: boolean
  tipo_justificacion_id: number
  tipo_justificacion?: TipoJustificacion
  estado: EstadoJustificacion
  motivo_rechazo?: string | null
  created_at?: string
  updated_at?: string
  horarios: JustificacionHorarioItem[]
}

export interface ListarJustificacionesParams {
  persona_id?: number
  tipo_justificacion_id?: number
  estado?: EstadoJustificacion
  uuid_doc_presente?: "true" | "false"
  page?: number
  pageSize?: number
}

export interface JustificacionPagination {
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
  nextPage: number | null
  previousPage: number | null
}

export interface ListarJustificacionesResponse {
  items: JustificacionListItem[]
  pagination: JustificacionPagination
}

export interface CambiarEstadoJustificacionRequest {
  estado: "aprobada" | "rechazada"
  motivo_rechazo?: string
}

export interface CambiarEstadoJustificacionResponse {
  id: number
  estado: "aprobada" | "rechazada"
  motivo_rechazo?: string | null
}

export interface CrearJustificacionPayload {
  horario_ids: number[]
  fecha_desde: string
  fecha_hasta: string
  tipo_justificacion_id: number
  descripcion: string
  con_goce_haberes: boolean
  uuid_doc?: string
}

export interface JustificacionCreadaResponse {
  id: number
  persona_id: number
  horario_ids: number[]
  fecha_desde: string
  fecha_hasta: string
  descripcion: string
  uuid_doc: string | null
  con_goce_haberes: boolean
  tipo_justificacion_id: number
  estado: "pendiente"
  motivo_rechazo: null
  created_at: string
  updated_at: string
}
