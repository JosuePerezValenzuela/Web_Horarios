import type {
  DocenteHorarioApiGroup,
  DocenteHorarioApiSchedule,
  DocenteHorariosApiResponse,
  GroupSummary,
  NormalizedDocenteHorarios,
  NormalizedSchedule,
  TimeRange,
  TimeRow,
} from "../domain/types"

const FALLBACK_AMBIENTE = "Sin ambiente"
const FALLBACK_TIPO = "No especificado"
const FALLBACK_FECHAS = "Fechas no definidas"
const EMPTY_DOCENTE_VALUE = "Sin dato"

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toStringValue(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  return fallback
}

function parseDay(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 | null {
  if (typeof value === "string") {
    const normalizedText = value.trim().toLowerCase()
    const byName: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
      lunes: 1,
      martes: 2,
      miercoles: 3,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sabado: 6,
      sábado: 6,
    }

    if (normalizedText in byName) {
      return byName[normalizedText]
    }
  }

  const parsed = toNumber(value)
  if (!parsed) return null
  const normalized = Math.trunc(parsed)
  if (normalized >= 1 && normalized <= 6) return normalized as 1 | 2 | 3 | 4 | 5 | 6
  return null
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null
  const cleaned = value.trim()
  if (!cleaned) return null

  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

function extractSchedules(payload: DocenteHorariosApiResponse): DocenteHorarioApiSchedule[] {
  const rootSchedules = toArray(payload.horarios)
  const rootItems = toArray(payload.items)
  const dataSchedules = toArray(payload.data?.horarios)
  const dataItems = toArray(payload.data?.items)
  const groups = extractGroups(payload)

  const groupedSchedules = groups.flatMap((group) => {
    const groupKey =
      toStringValue(group.groupKey, "") ||
      toStringValue(group.id, "") ||
      `${toStringValue(group.materia, "Sin materia")}::${toStringValue(group.grupo, "Sin grupo")}`

    return toArray(group.horarios).map((schedule) => ({
      ...schedule,
      persona_grupo_id: schedule.persona_grupo_id ?? group.persona_grupo_id,
      grupo_id: schedule.grupo_id ?? schedule.grupoId ?? group.id ?? group.groupKey ?? groupKey,
      grupoId: schedule.grupoId ?? schedule.grupo_id ?? group.id ?? group.groupKey ?? groupKey,
      grupo: schedule.grupo ?? schedule.grupoNombre ?? group.grupo,
      grupoNombre: schedule.grupoNombre ?? schedule.grupo ?? group.grupo,
      materia: schedule.materia ?? schedule.asignatura ?? group.materia,
      carreras: schedule.carreras ?? group.carreras,
    }))
  })

  const baseSource =
    dataSchedules.length > 0
      ? dataSchedules
      : rootSchedules.length > 0
        ? rootSchedules
        : dataItems.length > 0
          ? dataItems
          : rootItems

  const merged = baseSource.length > 0 ? [...baseSource, ...groupedSchedules] : groupedSchedules
  const deduped = new Map<string, DocenteHorarioApiSchedule>()

  merged.forEach((schedule) => {
    const dayKey = toStringValue(
      schedule.dia ??
        schedule.diaSemana ??
        schedule.dia_semana ??
        schedule.diaId ??
        schedule.dia_id ??
        schedule.diaNombre ??
        schedule.dia_nombre,
      "-"
    )
    const startKey = toStringValue(schedule.horaInicio ?? schedule.hora_inicio, "-")
    const endKey = toStringValue(schedule.horaFin ?? schedule.hora_fin, "-")
    const groupKey = toStringValue(schedule.grupo_id ?? schedule.grupoId ?? schedule.grupo, "-")
    const scheduleId = toStringValue(schedule.id, "")
    const key = scheduleId || `${groupKey}::${dayKey}::${startKey}::${endKey}`

    if (!deduped.has(key)) {
      deduped.set(key, schedule)
    }
  })

  return Array.from(deduped.values())
}

function extractGroups(payload: DocenteHorariosApiResponse): DocenteHorarioApiGroup[] {
  const dataGroups = toArray(payload.data?.grupos)
  const rootGroups = toArray(payload.grupos)
  return dataGroups.length > 0 ? dataGroups : rootGroups
}

function normalizeCarreras(carreras: unknown): string[] {
  if (!Array.isArray(carreras)) return []

  const values = carreras
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object" && "nombre" in item) {
        const nombre = (item as { nombre?: unknown }).nombre
        return typeof nombre === "string" ? nombre.trim() : ""
      }
      return ""
    })
    .filter(Boolean)

  return Array.from(new Set(values))
}

