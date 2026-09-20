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

export function resolveGroupColorToken(index: number, toneIndex = 0): GroupColorToken {
  const hue = pickHue(index)
  const step = COLOR_STEPS[Math.abs(index) % COLOR_STEPS.length]
  const isSecondary = toneIndex > 0
  const toneStep = Math.min(toneIndex, 3)

  // Primary: Soft, bright pastel (94-96% light mode, 15% dark mode)
  // Secondary: Noticeably deeper / distinct tone in light mode (82% / 73%), brighter in dark mode (26% / 34%)
  const cardSat = isSecondary ? Math.max(step.card[0] - toneStep * 15, 38) : step.card[0]
  const cardLightness = isSecondary ? step.card[1] - toneStep * 11 : step.card[1]
  const cardDarken = isSecondary ? Math.max(80 - toneStep * 20, 36) : 80

  const blockSat = isSecondary ? Math.max(step.block[0] - toneStep * 15, 35) : step.block[0]
  const blockLightness = isSecondary ? step.block[1] - toneStep * 11 : step.block[1]
  const blockDarken = isSecondary ? Math.max(75 - toneStep * 20, 34) : 75

  const borderStyle = isSecondary ? "dashed" : "solid"
  const borderWidth = isSecondary ? "2px" : "1.5px"

  return {
    cardStyle: {
      backgroundColor: `hsl(${hue} ${cardSat}% calc(${cardLightness}% - (var(--theme-dark-modifier, 0) * ${cardDarken}%)))`,
      borderColor: `hsl(${hue} ${isSecondary ? 60 : 42}% calc(${isSecondary ? 46 : 66}% - (var(--theme-dark-modifier, 0) * ${isSecondary ? 20 : 45}%)))`,
      borderStyle,
      borderWidth,
    },
    blockStyle: {
      backgroundColor: `hsl(${hue} ${blockSat}% calc(${blockLightness}% - (var(--theme-dark-modifier, 0) * ${blockDarken}%)))`,
      borderColor: `hsl(${hue} ${isSecondary ? 60 : 44}% calc(${isSecondary ? 46 : 58}% - (var(--theme-dark-modifier, 0) * ${isSecondary ? 18 : 35}%)))`,
      borderStyle,
      borderWidth,
    },
    badgeStyle: {
      backgroundColor: `hsl(${hue} ${isSecondary ? step.badge[0] - 15 : step.badge[0]}% calc(${isSecondary ? step.badge[1] - 10 : step.badge[1]}% - (var(--theme-dark-modifier, 0) * ${isSecondary ? 48 : 65}%)))`,
      borderColor: `hsl(${hue} ${isSecondary ? 60 : 48}% calc(${isSecondary ? 46 : 52}% - (var(--theme-dark-modifier, 0) * 20%)))`,
      borderStyle,
      borderWidth,
      color: "var(--color-foreground)",
    },
  }
}
