import type { NormalizedSchedule } from "@/features/scheduling/docentes/domain/types"

/**
 * Obtiene el conjunto de días de la semana (1=Lunes, ..., 6=Sábado)
 * contenidos en el rango inclusive [fechaDesde, fechaHasta].
 */
export function getDaysOfWeekInRange(fechaDesde: string, fechaHasta: string): Set<number> {
  const result = new Set<number>()
  if (!fechaDesde || !fechaHasta) return result

  const [y1, m1, d1] = fechaDesde.split("-").map(Number)
  const [y2, m2, d2] = fechaHasta.split("-").map(Number)

  if (isNaN(y1) || isNaN(m1) || isNaN(d1) || isNaN(y2) || isNaN(m2) || isNaN(d2)) {
    return result
  }

  const start = new Date(y1, m1 - 1, d1)
  const end = new Date(y2, m2 - 1, d2)

  if (end < start) return result

  // Si abarca 7 o más días, cubre todos los días hábiles
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays >= 6) {
    return new Set([1, 2, 3, 4, 5, 6])
  }

  const curr = new Date(start)
  while (curr <= end) {
    const jsDay = curr.getDay() // 0=Domingo, 1=Lunes, ..., 6=Sábado
    if (jsDay >= 1 && jsDay <= 6) {
      result.add(jsDay)
    }
    curr.setDate(curr.getDate() + 1)
  }

  return result
}

/**
 * Determina si un horario califica para ser justificado dentro del rango
 * de fechas considerando su vigencia (fecha_inicio, fecha_fin) y su día de la semana.
 */
export function isScheduleQualifying(
  schedule: NormalizedSchedule,
  fechaDesde: string,
  fechaHasta: string,
  applicableDays: Set<number>
): boolean {
  if (!schedule.dbId) return false
  if (!applicableDays.has(schedule.day)) return false

  // Vigencia: fecha_inicio <= fechaHasta
  if (schedule.fechaInicioRaw && schedule.fechaInicioRaw > fechaHasta) {
    return false
  }

  // Vigencia: fecha_fin == null || fecha_fin >= fechaDesde
  if (schedule.fechaFinRaw && schedule.fechaFinRaw < fechaDesde) {
    return false
  }

  return true
}