function normalizeAmbienteLabel(value: unknown): string {
  if (typeof value === "string") {
    return value.trim() || FALLBACK_AMBIENTE
  }

  if (value && typeof value === "object") {
    const ambiente = value as { nombre?: unknown }
    return toStringValue(ambiente.nombre, FALLBACK_AMBIENTE)
  }

  return FALLBACK_AMBIENTE
}

function normalizeTipoLabel(schedule: DocenteHorarioApiSchedule): string {
  const explicitTipo =
    schedule.tipoAmbiente ??
    schedule.tipo_ambiente ??
    (typeof schedule.ambiente === "object" ? schedule.ambiente?.tipo : undefined) ??
    (typeof schedule.ambiente === "object" ? schedule.ambiente?.tipoNombre : undefined)

  return toStringValue(explicitTipo, FALLBACK_TIPO)
}

function normalizeFechasLabel(schedule: DocenteHorarioApiSchedule): string {
  const inicio = toStringValue(schedule.fechaInicio ?? schedule.fecha_inicio, "")
  const fin = toStringValue(schedule.fechaFin ?? schedule.fecha_fin, "")

  if (inicio && fin) return `${inicio} - ${fin}`
  if (inicio) return `Desde ${inicio}`
  if (fin) return `Hasta ${fin}`
  return FALLBACK_FECHAS
}

function resolveGroupKey(schedule: DocenteHorarioApiSchedule): string {
  const explicitKey =
    toStringValue(schedule.grupo_id ?? schedule.grupoId, "") ||
    toStringValue(schedule.grupoRef?.id, "") ||
    toStringValue(schedule.grupo, "") ||
    toStringValue(schedule.grupoNombre, "")

  if (explicitKey) return explicitKey

  const materia = toStringValue(
    schedule.materia ?? schedule.asignatura ?? schedule.materiaRef?.nombre,
    ""
  )
  const grupo = toStringValue(
    schedule.grupo ?? schedule.grupoNombre ?? schedule.grupoRef?.nombre,
    ""
  )
  return `${materia}::${grupo}` || `group-${toStringValue(schedule.id, "0")}`
}

function normalizeSingleSchedule(schedule: DocenteHorarioApiSchedule): NormalizedSchedule | null {
  const day = parseDay(
    schedule.dia ??
      schedule.diaSemana ??
      schedule.dia_semana ??
      schedule.diaId ??
      schedule.dia_id ??
      schedule.diaNombre ??
      schedule.dia_nombre
  )
  const startMin = parseTimeToMinutes(schedule.horaInicio ?? schedule.hora_inicio)
  const endMin = parseTimeToMinutes(schedule.horaFin ?? schedule.hora_fin)

  if (!day || startMin === null || endMin === null || endMin <= startMin) {
    return null
  }

  const durationMin = endMin - startMin
  const materia = toStringValue(
    schedule.materia ?? schedule.asignatura ?? schedule.materiaRef?.nombre,
    "Sin materia"
  )
  const grupo = toStringValue(
    schedule.grupo ?? schedule.grupoNombre ?? schedule.grupoRef?.nombre,
    "Sin grupo"
  )
  const groupKey = resolveGroupKey(schedule)
  const personaGrupoId = toNumber(schedule.persona_grupo_id)
  const ambienteId =
    toNumber(schedule.aula_id) ??
    toNumber(schedule.ambiente_id) ??
    toNumber(schedule.ambienteId) ??
    (typeof schedule.ambiente === "object" ? toNumber(schedule.ambiente?.id) : null)

  // Extract dbId from schedule.id — use numeric value when available
  const rawId = schedule.id
  const dbId: number | null =
    typeof rawId === "number" && Number.isFinite(rawId)
      ? rawId
      : typeof rawId === "string" && /^\d+$/.test(rawId.trim())
        ? parseInt(rawId, 10)
        : null

  // Extract raw fecha strings — use inline extraction to support null return
  const rawFechaInicio = schedule.fechaInicio ?? schedule.fecha_inicio
  const rawFechaFin = schedule.fechaFin ?? schedule.fecha_fin
  const fechaInicioRaw: string | null =
    rawFechaInicio != null && typeof rawFechaInicio === "string" && rawFechaInicio.trim().length > 0
      ? rawFechaInicio.trim()
      : null
  const fechaFinRaw: string | null =
    rawFechaFin != null && typeof rawFechaFin === "string" && rawFechaFin.trim().length > 0
      ? rawFechaFin.trim()
      : null

  const rawAulaCodigo = schedule.aula_codigo ?? schedule.aulaCodigo
  const ambienteLabel =
    rawAulaCodigo != null && String(rawAulaCodigo).trim().length > 0
      ? String(rawAulaCodigo).trim()
      : normalizeAmbienteLabel(schedule.ambiente)

  return {
    scheduleId: toStringValue(schedule.id, `${groupKey}-${day}-${startMin}-${endMin}`),
    groupKey,
    persona_grupo_id: personaGrupoId ?? 0,
    ambienteId,
    colorIndex: 0,
    day,
    startMin,
    endMin,
    durationMin,
    laneIndex: 0,
    laneCount: 1,
    materia,
    grupo,
    carreras: normalizeCarreras(schedule.carreras),
    ambienteLabel,
    tipoLabel: normalizeTipoLabel(schedule),
    fechasLabel: normalizeFechasLabel(schedule),
    dbId,
    fechaInicioRaw,
    fechaFinRaw,
  }
}

