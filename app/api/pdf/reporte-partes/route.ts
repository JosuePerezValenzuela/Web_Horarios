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
}

interface ParteDiarioReporte {
  fecha: string
  facultad_codigo: string
  estado: string
  campusNombre?: string
  facultadNombre: string
  detalles: ReporteDetalle[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fecha = searchParams.get("fecha")
  const facultadCodigo = searchParams.get("facultadCodigo")
  const facultadNombreParam = searchParams.get("facultadNombre")
  const userNameParam = searchParams.get("userName")
  const horaInicio = searchParams.get("hora_inicio")
  const horaFin = searchParams.get("hora_fin")

  if (!fecha || !facultadCodigo) {
    return NextResponse.json(
      { error: "Faltan parámetros requeridos: fecha y facultadCodigo" },
      { status: 400 }
    )
  }

  const userName = userNameParam ? decodeURIComponent(userNameParam) : "Administrador"

  let browser: Browser | null = null

  try {
    // 1. Obtener la información del backend de partes diarios
    let backendUrl = process.env.NEXT_PUBLIC_PARTES_URL ?? "http://localhost:3006"

    if (backendUrl.includes("localhost")) {
      backendUrl = backendUrl.replace("localhost", "host.docker.internal")
    } else if (backendUrl.includes("127.0.0.1")) {
      backendUrl = backendUrl.replace("127.0.0.1", "host.docker.internal")
    }

    let fetchUrl = `${backendUrl}/partes-diarios/reporte?fecha=${fecha}&facultadCodigo=${facultadCodigo}`

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

    // Formatear día en español para la cabecera
    const [dayStr, monthStr, yearStr] = fecha.split("-")
    const dateObj = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr))
    const nombreDia = dateObj.toLocaleDateString("es-BO", { weekday: "long" })

    // Leer el logo local y pasarlo a Base64
    let logoBase64 = ""
    try {
      const logoPath = path.join(process.cwd(), "public", "umss1.png")
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`
    } catch (err) {
      console.error("No se pudo leer el logo para el PDF:", err)
    }

    // Generar la fecha de emisión de hoy
    const todayStr = new Date().toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    // 2. Compilar las filas del reporte en HTML estático
    const rowsHtml = data.detalles
      .map((detalle, idx) => {
        return `
          <tr class="hover:bg-gray-50/50">
            <td style="text-align: center; font-family: monospace; color: #6b7280; width: 30px;">
              ${idx + 1}
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: 500; color: #1f2937; width: 60px;">
              ${detalle.hora_inicio} -<br/>${detalle.hora_fin}
            </td>
            <td class="font-semibold text-gray-950">
              ${detalle.persona_nombres}
            </td>
            <td class="text-gray-700 text-[9.5px]">
              ${detalle.asignatura_nombre}
            </td>
            <td style="text-align: center; font-weight: bold; color: #111827; width: 35px;">
              ${detalle.grupo_nombre}
            </td>
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #374151; width: 50px;">
              ${detalle.aula_codigo || "S/R"}
            </td>
            <td style="text-align: center; position: relative; height: 32px; width: 85px;">
              <div style="border-bottom: 1px dotted #9ca3af; position: absolute; left: 4px; right: 4px; bottom: 4px;"></div>
            </td>
            <td style="text-align: center; position: relative; height: 32px; width: 85px;">
              <div style="border-bottom: 1px dotted #9ca3af; position: absolute; left: 4px; right: 4px; bottom: 4px;"></div>
            </td>
            <td style="position: relative; height: 32px; width: 105px;">
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
          <!-- Cargar Tailwind CSS CDN para usar exactamente las mismas clases de la web -->
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
          <!-- Usar tabla contenedora nativa de A4 para repetir cabecera y pie de página de forma automática y precisa -->
          <table class="w-full border-none">
            <thead class="table-header-group">
              <tr>
                <td class="border-none p-0 pb-1">
                  <!-- Cabecera Institucional Oficial (Idéntica al componente PdfHeader de la web) -->
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

                  <!-- Metadata -->
                  <div class="flex justify-between border border-gray-300 bg-gray-50/50 p-2.5 rounded-lg text-gray-700 text-[10px] mb-2">
                    <div class="flex flex-col gap-1">
                      <div>
                        <span class="font-bold text-gray-950">Facultad: </span>
                        ${facultadNombre} (${facultadCodigo})
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

    // 3. Lanzar Puppeteer para generar el PDF
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

    // Pie de página oficial inyectado por Chromium
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

    // 4. Retornar el archivo PDF generado como respuesta binaria
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
