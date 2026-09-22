import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { resolveColorToken, resolveAccentColor } from "./color-tokens"
import type { ScheduleItem } from "./types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatTime } from "./schedule-utils"
import { Button } from "@umss/estilos-base/components"
import type { NormalizedSchedule } from "@/features/scheduling/docentes/domain/types"
import { Calendar, Clock, MapPin, GraduationCap, Award, Edit, Laptop } from "lucide-react"

interface ScheduleCardProps {
  item: ScheduleItem
  mode?: "full" | "peek" | "compact"
  isContinuation?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: (item: ScheduleItem) => void
  onHoverTimeRangeChange?: (range: { startMin: number; endMin: number } | null) => void
}

// Visual layout constants to avoid long Tailwind inline lines
const BASE_CARD_CLASSES =
  "relative flex w-full overflow-hidden rounded-lg border shadow-sm transition-all duration-200"

const PEEK_CLASSES =
  "h-full items-center justify-center text-center px-2.5 py-1.5 backdrop-blur-[2px]"
const COMPACT_CLASSES =
  "flex-col justify-center items-center text-center gap-1 px-2 py-2 text-[10px] leading-tight"
const FULL_CLASSES =
  "flex-col justify-center items-center text-center gap-1.5 px-2.5 py-2.5 text-[11px] leading-tight"