function createGroupSummaryFromSchedules(schedules: NormalizedSchedule[]): GroupSummary[] {
  const map = new Map<string, GroupSummary>()

  schedules.forEach((schedule) => {
    const existing = map.get(schedule.groupKey)
    if (existing) {
      existing.countHorarios += 1
      if (!existing.carrerasLabel && schedule.carreras.length > 0) {
        existing.carrerasLabel = schedule.carreras.join(", ")
      }
      return
    }

    map.set(schedule.groupKey, {
      groupKey: schedule.groupKey,
      persona_grupo_id: schedule.persona_grupo_id,
      materia: schedule.materia,
      grupo: schedule.grupo,
      carrerasLabel: schedule.carreras.join(", ") || "Sin carreras",
      countHorarios: 1,
      estado: "Con Horarios",
      colorIndex: schedule.colorIndex,
    })
  })

  return Array.from(map.values())
}

function mergeGroupsWithApi(
  summaries: GroupSummary[],
  apiGroups: DocenteHorarioApiGroup[]
): GroupSummary[] {
  const map = new Map<string, GroupSummary>()
  summaries.forEach((summary) => map.set(summary.groupKey, summary))

  apiGroups.forEach((group) => {
    const groupKey =
      toStringValue(group.groupKey, "") ||
      toStringValue(group.id, "") ||
      `${toStringValue(group.materia, "Sin materia")}::${toStringValue(group.grupo, "Sin grupo")}`

    const horarios = toArray(group.horarios)
    const countHorarios = horarios.length
    const existing = map.get(groupKey)

    map.set(groupKey, {
      groupKey,
      persona_grupo_id: toNumber(group.persona_grupo_id) ?? existing?.persona_grupo_id ?? 0,
      materia: toStringValue(group.materia, existing?.materia ?? "Sin materia"),
      grupo: toStringValue(group.grupo, existing?.grupo ?? "Sin grupo"),
      carrerasLabel:
        normalizeCarreras(group.carreras).join(", ") || existing?.carrerasLabel || "Sin carreras",
      countHorarios: Math.max(existing?.countHorarios ?? 0, countHorarios),
      estado:
        Math.max(existing?.countHorarios ?? 0, countHorarios) > 0 ? "Con Horarios" : "Sin Horarios",
      colorIndex: existing?.colorIndex ?? 0,
    })
  })

  return Array.from(map.values())
}

function assignStableColorIndices(
  groups: GroupSummary[],
  schedules: NormalizedSchedule[]
): { groups: GroupSummary[]; schedules: NormalizedSchedule[] } {
  const groupOrder = Array.from(new Set(groups.map((group) => group.groupKey)))
  const colorByGroupKey = new Map<string, number>()

  groupOrder.forEach((groupKey, index) => {
    colorByGroupKey.set(groupKey, index)
  })

  schedules.forEach((schedule) => {
    if (!colorByGroupKey.has(schedule.groupKey)) {
      colorByGroupKey.set(schedule.groupKey, colorByGroupKey.size)
    }
  })

  return {
    groups: groups.map((group) => ({
      ...group,
      colorIndex: colorByGroupKey.get(group.groupKey) ?? 0,
    })),
    schedules: schedules.map((schedule) => ({
      ...schedule,
      colorIndex: colorByGroupKey.get(schedule.groupKey) ?? 0,
    })),
  }
}

export function gcdDurations(values: number[]): number {
  const validValues = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value))

  if (validValues.length === 0) return 0

  const gcdPair = (a: number, b: number): number => {
    let x = Math.abs(a)
    let y = Math.abs(b)
    while (y !== 0) {
      const temp = y
      y = x % y
      x = temp
    }
    return x
  }

  return validValues.reduce((acc, value) => gcdPair(acc, value))
}

