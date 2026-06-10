import { WeeklyScheduleGrid as GlobalWeeklyScheduleGrid } from "@/components/ui/weekly-schedule-grid"
import type { NormalizedSchedule, TimeRange, TimeRow } from "../domain/types"
import type { ScheduleItem } from "@/components/ui/weekly-schedule-grid/types"

interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
  overlapRotationIntervalMs?: number
  onEditSchedule?: (schedule: NormalizedSchedule) => void
}

function toScheduleItem(schedule: NormalizedSchedule): ScheduleItem {
  return {
    id: schedule.scheduleId,
    day: schedule.day,
    startMin: schedule.startMin,
    endMin: schedule.endMin,
    durationMin: schedule.durationMin,
    title: schedule.materia,
    subtitle: schedule.ambienteLabel || undefined,
    badge: `G: ${schedule.grupo}`,
    colorIndex: schedule.colorIndex,
    meta: { schedule },
  }
}

export function WeeklyScheduleGrid({
  schedules,
  rows,
  timeRange,
  overlapRotationIntervalMs,
  onEditSchedule,
}: WeeklyScheduleGridProps) {
  const items: ScheduleItem[] = schedules.map(toScheduleItem)

  return (
    <GlobalWeeklyScheduleGrid
      items={items}
      rows={rows}
      timeRange={timeRange}
      overlapRotationIntervalMs={overlapRotationIntervalMs}
      onItemClick={
        onEditSchedule
          ? (item) => {
              const schedule = (item.meta as { schedule: NormalizedSchedule }).schedule
              onEditSchedule(schedule)
            }
          : undefined
      }
    />
  )
}
