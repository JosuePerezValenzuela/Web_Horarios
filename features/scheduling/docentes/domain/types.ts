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
