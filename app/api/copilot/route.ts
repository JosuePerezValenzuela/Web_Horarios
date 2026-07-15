import { NextRequest } from "next/server"

const getBackendUrl = () => {
  let baseUrl = process.env.NEXT_PUBLIC_RESERVAS_URL ?? "http://localhost:3005/api"
  // Translate localhost to host.docker.internal when inside the container
  if (baseUrl.includes("localhost")) {
    baseUrl = baseUrl.replace("localhost", "host.docker.internal")
  }
  return `${baseUrl}/copilotkit`
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { messages, frontendState } = body

    // Format the payload expected by the backend microservice
    const backendPayload = {
      messages: messages || [],
      frontendState: frontendState || {},
      frontendActions: [
        {
          name: "prefillSearchForm",
          description:
            "Actualiza los campos del formulario de reserva de ambientes con los parámetros dados por el usuario",
          parameters: {
            type: "object",
            properties: {
              fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
              horaInicio: { type: "string", description: "Hora de inicio en formato HH:mm" },
              horaFin: { type: "string", description: "Hora de fin en formato HH:mm" },
              capacidad: { type: "number", description: "Capacidad de alumnos requerida" },
              tipoCapacidad: {
                type: "string",
                enum: ["total", "examen"],
                description: "Tipo de capacidad",
              },
              purpose: { type: "string", description: "Propósito o motivo de la reserva" },
              facultadIds: {
                type: "array",
                items: { type: "number" },
                description: "IDs de facultades a filtrar",
              },
            },
            required: [
              "fecha",
              "horaInicio",
              "horaFin",
              "capacidad",
              "tipoCapacidad",
              "purpose",
              "facultadIds",
            ],
          },
        },
        {
          name: "applyAvailabilityResults",
          description:
            "Aplica los resultados de disponibilidad obtenidos por el asistente para mostrarlos en la UI.",
          parameters: {
            type: "object",
            properties: {
              formData: { type: "object", properties: {} },
              suggestions: {
                type: "array",
                items: { type: "object", properties: {} },
                description: "Las sugerencias de disponibilidad encontradas por el asistente",
              },
              meta: { type: "object", properties: {} },
              collapseForm: {
                type: "boolean",
                description: "Indica si se deben contraer los filtros de búsqueda",
              },
            },
            required: ["formData", "suggestions", "meta", "collapseForm"],
          },
        },
      ],
      temperature: 0.2,
      maxTokens: 512,
    }

    const response = await fetch(getBackendUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backend copilot endpoint returned error:", errorText)
      return Response.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (error: unknown) {
    console.error("Proxy copilot route error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
