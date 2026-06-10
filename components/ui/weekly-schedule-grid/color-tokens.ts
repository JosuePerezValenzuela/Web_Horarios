import type { CSSProperties } from "react"
import type { ColorToken } from "./types"

const DISTINCT_PASTEL_HUES = [
  18, 212, 334, 146, 272, 48, 188, 306, 116, 246, 8, 228, 352, 168, 286, 78, 198, 324, 102, 238, 30,
  222, 342, 154,
]

// FORMAT: [saturation%, lightness%]
// Light mode  → colors render at full lightness (vivid, solid — no washed-out pastels)
// Dark  mode  → lightness offset is subtracted, giving a rich dark tint (~22-28% L)
const COLOR_STEPS = [
  { block: [84, 84], badge: [80, 75], peek: [82, 88] },
  { block: [78, 83], badge: [72, 74], peek: [76, 87] },
  { block: [72, 82], badge: [66, 72], peek: [70, 86] },
  { block: [86, 86], badge: [82, 77], peek: [84, 90] },
  { block: [76, 83], badge: [70, 74], peek: [74, 87] },
  { block: [80, 84], badge: [75, 75], peek: [78, 88] },
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
    // Light: vivid pastel (L ~82-86%).  Dark: subtract ~60% → L ~22-26% (rich dark tint)
    blockStyle: {
      backgroundColor: `hsl(${hue} ${step.block[0]}% calc(${step.block[1]}% - (${dm} * 60%)))`,
      borderColor: `hsl(${hue} 52% calc(62% - (${dm} * 38%)))`,
    } as CSSProperties,
    // Badge slightly more saturated/darker than block for contrast
    badgeStyle: {
      backgroundColor: `hsl(${hue} ${step.badge[0]}% calc(${step.badge[1]}% - (${dm} * 52%)))`,
      borderColor: `hsl(${hue} 56% calc(55% - (${dm} * 22%)))`,
      color: "var(--color-foreground)",
    } as CSSProperties,
    // Peek (stack preview): similar to block but slightly lighter for depth effect
    peekStyle: {
      backgroundColor: `hsl(${hue} ${step.peek[0]}% calc(${step.peek[1]}% - (${dm} * 65%)))`,
      borderColor: `hsl(${hue} 48% calc(68% - (${dm} * 42%)))`,
    } as CSSProperties,
  }
}

export function resolveAccentColor(index: number): string {
  const hue = pickHue(index)
  return `hsl(${hue} 55% calc(52% - (var(--theme-dark-modifier, 0) * 20%)))`
}
