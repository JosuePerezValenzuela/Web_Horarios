"use client"

/**
 * Dashboard page with new layout
 */

import Link from "next/link"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { Users, Calendar, ClipboardList } from "lucide-react"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={[{ name: "Dashboard", href: "/dashboard" }]}>
        <div className="flex flex-col gap-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-primary tracking-tight mb-1">Dashboard</h2>
              <p className="text-muted-foreground">Bienvenido al Sistema de Gestión de Horarios</p>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              href="/docentes"
              className="p-6 rounded-xl border border-outline-variant/10 bg-surface-container-lowest hover:bg-muted transition-colors shadow-sm"
            >
              <Users className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-semibold mt-4">Consulta de Docentes</h3>
              <p className="text-sm text-muted-foreground mt-1">Buscar y gestionar docentes</p>
            </Link>

            <Link
              href="/horarios"
              className="p-6 rounded-xl border border-outline-variant/10 bg-surface-container-lowest hover:bg-muted transition-colors shadow-sm"
            >
              <Calendar className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-semibold mt-4">Horarios</h3>
              <p className="text-sm text-muted-foreground mt-1">Consultar horarios de clases</p>
            </Link>

            <Link
              href="/asignaciones"
              className="p-6 rounded-xl border border-outline-variant/10 bg-surface-container-lowest hover:bg-muted transition-colors shadow-sm"
            >
              <ClipboardList className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-semibold mt-4">Asignaciones</h3>
              <p className="text-sm text-muted-foreground mt-1">Gestión de carga horaria</p>
            </Link>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
