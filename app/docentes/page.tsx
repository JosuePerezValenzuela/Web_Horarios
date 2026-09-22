"use client"

import { useEffect } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { DocentesFilters } from "@/features/scheduling/docentes/ui/DocentesFilters"
import { DocentesTable } from "@/features/scheduling/docentes/ui/DocentesTable"
import { DocentesPagination } from "@/features/scheduling/docentes/ui/DocentesPagination"
import { useDocentesStore } from "@/features/scheduling/docentes/application/docentesStore"
export default function DocentesPage() {
  const { fetchDocentes } = useDocentesStore()

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
        disablePageScroll
        className="p-3 sm:p-4 md:p-6 lg:p-8"
      >
        <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full min-w-0 max-w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
            <div className="flex flex-col gap-0.5">
              <h1 className="font-roboto text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase tracking-wide">
                Docentes
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Busca docentes y accede a la gestión de su carga horaria.
              </p>
            </div>
          </div>

          {/* Filters Section (Fondo de tarjeta unificado) */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm w-full min-w-0 max-w-full">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Filtros de Búsqueda
            </h3>
            <DocentesFilters />
          </div>

          {/* Table Section */}
          <DocentesTable />

          {/* Pagination */}
          <div className="border-t border-border pt-3 w-full min-w-0 max-w-full">
            <DocentesPagination />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
