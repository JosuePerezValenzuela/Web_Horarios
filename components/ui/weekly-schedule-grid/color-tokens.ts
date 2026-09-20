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

export function resolveColorToken(index: number, toneIndex = 0): ColorToken {
  const hue = pickHue(index)
  const step = COLOR_STEPS[Math.abs(index) % COLOR_STEPS.length]
  const dm = "var(--theme-dark-modifier, 0)"
  const isSecondary = toneIndex > 0
  const toneStep = Math.min(toneIndex, 3)

  // Primary: Soft, bright pastel (88-92% light mode, 15% dark mode)
  // Secondary: Noticeably deeper / distinct tone in light mode (77% / 66%), brighter in dark mode (27% / 37%)
  const blockSat = isSecondary ? Math.max(step.block[0] - toneStep * 15, 35) : step.block[0]
  const blockLightness = isSecondary ? step.block[1] - toneStep * 11 : step.block[1]
  const blockDarken = isSecondary ? Math.max(75 - toneStep * 20, 34) : 75
  const borderStyle = isSecondary ? "dashed" : "solid"
  const borderWidth = isSecondary ? "2px" : "1.5px"

  return {
    blockStyle: {
      backgroundColor: `hsl(${hue} ${blockSat}% calc(${blockLightness}% - (${dm} * ${blockDarken}%)))`,
      borderColor: `hsl(${hue} ${isSecondary ? 60 : 44}% calc(${isSecondary ? 46 : 58}% - (${dm} * ${isSecondary ? 18 : 35}%)))`,
      borderStyle,
      borderWidth,
    } as CSSProperties,
    badgeStyle: {
      backgroundColor: `hsl(${hue} ${isSecondary ? step.badge[0] - 15 : step.badge[0]}% calc(${isSecondary ? step.badge[1] - 10 : step.badge[1]}% - (${dm} * ${isSecondary ? 48 : 65}%)))`,
      borderColor: `hsl(${hue} ${isSecondary ? 60 : 48}% calc(${isSecondary ? 46 : 52}% - (${dm} * 20%)))`,
      borderStyle,
      borderWidth,
      color: "var(--color-foreground)",
    } as CSSProperties,
    peekStyle: {
      backgroundColor: `hsl(${hue} ${step.peek[0]}% calc(${step.peek[1]}% - (${dm} * 80%)))`,
      borderColor: `hsl(${hue} 42% calc(66% - (${dm} * 45%)))`,
      borderStyle,
      borderWidth,
    } as CSSProperties,
  }
}

export function resolveAccentColor(index: number, toneIndex = 0): string {
  const hue = pickHue(index)
  const lightness = toneIndex > 0 ? 46 : 52
  return `hsl(${hue} 55% calc(${lightness}% - (var(--theme-dark-modifier, 0) * 20%)))`
}
