import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import type { NormalizedSchedule, TimeRange, TimeRow } from "../domain/types"
import { resolveGroupColorToken } from "./groupColorTokens"
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
const EXPANDED_STACK_ITEM_HEIGHT = 78
const EXPANDED_STACK_GAP = 8

interface OverlapCluster {
  id: string
  day: number
  startMin: number
  endMin: number
  schedules: NormalizedSchedule[]
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

interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
}

export function WeeklyScheduleGrid({ schedules, rows, timeRange }: WeeklyScheduleGridProps) {
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({})

  const overlapClusters = useMemo(() => buildOverlapClusters(schedules), [schedules])
  const clusteredScheduleIds = useMemo(
    () => new Set(overlapClusters.flatMap((cluster) => cluster.schedules.map((schedule) => schedule.scheduleId))),
    [overlapClusters]
  )

  const extraOffsetForMinute = (minute: number) => {
    return overlapClusters.reduce((acc, cluster) => {
      if (!expandedClusters[cluster.id]) return acc
      if (cluster.endMin > minute) return acc

      const extraHeight =
        cluster.schedules.length * EXPANDED_STACK_ITEM_HEIGHT +
        Math.max(cluster.schedules.length - 1, 0) * EXPANDED_STACK_GAP

      return acc + extraHeight
    }, 0)
  }

  const totalMinutes = Math.max(timeRange.endMin - timeRange.startMin, 60)
  const expandedExtraHeight = overlapClusters.reduce((acc, cluster) => {
    if (!expandedClusters[cluster.id]) return acc
    return (
      acc +
      cluster.schedules.length * EXPANDED_STACK_ITEM_HEIGHT +
      Math.max(cluster.schedules.length - 1, 0) * EXPANDED_STACK_GAP
    )
  }, 0)
  const contentHeight = Math.max(totalMinutes * PX_PER_MINUTE + expandedExtraHeight, 220)

  const schedulesByDay = DAYS.reduce<Record<number, NormalizedSchedule[]>>((acc, day) => {
    acc[day.value] = schedules.filter((schedule) => schedule.day === day.value)
    return acc
  }, {})

  const clustersByDay = DAYS.reduce<Record<number, OverlapCluster[]>>((acc, day) => {
    acc[day.value] = overlapClusters.filter((cluster) => cluster.day === day.value)
    return acc
  }, {} as Record<number, OverlapCluster[]>)

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((current) => ({
      ...current,
      [clusterId]: !current[clusterId],
    }))
  }

  return (
    <div className="h-full max-h-full overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-full max-h-full overflow-x-auto overflow-y-auto">
        <div className="min-w-[640px] lg:min-w-0">
          <div className="grid grid-cols-6 border-b border-border/80 bg-muted/35">
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="border-r border-border/80 px-2 py-2 text-xs font-semibold last:border-r-0 md:px-3 md:py-3"
              >
                {day.label}
              </div>
            ))}
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ height: `${contentHeight}px` }}
            >
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="absolute inset-x-0 border-t-2 border-border/70"
                  style={{
                    top: `${(row.startMin - timeRange.startMin) * PX_PER_MINUTE + extraOffsetForMinute(row.startMin)}px`,
                  }}
                >
                  <span className="absolute -top-2 left-1.5 rounded-md border border-border/45 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 shadow-sm backdrop-blur-[0.5px]">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6">
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="relative border-r border-border/80 last:border-r-0"
                  style={{ height: `${contentHeight}px` }}
                >
                  {clustersByDay[day.value].map((cluster) => {
                    const isExpanded = Boolean(expandedClusters[cluster.id])
                    const top =
                      (cluster.startMin - timeRange.startMin) * PX_PER_MINUTE +
                      extraOffsetForMinute(cluster.startMin)
                    const baseHeight = Math.max(
                      (cluster.endMin - cluster.startMin) * PX_PER_MINUTE,
                      44
                    )
                    const extraHeight = isExpanded
                      ? cluster.schedules.length * EXPANDED_STACK_ITEM_HEIGHT +
                        Math.max(cluster.schedules.length - 1, 0) * EXPANDED_STACK_GAP
                      : 0
                    const colors = cluster.schedules
                      .map((item) => item.colorIndex)
                      .filter((value, index, array) => array.indexOf(value) === index)
                    const colorTokens = colors.map((colorIndex) => resolveGroupColorToken(colorIndex))

                    return (
                      <div
                        key={cluster.id}
                        className="absolute inset-x-0 z-10 px-1"
                        style={{
                          top: `${top}px`,
                          height: `${baseHeight + extraHeight}px`,
                        }}
                      >
                        {isExpanded ? (
                          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background/92 shadow-sm">
                            <div className="flex h-1.5 w-full overflow-hidden">
                              {colorTokens.map((token, index) => (
                                <span
                                  key={`${cluster.id}-expanded-color-${index + 1}`}
                                  className="h-full flex-1"
                                  style={{ backgroundColor: token.badgeStyle.backgroundColor }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCluster(cluster.id)}
                              className="absolute top-2 right-2 z-10 inline-flex size-6 items-center justify-center rounded-md border border-border/35 bg-background/55 text-foreground/55 shadow-sm transition hover:bg-background/80 hover:text-foreground/75"
                              aria-label="Colapsar solapamiento"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <div className="space-y-2 p-2 pt-2">
                              {cluster.schedules.map((schedule) => (
                                <div
                                  key={schedule.scheduleId}
                                  className="h-[78px] overflow-hidden"
                                >
                                  <ScheduleBlock schedule={schedule} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleCluster(cluster.id)}
                            className="relative flex h-full w-full overflow-hidden rounded-xl border border-border/60 bg-background/92 text-left shadow-sm transition hover:scale-[1.01] hover:border-primary/50"
                          >
                            <div className="absolute inset-x-0 top-0 flex h-1.5 overflow-hidden">
                              {colorTokens.map((token, index) => (
                                <span
                                  key={`${cluster.id}-collapsed-color-${index + 1}`}
                                  className="h-full flex-1"
                                  style={{ backgroundColor: token.badgeStyle.backgroundColor }}
                                />
                              ))}
                            </div>
                            <div className="flex h-full w-full items-center justify-between px-3 py-2 pt-3">
                              <span className="text-[11px] font-semibold text-foreground">
                                {cluster.schedules.length} horarios superpuestos
                              </span>
                              <ChevronDown className="size-3.5 shrink-0 text-foreground/70" />
                            </div>
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {schedulesByDay[day.value].map((schedule) => {
                    if (clusteredScheduleIds.has(schedule.scheduleId)) {
                      return null
                    }

                    const top = (schedule.startMin - timeRange.startMin) * PX_PER_MINUTE
                    const adjustedTop = top + extraOffsetForMinute(schedule.startMin)
                    const height = Math.max(
                      (schedule.endMin - schedule.startMin) * PX_PER_MINUTE,
                      14
                    )
                    const width = 100 / schedule.laneCount
                    const left = schedule.laneIndex * width

                    return (
                      <div
                        key={schedule.scheduleId}
                        className="absolute z-10 overflow-hidden p-0.5"
                        style={{
                          top: `${adjustedTop}px`,
                          height: `${Math.max(height, 14)}px`,
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                      >
                        <ScheduleBlock schedule={schedule} />
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
