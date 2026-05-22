import { useEffect, useMemo, useState } from "react"
import type { NormalizedSchedule, TimeRange, TimeRow } from "../domain/types"
import { ScheduleBlock } from "./ScheduleBlock"

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
] as const

const PX_PER_MINUTE = 0.95
const DEFAULT_OVERLAP_ROTATION_INTERVAL_MS = 5000
const SINGLE_SCHEDULE_MIN_HEIGHT = 88
const COLLAPSED_STACK_MIN_HEIGHT = 100
const COLLAPSED_STACK_PREVIEW_COUNT = 2
const COLLAPSED_STACK_PREVIEW_HEIGHT = 28
const COLLAPSED_STACK_PREVIEW_TOP_OFFSET = 9
const COLLAPSED_STACK_PREVIEW_SIDE_OFFSET = 8
const COLLAPSED_STACK_FRONT_TOP_OFFSET = 18
const COLLAPSED_STACK_FRONT_SIDE_OFFSET = 6
const COLLAPSED_STACK_FRONT_BOTTOM_OFFSET = 0
const EXPANDED_STACK_ITEM_HEIGHT = 88
const EXPANDED_STACK_GAP = 8
const EXPANDED_STACK_VERTICAL_PADDING = 8
const EXPANDED_STACK_HEADER_HEIGHT = 28

interface OverlapCluster {
  id: string
  day: number
  startMin: number
  endMin: number
  schedules: NormalizedSchedule[]
}

interface TimelineBand {
  id: string
  startMin: number
  endMin: number
  density: number
}

interface TimelineSegment {
  startMin: number
  endMin: number
  density: number
  height: number
}

function buildOverlapClusters(schedules: NormalizedSchedule[]): OverlapCluster[] {
  const byDay = new Map<number, NormalizedSchedule[]>()

  schedules.forEach((schedule) => {
    const items = byDay.get(schedule.day) ?? []
    items.push(schedule)
    byDay.set(schedule.day, items)
  })

  const clusters: OverlapCluster[] = []

  byDay.forEach((daySchedules, day) => {
    const sorted = [...daySchedules].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
    let current: NormalizedSchedule[] = []
    let currentEnd = -1

    sorted.forEach((schedule) => {
      if (current.length === 0) {
        current = [schedule]
        currentEnd = schedule.endMin
        return
      }

      if (schedule.startMin < currentEnd) {
        current.push(schedule)
        currentEnd = Math.max(currentEnd, schedule.endMin)
        return
      }

      if (current.length > 1) {
        const startMin = Math.min(...current.map((item) => item.startMin))
        const endMin = Math.max(...current.map((item) => item.endMin))
        clusters.push({
          id: `${day}-${startMin}-${endMin}-${current.map((item) => item.scheduleId).join("-")}`,
          day,
          startMin,
          endMin,
          schedules: current,
        })
      }

      current = [schedule]
      currentEnd = schedule.endMin
    })

    if (current.length > 1) {
      const startMin = Math.min(...current.map((item) => item.startMin))
      const endMin = Math.max(...current.map((item) => item.endMin))
      clusters.push({
        id: `${day}-${startMin}-${endMin}-${current.map((item) => item.scheduleId).join("-")}`,
        day,
        startMin,
        endMin,
        schedules: current,
      })
    }
  })

  return clusters.sort((a, b) => a.startMin - b.startMin || a.day - b.day)
}

function getCollapsedClusterHeight(cluster: OverlapCluster) {
  const previewCount = Math.min(cluster.schedules.length - 1, COLLAPSED_STACK_PREVIEW_COUNT)
  const frontCardHeight = Math.max(
    (cluster.endMin - cluster.startMin) * PX_PER_MINUTE,
    SINGLE_SCHEDULE_MIN_HEIGHT
  )
  const footprint =
    frontCardHeight +
    COLLAPSED_STACK_FRONT_TOP_OFFSET +
    COLLAPSED_STACK_FRONT_BOTTOM_OFFSET +
    previewCount * COLLAPSED_STACK_PREVIEW_TOP_OFFSET

  return Math.max(footprint, COLLAPSED_STACK_MIN_HEIGHT)
}

function getExpandedClusterHeight(cluster: OverlapCluster) {
  return (
    EXPANDED_STACK_VERTICAL_PADDING * 2 +
    EXPANDED_STACK_HEADER_HEIGHT +
    cluster.schedules.length * EXPANDED_STACK_ITEM_HEIGHT +
    Math.max(cluster.schedules.length - 1, 0) * EXPANDED_STACK_GAP
  )
}

