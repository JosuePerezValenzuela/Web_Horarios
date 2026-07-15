"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/shared/stores/uiStore"

interface Message {
  role: "user" | "assistant"
  content: string
}

const LOADING_MESSAGES = [
  "Consultando Infraestructura...",
  "Consultando horarios de clases...",
  "Consultando reservas...",
  "Analizando respuesta...",
]

export function CustomCopilotSidebar() {
  const { toggleCopilotSidebar } = useUIStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu Asistente de Reservas de la UMSS. Puedo ayudarte a buscar aulas disponibles, pre-llenar los datos de tu consulta o resolver dudas en lenguaje natural. ¿Qué te gustaría consultar hoy?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length)
      }, 1800)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLoading])

  // Auto-scroll to the bottom of the message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessageContent = input.trim()
    setInput("")

    // Add user message to state
    const updatedMessages = [...messages, { role: "user", content: userMessageContent } as Message]
    setMessages(updatedMessages)
    setLoadingStep(0)
    setIsLoading(true)

    try {
      // Fetch current state from window global object
      const currentUiState = (window as unknown as Record<string, unknown>).__copilotState || {
        formData: {},
        suggestions: [],
        isFormCollapsed: false,
      }

      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          frontendState: currentUiState,
        }),
      })

      if (!response.ok) {
        throw new Error("Error en la comunicación con el asistente de IA.")
      }

      const data = await response.json()

      // 1. Add assistant response message
      const assistantResponseText =
        data.finalResponse?.content ||
        (typeof data.finalResponse === "string" ? data.finalResponse : "") ||
        "No he podido procesar tu solicitud."

      setMessages((prev) => [...prev, { role: "assistant", content: assistantResponseText }])

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

      // 2. Map and dispatch check-availability actions
      const availabilityExecution = ((data.toolExecutions as ToolExecution[]) || [])
        .slice()
        .reverse()
        .find((exec) => exec.toolCall?.name === "check-availability")

      if (availabilityExecution) {
        const checkArgs = availabilityExecution.toolCall?.arguments || {}
        const resultData = availabilityExecution.result || {}

        // Format arguments for prefillSearchForm
        const prefillArgs = checkArgs

        // Format arguments for applyAvailabilityResults
        const applyArgs = {
          formData: checkArgs,
          suggestions: resultData.sugerencias || [],
          meta: resultData.meta || null,
          collapseForm: true,
        }

        // Dispatch events sequentially to the page listener
        window.dispatchEvent(
          new CustomEvent("copilot-action", {
            detail: {
              name: "prefillSearchForm",
              arguments: prefillArgs,
            },
          })
        )

        window.dispatchEvent(
          new CustomEvent("copilot-action", {
            detail: {
              name: "applyAvailabilityResults",
              arguments: applyArgs,
            },
          })
        )
      }
    } catch (error) {
      console.error("Error sending copilot message:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Lo siento, ha ocurrido un error al intentar conectarme con el asistente.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121212] relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#001B47] text-white shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Bot className="h-4 w-4 text-blue-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-roboto font-bold text-xs uppercase tracking-wide">
              Copilot Académico
            </span>
            <span className="text-[9px] text-blue-200">Asistente de Reservas</span>
          </div>
        </div>
        <button
          onClick={toggleCopilotSidebar}
          className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        {messages.map((msg, index) => {
          const isAssistant = msg.role === "assistant"
          return (
            <div
              key={index}
              className={`flex gap-2.5 max-w-[85%] ${
                isAssistant ? "self-start" : "self-end flex-row-reverse"
              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-bold ${
                  isAssistant
                    ? "bg-blue-50 dark:bg-slate-800 text-[#002855] dark:text-blue-300 border border-border"
                    : "bg-[#002855] text-white"
                }`}
              >
                {isAssistant ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  isAssistant
                    ? "bg-gray-100 dark:bg-[#202020] text-gray-800 dark:text-gray-200 rounded-tl-xs border border-border/45"
                    : "bg-[#002855] text-white rounded-tr-xs"
                }`}
              >
                <div className="whitespace-pre-line font-medium">{msg.content}</div>
              </div>
            </div>
          )
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 max-w-[80%] self-start animate-pulse">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-slate-800 text-[#002855] dark:text-blue-300 border border-border">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 bg-gray-100 dark:bg-[#202020] text-gray-400 dark:text-gray-500 rounded-2xl rounded-tl-xs border border-border/45 flex items-center gap-1.5 text-xs">
              <Loader2 className="w-3 h-3 animate-spin text-[#002855] dark:text-blue-400" />
              <span>{LOADING_MESSAGES[loadingStep]}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Footer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border bg-gray-50 dark:bg-[#1a1a1a]/40 shrink-0"
      >
        <div className="flex items-center gap-2 bg-white dark:bg-[#242424] border border-border rounded-xl px-2.5 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/75 py-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-7 w-7 rounded-lg bg-[#002855] hover:bg-[#001B47] text-white shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </form>
    </div>
  )
}
