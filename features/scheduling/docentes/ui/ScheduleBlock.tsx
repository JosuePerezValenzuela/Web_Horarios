import { cn } from "@/lib/utils"

import type { NormalizedSchedule } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"

interface ScheduleBlockProps {
  schedule: NormalizedSchedule
}

export function ScheduleBlock({ schedule }: ScheduleBlockProps) {
  const token = resolveGroupColorToken(schedule.colorIndex)

  return (
    <article
      className={cn(
        "flex w-full max-h-full min-h-0 flex-col gap-0.5 overflow-hidden rounded-lg border px-1.5 py-1 text-[11px] leading-tight shadow-sm",
        "focus-within:ring-2 focus-within:ring-ring"
      )}
      style={token.blockStyle}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-1 font-semibold leading-snug">{schedule.materia}</p>
        <span
          className="inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none"
          style={token.badgeStyle}
        >
          G: {schedule.grupo}
        </span>
      </div>

      <p className="truncate text-[10px] text-foreground/85">
        <span className="font-medium">Ambiente:</span> {schedule.ambienteLabel}
      </p>
      <p className="truncate text-[10px] text-foreground/75">
        <span className="font-medium">Tipo:</span> {schedule.tipoLabel}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">{schedule.fechasLabel}</p>
    </article>
  )
}
