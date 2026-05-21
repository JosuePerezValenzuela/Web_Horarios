"use client"

import { AlertTriangle, CircleAlert } from "lucide-react"

import type { SolapamientoInfo } from "../domain/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SolapamientoWarningProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solapamientos: SolapamientoInfo[]
  onConfirm: () => void
  onCancel: () => void
}

export function SolapamientoWarning({
  open,
  onOpenChange,
  solapamientos,
  onConfirm,
  onCancel,
}: SolapamientoWarningProps) {
  const intraBulk = solapamientos.filter((s) => s.type === "intra-bulk")
  const existingSchedule = solapamientos.filter((s) => s.type === "existing-schedule")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onCancel()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0 text-amber-500" />
            <DialogTitle>Advertencia de solapamiento</DialogTitle>
          </div>
          <DialogDescription>
            Se detectaron {solapamientos.length} conflicto
            {solapamientos.length !== 1 ? "s" : ""} de horario:
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] space-y-3 overflow-y-auto">
          {intraBulk.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-destructive">
                Solapamientos con otros horarios a asignar
              </p>
              {intraBulk.map((s, i) => (
                <div
                  key={`intra-${i}`}
                  className="mb-2 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span className="text-sm text-destructive-foreground">{s.message}</span>
                </div>
              ))}
            </div>
          )}

          {existingSchedule.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                Solapamientos con horarios existentes
              </p>
              {existingSchedule.map((s, i) => (
                <div
                  key={`existing-${i}`}
                  className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200/50 bg-amber-50 p-3 dark:border-amber-800/30 dark:bg-amber-950/20"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <span className="text-sm text-amber-800 dark:text-amber-200">{s.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          ¿Desea continuar con la asignación de todos modos?
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="default" onClick={onConfirm}>
            Asignar de todas formas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
