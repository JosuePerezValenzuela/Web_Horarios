"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppLayout } from "@/components/organisms/AppLayout"
import { useDocenteHorariosStore } from "@/features/scheduling/docentes/application/docenteHorariosStore"
import { JustificacionForm } from "@/features/justificaciones/ui/JustificacionForm"
import { Button } from "@umss/estilos-base/components"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"

export default function NuevaJustificacionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const docenteId = params?.id ?? ""

  const { docente, schedules, loading, error, fetchByDocenteId } = useDocenteHorariosStore()

  useEffect(() => {
    if (docenteId) {
      fetchByDocenteId(docenteId)
    }
  }, [docenteId, fetchByDocenteId])

  return (
    <AppLayout
      breadcrumbs={[
        { name: "Inicio", href: "/" },
        { name: "Docentes", href: "/docentes" },
        {
          name: docente?.nombres ? docente.nombres : "Docente",
          href: `/docentes/${docenteId}/horarios`,
        },
        { name: "Registrar Justificación" },
      ]}
      className="h-full flex flex-col p-4 md:p-6 overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto w-full space-y-4">
        {loading && !docente && (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Cargando información y horarios del docente...
            </p>
          </div>
        )}

        {error && !docente && (
          <div className="flex flex-col items-center justify-center py-16 bg-card border border-destructive/20 rounded-2xl text-center p-6 space-y-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <h2 className="text-base font-bold text-foreground">
              Error al cargar los datos del docente
            </h2>
            <p className="text-xs text-muted-foreground max-w-md">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/docentes")}
              className="text-xs h-9 gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Docentes
            </Button>
          </div>
        )}

        {docente && (
          <JustificacionForm docente={docente} schedules={schedules} docenteId={docenteId} />
        )}
      </div>
    </AppLayout>
  )
}