export function ScheduleCard({
  item,
  mode = "full",
  isContinuation = false,
  className,
  style,
  onClick,
  onHoverTimeRangeChange,
}: ScheduleCardProps) {
  const token = resolveColorToken(item.colorIndex, item.toneIndex)
  const accentColor = resolveAccentColor(item.colorIndex, item.toneIndex)
  const isClickable = onClick !== undefined && mode !== "peek"

  // Hover Popover & Card Highlight state
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (mode !== "full") return
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (!isOpen && !openTimeoutRef.current) {
      openTimeoutRef.current = setTimeout(() => {
        setIsOpen(true)
        openTimeoutRef.current = null
      }, 350)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (mode !== "full") return
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
    if (isOpen && !closeTimeoutRef.current) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false)
        closeTimeoutRef.current = null
      }, 150)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (mode !== "full") return
    e.stopPropagation()
    setIsOpen((prev) => !prev)
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode !== "full") return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Call onHoverTimeRangeChange when hovered or popover opens
  useEffect(() => {
    if (mode !== "full") return
    if (onHoverTimeRangeChange) {
      if (isHovered || isOpen) {
        onHoverTimeRangeChange({ startMin: item.startMin, endMin: item.endMin })
      } else {
        onHoverTimeRangeChange(null)
      }
    }
  }, [isHovered, isOpen, item.startMin, item.endMin, mode, onHoverTimeRangeChange])

  const baseStyle = mode === "peek" ? token.peekStyle : token.blockStyle

  const combinedStyle = {
    ...baseStyle,
    ...style,
  }

  const isActive = isOpen || isHovered

  // Combined Badge text construction (e.g. "G: 1 - Aula: 691B")
  const schedule = item.meta?.schedule as NormalizedSchedule | undefined
  const isVirtual = Boolean(item.isVirtual ?? schedule?.virtual)
  const rawGroup = schedule?.grupo || item.badge?.replace("G: ", "") || ""
  const rawAula =
    schedule?.ambienteLabel?.replace("Ambiente: ", "").replace("Aula ", "") ||
    item.subtitle?.replace("Ambiente: ", "").replace("Aula ", "") ||
    ""

  const showAula =
    rawAula &&
    rawAula !== "Sin ambiente" &&
    rawAula !== "Sin aula" &&
    rawAula !== "No asignado" &&
    rawAula !== "Virtual"

  const combinedBadgeParts: string[] = []
  if (rawGroup) combinedBadgeParts.push(`G: ${rawGroup}`)
  if (showAula) combinedBadgeParts.push(`Aula: ${rawAula}`)
  const combinedBadgeText = combinedBadgeParts.join(" - ")

  const commonClassName = cn(
    BASE_CARD_CLASSES,
    mode === "peek" ? PEEK_CLASSES : mode === "compact" ? COMPACT_CLASSES : FULL_CLASSES,
    isActive
      ? "ring-2 ring-primary ring-offset-1 shadow-md -translate-y-[1px]"
      : "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1",
    isVirtual &&
      "!border-2 !border-dashed !border-indigo-500/80 dark:!border-indigo-400 shadow-md shadow-indigo-500/10 before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(99,102,241,0.08)_25%,transparent_25%,transparent_50%,rgba(99,102,241,0.08)_50%,rgba(99,102,241,0.08)_75%,transparent_75%,transparent_100%)] before:bg-[length:12px_12px] before:pointer-events-none before:rounded-lg",
    (isClickable || mode === "full") && "cursor-pointer",
    className
  )

  // Continuation indicator: a colored left border stripe
  const continuationStripe = isContinuation ? (
    <span
      className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg z-20"
      style={{ backgroundColor: accentColor }}
      aria-hidden
    />
  ) : null

  if (mode === "peek") {
    return (
      <article className={commonClassName} style={combinedStyle}>
        {continuationStripe}
        <p className="truncate text-[10px] font-semibold leading-none text-foreground/95 w-full flex items-center justify-center gap-1 z-10">
          {isVirtual && (
            <Laptop className="size-2.5 text-indigo-600 dark:text-indigo-400 shrink-0 stroke-[2.5]" />
          )}
          <span className="truncate">{item.title}</span>
        </p>
      </article>
    )
  }

  const cardContent = (
    <article
      className={commonClassName}
      style={combinedStyle}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={mode === "full" ? 0 : undefined}
      role={mode === "full" ? "button" : undefined}
      aria-haspopup={mode === "full" ? "dialog" : undefined}
      aria-expanded={mode === "full" ? isOpen : undefined}
      aria-label={`Detalles de ${item.title}`}
    >
      {continuationStripe}

      {/* Marca de agua de fondo para clases virtuales */}
      {isVirtual && (
        <Laptop
          className="absolute -bottom-1 -right-1 size-11 text-indigo-600/15 dark:text-indigo-400/20 pointer-events-none -rotate-12 select-none z-0"
          aria-hidden="true"
        />
      )}

      {/* Tag llamativo superior para clases virtuales */}
      {isVirtual && (
        <div className="flex w-full justify-center mb-1 z-10">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black tracking-wider uppercase bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs border border-indigo-400/30">
            <Laptop className="size-2.5 stroke-[2.5]" />
            Virtual
          </span>
        </div>
      )}

      {/* 1. Title of the subject (Clamped to 3 lines) */}
      <p
        className={cn(
          "font-bold leading-snug tracking-tight text-foreground/95 w-full break-words line-clamp-3 z-10",
          mode === "compact" ? "text-[10px]" : "text-[11px]"
        )}
      >
        {item.title}
      </p>

      {/* 2. Teacher name if available (Clamped to 2 lines) */}
      {item.description && (
        <p
          className={cn(
            "font-semibold text-foreground/80 w-full break-words line-clamp-2 mt-0.5 z-10",
            mode === "compact" ? "text-[8.5px]" : "text-[9.5px]"
          )}
        >
          {item.description}
        </p>
      )}

      {/* 3. Combined Group/Room Badge */}
      {combinedBadgeText && (
        <div className="mt-1 flex w-full justify-center z-10">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md border font-bold leading-none shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
              mode === "compact" ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9px]"
            )}
            style={token.badgeStyle}
          >
            {combinedBadgeText}
          </span>
        </div>
      )}
    </article>
  )

  if (mode !== "full") {
    return cardContent
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{cardContent}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-4 border-2 border-border/80 bg-popover/98 backdrop-blur-md shadow-xl rounded-2xl flex flex-col gap-3.5"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1">
          <h3 className="font-roboto text-sm font-bold text-foreground leading-snug line-clamp-2">
            {schedule?.materia || item.title}
          </h3>
          {schedule?.materiaCodigo && (
            <p className="text-[10px] font-mono font-medium text-muted-foreground leading-none">
              Cod: {schedule.materiaCodigo}
            </p>
          )}
          {(schedule?.docente || item.description) && (
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
              <Award className="size-3.5 text-muted-foreground/60 shrink-0" />
              <span>{schedule?.docente || item.description}</span>
            </p>
          )}
        </div>

        <div className="h-px bg-border/60" />

        <div className="flex flex-col gap-2.5 text-xs text-foreground/90">
          {/* Grupo */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground shrink-0 w-16">Grupo:</span>
            <span
              className="px-2 py-0.5 font-mono font-bold rounded-md text-[10.5px] border"
              style={token.badgeStyle}
            >
              {schedule?.grupo || item.badge?.replace("G: ", "") || "1"}
            </span>
          </div>

          {/* Hora */}
          <div className="flex items-start gap-2">
            <span className="font-semibold text-muted-foreground shrink-0 w-16 mt-0.5">
              Horario:
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5 text-muted-foreground/70 shrink-0" />
              <span className="font-mono">
                {schedule
                  ? `${formatTime(schedule.startMin)} - ${formatTime(schedule.endMin)}`
                  : ""}
              </span>
            </span>
          </div>

          {/* Aula */}
          {showAula && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-muted-foreground shrink-0 w-16 mt-0.5">
                Ambiente:
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span>{rawAula}</span>
              </span>
            </div>
          )}

          {/* Modalidad */}
          {isVirtual && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-muted-foreground shrink-0 w-16 mt-0.5">
                Modalidad:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Laptop className="size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Virtual</span>
              </span>
            </div>
          )}

          {/* Vigencia */}
          <div className="flex items-start gap-2">
            <span className="font-semibold text-muted-foreground shrink-0 w-16 mt-0.5">
              Vigencia:
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
              <span>{schedule?.fechasLabel || "No definida"}</span>
            </span>
          </div>

          {/* Carreras */}
          {schedule?.carreras && schedule.carreras.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-muted-foreground shrink-0 w-16 mt-0.5">
                Carreras:
              </span>
              <div className="flex flex-col gap-1 font-medium flex-1">
                {schedule.carreras.map((carrera, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <GraduationCap className="size-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight break-words">{carrera}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isClickable && (
          <>
            <div className="h-px bg-border/60" />
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
                onClick(item)
              }}
              className="rounded-xl w-full text-white focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-transparent focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none"
            >
              <Edit className="size-3.5" />
              <span>Editar Horario</span>
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
