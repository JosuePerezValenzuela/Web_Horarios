"use client"

import { useEffect } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { DocentesFilters } from "@/features/scheduling/docentes/ui/DocentesFilters"
import { DocentesTable } from "@/features/scheduling/docentes/ui/DocentesTable"
import { DocentesPagination } from "@/features/scheduling/docentes/ui/DocentesPagination"
import { useDocentesStore } from "@/features/scheduling/docentes/application/docentesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import { PlusIcon } from "lucide-react"

export default function DocentesPage() {
  const fetchDocentes = useDocentesStore((state) => state.fetchDocentes)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchDocentes()
  }, [fetchDocentes])

  // Verificar si el usuario tiene permiso para crear docentes (rol Administrador)
  const canCreateDocente = user?.role === "Administrador"

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[
          { name: "Docentes", href: "/docentes" },
          { name: "Gestión de carga horaria" },
        ]}
      >
        <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="umss-title-h1 text-2xl md:text-3xl uppercase tracking-wide">
                Docentes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Busca docentes y accede a la gestión de su carga horaria.
              </p>
            </div>
            {canCreateDocente && (
              <button
                type="button"
                className="umss-btn-primary py-2 px-4 text-xs font-bold uppercase rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
              >
                <PlusIcon className="size-4" />
                Registrar docente
              </button>
            )}
          </div>

          {/* Filters Section (Fondo de tarjeta unificado) */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Filtros de Búsqueda
            </h3>
            <DocentesFilters />
          </div>

          {/* Table Section */}
          <DocentesTable />

          {/* Pagination */}
          <div className="border-t border-border pt-3">
            <DocentesPagination />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
