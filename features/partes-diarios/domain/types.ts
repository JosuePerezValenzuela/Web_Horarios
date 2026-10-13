export interface ConfiguracionAsistencia {
  id: number
  ingresoAnticipadoMinutos: number
  toleranciaIngresoMinutos: number
  limiteFaltaIngresoMinutos: number
  toleranciaSalidaPosteriorMinutos: number
  toleranciaSalidaAnticipadaMinutos: number
}

export interface GenerarParteDiarioRequest {
  facultadCodigo: string
  fecha: string // Strict YYYY-MM-DD
}

export interface ParteDiarioDetalle {
  detalle_parte_id: number
  horario_id: number
  hora_inicio: string // "HH:mm:ss"
  hora_fin: string // "HH:mm:ss"
  aula_id: number | null
  aula_codigo: string | null
  virtual: boolean
  persona_grupo_id: number
  persona_id: number
  persona_codigo: string
  persona_nombres: string
  persona_documento: string | null
  persona_complemento_documento: string | null
  tipo_designacion: string
  persona_grupo_carga_horaria: number
  primario: boolean
  primario_id: number | null
  grupo_id: number
  grupo_nombre: string
  grupo_tipo: string
  grupo_equivalente_carga_horaria_minutos: number
  asignatura_id: number
  asignatura_codigo: string
  asignatura_nombre: string
  asignatura_tipo: string
  asignatura_unidad_id: number | null
  asignatura_unidad_nombre: string | null
  fuente_registro: string | null
  minutos_retraso: number | null
  minutos_anticipados_salida: number | null
  falta: boolean | null
  hora_ingreso_tickeo: string | null
  hora_salida_tickeo: string | null
  observacion: string | null
  tiene_justificacion: boolean
  tipo_justificacion_nombre: string | null
  estado_justificacion: string | null
}

export interface ParteDiarioReporte {
  parte_diario_id: number
  fecha: string
  facultad_codigo: string
  estado: string
  facultad_id: number
  facultad_nombre: string
  detalles: ParteDiarioDetalle[]
}

export interface ConsultarReporteParams {
  fecha: string
  facultadCodigo: string
  hora_inicio?: string
  hora_fin?: string
  grupo_tipo?: string
  tipo_designacion?: string
  asignatura_tipo?: string
  virtual?: boolean | string
  aula_id?: number
  campus_id_geografico?: number
  facultad_id_geografico?: number
  bloque_id_geografico?: number
}

export interface RegistrarAsistenciaDetalleItem {
  detalle_parte_id: number
  fuente_registro?: string | null
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
  observacion?: string | null
}

export interface RegistrarAsistenciasRequest {
  fuente_registro?: string | null
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
  observacion?: string | null
  detalles: RegistrarAsistenciaDetalleItem[]
}

export interface FalloAsistenciaDetalle {
  detalle_parte_id: number
  motivo: string
}

export interface RegistrarAsistenciasResponse {
  exitosos: number
  fallidos: number
  fallos: FalloAsistenciaDetalle[]
}

export type EstadoParteDiario = "borrador" | "confirmado" | "anulado"

export interface CambiarEstadoParteRequest {
  estado: "confirmado" | "anulado"
  observacion?: string
}

export interface CambiarEstadoParteResponse {
  parte_diario_id: number
  estado: "confirmado" | "anulado"
}
