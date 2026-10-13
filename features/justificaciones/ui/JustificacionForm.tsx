"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button, Badge, DatePicker, Checkbox } from "@umss/estilos-base/components"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  FileCheck,
  AlertCircle,
  Save,
  ArrowLeft,
  Banknote,
  FileSpreadsheet,
} from "lucide-react"

import type {
  DocenteScheduleMeta,
  NormalizedSchedule,
} from "@/features/scheduling/docentes/domain/types"
import type { TipoJustificacion } from "../domain/types"
import { fetchTiposJustificacion, crearJustificacion } from "../application/api"
import { HorariosJustificacionGrid } from "./HorariosJustificacionGrid"
import { ConfirmarJustificacionModal } from "./ConfirmarJustificacionModal"
import { getDaysOfWeekInRange, isScheduleQualifying } from "../application/filterSchedules"

interface JustificacionFormProps {
  docente: DocenteScheduleMeta
  schedules: NormalizedSchedule[]
  docenteId: string
}

export function JustificacionForm({ docente, schedules, docenteId }: JustificacionFormProps) {
  const router = useRouter()

  // Catálogo de tipos de justificación
  const [tipos, setTipos] = useState<TipoJustificacion[]>([])
  const [loadingTipos, setLoadingTipos] = useState(true)

  // Datos del formulario
  const [tipoJustificacionId, setTipoJustificacionId] = useState<string>("")
  const [fechaDesde, setFechaDesde] = useState<string>("")
  const [fechaHasta, setFechaHasta] = useState<string>("")
  const [conGoceHaberes, setConGoceHaberes] = useState<boolean>(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Modal de confirmación y guardado
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Errores locales de validación previa
  const [validationError, setValidationError] = useState<string | null>(null)

  // Cargar tipos de justificación al montar
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
        // Interceptor ya maneja errores de red
      } finally {
        if (isMounted) setLoadingTipos(false)
      }
    }
    loadTipos()
    return () => {
      isMounted = false
    }
  }, [])

  // Auto-seleccionar horarios aplicables cuando cambian las fechas
  const updateSelectedForDates = (desde: string, hasta: string) => {
    if (!desde || !hasta) {
      setSelectedIds([])
      return
    }

    const applicableDays = getDaysOfWeekInRange(desde, hasta)
    const qualifyingIds: number[] = []

    schedules.forEach((s) => {
      if (s.dbId && isScheduleQualifying(s, desde, hasta, applicableDays)) {
        qualifyingIds.push(s.dbId)
      }
    })

    setSelectedIds(qualifyingIds)
  }

  // Convertir string YYYY-MM-DD a objeto Date para DatePicker
  const getDateObj = (dateStr: string) => {
    if (!dateStr) return undefined
    const parts = dateStr.split("-").map(Number)
    return new Date(parts[0], parts[1] - 1, parts[2])
  }

  // Handlers para selección de horarios
  const handleToggleSchedule = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
    if (validationError) setValidationError(null)
  }

  const handleSelectAll = (ids: number[]) => {
    setSelectedIds(ids)
    if (validationError) setValidationError(null)
  }

  const handleDeselectAll = () => {
    setSelectedIds([])
  }

  // Validación previa antes de abrir el modal
  const handleOpenConfirmModal = () => {
    setValidationError(null)

    if (!tipoJustificacionId) {
      setValidationError("Seleccione un tipo de justificación.")
      return
    }

    if (!fechaDesde) {
      setValidationError("Seleccione la Fecha Desde.")
      return
    }

    if (!fechaHasta) {
      setValidationError("Seleccione la Fecha Hasta.")
      return
    }

    if (fechaHasta < fechaDesde) {
      setValidationError("La Fecha Hasta no puede ser anterior a la Fecha Desde.")
      return
    }

    if (selectedIds.length === 0) {
      setValidationError("Debe seleccionar al menos un horario para la justificación.")
      return
    }

    setIsModalOpen(true)
  }

  // Confirmar y enviar la justificación
  const handleConfirmSubmit = async (descripcion: string) => {
    try {
      setIsSubmitting(true)

      await crearJustificacion({
        horario_ids: selectedIds,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        tipo_justificacion_id: Number(tipoJustificacionId),
        descripcion,
        con_goce_haberes: conGoceHaberes,
      })

      setIsModalOpen(false)
      // Redirigir a horarios del docente
      router.push(`/docentes/${docenteId}/horarios`)
    } catch {
      // El cliente HTTP central ya maneja el toast de error del backend
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTipo = useMemo(() => {
    return tipos.find((t) => String(t.id) === tipoJustificacionId)
  }, [tipos, tipoJustificacionId])

  return (
    <div className="space-y-4">
      {/* Botón Volver y Contexto del Docente */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/docentes")}
            className="h-9 px-3 gap-1.5 text-xs rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Docentes
          </Button>

          <div className="h-6 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-2 text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground leading-tight">{docente.nombres}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  SIS: <strong>{docente.codigo}</strong>
                </span>
                {docente.documento && (
                  <>
                    <span>•</span>
                    <span>CI: {docente.documento}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-1 px-2.5 font-medium">
            Nueva Justificación
          </Badge>
        </div>
      </div>

      {/* Parámetros de la Justificación */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border pb-2">
          <FileCheck className="w-4 h-4 text-primary" />
          Datos Principales
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tipo de Justificación */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground select-none flex items-center gap-1">
              Tipo de Justificación <span className="text-destructive">*</span>
            </label>
            <Select
              value={tipoJustificacionId}
              onValueChange={(val) => {
                setTipoJustificacionId(val)
                if (validationError) setValidationError(null)
              }}
              disabled={loadingTipos}
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground select-none flex items-center gap-1">
              Fecha Desde <span className="text-destructive">*</span>
            </label>
            <DatePicker
              placeholder="Seleccione fecha inicio"
              value={getDateObj(fechaDesde)}
              onValueChange={(date) => {
                if (date) {
                  const val = format(date, "yyyy-MM-dd")
                  setFechaDesde(val)
                  const targetHasta = !fechaHasta || fechaHasta < val ? val : fechaHasta
                  if (!fechaHasta || fechaHasta < val) {
                    setFechaHasta(val)
                  }
                  updateSelectedForDates(val, targetHasta)
                  if (validationError) setValidationError(null)
                }
              }}
              dateFormat="dd-MM-yyyy"
              className="w-full [&_button]:!min-h-9 [&_button]:!h-9 [&_button]:!py-1 [&_button]:!px-3 [&_button]:!text-xs rounded-xl"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground select-none flex items-center gap-1">
              Fecha Hasta <span className="text-destructive">*</span>
            </label>
            <DatePicker
              placeholder="Seleccione fecha fin"
              value={getDateObj(fechaHasta)}
              onValueChange={(date) => {
                if (date) {
                  const val = format(date, "yyyy-MM-dd")
                  setFechaHasta(val)
                  updateSelectedForDates(fechaDesde, val)
                  if (validationError) setValidationError(null)
                }
              }}
              dateFormat="dd-MM-yyyy"
              className="w-full [&_button]:!min-h-9 [&_button]:!h-9 [&_button]:!py-1 [&_button]:!px-3 [&_button]:!text-xs rounded-xl"
            />
          </div>

          {/* Goce de Haberes */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground select-none flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-primary" />
              Goce de Haberes
            </label>
            <div
              onClick={() => setConGoceHaberes(!conGoceHaberes)}
              className={cn(
                "flex items-center gap-2.5 h-9 px-3 rounded-xl border transition-all cursor-pointer select-none",
                conGoceHaberes
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
              )}
            >
              <Checkbox
                id="con-goce-haberes"
                checked={conGoceHaberes}
                onCheckedChange={(checked) => setConGoceHaberes(!!checked)}
              />
              <span className="text-xs font-semibold text-foreground">
                {conGoceHaberes ? "Con goce de haberes" : "Sin goce de haberes"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla Interactiva de Horarios */}
      <HorariosJustificacionGrid
        schedules={schedules}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        selectedIds={selectedIds}
        onToggleSchedule={handleToggleSchedule}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      {/* Documento de Respaldo (PDF o Imagen) - Deshabilitado por ahora */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3 opacity-75">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            Documento de Respaldo (PDF o Imagen)
          </h3>
          <Badge variant="neutral" className="text-[10px] py-0 h-5">
            Deshabilitado por ahora
          </Badge>
        </div>

        <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-1.5 bg-muted/20 text-center cursor-not-allowed select-none">
          <FileSpreadsheet className="w-6 h-6 text-muted-foreground/60" />
          <span className="text-xs font-semibold text-muted-foreground">
            Subir comprobante digital (PDF o Imagen)
          </span>
          <span className="text-[11px] text-muted-foreground/80 max-w-sm">
            La carga de archivos y vinculación con el SGD se encuentra deshabilitada temporalmente.
            Por el momento este campo permanece inactivo.
          </span>
        </div>
      </div>

      {/* Mensaje de Error de Validación */}
      {validationError && (
        <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Botón de Acción Principal */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/docentes")}
          className="text-xs h-10 px-4 rounded-xl"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          onClick={handleOpenConfirmModal}
          className="text-xs h-10 px-5 gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Save className="w-4 h-4" />
          Guardar Justificación
        </Button>
      </div>

      {/* Modal de Confirmación y Descripción */}
      <ConfirmarJustificacionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        docenteNombre={docente.nombres}
        docenteCodigo={docente.codigo}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        tipoJustificacionNombre={selectedTipo?.nombre || ""}
        selectedSchedulesCount={selectedIds.length}
        conGoceHaberes={conGoceHaberes}
        loading={isSubmitting}
      />
    </div>
  )
}
