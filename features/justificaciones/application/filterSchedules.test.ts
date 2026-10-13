import { describe, it, expect } from "vitest"
import { getDaysOfWeekInRange, isScheduleQualifying } from "./filterSchedules"
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
})
