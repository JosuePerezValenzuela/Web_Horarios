import { partesApiClient } from "@/shared/services/api/partesClient"

export interface PersonaFaltas {
  carga_faltas: number
  retrasos_min: number
  anticipados_min: number
}

export interface PersonaJustificaciones {
  carga_justificada: number
  retrasos_min_justificados: number
  anticipado_min_justificados: number
}

export interface PersonaConsolidado {
  carga_consolidada: number
  minutos_retraso_consolidado: number
  minutos_anticipado_consolidado: number
}

export interface ReporteMensualPersona {
  persona_codigo: string
  persona_nombres: string
  carga_horaria: number
  faltas: PersonaFaltas
  justificaciones: PersonaJustificaciones
  consolidado: PersonaConsolidado
}

export interface AlertaOcurrenciaDetalle {
  detalle_id?: number | null
  fecha: string
  hora_inicio: string
  hora_fin: string
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
  minutos_retraso?: number | null
  minutos_anticipados?: number | null
  falta?: boolean
  grupo_nombre?: string | null
  asignatura_codigo?: string | null
  asignatura_nombre?: string | null
  aula_codigo?: string | null
}

export interface AlertaRetrasoItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  evidence?: AlertaOcurrenciaDetalle[]
  evidencias?: AlertaOcurrenciaDetalle[]
}

export interface AlertaFaltaItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  evidence?: AlertaOcurrenciaDetalle[]
  evidencias?: AlertaOcurrenciaDetalle[]
}

export interface AlertaInasistenciaConsecutivaItem {
  persona_codigo: string
  persona_nombres: string
  count?: number
  fecha_inicio?: string
  fecha_fin?: string
  evidence?: AlertaOcurrenciaDetalle[]
  evidencias?: AlertaOcurrenciaDetalle[]
  secuencias?: Array<{
    fecha_inicio: string
    fecha_fin: string
    cantidad_ocurrencias?: number
    evidencias?: AlertaOcurrenciaDetalle[]
    evidence?: AlertaOcurrenciaDetalle[]
  }>
}

export interface ReporteMensualAlertas {
  mas_3_retrasos: AlertaRetrasoItem[]
  "3_faltas_mas": AlertaFaltaItem[]
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
  alcance: "facultad" | string
  objetivo: string
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
