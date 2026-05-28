import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Plus, Trash2 } from "lucide-react"

import type { GroupSummary } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"
import { cn } from "@/lib/utils"

interface GroupSummaryCardProps {
  group: GroupSummary
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
}

export function GroupSummaryCard({
  group,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: GroupSummaryCardProps) {
  const token = resolveGroupColorToken(group.colorIndex)
  const carreras = group.carrerasLabel
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return (
    <Card
      size="sm"
      className={cn(
        "gap-0.5 rounded-3xl border shadow-sm transition-all duration-200 !pt-2.5 !pb-0",
        group.countHorarios === 0 && "opacity-90"
      )}
      style={token.cardStyle}
    >
      <CardHeader className="px-3 pt-2 pb-1">
        <CardTitle className="line-clamp-2 text-[13px] leading-tight">{group.materia}</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-1 px-3 pb-2 text-xs">
        <div className="grid grid-cols-[auto,1fr] items-start gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">Grupo: {group.grupo}</span>

          <span className="font-medium text-foreground">Carreras</span>
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
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddClick(group)
                }}
                aria-label="Agregar horarios"
              >
                <Plus className="size-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            {onEditClick && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditClick(group)
                }}
                aria-label="Editar horarios"
              >
                <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            {onDeleteClick && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteClick(group)
                }}
                aria-label="Eliminar horarios"
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
