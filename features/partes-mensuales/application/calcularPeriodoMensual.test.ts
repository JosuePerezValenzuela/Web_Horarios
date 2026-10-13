import { describe, it, expect } from "vitest"
import {
  calcularPeriodoMensual,
  MESES_OPTIONS,
} from "./partesMensualesApi"

describe("calcularPeriodoMensual", () => {
  it("debe calcular correctamente el período para Febrero 2026 (15 de enero al 15 de febrero)", () => {
    const periodo = calcularPeriodoMensual(2, 2026)
    expect(periodo).toEqual({
      fecha_desde: "2026-01-15",
      fecha_hasta: "2026-02-15",
    })
  })

  it("debe calcular correctamente el período para Enero 2026 (15 de diciembre 2025 al 15 de enero 2026)", () => {
    const periodo = calcularPeriodoMensual(1, 2026)
    expect(periodo).toEqual({
      fecha_desde: "2025-12-15",
      fecha_hasta: "2026-01-15",
    })
  })

  it("debe calcular correctamente el período para Marzo 2026 (15 de febrero al 15 de marzo)", () => {
    const periodo = calcularPeriodoMensual(3, 2026)
    expect(periodo).toEqual({
      fecha_desde: "2026-02-15",
      fecha_hasta: "2026-03-15",
    })
  })

  it("debe calcular correctamente el período para Diciembre 2026 (15 de noviembre al 15 de diciembre)", () => {
    const periodo = calcularPeriodoMensual(12, 2026)
    expect(periodo).toEqual({
      fecha_desde: "2026-11-15",
      fecha_hasta: "2026-12-15",
    })
  })

  it("debe contener 12 meses en MESES_OPTIONS", () => {
    expect(MESES_OPTIONS).toHaveLength(12)
    expect(MESES_OPTIONS[0].label).toBe("Enero")
    expect(MESES_OPTIONS[1].label).toBe("Febrero")
    expect(MESES_OPTIONS[11].label).toBe("Diciembre")
  })
})
