"use client"

/**
 * Dashboard page - protected route after login
 */

import Link from "next/link"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useAuth } from "@/features/auth/application/useAuth"

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col gap-8 p-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Hola, {user?.username}</span>
            <button
              onClick={() => {
                logout()
                window.location.href = "/login"
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Bienvenido al Sistema de Horarios</h2>
          <p className="text-muted-foreground">Seleccione una opción del menú para continuar</p>

          <nav className="flex flex-col gap-2">
            <Link href="/docentes" className="text-primary hover:underline">
              Consulta de Docentes
            </Link>
          </nav>
        </section>
      </main>
    </ProtectedRoute>
  )
}
