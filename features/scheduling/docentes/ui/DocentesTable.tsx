"use client"

/**
 * Docentes table component
 * Shows Codigo, CI, Nombre, Acciones columns
 */

import { useDocentesStore } from "../application/docentesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
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
import { Button } from "@/components/ui/button"
import { PlusIcon, CalendarClock } from "lucide-react"
import { useRouter } from "next/navigation"

export function DocentesTable() {
  const router = useRouter()
  const { docentes = [], loadingDocentes } = useDocentesStore()
  const { user } = useAuthStore()

  // Check if user has permission to create a docente (Administrador role)
  const canCreateDocente = user?.role === "Administrador"

  // Empty state
  if (!loadingDocentes && docentes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No se encontraron docentes con los criterios de busqueda.
        </p>
        {canCreateDocente && (
          <Button className="mt-4" variant="outline">
            <PlusIcon className="mr-2 size-4" />
            Registrar docente
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with Register button */}
      <div className="flex items-center justify-between">
        {canCreateDocente && (
          <Button variant="outline">
            <PlusIcon className="mr-2 size-4" />
            Registrar docente
          </Button>
        )}
      </div>

      {/* Table */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="h-10 w-[19%] px-3 py-2 text-xs">Codigo</TableHead>
            <TableHead className="h-10 w-[21%] px-3 py-2 text-xs">CI</TableHead>
            <TableHead className="h-10 px-3 py-2 text-xs">Nombre</TableHead>
            <TableHead className="h-10 w-16 px-2 py-2 text-center text-xs">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDocentes ? (
            <TableRow>
              <TableCell colSpan={4} className="px-3 py-6 text-center">
                <span className="text-muted-foreground">Cargando...</span>
              </TableCell>
            </TableRow>
          ) : (
            docentes.map((docente, index) => {
              const Row = index % 2 === 0 ? TableRowEven : TableRowOdd
              return (
                <Row key={docente.codigo}>
                  <TableCell className="truncate px-3 py-2">{docente.codigo}</TableCell>
                  <TableCell className="px-3 py-2">
                    {docente.documento || "Sin registrar"}
                  </TableCell>
                  <TableCell className="px-3 py-2 break-words">{docente.nombres}</TableCell>
                  <TableCell className="px-2 py-2 text-center">
                    <button
                      type="button"
                      className="rounded-lg p-1 transition-colors text-muted-foreground hover:bg-secondary hover:text-primary"
                      aria-label="Ver horario docente"
                      disabled={!docente.id}
                      onClick={() => {
                        if (!docente.id) return
                        router.push(`/docentes/${docente.id}/horarios`)
                      }}
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
