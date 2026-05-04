"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

export interface MultiSelectOption {
  value: string | number
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: (string | number)[]
  onValueChange: (value: (string | number)[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Ordenar: primero seleccionados, luego no seleccionados, todo alfabético
  const sortedOptions = [...options].sort((a, b) => {
    const aSelected = value.includes(a.value)
    const bSelected = value.includes(b.value)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    return a.label.localeCompare(b.label)
  })

  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label)
    .slice(0, 2)

  const displayText =
    selectedLabels.length > 0
      ? selectedLabels.join(", ") + (value.length > 2 ? ` +${value.length - 2}` : "")
      : placeholder

  const handleCheckedChange = (optionValue: string | number, checked: boolean) => {
    if (checked) {
      onValueChange([...value, optionValue])
    } else {
      onValueChange(value.filter((v) => v !== optionValue))
    }
  }

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          open && "ring-2 ring-ring ring-offset-2"
        )}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDownIcon
          className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-background p-1 shadow-md">
          {sortedOptions.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                value.includes(option.value) && "bg-accent"
              )}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={(e) => handleCheckedChange(option.value, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="flex-1 truncate">{option.label}</span>
              {!value.includes(option.value) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                  }}
                  className=" ml-auto text-muted-foreground hover:text-foreground"
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
