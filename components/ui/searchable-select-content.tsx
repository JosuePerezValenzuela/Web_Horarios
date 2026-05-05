"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { SelectScrollDownButton, SelectScrollUpButton } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type SearchableSelectContentProps = React.ComponentProps<typeof SelectPrimitive.Content> & {
  position?: "item-aligned" | "popper"
  align?: "center" | "start" | "end"
  onFilterChange?: (value: string) => void
  searchPlaceholder?: string
}

function SearchableSelectContent({
  className,
  children,
  position = "popper",
  align = "start",
  onFilterChange,
  searchPlaceholder = "Buscar...",
  onKeyDownCapture,
  ...props
}: SearchableSelectContentProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [filterValue, setFilterValue] = React.useState("")

  const focusSearchInput = React.useCallback(() => {
    const focusInput = () => {
      inputRef.current?.focus({ preventScroll: true })
    }

    window.requestAnimationFrame(() => {
      focusInput()
      window.setTimeout(focusInput, 0)
    })
  }, [])

  const handleContentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      focusSearchInput()
    },
    [focusSearchInput]
  )

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setFilterValue(value)
    onFilterChange?.(value)
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="searchable-select-content"
        data-align-trigger={position === "item-aligned"}
        ref={handleContentRef}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-[12rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          position === "popper" &&
            "w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width) data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:translate-y-1",
          className
        )}
        position={position}
        align={align}
        onKeyDownCapture={(event) => {
          onKeyDownCapture?.(event)

          if (event.defaultPrevented) return

          const isCharacterKey =
            event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

          if (document.activeElement === inputRef.current && isCharacterKey) {
            event.stopPropagation()
          }
        }}
        {...props}
      >
        <div className="border-b border-border bg-muted/30 p-1.5">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={filterValue}
              onChange={handleFilterChange}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-8 rounded-xl border-border bg-background pr-3 pl-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-ring/20"
              onKeyDown={(event) => {
                const isCharacterKey =
                  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

                if (isCharacterKey) {
                  event.stopPropagation()
                }
              }}
            />
          </div>
        </div>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className="overflow-y-auto overscroll-contain p-1 data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)"
          onWheelCapture={(event) => event.stopPropagation()}
          onTouchMoveCapture={(event) => event.stopPropagation()}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export { SearchableSelectContent }
