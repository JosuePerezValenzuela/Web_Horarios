import { apiClient, type ApiClientOptions } from "@/shared/services/api/client"

export interface CargaHorariaItem {
  grupo_tipo: string
  carga_horaria: number
}

export interface CargaFaltaItem {
  grupo_tipo: string
  carga_faltas: number
}

export interface CargaJustificadaItem {
  grupo_tipo: string
  carga_justificada: number
}

export interface PersonaFaltas {
  carga_faltas: number | CargaFaltaItem[]
  retrasos_min: number
  anticipados_min: number
}

export interface PersonaJustificaciones {
  carga_justificada: number | CargaJustificadaItem[]
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
  carga_horaria: number | CargaHorariaItem[]
  faltas: PersonaFaltas
  justificaciones_con_goce: PersonaJustificaciones
  justificaciones_sin_goce: PersonaJustificaciones
  // Campos opcionales para retrocompatibilidad
  justificaciones?: PersonaJustificaciones
  consolidado?: PersonaConsolidado
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

export type AlcanceReporteMensual = "plan_estudio" | "facultad" | "todas_facultades"

export interface ReporteMensualMembership {
  total_links?: number
  new_links?: number
  annulled_links?: number
}

export interface ParteReporteMensualItem {
  id: number
  fecha: string
  fecha_confirmacion: string | null
}

export interface JustificacionAprobadaReporteMensualItem {
  id: number
  descripcion: string
  con_goce_haberes: boolean
  detalle_id: number
  fecha: string
  persona_codigo: string
  persona_nombre: string
  grupo_nombre: string
  asignatura_nombre: string
  hora_inicio: string
  hora_fin: string
}

export interface ReporteMensualResponse {
  id: number
  fecha_desde: string
  fecha_hasta: string
  alcance: AlcanceReporteMensual | string
  objetivo: string
  membership?: ReporteMensualMembership
  partes?: ParteReporteMensualItem[]
  justificaciones_aprobadas?: JustificacionAprobadaReporteMensualItem[]
  personas: ReporteMensualPersona[]
  observados?: unknown[]
  alertas: ReporteMensualAlertas
}

export interface ParteDiarioEnVistaPrevia {
  id: number
  estado: string
  fecha_confirmacion: string | null
}

export interface FechaVistaPrevia {
  fecha: string
  partes: ParteDiarioEnVistaPrevia[]
}

export interface PersonaJustificacionPendiente {
  nombres: string
}

export interface JustificacionPendienteVistaPrevia {
  id: number
  persona_id: number
  persona: PersonaJustificacionPendiente
  fecha_desde: string
  fecha_hasta: string
  descripcion: string
  con_goce_haberes: boolean
  tipo_justificacion_id: number
  estado: string
  horario_ids: number[]
}

export interface VistaPreviaReporteMensualResponse {
  alcance: AlcanceReporteMensual | string
  objetivo: string
  fecha_desde: string
  fecha_hasta: string
  fechas: FechaVistaPrevia[]
  justificaciones_pendientes: JustificacionPendienteVistaPrevia[]
  fingerprint: string
}

export interface VistaPreviaReporteMensualParams {
  alcance: AlcanceReporteMensual
  plan_estudio_id?: number
  facultad_id?: number
  fecha_desde: string
  fecha_hasta: string
}

export interface GenerarReporteMensualPlanRequest {
  alcance: "plan_estudio"
  plan_estudio_id: number
  fecha_desde: string
  fecha_hasta: string
  fingerprint: string
}

export interface GenerarReporteMensualFacultadRequest {
  alcance: "facultad"
  facultad_id: number
  fecha_desde: string
  fecha_hasta: string
  fingerprint: string
}

export interface GenerarReporteMensualTodasRequest {
  alcance: "todas_facultades"
  fecha_desde: string
  fecha_hasta: string
  fingerprint: string
}

export type GenerarReporteMensualRequest =
  | GenerarReporteMensualPlanRequest
  | GenerarReporteMensualFacultadRequest
  | GenerarReporteMensualTodasRequest

export interface StaleFingerprintErrorBody {
  message: string
  code: "STALE_FINGERPRINT"
  vista_previa: VistaPreviaReporteMensualResponse
}

export interface DraftPartItem {
  part_id: number
  date: string
  faculty_code: string
  faculty_name: string
}

export interface DraftPartsErrorBody {
  message: string
  code: "DRAFT_PARTS"
  partes: DraftPartItem[]
}

export interface UnconfirmedPartsErrorBody {
  message: string
  code: "UNCONFIRMED_PARTS"
  partes: DraftPartItem[]
}

export const MESES_OPTIONS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
] as const

/**
 * Calcula el período mensual institucional: del 15 del mes anterior al 15 del mes seleccionado.
 * Por ejemplo, para febrero 2026: del 15 de enero de 2026 al 15 de febrero de 2026.
 */
export function calcularPeriodoMensual(
  mes: number,
  anio: number
): { fecha_desde: string; fecha_hasta: string } {
  const mesActualStr = String(mes).padStart(2, "0")
  const fecha_hasta = `${anio}-${mesActualStr}-15`

  let anioDesde = anio
  let mesDesdeNum = mes - 1
  if (mesDesdeNum === 0) {
    mesDesdeNum = 12
    anioDesde = anio - 1
  }
  const mesDesdeStr = String(mesDesdeNum).padStart(2, "0")
  const fecha_desde = `${anioDesde}-${mesDesdeStr}-15`

  return { fecha_desde, fecha_hasta }
}

export const partesMensualesApi = {
  obtenerVistaPrevia: async (
    params: VistaPreviaReporteMensualParams
  ): Promise<VistaPreviaReporteMensualResponse> => {
    const query = new URLSearchParams()
    query.set("alcance", params.alcance)
    query.set("fecha_desde", params.fecha_desde)
    query.set("fecha_hasta", params.fecha_hasta)
    if (params.alcance === "plan_estudio" && params.plan_estudio_id) {
      query.set("plan_estudio_id", String(params.plan_estudio_id))
    }
    if (params.alcance === "facultad" && params.facultad_id) {
      query.set("facultad_id", String(params.facultad_id))
    }
    return apiClient.get<VistaPreviaReporteMensualResponse>(
      `/partes-mensuales/vista-previa?${query.toString()}`
    )
  },

  generar: async (
    payload: GenerarReporteMensualRequest,
    options?: ApiClientOptions
  ): Promise<ReporteMensualResponse> => {
    return apiClient.post<ReporteMensualResponse>("/partes-mensuales", payload, options)
  },
}
