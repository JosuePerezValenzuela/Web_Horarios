import { cn } from "@/lib/utils"

import type { NormalizedSchedule } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"

interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  mode?: "full" | "peek"
  className?: string
  onClick?: (schedule: NormalizedSchedule) => void
}

export function ScheduleBlock({
  schedule,
  compact = false,
  mode = "full",
  className,
  onClick,
}: ScheduleBlockProps) {
  const token = resolveGroupColorToken(schedule.colorIndex)
  const isClickable = onClick !== undefined && mode !== "peek"

  const commonProps = {
    className: cn(
      "flex w-full overflow-hidden rounded-lg border shadow-sm",
      mode === "peek"
        ? "h-full items-center px-3 py-2 backdrop-blur-[1px]"
        : compact
          ? "flex-col gap-0.5 px-2 py-1.5 text-[10px] leading-tight"
          : "flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-tight",
      "focus-within:ring-2 focus-within:ring-ring",
      isClickable && "cursor-pointer hover:brightness-95",
      className
    ),
    style: token.blockStyle,
  }

  if (mode === "peek") {
    return (
      <article {...commonProps}>
        <p className="truncate text-[10px] font-semibold leading-none text-foreground/95">
          {schedule.materia}
        </p>
      </article>
    )
  }

  return (
    <article
      {...commonProps}
      onClick={isClickable ? () => onClick(schedule) : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick(schedule)
              }
            }
          : undefined
      }
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? `Editar horario de ${schedule.materia}` : undefined}
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
