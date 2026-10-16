import { describe, it, expect } from "vitest"
import { getDaysOfWeekInRange, isScheduleQualifying, clusterSchedules } from "./filterSchedules"
import type { NormalizedSchedule } from "@/features/scheduling/docentes/domain/types"

describe("filterSchedules", () => {
  describe("getDaysOfWeekInRange", () => {
    it("should return single day for same start and end date (e.g. Wednesday)", () => {
      // 2026-09-02 is a Wednesday (day 3)
      const days = getDaysOfWeekInRange("2026-09-02", "2026-09-02")
      expect(Array.from(days)).toEqual([3])
    })

    it("should return Monday through Wednesday for 2026-08-31 to 2026-09-02", () => {
      // 2026-08-31 (Mon) to 2026-09-02 (Wed)
      const days = getDaysOfWeekInRange("2026-08-31", "2026-09-02")
      expect(Array.from(days).sort()).toEqual([1, 2, 3])
    })

    it("should return all 6 days if interval is a full week", () => {
      const days = getDaysOfWeekInRange("2026-08-31", "2026-09-06")
      expect(Array.from(days).sort()).toEqual([1, 2, 3, 4, 5, 6])
    })

    it("should return empty set if end is before start", () => {
      const days = getDaysOfWeekInRange("2026-09-02", "2026-08-31")
      expect(days.size).toBe(0)
    })
  })

  describe("isScheduleQualifying", () => {
    const baseSchedule: NormalizedSchedule = {
      scheduleId: "1",
      groupKey: "MAT101::1",
      persona_grupo_id: 1,
      ambienteId: 10,
      colorIndex: 0,
      day: 1, // Lunes
      startMin: 480, // 08:00
      endMin: 570, // 09:30
      durationMin: 90,
      laneIndex: 0,
      laneCount: 1,
      materia: "ÁLGEBRA I",
      grupo: "1",
      carreras: ["SISTEMAS"],
      ambienteLabel: "691B",
      tipoLabel: "TITULAR",
      fechasLabel: "Vigente",
      dbId: 60,
      fechaInicioRaw: "2026-02-01",
      fechaFinRaw: "2026-12-31",
    }

    it("should qualify when day and vigencia match", () => {
      const applicableDays = new Set([1, 2, 3])
      const qualifies = isScheduleQualifying(
        baseSchedule,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(true)
    })

    it("should not qualify if schedule day is not in applicableDays", () => {
      const applicableDays = new Set([2, 3]) // Tuesday & Wednesday, schedule is Monday (1)
      const qualifies = isScheduleQualifying(
        baseSchedule,
        "2026-09-01",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(false)
    })

    it("should not qualify if schedule starts after fecha_hasta", () => {
      const scheduleFuture = {
        ...baseSchedule,
        fechaInicioRaw: "2026-10-01",
      }
      const applicableDays = new Set([1])
      const qualifies = isScheduleQualifying(
        scheduleFuture,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(false)
    })

    it("should not qualify if schedule ended before fecha_desde", () => {
      const schedulePast = {
        ...baseSchedule,
        fechaFinRaw: "2026-06-30",
      }
      const applicableDays = new Set([1])
      const qualifies = isScheduleQualifying(
        schedulePast,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(false)
    })

    it("should qualify if fechaFinRaw is null (indefinite validity)", () => {
      const scheduleIndefinite = {
        ...baseSchedule,
        fechaFinRaw: null,
      }
      const applicableDays = new Set([1])
      const qualifies = isScheduleQualifying(
        scheduleIndefinite,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(true)
    })

    it("should not qualify if schedule has no dbId", () => {
      const scheduleNoId = {
        ...baseSchedule,
        dbId: null,
      }
      const applicableDays = new Set([1])
      const qualifies = isScheduleQualifying(
        scheduleNoId,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )
      expect(qualifies).toBe(false)
    })
  })

  describe("clusterSchedules", () => {
    const primarySchedule: NormalizedSchedule = {
      scheduleId: "sched-101",
      groupKey: "MAT101::1",
      persona_grupo_id: 10,
      ambienteId: 10,
      colorIndex: 0,
      day: 1, // Lunes
      startMin: 495, // 08:15
      endMin: 585, // 09:45
      durationMin: 90,
      laneIndex: 0,
      laneCount: 1,
      materia: "Cálculo I",
      grupo: "1",
      carreras: ["SISTEMAS"],
      ambienteLabel: "Aula 691A",
      tipoLabel: "TITULAR",
      fechasLabel: "Vigente",
      dbId: 101,
      fechaInicioRaw: "2026-02-01",
      fechaFinRaw: "2026-12-31",
      primario: true,
      primario_id: null,
    }

    const dependentSchedule: NormalizedSchedule = {
      scheduleId: "sched-102",
      groupKey: "MAT101::1-A",
      persona_grupo_id: 11,
      ambienteId: 10,
      colorIndex: 0,
      day: 1, // Lunes
      startMin: 495, // 08:15
      endMin: 585, // 09:45
      durationMin: 90,
      laneIndex: 0,
      laneCount: 1,
      materia: "Cálculo I",
      grupo: "1-A",
      carreras: ["INFORMÁTICA"],
      ambienteLabel: "Aula 691A",
      tipoLabel: "TITULAR",
      fechasLabel: "Vigente",
      dbId: 102,
      fechaInicioRaw: "2026-02-01",
      fechaFinRaw: "2026-12-31",
      primario: false,
      primario_id: 10,
      isSecondary: true,
    }

    const standaloneSchedule: NormalizedSchedule = {
      scheduleId: "sched-201",
      groupKey: "MAT102::2",
      persona_grupo_id: 20,
      ambienteId: 12,
      colorIndex: 1,
      day: 1, // Lunes
      startMin: 600, // 10:00
      endMin: 690, // 11:30
      durationMin: 90,
      laneIndex: 0,
      laneCount: 1,
      materia: "Álgebra Lineal",
      grupo: "2",
      carreras: ["SISTEMAS"],
      ambienteLabel: "Aula 691B",
      tipoLabel: "TITULAR",
      fechasLabel: "Vigente",
      dbId: 201,
      fechaInicioRaw: "2026-02-01",
      fechaFinRaw: "2026-12-31",
      primario: true,
      primario_id: null,
    }

    it("agrupa el primario con su dependiente en el mismo horario y cuenta como uno solo", () => {
      const clusters = clusterSchedules([primarySchedule, dependentSchedule, standaloneSchedule])

      expect(clusters).toHaveLength(2)

      // Cluster 1: Cálculo I (Grupo 1 + Grupo 1-A)
      const clusterCalculo = clusters.find((c) => c.materia === "Cálculo I")!
      expect(clusterCalculo).toBeDefined()
      expect(clusterCalculo.hasDependents).toBe(true)
      expect(clusterCalculo.primaryGrupo).toBe("1")
      expect(clusterCalculo.dependentGrupos).toEqual(["1-A"])
      expect(clusterCalculo.dbIds).toEqual([101, 102])
      expect(clusterCalculo.allSchedules).toHaveLength(2)

      // Cluster 2: Álgebra Lineal (Grupo 2 standalone)
      const clusterAlgebra = clusters.find((c) => c.materia === "Álgebra Lineal")!
      expect(clusterAlgebra).toBeDefined()
      expect(clusterAlgebra.hasDependents).toBe(false)
      expect(clusterAlgebra.primaryGrupo).toBe("2")
      expect(clusterAlgebra.dependentGrupos).toEqual([])
      expect(clusterAlgebra.dbIds).toEqual([201])
      expect(clusterAlgebra.allSchedules).toHaveLength(1)
    })

    it("no agrupa horarios en días diferentes para el mismo grupo", () => {
      const wednesdaySchedule: NormalizedSchedule = {
        ...primarySchedule,
        scheduleId: "sched-103",
        day: 3, // Miércoles
        dbId: 103,
      }

      const clusters = clusterSchedules([primarySchedule, dependentSchedule, wednesdaySchedule])

      expect(clusters).toHaveLength(2)
      const lunesCluster = clusters.find((c) => c.day === 1)!
      const miercolesCluster = clusters.find((c) => c.day === 3)!

      expect(lunesCluster.dbIds).toEqual([101, 102])
      expect(miercolesCluster.dbIds).toEqual([103])
    })

    it("reconoce relaciones a través del catálogo de grupos GroupSummary si el horario no tiene los flags", () => {
      const schedWithoutFlagsA: NormalizedSchedule = {
        ...primarySchedule,
        primario: undefined,
        primario_id: undefined,
      }
      const schedWithoutFlagsB: NormalizedSchedule = {
        ...dependentSchedule,
        primario: undefined,
        primario_id: undefined,
        isSecondary: undefined,
      }

      const groups = [
        {
          groupKey: "MAT101::1",
          persona_grupo_id: 10,
          materia: "Cálculo I",
          grupo: "1",
          carrerasLabel: "SISTEMAS",
          countHorarios: 1,
          estado: "Con Horarios",
          colorIndex: 0,
          primario: true,
          primario_id: null,
          hasSecondaries: true,
          secondaryCount: 1,
          isSecondary: false,
        },
        {
          groupKey: "MAT101::1-A",
          persona_grupo_id: 11,
          materia: "Cálculo I",
          grupo: "1-A",
          carrerasLabel: "INFORMÁTICA",
          countHorarios: 1,
          estado: "Con Horarios",
          colorIndex: 0,
          primario: false,
          primario_id: 10,
          hasSecondaries: false,
          isSecondary: true,
        },
      ]

      const clusters = clusterSchedules([schedWithoutFlagsA, schedWithoutFlagsB], groups)
      expect(clusters).toHaveLength(1)
      expect(clusters[0].hasDependents).toBe(true)
      expect(clusters[0].primaryGrupo).toBe("1")
      expect(clusters[0].dependentGrupos).toEqual(["1-A"])
      expect(clusters[0].dbIds).toEqual([101, 102])
    })

    it("calcula isQualifying adecuadamente en base al rango de fechas", () => {
      const applicableDays = new Set([1]) // Solo Lunes
      const clusters = clusterSchedules(
        [primarySchedule, dependentSchedule],
        undefined,
        "2026-08-31",
        "2026-09-02",
        applicableDays
      )

      expect(clusters).toHaveLength(1)
      expect(clusters[0].isQualifying).toBe(true)

      const nonQualifyingDays = new Set([2, 3]) // Martes y Miércoles
      const clustersOut = clusterSchedules(
        [primarySchedule, dependentSchedule],
        undefined,
        "2026-09-01",
        "2026-09-02",
        nonQualifyingDays
      )
      expect(clustersOut[0].isQualifying).toBe(false)
    })
  })
})