function getSingleScheduleHeight(schedule: NormalizedSchedule) {
  return Math.max(schedule.durationMin * PX_PER_MINUTE, SINGLE_SCHEDULE_MIN_HEIGHT)
}

function getTemporalMidpointPosition(
  startMin: number,
  endMin: number,
  getMinutePosition: (minute: number) => number
) {
  return getMinutePosition(startMin + (endMin - startMin) / 2)
}

interface SubSegment {
  segment: TimelineSegment
  scheduleStartMin: number
  scheduleEndMin: number
  overlapRatio: number
  relativeTop: number
}

function getSubSegmentsForSchedule(
  schedule: NormalizedSchedule,
  segments: TimelineSegment[]
): SubSegment[] {
  const subSegments: SubSegment[] = []

  segments.forEach((segment) => {
    const segStart = segment.startMin
    const segEnd = segment.endMin
    const schedStart = schedule.startMin
    const schedEnd = schedule.endMin

    const overlapStart = Math.max(segStart, schedStart)
    const overlapEnd = Math.min(segEnd, schedEnd)

    if (overlapEnd <= overlapStart) {
      return
    }

    const overlapDuration = overlapEnd - overlapStart
    const segmentDuration = segEnd - segStart

    const overlapRatio = segmentDuration > 0 ? overlapDuration / segmentDuration : 0

    const relativeTop = schedStart - segStart
    subSegments.push({
      segment,
      scheduleStartMin: overlapStart,
      scheduleEndMin: overlapEnd,
      overlapRatio: Math.min(overlapRatio, 1),
      relativeTop: Math.max(relativeTop, 0),
    })
  })

  return subSegments
}

function buildTimelineBands(
  clusters: OverlapCluster[],
  expandedClusters: Record<string, boolean>,
  schedules: NormalizedSchedule[],
  clusteredScheduleIds: Set<string>
): TimelineBand[] {
  const clusterBands = clusters.map((cluster) => {
    const duration = Math.max(cluster.endMin - cluster.startMin, 1)
    const requiredHeight = expandedClusters[cluster.id]
      ? getExpandedClusterHeight(cluster)
      : getCollapsedClusterHeight(cluster)

    return {
      id: cluster.id,
      startMin: cluster.startMin,
      endMin: cluster.endMin,
      density: Math.max(requiredHeight / duration, PX_PER_MINUTE),
    }
  })

  const singleScheduleBands = schedules
    .filter((schedule) => !clusteredScheduleIds.has(schedule.scheduleId))
    .map((schedule) => ({
      id: schedule.scheduleId,
      startMin: schedule.startMin,
      endMin: schedule.endMin,
      density: Math.max(
        getSingleScheduleHeight(schedule) / Math.max(schedule.durationMin, 1),
        PX_PER_MINUTE
      ),
    }))

  return [...clusterBands, ...singleScheduleBands]
}

function buildTimelineSegments(bands: TimelineBand[], timeRange: TimeRange): TimelineSegment[] {
  const boundaries = Array.from(
    new Set([
      timeRange.startMin,
      timeRange.endMin,
      ...bands.flatMap((band) => [band.startMin, band.endMin]),
    ])
  ).sort((a, b) => a - b)

  if (boundaries.length < 2) {
    return []
  }

  const segments: TimelineSegment[] = []

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMin = boundaries[index]
    const endMin = boundaries[index + 1]
    const duration = endMin - startMin

    if (duration <= 0) continue

    const activeBands = bands.filter((band) => band.startMin < endMin && band.endMin > startMin)
    const density = activeBands.reduce(
      (maxDensity, band) => Math.max(maxDensity, band.density),
      PX_PER_MINUTE
    )

    segments.push({
      startMin,
      endMin,
      density,
      height: duration * density,
    })
  }

  return segments
}

interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
  overlapRotationIntervalMs?: number
}

interface ScheduleSegmentRendererProps {
  schedule: NormalizedSchedule
  segments: TimelineSegment[]
  isCompact?: boolean
  isExpanded?: boolean
  rotationTick?: number
}

