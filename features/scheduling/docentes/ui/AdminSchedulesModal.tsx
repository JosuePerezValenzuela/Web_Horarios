"use client"

import { useState, useEffect, useMemo } from "react"

import { toast } from "@umss/estilos-base/components"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon,
  AlertCircle,
  Pencil,
  HelpCircle,
  Trash2,
  ChevronDown,
  ClipboardList,
} from "lucide-react"
import { UmssModal, Button, Checkbox } from "@umss/estilos-base/components"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type {
  AdminScheduleRaw,
  DocenteScheduleMeta,
  HorarioCatalogoItem,
  CrearAsignacionHorarioRequest,
  PatchAsignacionHorarioRequest,
  TipoAsignacionAdministrativo,
} from "../domain/types"
import {
  fetchHorarioCatalogo,
  crearAsignacionHorario,
  patchAsignacionHorario,
  fetchTipoAsignacionHorarioAdministrativo,
  eliminarAsignacionHorario,
} from "../application/api"

const DIA_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
}

interface AdminSchedulesModalProps {
  isOpen: boolean
  onClose: () => void
  schedules: AdminScheduleRaw[]
  docente: DocenteScheduleMeta | null
  onAssigned?: () => void
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ""
  return timeStr.slice(0, 5)
}

const formatDate = (dateStr: string | null, isEndDate = false) => {
  if (!dateStr) return isEndDate ? "Sin límite" : "—"
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

export function AdminSchedulesModal({
  isOpen,
  onClose,
  schedules,
  docente,
  onAssigned,
}: AdminSchedulesModalProps) {
  // ── Assign form state ────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | "">("")
  const [selectedStart, setSelectedStart] = useState<string>("")
  const [selectedEnd, setSelectedEnd] = useState<string>("")
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date())
  const [fechaFin, setFechaFin] = useState<Date | undefined>(undefined)
  const [permiteClases, setPermiteClases] = useState(false)
  const [selectedDias, setSelectedDias] = useState<number[]>([]) // Array of days (1-5)
  const [selectedTipoId, setSelectedTipoId] = useState<number | "">("")
  const [catalogList, setCatalogList] = useState<HorarioCatalogoItem[]>([])
  const [tipoList, setTipoList] = useState<TipoAsignacionAdministrativo[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [loadingTipos, setLoadingTipos] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // ── Edit-mode state ──────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDates, setEditDates] = useState<Record<number, string>>({})
  const [editPermiteClases, setEditPermiteClases] = useState<Record<number, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  // ── Sorted list (memoised inline) ────────────────────────────────────────────
  const sortedSchedules = [...schedules].sort((a, b) => {
    const aActive = a.fecha_fin === null
    const bActive = b.fecha_fin === null

    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1

    if (aActive && bActive) {
      return b.fecha_inicio.localeCompare(a.fecha_inicio)
    }

    return b.fecha_fin!.localeCompare(a.fecha_fin!)
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  // Get dynamic workload based on selected hours catalog match
  const selectedCatalogItem = useMemo(() => {
    if (!selectedCatalogId) return null
    return catalogList.find((c) => c.id === Number(selectedCatalogId)) || null
  }, [selectedCatalogId, catalogList])

  // Handle Dia multi-checkbox logic
  const handleDiaCheckboxChange = (dayNum: number, checked: boolean) => {
    if (dayNum === 0) {
      // Toggle All (1-5)
      if (checked) {
        setSelectedDias([1, 2, 3, 4, 5])
      } else {
        setSelectedDias([])
      }
    } else {
      if (checked) {
        setSelectedDias((prev) => [...prev, dayNum])
      } else {
        setSelectedDias((prev) => prev.filter((d) => d !== dayNum))
      }
    }
  }

  const isAllDaysSelected = selectedDias.length === 5

  const resetForm = () => {
    setSelectedCatalogId("")
    setSelectedStart("")
    setSelectedEnd("")
    setFechaInicio(new Date())
    setFechaFin(undefined)
    setPermiteClases(false)
    setSelectedDias([])
    setSelectedTipoId("")
    setOverlapError(null)
  }

  const updateCatalogId = (start: string, end: string) => {
    if (start && end) {
      const match = catalogList.find(
        (c) => formatTime(c.hora_entrada) === start && formatTime(c.hora_salida) === end
      )
      setSelectedCatalogId(match ? match.id : "")
    } else {
      setSelectedCatalogId("")
    }
  }

  const handleStartChange = (val: string) => {
    setSelectedStart(val)
    let finalEnd = selectedEnd
    if (val) {
      const allowed = catalogList
        .filter((c) => formatTime(c.hora_entrada) === val)
        .map((c) => formatTime(c.hora_salida))
      if (selectedEnd && !allowed.includes(selectedEnd)) {
        setSelectedEnd("")
        finalEnd = ""
      }
    }
    updateCatalogId(val, finalEnd)
  }

  const handleEndChange = (val: string) => {
    setSelectedEnd(val)
    let finalStart = selectedStart
    if (val) {
      const allowed = catalogList
        .filter((c) => formatTime(c.hora_salida) === val)
        .map((c) => formatTime(c.hora_entrada))
      if (selectedStart && !allowed.includes(selectedStart)) {
        setSelectedStart("")
        finalStart = ""
      }
    }
    updateCatalogId(finalStart, val)
  }

  const availableStartTimes = Array.from(
    new Set(
      catalogList
        .filter((c) => !selectedEnd || formatTime(c.hora_salida) === selectedEnd)
        .map((c) => formatTime(c.hora_entrada))
    )
  ).sort()

  const availableEndTimes = Array.from(
    new Set(
      catalogList
        .filter((c) => !selectedStart || formatTime(c.hora_entrada) === selectedStart)
        .map((c) => formatTime(c.hora_salida))
    )
  ).sort()

  // ── Edit-mode helpers ────────────────────────────────────────────────────────
  const enterEditMode = () => {
    const datesMap: Record<number, string> = {}
    const permiteMap: Record<number, boolean> = {}
    sortedSchedules.forEach((s) => {
      datesMap[s.id] = s.fecha_fin ?? ""
      permiteMap[s.id] = s.permite_clases
    })
    setEditDates(datesMap)
    setEditPermiteClases(permiteMap)
    setIsEditMode(true)
    if (isFormOpen) {
      setIsFormOpen(false)
      resetForm()
    }
  }

  const cancelEditMode = () => {
    setEditDates({})
    setEditPermiteClases({})
    setIsEditMode(false)
  }

  // ── Effects ──────────────────────────────────────────────────────────────────
  // Reset states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setIsFormOpen(false)
      setIsEditMode(false)
      resetForm()
    }
  }, [isOpen])

  // Load catalogs when form opens
  useEffect(() => {
    if (isFormOpen) {
      if (catalogList.length === 0) {
        const loadCatalog = async () => {
          setLoadingCatalog(true)
          try {
            const res = await fetchHorarioCatalogo(1, 100)
            if (res.success && res.data) setCatalogList(res.data)
            else toast.error("Error al cargar el catálogo de horarios")
          } catch (err) {
            console.error(err)
            toast.error("Error al cargar el catálogo de horarios")
          } finally {
            setLoadingCatalog(false)
          }
        }
        loadCatalog()
      }
      if (tipoList.length === 0) {
        const loadTipos = async () => {
          setLoadingTipos(true)
          try {
            const res = await fetchTipoAsignacionHorarioAdministrativo(1, 100)
            if (res.success && res.data) {
              // Only active types can be selected for new assignments
              setTipoList(res.data.filter((t) => t.activo))
            } else {
              toast.error("Error al cargar los tipos de asignación")
            }
          } catch (err) {
            console.error(err)
            toast.error("Error al cargar los tipos de asignación")
          } finally {
            setLoadingTipos(false)
          }
        }
        loadTipos()
      }
    }
  }, [isFormOpen, catalogList.length, tipoList.length])

  // Real-time overlap validation
  useEffect(() => {
    let computed: string | null = null

    if (selectedCatalogId && selectedDias.length > 0) {
      const cat = catalogList.find((c) => c.id === Number(selectedCatalogId))
      if (cat) {
        const startNewTime = timeToMinutes(cat.hora_entrada)
        const endNewTime = timeToMinutes(cat.hora_salida)
        const startNewDate = format(fechaInicio, "yyyy-MM-dd")
        const endNewDate = fechaFin ? format(fechaFin, "yyyy-MM-dd") : "9999-12-31"

        if (fechaFin && fechaFin < fechaInicio) {
          computed = "La fecha de fin no puede ser anterior a la fecha de inicio."
        } else {
          for (const item of schedules) {
            const endExisting = item.fecha_fin ?? "9999-12-31"
            const datesOverlap = startNewDate <= endExisting && endNewDate >= item.fecha_inicio
            const matchesDay = selectedDias.includes(item.dia)
            if (datesOverlap && matchesDay) {
              const startET = timeToMinutes(item.horario_catalogo.hora_entrada)
              const endET = timeToMinutes(item.horario_catalogo.hora_salida)
              if (startNewTime < endET && startET < endNewTime) {
                computed = `El horario se solapa el día ${DIA_LABELS[item.dia]} con '${item.horario_catalogo.descripcion}' (${formatTime(item.horario_catalogo.hora_entrada)} - ${formatTime(item.horario_catalogo.hora_salida)}) en el período ${formatDate(item.fecha_inicio)} a ${formatDate(item.fecha_fin, true)}.`
                break
              }
            }
          }
        }
      }
    }

    if (overlapError !== computed) {
      const t = setTimeout(() => setOverlapError(computed), 0)
      return () => clearTimeout(t)
    }
  }, [selectedCatalogId, fechaInicio, fechaFin, catalogList, schedules, overlapError, selectedDias])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !docente ||
      !selectedCatalogId ||
      selectedDias.length === 0 ||
      !selectedTipoId ||
      overlapError
    ) {
      toast.error("Complete todos los campos requeridos")
      return
    }
    setIsSubmitting(true)
    let successCount = 0
    const failedDays: string[] = []
    try {
      // Sequence batch create for all selected days
      await Promise.all(
        selectedDias.map(async (d) => {
          const payload: CrearAsignacionHorarioRequest = {
            persona_codigo: docente.codigo,
            horario_catalogo_id: Number(selectedCatalogId),
            fecha_inicio: format(fechaInicio, "yyyy-MM-dd"),
            fecha_fin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : null,
            permite_clases: permiteClases,
            dia: d,
            tipo_asignacion_horario_administrativo_id: Number(selectedTipoId),
          }
          const res = await crearAsignacionHorario(payload)
          if (res.success) {
            successCount++
          } else {
            failedDays.push(DIA_LABELS[d] || `Día ${d}`)
          }
        })
      )

      if (successCount > 0) {
        toast.success(`Asignados correctamente ${successCount} horario(s) administrativo(s).`)
        if (failedDays.length > 0) {
          toast.error(`No se pudieron asignar los días: ${failedDays.join(", ")}`)
        }
        resetForm()
        setIsFormOpen(false)
        onAssigned?.()
      } else {
        toast.error("Error al asignar los horarios administrativos.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error inesperado al asignar los horarios administrativos")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (isDeleting !== null) return
    setIsDeleting(id)
    try {
      const res = await eliminarAsignacionHorario(id)
      if (res.success) {
        toast.success("Asignación de horario eliminada correctamente")
        onAssigned?.()
      } else {
        toast.error("Error al eliminar la asignación de horario")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error inesperado al eliminar la asignación")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSaveEdits = async () => {
    // Check which entries actually changed (either dates or permite_clases)
    const changed = sortedSchedules.filter((s) => {
      const dateChanged = (editDates[s.id] ?? "") !== (s.fecha_fin ?? "")
      const permiteChanged = (editPermiteClases[s.id] ?? s.permite_clases) !== s.permite_clases
      return dateChanged || permiteChanged
    })

    if (changed.length === 0) {
      cancelEditMode()
      return
    }

    setIsSaving(true)
    let allOk = true
    try {
      await Promise.all(
        changed.map(async (schedule) => {
          const payload: PatchAsignacionHorarioRequest = {}
          const newDate = editDates[schedule.id] ?? ""
          const originalDate = schedule.fecha_fin ?? ""
          if (newDate !== originalDate) {
            payload.fecha_fin = newDate || null
          }
          const newPermite = editPermiteClases[schedule.id] ?? schedule.permite_clases
          if (newPermite !== schedule.permite_clases) {
            payload.permite_clases = newPermite
          }

          const res = await patchAsignacionHorario(schedule.id, payload)
          if (!res.success) {
            allOk = false
            toast.error(res.message || `Error al actualizar horario con ID ${schedule.id}`)
          }
        })
      )
      if (allOk) {
        toast.success("Horarios actualizados correctamente")
      }
      cancelEditMode()
      onAssigned?.()
    } catch (err) {
      console.error(err)
      toast.error("Error inesperado al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <UmssModal
      isOpen={isOpen}
      onClose={onClose}
      title="Horario Administrativo"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="cancel"
                onClick={cancelEditMode}
                disabled={isSaving}
                className="rounded-2xl text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="rounded-2xl text-white"
              >
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={enterEditMode}
                disabled={sortedSchedules.length === 0}
                className="rounded-2xl gap-1.5"
              >
                <Pencil className="size-3.5 text-muted-foreground" />
                Editar Fechas
              </Button>
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Cerrar
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* ── Subtitle and Docente Info ── */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Listado de horarios activos y control de asignaciones administrativas del docente.
          </p>
          {docente && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
              Docente: {docente.nombres} · CI: {docente.documento || "—"} · SIS: {docente.codigo}
            </div>
          )}
        </div>

        {/* ── Collapsible form toggle button ── */}
        {!isEditMode && (
          <button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="flex items-center justify-between w-full p-3.5 bg-muted/40 hover:bg-muted/80 rounded-2xl border border-border/60 transition-all font-roboto text-xs font-semibold text-foreground select-none shrink-0"
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" />
              {isFormOpen
                ? "Ocultar Formulario de Registro"
                : "Crear / Asignar Nuevo Horario Administrativo"}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-300",
                isFormOpen && "rotate-180"
              )}
            />
          </button>
        )}

        {/* ── Assign form (collapsible with transition) ── */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out overflow-hidden shrink-0",
            isFormOpen && !isEditMode
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          )}
        >
          <div className="min-h-0">
            <form
              onSubmit={handleSubmit}
              className="p-5 rounded-3xl border border-border bg-muted/10 space-y-4 mb-1"
            >
              <div className="space-y-4">
                {/* 1. Tipo de Asignación */}
                <div className="space-y-1.5 flex flex-col">
                  <label
                    htmlFor="select-tipo-admin"
                    className="text-xs font-semibold text-foreground/80 font-roboto"
                  >
                    Tipo de Asignación <span className="text-red-500">*</span>
                  </label>
                  {loadingTipos ? (
                    <div className="text-xs text-muted-foreground py-3">Cargando tipos...</div>
                  ) : (
                    <Select
                      value={selectedTipoId.toString()}
                      onValueChange={(val) => setSelectedTipoId(Number(val))}
                    >
                      <SelectTrigger
                        id="select-tipo-admin"
                        className="h-12 w-full rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                      >
                        <SelectValue placeholder="Seleccione tipo de asignación administrativa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoList.map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>
                            {t.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* 2. Día de la semana checkboxes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80 font-roboto">
                    Días a Asignar <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-border">
                    <div className="flex items-center gap-2 select-none border-r border-border pr-5 mr-1">
                      <Checkbox
                        id="day-all"
                        checked={isAllDaysSelected}
                        onCheckedChange={(checked) => handleDiaCheckboxChange(0, !!checked)}
                      />
                      <Label
                        htmlFor="day-all"
                        className="text-xs font-bold text-foreground cursor-pointer font-roboto"
                      >
                        Seleccionar todos
                      </Label>
                    </div>

                    {[
                      { val: 1, label: "Lunes" },
                      { val: 2, label: "Martes" },
                      { val: 3, label: "Miércoles" },
                      { val: 4, label: "Jueves" },
                      { val: 5, label: "Viernes" },
                    ].map((d) => {
                      const isChecked = selectedDias.includes(d.val)
                      return (
                        <div key={d.val} className="flex items-center gap-2 select-none">
                          <Checkbox
                            id={`day-${d.val}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleDiaCheckboxChange(d.val, !!checked)}
                          />
                          <Label
                            htmlFor={`day-${d.val}`}
                            className="text-xs text-foreground/85 cursor-pointer font-roboto"
                          >
                            {d.label}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Catálogo de Horas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {loadingCatalog ? (
                    <div className="text-xs text-muted-foreground sm:col-span-2 py-2">
                      Cargando catálogo de horarios...
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5 flex flex-col">
                        <label
                          htmlFor="select-inicio-admin"
                          className="text-xs font-semibold text-foreground/80 font-roboto"
                        >
                          Hora de Inicio <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedStart} onValueChange={handleStartChange}>
                          <SelectTrigger
                            id="select-inicio-admin"
                            className="h-12 w-full rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                          >
                            <SelectValue placeholder="Seleccione hora inicio..." />
                          </SelectTrigger>
                          <SelectContent position="popper" align="start">
                            {availableStartTimes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label
                          htmlFor="select-fin-admin"
                          className="text-xs font-semibold text-foreground/80 font-roboto"
                        >
                          Hora de Fin <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedEnd} onValueChange={handleEndChange}>
                          <SelectTrigger
                            id="select-fin-admin"
                            className="h-12 w-full rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                          >
                            <SelectValue placeholder="Seleccione hora fin..." />
                          </SelectTrigger>
                          <SelectContent position="popper" align="start">
                            {availableEndTimes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {/* dynamic load info collapsible transition */}
                <div
                  className={cn(
                    "grid transition-all duration-350 ease-out overflow-hidden",
                    selectedCatalogItem
                      ? "grid-rows-[1fr] opacity-100 mt-2"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0">
                    {selectedCatalogItem && (
                      <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-xs text-blue-700 dark:text-blue-400">
                        <span className="font-bold font-roboto">
                          Carga Horaria Diaria del bloque:
                        </span>
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-none font-bold text-xs">
                          {selectedCatalogItem.carga_horaria_diaria} hrs / día
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Fechas (Vigencia) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-foreground/80 font-roboto">
                      Fecha de Inicio <span className="text-red-500">*</span>
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                          {fechaInicio ? format(fechaInicio, "dd-MM-yyyy") : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fechaInicio}
                          onSelect={(date) => date && setFechaInicio(date)}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <span className="text-xs font-semibold text-foreground/80 font-roboto">
                      Fecha de Fin{" "}
                      <span className="text-muted-foreground font-normal">(Opcional)</span>
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                          {fechaFin ? format(fechaFin, "dd-MM-yyyy") : "Sin límite"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fechaFin}
                          onSelect={(date) => setFechaFin(date)}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Permite clases checkbox */}
                <div className="flex items-center gap-2 py-1 select-none">
                  <Checkbox
                    id="permite-clases"
                    checked={permiteClases}
                    onCheckedChange={(checked) => setPermiteClases(!!checked)}
                  />
                  <Label
                    htmlFor="permite-clases"
                    className="text-xs font-semibold text-foreground/80 cursor-pointer font-roboto flex items-center gap-1"
                  >
                    Permitir dictar clases en este horario administrativo
                  </Label>
                </div>

                {/* Error */}
                {overlapError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-200/50 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{overlapError}</span>
                  </div>
                )}

                {/* Cancelar + Registrar Form Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false)
                      resetForm()
                    }}
                    className="rounded-2xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedCatalogId ||
                      selectedDias.length === 0 ||
                      !selectedTipoId ||
                      !!overlapError
                    }
                    className="rounded-2xl text-white px-6"
                  >
                    {isSubmitting ? "Registrando..." : "Registrar Horario"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="rounded-3xl border border-border">
          {sortedSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center bg-muted/10">
              <AlertCircle className="size-10 text-muted-foreground/60 mb-2.5" />
              <p className="text-sm font-medium text-foreground">
                Sin horarios administrativos asignados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este docente no registra asignaciones administrativas cargadas en el sistema.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 border-b border-border/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    Descripción
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Tipo</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Día</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    Horario
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Carga</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Inicio</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    {isEditMode ? "Fecha Fin" : "Fin"}
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    {isEditMode ? "Dicta Clases" : "Clases"}
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Estado</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80 w-10 text-center" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSchedules.map((schedule) => {
                  const isVigente = schedule.fecha_fin === null
                  const checkedValue = editPermiteClases[schedule.id] ?? schedule.permite_clases
                  const diaLabel = DIA_LABELS[schedule.dia] || `Día ${schedule.dia}`
                  const cargaDiaria =
                    schedule.carga_horaria_diaria ??
                    schedule.horario_catalogo.carga_horaria_diaria ??
                    0
                  const tipoLabel =
                    schedule.tipo_asignacion_horario_administrativo?.descripcion || "Administrativo"
                  return (
                    <TableRow key={schedule.id} className="group">
                      <TableCell className="font-medium text-sm text-foreground">
                        {schedule.horario_catalogo.descripcion || "Actividad Administrativa"}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{tipoLabel}</TableCell>
                      <TableCell className="text-sm text-foreground">{diaLabel}</TableCell>
                      <TableCell className="text-sm text-foreground">
                        {formatTime(schedule.horario_catalogo.hora_entrada)} -{" "}
                        {formatTime(schedule.horario_catalogo.hora_salida)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground font-semibold">
                        {cargaDiaria} hrs
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {formatDate(schedule.fecha_inicio)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {isEditMode ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs rounded-lg min-w-[120px] justify-start font-normal px-2 gap-1.5"
                              >
                                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {editDates[schedule.id]
                                  ? format(parseISO(editDates[schedule.id]), "dd-MM-yyyy")
                                  : "Sin límite"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={
                                  editDates[schedule.id]
                                    ? parseISO(editDates[schedule.id])
                                    : undefined
                                }
                                onSelect={(date) =>
                                  setEditDates((prev) => ({
                                    ...prev,
                                    [schedule.id]: date ? format(date, "yyyy-MM-dd") : "",
                                  }))
                                }
                                locale={es}
                                initialFocus
                              />
                              {/* Footer keeps height stable and adapts correctly without clipping */}
                              <div className="border-t border-border p-2">
                                <Button
                                  variant="cancel"
                                  size="sm"
                                  disabled={!editDates[schedule.id]}
                                  className="w-full text-xs text-muted-foreground disabled:opacity-30"
                                  onClick={() =>
                                    setEditDates((prev) => ({
                                      ...prev,
                                      [schedule.id]: "",
                                    }))
                                  }
                                >
                                  Sin límite
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          formatDate(schedule.fecha_fin, true)
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {isEditMode ? (
                          <div className="flex justify-center items-center h-8">
                            <Checkbox
                              checked={checkedValue}
                              onCheckedChange={(checked) =>
                                setEditPermiteClases((prev) => ({
                                  ...prev,
                                  [schedule.id]: !!checked,
                                }))
                              }
                            />
                          </div>
                        ) : schedule.permite_clases ? (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 text-[10px] uppercase px-2 py-0.5">
                            Permitido
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted text-[10px] uppercase px-2 py-0.5">
                            Restringido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isVigente ? (
                          <Badge className="bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20 text-[10px] tracking-wide uppercase px-2 py-0.5">
                            Vigente
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted text-[10px] tracking-wide uppercase px-2 py-0.5">
                            Concluido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={isDeleting !== null}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/20"
                          onClick={() => {
                            if (
                              window.confirm(
                                "¿Está seguro de eliminar físicamente esta asignación administrativa? Esta acción es irreversible."
                              )
                            ) {
                              void handleDelete(schedule.id)
                            }
                          }}
                          title="Eliminar asignación físicamente"
                        >
                          <Trash2 className="size-3.5 text-white" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </UmssModal>
  )
}
