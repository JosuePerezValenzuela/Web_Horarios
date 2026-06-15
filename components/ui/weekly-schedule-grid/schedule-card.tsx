import { cn } from "@/lib/utils"
import { resolveColorToken, resolveAccentColor } from "./color-tokens"
import type { ScheduleItem } from "./types"

interface ScheduleCardProps {
  item: ScheduleItem
  mode?: "full" | "peek" | "compact"
  isContinuation?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: (item: ScheduleItem) => void
}

export function ScheduleCard({
  item,
  mode = "full",
  isContinuation = false,
  className,
  style,
  onClick,
}: ScheduleCardProps) {
  const token = resolveColorToken(item.colorIndex)
  const accentColor = resolveAccentColor(item.colorIndex)
  const isClickable = onClick !== undefined && mode !== "peek"

  const baseStyle = mode === "peek" ? token.peekStyle : token.blockStyle

  const combinedStyle = {
    ...baseStyle,
    ...style,
  }

  const commonClassName = cn(
    "relative flex w-full overflow-hidden rounded-lg border shadow-sm transition-all duration-200",
    mode === "peek"
      ? "h-full items-center px-2.5 py-1.5 backdrop-blur-[2px]"
      : mode === "compact"
        ? "flex-col justify-center gap-0.5 px-2 py-1.5 text-[10px] leading-tight"
        : "flex-col justify-center gap-0.5 px-2 py-1.5 text-[11px] leading-tight",
    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
    isClickable && "cursor-pointer hover:shadow-md hover:-translate-y-[1px]",
    className
  )

  // Continuation indicator: a colored left border stripe
  const continuationStripe = isContinuation ? (
    <span
      className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg"
      style={{ backgroundColor: accentColor }}
      aria-hidden
    />
  ) : null

  if (mode === "peek") {
    return (
      <article className={commonClassName} style={combinedStyle}>
        {continuationStripe}
        <p className="truncate text-[10px] font-semibold leading-none text-foreground/95">
          {item.title}
        </p>
      </article>
    )
  }

  const handleClick = isClickable ? () => onClick(item) : undefined
  const handleKeyDown = isClickable
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(item)
        }
      }
    : undefined

  return (
    <article
      className={commonClassName}
      style={combinedStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? `Editar horario de ${item.title}` : undefined}
    >
      {continuationStripe}

      {/* Title */}
      <p
        className={cn(
          "font-bold leading-snug tracking-tight text-foreground/95 break-words",
          mode === "compact" ? "text-[10px]" : "text-[11px]"
        )}
      >
        {item.title}
      </p>

      {/* Subtitle */}
      {item.subtitle && (
        <p
          className={cn(
            "font-medium text-foreground/75 mt-0.5 break-words",
            mode === "compact" ? "text-[9px]" : "text-[10px]"
          )}
        >
          {item.subtitle}
        </p>
      )}

      {/* Badge row on its own line */}
      {item.badge && (
        <div className="mt-1 flex w-full justify-start">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md border font-bold leading-none shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
              mode === "compact" ? "px-1 py-0.5 text-[8.5px]" : "px-1.5 py-0.5 text-[9.5px]"
            )}
            style={token.badgeStyle}
          >
            {item.badge}
          </span>
        </div>
      )}
    </article>
  )
}
