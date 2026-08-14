"use client"

import { useState } from "react"
import { useAuth } from "@/features/auth/application/useAuth"
import { AppLayout } from "@/components/organisms/AppLayout"
import { Calendar, Users, MapPin, FileSpreadsheet, Lock, Loader2 } from "lucide-react"
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002855] border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-wider">
            Cargando Sistema de Horarios...
          </p>
        </div>
      </div>
    )
  }

  // 2. VARIANTE: USUARIO NO LOGUEADO (Solicitud de ingreso con Hero institucional de la librería)
  if (!isAuthenticated) {
    return (
      <AppLayout breadcrumbs={[]}>
        <UmssHeroSection className="flex-1 flex flex-col justify-center items-center relative overflow-hidden h-full min-h-[calc(100vh-8rem)] py-6 pt-12 pb-12">
          {/* Fondo decorativo con tramas suaves */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_28px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
          <div className="absolute top-0 right-0 -z-10 h-[300px] w-[300px] sm:w-[500px] rounded-full bg-[#003770]/5 blur-[80px] dark:bg-[#003770]/10" />
          <div className="absolute bottom-10 left-0 -z-10 h-[300px] w-[300px] sm:w-[500px] rounded-full bg-[#BC000C]/5 blur-[80px] dark:bg-[#BC000C]/10" />

          <main className="z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center gap-6">
              {/* Contenedor del Escudo */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] dark:bg-slate-800 text-[#003770] dark:text-blue-400 ring-2 ring-[#003770]/15 dark:ring-slate-700 shadow-md">
                <Calendar className="h-7 w-7 stroke-[2]" />
              </div>

              {/* Textos Principales del Hero */}
              <div className="space-y-3">
                <h1 className="umss-title-h1 text-3xl md:text-4xl tracking-tight leading-tight uppercase">
                  Sistema Integrado de Horarios
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-sans px-2">
                  Plataforma oficial de la Universidad Mayor de San Simón para la organización,
                  gestión y distribución de horarios de clases, docentes y ambientes académicos.
                </p>
              </div>

              {/* Botón de Login utilizando el Button de la librería */}
              <div className="mt-2 flex flex-col items-center justify-center gap-3">
                <Button
                  onClick={handleLogin}
                  disabled={isConnecting}
                  className="px-6 py-5 text-sm tracking-wide uppercase transition-all shadow-md hover:shadow-lg font-bold flex items-center gap-2.5 rounded-xl cursor-pointer bg-[#002855] text-white hover:bg-[#001b3a]"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Lock className="h-4.5 w-4.5" />
                  )}
                  {isConnecting ? "Conectando..." : "Ingresar con SSO San Simón"}
                </Button>
                <span className="text-[10px] text-gray-450 dark:text-gray-400 font-semibold tracking-wide uppercase">
                  Autenticación unificada mediante Keycloak SSO institucional.
                </span>
              </div>
            </div>

            {/* Grilla informativa utilizando las ServiceCard de la librería base */}
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 w-full text-left px-2">
              <ServiceCard
                title="Planificación"
                description="Visualizá solapamientos en tiempo real y asignaciones automáticas con la grilla dinámica adaptativa."
                icon={Calendar}
                color="blue"
                actionLabel="MÁS INFORMACIÓN"
              />
              <ServiceCard
                title="Ambientes"
                description="Buscá y reservá aulas en bloques y campus institucionales verificando su disponibilidad en tiempo real."
                icon={MapPin}
                color="red"
                actionLabel="VER DISPONIBILIDAD"
              />
              <ServiceCard
                title="Asistencia"
                description="Generá partes diarios y consolidados de horas avanzadas para un control académico de excelencia."
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
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2 h-full justify-center">
        {/* Encabezado Simple */}
        <div className="flex flex-col gap-1.5 border-b border-border pb-4">
          <h1 className="umss-title-h1 text-2xl md:text-3xl uppercase tracking-wide">Horarios</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
            ¡Bienvenido de nuevo,{" "}
            <span className="font-bold text-[#002855] dark:text-blue-400">
              {user?.name || "Docente / Gestor"}
            </span>
            ! Seleccioná un módulo para comenzar.
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
