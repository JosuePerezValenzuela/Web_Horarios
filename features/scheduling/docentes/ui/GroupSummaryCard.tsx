import {
  Button,
  UmssCard as Card,
  UmssCardContent as CardContent,
  UmssCardHeader as CardHeader,
  UmssCardTitle as CardTitle,
} from "@umss/estilos-base/components"
import { Pencil, Plus, Trash2 } from "lucide-react"

import type { GroupSummary, NormalizedSchedule } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"
import { cn } from "@/lib/utils"

interface GroupSummaryCardProps {
  group: GroupSummary
  schedules: NormalizedSchedule[]
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
}

export function GroupSummaryCard({
  group,
  schedules,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: GroupSummaryCardProps) {
  const token = resolveGroupColorToken(group.colorIndex)
  const carreras = group.carrerasLabel
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  // Calculate actual total minutes for this group from active schedules
  const groupSchedules = schedules.filter((s) => s.groupKey === group.groupKey)
  const totalMinutes = groupSchedules.reduce((sum, s) => sum + s.durationMin, 0)

  // Convert total minutes to workload hours: totalMinutes / (minutos_carga_horaria_especifico || 90)
  const equivalentMin = group.minutos_carga_horaria_especifico || 90
  const calculatedCargaRaw = totalMinutes / equivalentMin

  // Format to 2 decimal places maximum, removing trailing zeros
  const calculatedCarga = parseFloat(calculatedCargaRaw.toFixed(2))

  // Flag card if calculated workload hours do not match assigned workload hours
  const isWorkloadMismatched =
    group.carga_horaria !== undefined &&
    group.carga_horaria !== null &&
    calculatedCarga !== group.carga_horaria

  return (
    <Card
      className={cn(
        "gap-0.5 rounded-3xl border shadow-sm transition-all duration-200 !pt-2.5 !pb-0",
        group.countHorarios === 0 && "opacity-90",
        isWorkloadMismatched &&
          "!border-amber-500 !border-2 shadow-[0_0_12px_rgba(245,158,11,0.25)] dark:shadow-none animate-pulse-slow"
      )}
      style={token.cardStyle}
    >
      <CardHeader className="px-3 pt-2 pb-1">
        <CardTitle className="line-clamp-2 text-[13px] leading-tight font-bold flex flex-wrap items-center gap-1">
          <span>{group.materia}</span>
          {isWorkloadMismatched && (
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-300 border border-amber-300/40 animate-bounce-slow">
              ⚠️ Carga Incompleta
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-1 px-3 pb-2 text-xs">
        <div className="grid grid-cols-[auto,1fr] items-start gap-x-2 gap-y-0.5">
          <span className="font-semibold text-foreground">Grupo: {group.grupo}</span>

          <span className="font-semibold text-foreground">Carreras:</span>
          <div className="space-y-0.5 text-muted-foreground">
            {carreras.length > 0 ? (
              carreras.map((carrera, index) => (
                <p key={`${group.groupKey}-carrera-${index + 1}`} className="leading-tight">
                  {carrera}
                </p>
              ))
            ) : (
              <p className="leading-tight">Sin carreras</p>
            )}
          </div>

          {/* Carga Horaria Calculada */}
          <span className="font-semibold text-foreground">Carga Horaria Semanal:</span>
          <span
            className={cn(
              "text-muted-foreground",
              isWorkloadMismatched && "text-amber-700 dark:text-amber-400 font-semibold"
            )}
          >
            {calculatedCarga}
          </span>

          {/* Carga Horaria layout values */}
          {group.carga_horaria !== undefined && group.carga_horaria !== null && (
            <>
              <span className="font-semibold text-foreground">
                Carga Horaria Asignada al docente:
              </span>
              <span className="text-muted-foreground">{group.carga_horaria}</span>
            </>
          )}

          {group.minutos_carga_horaria_especifico !== undefined &&
            group.minutos_carga_horaria_especifico !== null && (
              <>
                <span className="font-semibold text-foreground">
                  Equivalente de una carga horaria:
                </span>
                <span className="text-muted-foreground">
                  {group.minutos_carga_horaria_especifico} min
                </span>
              </>
            )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none"
            )}
            style={token.badgeStyle}
          >
            Horarios: {group.countHorarios}
          </span>
          <div className="flex justify-end gap-0.5">
            {onAddClick && (
              <Button
                variant="secondary"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddClick(group)
                }}
                aria-label="Agregar horarios"
                className="h-7 w-7 p-0"
              >
                <Plus className="size-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            {onEditClick && (
              <Button
                variant="secondary"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditClick(group)
                }}
                aria-label="Editar horarios"
                className="h-7 w-7 p-0"
              >
                <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            {onDeleteClick && (
              <Button
                variant="secondary"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteClick(group)
                }}
                aria-label="Eliminar horarios"
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/20"
              >
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
