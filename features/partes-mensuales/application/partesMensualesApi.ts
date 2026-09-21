import { partesApiClient } from "@/shared/services/api/partesClient"

export interface MetricsData {
  occurrence_count: number
  occurrence_load: number
  absence_count: number
  absence_load: number
  delay_count: number
  delay_minutes: number
  early_minutes: number
}

export interface ReporteMensualEvidence {
  detalle_id: number
  fecha: string
  hora_ingreso_tickeo: string | null
  hora_salida_tickeo: string | null
  minutos_retraso: number | null
  minutos_anticipados: number | null
  falta: boolean
  hora_inicio: string
  hora_fin: string
  grupo_nombre: string
  asignatura_codigo: string
  asignatura_nombre: string
  aula_codigo: string | null
}

export interface ReporteMensualAsignacion {
  persona_grupo_id: number
  carga_horaria_mensual: number
  raw: MetricsData
  license: MetricsData
  consolidated: MetricsData
  evidence: ReporteMensualEvidence[]
}

export interface ReporteMensualPersona {
  persona_codigo: string
  persona_nombres: string
  asignaciones: ReporteMensualAsignacion[]
  raw: MetricsData
  license: MetricsData
  consolidated: MetricsData
}

export interface AlertaRetrasoOcurrencia {
  fecha: string
  hora_ingreso_tickeo: string | null
  hora_salida_tickeo: string | null
  minutos_retraso: number | null
  minutos_anticipados: number | null
  falta: boolean
  hora_inicio: string
  hora_fin: string
  grupo_nombre: string
  asignatura_codigo: string
  asignatura_nombre: string
  aula_codigo: string | null
}

export interface AlertaRetrasoItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  evidencias?: AlertaRetrasoOcurrencia[]
  evidence?: AlertaRetrasoOcurrencia[]
}

export interface AlertaFaltaItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  evidencias?: AlertaRetrasoOcurrencia[]
  evidence?: AlertaRetrasoOcurrencia[]
}

export interface AlertaInasistenciaConsecutivaItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  fecha_inicio?: string
  fecha_fin?: string
  evidencias?: AlertaRetrasoOcurrencia[]
  evidence?: AlertaRetrasoOcurrencia[]
  secuencias?: Array<{
    fecha_inicio: string
    fecha_fin: string
    cantidad_ocurrencias?: number
    evidencias: AlertaRetrasoOcurrencia[]
  }>
}

export interface ReporteMensualAlertas {
  retrasos: AlertaRetrasoItem[]
  faltas: AlertaFaltaItem[]
  inasistencias_consecutivas: AlertaInasistenciaConsecutivaItem[]
}

export interface ReporteMensualMembership {
  total_links: number
  new_links: number
  annulled_links: number
}

export interface ReporteMensualResponse {
  id: number
  fecha_desde: string
  fecha_hasta: string
  alcance: string
  objetivo: string
  created_at: string
  updated_at: string
  membership?: ReporteMensualMembership
  personas: ReporteMensualPersona[]
  alertas: ReporteMensualAlertas
}

export interface GenerarReporteMensualRequest {
  fecha_desde: string
  fecha_hasta: string
  alcance: "facultad"
  objetivo: string
}

export const partesMensualesApi = {
  generar: async (payload: GenerarReporteMensualRequest): Promise<ReporteMensualResponse> => {
    return partesApiClient.post<ReporteMensualResponse>("/partes-mensuales", payload)
  },
}
