import React from "react"
import { PdfHeader } from "./PdfHeader"

interface PdfLayoutProps {
  children: React.ReactNode
  reportTitle: string
  userName?: string
  institutionName?: string
  systemName?: string
  logoUrl?: string
  fechaEmision?: string
  orientation?: "portrait" | "landscape"
  pageSize?: "A4" | "letter"
}

export const PdfLayout: React.FC<PdfLayoutProps> = ({
  children,
  reportTitle,
  userName,
  institutionName,
  systemName,
  logoUrl,
  fechaEmision,
  orientation = "portrait",
  pageSize = "letter",
}) => {
  // Configuración de dimensiones de página en base a orientación y tamaño
  const pageStyles = `
    @page {
      size: ${pageSize} ${orientation};
      margin: 15mm 15mm 15mm 15mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background-color: white !important;
        color: black !important;
      }
      .page-break-before {
        page-break-before: always;
      }
      .page-break-inside-avoid {
        page-break-inside: avoid;
      }
    }
  `

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <title>{reportTitle}</title>
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
        {/* Usamos TailwindCSS que ya estará inyectado en el contexto de Puppeteer */}
      </head>
      <body className="bg-white text-black font-sans antialiased p-0 m-0 w-full text-xs">
        {/* Contenedor principal de la estructura del reporte */}
        <div className="w-full">
          {/* El truco de la tabla permite repetir cabecera y pie en cada página al imprimir */}
          <table className="w-full border-collapse border-none">
            {/* Cabecera del documento que se repite en cada página */}
            <thead className="table-header-group">
              <tr>
                <td className="border-none p-0">
                  <PdfHeader
                    logoUrl={logoUrl}
                    institutionName={institutionName}
                    systemName={systemName}
                    reportTitle={reportTitle}
                    userName={userName}
                    fechaEmision={fechaEmision}
                  />
                </td>
              </tr>
            </thead>

            {/* Contenido principal del reporte */}
            <tbody className="table-row-group">
              <tr>
                <td className="border-none p-0">
                  <main className="w-full py-2">{children}</main>
                </td>
              </tr>
            </tbody>

            {/* Pie de página (opcional, para firmas o marcas de agua) */}
            <tfoot className="table-footer-group">
              <tr>
                <td className="border-none p-0 pt-4">
                  <div className="w-full border-t border-gray-200 mt-6 pt-2 flex items-center justify-between text-[9px] font-mono text-gray-400 select-none">
                    <div>
                      <span>Documento Oficial de la Universidad Mayor de San Simón</span>
                    </div>
                    {/* El número de página es inyectado dinámicamente por Puppeteer al imprimir */}
                    <div className="text-right">
                      <span>Pág. </span>
                      <span className="pdf-page-number"></span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </body>
    </html>
  )
}
