"use client"

/**
 * Docentes pagination component
 * Enhanced with: pageSize selector, page numbers, first/last, records indicator
 */

import { useState } from "react"
import { useDocentesStore } from "../application/docentesStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE_OPTIONS = [8, 16, 24, 32]

export function DocentesPagination() {
  const { pagination, loadingDocentes, setPage, setPageSize } = useDocentesStore()
  const { currentPage, totalPages, pageSize, totalRecords } = pagination
  const [inputPage, setInputPage] = useState("")

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

  // Handle pageSize change
  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10)
    if (!isNaN(newSize) && newSize !== pageSize) {
      setPageSize(newSize)
    }
  }

  // Handle first/previous/next/last
  const handleFirst = () => setPage(1)
  const handlePrevious = () => currentPage > 1 && setPage(currentPage - 1)
  const handleNext = () => currentPage < totalPages && setPage(currentPage + 1)
  const handleLast = () => setPage(totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Left: Records indicator */}
      <span className="text-sm text-muted-foreground shrink-0">
        {startRecord}-{endRecord} / {totalRecords}
      </span>

      {/* Right: All navigation controls */}
      <div className="flex flex-wrap items-center gap-1">
        {/* PageSize selector */}
        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="h-8 w-16 shrink-0" disabled={loadingDocentes}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size} por pagina
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* First */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFirst}
          disabled={currentPage === 1 || loadingDocentes}
          aria-label="Primera"
          className="size-8 px-0 shrink-0"
        >
          &laquo;
        </Button>

        {/* Previous */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1 || loadingDocentes}
          aria-label="Anterior"
          className="size-8 px-0 shrink-0"
        >
          &lsaquo;
        </Button>

        {/* Page numbers - desktop */}
        <div className="hidden md:flex items-center gap-0.5 shrink-0">
          {getPageNumbers().map((page, index) => (
            <span key={index}>
              {page === "..." ? (
                <span className="px-1 text-muted-foreground">...</span>
              ) : (
                <Button
                  variant={page === currentPage ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePageClick(page as number)}
                  disabled={loadingDocentes}
                  className="size-8 min-w-8 px-0"
                >
                  {page}
                </Button>
              )}
            </span>
          ))}
        </div>

        {/* Mobile page indicator */}
        <span className="md:hidden text-sm text-muted-foreground px-1 shrink-0">
          {currentPage}/{totalPages}
        </span>

        {/* Next */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages || loadingDocentes}
          aria-label="Siguiente"
          className="size-8 px-0 shrink-0"
        >
          &rsaquo;
        </Button>

        {/* Last */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLast}
          disabled={currentPage === totalPages || loadingDocentes}
          aria-label="Ultima"
          className="size-8 px-0 shrink-0"
        >
          &raquo;
        </Button>

        {/* Go to page */}
        <form onSubmit={handleInputSubmit} className="flex items-center shrink-0">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="#"
            value={inputPage}
            onChange={handleInputChange}
            className="w-12 h-8 text-center text-sm"
            aria-label="Ir a pagina"
          />
        </form>
      </div>
    </div>
  )
}
