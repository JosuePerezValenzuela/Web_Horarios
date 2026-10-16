import type { NormalizedSchedule, GroupSummary } from "@/features/scheduling/docentes/domain/types"

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

/**
 * Representa una unidad de clase para la justificación.
 * Si un grupo principal tiene grupos dependientes/secundarios en el mismo horario y día,
 * se agrupan juntos en un solo cluster donde todo el conjunto cuenta como uno solo.
 */
export interface HorarioCluster {
  clusterKey: string
  primarySchedule: NormalizedSchedule
  dependentSchedules: NormalizedSchedule[]
  allSchedules: NormalizedSchedule[]
  dbIds: number[]
  day: 1 | 2 | 3 | 4 | 5 | 6
  startMin: number
  endMin: number
  materia: string
  primaryGrupo: string
  dependentGrupos: string[]
  ambienteLabel: string
  fechasLabel: string
  hasDependents: boolean
  isVirtual: boolean
  isQualifying: boolean
}

/**
 * Agrupa los horarios de un docente uniendo cada horario principal con sus dependientes,
 * de modo que el conjunto cuente como una sola clase para la selección e interfaz.
 */
export function clusterSchedules(
  schedules: NormalizedSchedule[],
  groups?: GroupSummary[],
  fechaDesde?: string,
  fechaHasta?: string,
  applicableDays?: Set<number>
): HorarioCluster[] {
  // 1. Indexar grupos por persona_grupo_id y groupKey
  const groupByPersonaGrupoId = new Map<number, GroupSummary>()
  const groupByGroupKey = new Map<string, GroupSummary>()

  if (groups) {
    groups.forEach((g) => {
      if (g.persona_grupo_id) {
        groupByPersonaGrupoId.set(g.persona_grupo_id, g)
      }
      if (g.groupKey) {
        groupByGroupKey.set(g.groupKey, g)
      }
    })
  }

  // 2. Resolver el ID del grupo principal de un horario
  const getSchedulePrimaryId = (s: NormalizedSchedule): string | number => {
    const group =
      (s.persona_grupo_id ? groupByPersonaGrupoId.get(s.persona_grupo_id) : undefined) ??
      groupByGroupKey.get(s.groupKey)

    const isSecondary =
      s.primario === false ||
      s.isSecondary === true ||
      group?.primario === false ||
      group?.isSecondary === true

    const primarioId = s.primario_id ?? group?.primario_id ?? null

    if (isSecondary && primarioId != null && primarioId !== 0) {
      return primarioId
    }

    return s.persona_grupo_id || s.groupKey
  }

  // 3. Organizar por día
  const schedulesByDay = new Map<number, NormalizedSchedule[]>()
  schedules.forEach((s) => {
    if (!schedulesByDay.has(s.day)) {
      schedulesByDay.set(s.day, [])
    }
    schedulesByDay.get(s.day)!.push(s)
  })

  const clusters: HorarioCluster[] = []

  // 4. Procesar cada día agrupando principales y sus dependientes concurrentes
  schedulesByDay.forEach((daySchedules, day) => {
    const sorted = [...daySchedules].sort((a, b) => a.startMin - b.startMin)
    const dayBuckets: NormalizedSchedule[][] = []

    sorted.forEach((sched) => {
      const schedPrimaryId = getSchedulePrimaryId(sched)

      // Buscar un bucket existente para la misma familia de grupo primario con solapamiento/coincidencia horaria
      const bucket = dayBuckets.find((b) => {
        const first = b[0]
        const firstPrimaryId = getSchedulePrimaryId(first)
        if (firstPrimaryId !== schedPrimaryId) return false

        const overlaps =
          Math.max(sched.startMin, first.startMin) < Math.min(sched.endMin, first.endMin)
        const exactMatch = sched.startMin === first.startMin && sched.endMin === first.endMin
        return overlaps || exactMatch
      })

      if (bucket) {
        bucket.push(sched)
      } else {
        dayBuckets.push([sched])
      }
    })

    // 5. Construir los clusters a partir de los buckets
    dayBuckets.forEach((bucket) => {
      // Localizar horario principal en el bucket (el que NO es secundario)
      const primarySchedule =
        bucket.find((s) => {
          const group =
            (s.persona_grupo_id ? groupByPersonaGrupoId.get(s.persona_grupo_id) : undefined) ??
            groupByGroupKey.get(s.groupKey)
          const isSec =
            s.primario === false ||
            s.isSecondary === true ||
            group?.primario === false ||
            group?.isSecondary === true
          return !isSec
        }) || bucket[0]

      const dependentSchedules = bucket.filter((s) => s !== primarySchedule)

      const dbIds = Array.from(
        new Set(
          bucket.map((s) => s.dbId).filter((id): id is number => typeof id === "number" && id > 0)
        )
      )

      const startMin = Math.min(...bucket.map((s) => s.startMin))
      const endMin = Math.max(...bucket.map((s) => s.endMin))

      const primaryGrupo = primarySchedule.grupo
      const dependentGrupos = Array.from(
        new Set(dependentSchedules.map((s) => s.grupo).filter((g) => g && g !== primaryGrupo))
      )

      const hasDates = Boolean(fechaDesde && fechaHasta && applicableDays)
      const isQualifying = hasDates
        ? bucket.some((s) => isScheduleQualifying(s, fechaDesde!, fechaHasta!, applicableDays!))
        : false

      const isVirtual = bucket.some((s) => s.virtual)

      const effectivePrimary = getSchedulePrimaryId(primarySchedule)
      const clusterKey = `cluster-${effectivePrimary}-${day}-${startMin}-${endMin}-${primarySchedule.scheduleId}`

      clusters.push({
        clusterKey,
        primarySchedule,
        dependentSchedules,
        allSchedules: bucket,
        dbIds,
        day: day as 1 | 2 | 3 | 4 | 5 | 6,
        startMin,
        endMin,
        materia: primarySchedule.materia,
        primaryGrupo,
        dependentGrupos,
        ambienteLabel: primarySchedule.ambienteLabel || dependentSchedules[0]?.ambienteLabel || "",
        fechasLabel: primarySchedule.fechasLabel,
        hasDependents: dependentSchedules.length > 0,
        isVirtual,
        isQualifying,
      })
    })
  })

  return clusters
}
