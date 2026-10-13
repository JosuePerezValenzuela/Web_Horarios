import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { toast, UmssModal, Button } from "@umss/estilos-base/components"
import { partesDiariosApi } from "@/shared/services/api/client"

interface GenerarParteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facultadCodigo?: string
  facultadNombre?: string
  fecha: string
  onGenerated: () => Promise<void>
}

export function GenerarParteDialog({
  open,
  onOpenChange,
  facultadCodigo,
  facultadNombre,
  fecha,
  onGenerated,
}: GenerarParteDialogProps) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!facultadCodigo) {
      toast.error("Por favor, seleccione una facultad")
      return
    }

    if (!fecha) {
      toast.error("Por favor, seleccione una fecha")
      return
    }

    setGenerating(true)
    const toastId = toast.loading("Generando parte diario...")
    try {
      await partesDiariosApi.generar({
        facultadCodigo,
        fecha,
      })
      toast.success("Parte diario generado correctamente", { id: toastId })
      onOpenChange(false)
      await onGenerated()
    } catch {
      toast.dismiss(toastId)
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
            disabled={generating || !facultadCodigo || !fecha}
            className="text-white bg-[#002855] hover:bg-[#001b3a]"
          >
            {generating ? "Generando..." : "Generar Parte"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              No existe un parte diario registrado
            </p>
            <p className="leading-relaxed">
              No se encontró un parte diario para la facultad{" "}
              <strong>{facultadNombre || facultadCodigo}</strong> en la fecha{" "}
              <strong>{fecha}</strong>.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          ¿Desea generar el parte diario de asistencia en estado borrador? El sistema tomará la
          instantánea de los horarios correspondientes para la facultad y fecha indicadas.
        </p>
      </div>
    </UmssModal>
  )
}
