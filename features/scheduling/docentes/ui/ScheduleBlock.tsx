import { ScheduleCard } from "@/components/ui/weekly-schedule-grid/schedule-card"
import type { NormalizedSchedule } from "../domain/types"

interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  mode?: "full" | "peek" | "compact"
  className?: string
  onClick?: (schedule: NormalizedSchedule) => void
}

function normalizedToItem(schedule: NormalizedSchedule) {
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

export function ScheduleBlock({
  schedule,
  compact = false,
  mode = "full",
  className,
  onClick,
}: ScheduleBlockProps) {
  const item = normalizedToItem(schedule)
  const cardMode = mode === "peek" ? "peek" : compact ? "compact" : "full"

  return (
    <ScheduleCard
      item={item}
      mode={cardMode}
      className={className}
      onClick={
        onClick
          ? (i) => {
              const s = (i.meta as { schedule: NormalizedSchedule }).schedule
              onClick(s)
            }
          : undefined
      }
    />
  )
}
