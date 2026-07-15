import type {
  CheckAvailabilityRequest,
  CheckAvailabilityResponse,
  Suggestion,
} from "../domain/reservation.types"

const RESERVAS_BASE_URL = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "http://localhost:3005/api"

// Mock suggestions fallback for offline development
const MOCK_SUGGESTIONES: Suggestion[] = [
  {
    reservationId: "res-mock-101-uuid-f7481",
    environments: [{ id: "env-101", codigo: "AUD-617", nombre: "Aula 617" }],
    codigo: "AUD-617",
    nombre: "Aula 617 - Auditorio de Postgrado",
    bloqueNombre: "Bloque Nuevo de Tecnología",
    facultadNombre: "Ciencias y Tecnología",
    tipoAmbienteNombre: "Auditorio",
    campusNombre: "Campus Central",
    disponible: true,
  },
  {
    reservationId: "res-mock-102-uuid-d8194",
    environments: [{ id: "env-102", codigo: "LAB-204", nombre: "Aula 204" }],
    codigo: "LAB-204",
    nombre: "Aula 204 - Laboratorio de Computación",
    bloqueNombre: "Bloque de Ingeniería Química",
    facultadNombre: "Ciencias y Tecnología",
    tipoAmbienteNombre: "Laboratorio",
    campusNombre: "Campus Central",
    disponible: true,
  },
  {
    reservationId: "res-mock-103-uuid-c0182",
    environments: [{ id: "env-103", codigo: "COM-101", nombre: "Aula 101" }],
    codigo: "COM-101",
    nombre: "Aula 101 - Pabellón A Común",
    bloqueNombre: "Bloque A - Humanidades",
    facultadNombre: "Humanidades y Ciencias de la Educación",
    tipoAmbienteNombre: "Aula Común",
    campusNombre: "Campus Central",
    disponible: true,
  },
  {
    reservationId: "res-mock-104-uuid-a9128",
    environments: [{ id: "env-104", codigo: "AUL-210", nombre: "Aula 210" }],
    codigo: "AUL-210",
    nombre: "Aula 210 - Aula de Postgrado de Medicina",
    bloqueNombre: "Bloque B - Facultad de Medicina",
    facultadNombre: "Facultad de Medicina",
    tipoAmbienteNombre: "Aula Común",
    campusNombre: "Campus Aurelio Melean",
    disponible: true,
  },
]

export const reservationService = {
  checkAvailability: async (data: CheckAvailabilityRequest): Promise<CheckAvailabilityResponse> => {
    try {
      const response = await fetch(`${RESERVAS_BASE_URL}/reservations/check-availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any
        error.status = response.status
        error.body = errorBody
        throw error
      }

      return (await response.json()) as CheckAvailabilityResponse
    } catch (err: any) {
      // If we failed to connect (e.g. server is offline), return the mock data for seamless development
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        console.warn(
          "Servicio de reservas offline en http://localhost:3005 - Usando datos simulados."
        )

        // Filter mock data locally based on request parameters for realistic feedback
        let filtered = [...MOCK_SUGGESTIONES]

        if (data.facultadIds && data.facultadIds.length > 0) {
          // If facultadIds includes 1, let's keep Ciencias y Tecnología.
          // If it includes 2, keep Humanidades. If 3, keep Medicina.
          // Otherwise keep all to show results.
          const matchesCiencias = data.facultadIds.includes(1) || data.facultadIds.includes(2)
          const matchesHumanidades = data.facultadIds.includes(3)
          const matchesMedicina = data.facultadIds.includes(4)

          filtered = MOCK_SUGGESTIONES.filter((sug) => {
            if (sug.facultadNombre.includes("Tecnología") && matchesCiencias) return true
            if (sug.facultadNombre.includes("Humanidades") && matchesHumanidades) return true
            if (sug.facultadNombre.includes("Medicina") && matchesMedicina) return true
            return data.facultadIds.length > 2 // Return all if we selected many
          })
        }

        // Mock a 250ms latency
        await new Promise((resolve) => setTimeout(resolve, 250))

        return {
          sugerencias: filtered.slice(0, data.take || 3),
          meta: {
            total: MOCK_SUGGESTIONES.length,
            mostrados: Math.min(filtered.length, data.take || 3),
            take: data.take || 3,
            tolerancia: null,
            agrupacion: data.agrupacion || "bloque",
          },
        }
      }

      throw err
    }
  },
}
