export interface Environment {
  id: string
  codigo: string
  nombre: string
}

export interface Suggestion {
  reservationId: string
  environments: Environment[]
  codigo: string
  nombre: string
  bloqueNombre: string
  facultadNombre: string
  tipoAmbienteNombre: string
  campusNombre: string
  disponible: boolean
}

export interface SearchMeta {
  total: number
  mostrados: number
  take: number
  tolerancia: number | null
  agrupacion: "bloque" | "individual"
}

export interface CheckAvailabilityResponse {
  sugerencias: Suggestion[]
  meta: SearchMeta
}

export interface CheckAvailabilityRequest {
  fecha: string // YYYY-MM-DD
  horaInicio: string // HH:mm
  horaFin: string // HH:mm
  capacidad: number // >= 1
  tipoCapacidad: "total" | "examen"
  facultadIds: number[]
  userId: string
  purpose?: string
  campusIds?: number[]
  tipoAmbienteIds?: number[]
  codigoAmbiente?: string
  bloqueId?: number
  take?: number
  agrupacion?: "bloque" | "individual"
}

export interface HttpErrorResponse {
  statusCode: number
  error: string
  message: string | string[]
  timestamp: string
  path: string
  details?: Record<string, unknown>
}
