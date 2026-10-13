import { apiClient } from "@/shared/services/api/client"

export interface AttendanceConfig {
  id: number
  fecha_inicio: string // YYYY-MM-DD
  fecha_fin: string // YYYY-MM-DD
  ingreso_anticipado_minutos: number
  tolerancia_ingreso_minutos: number
  limite_falta_ingreso_minutos: number
  tolerancia_salida_posterior_minutos: number
  tolerancia_salida_anticipada_minutos: number
  // Aliases for backward compatibility in UI
  valid_from?: string
  valid_to?: string | null
}

export interface CrearConfiguracionAsistenciaPayload {
  fecha_inicio: string
  fecha_fin: string
  ingreso_anticipado_minutos: number
  tolerancia_ingreso_minutos: number
  limite_falta_ingreso_minutos: number
  tolerancia_salida_posterior_minutos: number
  tolerancia_salida_anticipada_minutos: number
}

export type ActualizarConfiguracionAsistenciaPayload = Partial<CrearConfiguracionAsistenciaPayload>

export const attendanceConfigApi = {
  list: async (): Promise<AttendanceConfig[]> => {
    const data = await apiClient.get<AttendanceConfig[]>("/configuraciones-asistencia")
    return (data || []).map((item) => ({
      ...item,
      valid_from: item.fecha_inicio,
      valid_to: item.fecha_fin,
    }))
  },

  create: async (
    config:
      | CrearConfiguracionAsistenciaPayload
      | (Omit<AttendanceConfig, "id"> & { valid_from?: string; valid_to?: string | null })
  ): Promise<AttendanceConfig> => {
    const rawConfig = config as Record<string, unknown>
    const fechaInicio =
      typeof rawConfig.fecha_inicio === "string" && rawConfig.fecha_inicio
        ? rawConfig.fecha_inicio
        : typeof rawConfig.valid_from === "string"
          ? rawConfig.valid_from
          : ""
    const fechaFin =
      typeof rawConfig.fecha_fin === "string" && rawConfig.fecha_fin
        ? rawConfig.fecha_fin
        : typeof rawConfig.valid_to === "string"
          ? rawConfig.valid_to
          : "2099-12-31"

    const payload: CrearConfiguracionAsistenciaPayload = {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      ingreso_anticipado_minutos: config.ingreso_anticipado_minutos,
      tolerancia_ingreso_minutos: config.tolerancia_ingreso_minutos,
      limite_falta_ingreso_minutos: config.limite_falta_ingreso_minutos,
      tolerancia_salida_posterior_minutos: config.tolerancia_salida_posterior_minutos,
      tolerancia_salida_anticipada_minutos: config.tolerancia_salida_anticipada_minutos,
    }

    const created = await apiClient.post<AttendanceConfig>("/configuracion-asistencia", payload)
    return {
      ...created,
      valid_from: created.fecha_inicio,
      valid_to: created.fecha_fin,
    }
  },

  update: async (
    id: number,
    config:
      | ActualizarConfiguracionAsistenciaPayload
      | { valid_from?: string; valid_to?: string | null; [key: string]: unknown }
  ): Promise<AttendanceConfig> => {
    const payload: Record<string, unknown> = {}

    if ("fecha_inicio" in config && config.fecha_inicio !== undefined) {
      payload.fecha_inicio = config.fecha_inicio
    } else if ("valid_from" in config && config.valid_from !== undefined) {
      payload.fecha_inicio = config.valid_from
    }

    if ("fecha_fin" in config && config.fecha_fin !== undefined) {
      payload.fecha_fin = config.fecha_fin
    } else if ("valid_to" in config && config.valid_to !== undefined && config.valid_to !== null) {
      payload.fecha_fin = config.valid_to
    }

    if (config.ingreso_anticipado_minutos !== undefined) {
      payload.ingreso_anticipado_minutos = config.ingreso_anticipado_minutos
    }
    if (config.tolerancia_ingreso_minutos !== undefined) {
      payload.tolerancia_ingreso_minutos = config.tolerancia_ingreso_minutos
    }
    if (config.limite_falta_ingreso_minutos !== undefined) {
      payload.limite_falta_ingreso_minutos = config.limite_falta_ingreso_minutos
    }
    if (config.tolerancia_salida_posterior_minutos !== undefined) {
      payload.tolerancia_salida_posterior_minutos = config.tolerancia_salida_posterior_minutos
    }
    if (config.tolerancia_salida_anticipada_minutos !== undefined) {
      payload.tolerancia_salida_anticipada_minutos = config.tolerancia_salida_anticipada_minutos
    }

    const updated = await apiClient.patch<AttendanceConfig>(
      `/configuracion-asistencia/${id}`,
      payload
    )
    return {
      ...updated,
      valid_from: updated.fecha_inicio,
      valid_to: updated.fecha_fin,
    }
  },

  delete: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/configuracion-asistencia/${id}`)
  },
}
