"use client"

import { useRouter } from "next/navigation"
import { Calendar, LogIn, MapPin, FileSpreadsheet } from "lucide-react"
import { UmssHeroSection, ServiceCard, Button } from "@umss/estilos-base/components"
import { AppLayout } from "@/components/organisms/AppLayout"

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = () => {
    router.push("/")
  }

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
                variant="primary"
                className="gap-2 font-bold uppercase tracking-wide cursor-pointer shadow-sm hover:shadow-md transition-all"
              >
                <LogIn className="size-4" />
                Iniciar Sesión
              </Button>
              <span className="text-[11px] text-muted-foreground font-medium">
                Acceso al sistema
              </span>
            </div>
          </div>

          {/* Grilla informativa institucional */}
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
