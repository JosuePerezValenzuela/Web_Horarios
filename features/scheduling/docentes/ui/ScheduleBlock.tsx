import { cn } from "@/lib/utils"

import type { NormalizedSchedule } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"

interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  mode?: "full" | "peek"
  className?: string
}

export function ScheduleBlock({
  schedule,
  compact = false,
  mode = "full",
  className,
}: ScheduleBlockProps) {
  const token = resolveGroupColorToken(schedule.colorIndex)

  if (mode === "peek") {
    return (
      <article
        className={cn(
          "flex h-full w-full items-center overflow-hidden rounded-lg border px-3 py-2 shadow-sm backdrop-blur-[1px]",
          "focus-within:ring-2 focus-within:ring-ring",
          className
        )}
        style={token.blockStyle}
      >
        <p className="truncate text-[10px] font-semibold leading-none text-foreground/95">
          {schedule.materia}
        </p>
      </article>
    )
  }

  return (
    <article
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-lg border shadow-sm",
        compact
          ? "gap-0.5 px-2 py-1.5 text-[10px] leading-tight"
          : "gap-0.5 px-2 py-1.5 text-[11px] leading-tight",
        "focus-within:ring-2 focus-within:ring-ring",
        className
      )}
      style={token.blockStyle}
    >
      {/* Line 1: Materia */}
      <p
        className={cn(
          "font-semibold leading-snug",
          compact ? "truncate text-[10px]" : "line-clamp-2 text-[11px]"
        )}
      >
        {schedule.materia}
      </p>

      {/* Line 2: Ambiente + Grupo badge */}
      <div className="flex items-center justify-between gap-1">
        <p className={cn("truncate text-foreground/85", compact ? "text-[9px]" : "text-[10px]")}>
          <span className="font-medium">Ambiente:</span> {schedule.ambienteLabel}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full border font-medium leading-none",
            compact ? "px-1.5 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]"
          )}
          style={token.badgeStyle}
        >
          G: {schedule.grupo}
        </span>
      </div>
    </article>
  )
}
