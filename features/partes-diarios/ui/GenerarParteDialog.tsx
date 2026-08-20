import { useEffect, useState } from "react"
import { AlertCircle, Loader2, Check } from "lucide-react"
import { toast, UmssModal, Button } from "@umss/estilos-base/components"
import { partesApiClient, PartesApiError } from "@/shared/services/api/partesClient"

interface GenerarParteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facultadCodigo?: string
  facultadNombre?: string
  fecha: string
  onGenerated: () => Promise<void>
}

interface ConfiguracionVigente {
  id: number
  ingreso_anticipado_minutos: number
  tolerancia_ingreso_minutos: number
  limite_falta_ingreso_minutos: number
  tolerancia_salida_posterior_minutos: number
  tolerancia_salida_anticipada_minutos: number
  valid_from: string
  valid_to: string | null
}

export function GenerarParteDialog({
  open,
  onOpenChange,
  facultadCodigo,
  facultadNombre,
  fecha,
  onGenerated,
}: GenerarParteDialogProps) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionVigente | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const loadConfig = async () => {
      setLoading(true)
      setError(null)
      setConfiguracion(null)
      try {
        const url = fecha
          ? `/configuraciones-asistencia/vigente?fecha=${fecha}`
          : "/configuraciones-asistencia/vigente"
        const response = await partesApiClient.get<ConfiguracionVigente>(url)
        setConfiguracion(response)
      } catch (requestError) {
        const apiError = requestError as PartesApiError
        const message =
          apiError.body && typeof apiError.body === "object" && "message" in apiError.body
            ? String(apiError.body.message)
            : "No hay una configuración de asistencia vigente para la fecha."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadConfig()
  }, [open, fecha])

  const handleGenerate = async () => {
    if (!facultadCodigo) {
      toast.error("Por favor, seleccione una facultad")
      return
    }

    setGenerating(true)
    const toastId = toast.loading("Generando parte diario...")
    try {
      await partesApiClient.post("/partes-diarios", {
        facultadCodigo,
        fecha,
      })
      toast.success("Parte diario generado correctamente", { id: toastId })
      onOpenChange(false)
      await onGenerated()
    } catch (requestError) {
      const apiError = requestError as PartesApiError
      toast.error(
        apiError.body && typeof apiError.body === "object" && "message" in apiError.body
          ? String(apiError.body.message)
          : "Error al generar el parte diario",
        { id: toastId }
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <UmssModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Parte Diario no Encontrado"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || loading || !configuracion || Boolean(error)}
            className="text-white"
          >
            {generating ? "Generando..." : "Generar Parte"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
          <span>
            No se encontró un parte diario para la facultad{" "}
            <strong>{facultadNombre || facultadCodigo}</strong> en la fecha seleccionada. ¿Desea
            proceder a generar el parte diario de asistencia en estado borrador?
          </span>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Configuración de asistencia vigente
          </h4>
          <p className="text-xs text-muted-foreground leading-normal">
            El servidor asociará automáticamente la configuración de asistencia que rige para el día
            de hoy:
          </p>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>Consultando configuración de asistencia vigente...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : configuracion ? (
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                <span className="font-semibold text-muted-foreground">Configuración ID:</span>
                <span className="font-bold font-mono text-foreground">#{configuracion.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Ingreso Anticipado:</span>
                  <span className="font-bold font-mono text-foreground mt-0.5">
                    {configuracion.ingreso_anticipado_minutos} minutos
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Tolerancia Ingreso:</span>
                  <span className="font-bold font-mono text-foreground mt-0.5">
                    {configuracion.tolerancia_ingreso_minutos} minutos
                  </span>
                </div>
                <div className="flex flex-col col-span-2 border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground">Límite de Falta Ingreso:</span>
                  <span className="font-bold font-mono text-foreground mt-0.5">
                    {configuracion.limite_falta_ingreso_minutos} minutos
                  </span>
                </div>
                <div className="flex flex-col border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground">Tolerancia Salida Posterior:</span>
                  <span className="font-bold font-mono text-foreground mt-0.5">
                    {configuracion.tolerancia_salida_posterior_minutos} minutos
                  </span>
                </div>
                <div className="flex flex-col border-t border-border/30 pt-2.5">
                  <span className="text-muted-foreground">Tolerancia Salida Anticipada:</span>
                  <span className="font-bold font-mono text-foreground mt-0.5">
                    {configuracion.tolerancia_salida_anticipada_minutos} minutos
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </UmssModal>
  )
}
