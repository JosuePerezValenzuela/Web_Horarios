import type { CSSProperties } from "react"

export interface TimeRange {
  startMin: number
  endMin: number
}

export interface TimeRow {
  key: string
  label: string
  startMin: number
  endMin: number
}

// Generic schedule item - can represent any schedule entity
export interface ScheduleItem {
  id: string // unique ID
  day: number // 1=Mon, 2=Tue, ..., 6=Sat
  startMin: number // minutes from midnight
  endMin: number // minutes from midnight
  durationMin: number
  // Display data
  title: string // main text (e.g. subject name)
  subtitle?: string // secondary text (e.g. room)
  badge?: string // small badge text (e.g. group)
  // Theming
  colorIndex: number // integer, used by resolveColorToken
  // Optional callbacks data
  meta?: Record<string, unknown> // any extra data for callbacks
}

// A RenderSlice is an atomic time segment on a specific day
// It contains exactly one or more ScheduleItems present in that slot
export interface RenderSlice {
  id: string
  day: number
  startMin: number
  endMin: number
  durationMin: number
  type: "solo" | "cluster"
  items: ScheduleItem[]
  // For "solo" items that are a continuation of a larger block
  // (they were split because part of their time overlaps with others)
  isContinuation: boolean
}

export interface ColorToken {
  blockStyle: CSSProperties
  badgeStyle: CSSProperties
  peekStyle: CSSProperties
}

export interface TimelineSegment {
  startMin: number
  endMin: number
  density: number // px per minute in this segment
  height: number // total pixel height of this segment
}

export interface AdminSchedule {
  id: string | number
  startMin: number
  endMin: number
  label: string
  days: number[]
}

export interface WeeklyScheduleGridProps {
  items: ScheduleItem[]
  rows: TimeRow[]
  timeRange: TimeRange
  days?: Array<{ value: number; label: string }>
  overlapRotationIntervalMs?: number
  onItemClick?: (item: ScheduleItem) => void
  className?: string
  adminSchedules?: AdminSchedule[]
  isCompactMode?: boolean
}
