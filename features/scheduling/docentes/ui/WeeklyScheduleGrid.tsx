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

interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
}

export function WeeklyScheduleGrid({ schedules, rows, timeRange }: WeeklyScheduleGridProps) {
  const totalMinutes = Math.max(timeRange.endMin - timeRange.startMin, 60)
  const contentHeight = Math.max(totalMinutes * PX_PER_MINUTE, 220)

  const schedulesByDay = DAYS.reduce<Record<number, NormalizedSchedule[]>>((acc, day) => {
    acc[day.value] = schedules.filter((schedule) => schedule.day === day.value)
    return acc
  }, {})

  return (
    <div className="h-full max-h-full overflow-hidden rounded-3xl border border-border bg-card">
      <div className="h-full max-h-full overflow-x-auto overflow-y-auto">
        <div className="min-w-[640px] lg:min-w-0">
          <div className="grid grid-cols-6 border-b border-border bg-muted/35">
            {DAYS.map((day) => (
              <div
                key={day.value}
                className="border-r border-border px-2 py-2 text-xs font-semibold last:border-r-0 md:px-3 md:py-3"
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
                  className="absolute inset-x-0 border-t-2 border-border/85"
                  style={{ top: `${(row.startMin - timeRange.startMin) * PX_PER_MINUTE}px` }}
                >
                  <span className="absolute -top-2.5 left-1.5 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] font-bold text-foreground shadow-sm backdrop-blur-[0.5px]">
                    {row.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-6">
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="relative border-r border-border/70 last:border-r-0"
                  style={{ height: `${contentHeight}px` }}
                >
                  {schedulesByDay[day.value].map((schedule) => {
                    const top = (schedule.startMin - timeRange.startMin) * PX_PER_MINUTE
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
                          top: `${top}px`,
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
