"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button, Badge, DatePicker, Checkbox } from "@umss/estilos-base/components"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Clock,
  BookOpen,
  FileText,
  UploadCloud,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Banknote,
  MapPin,
  Laptop,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TipoJustificacion } from "@/features/justificaciones/domain/types"
import {
  fetchTiposJustificacion,
  crearJustificacion,
} from "@/features/justificaciones/application/api"

export interface JustificarParteTarget {
  horarioId: number
  docenteNombre: string
  docenteCodigo?: string
  fecha: string // "YYYY-MM-DD"
  materia?: string
  grupo?: string
  horaInicio: string
  horaFin: string
  aulaCodigo?: string | null
  virtual?: boolean
  detallesOpciones?: {
    horarioId: number
    asignaturaNombre: string
    grupoNombre: string
    aulaCodigo?: string | null
    virtual?: boolean
  }[]
}

interface CrearJustificacionParteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  target: JustificarParteTarget | null
}

function CrearJustificacionParteForm({
  target,
  onClose,
  onSuccess,
}: {
  target: JustificarParteTarget
  onClose: () => void
  onSuccess: () => void
}) {
  const [tipos, setTipos] = useState<TipoJustificacion[]>([])
  const [loadingTipos, setLoadingTipos] = useState(true)

  // Form state inicializado directamente desde props
  const [selectedHorarioId, setSelectedHorarioId] = useState<number>(target.horarioId)
  const [tipoJustificacionId, setTipoJustificacionId] = useState<string>("")
  const [fechaDesde, setFechaDesde] = useState<string>(target.fecha)
  const [fechaHasta, setFechaHasta] = useState<string>(target.fecha)
  const [conGoceHaberes, setConGoceHaberes] = useState<boolean>(false)
  const [descripcion, setDescripcion] = useState<string>("")

  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Carga del catálogo de tipos
  useEffect(() => {
    let isMounted = true
    async function loadTipos() {
      try {
        setLoadingTipos(true)
        const data = await fetchTiposJustificacion()
        if (isMounted) {
          setTipos(data)
          if (data.length > 0) {
            setTipoJustificacionId(String(data[0].id))
          }
        }
      } catch {
        // Handled by api interceptor
      } finally {
        if (isMounted) {
          setLoadingTipos(false)
        }
      }
    }

    loadTipos()
    return () => {
      isMounted = false
    }
  }, [])

  const getDateObj = (dateStr: string) => {
    if (!dateStr) return undefined
    const parts = dateStr.split("-").map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2])
  }

  const handleSubmit = async () => {
    setErrorMsg(null)

    if (!selectedHorarioId) {
      setErrorMsg("Debe especificar un horario válido a justificar.")
      return
    }

    if (!tipoJustificacionId) {
      setErrorMsg("Seleccione un tipo de justificación.")
      return
    }

    if (!fechaDesde) {
      setErrorMsg("Seleccione la Fecha Desde.")
      return
    }

    if (!fechaHasta) {
      setErrorMsg("Seleccione la Fecha Hasta.")
      return
    }

    if (fechaHasta < fechaDesde) {
      setErrorMsg("La Fecha Hasta no puede ser anterior a la Fecha Desde.")
      return
    }

    if (!descripcion.trim()) {
      setErrorMsg("Debe ingresar la descripción o motivo de la justificación.")
      return
    }

    if (descripcion.trim().length > 64) {
      setErrorMsg("La descripción o motivo no puede superar los 64 caracteres.")
      return
    }

    try {
      setLoadingSubmit(true)

      await crearJustificacion({
        horario_ids: [selectedHorarioId],
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo_justificacion_id: Number(tipoJustificacionId),
        descripcion: descripcion.trim(),
        con_goce_haberes: conGoceHaberes,
      })

      onSuccess()
      onClose()
    } catch {
      // Handled by API error interceptor
    } finally {
      setLoadingSubmit(false)
    }
  }

  const hasMultipleOptions = target.detallesOpciones && target.detallesOpciones.length > 1

  const activeOption = target.detallesOpciones?.find((d) => d.horarioId === selectedHorarioId)

  const materiaDisplay = activeOption?.asignaturaNombre || target.materia || "Asignatura"
  const grupoDisplay = activeOption?.grupoNombre || target.grupo || "Grupo"
  const aulaDisplay = activeOption?.aulaCodigo || target.aulaCodigo || "S/R"
  const isVirtual = activeOption?.virtual ?? target.virtual

  return (
    <>
      <div className="space-y-4 py-2 text-xs">
        {/* Tarjeta de Información de la Clase Seleccionada */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <User className="w-4 h-4 text-primary shrink-0" />
              <span>{target.docenteNombre}</span>
              {target.docenteCodigo && (
                <span className="text-xs text-muted-foreground font-normal">
                  (SIS: {target.docenteCodigo})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {target.horaInicio} - {target.horaFin}
              </span>
            </div>
          </div>

          {/* Si hay múltiples clases solapadas, permitir seleccionar cuál */}
          {hasMultipleOptions ? (
            <div className="space-y-1 pt-1 border-t border-border/50">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Seleccione la materia / grupo a justificar:
              </label>
              <Select
                value={String(selectedHorarioId)}
                onValueChange={(val) => setSelectedHorarioId(Number(val))}
                disabled={loadingSubmit}
              >
                <SelectTrigger className="w-full h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Seleccione clase" />
                </SelectTrigger>
                <SelectContent>
                  {target.detallesOpciones?.map((op) => (
                    <SelectItem key={op.horarioId} value={String(op.horarioId)} className="text-xs">
                      {op.asignaturaNombre} - Gr: {op.grupoNombre} (Horario #{op.horarioId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50 text-foreground">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{materiaDisplay}</span>
                <span className="text-muted-foreground">- Gr: {grupoDisplay}</span>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                {isVirtual ? (
                  <Badge variant="brand" className="text-[9px] px-1.5 py-0 h-4">
                    <Laptop className="w-2.5 h-2.5 mr-1" />
                    Virtual
                  </Badge>
                ) : (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    Aula {aulaDisplay}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campos del Formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tipo de Justificación */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              Tipo de Justificación <span className="text-destructive">*</span>
            </label>
            <Select
              value={tipoJustificacionId}
              onValueChange={(val) => setTipoJustificacionId(val)}
              disabled={loadingTipos || loadingSubmit}
            >
              <SelectTrigger className="w-full h-9 text-xs rounded-xl">
                <SelectValue placeholder={loadingTipos ? "Cargando tipos..." : "Seleccione tipo"} />
              </SelectTrigger>
              <SelectContent>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo.id} value={String(tipo.id)} className="text-xs">
                    {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              Fecha Desde <span className="text-destructive">*</span>
            </label>
            <DatePicker
              placeholder="Seleccione fecha inicio"
              value={getDateObj(fechaDesde)}
              onValueChange={(date) => {
                if (date) {
                  const val = format(date, "yyyy-MM-dd")
                  setFechaDesde(val)
                  if (!fechaHasta || fechaHasta < val) {
                    setFechaHasta(val)
                  }
                }
              }}
              dateFormat="dd-MM-yyyy"
              className="w-full [&_button]:!min-h-9 [&_button]:!h-9 [&_button]:!py-1 [&_button]:!px-3 [&_button]:!text-xs rounded-xl"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              Fecha Hasta <span className="text-destructive">*</span>
            </label>
            <DatePicker
              placeholder="Seleccione fecha fin"
              value={getDateObj(fechaHasta)}
              onValueChange={(date) => {
                if (date) {
                  setFechaHasta(format(date, "yyyy-MM-dd"))
                }
              }}
              dateFormat="dd-MM-yyyy"
              className="w-full [&_button]:!min-h-9 [&_button]:!h-9 [&_button]:!py-1 [&_button]:!px-3 [&_button]:!text-xs rounded-xl"
            />
          </div>

          {/* Goce de Haberes */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-primary" />
              Goce de Haberes
            </label>
            <div
              onClick={() => !loadingSubmit && setConGoceHaberes(!conGoceHaberes)}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-xl border transition-all cursor-pointer select-none",
                conGoceHaberes
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <Checkbox
                id="modal-con-goce-haberes"
                checked={conGoceHaberes}
                onCheckedChange={(checked) => setConGoceHaberes(!!checked)}
              />
              <span className="text-xs font-semibold text-foreground">
                {conGoceHaberes ? "Con goce de haberes" : "Sin goce de haberes"}
              </span>
            </div>
          </div>

          {/* Motivo / Descripción */}
          <div className="sm:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                Motivo / Descripción <span className="text-destructive">*</span>
              </label>
              <span
                className={cn(
                  "text-[10px]",
                  descripcion.length >= 64
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {descripcion.length}/64
              </span>
            </div>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={64}
              rows={2}
              placeholder="Ej. Permiso médico, comisión docente o licencia justificada..."
              disabled={loadingSubmit}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Documento de Respaldo SGD (Deshabilitado temporalmente) */}
        <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5 opacity-70">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-muted-foreground" />
              Comprobante de Respaldo (PDF o Imagen)
            </span>
            <Badge variant="neutral" className="text-[9px] py-0 h-4">
              Deshabilitado por ahora
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            La subida de comprobantes y vinculación digital con el SGD está temporalmente
            deshabilitada. Puede crear la justificación sin adjuntar archivo.
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loadingSubmit}
          className="w-full sm:w-auto h-9 px-4 text-xs font-semibold rounded-xl"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loadingSubmit || !descripcion.trim()}
          className="w-full sm:w-auto h-9 px-5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1.5"
        >
          {loadingSubmit ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Guardar Justificación
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

export function CrearJustificacionParteModal({
  isOpen,
  onClose,
  onSuccess,
  target,
}: CrearJustificacionParteModalProps) {
  if (!target) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card border border-border p-6 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Registrar Justificación para la Clase
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Cree una justificación directa para el horario y docente seleccionado en este parte
            diario.
          </p>
        </DialogHeader>

        <CrearJustificacionParteForm
          key={`${target.horarioId}-${target.fecha}`}
          target={target}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
