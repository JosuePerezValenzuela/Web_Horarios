"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
  searchable?: boolean
  searchPlaceholder?: string
  maxVisibleItems?: number
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar",
  className,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Buscar...",
  maxVisibleItems = 6,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [filterValue, setFilterValue] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Ordenar: primero seleccionados, luego no seleccionados, todo alfabético
  const normalizedFilter = filterValue.trim().toLowerCase()

  const filteredOptions = options.filter((option) =>
    normalizedFilter ? option.label.toLowerCase().includes(normalizedFilter) : true
  )

  const sortedOptions = [...filteredOptions].sort((a, b) => {
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

  React.useEffect(() => {
    if (!open || !searchable) return

    const focusInput = () => {
      searchInputRef.current?.focus({ preventScroll: true })
    }

    window.requestAnimationFrame(() => {
      focusInput()
      window.setTimeout(focusInput, 0)
    })
  }, [open, searchable])

  const viewportMaxHeight = Math.max(132, maxVisibleItems * 40)

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setFilterValue("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,border-color,background-color] outline-none hover:border-ring/40 hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
            !value.length && "text-muted-foreground",
            open && "border-ring ring-3 ring-ring/20",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{displayText}</span>
          <div className="flex items-center gap-2">
            {value.length > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground">
                {value.length}
              </span>
            ) : null}
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-lg"
      >
        {searchable ? (
          <div className="border-b border-border bg-muted/30 p-1.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-8 rounded-xl border-border bg-background pr-3 pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring/20"
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          </div>
        ) : null}

        <div
          className="overflow-y-auto overscroll-contain p-1"
          style={{ maxHeight: viewportMaxHeight }}
          onWheelCapture={(event) => event.stopPropagation()}
          onTouchMoveCapture={(event) => event.stopPropagation()}
        >
          {sortedOptions.length > 0 ? (
            sortedOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 pr-8 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  value.includes(option.value) && "bg-accent/60 font-medium"
                )}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={(e) => handleCheckedChange(option.value, e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="flex-1 truncate">{option.label}</span>
                {value.includes(option.value) ? (
                  <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </span>
                ) : null}
              </label>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">Sin resultados</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
