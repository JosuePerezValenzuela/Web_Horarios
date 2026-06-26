"use client"

import { useDocentesStore } from "../application/docentesStore"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowEven,
  TableRowOdd,
} from "@/components/ui/table"
import { CalendarClock } from "lucide-react"
import { useRouter } from "next/navigation"

export function DocentesTable() {
  const router = useRouter()
  const { docentes = [], loadingDocentes } = useDocentesStore()

  const handleRowClick = (docenteId?: number) => {
    if (docenteId) {
      router.push(`/docentes/${docenteId}/horarios`)
    }
  }

  // Estado vacío
  if (!loadingDocentes && docentes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-card border border-border rounded-2xl shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No se encontraron docentes con los criterios de búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-345px)] border border-border rounded-2xl shadow-sm bg-card">
      <Table className="table-fixed min-w-[650px] w-full relative">
        <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)] bg-card">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="h-10 w-[20%] lg:w-[15%] px-4 py-2.5 text-xs font-bold text-umss-dark-blue dark:text-gray-200">
              Código
            </TableHead>
            <TableHead className="h-10 w-[20%] lg:w-[18%] px-4 py-2.5 text-xs font-bold text-umss-dark-blue dark:text-gray-200">
              CI
            </TableHead>
            <TableHead className="h-10 px-4 py-2.5 text-xs font-bold text-umss-dark-blue dark:text-gray-200">
              Nombre
            </TableHead>
            <TableHead className="h-10 w-24 px-4 py-2.5 text-center text-xs font-bold text-umss-dark-blue dark:text-gray-200">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDocentes ? (
            <TableRow>
              <TableCell colSpan={4} className="px-4 py-8 text-center text-xs text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#002855] border-t-transparent" />
                  <span>Cargando docentes...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            docentes.map((docente, index) => {
              const Row = index % 2 === 0 ? TableRowEven : TableRowOdd
              return (
                <Row
                  key={docente.codigo}
                  className="hover:bg-umss-side-hover/75 transition-colors cursor-pointer border-b border-border/60 last:border-0"
                  onClick={() => handleRowClick(docente.id)}
                >
                  {/* Código SIS */}
                  <TableCell className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {docente.codigo}
                  </TableCell>

                  {/* Carnet de Identidad */}
                  <TableCell className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {docente.documento || "—"}
                  </TableCell>

                  {/* Nombre completo */}
                  <TableCell className="px-4 py-3 text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                    {docente.nombres}
                  </TableCell>

                  {/* Acción Directa */}
                  <TableCell className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 transition-all text-[#003770] dark:text-blue-400 hover:bg-umss-side-hover hover:text-[#BC000C] cursor-pointer"
                      aria-label="Ver horario docente"
                      disabled={!docente.id}
                      onClick={() => handleRowClick(docente.id)}
                    >
                      <CalendarClock className="size-[18px]" />
                    </button>
                  </TableCell>
                </Row>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
