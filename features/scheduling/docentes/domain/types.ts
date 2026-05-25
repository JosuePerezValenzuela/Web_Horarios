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

export interface DocenteHorarioApiDocente {
  id?: number | string | null
  codigo?: string | null
  documento?: string | null
  nombres?: string | null
}

export interface DocenteHorarioApiCarrera {
  id?: number | string | null
  nombre?: string | null
}

export interface DocenteHorarioApiGroupRef {
  id?: number | string | null
  nombre?: string | null
  sigla?: string | null
}

export interface DocenteHorarioApiSubjectRef {
  id?: number | string | null
  nombre?: string | null
}

export interface DocenteHorarioApiAmbienteRef {
  id?: number | string | null
  nombre?: string | null
  tipo?: string | null
  tipoNombre?: string | null
}

export interface DocenteHorarioApiSchedule {
  id?: number | string | null
  persona_grupo_id?: number | string | null
  aula_id?: number | string | null
  ambiente_id?: number | string | null
  ambienteId?: number | string | null
  dia?: number | string | null
  diaSemana?: number | string | null
  dia_semana?: number | string | null
  diaNombre?: string | null
  dia_nombre?: string | null
  diaId?: number | string | null
  dia_id?: number | string | null
  horaInicio?: string | null
  horaFin?: string | null
  hora_inicio?: string | null
  hora_fin?: string | null
  duracionMinutos?: number | string | null
  duracion_minutos?: number | string | null
  materia?: string | null
  asignatura?: string | null
  grupo?: string | null
  grupoNombre?: string | null
  grupo_id?: number | string | null
  grupoId?: number | string | null
  carreras?: Array<string | DocenteHorarioApiCarrera> | null
  ambiente?: string | DocenteHorarioApiAmbienteRef | null
  tipoAmbiente?: string | null
  tipo_ambiente?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  grupoRef?: DocenteHorarioApiGroupRef | null
  materiaRef?: DocenteHorarioApiSubjectRef | null
}

export interface DocenteHorarioApiGroup {
  id?: number | string | null
  persona_grupo_id?: number | string | null
  groupKey?: string | null
  grupo?: string | null
  materia?: string | null
  carreras?: Array<string | DocenteHorarioApiCarrera> | null
  horarios?: DocenteHorarioApiSchedule[] | null
}

export interface DocenteHorariosApiPayload {
  docente?: DocenteHorarioApiDocente | null
  horarios?: DocenteHorarioApiSchedule[] | null
  grupos?: DocenteHorarioApiGroup[] | null
  items?: DocenteHorarioApiSchedule[] | null
}

export interface DocenteHorariosApiResponse {
  success?: boolean
  data?: DocenteHorariosApiPayload | null
  docente?: DocenteHorarioApiDocente | null
  horarios?: DocenteHorarioApiSchedule[] | null
  grupos?: DocenteHorarioApiGroup[] | null
  items?: DocenteHorarioApiSchedule[] | null
}

export interface DocenteScheduleMeta {
  id: string
  nombres: string
  codigo: string
  documento: string
}

export interface TimeRange {
  startMin: number
  endMin: number
}

export interface TimeRow {
  key: string
  label: string
  startMin: number
  endMin: number
}

export interface NormalizedSchedule {
  scheduleId: string
  groupKey: string
  persona_grupo_id: number
  ambienteId: number | null
  colorIndex: number
  day: 1 | 2 | 3 | 4 | 5 | 6
  startMin: number
  endMin: number
  durationMin: number
  laneIndex: number
  laneCount: number
  materia: string
  grupo: string
  carreras: string[]
  ambienteLabel: string
  tipoLabel: string
  fechasLabel: string
}

export interface GroupSummary {
  persona_grupo_id: number
  groupKey: string
  materia: string
  grupo: string
  carrerasLabel: string
  countHorarios: number
  estado: "Con Horarios" | "Sin Horarios"
  colorIndex: number
}

export interface NormalizedDocenteHorarios {
  docente: DocenteScheduleMeta
  schedules: NormalizedSchedule[]
  groups: GroupSummary[]
  timeRange: TimeRange
}

// ============================================
// INFRA System Types (Recursos fisicos)
// API abierta - respuesta real con "items" y "meta"
// ============================================

export interface InfraFacultad {
  id: number
  codigo: string
  nombre: string
  nombre_corto?: string | null
  campus_nombre?: string | null
  activo: boolean
  lat?: number
  lng?: number
  campus_id?: number
  created_at?: string
  creado_en?: string
}

export interface InfraBloque {
  id: number
  codigo: string
  nombre: string
  nombre_corto?: string | null
  pisos?: number
  activo: boolean
  lat?: number
  lng?: number
  facultad_nombre?: string
  tipo_bloque_nombre?: string
  facultadId?: number
}

export interface InfraTipoAmbiente {
  id: number
  nombre: string
  descripcion?: string | null
  descripcion_corta?: string | null
  activo: boolean
  actualizado_en?: string
  creado_en?: string
}

export interface InfraAmbiente {
  id: number
  codigo: string
  nombre: string
  capacidad: number
  edificio?: {
    id: number
    nombre: string
  }
  edificio_nombre?: string
  edificio_bloque?: string
  edificio_id?: number
  tipo?: string
  facultad_nombre?: string
  facultad_id?: number
  tiene_solapamiento_propio?: boolean
}

// ============================================
// Asignar Horario Modal Types
// ============================================

export interface GroupInfo {
  persona_grupo_id: number
  groupKey: string
  materia: string
  grupo: string
  carrerasLabel: string
}

export interface HorarioFormData {
  fechaInicio: Date
  fechaFin: Date
  dia: number // 1=Lunes, 6=Sabado
  horaInicio: string // "HH:mm" 24h
  horaFin: string // "HH:mm" 24h
  facultades: InfraFacultad[]
  bloques: InfraBloque[]
  tiposAmbiente: InfraTipoAmbiente[]
  estudiantes: number | null
}

export interface AsignarHorarioPayload {
  grupoId: string
  fechaInicio: string
  fechaFin: string
  dia: number
  horaInicio: string
  horaFin: string
  ambienteId: number
  estudiantes: number | null
}

// ============================================
// Bulk Assignment Types
// ============================================

export interface HorarioEntry {
  id: string
  dia: number | null
  horaInicio: string
  horaFin: string
  ambienteId?: number
  ambienteLabel?: string
  error?: string | null
}

export interface BulkAssignPayload {
  persona_grupo_id: number
  fecha_inicio: string
  fecha_fin: string
  horarios: Array<{
    dia: number
    hora_inicio: string
    hora_fin: string
    aula_id: number
  }>
}

export interface SolapamientoInfo {
  type: "intra-bulk" | "existing-schedule"
  entryIndex: number
  conflictingEntryIndex?: number
  message: string
}
