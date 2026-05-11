import { cn } from "@/lib/utils"

import type { NormalizedSchedule } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"

interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  className?: string
}

export function ScheduleBlock({ schedule, compact = false, className }: ScheduleBlockProps) {
  const token = resolveGroupColorToken(schedule.colorIndex)

  return (
    <article
      className={cn(
        "flex w-full max-h-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-sm",
        compact
          ? "gap-0.5 px-2 py-1.5 text-[10px] leading-tight"
          : "gap-0.5 px-1.5 py-1 text-[11px] leading-tight",
        "focus-within:ring-2 focus-within:ring-ring",
        className
      )}
      style={token.blockStyle}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-1 font-semibold leading-snug">{schedule.materia}</p>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full border font-medium leading-none",
            compact ? "px-1.5 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[10px]"
          )}
          style={token.badgeStyle}
        >
          G: {schedule.grupo}
        </span>
      </div>

      {compact ? (
        <>
          <p className="truncate text-[9px] text-foreground/85">{schedule.ambienteLabel}</p>
          <p className="truncate text-[9px] text-muted-foreground">{schedule.tipoLabel}</p>
        </>
      ) : (
        <>
          <p className={cn("truncate text-foreground/85", compact ? "text-[9px]" : "text-[10px]")}>
            <span className="font-medium">Ambiente:</span> {schedule.ambienteLabel}
          </p>
          <p className={cn("truncate text-foreground/75", compact ? "text-[9px]" : "text-[10px]")}>
            <span className="font-medium">Tipo:</span> {schedule.tipoLabel}
          </p>
          <p
            className={cn("truncate text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}
          >
            {schedule.fechasLabel}
          </p>
        </>
      )}
    </article>
  )
}
