"use client"

import { useMemo } from "react"
import { Button, Badge } from "@umss/estilos-base/components"

import { Check, Calendar, Clock, MapPin, AlertCircle, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NormalizedSchedule } from "@/features/scheduling/docentes/domain/types"
import { getDaysOfWeekInRange, isScheduleQualifying } from "../application/filterSchedules"

interface HorariosJustificacionGridProps {
  schedules: NormalizedSchedule[]
  fechaDesde: string
  fechaHasta: string
  selectedIds: number[]
  onToggleSchedule: (id: number) => void
  onSelectAll: (ids: number[]) => void
  onDeselectAll: () => void
}

const DAYS = [
  { day: 1, label: "Lunes" },
  { day: 2, label: "Martes" },
  { day: 3, label: "Miércoles" },
  { day: 4, label: "Jueves" },
  { day: 5, label: "Viernes" },
  { day: 6, label: "Sábado" },
]

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0")
  const m = (min % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}

export function HorariosJustificacionGrid({
  schedules,
  fechaDesde,
  fechaHasta,
  selectedIds,
  onToggleSchedule,
  onSelectAll,
  onDeselectAll,
}: HorariosJustificacionGridProps) {
  const hasDates = Boolean(fechaDesde && fechaHasta)

  // Calcular días de la semana aplicables para el rango
  const applicableDays = useMemo(() => {
    return getDaysOfWeekInRange(fechaDesde, fechaHasta)
  }, [fechaDesde, fechaHasta])

  // Clasificar horarios en aplicables y no aplicables
  const { qualifyingMap, qualifyingIds } = useMemo(() => {
    const qMap = new Map<number, boolean>()
    const qIds: number[] = []

    if (!hasDates) {
      return { qualifyingMap: qMap, qualifyingIds: qIds }
    }

    schedules.forEach((s) => {
      if (s.dbId) {
        const qualifies = isScheduleQualifying(s, fechaDesde, fechaHasta, applicableDays)
        qMap.set(s.dbId, qualifies)
        if (qualifies) {
          qIds.push(s.dbId)
        }
      }
    })

    return { qualifyingMap: qMap, qualifyingIds: qIds }
  }, [schedules, fechaDesde, fechaHasta, applicableDays, hasDates])

  // Organizar horarios por día de la semana
  const schedulesByDay = useMemo(() => {
    const map = new Map<number, NormalizedSchedule[]>()
    DAYS.forEach(({ day }) => map.set(day, []))

    schedules.forEach((s) => {
      const list = map.get(s.day) || []
      list.push(s)
      map.set(s.day, list)
    })

    // Ordenar cada lista por hora de inicio
    DAYS.forEach(({ day }) => {
      const list = map.get(day) || []
      list.sort((a, b) => a.startMin - b.startMin)
      map.set(day, list)
    })

    return map
  }, [schedules])

  const selectedCount = selectedIds.length
  const totalQualifying = qualifyingIds.length

  return (
    <div className="space-y-3">
      {/* Barra de Controles y Estado */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold text-foreground">
            Horarios del Docente para la Justificación
          </span>
          {hasDates && (
            <Badge
              variant={selectedCount > 0 ? "primary" : "outline"}
              className="text-xs font-semibold px-2 py-0.5"
            >
              {selectedCount} de {totalQualifying} seleccionados
            </Badge>
          )}
        </div>

        {hasDates && totalQualifying > 0 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectAll(qualifyingIds)}
              className="text-xs h-8 px-2.5"
            >
              Seleccionar aplicables ({totalQualifying})
            </Button>
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={selectedCount === 0}
              className="text-xs h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Deseleccionar
            </button>
          </div>
        )}
      </div>

      {!hasDates && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>
            Seleccione <strong>Fecha Desde</strong> y <strong>Fecha Hasta</strong> en el formulario
            superior para habilitar la selección de los horarios correspondientes a esos días.
          </span>
        </div>
      )}

      {hasDates && totalQualifying === 0 && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span>
            El docente no tiene horarios programados o vigentes para los días comprendidos entre el{" "}
            <strong>{fechaDesde}</strong> y el <strong>{fechaHasta}</strong>.
          </span>
        </div>
      )}

      {/* Grilla Semanal de Horarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {DAYS.map(({ day, label }) => {
          const daySchedules = schedulesByDay.get(day) || []
          const isDayInDateRange = hasDates && applicableDays.has(day)

          return (
            <div
              key={day}
              className={cn(
                "flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all",
                isDayInDateRange ? "ring-1 ring-primary/20" : "opacity-75"
              )}
            >
              {/* Encabezado del Día */}
              <div
                className={cn(
                  "px-3 py-2 border-b border-border text-xs font-bold flex items-center justify-between",
                  isDayInDateRange
                    ? "bg-primary/5 text-primary"
                    : "bg-muted/40 text-muted-foreground"
                )}
              >
                <span>{label}</span>
                {isDayInDateRange && (
                  <span className="text-[10px] uppercase font-semibold text-primary">En rango</span>
                )}
              </div>

              {/* Lista de Clases del Día */}
              <div className="p-2 space-y-2 flex-1 min-h-[120px]">
                {daySchedules.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-3 text-center text-[11px] text-muted-foreground italic">
                    Sin clases
                  </div>
                ) : (
                  daySchedules.map((schedule) => {
                    const isQualifying = schedule.dbId
                      ? Boolean(qualifyingMap.get(schedule.dbId))
                      : false
                    const isSelected = schedule.dbId ? selectedIds.includes(schedule.dbId) : false

                    return (
                      <div
                        key={schedule.scheduleId}
                        onClick={() => {
                          if (isQualifying && schedule.dbId) {
                            onToggleSchedule(schedule.dbId)
                          }
                        }}
                        className={cn(
                          "relative rounded-lg p-2.5 text-xs transition-all border select-none",
                          !isQualifying &&
                            "opacity-40 bg-muted/20 border-dashed border-border cursor-not-allowed",
                          isQualifying &&
                            !isSelected &&
                            "bg-card border-border hover:border-primary/60 hover:shadow-xs cursor-pointer",
                          isQualifying &&
                            isSelected &&
                            "bg-primary/10 border-primary ring-1 ring-primary/40 text-foreground cursor-pointer shadow-xs"
                        )}
                      >
                        {/* Checkbox / Indicador visual */}
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            <span>
                              {formatMinutes(schedule.startMin)} - {formatMinutes(schedule.endMin)}
                            </span>
                          </div>

                          {isQualifying && (
                            <div
                              className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border bg-background"
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          )}
                        </div>

                        {/* Materia y Grupo */}
                        <div className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                          {schedule.materia}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3 shrink-0" />
                            G: {schedule.grupo}
                          </span>
                          {schedule.ambienteLabel && (
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {schedule.ambienteLabel}
                            </span>
                          )}
                        </div>

                        {/* Vigencia o Estado */}
                        {!isQualifying && (
                          <div className="mt-1.5 text-[10px] text-muted-foreground italic">
                            {!isDayInDateRange ? "Día fuera de rango" : "Fuera de vigencia"}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
