import type { CSSProperties } from "react"
import type { ColorToken } from "./types"

const DISTINCT_PASTEL_HUES = [
  18, 212, 334, 146, 272, 48, 188, 306, 116, 246, 8, 228, 352, 168, 286, 78, 198, 324, 102, 238, 30,
  222, 342, 154,
]

const COLOR_STEPS = [
  { card: [80, 95], block: [75, 90], badge: [70, 83], peek: [78, 92] },
  { card: [74, 94], block: [68, 89], badge: [62, 80], peek: [71, 91] },
  { card: [68, 93], block: [62, 88], badge: [56, 78], peek: [65, 90] },
  { card: [84, 96], block: [79, 92], badge: [74, 85], peek: [82, 93] },
  { card: [72, 95], block: [66, 90], badge: [60, 81], peek: [69, 91] },
  { card: [76, 94], block: [70, 89], badge: [64, 82], peek: [73, 90] },
] as const

function pickHue(index: number): number {
  const normalized = Math.abs(index)
  const baseHue = DISTINCT_PASTEL_HUES[normalized % DISTINCT_PASTEL_HUES.length]
  const cycleOffset = Math.floor(normalized / DISTINCT_PASTEL_HUES.length) * 31
  return (baseHue + cycleOffset) % 360
}

export function resolveColorToken(index: number): ColorToken {
  const hue = pickHue(index)
  const step = COLOR_STEPS[Math.abs(index) % COLOR_STEPS.length]
  const dm = "var(--theme-dark-modifier, 0)"
  return {
    blockStyle: {
      backgroundColor: `hsl(${hue} ${step.block[0]}% calc(${step.block[1]}% - (${dm} * 75%)))`,
      borderColor: `hsl(${hue} 44% calc(58% - (${dm} * 35%)))`,
    } as CSSProperties,
    badgeStyle: {
      backgroundColor: `hsl(${hue} ${step.badge[0]}% calc(${step.badge[1]}% - (${dm} * 65%)))`,
      borderColor: `hsl(${hue} 48% calc(52% - (${dm} * 20%)))`,
      color: "var(--color-foreground)",
    } as CSSProperties,
    peekStyle: {
      backgroundColor: `hsl(${hue} ${step.peek[0]}% calc(${step.peek[1]}% - (${dm} * 80%)))`,
      borderColor: `hsl(${hue} 42% calc(66% - (${dm} * 45%)))`,
    } as CSSProperties,
  }
}

export function resolveAccentColor(index: number): string {
  const hue = pickHue(index)
  return `hsl(${hue} 55% calc(52% - (var(--theme-dark-modifier, 0) * 20%)))`
}
