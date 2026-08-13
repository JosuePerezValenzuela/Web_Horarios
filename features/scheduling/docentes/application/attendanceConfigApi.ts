import { partesApiClient } from "@/shared/services/api/partesClient"

export interface AttendanceConfig {
  id?: number
  ingreso_anticipado_minutos: number
  tolerancia_ingreso_minutos: number
  limite_falta_ingreso_minutos: number
  tolerancia_salida_posterior_minutos: number
  tolerancia_salida_anticipada_minutos: number
  valid_from: string
  valid_to: string | null
}

export const attendanceConfigApi = {
  list: async (): Promise<AttendanceConfig[]> => {
    // Se utiliza partesApiClient que apunta al microservicio de Partes/Asistencias mediante NEXT_PUBLIC_PARTES_URL
    return partesApiClient.get<AttendanceConfig[]>("/configuraciones-asistencia")
  },

  create: async (config: Omit<AttendanceConfig, "id">): Promise<AttendanceConfig> => {
    // Se utiliza partesApiClient que apunta al microservicio de Partes/Asistencias mediante NEXT_PUBLIC_PARTES_URL
    return partesApiClient.post<AttendanceConfig>("/configuraciones-asistencia", config)
  },
}
