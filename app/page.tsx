"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/features/auth/application/useAuth"
import { Button } from "@/components/ui/button"
import { LogIn, Calendar, Clock, ShieldCheck, User } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Cargando aplicación...
          </p>
        </div>
      </div>
    )
  }

  const handleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
    window.location.href = `${backendUrl}/auth/login`
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background font-sans selection:bg-primary/20">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <main className="z-10 flex w-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-6">
          {/* Logo container */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Calendar className="h-8 w-8" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
              Gestión de Horarios
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Plataforma institucional para la asignación y consulta de horarios de clases y
              ambientes académicos.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold transition-all"
              onClick={handleLogin}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Iniciar Sesión con SSO
            </Button>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-3 w-full">
          <div className="rounded-3xl border border-border bg-card/50 p-6 text-left backdrop-blur-sm transition-all hover:bg-card/80">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Grillas en tiempo real</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Visualizá la disponibilidad docente y de ambientes mediante la grilla interactiva
              semanal dinámica.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6 text-left backdrop-blur-sm transition-all hover:bg-card/80">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Autenticación Única</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresá de manera segura con tu cuenta institucional a través del sistema Keycloak
              SSO.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card/50 p-6 text-left backdrop-blur-sm transition-all hover:bg-card/80">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Roles y Permisos</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Accedé a herramientas de administración y gestión según los permisos asignados a tu
              rol.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
