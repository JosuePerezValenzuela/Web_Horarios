import { NextRequest, NextResponse } from "next/server"
import puppeteer, { Browser } from "puppeteer"
import fs from "fs"
import path from "path"
import type {
  ReporteMensualResponse,
  ReporteMensualPersona,
  AlertaRetrasoItem,
  AlertaFaltaItem,
  AlertaInasistenciaConsecutivaItem,
  AlertaOcurrenciaDetalle,
} from "@/features/partes-mensuales/application/partesMensualesApi"

export async function POST(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const body = await request.json()
    const { reporte, userName, facultadNombre } = body as {
      reporte: ReporteMensualResponse
      userName: string
      facultadNombre?: string
    }

    if (!reporte) {
      return NextResponse.json(
        { error: "Faltan los datos del reporte mensual en el cuerpo de la solicitud" },
        { status: 400 }
      )
    }

    const {
      fecha_desde,
      fecha_hasta,
      alcance = "facultad",
      objetivo,
      personas = [],
      alertas = { mas_3_retrasos: [], "3_faltas_mas": [], inasistencias_consecutivas: [] },
    } = reporte
    const facultadCodigo = objetivo || ""

    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "umss1.png")
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch (err) {
      console.error("No se pudo leer el logo para el PDF:", err)
    }

    const todayStr = new Date().toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    // Helper to get evidence list from an alert item
    const getEvidencias = (
      item: AlertaRetrasoItem | AlertaFaltaItem | AlertaInasistenciaConsecutivaItem
    ): AlertaOcurrenciaDetalle[] => {
      if (Array.isArray(item.evidence) && item.evidence.length > 0) return item.evidence
      if (Array.isArray(item.evidencias) && item.evidencias.length > 0) return item.evidencias
      if ("secuencias" in item && Array.isArray(item.secuencias) && item.secuencias.length > 0) {
        return item.secuencias.flatMap((s) => s.evidence || s.evidencias || [])
      }
      return []
    }

    const listaRetrasos = alertas?.mas_3_retrasos || []
    const listaFaltas = alertas?.["3_faltas_mas"] || []
    const listaInasistencias = alertas?.inasistencias_consecutivas || []

    // Helper: reemplaza 0, null o undefined por "-" para no saturar el reporte de ceros
    const formatMinutesOrDash = (min: number | null | undefined): string => {
      if (min === null || min === undefined || min === 0) return "—"
      return `${min} min`
    }

    const formatNumOrDash = (num: number | null | undefined, suffix = ""): string => {
      if (num === null || num === undefined || num === 0) return "—"
      return `${num}${suffix}`
    }

    // ==========================================
    // 1. TABLA PRINCIPAL DE PERSONAL Y CARGAS HORARIAS
    // ==========================================
    const personasRowsHtml = personas
      .map((p: ReporteMensualPersona, idx: number) => {
        return `
        <tr class="hover:bg-gray-50/50">
          <td style="text-align: center; font-family: monospace; color: #6b7280; width: 30px; vertical-align: middle;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 500; color: #1f2937; width: 75px; vertical-align: middle;">${p.persona_codigo}</td>
          <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px;">${p.persona_nombres}</td>
          <!-- 1. Carga Horaria Base -->
          <td style="text-align: center; font-family: monospace; font-weight: bold; vertical-align: middle; width: 75px; background-color: #f8fafc;">${formatNumOrDash(p.carga_horaria, " hrs")}</td>
          <!-- 2. Faltas -->
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #dc2626; font-weight: 500;">${formatNumOrDash(p.faltas?.carga_faltas)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #b45309;">${formatMinutesOrDash(p.faltas?.retrasos_min)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #047857;">${formatMinutesOrDash(p.faltas?.anticipados_min)}</td>
          <!-- 3. Justificaciones -->
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #2563eb;">${formatNumOrDash(p.justificaciones?.carga_justificada)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #4b5563;">${formatMinutesOrDash(p.justificaciones?.retrasos_min_justificados)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; color: #4b5563;">${formatMinutesOrDash(p.justificaciones?.anticipado_min_justificados)}</td>
          <!-- 4. Consolidado -->
          <td style="text-align: center; font-family: monospace; font-weight: bold; vertical-align: middle; width: 65px; background-color: #f0fdf4; color: #15803d;">${formatNumOrDash(p.consolidado?.carga_consolidada)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; background-color: #f0fdf4; color: #15803d;">${formatMinutesOrDash(p.consolidado?.minutos_retraso_consolidado)}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 65px; background-color: #f0fdf4; color: #15803d;">${formatMinutesOrDash(p.consolidado?.minutos_anticipado_consolidado)}</td>
        </tr>
      `
      })
      .join("")

    // ==========================================
    // 2. ALERTAS: RETRASOS (Con divisor marcado entre docentes y reemplazo de 0 por -)
    // ==========================================
    const retrasosRowsHtml = listaRetrasos
      .map((item: AlertaRetrasoItem) => {
        const evs = getEvidencias(item)
        if (evs.length === 0) {
          return `
          <tr class="teacher-divider">
            <td class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 500; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="teacher-rowspan font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">${item.persona_nombres}</td>
            <td colspan="8" style="text-align: center; color: #9ca3af; padding: 6px;">Sin detalle de incidencias registradas</td>
          </tr>
        `
        }

        const first = evs[0]
        const remaining = evs.slice(1)
        const rowspan = evs.length
        const isSingle = remaining.length === 0

        const firstRow = `
        <tr class="${isSingle ? "teacher-divider" : ""}">
          <td rowspan="${rowspan}" class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 600; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="teacher-rowspan font-bold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">
            <div>${item.persona_nombres}</div>
            <div style="font-size: 7.5px; color: #b45309; font-weight: normal; margin-top: 2px;">${item.count ?? rowspan} retrasos</div>
          </td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${first.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${first.asignatura_nombre || first.asignatura_codigo || "—"} (${first.asignatura_codigo || "—"}) - G: ${first.grupo_nombre || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 85px;">${first.hora_inicio} - ${first.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${first.hora_ingreso_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${first.hora_salida_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #b45309; vertical-align: middle; width: 65px;">${formatMinutesOrDash(first.minutos_retraso)}</td>
          <td style="text-align: center; font-family: monospace; color: #047857; vertical-align: middle; width: 65px;">${formatMinutesOrDash(first.minutos_anticipados)}</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 75px;">${first.aula_codigo || "—"}</td>
        </tr>
      `

        const otherRows = remaining
          .map((ev, rIdx) => {
            const isLast = rIdx === remaining.length - 1
            return `
        <tr class="${isLast ? "teacher-divider" : ""}">
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre || ev.asignatura_codigo || "—"} (${ev.asignatura_codigo || "—"}) - G: ${ev.grupo_nombre || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 85px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${ev.hora_ingreso_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${ev.hora_salida_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #b45309; vertical-align: middle; width: 65px;">${formatMinutesOrDash(ev.minutos_retraso)}</td>
          <td style="text-align: center; font-family: monospace; color: #047857; vertical-align: middle; width: 65px;">${formatMinutesOrDash(ev.minutos_anticipados)}</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 75px;">${ev.aula_codigo || "—"}</td>
        </tr>
      `
          })
          .join("")

        return firstRow + otherRows
      })
      .join("")

    // ==========================================
    // 2. ALERTAS: FALTAS (Con divisor marcado entre docentes)
    // ==========================================
    const faltasRowsHtml = listaFaltas
      .map((item: AlertaFaltaItem) => {
        const evs = getEvidencias(item)
        if (evs.length === 0) {
          return `
          <tr class="teacher-divider">
            <td class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 500; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="teacher-rowspan font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">${item.persona_nombres}</td>
            <td colspan="7" style="text-align: center; color: #9ca3af; padding: 6px;">Sin detalle de faltas registradas</td>
          </tr>
        `
        }

        const first = evs[0]
        const remaining = evs.slice(1)
        const rowspan = evs.length
        const isSingle = remaining.length === 0

        const firstRow = `
        <tr class="${isSingle ? "teacher-divider" : ""}">
          <td rowspan="${rowspan}" class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 600; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="teacher-rowspan font-bold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">
            <div>${item.persona_nombres}</div>
            <div style="font-size: 7.5px; color: #dc2626; font-weight: normal; margin-top: 2px;">${item.count ?? rowspan} faltas</div>
          </td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${first.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${first.asignatura_nombre || first.asignatura_codigo || "—"} (${first.asignatura_codigo || "—"}) - G: ${first.grupo_nombre || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 85px;">${first.hora_inicio} - ${first.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${first.hora_ingreso_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${first.hora_salida_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 65px;">FALTA</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 75px;">${first.aula_codigo || "—"}</td>
        </tr>
      `

        const otherRows = remaining
          .map((ev, rIdx) => {
            const isLast = rIdx === remaining.length - 1
            return `
        <tr class="${isLast ? "teacher-divider" : ""}">
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre || ev.asignatura_codigo || "—"} (${ev.asignatura_codigo || "—"}) - G: ${ev.grupo_nombre || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 85px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${ev.hora_ingreso_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px;">${ev.hora_salida_tickeo || "—"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 65px;">FALTA</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 75px;">${ev.aula_codigo || "—"}</td>
        </tr>
      `
          })
          .join("")

        return firstRow + otherRows
      })
      .join("")

    // ==========================================
    // 3. ALERTAS: INASISTENCIAS CONSECUTIVAS (Con divisor marcado entre docentes)
    // ==========================================
    const inasistenciasRowsHtml = listaInasistencias
      .map((item: AlertaInasistenciaConsecutivaItem) => {
        const secuencias =
          item.secuencias ||
          (item.evidencias || item.evidence
            ? [
                {
                  fecha_inicio:
                    item.fecha_inicio ||
                    item.evidencias?.[0]?.fecha ||
                    item.evidence?.[0]?.fecha ||
                    fecha_desde,
                  fecha_fin:
                    item.fecha_fin ||
                    item.evidencias?.[(item.evidencias?.length ?? 1) - 1]?.fecha ||
                    item.evidence?.[(item.evidence?.length ?? 1) - 1]?.fecha ||
                    fecha_hasta,
                  cantidad_ocurrencias:
                    item.count || item.evidencias?.length || item.evidence?.length || 0,
                  evidencias: item.evidencias || item.evidence || [],
                },
              ]
            : [])

        if (secuencias.length === 0) {
          return `
          <tr class="teacher-divider">
            <td class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 500; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="teacher-rowspan font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">${item.persona_nombres}</td>
            <td colspan="3" style="text-align: center; color: #9ca3af; padding: 6px;">Sin secuencias consecutivas detectadas</td>
          </tr>
        `
        }

        const firstSec = secuencias[0]
        const remainingSec = secuencias.slice(1)
        const rowspan = secuencias.length
        const isSingle = remainingSec.length === 0

        const formatEvsList = (evs: AlertaOcurrenciaDetalle[]) =>
          evs
            .map(
              (e) =>
                `<div>• <b>${e.fecha}</b> (${e.hora_inicio || "—"}-${e.hora_fin || "—"}): ${e.asignatura_nombre || e.asignatura_codigo || "Clase"} - G: ${e.grupo_nombre || "—"} | Aula: ${e.aula_codigo || "—"}</div>`
            )
            .join("")

        const firstRow = `
        <tr class="${isSingle ? "teacher-divider" : ""}">
          <td rowspan="${rowspan}" class="teacher-rowspan" style="text-align: center; font-family: monospace; font-weight: 600; width: 85px; vertical-align: middle;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="teacher-rowspan font-bold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 170px;">${item.persona_nombres}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 150px; font-weight: 500;">
            Desde: ${firstSec.fecha_inicio}<br />Hasta: ${firstSec.fecha_fin}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 95px;">
            ${firstSec.cantidad_ocurrencias ?? firstSec.evidencias?.length ?? "—"} clases
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8px; padding: 5px;">
            ${formatEvsList(firstSec.evidencias || [])}
          </td>
        </tr>
      `

        const otherRows = remainingSec
          .map((sec, sIdx) => {
            const isLast = sIdx === remainingSec.length - 1
            return `
        <tr class="${isLast ? "teacher-divider" : ""}">
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 150px; font-weight: 500;">
            Desde: ${sec.fecha_inicio}<br />Hasta: ${sec.fecha_fin}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 95px;">
            ${sec.cantidad_ocurrencias ?? sec.evidencias?.length ?? "—"} clases
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8px; padding: 5px;">
            ${formatEvsList(sec.evidencias || [])}
          </td>
        </tr>
      `
          })
          .join("")

        return firstRow + otherRows
      })
      .join("")

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
            body {
              font-family: 'Roboto', sans-serif;
              margin: 0;
              padding: 0;
              font-size: 10px;
              color: #1f2937;
              background-color: #fff;
            }
            @media print {
              thead { display: table-header-group !important; }
              tfoot { display: table-footer-group !important; }
              tr { page-break-inside: avoid !important; }
            }
            .page-break {
              page-break-before: always !important;
              break-before: page !important;
            }
            .signatures-table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              text-align: left;
              font-size: 9px;
              border: 1.5px solid #4b5563 !important;
            }
            .signatures-table th {
              background-color: #f3f4f6;
              color: #111827;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8px;
              border: 1px solid #9ca3af !important;
              border-bottom: 2px solid #4b5563 !important;
              padding: 6px 4px !important;
            }
            .signatures-table td {
              border: 1px solid #d1d5db !important;
              padding: 5px 4px !important;
            }
            .teacher-divider td {
              border-bottom: 2.5px solid #374151 !important;
            }
            .teacher-rowspan {
              border-right: 2px solid #6b7280 !important;
              border-bottom: 2.5px solid #374151 !important;
              background-color: #f9fafb !important;
            }
          </style>
        </head>
        <body class="bg-white text-black p-0 m-0 text-[11px]">
          <table class="w-full border-none">
            <thead class="table-header-group">
              <tr>
                <td class="border-none p-0 pb-1">
                  <header class="w-full border-b-2 border-[#003770] pb-2 mb-2 select-none">
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex items-center gap-4">
                        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo UMSS" class="w-14 h-14 object-contain" />` : ""}
                        <div class="flex flex-col gap-0.5 text-left">
                          <span class="font-roboto font-black text-[#003770] text-xs tracking-wider uppercase">
                            UNIVERSIDAD MAYOR DE SAN SIMÓN
                          </span>
                          <span class="font-roboto font-bold text-[#BC000C] text-[9px] tracking-wider uppercase">
                            SISTEMA DE CONTROL DE ASISTENCIA
                          </span>
                        </div>
                      </div>
                      <div class="text-right flex flex-col justify-end items-end">
                        <h2 class="font-roboto font-black text-[#001B47] text-sm leading-tight uppercase">
                          REPORTE MENSUAL DE ALERTAS E INCIDENCIAS
                        </h2>
                        <div class="font-mono text-gray-400 text-[8px] mt-1 text-right">
                          Generado por: ${userName}<br />
                          Emisión: ${todayStr}
                        </div>
                      </div>
                    </div>
                  </header>

                  <div class="flex justify-between border border-gray-300 bg-gray-50/50 p-2.5 rounded-lg text-gray-700 text-[10px] mb-2">
                    <div class="flex flex-col gap-1">
                      <div>
                        <span class="font-bold text-gray-950">Alcance: </span>
                        <span class="uppercase font-semibold">${alcance}</span>
                      </div>
                      <div>
                        <span class="font-bold text-gray-950">Facultad: </span>
                        <b>${facultadNombre || facultadCodigo}</b> (${facultadCodigo})
                      </div>
                    </div>
                    <div class="text-right self-center">
                      <div>
                        <span class="font-bold text-gray-950">Período: </span>
                        Desde: <b>${fecha_desde}</b> — Hasta: <b>${fecha_hasta}</b>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody class="table-row-group">
              <tr>
                <td class="border-none p-0">
                  <div>
                    <!-- SECCIÓN 1: DETALLE DE TODAS LAS PERSONAS (4 SECCIONES) -->
                    <h3 style="font-size: 11px; font-weight: bold; margin: 8px 0 6px 0; text-transform: uppercase; color: #003770;">
                      1. Resumen por Personal y Cargas Horarias
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th rowspan="2" style="width: 30px; text-align: center;">N°</th>
                          <th rowspan="2" style="width: 75px; text-align: center;">Código</th>
                          <th rowspan="2">Docente / Funcionario</th>
                          <th class="sec-header" style="background-color: #e2e8f0; color: #1e293b; width: 75px; text-align: center;">1. Carga Horaria</th>
                          <th colspan="3" class="sec-header" style="background-color: #fee2e2; color: #991b1b; text-align: center;">2. Faltas</th>
                          <th colspan="3" class="sec-header" style="background-color: #dbeafe; color: #1e40af; text-align: center;">3. Justificaciones</th>
                          <th colspan="3" class="sec-header" style="background-color: #dcfce7; color: #166534; text-align: center;">4. Consolidado</th>
                        </tr>
                        <tr>
                          <!-- 1. Carga Horaria Base -->
                          <th style="width: 75px; text-align: center;">Carga Base</th>
                          <!-- 2. Faltas -->
                          <th style="width: 65px; text-align: center;">Carga Falt.</th>
                          <th style="width: 65px; text-align: center;">Retraso (m)</th>
                          <th style="width: 65px; text-align: center;">Anticip. (m)</th>
                          <!-- 3. Justificaciones -->
                          <th style="width: 65px; text-align: center;">Carga Just.</th>
                          <th style="width: 65px; text-align: center;">Retraso (m)</th>
                          <th style="width: 65px; text-align: center;">Anticip. (m)</th>
                          <!-- 4. Consolidado -->
                          <th style="width: 65px; text-align: center;">Carga Cons.</th>
                          <th style="width: 65px; text-align: center;">Retraso (m)</th>
                          <th style="width: 65px; text-align: center;">Anticip. (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${personasRowsHtml || '<tr><td colspan="13" style="text-align: center; color: #9ca3af; padding: 12px;">Sin registros de personal en este período</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 2: ALERTA DE RETRASOS -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #b45309;">
                      2. Reporte de Alertas — Retrasos Recurrentes (&gt; 3 retrasos)
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 22px;">
                      <thead>
                        <tr>
                          <th style="width: 85px; text-align: center;">Código</th>
                          <th style="width: 170px;">Docente</th>
                          <th style="width: 75px; text-align: center;">Fecha</th>
                          <th>Materia y Grupo</th>
                          <th style="width: 85px; text-align: center;">Horario Clase</th>
                          <th style="width: 70px; text-align: center;">Tickeo Ingreso</th>
                          <th style="width: 70px; text-align: center;">Tickeo Salida</th>
                          <th style="width: 65px; text-align: center;">Retraso</th>
                          <th style="width: 65px; text-align: center;">Anticipado</th>
                          <th style="width: 75px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${retrasosRowsHtml || '<tr><td colspan="10" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de retrasos registradas</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 3: ALERTA DE FALTAS -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #dc2626;">
                      3. Reporte de Alertas — Faltas Acumuladas (3 faltas o más)
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 22px;">
                      <thead>
                        <tr>
                          <th style="width: 85px; text-align: center;">Código</th>
                          <th style="width: 170px;">Docente</th>
                          <th style="width: 75px; text-align: center;">Fecha</th>
                          <th>Materia y Grupo</th>
                          <th style="width: 85px; text-align: center;">Horario Clase</th>
                          <th style="width: 70px; text-align: center;">Tickeo Ingreso</th>
                          <th style="width: 70px; text-align: center;">Tickeo Salida</th>
                          <th style="width: 65px; text-align: center;">Estado</th>
                          <th style="width: 75px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${faltasRowsHtml || '<tr><td colspan="9" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de faltas registradas</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 4: INASISTENCIAS CONSECUTIVAS -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #7f1d1d;">
                      4. Reporte de Alertas — Inasistencias Consecutivas (Secuencia de 6 o más días)
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 10px;">
                      <thead>
                        <tr>
                          <th style="width: 85px; text-align: center;">Código</th>
                          <th style="width: 170px;">Docente</th>
                          <th style="width: 150px; text-align: center;">Período Evaluado</th>
                          <th style="width: 95px; text-align: center;">Faltas Seguidas</th>
                          <th>Evidencias de Inasistencia (Asignatura - Fecha - Horario - Aula)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${inasistenciasRowsHtml || '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de inasistencias consecutivas detectadas</td></tr>'}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `

    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })

    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" })

    const footerTemplate = `
      <div style="font-family: monospace; font-size: 8px; width: 100%; margin: 0 15mm; padding-top: 5px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; align-items: center; color: #9ca3af;">
        <div style="display: flex; flex-direction: column; text-align: left;">
          <span style="font-weight: bold; color: #4b5563; text-transform: uppercase;">SISTEMA DE PARTES MENSUALES</span>
          <span>Documento Oficial de la Universidad Mayor de San Simón</span>
        </div>
        <div style="font-weight: bold; color: #4b5563;">
          Pág. <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      </div>
    `

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footerTemplate,
      margin: {
        top: "15mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    })

    await browser.close()

    return new NextResponse(new Blob([pdfBuffer as unknown as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="parte_mensual_${facultadCodigo}_${fecha_desde}_${fecha_hasta}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error al generar PDF:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el PDF del reporte mensual" },
      { status: 500 }
    )
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error("Error al cerrar el navegador de Puppeteer:", closeError)
      }
    }
  }
}
