import { NextRequest, NextResponse } from "next/server"
import puppeteer, { Browser } from "puppeteer"
import fs from "fs"
import path from "path"

interface ReporteDetalle {
  hora_inicio: string
  hora_fin: string
  persona_nombres: string
  asignatura_nombre: string
  grupo_nombre: string
  aula_codigo: string
  persona_codigo?: string
}

interface ParteDiarioReporte {
  fecha: string
  facultad_codigo: string
  estado: string
  campusNombre?: string
  facultadNombre: string
  detalles: ReporteDetalle[]
}

interface GroupedRow {
  key: string
  indices: number[]
  persona_nombres: string
  persona_codigo?: string
  hora_inicio: string
  hora_fin: string
  detalles: {
    asignatura_nombre: string
    grupo_nombre: string
    aula_codigo: string
  }[]
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = Number(parts[0] || 0)
  const m = Number(parts[1] || 0)
  return h * 60 + m
}

function groupSchedules(detalles: ReporteDetalle[]): GroupedRow[] {
  const itemsWithIndex = detalles.map((d, idx) => ({
    ...d,
    originalIndex: idx + 1,
  }))

  const byTeacher: Record<string, typeof itemsWithIndex> = {}
  itemsWithIndex.forEach((item) => {
    const key = item.persona_codigo || item.persona_nombres
    if (!byTeacher[key]) {
      byTeacher[key] = []
    }
    byTeacher[key].push(item)
  })

  const groupedRows: GroupedRow[] = []

  Object.entries(byTeacher).forEach(([teacherKey, list]) => {
    const sorted = [...list].sort((a, b) => {
      return parseTimeToMinutes(a.hora_inicio) - parseTimeToMinutes(b.hora_inicio)
    })

    const mergedGroups: (typeof itemsWithIndex)[] = []

    sorted.forEach((item) => {
      const start = parseTimeToMinutes(item.hora_inicio)
      const end = parseTimeToMinutes(item.hora_fin)

      let placed = false
      for (const group of mergedGroups) {
        const overlaps = group.some((gItem) => {
          const gStart = parseTimeToMinutes(gItem.hora_inicio)
          const gEnd = parseTimeToMinutes(gItem.hora_fin)
          return start < gEnd && gStart < end
        })

        if (overlaps) {
          group.push(item)
          placed = true
          break
        }
      }

      if (!placed) {
        mergedGroups.push([item])
      }
    })

    mergedGroups.forEach((group, groupIdx) => {
      const indices = group.map((item) => item.originalIndex).sort((a, b) => a - b)

      const starts = group.map((item) => parseTimeToMinutes(item.hora_inicio))
      const ends = group.map((item) => parseTimeToMinutes(item.hora_fin))
      const minStart = Math.min(...starts)
      const maxEnd = Math.max(...ends)

      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60)
          .toString()
          .padStart(2, "0")
        const m = (mins % 60).toString().padStart(2, "0")
        return `${h}:${m}`
      }

      const hora_inicio = formatTime(minStart)
      const hora_fin = formatTime(maxEnd)

      const first = group[0]

      groupedRows.push({
        key: `${teacherKey}-${minStart}-${maxEnd}-${groupIdx}`,
        indices,
        persona_nombres: first.persona_nombres,
        persona_codigo: first.persona_codigo,
        hora_inicio,
        hora_fin,
        detalles: group.map((item) => ({
          asignatura_nombre: item.asignatura_nombre,
          grupo_nombre: item.grupo_nombre,
          aula_codigo: item.aula_codigo,
        })),
      })
    })
  })

  return groupedRows.sort((a, b) => {
    const timeA = parseTimeToMinutes(a.hora_inicio)
    const timeB = parseTimeToMinutes(b.hora_fin)
    if (timeA !== timeB) return timeA - timeB
    return a.persona_nombres.localeCompare(b.persona_nombres)
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get("fecha")
  const nullSafeFacultadCodigo = searchParams.get("facultadCodigo")
  const facultadNombreParam = searchParams.get("facultadNombre")
  const userNameParam = searchParams.get("userName")
  const horaInicio = searchParams.get("hora_inicio")
  const horaFin = searchParams.get("hora_fin")

  if (!fecha || !nullSafeFacultadCodigo) {
    return NextResponse.json(
      { error: "Faltan parámetros requeridos: fecha y facultadCodigo" },
      { status: 400 }
    )
  }

  const userName = userNameParam ? decodeURIComponent(userNameParam) : "Administrador"

  let browser: Browser | null = null

  try {
    let backendUrl = process.env.NEXT_PUBLIC_PARTES_URL ?? "http://localhost:3006"

    if (backendUrl.includes("localhost")) {
      backendUrl = backendUrl.replace("localhost", "host.docker.internal")
    } else if (backendUrl.includes("127.0.0.1")) {
      backendUrl = backendUrl.replace("127.0.0.1", "host.docker.internal")
    }

    let fetchUrl = `${backendUrl}/partes-diarios/reporte?fecha=${fecha}&facultadCodigo=${nullSafeFacultadCodigo}`

    if (horaInicio && horaFin) {
      fetchUrl += `&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
    }

    const res = await fetch(fetchUrl, { cache: "no-store" })
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "No se encontró el parte diario para la facultad y fecha indicadas" },
          { status: 404 }
        )
      }
      throw new Error(`Error del backend de partes: ${res.statusText}`)
    }

    const data: ParteDiarioReporte = await res.json()
    const facultadNombre = facultadNombreParam
      ? decodeURIComponent(facultadNombreParam)
      : data.facultadNombre

    const [dayStr, monthStr, yearStr] = fecha.split("-")
    const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
    const nombreDia = dateObj.toLocaleDateString("es-BO", { weekday: "long" })

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
    })

    const groupedRows = groupSchedules(data.detalles)

    const rowsHtml = groupedRows
      .map((row) => {
        const nCol = row.indices.join(", ")
        const horarioCol = `${row.hora_inicio} -<br/>${row.hora_fin}`

        const subjectsHtml = row.detalles
          .map(
            (d, idx) =>
              `<div class="${idx > 0 ? "border-t border-gray-300 pt-1 mt-1" : ""}">${d.asignatura_nombre}</div>`
          )
          .join("")

        const groupsHtml = row.detalles
          .map(
            (d, idx) =>
              `<div class="${idx > 0 ? "border-t border-gray-300 pt-1 mt-1 text-center font-bold" : "text-center font-bold"}">${d.grupo_nombre}</div>`
          )
          .join("")

        const aulasHtml = row.detalles
          .map(
            (d, idx) =>
              `<div class="${idx > 0 ? "border-t border-gray-300 pt-1 mt-1 text-center font-mono" : "text-center font-mono"}">${d.aula_codigo || "S/R"}</div>`
          )
          .join("")

        const heightPx = Math.max(32, row.detalles.length * 28)

        return `
          <tr class="hover:bg-gray-50/50">
            <td style="text-align: center; font-family: monospace; color: #6b7280; width: 30px; vertical-align: middle;">
              ${nCol}
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: 500; color: #1f2937; width: 60px; vertical-align: middle;">
              ${horarioCol}
            </td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle;">
              ${row.persona_nombres}
            </td>
            <td class="text-gray-700 text-[9.5px]" style="vertical-align: middle; padding: 4px 6px;">
              ${subjectsHtml}
            </td>
            <td style="vertical-align: middle; padding: 4px 6px; width: 35px;">
              ${groupsHtml}
            </td>
            <td style="vertical-align: middle; padding: 4px 6px; width: 50px;">
              ${aulasHtml}
            </td>
            <td style="text-align: center; position: relative; height: ${heightPx}px; width: 85px; vertical-align: middle;">
              <div style="border-bottom: 1px dotted #9ca3af; position: absolute; left: 4px; right: 4px; bottom: 4px;"></div>
            </td>
            <td style="text-align: center; position: relative; height: ${heightPx}px; width: 85px; vertical-align: middle;">
              <div style="border-bottom: 1px dotted #9ca3af; position: absolute; left: 4px; right: 4px; bottom: 4px;"></div>
            </td>
            <td style="position: relative; height: ${heightPx}px; width: 105px; vertical-align: middle;">
              <div style="border-bottom: 1px dotted #d1d5db; position: absolute; left: 4px; right: 4px; bottom: 4px;"></div>
            </td>
          </tr>
        `
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
            .signatures-table {
              width: 100% !important;
              border-collapse: collapse !important;
              text-align: left;
              font-size: 9.5px;
              border: 1px solid #d1d5db !important;
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
              padding: 6px 4px !important;
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
                            SISTEMA DE PARTES
                          </span>
                        </div>
                      </div>
                      <div class="text-right flex flex-col justify-end items-end">
                        <h2 class="font-roboto font-black text-[#001B47] text-sm leading-tight uppercase">
                          PARTE DIARIO DE ASISTENCIA
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
                        <span class="font-bold text-gray-950">Facultad: </span>
                        ${facultadNombre} (${nullSafeFacultadCodigo})
                      </div>
                      ${data.campusNombre ? `<div><span class="font-bold text-gray-950">Campus: </span>${data.campusNombre}</div>` : ""}
                    </div>
                    <div class="text-right self-center">
                      <div>
                        <span class="font-bold text-gray-950">Fecha: </span>
                        ${fecha.replace(/-/g, "/")}
                        <span class="mx-2 text-gray-300">|</span>
                        <span class="font-bold text-gray-950">Día: </span>
                        <span class="capitalize">${nombreDia}</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody class="table-row-group">
              <tr>
                <td class="border-none p-0">
                  <div style="border-radius: 6px; overflow: hidden; border: 1px solid #d1d5db;">
                    <table class="signatures-table">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th style="width: 30px; text-align: center;">N°</th>
                          <th style="width: 60px; text-align: center;">Horario</th>
                          <th>Docente</th>
                          <th>Asignatura</th>
                          <th style="width: 35px; text-align: center;">GP</th>
                          <th style="width: 50px; text-align: center;">Aula</th>
                          <th style="width: 85px; text-align: center;">Ingreso</th>
                          <th style="width: 85px; text-align: center;">Salida</th>
                          <th style="width: 105px; text-align: center;">OBSERVACIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rowsHtml}
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
          <span style="font-weight: bold; color: #4b5563; text-transform: uppercase;">SISTEMA DE PARTES</span>
          <span>Documento Oficial de la Universidad Mayor de San Simón</span>
        </div>
        <div style="font-weight: bold; color: #4b5563;">
          Pág. <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      </div>
    `

    const pdfBuffer = await page.pdf({
      format: "A4",
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
        "Content-Disposition": `inline; filename="parte_diario_${fecha}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error al generar PDF:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el PDF" },
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
