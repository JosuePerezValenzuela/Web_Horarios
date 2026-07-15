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

    // 1. REST Info Handshake Check (POST method: "info")
    if (body.method === "info") {
      return Response.json({
        actions: {},
        agents: {
          default: {
            id: "default",
            name: "default",
            description: "Asistente de Horarios",
          },
        },
      })
    }

    // 2. GQL Handshake / Info GQL Check
    if (
      body.query &&
      (body.query.includes("info") ||
        body.query.includes("actions") ||
        body.query.includes("agents"))
    ) {
      return Response.json({
        data: {
          info: {
            actions: [],
            agents: [
              {
                id: "default",
                name: "default",
                description: "Asistente de Horarios",
              },
            ],
          },
        },
      })
    }

    // 2. PARSE MESSAGES & PAYLOAD (Accept both GQL Grapheme schema and CopilotKit REST Envelope)
    const isRESTAgentRun = body.method === "agent/run"
    const clientBody = isRESTAgentRun ? body.body : body

    const clientMessages = clientBody?.messages || []

    // Intercept empty messages array handshake/sync to avoid backend 400
    if (clientMessages.length === 0) {
      if (isRESTAgentRun) {
        return Response.json({
          threadId: body.body?.threadId,
          runId: body.body?.runId,
          messages: [],
          status: "completed",
        })
      }
      return Response.json({
        data: {
          runAgent: {
            messages: [],
            status: "completed",
          },
        },
      })
    }

    // Parse the context array from the client into a flat frontendState object
    const contextArray = (clientBody?.context || []) as { value?: string; description?: string }[]
    let frontendState: Record<string, unknown> = {}
    contextArray.forEach((item) => {
      try {
        if (item.value) {
          const parsed = JSON.parse(item.value) as Record<string, unknown>
          frontendState = { ...frontendState, ...parsed }
        }
      } catch {
        frontendState[item.description || "context"] = item.value
      }
    })

    // Reconstruct the flat payload expected by the custom backend microservice
    const backendPayload = {
      messages: clientMessages,
      frontendState,
      frontendActions: clientBody?.tools || [],
      temperature: body.temperature ?? 0.2,
      maxTokens: body.maxTokens ?? 512,
    }

    // Call the custom backend endpoint (port 3005)
    const response = await fetch(getBackendUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Backend microservice error response:", errorText)
      return Response.json({ error: errorText }, { status: response.status })
    }

    const backendData = await response.json()

    // 3. MAP CUSTOM BACKEND RESPONSE (finalResponse, toolExecutions) TO COPILOTKIT MESSAGES
    const returnMessages: Record<string, unknown>[] = []
    const timestamp = Date.now()

    // Map finalResponse.content to an assistant message
    const assistantText =
      backendData.finalResponse?.content ||
      (typeof backendData.finalResponse === "string" ? backendData.finalResponse : "")

    if (assistantText) {
      returnMessages.push({
        id: `msg_text_${timestamp}`,
        role: "assistant",
        content: assistantText,
      })
    }

    interface ToolExecution {
      toolCall?: {
        id?: string
        name: string
        arguments?: Record<string, unknown>
      }
      result?: {
        sugerencias?: Record<string, unknown>[]
        meta?: Record<string, unknown>
      }
    }

    // Map toolExecutions according to the dynamic response-action contract
    const toolExecutions = (backendData.toolExecutions || []) as ToolExecution[]

    // Find latest check-availability tool call execution
    const availabilityExecution = toolExecutions
      .slice()
      .reverse()
      .find((exec) => exec.toolCall?.name === "check-availability")

    const clientToolCalls: Record<string, unknown>[] = []

    if (availabilityExecution) {
      const toolCallId = availabilityExecution.toolCall?.id || `call_${timestamp}`
      const checkArgs = availabilityExecution.toolCall?.arguments || {}
      const resultData = availabilityExecution.result || {}

      // A. prefillSearchForm arguments
      const prefillArgs = checkArgs

      // B. applyAvailabilityResults arguments
      const applyArgs = {
        formData: checkArgs,
        suggestions: resultData.sugerencias || [],
        meta: resultData.meta || {
          mostrados: (resultData.sugerencias || []).length,
          take: 5,
          tolerancia: null,
          agrupacion: "bloque",
        },
        collapseForm: true,
      }

      // Add prefill and apply tool calls to clientToolCalls
      clientToolCalls.push(
        {
          id: `${toolCallId}_prefill`,
          type: "function",
          function: {
            name: "prefillSearchForm",
            arguments: JSON.stringify(prefillArgs),
          },
        },
        {
          id: `${toolCallId}_apply`,
          type: "function",
          function: {
            name: "applyAvailabilityResults",
            arguments: JSON.stringify(applyArgs),
          },
        }
      )
    }

    // Map any other tool execution directly (fallback)
    toolExecutions.forEach((exec, idx: number) => {
      const toolCall = exec.toolCall
      if (toolCall && toolCall.name !== "check-availability") {
        const otherArgs =
          typeof toolCall.arguments === "string"
            ? toolCall.arguments
            : JSON.stringify(toolCall.arguments || {})

        clientToolCalls.push({
          id: toolCall.id || `call_${timestamp}_other_${idx}`,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: otherArgs,
          },
        })
      }
    })

    if (clientToolCalls.length > 0) {
      returnMessages.push({
        id: `msg_tools_${timestamp}`,
        role: "assistant",
        content: "",
        toolCalls: clientToolCalls,
        tool_calls: clientToolCalls,
      })
    }

    // 4. RETURN RESPONSE WRAPPED IN CLIENT'S EXPECTED FORMAT
    if (isRESTAgentRun) {
      return Response.json({
        threadId: body.body?.threadId,
        runId: body.body?.runId,
        messages: returnMessages,
        status: "completed",
      })
    }

    return Response.json({
      data: {
        runAgent: {
          messages: returnMessages,
          status: "completed",
        },
      },
    })
  } catch (error: unknown) {
    console.error("Proxy POST error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

export const GET = async () => {
  try {
    // Rest info handshake
    return Response.json({
      actions: {},
      agents: {
        default: {
          id: "default",
          name: "default",
          description: "Asistente de Horarios",
        },
      },
    })
  } catch (error: unknown) {
    console.error("Proxy GET error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
