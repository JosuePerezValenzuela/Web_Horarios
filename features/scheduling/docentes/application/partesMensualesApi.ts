import { partesApiClient } from "@/shared/services/api/partesClient"

export interface ReporteMensualPersona {
  persona_codigo: string
  persona_nombres: string
  carga_horaria_mensual: number
  minutos_retraso: number
  minutos_anticipados: number
  cantidad_retrasos: number
  cantidad_faltas: number
}

export interface ReporteMensualEvidencia {
  fecha: string
  hora_ingreso_tickeo: string | null
  hora_salida_tickeo: string | null
  minutos_retraso: number
  minutos_anticipados: number
  falta: boolean
  hora_inicio: string
  hora_fin: string
  grupo_nombre: string
  asignatura_codigo: string
  asignatura_nombre: string
  aula_codigo: string
}

export interface ReporteMensualAlertaGrupo {
  persona_codigo: string
  persona_nombres: string
  evidencias: ReporteMensualEvidencia[]
}

export interface ReporteMensualSecuencia {
  fecha_inicio: string
  fecha_fin: string
  cantidad_ocurrencias: number
  evidencias: ReporteMensualEvidencia[]
}

export interface ReporteMensualConsecutivaGrupo {
  persona_codigo: string
  persona_nombres: string
  secuencias: ReporteMensualSecuencia[]
}

export interface ReporteMensualResponse {
  id: number
  facultad_codigo: string
  fecha_desde: string
  fecha_hasta: string
  created_at: string
  updated_at: string
  personas: ReporteMensualPersona[]
  alertas: {
    retrasos: ReporteMensualAlertaGrupo[]
    faltas: ReporteMensualAlertaGrupo[]
    inasistencias_consecutivas: ReporteMensualConsecutivaGrupo[]
  }
}

export interface GenerarReporteMensualRequest {
  facultadCodigo: string
  fechaDesde: string
  fechaHasta: string
}

export const partesMensualesApi = {
  generar: async (payload: GenerarReporteMensualRequest): Promise<ReporteMensualResponse> => {
    return partesApiClient.post<ReporteMensualResponse>("/partes-mensuales", payload)
  },
}
