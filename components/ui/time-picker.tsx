"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface TimePickerProps {
  value?: string // Formato HH:mm en 24h
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

function parseTime(value?: string) {
  if (!value) return { hour: "", minute: "" }
  const parts = value.split(":")
  if (parts.length < 2) return { hour: "", minute: "" }

  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)

  if (isNaN(h) || isNaN(m)) return { hour: "", minute: "" }

  const validH = Math.min(Math.max(h, 0), 23)
  const validM = Math.min(Math.max(m, 0), 59)

  return {
    hour: validH.toString().padStart(2, "0"),
    minute: validM.toString().padStart(2, "0"),
  }
}

export function TimePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "00:00",
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const parsed = parseTime(value)

  // Local state to allow typing intermediate invalid states
  const [hour, setHour] = React.useState(parsed.hour)
  const [minute, setMinute] = React.useState(parsed.minute)

  // Sync with external value when it changes from outside
  React.useEffect(() => {
    const isEditing =
      document.activeElement === hourRef.current || document.activeElement === minuteRef.current
    if (isEditing) return

    const p = parseTime(value)
    setHour(p.hour)
    setMinute(p.minute)
  }, [value])

  const notifyChange = (h: string, m: string, force = false) => {
    if (onChange) {
      const cleanH = h.trim()
      const cleanM = m.trim()
      if (cleanH && cleanM) {
        if (force || (cleanH.length === 2 && cleanM.length === 2)) {
          const paddedH = cleanH.padStart(2, "0")
          const paddedM = cleanM.padStart(2, "0")
          onChange(`${paddedH}:${paddedM}`)
        }
      } else if (!cleanH && !cleanM) {
        onChange("")
      }
    }
  }

  const handleHourChange = (newHour: string) => {
    let val = newHour.replace(/\D/g, "")
    if (val.length > 2) val = val.slice(0, 2)
    setHour(val)
    if (val.length === 2) {
      const hInt = parseInt(val, 10)
      if (hInt >= 0 && hInt <= 23) {
        notifyChange(val, minute)
        if (minuteRef.current) minuteRef.current.focus()
      } else {
        setHour("23")
        notifyChange("23", minute)
        if (minuteRef.current) minuteRef.current.focus()
      }
    }
  }

  const handleMinuteChange = (newMinute: string) => {
    let val = newMinute.replace(/\D/g, "")
    if (val.length > 2) val = val.slice(0, 2)
    setMinute(val)
    if (val.length === 2) {
      const mInt = parseInt(val, 10)
      if (mInt >= 0 && mInt <= 59) {
        notifyChange(hour, val)
      } else {
        setMinute("59")
        notifyChange(hour, "59")
      }
    }
  }

  const handleHourBlur = () => {
    if (hour) {
      const hInt = parseInt(hour, 10)
      let finalHour = hour
      if (isNaN(hInt) || hInt < 0 || hInt > 23) {
        finalHour = "00"
      } else {
        finalHour = hInt.toString().padStart(2, "0")
      }
      setHour(finalHour)
      notifyChange(finalHour, minute, true)
    } else if (!hour && !minute) {
      notifyChange("", "", true)
    }
  }

  const handleMinuteBlur = () => {
    if (minute) {
      const mInt = parseInt(minute, 10)
      let finalMinute = minute
      if (isNaN(mInt) || mInt < 0 || mInt > 59) {
        finalMinute = "00"
      } else {
        finalMinute = mInt.toString().padStart(2, "0")
      }
      setMinute(finalMinute)
      notifyChange(hour, finalMinute, true)
    } else if (!hour && !minute) {
      notifyChange("", "", true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: "hour" | "minute") => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const isUp = e.key === "ArrowUp"
      if (type === "hour") {
        let h = parseInt(hour || "0", 10)
        h = isUp ? h + 1 : h - 1
        if (h > 23) h = 0
        if (h < 0) h = 23
        const hStr = h.toString().padStart(2, "0")
        setHour(hStr)
        notifyChange(hStr, minute)
      } else {
        let m = parseInt(minute || "0", 10)
        m = isUp ? m + 1 : m - 1
        if (m > 59) m = 0
        if (m < 0) m = 59
        const mStr = m.toString().padStart(2, "0")
        setMinute(mStr)
        notifyChange(hour, mStr)
      }
    }

    if (
      e.key === "ArrowRight" &&
      type === "hour" &&
      (e.currentTarget.selectionStart === hour.length || hour.length === 0)
    ) {
      minuteRef.current?.focus()
    }
    if (e.key === "ArrowLeft" && type === "minute" && e.currentTarget.selectionStart === 0) {
      hourRef.current?.focus()
    }
  }

  const hourRef = React.useRef<HTMLInputElement>(null)
  const minuteRef = React.useRef<HTMLInputElement>(null)

  // Arrays for the 24-hour popover wheels (00 to 23 and 00 to 59)
  const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  // Scroll active items into view when popover opens
  const activeHourRef = React.useRef<HTMLButtonElement>(null)
  const activeMinuteRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        activeHourRef.current?.scrollIntoView({ block: "center" })
        activeMinuteRef.current?.scrollIntoView({ block: "center" })
      }, 0)
    }
  }, [open])

  const placeholderHour = placeholder.split(":")[0] || "00"
  const placeholderMinute = placeholder.split(":")[1] || "00"

  return (
    <div
      onClick={() => {
        if (!disabled) setOpen(true)
      }}
      className={cn(
        "flex h-8 w-full min-w-[6.5rem] items-center rounded-xl border border-input bg-background px-2 text-sm shadow-xs transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div className="flex flex-1 items-center justify-center gap-0.5">
        <input
          ref={hourRef}
          disabled={disabled}
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
          onBlur={handleHourBlur}
          onKeyDown={(e) => handleKeyDown(e, "hour")}
          onFocus={(e) => e.target.select()}
          placeholder={placeholderHour}
          className="w-5 bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground/50"
        />
        <span className="text-muted-foreground/70 font-semibold select-none">:</span>
        <input
          ref={minuteRef}
          disabled={disabled}
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          onBlur={handleMinuteBlur}
          onKeyDown={(e) => handleKeyDown(e, "minute")}
          onFocus={(e) => e.target.select()}
          placeholder={placeholderMinute}
          className="w-5 bg-transparent p-0 text-center outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Clock className="size-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 rounded-2xl flex flex-col gap-2" align="end">
          <div className="flex font-medium text-xs text-muted-foreground px-2">
            <div className="flex-1 text-center">Hora</div>
            <div className="flex-1 text-center">Min.</div>
          </div>
          <div className="flex h-48 gap-1.5">
            {/* Hours Column (00 - 23) */}
            <div
              className="w-14 overflow-y-auto overscroll-contain rounded-xl bg-muted/30 p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
              onWheelCapture={(e) => e.stopPropagation()}
              onTouchMoveCapture={(e) => e.stopPropagation()}
            >
              {hoursList.map((h) => (
                <button
                  key={h}
                  ref={h === hour ? activeHourRef : null}
                  type="button"
                  onClick={() => {
                    setHour(h)
                    notifyChange(h, minute)
                  }}
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground cursor-pointer",
                    h === hour
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Minutes Column (00 - 59) */}
            <div
              className="w-14 overflow-y-auto overscroll-contain rounded-xl bg-muted/30 p-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
              onWheelCapture={(e) => e.stopPropagation()}
              onTouchMoveCapture={(e) => e.stopPropagation()}
            >
              {minutesList.map((m) => (
                <button
                  key={m}
                  ref={m === minute ? activeMinuteRef : null}
                  type="button"
                  onClick={() => {
                    setMinute(m)
                    notifyChange(hour, m)
                  }}
                  className={cn(
                    "flex w-full items-center justify-center rounded-lg py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground cursor-pointer",
                    m === minute
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2 px-1 gap-3">
            <button
              type="button"
              onClick={() => {
                setHour("")
                setMinute("")
                onChange?.("")
                setOpen(false)
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Limpiar hora
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Listo
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
