"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  buildRenderSlices,
  buildTimelineSegments,
  getMinutePosition,
  formatTime,
  getItemHeight,
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
  adminSchedules,
  isCompactMode = false,
}: WeeklyScheduleGridProps) {
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set())
  const [hoveredClusterIds, setHoveredClusterIds] = useState<Set<string>>(new Set())
  const [visibleIndexByCluster, setVisibleIndexByCluster] = useState<Record<string, number>>({})
  const [rotationTickByCluster, setRotationTickByCluster] = useState<Record<string, number>>({})
  const [activeTimeRange, setActiveTimeRange] = useState<{
    startMin: number
    endMin: number
    days?: number[]
  } | null>(null)

  // Build render slices (fractional overlap splitting)
  const renderSlices = useMemo(() => buildRenderSlices(items), [items])

  // For each time range (timeKey), calculate the max collapsed and expanded heights across all days.
  const maxHeightsByTimeKey = useMemo(() => {
    const map: Record<string, { collapsed: number; expanded: number; maxItemHeight: number }> = {}

    renderSlices.forEach((slice) => {
      if (slice.type !== "cluster") return
      const timeKey = `${slice.startMin}-${slice.endMin}`
      const collapsed = getClusterCollapsedHeight(slice.items)
      const expanded = getClusterExpandedHeight(slice.items)
      const maxItemHeight = Math.max(...slice.items.map(getItemHeight))

      if (!map[timeKey]) {
        map[timeKey] = { collapsed, expanded, maxItemHeight }
      } else {
        map[timeKey].collapsed = Math.max(map[timeKey].collapsed, collapsed)
        map[timeKey].expanded = Math.max(map[timeKey].expanded, expanded)
        map[timeKey].maxItemHeight = Math.max(map[timeKey].maxItemHeight, maxItemHeight)
      }
    })

    return map
  }, [renderSlices])

  // Build timeline segments (adaptive height)
  const timelineSegments = useMemo(
    () =>
      buildTimelineSegments(
        renderSlices,
        expandedClusterIds,
        timeRange,
        adminSchedules,
        isCompactMode
      ),
    [renderSlices, expandedClusterIds, timeRange, adminSchedules, isCompactMode]
  )

  const totalHeight = useMemo(
    () => timelineSegments.reduce((acc, seg) => acc + seg.height, 0) || 220,
    [timelineSegments]
  )

  // Helper to determine if a minute is inside a visible segment
  const isMinuteVisible = useCallback(
    (minute: number) => {
      if (timelineSegments.length === 0) return true
      return timelineSegments.some(
        (s) => s.density > 0 && minute >= s.startMin && minute <= s.endMin
      )
    },
    [timelineSegments]
  )

  // Helper to get pixel position from minute with an offset to avoid cutting off the top hour badge
  const offsetTop = 16
  const minuteToY = useCallback(
    (minute: number) => getMinutePosition(minute, timeRange, timelineSegments) + offsetTop,
    [timeRange, timelineSegments]
  )

  // Filter rows (hour markings) to only include visible/non-collapsed times
  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => isMinuteVisible(row.startMin))

    const result: typeof rows = []
    let lastY: number | null = null

    filtered.forEach((row) => {
      const y = minuteToY(row.startMin)
      if (lastY === null || Math.abs(y - lastY) >= 20) {
        result.push(row)
        lastY = y
      }
    })

    return result
  }, [rows, isMinuteVisible, minuteToY])

  // Collect all start/end minutes from classes and admin schedules (for compact mode)
  const activeHours = useMemo(() => {
    const mins = new Set<number>()
    items.forEach((item) => {
      mins.add(item.startMin)
      mins.add(item.endMin)
    })
    adminSchedules?.forEach((admin) => {
      mins.add(admin.startMin)
      mins.add(admin.endMin)
    })

    const sorted = Array.from(mins).sort((a, b) => a - b)

    // Apply distance filter to avoid overlapping labels (min 20px gap)
    const result: number[] = []
    let lastY: number | null = null

    sorted.forEach((minute) => {
      const y = minuteToY(minute)
      if (lastY === null || Math.abs(y - lastY) >= 20) {
        result.push(minute)
        lastY = y
      }
    })

    return result
  }, [items, adminSchedules, minuteToY])

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
          const timeKey = `${slice.startMin}-${slice.endMin}`
          if (expandedClusterIds.has(timeKey)) return
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

  const toggleCluster = (startMin: number, endMin: number) => {
    const timeKey = `${startMin}-${endMin}`
    setExpandedClusterIds((current) => {
      const next = new Set(current)
      if (next.has(timeKey)) next.delete(timeKey)
      else next.add(timeKey)
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
            className="sticky top-0 z-40 grid border-b-[2px] border-border bg-muted/90 backdrop-blur-[4px]"
            style={{ gridTemplateColumns: `60px repeat(${colCount}, minmax(0, 1fr))` }}
          >
            <div className="sticky left-0 z-50 border-r-[2px] border-border bg-muted px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:px-3 md:py-3 flex items-center justify-center">
              Hora
            </div>
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
              style={{ height: `${totalHeight + offsetTop}px` }}
            >
              {isCompactMode
                ? activeHours.map((minute) => (
                    <div
                      key={`compact-line-${minute}`}
                      className="absolute inset-x-0 border-t-[2px] border-border/60"
                      style={{ top: `${minuteToY(minute)}px` }}
                    />
                  ))
                : rows.map((row) => (
                    <div
                      key={row.key}
                      className="absolute inset-x-0 border-t-[2px] border-border/60"
                      style={{ top: `${minuteToY(row.startMin)}px` }}
                    />
                  ))}

              {/* Dynamic Hovered/Active Schedule Lines Highlight Overlay (Global) */}
              {activeTimeRange && !activeTimeRange.days && (
                <div className="absolute inset-0 transition-all duration-200">
                  {/* Highlight band overlay */}
                  <div
                    className="absolute inset-x-0 bg-primary/[0.08] dark:bg-primary/[0.14] transition-all duration-200"
                    style={{
                      top: `${minuteToY(activeTimeRange.startMin)}px`,
                      height: `${minuteToY(activeTimeRange.endMin) - minuteToY(activeTimeRange.startMin)}px`,
                    }}
                  />
                  {/* Start Line */}
                  <div
                    className="absolute inset-x-0 border-t-2 border-dashed border-primary/50 dark:border-primary/75 transition-all duration-200"
                    style={{ top: `${minuteToY(activeTimeRange.startMin)}px` }}
                  />
                  {/* End Line */}
                  <div
                    className="absolute inset-x-0 border-t-2 border-dashed border-primary/50 dark:border-primary/75 transition-all duration-200"
                    style={{ top: `${minuteToY(activeTimeRange.endMin)}px` }}
                  />
                </div>
              )}
            </div>

            {/* Hour labels are now rendered in the dedicated Hours column */}
            {/* Day columns */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `60px repeat(${colCount}, minmax(0, 1fr))` }}
            >
              {/* Dedicated sticky Hours column */}
              <div
                className="sticky left-0 z-30 border-r-[3px] border-border bg-card/95 backdrop-blur-[2px]"
                style={{ height: `${totalHeight + offsetTop}px` }}
              >
                {isCompactMode ? (
                  activeHours.map((minute) => {
                    const isStartActive = activeTimeRange && minute === activeTimeRange.startMin
                    const isEndActive = activeTimeRange && minute === activeTimeRange.endMin
                    const isActive = isStartActive || isEndActive

                    return (
                      <div
                        key={`compact-hour-${minute}`}
                        className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center px-1 z-10"
                        style={{ top: `${minuteToY(minute)}px` }}
                      >
                        <span
                          className={cn(
                            "rounded-md border px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200",
                            isActive
                              ? "bg-primary border-primary text-primary-foreground scale-105"
                              : "border-border/80 bg-background text-foreground"
                          )}
                        >
                          {formatTime(minute)}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <>
                    {visibleRows.map((row) => {
                      const isStartActive =
                        activeTimeRange && row.startMin === activeTimeRange.startMin
                      const isEndActive = activeTimeRange && row.startMin === activeTimeRange.endMin
                      const isActive = isStartActive || isEndActive

                      return (
                        <div
                          key={row.key}
                          className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center px-1"
                          style={{ top: `${minuteToY(row.startMin)}px` }}
                        >
                          <span
                            className={cn(
                              "rounded-md border px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200",
                              isActive
                                ? "bg-primary border-primary text-primary-foreground scale-105"
                                : "border-border/80 bg-background text-foreground"
                            )}
                          >
                            {row.label}
                          </span>
                        </div>
                      )
                    })}
                    {rows.length > 0 &&
                      isMinuteVisible(timeRange.endMin) &&
                      (() => {
                        const endY = minuteToY(timeRange.endMin)
                        const overlaps = visibleRows.some(
                          (row) => Math.abs(minuteToY(row.startMin) - endY) < 20
                        )
                        if (overlaps) return null

                        const isStartActive =
                          activeTimeRange && timeRange.endMin === activeTimeRange.startMin
                        const isEndActive =
                          activeTimeRange && timeRange.endMin === activeTimeRange.endMin
                        const isActive = isStartActive || isEndActive

                        return (
                          <div
                            className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center px-1"
                            style={{ top: `${endY}px` }}
                          >
                            <span
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200",
                                isActive
                                  ? "bg-primary border-primary text-primary-foreground scale-105"
                                  : "border-border/80 bg-background text-foreground"
                              )}
                            >
                              {formatTime(timeRange.endMin)}
                            </span>
                          </div>
                        )
                      })()}

                    {/* Admin hours labels in Hours column */}
                    {adminSchedules?.map((admin) => {
                      const showStart = isMinuteVisible(admin.startMin)
                      const showEnd = isMinuteVisible(admin.endMin)
                      if (!showStart && !showEnd) return null

                      const startY = minuteToY(admin.startMin)
                      const endY = minuteToY(admin.endMin)

                      const isStartOverlapping = visibleRows.some(
                        (row) => Math.abs(minuteToY(row.startMin) - startY) < 20
                      )
                      const isEndOverlapping = visibleRows.some(
                        (row) => Math.abs(minuteToY(row.startMin) - endY) < 20
                      )

                      const isStartActive =
                        activeTimeRange && admin.startMin === activeTimeRange.startMin
                      const isEndActive = activeTimeRange && admin.endMin === activeTimeRange.endMin

                      return (
                        <div key={`admin-label-${admin.id}`}>
                          {/* Start Hour */}
                          {showStart && !isStartOverlapping && (
                            <div
                              className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center px-1 z-10"
                              style={{ top: `${startY}px` }}
                            >
                              <span
                                className={cn(
                                  "rounded-md border px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200",
                                  isStartActive
                                    ? "bg-primary border-primary text-primary-foreground scale-105"
                                    : "border-border/80 bg-background text-foreground"
                                )}
                              >
                                {formatTime(admin.startMin)}
                              </span>
                            </div>
                          )}
                          {/* End Hour */}
                          {showEnd && !isEndOverlapping && (
                            <div
                              className="absolute inset-x-0 -translate-y-1/2 flex items-center justify-center px-1 z-10"
                              style={{ top: `${endY}px` }}
                            >
                              <span
                                className={cn(
                                  "rounded-md border px-2 py-1 text-[11px] font-bold shadow-md transition-all duration-200",
                                  isEndActive
                                    ? "bg-primary border-primary text-primary-foreground scale-105"
                                    : "border-border/80 bg-background text-foreground"
                                )}
                              >
                                {formatTime(admin.endMin)}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {days.map((day) => (
                <div
                  key={day.value}
                  className="relative border-r-[3px] border-border last:border-r-0"
                  style={{ height: `${totalHeight + offsetTop}px` }}
                >
                  {/* Dynamic Hovered/Active Schedule Highlight for this column */}
                  {activeTimeRange &&
                    activeTimeRange.days &&
                    activeTimeRange.days.includes(day.value) && (
                      <div className="absolute inset-0 pointer-events-none z-[2]">
                        <div
                          className="absolute inset-x-0 bg-primary/[0.08] dark:bg-primary/[0.14] transition-all duration-200"
                          style={{
                            top: `${minuteToY(activeTimeRange.startMin)}px`,
                            height: `${minuteToY(activeTimeRange.endMin) - minuteToY(activeTimeRange.startMin)}px`,
                          }}
                        />
                        <div
                          className="absolute inset-x-0 border-t-2 border-dashed border-primary/50 dark:border-primary/75 transition-all duration-200"
                          style={{ top: `${minuteToY(activeTimeRange.startMin)}px` }}
                        />
                        <div
                          className="absolute inset-x-0 border-t-2 border-dashed border-primary/50 dark:border-primary/75 transition-all duration-200"
                          style={{ top: `${minuteToY(activeTimeRange.endMin)}px` }}
                        />
                      </div>
                    )}

                  {/* Administrative schedule background bands */}
                  {adminSchedules
                    ?.filter((admin) => admin.days.includes(day.value))
                    .map((admin) => {
                      const top = minuteToY(admin.startMin)
                      const bottom = minuteToY(admin.endMin)
                      const height = Math.max(bottom - top, 0)
                      return (
                        <div
                          key={`admin-${admin.id}`}
                          className="absolute inset-x-0 z-[1] pointer-events-auto cursor-default transition-all duration-200 bg-blue-500/[0.14] dark:bg-blue-400/[0.05] hover:bg-blue-500/[0.2] dark:hover:bg-blue-400/[0.08] border-y border-dashed border-blue-500/10 dark:border-blue-400/10"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                          }}
                          onMouseEnter={() =>
                            setActiveTimeRange({
                              startMin: admin.startMin,
                              endMin: admin.endMin,
                              days: admin.days,
                            })
                          }
                          onMouseLeave={() => setActiveTimeRange(null)}
                        />
                      )
                    })}

                  {slicesByDay[day.value]?.map((slice) => {
                    const top = minuteToY(slice.startMin)
                    const bottom = minuteToY(slice.endMin)
                    const temporalSpan = bottom - top

                    if (slice.type === "cluster") {
                      const timeKey = `${slice.startMin}-${slice.endMin}`
                      const isExpanded = expandedClusterIds.has(timeKey)
                      const visibleIndex = visibleIndexByCluster[slice.id] ?? 0
                      const rotationTick = rotationTickByCluster[slice.id] ?? 0

                      // Determine the visual height based on collapsed or expanded state across all days for this time key.
                      const maxHeights = maxHeightsByTimeKey[timeKey] ?? {
                        collapsed: getClusterCollapsedHeight(slice.items),
                        expanded: getClusterExpandedHeight(slice.items),
                      }
                      const slotHeight = Math.max(temporalSpan - GRID_CONSTANTS.VERTICAL_GAP * 2, 0)
                      const visualHeight = isExpanded
                        ? maxHeights.expanded
                        : Math.max(maxHeights.collapsed, slotHeight)

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
                            maxItemHeight={maxHeights.maxItemHeight}
                            onToggle={() => toggleCluster(slice.startMin, slice.endMin)}
                            onHoverChange={(hovered) => setClusterHovered(slice.id, hovered)}
                            onItemClick={onItemClick}
                            onHoverTimeRangeChange={setActiveTimeRange}
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
                          onHoverTimeRangeChange={setActiveTimeRange}
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
