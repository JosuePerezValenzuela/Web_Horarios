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

export function DocentesTable() {
  const { docentes = [], loadingDocentes } = useDocentesStore()
  const { user } = useAuthStore()

  // Check if user has CREAR_DOCENTE permission
  const canCreateDocente = user?.permissions.includes("CREAR_DOCENTE")

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
    <div className="space-y-4">
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codigo</TableHead>
            <TableHead>CI</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-20">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDocentes ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <span className="text-muted-foreground">Cargando...</span>
              </TableCell>
            </TableRow>
          ) : (
            docentes.map((docente, index) => {
              const Row = index % 2 === 0 ? TableRowEven : TableRowOdd
              return (
                <Row key={docente.codigo}>
                  <TableCell>{docente.codigo}</TableCell>
                  <TableCell>{docente.documento || "Sin registrar"}</TableCell>
                  <TableCell>{docente.nombres}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                      aria-label="Asignar horarios"
                    >
                      <CalendarClock className="size-5" />
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
