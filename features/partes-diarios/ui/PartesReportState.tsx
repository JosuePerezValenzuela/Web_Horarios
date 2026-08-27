"use client"

import { FileText, Info, Loader2 } from "lucide-react"
import { UmssCard as Card, UmssCardContent as CardContent } from "@umss/estilos-base/components"

export function PartesReportState({
  loading,
  hasSearched,
}: {
  loading: boolean
  hasSearched: boolean
}) {
  if (loading) {
    return (
      <Card className="flex min-h-[300px] flex-grow flex-shrink flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card py-6">
        <CardContent className="flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Cargando horarios de clases...</p>
        </CardContent>
      </Card>
    )
  }

  if (!hasSearched) {
    return (
      <Card className="flex min-h-[300px] flex-grow flex-shrink flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card py-6">
        <CardContent className="flex flex-col items-center justify-center space-y-3">
          <FileText className="h-12 w-12 text-primary/60" />
          <h3 className="text-base font-bold text-foreground">Control de Partes Diarios</h3>
          <p className="max-w-md text-center text-xs text-muted-foreground">
            Seleccione una facultad y fecha en los filtros superiores para comenzar el control de
            firmas, retrasos y faltas de los docentes.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex min-h-[300px] flex-grow flex-shrink flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card py-6">
      <CardContent className="flex flex-col items-center justify-center space-y-3">
        <Info className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-base font-bold text-foreground">No se encontraron resultados</h3>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          No hay clases registradas para la facultad y fecha seleccionada.
        </p>
      </CardContent>
    </Card>
  )
}
