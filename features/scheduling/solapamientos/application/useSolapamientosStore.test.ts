import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  mapDocenteConflicts,
  extractDocenteSchedules,
  useSolapamientosStore,
  parseTimeToMinutes,
  formatTime,
  formatDate,
} from "./useSolapamientosStore"
import type { SolapamientoDocente } from "../domain/types"

const mockDocente: SolapamientoDocente = {
  persona_id: 573,
  codigo: "199700035",
  nombres: "VILLARROEL TAPIA HENRY FRANK",
  solapamientos: [
    {
      horario_a: {
        id: 42,
        dia: 1,
        hora_inicio: "08:00:00",
        hora_fin: "12:00:00",
        fecha_inicio: "2026-01-01",
        fecha_fin: null,
        horario_descripcion: "CARGO DOCENTE HORARIO FIJO",
        tipo: "administrativo",
        tipo_asignacion_horario_administrativo: {
          id: 1,
          codigo: "REGULAR",
          descripcion: "Regular",
        },
        carga_horaria_diaria: 4,
        carreras: [],
      },
      horario_b: {
        id: 13250,
        tipo: "clase",
        dia: 1,
        hora_inicio: "06:45:00",
        hora_fin: "08:15:00",
        fecha_inicio: "2026-02-02",
        fecha_fin: null,
        tipo_designacion: "TITULAR",
        grupo: "1",
        asignatura_codigo: "2008156",
        asignatura_nombre: "BASE DE DATOS II",
        persona_grupo: {
          id: 1325,
          primario: true,
          primario_id: null,
        },
        carreras: [
          {
            id: 19,
            nombre: "INGENIERIA DE SISTEMAS",
          },
        ],
      },
      categoria: "admin-clase",
    },
  ],
  horarios_sin_solapamiento: [
    {
      id: 13251,
      tipo: "clase",
      dia: 3,
      hora_inicio: "14:00:00",
      hora_fin: "15:00:00",
      fecha_inicio: "2026-02-02",
      fecha_fin: null,
      tipo_designacion: "TITULAR",
      grupo: "2",
      asignatura_codigo: "2008157",
      asignatura_nombre: "BASE DE DATOS II",
      persona_grupo: {
        id: 1326,
        primario: true,
        primario_id: null,
      },
      carreras: [],
    },
  ],
}

describe("Solapamientos mapping and utilities", () => {
  it("parseTimeToMinutes should parse HH:mm and HH:mm:ss", () => {
    expect(parseTimeToMinutes("08:00:00")).toBe(480)
    expect(parseTimeToMinutes("06:45:00")).toBe(405)
    expect(parseTimeToMinutes("08:15")).toBe(495)
    expect(parseTimeToMinutes("")).toBe(0)
  })

  it("formatTime should format HH:mm:ss to HH:mm", () => {
    expect(formatTime("08:00:00")).toBe("08:00")
    expect(formatTime("06:45:00")).toBe("06:45")
    expect(formatTime("14:30")).toBe("14:30")
    expect(formatTime("")).toBe("")
  })

  it("formatDate should format YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDate("2026-02-02")).toBe("02/02/2026")
    expect(formatDate("2026-01-01T00:00:00")).toBe("01/01/2026")
    expect(formatDate(null)).toBe("")
  })

  it("mapDocenteConflicts should directly map solapamientos pairs from backend", () => {
    const conflicts = mapDocenteConflicts(mockDocente)
    expect(conflicts).toHaveLength(1)

    const c = conflicts[0]
    expect(c.tipo).toBe("admin-clase")
    expect(c.dia).toBe(1)
    expect(c.horarioA.id).toBe(42)
    expect(c.horarioA.tipo).toBe("administrativo")
    expect(c.horarioA.hora).toBe("08:00 - 12:00")

    expect(c.horarioB.id).toBe(13250)
    expect(c.horarioB.tipo).toBe("clase")
    expect(c.horarioB.label).toBe("BASE DE DATOS II (Grupo 1)")
    expect(c.horarioB.hora).toBe("06:45 - 08:15")
    expect(c.horarioB.carreras).toEqual(["INGENIERIA DE SISTEMAS"])

    // Overlap: 08:00 to 08:15 = 15 minutes
    expect(c.overlapDuration).toBe(15)
  })

  it("extractDocenteSchedules should extract all unique schedules", () => {
    const { classSchedules, adminSchedules } = extractDocenteSchedules(mockDocente)
    expect(classSchedules).toHaveLength(2) // 13250 from solapamiento + 13251 from sin_solapamiento
    expect(adminSchedules).toHaveLength(1) // 42 from solapamiento

    expect(classSchedules.map((c) => c.id)).toContain(13250)
    expect(classSchedules.map((c) => c.id)).toContain(13251)
    expect(adminSchedules.map((a) => a.id)).toContain(42)
  })

  it("extractDocenteSchedules should deduplicate schedules present in multiple overlap pairs", () => {
    const docenteMulti: SolapamientoDocente = {
      ...mockDocente,
      solapamientos: [
        mockDocente.solapamientos[0],
        {
          horario_a: mockDocente.solapamientos[0].horario_a, // duplicate admin 42
          horario_b: mockDocente.solapamientos[0].horario_b, // duplicate class 13250
          categoria: "admin-clase",
        },
      ],
    }

    const { classSchedules, adminSchedules } = extractDocenteSchedules(docenteMulti)
    expect(classSchedules).toHaveLength(2)
    expect(adminSchedules).toHaveLength(1)
  })
})

describe("useSolapamientosStore state management", () => {
  beforeEach(() => {
    useSolapamientosStore.getState().reset()
    vi.clearAllMocks()
  })

  it("should initialize with default state", () => {
    const state = useSolapamientosStore.getState()
    expect(state.docentes).toEqual([])
    expect(state.totalDocentes).toBe(0)
    expect(state.conflicts).toEqual([])
    expect(state.schedules).toEqual([])
    expect(state.adminSchedules).toEqual([])
    expect(state.horariosSinSolapamiento).toEqual([])
  })

  it("setFilter should update filter state", () => {
    const store = useSolapamientosStore.getState()
    store.setFilter("persona_codigo", "12345")
    store.setFilter("tolerancia_minutos", 15)
    store.setFilter("facultad_codigo", "20")

    const updated = useSolapamientosStore.getState()
    expect(updated.filters.persona_codigo).toBe("12345")
    expect(updated.filters.tolerancia_minutos).toBe(15)
    expect(updated.filters.facultad_codigo).toBe("20")
  })
})
