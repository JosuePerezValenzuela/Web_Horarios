"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button, Badge } from "@umss/estilos-base/components"
import {
  Calendar,
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Banknote,
} from "lucide-react"

interface ConfirmarJustificacionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (descripcion: string) => Promise<void>
  docenteNombre: string
  docenteCodigo: string
  fechaDesde: string
  fechaHasta: string
  tipoJustificacionNombre: string
  selectedSchedulesCount: number
  conGoceHaberes: boolean
  loading: boolean
}

export function ConfirmarJustificacionModal({
  isOpen,
  onClose,
  onConfirm,
  docenteNombre,
  docenteCodigo,
  fechaDesde,
  fechaHasta,
  tipoJustificacionNombre,
  selectedSchedulesCount,
  conGoceHaberes,
  loading,
}: ConfirmarJustificacionModalProps) {
  const [descripcion, setDescripcion] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const handleConfirm = async () => {
    if (!descripcion.trim()) {
      setErrorMsg("Debe ingresar la descripción o motivo de la justificación.")
      return
    }
    setErrorMsg("")
    await onConfirm(descripcion.trim())
  }

  const handleClose = () => {
    if (!loading) {
      setDescripcion("")
      setErrorMsg("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-card border border-border p-6 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Confirmar Justificación
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Verifique el resumen de la justificación e ingrese el motivo para registrarla.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tarjeta de Resumen */}
          <div className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-foreground">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-semibold">{docenteNombre}</span>
              <span className="text-muted-foreground">({docenteCodigo})</span>
            </div>

            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                Del <strong className="text-foreground">{fechaDesde}</strong> al{" "}
                <strong className="text-foreground">{fechaHasta}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Tipo: </span>
              <Badge variant="outline" className="font-medium text-xs py-0 h-5">
                {tipoJustificacionNombre || "No especificado"}
              </Badge>
              <span className="ml-auto text-primary font-bold">
                {selectedSchedulesCount} {selectedSchedulesCount === 1 ? "horario" : "horarios"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Goce de haberes: </span>
              <Badge
                variant={conGoceHaberes ? "primary" : "neutral"}
                className="font-medium text-xs py-0 h-5"
              >
                {conGoceHaberes ? "Con goce de haberes" : "Sin goce de haberes"}
              </Badge>
            </div>
          </div>

          {/* Campo Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground select-none flex items-center gap-1">
              Descripción / Motivo <span className="text-destructive">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value)
                if (errorMsg) setErrorMsg("")
              }}
              rows={3}
              placeholder="Ej. Permiso médico otorgado por Seguro Universitario..."
              disabled={loading}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            />
            {errorMsg && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 mt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto h-10 min-w-[130px] px-5 text-xs font-semibold rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !descripcion.trim()}
            className="w-full sm:w-auto h-10 min-w-[130px] px-5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Confirmar y Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