export function resolveDefaultPeriod(schedules: NormalizedSchedule[]): number {
  const gcd = gcdDurations(schedules.map((schedule) => schedule.durationMin))
  return gcd > 0 ? gcd : 90
}

export function deriveTimeRange(schedules: NormalizedSchedule[]): TimeRange {
  if (schedules.length === 0) {
    return { startMin: 8 * 60, endMin: 18 * 60 }
  }

  const starts = schedules.map((schedule) => schedule.startMin)
  const ends = schedules.map((schedule) => schedule.endMin)

  return {
    startMin: Math.min(...starts),
    endMin: Math.max(...ends),
  }
}

function formatMinutes(value: number): string {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

export function buildRows(timeRange: TimeRange, periodMin: number): TimeRow[] {
  const period = Number.isFinite(periodMin) && periodMin > 0 ? Math.trunc(periodMin) : 90
  const rows: TimeRow[] = []

  let cursor = timeRange.startMin
  while (cursor < timeRange.endMin) {
    const next = Math.min(cursor + period, timeRange.endMin)
    rows.push({
      key: `${cursor}-${next}`,
      label: formatMinutes(cursor),
      startMin: cursor,
      endMin: next,
    })
    cursor = next
  }

  return rows
}

export function assignLanes(schedules: NormalizedSchedule[]): NormalizedSchedule[] {
  const byDay = new Map<number, NormalizedSchedule[]>()
  schedules.forEach((schedule) => {
    const existing = byDay.get(schedule.day) ?? []
    existing.push({ ...schedule })
    byDay.set(schedule.day, existing)
  })

  const result: NormalizedSchedule[] = []

  byDay.forEach((daySchedules) => {
    daySchedules.sort((a, b) => {
      if (a.startMin !== b.startMin) return a.startMin - b.startMin
      if (a.endMin !== b.endMin) return a.endMin - b.endMin
      return a.scheduleId.localeCompare(b.scheduleId)
    })

    const laneEndTimes: number[] = []
    daySchedules.forEach((schedule) => {
      let laneIndex = laneEndTimes.findIndex((end) => end <= schedule.startMin)
      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length
        laneEndTimes.push(schedule.endMin)
      } else {
        laneEndTimes[laneIndex] = schedule.endMin
      }
      schedule.laneIndex = laneIndex
      schedule.laneCount = 1
    })

    let clusterStart = 0
    while (clusterStart < daySchedules.length) {
      let clusterEnd = clusterStart
      let clusterMaxEnd = daySchedules[clusterStart].endMin

      while (clusterEnd + 1 < daySchedules.length) {
        const next = daySchedules[clusterEnd + 1]
        if (next.startMin >= clusterMaxEnd) break
        clusterEnd += 1
        clusterMaxEnd = Math.max(clusterMaxEnd, next.endMin)
      }

      const clusterSlice = daySchedules.slice(clusterStart, clusterEnd + 1)
      const laneCount = Math.max(...clusterSlice.map((item) => item.laneIndex)) + 1
      clusterSlice.forEach((item) => {
        item.laneCount = laneCount
      })

      clusterStart = clusterEnd + 1
    }

    result.push(...daySchedules)
  })

  return result
}

export function normalizeDocenteHorarios(
  payload: DocenteHorariosApiResponse
): NormalizedDocenteHorarios {
  const docente = payload.data?.docente ?? payload.docente
  const schedules = extractSchedules(payload)
    .map((schedule) => normalizeSingleSchedule(schedule))
    .filter((schedule): schedule is NormalizedSchedule => Boolean(schedule))

  const schedulesWithLanes = assignLanes(schedules)
  const timeRange = deriveTimeRange(schedulesWithLanes)
  const groupSummaries = createGroupSummaryFromSchedules(schedulesWithLanes)
  const groups = mergeGroupsWithApi(groupSummaries, extractGroups(payload))
  const withStableColors = assignStableColorIndices(groups, schedulesWithLanes)

  return {
    docente: {
      id: toStringValue(docente?.id, "0"),
      nombres: toStringValue(docente?.nombres, EMPTY_DOCENTE_VALUE),
      codigo: toStringValue(docente?.codigo, EMPTY_DOCENTE_VALUE),
      documento: toStringValue(docente?.documento, EMPTY_DOCENTE_VALUE),
    },
    schedules: withStableColors.schedules,
    groups: withStableColors.groups,
    timeRange,
  }
}
