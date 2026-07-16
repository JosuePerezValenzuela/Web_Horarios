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
  codigo?: string | null
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
  aula_codigo?: string | null
  aulaCodigo?: string | null
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
  asignatura?: string | { codigo?: string | null; nombre?: string | null } | null
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
  persona?: {
    codigo?: string | null
    documento?: string | null
    nombres?: string | null
  } | null
  docente?: string | null
  materia_codigo?: string | null
}

export interface DocenteHorarioApiGroup {
  id?: number | string | null
  persona_grupo_id?: number | string | null
  groupKey?: string | null
  grupo?: string | null
  materia?: string | null
  carreras?: Array<string | DocenteHorarioApiCarrera> | null
  horarios?: DocenteHorarioApiSchedule[] | null
  materia_codigo?: string | null
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
  dbId: number | null
  fechaInicioRaw: string | null
  fechaFinRaw: string | null
  docente?: string
  materiaCodigo?: string
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

// ============================================
// Edit Schedule Types
// ============================================

export interface EditScheduleEntry {
  id: string
  dbId: number | null
  dia: number | null
  horaInicio: string
  horaFin: string
  ambienteId?: number
  ambienteLabel?: string
  fechaInicio?: string
  fechaFin?: string
  error?: string | null
}

export interface EditarHorarioItem {
  id?: number
  dia?: number
  hora_inicio?: string
  hora_fin?: string
  aula_id?: number
  fecha_inicio?: string
  fecha_fin?: string
}

export interface EditarHorariosBatchRequest {
  persona_grupo_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  horarios: EditarHorarioItem[]
}

export interface EditarHorariosBatchRequest {
  persona_grupo_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  horarios: EditarHorarioItem[]
}

export interface EditarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: unknown
}

export interface EliminarHorariosBatchRequest {
  ids: number[]
}

export interface EliminarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: unknown
}

export interface EntryFilterOverrides {
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null
}

export interface AmbienteSearchContract {
  getEntry: (entryId: string) => EditScheduleEntry | HorarioEntry | undefined
  getEntryFilters: (entryId: string) => EntryFilterOverrides | undefined
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null
  dateRange?: { from?: Date; to?: Date }
  loadingAmbientesForEntry: string | null
  ambienteCache: Record<string, InfraAmbiente[]>
  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => void
  setEntryFilters: (entryId: string, filters: Partial<EntryFilterOverrides>) => void
  fetchAmbientesForEntry: (entryId: string) => Promise<void>
}

// ============================================
// Updated Component Prop Interfaces
// These will be used by components in Batch 2/3.
// ============================================

export interface GroupSummaryCardProps {
  group: GroupSummary
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
}

export interface BulkAssignmentModalProps {
  mode: "create" | "edit"
  onAssigned?: () => void | Promise<void>
  schedules?: NormalizedSchedule[]
}

export interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  mode?: "full" | "peek"
  className?: string
  onClick?: (schedule: NormalizedSchedule) => void
}

export interface AdminSchedule {
  id: string | number
  startMin: number
  endMin: number
  label: string
  days: number[]
}

export interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
  overlapRotationIntervalMs?: number
  onEditSchedule?: (schedule: NormalizedSchedule) => void
  adminSchedules?: AdminSchedule[]
}

export interface TeacherSchedulePageProps {
  docente: DocenteScheduleMeta | null
  groups: GroupSummary[]
  schedules: NormalizedSchedule[]
  period: number
  overlapRotationIntervalMs?: number
  rows: TimeRow[]
  timeRange: TimeRange
  loading: boolean
  error: string | null
  onRetry: () => void
  onBack: () => void
  onPeriodChange: (period: number) => void
  docenteId?: string
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
  onEditSchedule?: (schedule: NormalizedSchedule) => void
  onAssigned?: () => void | Promise<void>
  adminSchedules?: AdminSchedule[]
  rawAdminSchedules?: AdminScheduleRaw[]
}

export interface AdminScheduleRaw {
  id: number
  horario_catalogo: {
    id: number
    descripcion: string
    hora_entrada: string
    hora_salida: string
  }
  fecha_inicio: string
  fecha_fin: string | null
  permite_clases: boolean
}

export interface AdminScheduleApiResponse {
  success: boolean
  data: {
    persona?: {
      codigo?: string
      nombres?: string
    }
    horarios: AdminScheduleRaw[]
  }
}

export interface HorarioCatalogoItem {
  id: number
  descripcion: string
  hora_entrada: string
  hora_salida: string
}

export interface CrearAsignacionHorarioRequest {
  persona_codigo: string
  horario_catalogo_id: number
  fecha_inicio: string
  fecha_fin: string | null
  permite_clases: boolean
}

export interface CrearAsignacionHorarioResponse {
  success: boolean
  message?: string
  data?: AdminScheduleRaw
}

export interface PatchAsignacionHorarioRequest {
  fecha_fin?: string | null
  permite_clases?: boolean
}

export interface PatchAsignacionHorarioResponse {
  success: boolean
  message?: string
  data?: AdminScheduleRaw
}
