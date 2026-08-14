"use client"

/**
 * Docentes pagination component using styles library elements
 */

import { useState } from "react"
import { useDocentesStore } from "../application/docentesStore"
import { Button, Input } from "@umss/estilos-base/components"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

export function DocentesPagination() {
  const { pagination, loadingDocentes, setPage, setPageSize } = useDocentesStore()
  const { currentPage, totalPages, pageSize, totalRecords } = pagination
  const [inputPage, setInputPage] = useState("")
  const [inputPageSize, setInputPageSize] = useState(pageSize.toString())

  // Calculate record range
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)

  // Don't render if only one page or no pages
  if (totalPages <= 1 && totalRecords <= pageSize) {
    return null
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  // Handle page input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setInputPage(value)
  }

  // Handle page input submit on Enter
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(inputPage, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setPage(page)
    }
    setInputPage("")
  }

  // Handle direct page click
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPage(page)
    }
  }

  // Handle pageSize input
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setInputPageSize(value)
  }

  const applyPageSize = () => {
    const newSize = parseInt(inputPageSize, 10)
    if (!isNaN(newSize) && newSize > 0 && newSize !== pageSize) {
      setPageSize(newSize)
    }
    setInputPageSize((newSize > 0 ? newSize : pageSize).toString())
  }

  // Handle first/previous/next/last
  const handleFirst = () => setPage(1)
  const handlePrevious = () => currentPage > 1 && setPage(currentPage - 1)
  const handleNext = () => currentPage < totalPages && setPage(currentPage + 1)
  const handleLast = () => setPage(totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2">
      {/* Left: Records indicator */}
      <span className="text-xs font-semibold text-muted-foreground shrink-0 uppercase tracking-wide">
        Mostrando {startRecord}-{endRecord} de {totalRecords} docentes
      </span>

      {/* Right: All navigation controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* PageSize input */}
        <div className="flex shrink-0 items-center gap-1.5 mr-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Reg/pág:
          </span>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputPageSize}
            onChange={handlePageSizeChange}
            onBlur={applyPageSize}
            disabled={loadingDocentes}
            className="h-8 w-12 text-center text-xs font-semibold rounded-lg"
            aria-label="Registros por página"
          />
        </div>

        {/* First */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleFirst}
          disabled={currentPage === 1 || loadingDocentes}
          aria-label="Primera página"
          className="rounded-lg shrink-0 cursor-pointer border-border size-8"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={currentPage === 1 || loadingDocentes}
          aria-label="Página anterior"
          className="rounded-lg shrink-0 cursor-pointer border-border size-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers - desktop */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {getPageNumbers().map((page, index) => (
            <span key={index}>
              {page === "..." ? (
                <span className="px-1.5 text-xs text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={page === currentPage ? "primary" : "outline"}
                  size="icon"
                  onClick={() => handlePageClick(page as number)}
                  disabled={loadingDocentes}
                  className={`rounded-lg cursor-pointer transition-all size-8 ${
                    page === currentPage
                      ? "bg-[#002855] text-white hover:bg-[#001b3a] font-bold border-transparent"
                      : "border-border text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {page}
                </Button>
              )}
            </span>
          ))}
        </div>

        {/* Mobile page indicator */}
        <span className="md:hidden text-xs font-bold text-muted-foreground px-1.5 shrink-0">
          {currentPage} / {totalPages}
        </span>

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentPage === totalPages || loadingDocentes}
          aria-label="Siguiente página"
          className="rounded-lg shrink-0 cursor-pointer border-border size-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleLast}
          disabled={currentPage === totalPages || loadingDocentes}
          aria-label="Última página"
          className="rounded-lg shrink-0 cursor-pointer border-border size-8"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>

        {/* Go to page */}
        <form onSubmit={handleInputSubmit} className="flex items-center shrink-0 ml-1">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ir a..."
            value={inputPage}
            onChange={handleInputChange}
            className="w-16 h-8 text-center text-xs font-semibold rounded-lg"
            aria-label="Ir a página"
          />
        </form>
      </div>
    </div>
  )
}
