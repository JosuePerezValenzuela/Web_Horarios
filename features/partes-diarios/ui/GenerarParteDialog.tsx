"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { partesApiClient, PartesApiError } from "@/shared/services/api/partesClient"
import type { ConfiguracionAsistencia } from "@/features/partes-diarios/domain/types"

interface GenerarParteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facultadCodigo?: string
  facultadNombre?: string
  fecha: string
  onGenerated: () => Promise<void>
}

const columns: { key: keyof Omit<ConfiguracionAsistencia, "id">; label: string }[] = [
  { key: "ingresoAnticipadoMinutos", label: "Ingreso Anticipado" },
  { key: "toleranciaIngresoMinutos", label: "Tolerancia Ingreso" },
  { key: "limiteFaltaIngresoMinutos", label: "Limite de Ingreso" },
  { key: "toleranciaSalidaAnticipadaMinutos", label: "Salida anticipada" },
  { key: "toleranciaSalidaPosteriorMinutos", label: "Salida limite" },
]

export function GenerarParteDialog({
  open,
  onOpenChange,
  facultadCodigo,
  facultadNombre,
  fecha,
  onGenerated,
}: GenerarParteDialogProps) {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionAsistencia[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setLoading(true)
      setError(null)
      setSelectedId(null)
      try {
        const response = await partesApiClient.get<
          ConfiguracionAsistencia[] | { data: ConfiguracionAsistencia[] }
        >("/configuraciones-asistencia")
        setConfiguraciones(Array.isArray(response) ? response : response.data)
      } catch (requestError) {
        const apiError = requestError as PartesApiError
        const message =
          apiError.body && typeof apiError.body === "object" && "message" in apiError.body
            ? String(apiError.body.message)
            : "No se pudieron cargar las configuraciones de asistencia"
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open])

  const handleGenerate = async () => {
    if (!facultadCodigo || selectedId === null) {
      toast.error("Por favor, seleccione una configuración de asistencia")
      return
    }

    setGenerating(true)
    const toastId = toast.loading("Generando parte diario...")
    try {
      await partesApiClient.post("/partes-diarios", {
        configuracion_asistencia_id: selectedId,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Parte Diario no Encontrado
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            No se generó un parte diario para la facultad{" "}
            <strong>{facultadNombre || facultadCodigo}</strong> en la fecha seleccionada. ¿Desea
            proceder a generar el parte diario de asistencia?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-4">
          <p className="text-xs font-semibold text-foreground">
            Configuración de asistencia <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Seleccione una configuración para generar el parte diario.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuraciones disponibles...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : configuraciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              No hay configuraciones de asistencia disponibles para generar el parte.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead className="w-20 text-center text-[10px] font-bold">
                      Seleccionar
                    </TableHead>
                    {columns.map((column) => (
                      <TableHead key={column.key} className="text-center text-[10px] font-bold">
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configuraciones.map((configuracion) => {
                    const selected = selectedId === configuracion.id
                    return (
                      <TableRow
                        key={configuracion.id}
                        tabIndex={0}
                        aria-selected={selected}
                        onClick={() => setSelectedId(configuracion.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            setSelectedId(configuracion.id)
                          }
                        }}
                        className={`cursor-pointer transition-colors ${selected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/60"}`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="radio"
                            name="configuracion-asistencia"
                            value={configuracion.id}
                            checked={selected}
                            onChange={() => setSelectedId(configuracion.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Seleccionar configuración ${configuracion.id}`}
                            className="h-4 w-4 accent-primary"
                          />
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell key={column.key} className="text-center font-mono text-xs">
                            {configuracion[column.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={
              generating ||
              loading ||
              configuraciones.length === 0 ||
              selectedId === null ||
              Boolean(error)
            }
            className="umss-btn-primary"
          >
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {generating ? "Generando..." : "Generar Parte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
