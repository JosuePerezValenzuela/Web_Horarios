import type { ScheduleItem, RenderSlice, TimelineSegment, TimeRange } from "./types"

const PX_PER_MINUTE = 0.95
const MIN_BLOCK_HEIGHT = 48
const VERTICAL_GAP = 4

export const GRID_CONSTANTS = {
  PX_PER_MINUTE,
  MIN_BLOCK_HEIGHT,
  VERTICAL_GAP,
  // Collapsed stack
  STACK_PREVIEW_COUNT: 2,
  STACK_PREVIEW_HEIGHT: 28,
  STACK_PREVIEW_TOP_OFFSET: 9,
  STACK_PREVIEW_SIDE_OFFSET: 8,
  STACK_FRONT_TOP_OFFSET: 18,
  STACK_FRONT_SIDE_OFFSET: 6,
  // Expanded
  EXPANDED_PADDING: 6,
  EXPANDED_HEADER_HEIGHT: 28,
  EXPANDED_GAP: 4,
} as const

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function getItemHeight(item: ScheduleItem): number {
  const isLongText = item.title.length > 22
  const textPenalty = isLongText ? 16 : 0
  return Math.max(MIN_BLOCK_HEIGHT + textPenalty, MIN_BLOCK_HEIGHT)
}

export function getClusterCollapsedHeight(items: ScheduleItem[]): number {
  const previewCount = Math.min(items.length - 1, GRID_CONSTANTS.STACK_PREVIEW_COUNT)
  const frontTopOffset = previewCount * GRID_CONSTANTS.STACK_PREVIEW_TOP_OFFSET
  const maxItemHeight = Math.max(...items.map(getItemHeight))
  return maxItemHeight + frontTopOffset
}

export function getClusterExpandedHeight(items: ScheduleItem[]): number {
  const totalHeight = items.reduce((sum, item) => sum + getItemHeight(item), 0)
  return (
    GRID_CONSTANTS.EXPANDED_PADDING * 2 +
    GRID_CONSTANTS.EXPANDED_HEADER_HEIGHT +
    Math.max(items.length - 1, 0) * GRID_CONSTANTS.EXPANDED_GAP +
    totalHeight
  )
}

export function getSoloSliceHeight(item: ScheduleItem): number {
  return getItemHeight(item)
}

/**
 * CORE ALGORITHM: Build render slices using fractional overlap detection.
 *
 * Algorithm:
 * 1. For each day, collect all items and find all time boundaries
 * 2. For each time segment between boundaries, find which items are active
 * 3. If 1 item active → solo slice
 * 4. If 2+ items active → cluster slice
 * 5. Mark solo slices that came from a split (isContinuation=true) when the same item
 *    also appears in a cluster slice on the same day
 */
export function buildRenderSlices(items: ScheduleItem[]): RenderSlice[] {
  const byDay = new Map<number, ScheduleItem[]>()
  items.forEach((item) => {
    const dayItems = byDay.get(item.day) ?? []
    dayItems.push(item)
    byDay.set(item.day, dayItems)
  })

  const slices: RenderSlice[] = []
  const itemsInClusters = new Set<string>() // track which item IDs appear in cluster slices

  byDay.forEach((dayItems, day) => {
    // Collect all time boundaries for this day
    const boundaries = Array.from(
      new Set(dayItems.flatMap((item) => [item.startMin, item.endMin]))
    ).sort((a, b) => a - b)

    if (boundaries.length < 2) {
      // Only one boundary = only one item (or none), add as solo
      dayItems.forEach((item) => {
        slices.push({
          id: `${day}-${item.startMin}-${item.endMin}-${item.id}`,
          day,
          startMin: item.startMin,
          endMin: item.endMin,
          durationMin: item.endMin - item.startMin,
          type: "solo",
          items: [item],
          isContinuation: false,
        })
      })
      return
    }

    const daySlices: RenderSlice[] = []

    // For each pair of consecutive boundaries, find active items
    for (let i = 0; i < boundaries.length - 1; i++) {
      const segStart = boundaries[i]
      const segEnd = boundaries[i + 1]

      const activeItems = dayItems.filter(
        (item) => item.startMin <= segStart && item.endMin >= segEnd
      )

      if (activeItems.length === 0) continue

      const sliceId = `${day}-${segStart}-${segEnd}-${activeItems.map((it) => it.id).join("-")}`
      const type: "solo" | "cluster" = activeItems.length >= 2 ? "cluster" : "solo"

      if (type === "cluster") {
        activeItems.forEach((item) => itemsInClusters.add(item.id))
      }

      daySlices.push({
        id: sliceId,
        day,
        startMin: segStart,
        endMin: segEnd,
        durationMin: segEnd - segStart,
        type,
        items: activeItems,
        isContinuation: false, // will be set in post-processing
      })
    }

    slices.push(...daySlices)
  })

  // Post-processing: mark solo slices as continuations if the item also appears in a cluster
  return slices.map((slice) => {
    if (slice.type === "solo" && slice.items.length === 1) {
      const item = slice.items[0]
      if (itemsInClusters.has(item.id)) {
        return { ...slice, isContinuation: true }
      }
    }
    return slice
  })
}

interface TimelineBand {
  startMin: number
  endMin: number
  density: number
}

function buildTimelineBands(
  slices: RenderSlice[],
  expandedClusterIds: Set<string>
): TimelineBand[] {
  return slices.map((slice) => {
    const duration = Math.max(slice.endMin - slice.startMin, 1)
    let requiredHeight: number

    if (slice.type === "cluster") {
      requiredHeight = expandedClusterIds.has(slice.id)
        ? getClusterExpandedHeight(slice.items)
        : getClusterCollapsedHeight(slice.items)
    } else {
      requiredHeight = getSoloSliceHeight(slice.items[0])
    }

    return {
      startMin: slice.startMin,
      endMin: slice.endMin,
      density: Math.max((requiredHeight + VERTICAL_GAP * 2) / duration, PX_PER_MINUTE),
    }
  })
}

export function buildTimelineSegments(
  slices: RenderSlice[],
  expandedClusterIds: Set<string>,
  timeRange: TimeRange
): TimelineSegment[] {
  const bands = buildTimelineBands(slices, expandedClusterIds)

  const boundaries = Array.from(
    new Set([
      timeRange.startMin,
      timeRange.endMin,
      ...bands.flatMap((band) => [band.startMin, band.endMin]),
    ])
  ).sort((a, b) => a - b)

  if (boundaries.length < 2) return []

  const segments: TimelineSegment[] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startMin = boundaries[i]
    const endMin = boundaries[i + 1]
    const duration = endMin - startMin

    if (duration <= 0) continue

    const activeBands = bands.filter((band) => band.startMin < endMin && band.endMin > startMin)
    const density = activeBands.reduce((max, band) => Math.max(max, band.density), PX_PER_MINUTE)

    segments.push({
      startMin,
      endMin,
      density,
      height: duration * density,
    })
  }

  return segments
}

export function getMinutePosition(
  minute: number,
  timeRange: TimeRange,
  segments: TimelineSegment[]
): number {
  const basePosition = (minute - timeRange.startMin) * PX_PER_MINUTE
  const adaptiveOffset = segments.reduce((offset, segment) => {
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
