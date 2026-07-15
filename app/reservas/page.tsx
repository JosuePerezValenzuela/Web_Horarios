"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ReservationForm } from "@/features/reservations/ui/ReservationForm"
import { ReservationSuggestions } from "@/features/reservations/ui/ReservationSuggestions"
import { reservationService } from "@/features/reservations/application/reservationService"
import { useAuth } from "@/features/auth/application/useAuth"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/shared/stores/uiStore"

import { toast } from "sonner"
import {
  CalendarClock,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Calendar,
  Clock,
  Users,
  Layers,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Import types
import type {
  CheckAvailabilityRequest,
  Suggestion,
  SearchMeta,
} from "@/features/reservations/domain/reservation.types"

function getTomorrowAndTodayStrings() {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const todayStr = new Date().toISOString().split("T")[0]
  return { tomorrowStr, todayStr }
}

export default function ReservasPage() {
  const { user } = useAuth()

  // 1. FORM STATE
  const [formData, setFormData] = useState<CheckAvailabilityRequest>({
    fecha: new Date().toISOString().split("T")[0],
    horaInicio: "",
    horaFin: "",
    capacidad: 0,
    tipoCapacidad: undefined as unknown as CheckAvailabilityRequest["tipoCapacidad"],
    facultadIds: [], // Empty initially
    userId: user?.sub || "user-001",
    purpose: "",
    campusIds: [],
    take: 6,
    agrupacion: undefined as unknown as CheckAvailabilityRequest["agrupacion"],
  })

  // 2. RESULTS STATE
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isFormCollapsed, setIsFormCollapsed] = useState(false)

  const { copilotSidebarOpen, toggleCopilotSidebar } = useUIStore()

  // Auto-open Copilot sidebar on component mount
  useEffect(() => {
    if (!copilotSidebarOpen) {
      toggleCopilotSidebar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3. QUICK CHIPS HANDLER
  const handleQuickSearch = (chipData: Partial<CheckAvailabilityRequest>) => {
    const { tomorrowStr, todayStr } = getTomorrowAndTodayStrings()

    const baseTargetDate = chipData.fecha === "tomorrow" ? tomorrowStr : todayStr

    const updated = {
      ...formData,
      ...chipData,
      fecha: baseTargetDate,
      facultadIds: chipData.facultadIds || [1],
    }
    setFormData(updated)
    performSearch(updated)
  }

  // 4. SERVICE HANDLER
  const performSearch = async (currentData = formData) => {
    if (currentData.facultadIds.length === 0) {
      toast.error("Por favor, selecciona al menos una facultad para realizar la consulta.")
      return
    }

    setIsLoading(true)
    setHasSearched(true)
    try {
      const res = await reservationService.checkAvailability(currentData)
      setSuggestions(res.sugerencias || [])
      setSearchMeta(res.meta || null)
      setIsFormCollapsed(true) // Automatically collapse form filters to save vertical space
      return res
    } catch (err: unknown) {
      console.error("Error consultando disponibilidad:", err)
      const error = err as { body?: { message?: string | string[] }; message?: string }
      const errorMsg = Array.isArray(error.body?.message)
        ? error.body.message.join(", ")
        : error.body?.message || error.message || "Error inesperado"
      toast.error(`Error al consultar disponibilidad: ${errorMsg}`)
      setSuggestions([])
      setSearchMeta(null)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReservation = async (suggestion: Suggestion) => {
    setIsConfirming(true)
    try {
      // Here we would call the persist/confirm reservation endpoint
      // Mocking a successful confirmation for the pending reservation suggestion
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-green-700 dark:text-green-400">
            Reserva Confirmada Exitosamente
          </span>
          <span className="text-[10px] text-gray-500">
            Ambiente: {suggestion.nombre} - {suggestion.bloqueNombre}
          </span>
          <span className="text-[9px] text-gray-400">ID: {suggestion.reservationId}</span>
        </div>,
        { duration: 5000 }
      )
    } catch {
      toast.error("Error al confirmar la reservación.")
    } finally {
      setIsConfirming(false)
    }
  }

  // 4. NATIVE COPILOT INTEGRATION: STATE SYNC & ACTION LISTENERS

  // Keep current search and suggestion state exposed globally on window for the custom sidebar
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__copilotState = {
      formData,
      suggestions,
      isFormCollapsed,
    }
  }, [formData, suggestions, isFormCollapsed])

  // Listen to custom window events triggered by the custom copilot sidebar
  useEffect(() => {
    const handleCopilotAction = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; arguments: Record<string, unknown> }>
      const { name } = customEvent.detail
      const args = customEvent.detail.arguments as Record<string, unknown> & {
        fecha?: string
        horaInicio?: string
        horaFin?: string
        capacidad?: number
        tipoCapacidad?: string
        purpose?: string
        facultadIds?: number[]
        suggestions?: Suggestion[]
        formData?: Partial<CheckAvailabilityRequest>
        collapseForm?: boolean
      }

      if (name === "prefillSearchForm") {
        setFormData((prev) => {
          const nextData = { ...prev }
          if (args.fecha) nextData.fecha = args.fecha
          if (args.horaInicio) nextData.horaInicio = args.horaInicio
          if (args.horaFin) nextData.horaFin = args.horaFin
          if (args.capacidad) nextData.capacidad = args.capacidad
          if (args.tipoCapacidad) {
            nextData.tipoCapacidad = args.tipoCapacidad as CheckAvailabilityRequest["tipoCapacidad"]
          }
          if (args.purpose !== undefined) nextData.purpose = args.purpose
          if (args.facultadIds && args.facultadIds.length > 0) {
            nextData.facultadIds = args.facultadIds
          }

          return nextData
        })
      } else if (name === "applyAvailabilityResults") {
        const suggestionsList = (args.suggestions || []) as Suggestion[]
        const formDataToMerge = (args.formData || {}) as CheckAvailabilityRequest

        if (suggestionsList) {
          setSuggestions(suggestionsList)
        }
        if (formDataToMerge) {
          setFormData((prev) => ({ ...prev, ...formDataToMerge }))
        }
        if (args.collapseForm) {
          setIsFormCollapsed(true)
        }
        setHasSearched(true)
      }
    }

    window.addEventListener("copilot-action", handleCopilotAction)
    return () => window.removeEventListener("copilot-action", handleCopilotAction)
  }, [])

  return (
    <AppLayout breadcrumbs={[{ name: "Reservar Ambientes" }]}>
      <div className="flex flex-col gap-4 max-w-5xl mx-auto py-1">
        {/* Header compactado */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-blue-400">
              <CalendarClock className="h-4 w-4 stroke-[2]" />
            </div>
            <span className="font-bold text-xs tracking-wide uppercase text-umss-dark-blue dark:text-gray-100">
              Reservar Ambientes
            </span>
          </div>
          <span className="hidden sm:inline text-[10px] text-gray-400 font-medium">
            Consulta aulas en tiempo real con el Asistente AI.
          </span>
        </div>

        {/* Formulario o Barra Compacta */}
        <div className="w-full">
          {isFormCollapsed ? (
            <div className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-150 dark:border-[#2e2e2e] p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-xs text-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-gray-600 dark:text-gray-300 font-medium">
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-primary dark:text-blue-400 shrink-0" />{" "}
                  {formData.fecha
                    ? format(new Date(formData.fecha + "T12:00:00"), "dd MMM yyyy", { locale: es })
                    : ""}
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-[#2e2e2e]">|</span>
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  <Clock className="w-3.5 h-3.5 text-primary dark:text-blue-400 shrink-0" />{" "}
                  {formData.horaInicio || "--:--"} - {formData.horaFin || "--:--"}
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-[#2e2e2e]">|</span>
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  <Users className="w-3.5 h-3.5 text-primary dark:text-blue-400 shrink-0" />{" "}
                  {formData.capacidad || 0} Alumnos (
                  {formData.tipoCapacidad === "total"
                    ? "Clase"
                    : formData.tipoCapacidad === "examen"
                      ? "Examen"
                      : "Sin tipo"}
                  )
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-[#2e2e2e]">|</span>
                <span className="flex items-center gap-1 text-[11px] shrink-0">
                  <Layers className="w-3.5 h-3.5 text-primary dark:text-blue-400 shrink-0" />{" "}
                  {formData.agrupacion === "bloque"
                    ? "Conjuntos"
                    : formData.agrupacion === "individual"
                      ? "Individuales"
                      : "Sin agrupar"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFormCollapsed(false)}
                className="h-8 text-[10px] font-bold uppercase tracking-wider px-3 border-border hover:bg-gray-50/50 cursor-pointer w-full sm:w-auto text-center shrink-0"
              >
                Modificar Consulta
              </Button>
            </div>
          ) : (
            <ReservationForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => performSearch()}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Resultados u Onboarding */}
        {hasSearched ? (
          <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-roboto text-sm font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight pl-1 border-l-3 border-[#002855] dark:border-blue-400 py-0.5">
              Ambientes Disponibles Recomendados
            </h3>

            <ReservationSuggestions
              suggestions={suggestions}
              meta={searchMeta || undefined}
              onSelect={handleConfirmReservation}
              isSubmitting={isConfirming}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card 1: Guía de uso */}
            <div className="bg-white/80 dark:bg-[#242424]/80 backdrop-blur-sm border border-border p-5 rounded-3xl flex flex-col gap-4">
              <h4 className="text-xs font-bold text-umss-dark-blue dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary dark:text-blue-400" /> ¿Cómo empezar?
              </h4>
              <ul className="text-xs space-y-3.5 text-gray-600 dark:text-gray-400">
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary dark:text-blue-400">
                    1
                  </span>
                  <span>
                    Ingresa la <b>fecha, hora y capacidad</b> deseada en los campos superiores.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary dark:text-blue-400">
                    2
                  </span>
                  <span>
                    Selecciona una o más <b>facultades</b> universitarias del catálogo.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary dark:text-blue-400">
                    3
                  </span>
                  <span>
                    Consulta de forma inmediata para visualizar las aulas libres recomendadas.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card 2: Consultas rápidas (Chips interactivos) */}
            <div className="bg-white/80 dark:bg-[#242424]/80 backdrop-blur-sm border border-border p-5 rounded-3xl flex flex-col gap-4 md:col-span-1">
              <h4 className="text-xs font-bold text-umss-dark-blue dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary dark:text-blue-400" /> Pruebas Rápidas
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Haz clic en cualquier atajo para simular búsquedas realistas de forma inmediata:
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() =>
                    handleQuickSearch({
                      fecha: "tomorrow",
                      horaInicio: "09:45",
                      horaFin: "11:15",
                      capacidad: 60,
                      facultadIds: [1],
                      purpose: "Clase de Química General",
                    })
                  }
                  className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/35 hover:bg-primary/5 dark:hover:bg-blue-950/20 hover:border-primary/30 border border-border transition-all duration-300 group flex justify-between items-center cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400">
                      Clase de Química (Mañana)
                    </span>
                    <span className="text-[10px] text-gray-400">09:45 - 60 Alumnos - Ciencias</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 group-hover:animate-pulse shrink-0" />
                </button>

                <button
                  onClick={() =>
                    handleQuickSearch({
                      fecha: "today",
                      horaInicio: "14:00",
                      horaFin: "16:00",
                      capacidad: 35,
                      tipoCapacidad: "examen",
                      facultadIds: [1],
                      purpose: "Examen de Cálculo II",
                    })
                  }
                  className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/35 hover:bg-primary/5 dark:hover:bg-blue-950/20 hover:border-primary/30 border border-border transition-all duration-300 group flex justify-between items-center cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400">
                      Examen Final (Modo Examen)
                    </span>
                    <span className="text-[10px] text-gray-400">14:00 - 35 Alumnos - Ciencias</span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 group-hover:animate-pulse shrink-0" />
                </button>

                <button
                  onClick={() =>
                    handleQuickSearch({
                      fecha: "today",
                      horaInicio: "10:00",
                      horaFin: "12:00",
                      capacidad: 20,
                      facultadIds: [3],
                      purpose: "Defensa de Tesis",
                    })
                  }
                  className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-slate-900/35 hover:bg-primary/5 dark:hover:bg-blue-950/20 hover:border-primary/30 border border-border transition-all duration-300 group flex justify-between items-center cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 truncate">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400">
                      Defensa de Tesis (Humanidades)
                    </span>
                    <span className="text-[10px] text-gray-400">
                      10:00 - 20 Alumnos - Humanidades
                    </span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary dark:group-hover:text-blue-400 group-hover:animate-pulse shrink-0" />
                </button>
              </div>
            </div>

            {/* Card 3: Tips del Copilot AI */}
            <div className="bg-white/80 dark:bg-[#242424]/80 backdrop-blur-sm border border-border p-5 rounded-3xl flex flex-col gap-4">
              <h4 className="text-xs font-bold text-umss-dark-blue dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary dark:text-blue-400" /> Asistente de IA
                (Copilot)
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Presiona el botón de <b>Copilot AI</b> en la cabecera superior derecha para abrir el
                chat inteligente y prueba diciéndole:
              </p>
              <div className="flex flex-col gap-2 text-[10.5px] italic text-gray-600 dark:text-gray-400">
                <div className="p-2.5 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-border">
                  &quot;Quiero reservar un aula para 50 alumnos mañana a las 8 en Ciencias y
                  Tecnología&quot;
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-border">
                  &quot;Pre-llena el formulario para una defensa de tesis de 10 a 12&quot;
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-border">
                  &quot;Busca disponibilidad para el examen de cálculo de esta tarde&quot;
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
