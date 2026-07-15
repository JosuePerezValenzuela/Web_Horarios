import React from "react"

interface PdfFooterProps {
  systemName: string
  customText?: string
  page?: number
  total?: number
}

export const PdfFooter: React.FC<PdfFooterProps> = ({
  systemName,
  customText = "Documento Oficial de la Universidad Mayor de San Simón",
  page = 1,
  total = 1,
}) => {
  return (
    <footer className="w-full border-t border-gray-300 mt-6 pt-2 flex items-center justify-between text-[9px] font-mono text-gray-400 select-none print-color-adjust-exact">
      {/* Left side: System name and custom institutional text */}
      <div className="flex flex-col gap-0.5 text-left">
        <span className="font-bold text-gray-600 uppercase tracking-wide">{systemName}</span>
        <span className="text-gray-400">{customText}</span>
      </div>

      {/* Right side: Page numbering */}
      <div className="text-right flex items-center gap-1 font-bold text-gray-500">
        <span>Pág.</span>
        <span className="pdf-page-number">{page}</span>
        <span>de</span>
        <span className="pdf-total-pages">{total}</span>
      </div>
    </footer>
  )
}
