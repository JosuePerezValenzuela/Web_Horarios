"use client"

/**
 * Docentes page with new layout
 */

import { useEffect } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { DocentesFilters } from "@/features/scheduling/docentes/ui/DocentesFilters"
import { DocentesTable } from "@/features/scheduling/docentes/ui/DocentesTable"
import { DocentesPagination } from "@/features/scheduling/docentes/ui/DocentesPagination"
import { useDocentesStore } from "@/features/scheduling/docentes/application/docentesStore"

export default function DocentesPage() {
  const fetchDocentes = useDocentesStore((state) => state.fetchDocentes)

  useEffect(() => {
    fetchDocentes()
  }, [fetchDocentes])

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[
          { name: "Docentes", href: "/docentes" },
          { name: "Gestión de carga horaria" },
        ]}
      >
        <div className="flex flex-col gap-4">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-semibold text-primary tracking-tight">Docentes</h2>
              <p className="text-sm text-muted-foreground">
                Busca docentes y accede a la gestión de su carga horaria.
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-muted rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Filtros de Busqueda
            </h3>
            <DocentesFilters />
          </div>

          {/* Table Section */}
          <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50">
            <DocentesTable />
          </div>

          {/* Pagination */}
          <div className="border-t border-border pt-4">
            <DocentesPagination />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
