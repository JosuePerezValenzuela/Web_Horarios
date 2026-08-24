export interface SolapamientoCarrera {
  id: number
  nombre: string
}

export interface SolapamientoHorarioClase {
  id: number
  dia: number
  hora_inicio: string
  hora_fin: string
  fecha_inicio: string
  fecha_fin: string | null
  tipo_designacion: string
  grupo: string
  asignatura_codigo: string
  asignatura_nombre: string
  carreras: SolapamientoCarrera[]
  aula_codigo?: string | null
  aulaCodigo?: string | null
  ambiente?: string | null
}

export interface SolapamientoHorarioAdministrativo {
  id: number
  dia: number | null
  hora_inicio: string
  hora_fin: string
  fecha_inicio: string
  fecha_fin: string | null
  horario_descripcion: string
  carreras: any[]
}

export interface SolapamientoDocente {
  persona_id: number
  codigo: string
  nombres: string
  horario_clases: SolapamientoHorarioClase[]
  horario_administrativo: SolapamientoHorarioAdministrativo[]
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
  tipo: "clase-clase" | "clase-admin" | "admin-admin"
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
