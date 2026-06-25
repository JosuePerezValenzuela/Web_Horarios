"use client"

import { useAuth } from "@/features/auth/application/useAuth"
import { TopHeader } from "@/components/organisms/TopHeader"
import { AppLayout } from "@/components/organisms/AppLayout"
import { Calendar, Users, MapPin, FileSpreadsheet, Lock } from "lucide-react"

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth()

  const handleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
    window.location.href = `${backendUrl}/auth/login`
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

  // 2. VARIANTE: USUARIO NO LOGUEADO (Solicitud de ingreso con Header visible y sin scroll horizontal)
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden bg-background text-foreground flex flex-col">
        {/* Header superior */}
        <TopHeader />

        {/* Sección principal del Hero */}
        <div className="umss-hero-section w-full px-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden">
          {/* Fondo decorativo con tramas suaves */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_28px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]" />
          <div className="absolute top-0 right-0 -z-10 h-[300px] w-[300px] sm:w-[500px] rounded-full bg-[#003770]/5 blur-[80px] dark:bg-[#003770]/10" />
          <div className="absolute bottom-10 left-0 -z-10 h-[300px] w-[300px] sm:w-[500px] rounded-full bg-[#BC000C]/5 blur-[80px] dark:bg-[#BC000C]/10" />

          <main className="z-10 flex w-full max-w-4xl flex-col items-center justify-center text-center py-6">
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

              {/* Botón de Login */}
              <div className="mt-2 flex flex-col items-center justify-center gap-3">
                <button
                  onClick={handleLogin}
                  className="umss-btn-primary px-6 py-3.5 text-sm tracking-wide uppercase transition-all shadow-md hover:shadow-lg font-bold flex items-center gap-2.5 active:scale-95 group"
                >
                  <Lock className="h-4.5 w-4.5" />
                  Ingresar con SSO San Simón
                </button>
                <span className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">
                  Autenticación unificada mediante Keycloak SSO institucional.
                </span>
              </div>
            </div>

            {/* Grilla informativa de Características */}
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 w-full text-left px-2">
              <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] dark:bg-slate-800 text-[#003770] dark:text-blue-400">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <h3 className="umss-title-h3 text-sm">Planificación</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                  Visualizá solapamientos en tiempo real y asignaciones automáticas con la grilla
                  dinámica adaptativa.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-[#BC000C] dark:text-red-400">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <h3 className="umss-title-h3 text-sm">Ambientes</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                  Buscá y reservá aulas en bloques y campus institucionales verificando su
                  disponibilidad.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                </div>
                <h3 className="umss-title-h3 text-sm">Asistencia</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                  Generá partes diarios y consolidados de horas avanzadas para control académico.
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // 3. VARIANTE: USUARIO LOGUEADO (Simplificado y sin scroll vertical)
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

        {/* Grilla de Tarjetas Compactas en 4 Columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-2">
          {/* Tarjeta 1: Horarios de Docentes */}
          <div className="relative bg-white/90 dark:bg-[#242424]/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-gray-150 dark:border-[#333333] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] dark:bg-slate-800 text-[#003770] dark:text-blue-400">
                <Users className="h-5 w-5 stroke-[2]" />
              </div>
              <h3 className="font-roboto text-sm font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight">
                Docentes
              </h3>
              <p className="text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                Asignaciones horarias, visualización de la grilla semanal y control de
                solapamientos.
              </p>
            </div>
            <a
              href="/docentes"
              className="umss-btn-primary py-2 px-3 text-[10px] font-bold tracking-wide uppercase rounded-md w-full shadow-sm"
            >
              Abrir
            </a>
          </div>

          {/* Tarjeta 2: Consulta de Ambientes */}
          <div className="relative bg-white/90 dark:bg-[#242424]/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-gray-150 dark:border-[#333333] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 text-[#BC000C] dark:text-red-400">
                <MapPin className="h-5 w-5 stroke-[2]" />
              </div>
              <h3 className="font-roboto text-sm font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight">
                Ambientes
              </h3>
              <p className="text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                Búsqueda de aulas libres y consulta de infraestructura física de campus y bloques.
              </p>
            </div>
            <a
              href="/horarios"
              className="umss-btn-outline py-2 px-3 text-[10px] font-bold tracking-wide uppercase rounded-md w-full shadow-sm"
            >
              Abrir
            </a>
          </div>

          {/* Tarjeta 3: Partes Diarios */}
          <div className="relative bg-white/90 dark:bg-[#242424]/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-gray-150 dark:border-[#333333] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5 stroke-[2]" />
              </div>
              <h3 className="font-roboto text-sm font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight">
                Partes Diarios
              </h3>
              <p className="text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                Seguimiento y control del avance de materias y firmas de planillas de asistencia
                diaria.
              </p>
            </div>
            <a
              href="/partes-diarias"
              className="umss-btn-outline py-2 px-3 text-[10px] font-bold tracking-wide uppercase rounded-md w-full shadow-sm"
            >
              Abrir
            </a>
          </div>

          {/* Tarjeta 4: Reportes Consolidados */}
          <div className="relative bg-white/90 dark:bg-[#242424]/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-gray-150 dark:border-[#333333] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-500">
                <FileSpreadsheet className="h-5 w-5 stroke-[2]" />
              </div>
              <h3 className="font-roboto text-sm font-bold text-umss-dark-blue dark:text-gray-100 uppercase tracking-tight">
                Reportes
              </h3>
              <p className="text-[11px] leading-relaxed text-gray-550 dark:text-gray-450">
                Consolidación mensual de horas docentes y estadísticas administrativas de la
                facultad.
              </p>
            </div>
            <a
              href="/partes-consolidadas"
              className="umss-btn-outline py-2 px-3 text-[10px] font-bold tracking-wide uppercase rounded-md w-full shadow-sm"
            >
              Abrir
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
