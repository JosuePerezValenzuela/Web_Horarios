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
  AlertaRetrasoOcurrencia,
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
      alertas = { retrasos: [], faltas: [], inasistencias_consecutivas: [] },
    } = reporte
    const facultadCodigo = objetivo || (reporte as any).facultad_codigo || ""

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

    // ==========================================
    // 1. TABLA PRINCIPAL DE PERSONAL (4 SECCIONES)
    // ==========================================
    const personasRowsHtml = personas
      .map((p: ReporteMensualPersona, idx: number) => {
        // Carga Horaria Mensual: suma de carga_horaria_mensual de sus asignaciones o fallback calculado
        const totalCargaMensual =
          p.asignaciones?.reduce((acc, a) => acc + (Number(a.carga_horaria_mensual) || 0), 0) ||
          (p.raw?.occurrence_load ? p.raw.occurrence_load * 4 : 0)

        const raw = p.raw || { absence_load: 0, delay_minutes: 0, early_minutes: 0 }
        const license = p.license || { absence_load: 0, delay_minutes: 0, early_minutes: 0 }
        const consolidated = p.consolidated || { occurrence_load: 0 }

        return `
        <tr class="hover:bg-gray-50/50">
          <td style="text-align: center; font-family: monospace; color: #6b7280; width: 35px; vertical-align: middle;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 500; color: #1f2937; width: 85px; vertical-align: middle;">${p.persona_codigo}</td>
          <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px;">${p.persona_nombres}</td>
          <!-- 1. Carga Horaria -->
          <td style="text-align: center; font-family: monospace; font-weight: bold; vertical-align: middle; width: 75px; background-color: #f8fafc;">${totalCargaMensual} hrs</td>
          <!-- 2. Faltas (raw) -->
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px; color: #dc2626; font-weight: 500;">${raw.absence_load ?? 0}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px; color: #b45309;">${raw.delay_minutes ?? 0}m</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px; color: #047857;">${raw.early_minutes ?? 0}m</td>
          <!-- 3. Justificaciones (license) -->
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 70px; color: #2563eb;">${license.absence_load ?? 0}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px; color: #4b5563;">${license.delay_minutes ?? 0}m</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px; color: #4b5563;">${license.early_minutes ?? 0}m</td>
          <!-- 4. Consolidado / T (consolidated) -->
          <td style="text-align: center; font-family: monospace; font-weight: bold; vertical-align: middle; width: 80px; background-color: #f0fdf4; color: #15803d;">${consolidated.occurrence_load ?? 0}</td>
        </tr>
      `
      })
      .join("")

    // Helper to get evidence list from an alert item
    const getEvidencias = (
      item: AlertaRetrasoItem | AlertaFaltaItem | AlertaInasistenciaConsecutivaItem
    ): AlertaRetrasoOcurrencia[] => {
      if (Array.isArray(item.evidencias) && item.evidencias.length > 0) return item.evidencias
      if (Array.isArray(item.evidence) && item.evidence.length > 0) return item.evidence
      if ("secuencias" in item && Array.isArray(item.secuencias) && item.secuencias.length > 0) {
        return item.secuencias.flatMap((s) => s.evidencias || [])
      }
      return []
    }

    // ==========================================
    // 2. ALERTAS: RETRASOS (1 fila por docente con sub-filas agrupadas)
    // ==========================================
    const retrasosRowsHtml = (alertas.retrasos || [])
      .map((item: AlertaRetrasoItem) => {
        const evs = getEvidencias(item)
        if (evs.length === 0) {
          return `
          <tr>
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px;">${item.persona_nombres}</td>
            <td colspan="6" style="text-align: center; color: #9ca3af; padding: 6px;">Sin detalle de incidencias registradas</td>
          </tr>
        `
        }

        const first = evs[0]
        const remaining = evs.slice(1)
        const rowspan = evs.length

        const firstRow = `
        <tr>
          <td rowspan="${rowspan}" style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle; background-color: #fafafa;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px; background-color: #fafafa;">${item.persona_nombres}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 80px;">${first.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${first.asignatura_nombre} (${first.asignatura_codigo}) - G: ${first.grupo_nombre}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${first.hora_inicio} - ${first.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${first.hora_ingreso_tickeo || "S/R"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #b45309; vertical-align: middle; width: 75px;">${first.minutos_retraso ?? 0} min</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 85px;">${first.aula_codigo || "S/R"}</td>
        </tr>
      `

        const otherRows = remaining
          .map(
            (ev) => `
        <tr>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 80px;">${ev.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre} (${ev.asignatura_codigo}) - G: ${ev.grupo_nombre}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.hora_ingreso_tickeo || "S/R"}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #b45309; vertical-align: middle; width: 75px;">${ev.minutos_retraso ?? 0} min</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 85px;">${ev.aula_codigo || "S/R"}</td>
        </tr>
      `
          )
          .join("")

        return firstRow + otherRows
      })
      .join("")

    // ==========================================
    // 3. ALERTAS: FALTAS (1 fila por docente con sub-filas agrupadas)
    // ==========================================
    const faltasRowsHtml = (alertas.faltas || [])
      .map((item: AlertaFaltaItem) => {
        const evs = getEvidencias(item)
        if (evs.length === 0) {
          return `
          <tr>
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px;">${item.persona_nombres}</td>
            <td colspan="5" style="text-align: center; color: #9ca3af; padding: 6px;">Sin detalle de faltas registradas</td>
          </tr>
        `
        }

        const first = evs[0]
        const remaining = evs.slice(1)
        const rowspan = evs.length

        const firstRow = `
        <tr>
          <td rowspan="${rowspan}" style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle; background-color: #fafafa;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px; background-color: #fafafa;">${item.persona_nombres}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 80px;">${first.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${first.asignatura_nombre} (${first.asignatura_codigo}) - G: ${first.grupo_nombre}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${first.hora_inicio} - ${first.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 85px;">FALTA</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 85px;">${first.aula_codigo || "S/R"}</td>
        </tr>
      `

        const otherRows = remaining
          .map(
            (ev) => `
        <tr>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 80px;">${ev.fecha}</td>
          <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre} (${ev.asignatura_codigo}) - G: ${ev.grupo_nombre}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 85px;">FALTA</td>
          <td style="text-align: center; font-size: 8.5px; vertical-align: middle; width: 85px;">${ev.aula_codigo || "S/R"}</td>
        </tr>
      `
          )
          .join("")

        return firstRow + otherRows
      })
      .join("")

    // ==========================================
    // 4. ALERTAS: INASISTENCIAS CONSECUTIVAS (1 fila por docente con sub-filas agrupadas)
    // ==========================================
    const inasistenciasRowsHtml = (alertas.inasistencias_consecutivas || [])
      .map((item: AlertaInasistenciaConsecutivaItem) => {
        const secuencias =
          item.secuencias ||
          (item.evidencias || item.evidence
            ? [
                {
                  fecha_inicio: item.fecha_inicio || item.evidencias?.[0]?.fecha || fecha_desde,
                  fecha_fin:
                    item.fecha_fin ||
                    item.evidencias?.[(item.evidencias?.length ?? 1) - 1]?.fecha ||
                    fecha_hasta,
                  cantidad_ocurrencias: item.count || (item.evidencias?.length ?? 0),
                  evidencias: item.evidencias || item.evidence || [],
                },
              ]
            : [])

        if (secuencias.length === 0) {
          return `
          <tr>
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${item.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px;">${item.persona_nombres}</td>
            <td colspan="3" style="text-align: center; color: #9ca3af; padding: 6px;">Sin secuencias consecutivas detectadas</td>
          </tr>
        `
        }

        const firstSec = secuencias[0]
        const remainingSec = secuencias.slice(1)
        const rowspan = secuencias.length

        const formatEvsList = (evs: AlertaRetrasoOcurrencia[]) =>
          evs
            .map(
              (e) =>
                `<div>• <b>${e.fecha}</b>: ${e.asignatura_nombre || e.asignatura_codigo} (${e.hora_inicio || ""}-${e.hora_fin || ""}) G: ${e.grupo_nombre || ""}</div>`
            )
            .join("")

        const firstRow = `
        <tr>
          <td rowspan="${rowspan}" style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle; background-color: #fafafa;">${item.persona_codigo}</td>
          <td rowspan="${rowspan}" class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px; width: 180px; background-color: #fafafa;">${item.persona_nombres}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 150px; font-weight: 500;">
            Desde: ${firstSec.fecha_inicio}<br />Hasta: ${firstSec.fecha_fin}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 95px;">
            ${firstSec.cantidad_ocurrencias ?? firstSec.evidencias?.length ?? 0} clases
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8px; padding: 5px;">
            ${formatEvsList(firstSec.evidencias || [])}
          </td>
        </tr>
      `

        const otherRows = remainingSec
          .map(
            (sec) => `
        <tr>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 150px; font-weight: 500;">
            Desde: ${sec.fecha_inicio}<br />Hasta: ${sec.fecha_fin}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 95px;">
            ${sec.cantidad_ocurrencias ?? sec.evidencias?.length ?? 0} clases
          </td>
          <td style="text-align: left; vertical-align: middle; font-size: 8px; padding: 5px;">
            ${formatEvsList(sec.evidencias || [])}
          </td>
        </tr>
      `
          )
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
              border: none !important;
            }
            .signatures-table th {
              background-color: #f3f4f6;
              color: #111827;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8px;
            }
            .signatures-table th, .signatures-table td {
              border: 1px solid #d1d5db !important;
              padding: 5px 4px !important;
            }
            .sec-header {
              text-align: center;
              font-weight: 800;
              font-size: 8.5px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
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
                          REPORTE MENSUAL DE ASISTENCIA
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
                        <span class="font-bold text-gray-950">Facultad / Objetivo: </span>
                        ${facultadNombre || facultadCodigo} (${facultadCodigo})
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
                          <th rowspan="2" style="width: 35px; text-align: center;">N°</th>
                          <th rowspan="2" style="width: 85px; text-align: center;">Código</th>
                          <th rowspan="2">Docente / Funcionario</th>
                          <th class="sec-header" style="background-color: #e2e8f0; color: #1e293b;">1. Carga Horaria</th>
                          <th colspan="3" class="sec-header" style="background-color: #fee2e2; color: #991b1b;">2. Faltas (Raw)</th>
                          <th colspan="3" class="sec-header" style="background-color: #dbeafe; color: #1e40af;">3. Justificaciones (License)</th>
                          <th class="sec-header" style="background-color: #dcfce7; color: #166534;">4. Consolidado (T)</th>
                        </tr>
                        <tr>
                          <!-- 1. Carga Horaria -->
                          <th style="width: 75px; text-align: center;">Carga Mens.</th>
                          <!-- 2. Faltas -->
                          <th style="width: 70px; text-align: center;">Carga Falt.</th>
                          <th style="width: 75px; text-align: center;">Retraso (m)</th>
                          <th style="width: 75px; text-align: center;">Anticip. (m)</th>
                          <!-- 3. Justificaciones -->
                          <th style="width: 70px; text-align: center;">Carga Just.</th>
                          <th style="width: 75px; text-align: center;">Retraso (m)</th>
                          <th style="width: 75px; text-align: center;">Anticip. (m)</th>
                          <!-- 4. Consolidado -->
                          <th style="width: 80px; text-align: center;">Ocurr. Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${personasRowsHtml || '<tr><td colspan="11" style="text-align: center; color: #9ca3af; padding: 12px;">Sin registros de personal en este período</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 2: ALERTA DE RETRASOS (INICIA EN HOJA NUEVA) -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #b45309;">
                      2. Reporte de Alertas — Retrasos Recurrentes
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th style="width: 180px;">Docente</th>
                          <th style="width: 80px; text-align: center;">Fecha</th>
                          <th>Asignatura y Grupo</th>
                          <th style="width: 90px; text-align: center;">Horario Clase</th>
                          <th style="width: 75px; text-align: center;">Tickeo Ingreso</th>
                          <th style="width: 75px; text-align: center;">Retraso</th>
                          <th style="width: 85px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${retrasosRowsHtml || '<tr><td colspan="8" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de retrasos registradas</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 3: ALERTA DE FALTAS (INICIA EN HOJA NUEVA) -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #dc2626;">
                      3. Reporte de Alertas — Faltas Acumuladas
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th style="width: 180px;">Docente</th>
                          <th style="width: 80px; text-align: center;">Fecha</th>
                          <th>Asignatura y Grupo</th>
                          <th style="width: 90px; text-align: center;">Horario Clase</th>
                          <th style="width: 85px; text-align: center;">Estado</th>
                          <th style="width: 85px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${faltasRowsHtml || '<tr><td colspan="7" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de faltas registradas</td></tr>'}
                      </tbody>
                    </table>

                    <!-- SECCIÓN 4: INASISTENCIAS CONSECUTIVAS (INICIA EN HOJA NUEVA) -->
                    <div class="page-break"></div>
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #7f1d1d;">
                      4. Reporte de Alertas — Inasistencias Consecutivas
                    </h3>
                    <table class="signatures-table" style="margin-bottom: 10px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th style="width: 180px;">Docente</th>
                          <th style="width: 150px; text-align: center;">Período Evaluado</th>
                          <th style="width: 95px; text-align: center;">Faltas Seguidas</th>
                          <th>Evidencias de Inasistencia (Asignatura - Fecha - Horario)</th>
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
