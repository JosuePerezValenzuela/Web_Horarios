"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  buildRenderSlices,
  buildTimelineSegments,
  getMinutePosition,
  formatTime,
  getClusterCollapsedHeight,
  getClusterExpandedHeight,
  getSoloSliceHeight,
  GRID_CONSTANTS,
} from "./schedule-utils"
import { ScheduleCard } from "./schedule-card"
import { OverlapCluster } from "./overlap-cluster"
import type { WeeklyScheduleGridProps } from "./types"

const DEFAULT_DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
]

const DEFAULT_ROTATION_INTERVAL_MS = 5000

export function WeeklyScheduleGrid({
  items,
  rows,
  timeRange,
  days = DEFAULT_DAYS,
  overlapRotationIntervalMs = DEFAULT_ROTATION_INTERVAL_MS,
  onItemClick,
  className,
}: WeeklyScheduleGridProps) {
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set())
  const [hoveredClusterIds, setHoveredClusterIds] = useState<Set<string>>(new Set())
  const [visibleIndexByCluster, setVisibleIndexByCluster] = useState<Record<string, number>>({})
  const [rotationTickByCluster, setRotationTickByCluster] = useState<Record<string, number>>({})

  // Build render slices (fractional overlap splitting)
  const renderSlices = useMemo(() => buildRenderSlices(items), [items])

  // Build timeline segments (adaptive height)
  const timelineSegments = useMemo(
    () => buildTimelineSegments(renderSlices, expandedClusterIds, timeRange),
    [renderSlices, expandedClusterIds, timeRange]
  )

  const totalHeight = useMemo(
    () => timelineSegments.reduce((acc, seg) => acc + seg.height, 0) || 220,
    [timelineSegments]
  )

  // Helper to get pixel position from minute
  const minuteToY = (minute: number) => getMinutePosition(minute, timeRange, timelineSegments)

  // Auto-rotation for collapsed clusters
  useEffect(() => {
    if (overlapRotationIntervalMs <= 0) return undefined
    const clusterSlices = renderSlices.filter((s) => s.type === "cluster")
    if (clusterSlices.length === 0) return undefined

    const timer = window.setInterval(() => {
      setVisibleIndexByCluster((current) => {
        const next = { ...current }
        let changed = false
        const rotated: string[] = []

        clusterSlices.forEach((slice) => {
          if (expandedClusterIds.has(slice.id)) return
          if (hoveredClusterIds.has(slice.id)) return
          next[slice.id] = ((current[slice.id] ?? 0) + 1) % slice.items.length
          changed = true
          rotated.push(slice.id)
        })

        if (rotated.length > 0) {
          setRotationTickByCluster((ticks) => {
            const nextTicks = { ...ticks }
            rotated.forEach((id) => {
              nextTicks[id] = (ticks[id] ?? 0) + 1
            })
            return nextTicks
          })
        }

        return changed ? next : current
      })
    }, overlapRotationIntervalMs)

    return () => window.clearInterval(timer)
  }, [renderSlices, expandedClusterIds, hoveredClusterIds, overlapRotationIntervalMs])

  const toggleCluster = (sliceId: string) => {
    setExpandedClusterIds((current) => {
      const next = new Set(current)
      if (next.has(sliceId)) next.delete(sliceId)
      else next.add(sliceId)
      return next
    })
  }

  const setClusterHovered = (sliceId: string, hovered: boolean) => {
    setHoveredClusterIds((current) => {
      const next = new Set(current)
      if (hovered) next.add(sliceId)
      else next.delete(sliceId)
      return next
    })
  }

  // Group slices by day
  const slicesByDay = days.reduce<Record<number, typeof renderSlices>>((acc, day) => {
    acc[day.value] = renderSlices.filter((s) => s.day === day.value)
    return acc
  }, {})

  const colCount = days.length

  return (
    <div
      className={cn(
        "h-full max-h-full overflow-hidden rounded-3xl border border-border bg-card",
        className
      )}
    >
      <div className="h-full max-h-full overflow-x-auto overflow-y-auto">
        <div className="min-w-[640px] lg:min-w-0">
          {/* Day header row */}
          <div
            className="grid border-b-[2px] border-border bg-muted/35"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          >
            {days.map((day) => (
              <div
                key={day.value}
                className="border-r-[2px] border-border px-2 py-2 text-xs font-semibold last:border-r-0 md:px-3 md:py-3"
              >
                {day.label}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="relative border-b-[3px] border-border">
            {/* Time row lines behind the cards (z-[2]) */}
            <div
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{ height: `${totalHeight}px` }}
            >
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="absolute inset-x-0 border-t-[2px] border-border/60"
                  style={{ top: `${minuteToY(row.startMin)}px` }}
                />
              ))}
            </div>

            {/* Time row labels on top of the cards (z-20) */}
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ height: `${totalHeight}px` }}
            >
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="absolute left-1.5 -translate-y-1/2"
                  style={{ top: `${minuteToY(row.startMin)}px` }}
                >
                  <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
                    {row.label}
                  </span>
                </div>
              ))}
              {rows.length > 0 && (
                <div
                  className="absolute left-1.5 -translate-y-1/2"
                  style={{ top: `${totalHeight}px` }}
                >
                  <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
                    {formatTime(timeRange.endMin)}
                  </span>
                </div>
              )}
            </div>

            {/* Day columns */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
            >
              {days.map((day) => (
                <div
                  key={day.value}
                  className="relative border-r-[3px] border-border last:border-r-0"
                  style={{ height: `${totalHeight}px` }}
                >
                  {slicesByDay[day.value]?.map((slice) => {
                    const top = minuteToY(slice.startMin)
                    const bottom = minuteToY(slice.endMin)
                    const temporalSpan = bottom - top

                    if (slice.type === "cluster") {
                      const isExpanded = expandedClusterIds.has(slice.id)
                      const visibleIndex = visibleIndexByCluster[slice.id] ?? 0
                      const rotationTick = rotationTickByCluster[slice.id] ?? 0

                      // Fill the temporal slot the timeline allocated for this slice.
                      // For collapsed: use content height (stack cards are fixed-size).
                      // For expanded: stretch to fill the full slot so no blank space appears.
                      const collapsedHeight = getClusterCollapsedHeight(slice.items)
                      const slotHeight = Math.max(temporalSpan - GRID_CONSTANTS.VERTICAL_GAP * 2, 0)
                      const visualHeight = isExpanded
                        ? Math.max(getClusterExpandedHeight(slice.items), slotHeight)
                        : collapsedHeight

                      const visualTop = top + GRID_CONSTANTS.VERTICAL_GAP

                      return (
                        <div
                          key={slice.id}
                          className="absolute inset-x-0 z-10 overflow-visible px-1"
                          style={{
                            top: `${visualTop}px`,
                            height: `${visualHeight}px`,
                          }}
                        >
                          <OverlapCluster
                            slice={slice}
                            isExpanded={isExpanded}
                            visibleIndex={visibleIndex}
                            rotationTick={rotationTick}
                            onToggle={() => toggleCluster(slice.id)}
                            onHoverChange={(hovered) => setClusterHovered(slice.id, hovered)}
                            onItemClick={onItemClick}
                          />
                        </div>
                      )
                    }

                    // Solo slice: stretch the card to fill the temporal slot allocated
                    // by the timeline. This makes a 135min block visually taller than
                    // a 90min block, accurately conveying duration at a glance.
                    const item = slice.items[0]
                    const minHeight = getSoloSliceHeight(item)
                    const slotHeight = Math.max(temporalSpan - GRID_CONSTANTS.VERTICAL_GAP * 2, 0)
                    const visualHeight = Math.max(minHeight, slotHeight)
                    const visualTop = top + GRID_CONSTANTS.VERTICAL_GAP

                    return (
                      <div
                        key={slice.id}
                        className="absolute z-10 overflow-visible px-1"
                        style={{
                          top: `${visualTop}px`,
                          left: 0,
                          right: 0,
                          height: `${visualHeight}px`,
                        }}
                      >
                        <ScheduleCard
                          item={item}
                          isContinuation={slice.isContinuation}
                          className="h-full w-full border-border/60 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)]"
                          onClick={onItemClick}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
