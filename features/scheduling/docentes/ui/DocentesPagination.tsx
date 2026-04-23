"use client"

/**
 * Docentes pagination component
 * "1 de X paginas" format with manual input
 */

import { useState } from "react"
import { useDocentesStore } from "../application/docentesStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DocentesPagination() {
  const { pagination, loadingDocentes, setPage } = useDocentesStore()
  const [inputPage, setInputPage] = useState("")

  const { currentPage, totalPages } = pagination

  // Don't render if only one page or no pages
  if (totalPages <= 1) {
    return null
  }

  // Handle page input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setInputPage(value)
  }

  // Handle page input submit
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(inputPage, 10)
    if (!isNaN(page)) {
      setPage(page)
    }
    setInputPage("")
  }

  // Handle previous/next click
  const handlePrevious = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1)
    }
  }

  // Format message: "1 de X paginas"
  const formatMessage = `${currentPage} de ${totalPages} paginas`

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
      {/* Page indicator */}
      <span className="text-sm text-muted-foreground">{formatMessage}</span>

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1 || loadingDocentes}
        >
          Anterior
        </Button>

        {/* Manual page input */}
        <form onSubmit={handleInputSubmit} className="flex items-center gap-1">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={currentPage.toString()}
            value={inputPage}
            onChange={handleInputChange}
            className="w-16 text-center"
            aria-label="Numero de pagina"
          />
          <Button type="submit" variant="outline" size="sm" disabled={loadingDocentes}>
            Ir
          </Button>
        </form>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages || loadingDocentes}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
