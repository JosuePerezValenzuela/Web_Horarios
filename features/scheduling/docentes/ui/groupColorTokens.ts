import type { CSSProperties } from "react"

type GroupColorToken = {
  cardStyle: CSSProperties
  blockStyle: CSSProperties
  badgeStyle: CSSProperties
}

const DISTINCT_PASTEL_HUES = [
  18, 212, 334, 146, 272, 48, 188, 306, 116, 246, 8, 228, 352, 168, 286, 78, 198, 324, 102, 238, 30,
  222, 342, 154,
]

const COLOR_STEPS = [
  { card: [80, 95], block: [75, 90], badge: [70, 83] },
  { card: [74, 94], block: [68, 89], badge: [62, 80] },
  { card: [68, 93], block: [62, 88], badge: [56, 78] },
  { card: [84, 96], block: [79, 92], badge: [74, 85] },
  { card: [72, 95], block: [66, 90], badge: [60, 81] },
  { card: [76, 94], block: [70, 89], badge: [64, 82] },
] as const

function pickHue(index: number): number {
  const normalized = Math.abs(index)
  const baseHue = DISTINCT_PASTEL_HUES[normalized % DISTINCT_PASTEL_HUES.length]
  const cycleOffset = Math.floor(normalized / DISTINCT_PASTEL_HUES.length) * 31
  return (baseHue + cycleOffset) % 360
}

export function resolveGroupColorToken(index: number): GroupColorToken {
  const hue = pickHue(index)
  const step = COLOR_STEPS[Math.abs(index) % COLOR_STEPS.length]

  return {
    cardStyle: {
      backgroundColor: `hsl(${hue} ${step.card[0]}% ${step.card[1]}%)`,
      borderColor: `hsl(${hue} 42% 66%)`,
    },
    blockStyle: {
      backgroundColor: `hsl(${hue} ${step.block[0]}% ${step.block[1]}%)`,
      borderColor: `hsl(${hue} 44% 58%)`,
    },
    badgeStyle: {
      backgroundColor: `hsl(${hue} ${step.badge[0]}% ${step.badge[1]}%)`,
      borderColor: `hsl(${hue} 48% 52%)`,
      color: "hsl(var(--foreground))",
    },
  }
}
