import { NextRequest, NextResponse } from "next/server"
import puppeteer, { Browser } from "puppeteer"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  let browser: Browser | null = null

  try {
    const body = await request.json()
    const { reporte, userName, facultadNombre } = body

    if (!reporte) {
      return NextResponse.json(
        { error: "Faltan los datos del reporte mensual en el cuerpo de la solicitud" },
        { status: 400 }
      )
    }

    const { facultad_codigo, fecha_desde, fecha_hasta, personas, alertas } = reporte

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

    // Construcción de la tabla de personas
    const personasRowsHtml = personas
      .map(
        (p: any, idx: number) => `
        <tr class="hover:bg-gray-50/50">
          <td style="text-align: center; font-family: monospace; color: #6b7280; width: 40px; vertical-align: middle;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 500; color: #1f2937; width: 90px; vertical-align: middle;">${p.persona_codigo}</td>
          <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 6px 8px;">${p.persona_nombres}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 500; vertical-align: middle;">${p.carga_horaria_mensual} hrs</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; color: #b45309;">${p.minutos_retraso} min</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; color: #047857;">${p.minutos_anticipados} min</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle;">${p.cantidad_retrasos}</td>
          <td style="text-align: center; font-family: monospace; vertical-align: middle; font-weight: bold; color: #dc2626;">${p.cantidad_faltas}</td>
        </tr>
      `
      )
      .join("")

    // Construcción de la tabla de alertas de retrasos
    const retrasosRowsHtml = (alertas.retrasos || [])
      .flatMap((grupo: any) =>
        grupo.evidencias.map(
          (ev: any, idx: number) => `
          <tr class="hover:bg-gray-50/50">
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${grupo.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 5px 6px;">${grupo.persona_nombres}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.fecha}</td>
            <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre} (${ev.asignatura_codigo}) - G: ${ev.grupo_nombre}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.hora_ingreso_tickeo || "S/R"}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #b45309; vertical-align: middle; width: 70px;">${ev.minutos_retraso} min</td>
            <td style="font-size: 8px; vertical-align: middle; padding: 4px; max-width: 90px; overflow-wrap: anywhere;">${ev.aula_codigo || "S/R"}</td>
          </tr>
        `
        )
      )
      .join("")

    // Construcción de la tabla de alertas de faltas
    const faltasRowsHtml = (alertas.faltas || [])
      .flatMap((grupo: any) =>
        grupo.evidencias.map(
          (ev: any) => `
          <tr class="hover:bg-gray-50/50">
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${grupo.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 5px 6px;">${grupo.persona_nombres}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 75px;">${ev.fecha}</td>
            <td style="text-align: left; vertical-align: middle; font-size: 8.5px;">${ev.asignatura_nombre} (${ev.asignatura_codigo}) - G: ${ev.grupo_nombre}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 90px;">${ev.hora_inicio} - ${ev.hora_fin}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 100px;">FALTA</td>
            <td style="font-size: 8px; vertical-align: middle; padding: 4px; max-width: 90px; overflow-wrap: anywhere;">${ev.aula_codigo || "S/R"}</td>
          </tr>
        `
        )
      )
      .join("")

    // Construcción de la tabla de alertas de inasistencias consecutivas
    const inasistenciasRowsHtml = (alertas.inasistencias_consecutivas || [])
      .flatMap((grupo: any) =>
        grupo.secuencias.map(
          (sec: any) => `
          <tr class="hover:bg-gray-50/50">
            <td style="text-align: center; font-family: monospace; font-weight: 500; width: 90px; vertical-align: middle;">${grupo.persona_codigo}</td>
            <td class="font-semibold text-gray-950" style="vertical-align: middle; text-align: left; padding: 5px 6px;">${grupo.persona_nombres}</td>
            <td style="text-align: center; font-family: monospace; vertical-align: middle; width: 150px; font-weight: 500;">Desde: ${sec.fecha_inicio}<br/>Hasta: ${sec.fecha_fin}</td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; vertical-align: middle; width: 90px;">${sec.cantidad_ocurrencias} clases</td>
            <td style="text-align: left; vertical-align: middle; font-size: 8px; padding: 4px;">
              ${sec.evidencias.map((e: any) => `<div>• ${e.fecha}: ${e.asignatura_nombre} (${e.hora_inicio}-${e.hora_fin})</div>`).join("")}
            </td>
          </tr>
        `
        )
      )
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
              table-layout: fixed !important;
              border-collapse: collapse !important;
              text-align: left;
              font-size: 9.5px;
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
                          PARTE MENSUAL DE ASISTENCIA
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
                        ${facultadNombre || facultad_codigo} (${facultad_codigo})
                      </div>
                    </div>
                    <div class="text-right self-center">
                      <div>
                        <span class="font-bold text-gray-950">Rango: </span>
                        Desde: ${fecha_desde} - Hasta: ${fecha_hasta}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody class="table-row-group">
              <tr>
                <td class="border-none p-0">
                  <div style="overflow: hidden;">
                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #003770;">1. Personal y Carga Horaria Acumulada</h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th style="width: 40px; text-align: center;">N°</th>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th>Docente / Funcionario</th>
                          <th style="width: 80px; text-align: center;">Carga Mensual</th>
                          <th style="width: 90px; text-align: center;">Retrasos (Min)</th>
                          <th style="width: 95px; text-align: center;">Anticipados (Min)</th>
                          <th style="width: 70px; text-align: center;">Retrasos (Cant)</th>
                          <th style="width: 70px; text-align: center;">Faltas (Cant)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${personasRowsHtml || '<tr><td colspan="8" style="text-align: center; color: #9ca3af; padding: 12px;">Sin registros de personal</td></tr>'}
                      </tbody>
                    </table>

                    <div class="page-break-before" style="margin-top: 15px;"></div>

                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #b45309;">2. Reporte de Alertas - Retrasos</h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th>Docente</th>
                          <th style="width: 75px; text-align: center;">Fecha</th>
                          <th>Asignatura y Grupo</th>
                          <th style="width: 90px; text-align: center;">Horario Clase</th>
                          <th style="width: 75px; text-align: center;">Tickeo Ingreso</th>
                          <th style="width: 70px; text-align: center;">Retraso</th>
                          <th style="width: 90px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${retrasosRowsHtml || '<tr><td colspan="8" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de retrasos registradas</td></tr>'}
                      </tbody>
                    </table>

                    <div class="page-break-before" style="margin-top: 15px;"></div>

                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #dc2626;">3. Reporte de Alertas - Faltas</h3>
                    <table class="signatures-table" style="margin-bottom: 20px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th>Docente</th>
                          <th style="width: 75px; text-align: center;">Fecha</th>
                          <th>Asignatura y Grupo</th>
                          <th style="width: 90px; text-align: center;">Horario Clase</th>
                          <th style="width: 100px; text-align: center;">Estado</th>
                          <th style="width: 90px; text-align: center;">Aula</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${faltasRowsHtml || '<tr><td colspan="7" style="text-align: center; color: #9ca3af; padding: 12px;">Sin alertas de faltas registradas</td></tr>'}
                      </tbody>
                    </table>

                    <div class="page-break-before" style="margin-top: 15px;"></div>

                    <h3 style="font-size: 11px; font-weight: bold; margin: 10px 0 6px 0; text-transform: uppercase; color: #7f1d1d;">4. Reporte de Alertas - Inasistencias Consecutivas</h3>
                    <table class="signatures-table" style="margin-bottom: 10px;">
                      <thead>
                        <tr>
                          <th style="width: 90px; text-align: center;">Código</th>
                          <th>Docente</th>
                          <th style="width: 150px; text-align: center;">Período Evaluado</th>
                          <th style="width: 90px; text-align: center;">Faltas Seguidas</th>
                          <th>Evidencias de Inasistencia (Asignatura - Fecha - Hora)</th>
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
      landscape: true, // Se requiere horizontal
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
        "Content-Disposition": `inline; filename="parte_mensual_${facultad_codigo}_${fecha_desde}_${fecha_hasta}.pdf"`,
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
