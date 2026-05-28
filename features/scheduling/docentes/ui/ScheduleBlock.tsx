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
      "flex w-full overflow-hidden rounded-lg border shadow-sm transition-all duration-200",
      mode === "peek"
        ? "h-full items-center px-2.5 py-1.5 backdrop-blur-[2px]"
        : compact
          ? "flex-col gap-0.5 px-2 py-1.5 text-[10px] leading-tight"
          : "flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-tight",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
      isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-[1px]",
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
          "font-bold leading-snug tracking-tight text-foreground/95",
          compact ? "truncate text-[10px]" : "line-clamp-2 text-[11px]"
        )}
      >
        {schedule.materia}
      </p>

      {/* Line 2: Ambiente + Grupo badge */}
      <div className="mt-auto flex w-full items-center justify-between gap-0.5 pt-0.5">
        <p
          className={cn(
            "truncate font-medium text-foreground/75",
            compact ? "text-[9px]" : "text-[10px]"
          )}
        >
          {schedule.ambienteLabel}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md border font-bold leading-none shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
            compact ? "px-1 py-0.5 text-[8.5px]" : "px-1.5 py-0.5 text-[9.5px]"
          )}
          style={token.badgeStyle}
          title={`Grupo ${schedule.grupo}`}
        >
          G: {schedule.grupo}
        </span>
      </div>
    </article>
  )
}
