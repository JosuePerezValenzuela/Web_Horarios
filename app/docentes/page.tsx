"use client"

/**
 * Docentes page - protected listing page with filters and table
 */

import { useEffect } from "react"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { DocentesFilters } from "@/features/scheduling/docentes/ui/DocentesFilters"
import { DocentesTable } from "@/features/scheduling/docentes/ui/DocentesTable"
import { DocentesPagination } from "@/features/scheduling/docentes/ui/DocentesPagination"
import { useDocentesStore } from "@/features/scheduling/docentes/application/docentesStore"

export default function DocentesPage() {
  const fetchDocentes = useDocentesStore((state) => state.fetchDocentes)

  // Fetch docentes on mount
  useEffect(() => {
    fetchDocentes()
  }, [fetchDocentes])

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col gap-8 p-8">
        <header>
          <h1 className="text-2xl font-bold">Docentes</h1>
        </header>

        <section className="space-y-6">
          <DocentesFilters />
        </section>

        <section className="space-y-4">
          <DocentesTable />
        </section>

        <section className="border-t pt-4">
          <DocentesPagination />
        </section>
      </main>
    </ProtectedRoute>
  )
}
