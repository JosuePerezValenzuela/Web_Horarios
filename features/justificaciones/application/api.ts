import { apiClient } from "@/shared/services/api/client"
import type {
  TipoJustificacion,
  CrearJustificacionPayload,
  JustificacionCreadaResponse,
  ListarJustificacionesParams,
  ListarJustificacionesResponse,
  CambiarEstadoJustificacionRequest,
  CambiarEstadoJustificacionResponse,
} from "../domain/types"

/**
 * Obtener catálogo de tipos de justificación (GET /api/justificaciones/tipos)
 */
export async function fetchTiposJustificacion(): Promise<TipoJustificacion[]> {
  return apiClient.get<TipoJustificacion[]>("/justificaciones/tipos")
}

/**
 * Registrar una nueva justificación (POST /api/justificaciones)
 */
export async function crearJustificacion(
  payload: CrearJustificacionPayload
): Promise<JustificacionCreadaResponse> {
  const body: Record<string, unknown> = {
    horario_ids: payload.horario_ids,
    fecha_desde: payload.fecha_desde,
    fecha_hasta: payload.fecha_hasta,
    descripcion: payload.descripcion.trim(),
    con_goce_haberes: Boolean(payload.con_goce_haberes),
    tipo_justificacion_id: Number(payload.tipo_justificacion_id),
  }

  if (payload.uuid_doc && payload.uuid_doc.trim()) {
    body.uuid_doc = payload.uuid_doc.trim()
  }

  return apiClient.post<JustificacionCreadaResponse>("/justificaciones", body, {
    loadingMessage: "Registrando justificación...",
    successMessage: "Justificación registrada exitosamente",
  })
}

/**
 * Listar justificaciones con filtros y paginación (GET /api/justificaciones)
 */
export async function listarJustificaciones(
  params: ListarJustificacionesParams = {}
): Promise<ListarJustificacionesResponse> {
  const searchParams = new URLSearchParams()

  if (params.persona_id) {
    searchParams.set("persona_id", String(params.persona_id))
  }
  if (params.tipo_justificacion_id) {
    searchParams.set("tipo_justificacion_id", String(params.tipo_justificacion_id))
  }
  if (params.estado) {
    searchParams.set("estado", params.estado)
  }
  if (params.uuid_doc_presente) {
    searchParams.set("uuid_doc_presente", params.uuid_doc_presente)
  }
  if (params.page) {
    searchParams.set("page", String(params.page))
  }
  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize))
  }

  const query = searchParams.toString()
  const endpoint = `/justificaciones${query ? `?${query}` : ""}`

  return apiClient.get<ListarJustificacionesResponse>(endpoint)
}

/**
 * Aprobar o rechazar una justificación (PATCH /api/justificaciones/:id/estado)
 *
 * Contrato:
 * - motivo_rechazo solo se acepta al rechazar. Al aprobar DEBE omitirse.
 * - Rechazar puede incluir motivo_rechazo opcional (máx. 64 caracteres).
 * - Transiciones válidas: pendiente -> aprobada, pendiente -> rechazada, aprobada -> rechazada.
 */
export async function cambiarEstadoJustificacion(
  id: number,
  estado: "aprobada" | "rechazada",
  motivo_rechazo?: string | null
): Promise<CambiarEstadoJustificacionResponse> {
  const payload: CambiarEstadoJustificacionRequest = {
    estado,
  }

  if (estado === "rechazada") {
    if (motivo_rechazo !== undefined && motivo_rechazo !== null) {
      const trimmed = motivo_rechazo.trim()
      if (trimmed.length > 0) {
        if (trimmed.length > 64) {
          throw new Error("El motivo de rechazo no puede exceder 64 caracteres.")
        }
        payload.motivo_rechazo = trimmed
      }
    }
  }

  return apiClient.patch<CambiarEstadoJustificacionResponse>(
    `/justificaciones/${id}/estado`,
    payload,
    {
      loadingMessage:
        estado === "aprobada" ? "Aprobando justificación..." : "Rechazando justificación...",
      successMessage: `Justificación ${estado === "aprobada" ? "aprobada" : "rechazada"} exitosamente`,
    }
  )
}

export const justificacionesApi = {
  fetchTiposJustificacion,
  crearJustificacion,
  listarJustificaciones,
  cambiarEstadoJustificacion,
  getTipos: fetchTiposJustificacion,
  crear: crearJustificacion,
  listar: listarJustificaciones,
  cambiarEstado: cambiarEstadoJustificacion,
}

export const justificacionesService = justificacionesApi
