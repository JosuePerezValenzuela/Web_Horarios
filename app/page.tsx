"use client"

import { AppLayout } from "@/components/organisms/AppLayout"
import { Calendar, Users } from "lucide-react"
import { ServiceCard } from "@umss/estilos-base/components"

export default function Home() {
  return (
    <AppLayout breadcrumbs={[]}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2 w-full justify-center">
        {/* Encabezado Simple */}
        <div className="flex flex-col gap-1.5 border-b border-border pb-4">
          <h1 className="umss-title-h1 text-2xl md:text-3xl uppercase tracking-wide">Horarios</h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">
            ¡Bienvenido! Seleccioná un módulo para comenzar.
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
