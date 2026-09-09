"use client"

import { useState } from "react"
import { useAuth } from "@/features/auth/application/useAuth"
import { AppLayout } from "@/components/organisms/AppLayout"
import { Calendar, Users, MapPin, FileSpreadsheet, LogIn, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { UmssHeroSection, ServiceCard, Button } from "@umss/estilos-base/components"

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleLogin = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    setIsConnecting(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      // Intentamos pegarle a un endpoint ligero del back para verificar conectividad
      await fetch(`${backendUrl}/auth/me`, {
        method: "GET",
        signal: controller.signal,
        credentials: "include",
      })

      clearTimeout(timeoutId)
      window.location.href = `${backendUrl}/auth/login`
    } catch {
      setIsConnecting(false)
      toast.error(
        "El servidor de autenticación no está disponible en este momento. Por favor, intente más tarde."
      )
    }
  }

  // 1. PANTALLA DE CARGA
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-wider">
            Cargando Sistema de Horarios...
          </p>
        </div>
      </div>
    )
  }

  // 2. VARIANTE: USUARIO NO LOGUEADO (Hero institucional sin scroll innecesario)
  if (!isAuthenticated) {
    return (
      <AppLayout breadcrumbs={[]}>
        <UmssHeroSection className="min-h-0 flex-1 flex flex-col justify-center items-center py-4 md:py-8 overflow-hidden rounded-xl">
          <main className="z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center px-4">
            <div className="flex flex-col items-center gap-4 md:gap-5">
              {/* Contenedor del Ícono Institucional */}
              <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
                <Calendar className="h-6 w-6 md:h-7 md:w-7 stroke-[2]" />
              </div>

              {/* Textos Principales del Hero */}
              <div className="space-y-2">
                <h1 className="umss-title-h1 text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight uppercase">
                  Sistema Integrado de Horarios
                </h1>
                <p className="mx-auto max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                  Plataforma oficial de la Universidad Mayor de San Simón para la organización,
                  gestión y distribución de horarios de clases, docentes y ambientes académicos.
                </p>
              </div>

              {/* Botón de Inicio de Sesión institucional */}
              <div className="mt-1 flex flex-col items-center justify-center gap-2">
                <Button
                  onClick={handleLogin}
                  disabled={isConnecting}
                  variant="primary"
                  className="gap-2 font-bold uppercase tracking-wide cursor-pointer shadow-sm hover:shadow-md transition-all"
                >
                  {isConnecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  {isConnecting ? "Conectando..." : "Iniciar Sesión"}
                </Button>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Autenticación institucional unificada
                </span>
              </div>
            </div>

            {/* Grilla informativa utilizando las ServiceCard de la librería base */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 w-full text-left">
              <ServiceCard
                title="Planificación"
                description="Visualizá solapamientos de horarios."
                icon={Calendar}
                color="blue"
                actionLabel="MÁS INFORMACIÓN"
              />
              <ServiceCard
                title="Ambientes"
                description="Buscá y reservá aulas verificando su disponibilidad."
                icon={MapPin}
                color="red"
                actionLabel="VER DISPONIBILIDAD"
              />
              <ServiceCard
                title="Asistencia"
                description="Generá partes diarios de asistencia y mensuales."
                icon={FileSpreadsheet}
                color="amber"
                actionLabel="VER PARTES DIARIOS"
              />
            </div>
          </main>
        </UmssHeroSection>
      </AppLayout>
    )
  }

  // 3. VARIANTE: USUARIO LOGUEADO (Con menú institucional principal y ServiceCards)
  return (
    <AppLayout breadcrumbs={[]}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2 w-full justify-center">
        {/* Encabezado Simple */}
        <div className="flex flex-col gap-1.5 border-b border-border pb-4">
          <h1 className="umss-title-h1 text-2xl md:text-3xl uppercase tracking-wide">Horarios</h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            ¡Bienvenido de nuevo,{" "}
            <span className="font-bold text-primary">{user?.name || "Docente / Gestor"}</span>!
            Seleccioná un módulo para comenzar.
          </p>
        </div>

        {/* Grilla de Tarjetas utilizando las ServiceCard de estilos-base */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl mx-auto mt-2">
          {/* Tarjeta 1: Horarios de Docentes */}
          <ServiceCard
            title="Docentes"
            description="Asignaciones horarias, visualización de la grilla semanal interactiva y control automático de solapamientos."
            icon={Users}
            href="/docentes"
            color="blue"
            actionLabel="ABRIR MÓDULO"
          />

          {/* Tarjeta 2: Horarios */}
          <ServiceCard
            title="Horarios"
            description="Visualización integral y filtros de horarios de clases por facultad, plan de estudios y espacios físicos."
            icon={Calendar}
            href="/horarios"
            color="red"
            actionLabel="ABRIR MÓDULO"
          />
        </div>
      </div>
    </AppLayout>
  )
}
