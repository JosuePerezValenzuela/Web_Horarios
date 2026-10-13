"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button, Badge, Input } from "@umss/estilos-base/components"
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JustificacionListItem } from "../domain/types"

interface ConfirmarCambioEstadoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo?: string) => Promise<void>
  justificacion: JustificacionListItem | null
  nuevoEstado: "aprobada" | "rechazada" | null
  loading: boolean
}

export function ConfirmarCambioEstadoModal({
  isOpen,
  onClose,
  onConfirm,
  justificacion,
  nuevoEstado,
  loading,
}: ConfirmarCambioEstadoModalProps) {
  const [motivo, setMotivo] = useState("")
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null)

  if (!justificacion || !nuevoEstado) return null

  const isAprobar = nuevoEstado === "aprobada"

  const handleClose = () => {
    setMotivo("")
    setErrorMotivo(null)
    onClose()
  }

  const handleConfirm = () => {
    if (isAprobar) {
      // Al aprobar, el backend rechaza motivo_rechazo con 400. Se debe omitir estrictamente.
      onConfirm(undefined)
      return
    }

    // Al rechazar, motivo_rechazo es opcional y máx 64 caracteres
    const trimmed = motivo.trim()
    if (trimmed.length > 64) {
      setErrorMotivo("El motivo de rechazo no puede exceder los 64 caracteres.")
      return
    }
    onConfirm(trimmed || undefined)
  }

  const tipoNombre =
    justificacion.tipo_justificacion?.nombre || `Tipo #${justificacion.tipo_justificacion_id}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border border-border p-6 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            {isAprobar ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            {isAprobar ? "Aprobar Justificación" : "Rechazar Justificación"} #{justificacion.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-semibold text-foreground">{tipoNombre}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium text-foreground">
                {justificacion.fecha_desde} al {justificacion.fecha_hasta}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Goce de haberes:</span>
              <Badge
                variant={justificacion.con_goce_haberes ? "primary" : "neutral"}
                className="text-[10px] py-0 h-4"
              >
                {justificacion.con_goce_haberes ? "Con goce" : "Sin goce"}
              </Badge>
            </div>
            <div className="pt-1.5 border-t border-border/50">
              <span className="text-muted-foreground block text-[11px] mb-0.5">Motivo:</span>
              <p className="text-foreground italic bg-background p-2 rounded-lg border border-border/40 line-clamp-3">
                &ldquo;{justificacion.descripcion}&rdquo;
              </p>
            </div>
          </div>

          {/* Campo opcional de motivo de rechazo (SOLO cuando se rechaza) */}
          {!isAprobar && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="motivo-rechazo-input"
                  className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none"
                >
                  Motivo del Rechazo (Opcional)
                </label>
                <span
                  className={cn(
                    "text-[10px]",
                    motivo.length >= 64
                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {motivo.length}/64
                </span>
              </div>
              <Input
                id="motivo-rechazo-input"
                type="text"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  if (errorMotivo) setErrorMotivo(null)
                }}
                maxLength={64}
                placeholder="Ej. Falta documento de respaldo o fechas incorrectas"
                disabled={loading}
                className="h-9 text-xs rounded-xl"
              />
              {errorMotivo && <p className="text-[11px] text-destructive">{errorMotivo}</p>}
              <p className="text-[10px] text-muted-foreground">
                Máximo 64 caracteres. Si se omite, no se registrará nota de rechazo.
              </p>
            </div>
          )}

          {/* Nota informativa según la transición */}
          {isAprobar ? (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Al <strong>aprobar</strong> esta justificación, se conservará activo el rango de
                fechas para los horarios asociados. Posteriormente podrá ser rechazada si fuera
                necesario.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Atención:</strong> El rechazo es definitivo (estado terminal). Al rechazar
                la justificación se liberará el rango de fechas de los horarios asociados.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 mt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto h-9 min-w-[110px] px-4 text-xs font-semibold rounded-xl"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={
              isAprobar
                ? "w-full sm:w-auto h-9 min-w-[120px] px-5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                : "w-full sm:w-auto h-9 min-w-[120px] px-5 text-xs font-semibold rounded-xl bg-destructive text-white hover:bg-destructive/90"
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Procesando...
              </>
            ) : isAprobar ? (
              "Confirmar Aprobación"
            ) : (
              "Confirmar Rechazo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
