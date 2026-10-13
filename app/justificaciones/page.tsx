"use client"

import { AppLayout } from "@/components/organisms/AppLayout"
import { JustificacionesList } from "@/features/justificaciones/ui/JustificacionesList"
import { ShieldCheck } from "lucide-react"

export default function JustificacionesPage() {
  return (
    <AppLayout
      breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Justificaciones" }]}
      className="h-full flex flex-col p-4 md:p-6 overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Aprobación y Gestión de Justificaciones
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revise, apruebe o rechace justificaciones con trazabilidad de horarios cubiertos y
              partes diarios generados.
            </p>
          </div>
        </div>

        <JustificacionesList />
      </div>
    </AppLayout>
  )
}
