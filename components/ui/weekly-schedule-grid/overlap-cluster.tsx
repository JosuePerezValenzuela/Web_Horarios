"use client"

import { X } from "lucide-react"
import { GRID_CONSTANTS } from "./schedule-utils"
import { ScheduleCard } from "./schedule-card"
import type { RenderSlice, ScheduleItem } from "./types"

interface OverlapClusterProps {
  slice: RenderSlice
  isExpanded: boolean
  visibleIndex: number
  rotationTick: number
  onToggle: () => void
  onHoverChange: (hovered: boolean) => void
  onItemClick?: (item: ScheduleItem) => void
}

export function OverlapCluster({
  slice,
  isExpanded,
  visibleIndex,
  rotationTick,
  onToggle,
  onHoverChange,
  onItemClick,
}: OverlapClusterProps) {
  const { items } = slice
  const totalCount = items.length
  const visibleItem = items[visibleIndex % totalCount]

  const previewCount = Math.min(totalCount - 1, GRID_CONSTANTS.STACK_PREVIEW_COUNT)
  const previewItems = Array.from(
    { length: previewCount },
    (_, i) => items[(visibleIndex + i + 1) % totalCount]
  )

  if (isExpanded) {
    return (
      <div className="relative flex h-full w-full flex-col rounded-2xl border-2 border-border/85 bg-background p-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]">
        {/* Header */}
        <div className="mb-1 flex w-full shrink-0 items-center justify-between px-1">
          <div className="text-[10px] font-medium text-foreground/70">
            {totalCount} horarios solapados
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center justify-center rounded-full bg-background/35 p-1 text-foreground/50 backdrop-blur-sm transition hover:bg-background/55 hover:text-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Colapsar ${totalCount} horarios superpuestos`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Items list with uniform heights */}
        <div className="flex w-full flex-1 flex-col items-stretch justify-start gap-1">
          {items.map((item) => {
            return (
              <div key={item.id} className="flex flex-1 flex-col min-h-[52px]">
                <ScheduleCard item={item} mode="full" className="h-full" onClick={onItemClick} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Collapsed stack
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className="group relative flex h-full w-full items-start justify-start overflow-visible rounded-lg p-0 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${totalCount} horarios solapados. Clic para expandir`}
    >
      {/* Preview cards behind (reversed so first is most behind) */}
      {[...previewItems].reverse().map((previewItem, reversedIndex) => {
        const actualIndex = previewCount - 1 - reversedIndex
        return (
          <div
            key={`preview-${previewItem.id}`}
            className="pointer-events-none absolute z-0 overflow-hidden rounded-lg shadow-[0_16px_26px_-20px_rgba(15,23,42,0.55)] transition-transform duration-300 group-hover:-translate-y-0.5"
            style={{
              top: `${actualIndex * GRID_CONSTANTS.STACK_PREVIEW_TOP_OFFSET}px`,
              left: `${(actualIndex + 1) * GRID_CONSTANTS.STACK_PREVIEW_SIDE_OFFSET}px`,
              right: `${(actualIndex + 1) * GRID_CONSTANTS.STACK_PREVIEW_SIDE_OFFSET}px`,
              height: `${GRID_CONSTANTS.STACK_PREVIEW_HEIGHT}px`,
              opacity: 0.92 - actualIndex * 0.18,
              transform: `scale(${1 - actualIndex * 0.03})`,
            }}
          >
            <ScheduleCard
              item={previewItem}
              mode="peek"
              className="h-full border-border/55 shadow-none"
            />
          </div>
        )
      })}

      {/* Count badge */}
      <div className="pointer-events-none absolute right-2 top-2 z-30 flex items-center gap-1 rounded-full border border-border/20 bg-background/18 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/45 shadow-sm backdrop-blur-[1px]">
        <span>
          {(visibleIndex % totalCount) + 1}/{totalCount}
        </span>
      </div>

      {/* Front card (animated on rotation) */}
      <div
        className="absolute z-20 overflow-visible rounded-lg"
        style={{
          top: `${previewCount * GRID_CONSTANTS.STACK_PREVIEW_TOP_OFFSET}px`,
          left: `${GRID_CONSTANTS.STACK_FRONT_SIDE_OFFSET}px`,
          right: `${GRID_CONSTANTS.STACK_FRONT_SIDE_OFFSET}px`,
          bottom: 0,
        }}
      >
        <div
          key={`${visibleItem.id}-${rotationTick}`}
          className="flex animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 duration-500"
        >
          <ScheduleCard
            item={visibleItem}
            className="w-full border-border/60 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)]"
            onClick={undefined}
          />
        </div>
      </div>
    </button>
  )
}