function ScheduleSegmentRenderer({
  schedule,
  segments,
  isCompact = false,
  isExpanded = false,
  rotationTick = 0,
}: ScheduleSegmentRendererProps) {
  const subSegments = useMemo(
    () => getSubSegmentsForSchedule(schedule, segments),
    [schedule, segments]
  )

  if (subSegments.length === 0) {
    return null
  }

  const totalSegmentHeight = subSegments.reduce((acc, sub) => acc + sub.segment.height, 0)

  return (
    <div
      className="relative flex w-full items-center justify-center p-1"
      style={{ height: isCompact || !isExpanded ? `${totalSegmentHeight}px` : undefined }}
    >
      <div
        key={`${schedule.scheduleId}-${rotationTick}`}
        className={
          isExpanded
            ? "max-w-full overflow-hidden rounded-lg"
            : isCompact
              ? "animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 w-full max-w-full overflow-hidden rounded-lg duration-500"
              : "w-full overflow-hidden rounded-lg"
        }
        style={isExpanded ? { height: "88px" } : undefined}
      >
        <ScheduleBlock schedule={schedule} compact={isCompact} className="h-full" />
      </div>
    </div>
  )
}

export function WeeklyScheduleGrid({
  schedules,
  rows,
  timeRange,
  overlapRotationIntervalMs = DEFAULT_OVERLAP_ROTATION_INTERVAL_MS,
}: WeeklyScheduleGridProps) {
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({})
  const [hoveredClusters, setHoveredClusters] = useState<Record<string, boolean>>({})
  const [visibleScheduleIndexByCluster, setVisibleScheduleIndexByCluster] = useState<
    Record<string, number>
  >({})
  const [rotationTickByCluster, setRotationTickByCluster] = useState<Record<string, number>>({})

  const overlapClusters = useMemo(() => buildOverlapClusters(schedules), [schedules])
  const clusteredScheduleIds = useMemo(
    () =>
      new Set(
        overlapClusters.flatMap((cluster) =>
          cluster.schedules.map((schedule) => schedule.scheduleId)
        )
      ),
    [overlapClusters]
  )

  const timelineBands = useMemo(
    () => buildTimelineBands(overlapClusters, expandedClusters, schedules, clusteredScheduleIds),
    [clusteredScheduleIds, expandedClusters, overlapClusters, schedules]
  )

  const timelineSegments = useMemo(
    () => buildTimelineSegments(timelineBands, timeRange),
    [timeRange, timelineBands]
  )

  useEffect(() => {
    if (overlapRotationIntervalMs <= 0 || overlapClusters.length === 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setVisibleScheduleIndexByCluster((current) => {
        let changed = false
        const next = { ...current }
        const rotatedClusterIds: string[] = []

        overlapClusters.forEach((cluster) => {
          if (cluster.schedules.length <= 1) return

          if (hoveredClusters[cluster.id]) {
            return
          }

          next[cluster.id] = ((current[cluster.id] ?? 0) + 1) % cluster.schedules.length
          changed = true
          rotatedClusterIds.push(cluster.id)
        })

        if (rotatedClusterIds.length > 0) {
          setRotationTickByCluster((currentTicks) => {
            const nextTicks = { ...currentTicks }
            rotatedClusterIds.forEach((clusterId) => {
              nextTicks[clusterId] = (currentTicks[clusterId] ?? 0) + 1
            })
            return nextTicks
          })
        }

        return changed ? next : current
      })
    }, overlapRotationIntervalMs)

    return () => window.clearInterval(timer)
  }, [hoveredClusters, overlapClusters, overlapRotationIntervalMs])

  const getMinutePosition = (minute: number) => {
    const basePosition = (minute - timeRange.startMin) * PX_PER_MINUTE

    const adaptiveOffset = timelineSegments.reduce((offset, segment) => {
      if (minute >= segment.endMin) {
        return offset + segment.height - (segment.endMin - segment.startMin) * PX_PER_MINUTE
      }

      if (minute > segment.startMin) {
        return (
          offset +
          (minute - segment.startMin) * segment.density -
          (minute - segment.startMin) * PX_PER_MINUTE
        )
      }

      return offset
    }, 0)

    return basePosition + adaptiveOffset
  }

  const contentHeight = Math.max(
    timelineSegments.reduce((acc, segment) => acc + segment.height, 0),
    220
  )

  const schedulesByDay = DAYS.reduce<Record<number, NormalizedSchedule[]>>((acc, day) => {
    acc[day.value] = schedules.filter((schedule) => schedule.day === day.value)
    return acc
  }, {})

  const clustersByDay = DAYS.reduce<Record<number, OverlapCluster[]>>(
    (acc, day) => {
      acc[day.value] = overlapClusters.filter((cluster) => cluster.day === day.value)
      return acc
    },
    {} as Record<number, OverlapCluster[]>
  )

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((current) => ({
      ...current,
      [clusterId]: !current[clusterId],
    }))
  }

  const setClusterHovered = (clusterId: string, isHovered: boolean) => {
    setHoveredClusters((current) => ({
      ...current,
      [clusterId]: isHovered,
    }))
  }

  return (
    <div className="h-full max-h-full overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-full max-h-full overflow-x-auto overflow-y-auto">
        <div className="min-w-[640px] lg:min-w-0">
          <div className="grid grid-cols-6 border-b-[3px] border-grid-line bg-muted/35">
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="border-r-[3px] border-grid-line px-2 py-2 text-xs font-semibold last:border-r-0 md:px-3 md:py-3"
              >
                {day.label}
              </div>
            ))}
          </div>

          <div className="relative border-b-[3px] border-grid-line">
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ height: `${contentHeight}px` }}
            >
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="absolute inset-x-0 border-t-[3px] border-grid-line"
                  style={{ top: `${getMinutePosition(row.startMin)}px` }}
                >
                  <span className="absolute left-1.5 -translate-y-1/2 rounded-md border border-grid-line/75 bg-background/78 px-1.5 py-0.5 text-[10px] font-medium text-foreground/85 shadow-sm backdrop-blur-[0.5px]">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6">
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="relative border-r-[3px] border-grid-line last:border-r-0"
                  style={{ height: `${contentHeight}px` }}
                >
                  {clustersByDay[day.value].map((cluster) => {
                    const isExpanded = Boolean(expandedClusters[cluster.id])
                    const temporalTop = getMinutePosition(cluster.startMin)
                    const temporalBottom = getMinutePosition(cluster.endMin)
                    const temporalSpanHeight = temporalBottom - temporalTop
                    const visualHeight = isExpanded
                      ? getExpandedClusterHeight(cluster)
                      : getCollapsedClusterHeight(cluster)
                    const shouldCenter = temporalSpanHeight > visualHeight
                    const temporalMidpoint = getTemporalMidpointPosition(
                      cluster.startMin,
                      cluster.endMin,
                      getMinutePosition
                    )
                    const visualTop = shouldCenter
                      ? temporalMidpoint - visualHeight / 2
                      : temporalTop
                    const slotTop = Math.min(temporalTop, visualTop)
                    const slotHeight = Math.max(temporalBottom, visualTop + visualHeight) - slotTop
                    const visualOffset = visualTop - slotTop
                    const visibleScheduleIndex =
                      (visibleScheduleIndexByCluster[cluster.id] ?? 0) % cluster.schedules.length
                    const visibleSchedule = cluster.schedules[visibleScheduleIndex]
                    const rotationTick = rotationTickByCluster[cluster.id] ?? 0
                    const stackPreviewSchedules = Array.from(
                      {
                        length: Math.min(
                          cluster.schedules.length - 1,
                          COLLAPSED_STACK_PREVIEW_COUNT
                        ),
                      },
                      (_, index) => {
                        return cluster.schedules[
                          (visibleScheduleIndex + index + 1) % cluster.schedules.length
                        ]
                      }
                    )
                    const visibleScheduleHeight = getSingleScheduleHeight(visibleSchedule)
                    const frontCardHeight = visibleScheduleHeight

                    return (
                      <div
                        key={cluster.id}
                        className="absolute inset-x-1 z-10 overflow-visible"
                        style={{ top: `${slotTop}px`, height: `${slotHeight}px` }}
                      >
                        <div
                          className="absolute inset-x-0 overflow-visible p-1"
                          style={{ top: `${visualOffset}px`, height: `${visualHeight}px` }}
                        >
                          {isExpanded ? (
                            <div className="relative h-full w-full rounded-2xl border-2 border-border/85 bg-background/45 p-2 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)]">
                              <div className="absolute inset-x-2 top-2 z-30 flex items-center justify-between gap-2">
                                <div className="text-[10px] font-medium text-foreground/70">
                                  {cluster.schedules.length} horarios
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleCluster(cluster.id)}
                                  className="rounded-full bg-background/35 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground/50 backdrop-blur-sm transition hover:bg-background/55 hover:text-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  aria-label={`Colapsar ${cluster.schedules.length} horarios superpuestos`}
                                >
                                  Cerrar
                                </button>
                              </div>

                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 pt-7">
                                {cluster.schedules.map((schedule) => (
                                  <ScheduleSegmentRenderer
                                    key={schedule.scheduleId}
                                    schedule={schedule}
                                    segments={timelineSegments}
                                    isCompact={false}
                                    isExpanded={true}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleCluster(cluster.id)}
                              onMouseEnter={() => setClusterHovered(cluster.id, true)}
                              onMouseLeave={() => setClusterHovered(cluster.id, false)}
                              className="group relative flex h-full w-full items-start justify-start overflow-visible rounded-lg p-0 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-label={`Expandir ${cluster.schedules.length} horarios superpuestos`}
                            >
                              {stackPreviewSchedules
                                .slice()
                                .reverse()
                                .map((previewSchedule, index) => (
                                  <div
                                    key={`${cluster.id}-preview-${previewSchedule.scheduleId}`}
                                    className="pointer-events-none absolute z-0 overflow-hidden rounded-lg shadow-[0_16px_26px_-20px_rgba(15,23,42,0.55)] transition-transform duration-300 group-hover:-translate-y-0.5"
                                    style={{
                                      top: `${index * COLLAPSED_STACK_PREVIEW_TOP_OFFSET}px`,
                                      left: `${(index + 1) * COLLAPSED_STACK_PREVIEW_SIDE_OFFSET}px`,
                                      right: `${(index + 1) * COLLAPSED_STACK_PREVIEW_SIDE_OFFSET}px`,
                                      height: `${COLLAPSED_STACK_PREVIEW_HEIGHT}px`,
                                      opacity: 0.92 - index * 0.18,
                                      transform: `scale(${1 - index * 0.03})`,
                                    }}
                                  >
                                    <ScheduleBlock
                                      schedule={previewSchedule}
                                      mode="peek"
                                      className="h-full border-border/55 shadow-none"
                                    />
                                  </div>
                                ))}

                              <div className="pointer-events-none absolute right-2 top-2 z-30 flex items-center gap-1 rounded-full border border-border/20 bg-background/18 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/45 shadow-sm backdrop-blur-[1px]">
                                <span>
                                  {visibleScheduleIndex + 1}/{cluster.schedules.length}
                                </span>
                              </div>

                              <div
                                className="absolute z-20 overflow-visible rounded-lg"
                                style={{
                                  top: `${COLLAPSED_STACK_FRONT_TOP_OFFSET}px`,
                                  right: `${COLLAPSED_STACK_FRONT_SIDE_OFFSET}px`,
                                  left: `${COLLAPSED_STACK_FRONT_SIDE_OFFSET}px`,
                                  height: `${frontCardHeight}px`,
                                }}
                              >
                                <div
                                  key={`${visibleSchedule.scheduleId}-${rotationTick}`}
                                  className="h-full animate-in fade-in-0 slide-in-from-top-2 zoom-in-95 duration-500"
                                >
                                  <ScheduleBlock
                                    schedule={visibleSchedule}
                                    compact={false}
                                    className="h-full border-border/60 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)]"
                                  />
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {schedulesByDay[day.value].map((schedule) => {
                    if (clusteredScheduleIds.has(schedule.scheduleId)) {
                      return null
                    }

                    const adjustedTop = getMinutePosition(schedule.startMin)
                    const temporalBottom = getMinutePosition(schedule.endMin)
                    const temporalSpanHeight = temporalBottom - adjustedTop
                    const visualHeight = getSingleScheduleHeight(schedule)
                    const shouldCenter = temporalSpanHeight > visualHeight
                    const temporalMidpoint = getTemporalMidpointPosition(
                      schedule.startMin,
                      schedule.endMin,
                      getMinutePosition
                    )
                    const visualTop = shouldCenter
                      ? temporalMidpoint - visualHeight / 2
                      : adjustedTop
                    const slotTop = Math.min(adjustedTop, visualTop)
                    const slotHeight = Math.max(temporalBottom, visualTop + visualHeight) - slotTop
                    const visualOffset = visualTop - slotTop
                    const width = 100 / schedule.laneCount
                    const left = schedule.laneIndex * width

                    return (
                      <div
                        key={schedule.scheduleId}
                        className="absolute z-10 overflow-visible"
                        style={{
                          top: `${slotTop}px`,
                          left: `${left}%`,
                          width: `${width}%`,
                          height: `${slotHeight}px`,
                        }}
                      >
                        <div
                          className="absolute inset-x-1 overflow-visible p-1"
                          style={{ top: `${visualOffset}px`, height: `${visualHeight}px` }}
                        >
                          <ScheduleBlock
                            schedule={schedule}
                            compact={false}
                            className="h-full border-border/60 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.7)]"
                          />
                        </div>
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
