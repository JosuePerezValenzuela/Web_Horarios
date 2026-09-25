export interface SolapamientoCarrera {
  id: number
  nombre: string
}

export interface SolapamientoPersonaGrupo {
  id: number
  primario: boolean
  primario_id: number | null
}

export interface TipoAsignacionHorarioAdministrativo {
  id: number
  codigo: string
  descripcion: string
}

export interface SolapamientoHorarioClase {
  id: number
  tipo: "clase"
  dia: number
  hora_inicio: string
  hora_fin: string
  fecha_inicio: string
  fecha_fin: string | null
  tipo_designacion: string
  grupo: string
  asignatura_codigo: string
  asignatura_nombre: string
  persona_grupo?: SolapamientoPersonaGrupo
  carreras: SolapamientoCarrera[]
  aula_codigo?: string | null
  aulaCodigo?: string | null
  aula_id?: number | null
  ambiente?: string | null
  virtual?: boolean
}

export interface SolapamientoHorarioAdministrativo {
  id: number
  tipo: "administrativo"
  dia: number
  hora_inicio: string
  hora_fin: string
  fecha_inicio: string
  fecha_fin: string | null
  horario_descripcion: string
  tipo_asignacion_horario_administrativo?: TipoAsignacionHorarioAdministrativo | null
  carga_horaria_diaria?: number | null
  carreras: SolapamientoCarrera[]
}

export type SolapamientoHorario = SolapamientoHorarioClase | SolapamientoHorarioAdministrativo

export type SolapamientoCategoria = "admin-admin" | "admin-clase" | "clase-clase"

export interface SolapamientoPar {
  horario_a: SolapamientoHorario
  horario_b: SolapamientoHorario
  categoria: SolapamientoCategoria
}

export interface SolapamientoDocente {
  persona_id: number
  codigo: string
  nombres: string
  solapamientos: SolapamientoPar[]
  horarios_sin_solapamiento: SolapamientoHorario[]
}

export interface DetectarSolapamientosResponse {
  docentes: SolapamientoDocente[]
  metadata: {
    total_docentes: number
    tolerancia_minutos: number
  }
}

export interface LocalOverlapConflict {
  id: string
  tipo: SolapamientoCategoria
  horarioA: {
    id: number
    tipo: "clase" | "administrativo"
    label: string
    hora: string
    rangoFechas: string
    diaLabel: string
    startMin: number
    carreras?: string[]
  }
  horarioB: {
    id: number
    tipo: "clase" | "administrativo"
    label: string
    hora: string
    rangoFechas: string
    diaLabel: string
    startMin: number
    carreras?: string[]
  }
  overlapDuration: number
  dia: number
}
