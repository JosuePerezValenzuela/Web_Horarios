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
        <div className="flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-primary tracking-tight mb-1">Docentes</h2>
              <p className="text-muted-foreground">
                Busca docentes y accede a la gestión de su carga horaria.
              </p>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Filtros de Búsqueda
            </h3>
            <DocentesFilters />
          </div>

          {/* Table Section */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
            <DocentesTable />
          </div>

          {/* Pagination */}
          <div className="border-t border-outline-variant/10 pt-4">
            <DocentesPagination />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
