import React from "react"

interface PdfHeaderProps {
  logoUrl?: string
  institutionName?: string
  systemName?: string
  reportTitle: string
  userName?: string
  fechaEmision?: string
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({
  logoUrl = "/umss1.png",
  institutionName = "UNIVERSIDAD MAYOR DE SAN SIMÓN",
  systemName = "SISTEMA DE PLANIFICACIÓN DE HORARIOS",
  reportTitle,
  userName,
  fechaEmision,
}) => {
  const dateStr =
    fechaEmision ||
    new Date().toLocaleDateString("es-BO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <header className="w-full border-b-2 border-[#003770] pb-4 mb-6 select-none print-color-adjust-exact">
      {/* Top Section: Logo + Title */}
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Logo & Institution Info */}
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo Institucional"
            className="w-16 h-16 object-contain"
            // For Puppeteer, we might want to pass an absolute URL or base64.
            // In Next.js server actions, you can resolve the public directory path.
          />
          <div>
            <h1 className="font-roboto font-black text-[#001B47] text-base uppercase tracking-wide">
              {institutionName}
            </h1>
            <p className="font-sans text-xs text-gray-500 font-semibold uppercase tracking-wider">
              {systemName}
            </p>
          </div>
        </div>

        {/* Right Side: Meta Info (User & Date) */}
        <div className="text-right text-[10px] font-mono text-gray-500 space-y-1">
          {userName && (
            <div>
              <span className="font-bold text-gray-700">Usuario:</span> {userName}
            </div>
          )}
          <div>
            <span className="font-bold text-gray-700">Generado:</span> {dateStr}
          </div>
        </div>
      </div>

      {/* Decorative colored line matching UMSS (Primary Blue & Accent Red) */}
      <div className="w-full h-1 flex mt-4">
        <div className="h-full bg-[#003770] w-3/4"></div>
        <div className="h-full bg-[#BC000C] w-1/4"></div>
      </div>

      {/* Report Title Banner */}
      <div className="mt-4 text-center">
        <h2 className="font-roboto font-extrabold text-xl text-[#001B47] tracking-tight uppercase">
          {reportTitle}
        </h2>
      </div>
    </header>
  )
}
