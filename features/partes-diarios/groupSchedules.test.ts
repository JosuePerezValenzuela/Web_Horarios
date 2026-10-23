import { describe, it, expect } from "vitest"
import { parseTimeToMinutes, groupSchedules } from "@/app/partes-diarios/page"

describe("Partes Diarios groupSchedules algorithm", () => {
  it("parseTimeToMinutes parses HH:mm correctly", () => {
    expect(parseTimeToMinutes("08:15")).toBe(495)
    expect(parseTimeToMinutes("00:00")).toBe(0)
    expect(parseTimeToMinutes("14:30")).toBe(870)
    expect(parseTimeToMinutes("")).toBe(0)
  })

  it("groupSchedules groups non-overlapping schedules correctly", () => {
    const detalles = [
      {
        detalle_parte_id: 101,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Perez Juan",
        persona_codigo: "DOC-1",
        asignatura_nombre: "Cálculo I",
        grupo_nombre: "1",
        aula_codigo: "691A",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
      {
        detalle_parte_id: 102,
        hora_inicio: "10:00",
        hora_fin: "11:30",
        persona_nombres: "Perez Juan",
        persona_codigo: "DOC-1",
        asignatura_nombre: "Cálculo II",
        grupo_nombre: "2",
        aula_codigo: "691B",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(2)
    expect(grouped[0].ids).toEqual([101])
    expect(grouped[0].hora_inicio).toBe("08:15")
    expect(grouped[0].hora_fin).toBe("09:45")
    expect(grouped[0].detalles).toHaveLength(1)

    expect(grouped[1].ids).toEqual([102])
    expect(grouped[1].hora_inicio).toBe("10:00")
    expect(grouped[1].hora_fin).toBe("11:30")
  })

  it("groupSchedules merges schedules with exact same teacher, hora_inicio, and hora_fin", () => {
    const detalles = [
      {
        detalle_parte_id: 201,
        horario_id: 1001,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Lopez Maria",
        persona_codigo: "DOC-2",
        asignatura_nombre: "Física I (Teoría)",
        grupo_nombre: "1",
        aula_codigo: "Aula 1",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
      {
        detalle_parte_id: 202,
        horario_id: 1002,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Lopez Maria",
        persona_codigo: "DOC-2",
        asignatura_nombre: "Física I (Laboratorio)",
        grupo_nombre: "2",
        aula_codigo: "Lab 1",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].ids).toEqual([201, 202])
    expect(grouped[0].hora_inicio).toBe("08:15")
    expect(grouped[0].hora_fin).toBe("09:45")
    expect(grouped[0].detalles).toHaveLength(2)
    expect(grouped[0].detalles[0].horario_id).toBe(1001)
    expect(grouped[0].detalles[0].asignatura_nombre).toBe("Física I (Teoría)")
    expect(grouped[0].detalles[1].horario_id).toBe(1002)
    expect(grouped[0].detalles[1].asignatura_nombre).toBe("Física I (Laboratorio)")
  })

  it("groupSchedules does NOT merge overlapping schedules with different start or end times", () => {
    const detalles = [
      {
        detalle_parte_id: 201,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Lopez Maria",
        persona_codigo: "DOC-2",
        asignatura_nombre: "Física I (Teoría)",
        grupo_nombre: "1",
        aula_codigo: "Aula 1",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
      {
        detalle_parte_id: 202,
        hora_inicio: "09:00",
        hora_fin: "10:30",
        persona_nombres: "Lopez Maria",
        persona_codigo: "DOC-2",
        asignatura_nombre: "Física I (Laboratorio)",
        grupo_nombre: "2",
        aula_codigo: "Lab 1",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(2)
    expect(grouped[0].ids).toEqual([201])
    expect(grouped[0].hora_inicio).toBe("08:15")
    expect(grouped[0].hora_fin).toBe("09:45")

    expect(grouped[1].ids).toEqual([202])
    expect(grouped[1].hora_inicio).toBe("09:00")
    expect(grouped[1].hora_fin).toBe("10:30")
  })

  it("groupSchedules correctly identifies alreadySaved rows", () => {
    const detalles = [
      {
        detalle_parte_id: 301,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Gomez Carlos",
        persona_codigo: "DOC-3",
        asignatura_nombre: "Álgebra",
        grupo_nombre: "1",
        aula_codigo: "Aula 3",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
        hora_ingreso_tickeo: "08:20",
        hora_salida_tickeo: "09:45",
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped[0].alreadySaved).toBe(true)
    expect(grouped[0].ingreso).toBe("08:20")
    expect(grouped[0].salida).toBe("09:45")
  })

  it("groupSchedules handles approved justification: sets empty ingreso/salida, alreadySaved true, and isJustificacionAprobada true", () => {
    const detalles = [
      {
        detalle_parte_id: 401,
        hora_inicio: "08:15",
        hora_fin: "09:45",
        persona_nombres: "Vargas Pedro",
        persona_codigo: "DOC-4",
        asignatura_nombre: "Sistemas Operativos",
        grupo_nombre: "1",
        aula_codigo: "Lab 2",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
        hora_ingreso_tickeo: null,
        hora_salida_tickeo: null,
        tiene_justificacion: true,
        tipo_justificacion_nombre: "Consulta médica",
        estado_justificacion: "aprobada",
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].tiene_justificacion).toBe(true)
    expect(grouped[0].tipo_justificacion_nombre).toBe("Consulta médica")
    expect(grouped[0].estado_justificacion).toBe("aprobada")
    expect(grouped[0].isJustificacionAprobada).toBe(true)
    expect(grouped[0].alreadySaved).toBe(true)
    // No debe poner el horario ideal, sino vacío ("") como si no se hubiera marcado
    expect(grouped[0].ingreso).toBe("")
    expect(grouped[0].salida).toBe("")
    expect(grouped[0].detalles[0].tiene_justificacion).toBe(true)
    expect(grouped[0].detalles[0].tipo_justificacion_nombre).toBe("Consulta médica")
    expect(grouped[0].detalles[0].estado_justificacion).toBe("aprobada")
  })

  it("groupSchedules handles pending justification: keeps ideal schedule and isJustificacionAprobada false", () => {
    const detalles = [
      {
        detalle_parte_id: 501,
        hora_inicio: "10:00",
        hora_fin: "11:30",
        persona_nombres: "Flores Ana",
        persona_codigo: "DOC-5",
        asignatura_nombre: "Redes I",
        grupo_nombre: "2",
        aula_codigo: "Aula 5",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: false,
        hora_ingreso_tickeo: null,
        hora_salida_tickeo: null,
        tiene_justificacion: true,
        tipo_justificacion_nombre: "Comisión institucional",
        estado_justificacion: "pendiente",
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].isJustificacionAprobada).toBe(false)
    expect(grouped[0].alreadySaved).toBe(false)
    // En pendiente sin datos guardados, mantiene el horario ideal
    expect(grouped[0].ingreso).toBe("10:00")
    expect(grouped[0].salida).toBe("11:30")
    expect(grouped[0].detalles[0].estado_justificacion).toBe("pendiente")
  })

  it("groupSchedules considers falta as alreadySaved without preloading ideal schedule", () => {
    const detalles = [
      {
        detalle_parte_id: 601,
        hora_inicio: "06:45",
        hora_fin: "08:15",
        persona_nombres: "Torres Luis",
        persona_codigo: "DOC-6",
        asignatura_nombre: "Cálculo I",
        grupo_nombre: "1",
        aula_codigo: "Aula 10",
        minutos_retraso: null,
        minutos_anticipados: null,
        falta: true,
        hora_ingreso_tickeo: null,
        hora_salida_tickeo: null,
        observacion: null,
      },
    ]

    const grouped = groupSchedules(detalles)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].falta).toBe(true)
    expect(grouped[0].alreadySaved).toBe(true)
    // Al ser falta persistida sin tickeo, no debe precargar el horario de clases
    expect(grouped[0].ingreso).toBe("")
    expect(grouped[0].salida).toBe("")
  })
})
