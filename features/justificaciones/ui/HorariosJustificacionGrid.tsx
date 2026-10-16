"use client"

import { useMemo } from "react"
import { Button, Badge } from "@umss/estilos-base/components"

import {
  Check,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Users,
  Laptop,
  Layers,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NormalizedSchedule, GroupSummary } from "@/features/scheduling/docentes/domain/types"
import {
  getDaysOfWeekInRange,
  clusterSchedules,
  type HorarioCluster,
} from "../application/filterSchedules"

interface HorariosJustificacionGridProps {
  schedules: NormalizedSchedule[]
  groups?: GroupSummary[]
  fechaDesde: string
  fechaHasta: string
  selectedIds: number[]
  onToggleCluster: (cluster: HorarioCluster) => void
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
  groups,
  fechaDesde,
  fechaHasta,
  selectedIds,
  onToggleCluster,
  onSelectAll,
  onDeselectAll,
}: HorariosJustificacionGridProps) {
  const hasDates = Boolean(fechaDesde && fechaHasta)

  // Calcular días de la semana aplicables para el rango
  const applicableDays = useMemo(() => {
    return getDaysOfWeekInRange(fechaDesde, fechaHasta)
  }, [fechaDesde, fechaHasta])

  // Agrupar horarios: primario + dependientes cuentan como un solo cluster
  const clusters = useMemo(() => {
    return clusterSchedules(schedules, groups, fechaDesde, fechaHasta, applicableDays)
  }, [schedules, groups, fechaDesde, fechaHasta, applicableDays])

  // Filtrar clusters que califican dentro del rango y vigencia
  const qualifyingClusters = useMemo(() => {
    return clusters.filter((c) => c.isQualifying)
  }, [clusters])

  // Todos los dbIds de los clusters que califican
  const qualifyingDbIds = useMemo(() => {
    return Array.from(new Set(qualifyingClusters.flatMap((c) => c.dbIds)))
  }, [qualifyingClusters])

  // Clusters actualmente seleccionados (un cluster está seleccionado si todos sus dbIds están en selectedIds)
  const selectedClusters = useMemo(() => {
    return qualifyingClusters.filter(
      (c) => c.dbIds.length > 0 && c.dbIds.every((id) => selectedIds.includes(id))
    )
  }, [qualifyingClusters, selectedIds])

  // Organizar clusters por día de la semana
  const clustersByDay = useMemo(() => {
    const map = new Map<number, HorarioCluster[]>()
    DAYS.forEach(({ day }) => map.set(day, []))

    clusters.forEach((c) => {
      const list = map.get(c.day) || []
      list.push(c)
      map.set(c.day, list)
    })

    // Ordenar cada lista por hora de inicio
    DAYS.forEach(({ day }) => {
      const list = map.get(day) || []
      list.sort((a, b) => a.startMin - b.startMin)
      map.set(day, list)
    })

    return map
  }, [clusters])

  const selectedCount = selectedClusters.length
  const totalQualifying = qualifyingClusters.length

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
              onClick={() => onSelectAll(qualifyingDbIds)}
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

      {/* Grilla Semanal de Horarios Agrupados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {DAYS.map(({ day, label }) => {
          const dayClusters = clustersByDay.get(day) || []
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
                {dayClusters.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-3 text-center text-[11px] text-muted-foreground italic">
                    Sin clases
                  </div>
                ) : (
                  dayClusters.map((cluster) => {
                    const isSelected =
                      cluster.dbIds.length > 0 &&
                      cluster.dbIds.every((id) => selectedIds.includes(id))

                    return (
                      <div
                        key={cluster.clusterKey}
                        onClick={() => {
                          if (cluster.isQualifying && cluster.dbIds.length > 0) {
                            onToggleCluster(cluster)
                          }
                        }}
                        className={cn(
                          "relative rounded-lg p-2.5 text-xs transition-all border select-none",
                          !cluster.isQualifying &&
                            "opacity-40 bg-muted/20 border-dashed border-border cursor-not-allowed",
                          cluster.isQualifying &&
                            !isSelected &&
                            "bg-card border-border hover:border-primary/60 hover:shadow-xs cursor-pointer",
                          cluster.isQualifying &&
                            isSelected &&
                            "bg-primary/10 border-primary ring-1 ring-primary/40 text-foreground cursor-pointer shadow-xs"
                        )}
                      >
                        {/* Checkbox / Indicador visual */}
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            <span>
                              {formatMinutes(cluster.startMin)} - {formatMinutes(cluster.endMin)}
                            </span>
                          </div>

                          {cluster.isQualifying && (
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

                        {/* Materia y Badges */}
                        <div className="space-y-1.5">
                          <div className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                            {cluster.materia}
                          </div>

                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            {cluster.hasDependents && (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 text-white dark:bg-blue-600 dark:text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs">
                                  <Layers className="w-2.5 h-2.5" />
                                  Principal
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 text-violet-900 border border-violet-300/80 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700/80 px-2 py-0.5 text-[9px] font-bold shadow-2xs">
                                  <Link2 className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400 stroke-[2.5]" />
                                  {cluster.dependentGrupos.length === 1
                                    ? "1 vinculado"
                                    : `${cluster.dependentGrupos.length} vinculados`}
                                </span>
                              </>
                            )}
                            {cluster.isVirtual && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                <Laptop className="w-2.5 h-2.5" />
                                Virtual
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Grupo(s) y Ambiente */}
                        <div className="mt-2 flex flex-col gap-1.5 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Grupo Principal */}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md border text-[11px]",
                                cluster.hasDependents
                                  ? "bg-blue-50 text-blue-900 border-blue-200/90 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/80"
                                  : "bg-muted/50 text-foreground border-border/60"
                              )}
                            >
                              <Users className="w-3 h-3 shrink-0 text-primary" />
                              <span>G: {cluster.primaryGrupo}</span>
                              {cluster.hasDependents && (
                                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                                  (Principal)
                                </span>
                              )}
                            </span>

                            {/* Grupos Vinculados / Dependientes */}
                            {cluster.hasDependents &&
                              cluster.dependentGrupos.map((depGrupo) => (
                                <span
                                  key={depGrupo}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-violet-100 text-violet-900 border border-violet-300 shadow-2xs dark:bg-violet-900/60 dark:text-violet-100 dark:border-violet-600/80"
                                  title={`Grupo ${depGrupo} vinculado al grupo principal ${cluster.primaryGrupo}`}
                                >
                                  <Link2 className="w-3 h-3 text-violet-600 dark:text-violet-300 stroke-[2.5]" />
                                  <span>G: {depGrupo}</span>
                                  <span className="text-[9px] font-extrabold uppercase text-violet-700 dark:text-violet-300">
                                    (Vinculado)
                                  </span>
                                </span>
                              ))}
                          </div>

                          {cluster.ambienteLabel && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cluster.ambienteLabel}</span>
                            </div>
                          )}
                        </div>

                        {/* Vigencia o Estado */}
                        {!cluster.isQualifying && (
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
