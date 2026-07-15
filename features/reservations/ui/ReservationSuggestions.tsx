"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, CheckCircle, ArrowRight, LayoutGrid } from "lucide-react"

// Import types
import type { Suggestion, SearchMeta } from "../domain/reservation.types"

interface ReservationSuggestionsProps {
  suggestions: Suggestion[]
  meta?: SearchMeta
  onSelect: (suggestion: Suggestion) => void
  isSubmitting?: boolean
}

export function ReservationSuggestions({
  suggestions,
  meta,
  onSelect,
  isSubmitting = false,
}: ReservationSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 dark:border-[#2e2e2e] rounded-2xl p-6 text-center text-gray-400 dark:text-slate-600 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300">
        <ShieldAlert className="w-8 h-8 text-gray-300 dark:text-slate-700 animate-pulse" />
        <span className="font-bold text-xs text-gray-600 dark:text-gray-400">
          No se encontraron ambientes disponibles
        </span>
        <p className="text-[10px] max-w-xs leading-relaxed text-gray-400 dark:text-slate-500">
          Intenta cambiando el tipo de agrupación o ajustando la fecha y horas del filtro.
        </p>
      </div>
    )
  }

  // Cap suggestions at 6 for layout stability
  const visibleSuggestions = suggestions.slice(0, 6)

  return (
    <div className="flex flex-col gap-3.5 animate-in fade-in duration-300">
      {/* Mini Resumen de Metadatos */}
      {meta && (
        <div className="flex justify-between items-center bg-gray-50/70 dark:bg-slate-900/25 border border-border px-3 py-1.5 rounded-xl text-[9px] uppercase font-bold tracking-wider text-gray-400">
          <span>Ambientes evaluados: {meta.total}</span>
          <span>
            Mostrando: {visibleSuggestions.length} de {meta.mostrados} sugerencias
          </span>
        </div>
      )}

      {/* Grid de Sugerencias - 3 columnas en desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visibleSuggestions.map((sug) => {
          return (
            <Card
              key={sug.reservationId}
              className="bg-white/90 dark:bg-[#1e1e1e]/90 border border-gray-150 dark:border-[#2e2e2e] hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-300 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-3.5 pb-2">
                <div className="flex justify-between items-start gap-1">
                  <div className="flex flex-col gap-0.5 truncate flex-1">
                    <CardTitle
                      className="text-xs font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight truncate"
                      title={sug.tipoAmbienteNombre || "Ambiente"}
                    >
                      {sug.environments.length > 1
                        ? `Conjunto de ${sug.tipoAmbienteNombre || "Ambiente"}s`
                        : sug.tipoAmbienteNombre || "Ambiente"}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[8px] uppercase tracking-wider font-extrabold flex items-center gap-1 shrink-0 border-green-500/30 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/10 px-1.5 py-0"
                  >
                    <CheckCircle className="w-2.5 h-2.5" /> Disponible
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3.5 py-1.5 flex flex-col gap-2.5 text-[10px] text-gray-600 dark:text-gray-400">
                {/* ID de Reserva */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    ID de Reserva
                  </span>
                  <span className="font-mono text-[9.5px] bg-gray-50 dark:bg-slate-900/50 border border-border px-2 py-1 rounded-lg break-all">
                    {sug.reservationId}
                  </span>
                </div>

                {/* Resumen de Ambientes */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <LayoutGrid className="w-3.5 h-3.5 text-gray-400" /> Ambientes Asignados (
                    {sug.environments.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto pr-0.5">
                    {sug.environments.map((env) => (
                      <Badge
                        key={env.id}
                        variant="secondary"
                        className="text-[9px] font-mono font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg px-2 py-0.5 border border-border"
                      >
                        ID: {env.id}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-3.5 pt-2 border-t border-border flex justify-end items-center bg-gray-50/20 dark:bg-slate-900/5">
                <Button
                  onClick={() => onSelect(sug)}
                  disabled={isSubmitting}
                  className="umss-btn-primary text-[9px] font-bold tracking-wide uppercase px-2.5 h-7 cursor-pointer flex items-center gap-1 transition-transform active:scale-95 shadow-none"
                >
                  Reservar <ArrowRight className="w-2.5 h-2.5" />
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
