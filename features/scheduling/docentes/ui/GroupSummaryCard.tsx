import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { GroupSummary } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"
import { cn } from "@/lib/utils"

interface GroupSummaryCardProps {
  group: GroupSummary
}

export function GroupSummaryCard({ group }: GroupSummaryCardProps) {
  const token = resolveGroupColorToken(group.colorIndex)
  const carreras = group.carrerasLabel
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const estadoLabel = `${group.estado.replace("Horarios", "horarios")} - ${group.countHorarios}`

  return (
    <Card
      size="sm"
      className={cn(
        "gap-0.5 rounded-3xl border shadow-sm",
        group.countHorarios === 0 && "opacity-90"
      )}
      style={token.cardStyle}
    >
      <CardHeader className="px-3 pt-2 pb-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-[13px] leading-tight">{group.materia}</CardTitle>
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none"
            )}
            style={token.badgeStyle}
          >
            {estadoLabel}
          </span>
        </div>
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
      </CardContent>
    </Card>
  )
}
