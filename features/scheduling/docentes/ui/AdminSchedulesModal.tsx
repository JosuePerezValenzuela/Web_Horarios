"use client"

import { useState, useEffect, useMemo } from "react"

import { toast } from "@umss/estilos-base/components"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon,
  AlertCircle,
  Pencil,
  Trash2,
  ChevronDown,
  ClipboardList,
  Loader2,
} from "lucide-react"
import { UmssModal, Button, Checkbox, Badge } from "@umss/estilos-base/components"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
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
import { useAdminCatalogosStore } from "@/shared/stores/catalogos/useAdminCatalogosStore"
import type {
  AdminScheduleRaw,
  DocenteScheduleMeta,
  HorarioCatalogoItem,
  CrearAsignacionHorarioRequest,
  PatchAsignacionHorarioRequest,
  TipoAsignacionAdministrativo,
  TipoCargo,
} from "../domain/types"
import {
  crearAsignacionHorario,
  patchAsignacionHorario,
  eliminarAsignacionHorario,
  fetchDocenteAdminHorarios,
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
  const cleanStr = dateStr.slice(0, 10)
  const parts = cleanStr.split("-")
  if (parts.length !== 3) return cleanStr
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

const getLocalTodayStr = (): string => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const isScheduleVigente = (
  schedule: { fecha_inicio: string; fecha_fin: string | null },
  todayStr: string = getLocalTodayStr()
): boolean => {
  if (schedule.fecha_fin === null) return true
  const finStr = schedule.fecha_fin.slice(0, 10)
  return finStr >= todayStr
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
  const [hasCargo, setHasCargo] = useState(false)
  const [selectedCargoId, setSelectedCargoId] = useState<number | "">("")
  const [selectedDias, setSelectedDias] = useState<number[]>([]) // Array of days (1-5)
  const [selectedTipoId, setSelectedTipoId] = useState<number | "">("")
  const {
    catalogList,
    tipoList,
    cargoList,
    loadingCatalog,
    loadingTipos,
    loadingCargos,
    fetchCatalog,
    fetchTipos,
    fetchCargos,
  } = useAdminCatalogosStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // ── Edit-mode state ──────────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false)
  const [globalEditFechaFin, setGlobalEditFechaFin] = useState<Date | undefined>(undefined)
  const [globalEditHasCargo, setGlobalEditHasCargo] = useState(false)
  const [globalEditCargoId, setGlobalEditCargoId] = useState<number | "">("")
  const [globalEditPermiteClases, setGlobalEditPermiteClases] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [cargoSearch, setCargoSearch] = useState("")

  const todayStr = useMemo(() => getLocalTodayStr(), [])

  const filteredCargoList = useMemo(() => {
    if (!cargoSearch.trim()) return cargoList
    const q = cargoSearch.toLowerCase()
    return cargoList.filter(
      (c) => c.descripcion.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q)
    )
  }, [cargoList, cargoSearch])

  const [localSchedules, setLocalSchedules] = useState<AdminScheduleRaw[]>(schedules)
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)

  const reloadAdminSchedules = async () => {
    if (!docente?.codigo || docente.codigo === "Sin dato") return
    setIsLoadingSchedules(true)
    try {
      const res = await fetchDocenteAdminHorarios(docente.codigo)
      const list =
        res?.data?.horarios ?? (res as any)?.horarios ?? (Array.isArray(res?.data) ? res.data : [])
      if (Array.isArray(list)) {
        setLocalSchedules(list)
      }
    } catch (err) {
      console.error("Error al recargar horarios administrativos:", err)
    } finally {
      setIsLoadingSchedules(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (docente?.codigo && docente.codigo !== "Sin dato") {
        void reloadAdminSchedules()
      } else if (schedules && schedules.length > 0) {
        setLocalSchedules(schedules)
      }
    }
  }, [isOpen, docente?.codigo])

  // ── Active (vigentes) schedules ──────────────────────────────────────────────
  const activeSchedules = useMemo(() => {
    return localSchedules.filter((s) => isScheduleVigente(s, todayStr))
  }, [localSchedules, todayStr])

  // ── Sorted list (memoised inline) ────────────────────────────────────────────
  const sortedSchedules = useMemo(() => {
    return [...localSchedules].sort((a, b) => {
      // Primero, agrupar por vigentes (activos) arriba
      const aActive = isScheduleVigente(a, todayStr)
      const bActive = isScheduleVigente(b, todayStr)

      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1

      // Si ambos tienen el mismo estado de vigencia, ordenar por día de la semana (Lunes = 1, Domingo = 7)
      if (a.dia !== b.dia) {
        return a.dia - b.dia
      }

      // Si coinciden en vigencia y día, ordenar por hora de entrada
      const aStart = timeToMinutes(a.horario_catalogo.hora_entrada)
      const bStart = timeToMinutes(b.horario_catalogo.hora_entrada)
      if (aStart !== bStart) {
        return aStart - bStart
      }

      // Como último criterio, ordenar por fecha de inicio descendente
      return b.fecha_inicio.localeCompare(a.fecha_inicio)
    })
  }, [schedules, todayStr])

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
    setHasCargo(false)
    setSelectedCargoId("")
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
    // 1. Cargo de autoridad: si los activos tienen cargo, preseleccionarlo
    const currentActiveWithCargo = activeSchedules.find((s) => s.tipo_cargo_id)
    if (currentActiveWithCargo && currentActiveWithCargo.tipo_cargo_id) {
      setGlobalEditHasCargo(true)
      setGlobalEditCargoId(currentActiveWithCargo.tipo_cargo_id)
    } else {
      setGlobalEditHasCargo(false)
      setGlobalEditCargoId("")
    }

    // 2. Fecha de fin: si los activos tienen una fecha fin vigente establecida, parsearla
    const activeWithFin = activeSchedules.find((s) => s.fecha_fin !== null)
    if (activeWithFin && activeWithFin.fecha_fin) {
      const [y, m, d] = activeWithFin.fecha_fin.slice(0, 10).split("-").map(Number)
      setGlobalEditFechaFin(new Date(y, m - 1, d))
    } else {
      setGlobalEditFechaFin(undefined)
    }

    // 3. Permite clases: preseleccionar del primer horario activo
    const initialPermite = activeSchedules.length > 0 ? activeSchedules[0].permite_clases : false
    setGlobalEditPermiteClases(initialPermite)

    setIsEditMode(true)
    if (isFormOpen) {
      setIsFormOpen(false)
      resetForm()
    }
  }

  const cancelEditMode = () => {
    setGlobalEditFechaFin(undefined)
    setGlobalEditHasCargo(false)
    setGlobalEditCargoId("")
    setGlobalEditPermiteClases(false)
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

  // Load catalogs when form opens or edit mode enters
  useEffect(() => {
    if (isFormOpen || isEditMode) {
      fetchCargos()
    }
    if (isFormOpen) {
      fetchCatalog()
      fetchTipos()
    }
  }, [isFormOpen, isEditMode, fetchCargos, fetchCatalog, fetchTipos])

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
          for (const item of localSchedules) {
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
  }, [
    selectedCatalogId,
    fechaInicio,
    fechaFin,
    catalogList,
    localSchedules,
    overlapError,
    selectedDias,
  ])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !docente ||
      !selectedCatalogId ||
      selectedDias.length === 0 ||
      !selectedTipoId ||
      (hasCargo && !selectedCargoId) ||
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
          try {
            const payload: CrearAsignacionHorarioRequest = {
              persona_codigo: docente.codigo,
              horario_catalogo_id: Number(selectedCatalogId),
              fecha_inicio: format(fechaInicio, "yyyy-MM-dd"),
              fecha_fin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : null,
              permite_clases: permiteClases,
              dia: d,
              tipo_asignacion_horario_administrativo_id: Number(selectedTipoId),
              tipo_cargo_id: hasCargo && selectedCargoId ? Number(selectedCargoId) : null,
            }
            const res = await crearAsignacionHorario(payload)
            if (res && res.success !== false) {
              successCount++
            } else {
              failedDays.push(DIA_LABELS[d] || `Día ${d}`)
            }
          } catch (dayErr) {
            console.error(`Error al asignar horario para el día ${d}:`, dayErr)
            failedDays.push(DIA_LABELS[d] || `Día ${d}`)
          }
        })
      )

      if (successCount > 0) {
        const msg =
          successCount === 1
            ? "Se asignó correctamente el horario para el día seleccionado."
            : `Se asignaron correctamente los horarios en los ${successCount} días seleccionados.`
        toast.success(msg)
        if (failedDays.length > 0) {
          toast.error(`No se pudieron asignar los horarios para: ${failedDays.join(", ")}`)
        }
        resetForm()
        setIsFormOpen(false)
        await reloadAdminSchedules()
        onAssigned?.()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (isDeleting !== null) return
    setIsDeleting(id)
    try {
      const res = await eliminarAsignacionHorario(id)
      if (res && res.success !== false) {
        toast.success("Asignación de horario eliminada correctamente")
        await reloadAdminSchedules()
        onAssigned?.()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSaveEdits = async () => {
    const targetFechaFin = globalEditFechaFin ? format(globalEditFechaFin, "yyyy-MM-dd") : null
    const targetCargoId = globalEditHasCargo && globalEditCargoId ? Number(globalEditCargoId) : null
    const targetPermiteClases = globalEditPermiteClases

    // Determine which active schedules need updates
    const changedSchedules: {
      schedule: AdminScheduleRaw
      payload: PatchAsignacionHorarioRequest
    }[] = []

    activeSchedules.forEach((schedule) => {
      const payload: PatchAsignacionHorarioRequest = {}
      let hasChange = false

      // 1. Fecha Fin (compara solo si cambió)
      const currentFechaFin = schedule.fecha_fin ? schedule.fecha_fin.slice(0, 10) : null
      if (targetFechaFin !== currentFechaFin) {
        payload.fecha_fin = targetFechaFin
        hasChange = true
      }

      // 2. Tipo Cargo (compara solo si cambió)
      const currentCargoId = schedule.tipo_cargo_id ?? null
      if (targetCargoId !== currentCargoId) {
        payload.tipo_cargo_id = targetCargoId
        hasChange = true
      }

      // 3. Permite Clases (compara solo si cambió)
      if (targetPermiteClases !== schedule.permite_clases) {
        payload.permite_clases = targetPermiteClases
        hasChange = true
      }

      if (hasChange) {
        changedSchedules.push({ schedule, payload })
      }
    })

    if (changedSchedules.length === 0) {
      toast.info("No se detectaron cambios para guardar.")
      cancelEditMode()
      return
    }

    setIsSaving(true)
    let allOk = true
    try {
      await Promise.all(
        changedSchedules.map(async ({ schedule, payload }) => {
          const res = await patchAsignacionHorario(schedule.id, payload)
          if (!res || res.success === false) {
            allOk = false
          }
        })
      )
      if (allOk) {
        toast.success(
          `Se actualizaron correctamente ${changedSchedules.length} horario(s) administrativo(s).`
        )
      }
      cancelEditMode()
      await reloadAdminSchedules()
      onAssigned?.()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <UmssModal
      isOpen={isOpen}
      onClose={onClose}
      title="Horario Academico Administrativo"
      size="2xl"
      className="max-w-[95vw] xl:max-w-7xl"
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
                variant="primary"
                onClick={enterEditMode}
                disabled={activeSchedules.length === 0}
                className="rounded-2xl gap-1.5 text-white"
              >
                <Pencil className="size-3.5" />
                Editar Horarios Vigentes
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

        {/* ── Global Edit Mode Controls Banner ── */}
        {isEditMode && (
          <div className="p-4 rounded-3xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <Pencil className="size-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                Configuración General de Asignaciones Vigentes
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Los cambios en fecha de finalización, cargo de autoridad y permiso para dictar clases
              se aplicarán de forma global a todos los horarios administrativos vigentes (
              {activeSchedules.length}).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/50">
              {/* 1. Fecha de Finalización Global */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-xs font-semibold text-foreground/80 font-roboto">
                  Concluir vigencia (Fecha de Fin)
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-11 rounded-lg border border-border bg-card text-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-form-focus/50 focus-visible:border-form-focus focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      {globalEditFechaFin
                        ? format(globalEditFechaFin, "dd-MM-yyyy")
                        : "Mantener sin límite (Vigente)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={globalEditFechaFin}
                      onSelect={(date) => setGlobalEditFechaFin(date)}
                      locale={es}
                      initialFocus
                    />
                    <div className="border-t border-border p-2">
                      <Button
                        variant="cancel"
                        size="sm"
                        disabled={!globalEditFechaFin}
                        className="w-full text-xs text-muted-foreground disabled:opacity-30"
                        onClick={() => setGlobalEditFechaFin(undefined)}
                      >
                        Sin límite (Mantener vigente)
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. Dicta Clases Global */}
              <div className="space-y-1.5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-foreground/80 font-roboto">
                  Permiso de Clases
                </span>
                <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] select-none">
                  <Checkbox
                    id="global-edit-permite-clases"
                    checked={globalEditPermiteClases}
                    onCheckedChange={(checked) => setGlobalEditPermiteClases(!!checked)}
                  />
                  <Label
                    htmlFor="global-edit-permite-clases"
                    className="text-xs text-foreground/85 cursor-pointer font-roboto"
                  >
                    Permitir dictar clases en estos horarios
                  </Label>
                </div>
              </div>

              {/* 3. Cargo de Autoridad Global */}
              <div className="space-y-1.5 flex flex-col justify-center">
                <div className="flex items-center gap-2 select-none pb-0.5">
                  <Checkbox
                    id="global-edit-cargo-checkbox"
                    checked={globalEditHasCargo}
                    onCheckedChange={(checked) => {
                      const isChecked = !!checked
                      setGlobalEditHasCargo(isChecked)
                      if (!isChecked) {
                        setGlobalEditCargoId("")
                      }
                    }}
                  />
                  <Label
                    htmlFor="global-edit-cargo-checkbox"
                    className="text-xs font-semibold text-foreground/80 cursor-pointer font-roboto flex items-center gap-1"
                  >
                    Asignar cargo de autoridad que no tickea en biometricos
                  </Label>
                </div>

                {globalEditHasCargo && (
                  <div className="pt-0.5">
                    {loadingCargos ? (
                      <div className="text-xs text-muted-foreground py-2">Cargando cargos...</div>
                    ) : (
                      <Select
                        value={globalEditCargoId ? String(globalEditCargoId) : ""}
                        onValueChange={(val) => setGlobalEditCargoId(val ? Number(val) : "")}
                      >
                        <SelectTrigger id="select-global-cargo" className="w-full">
                          <SelectValue placeholder="Seleccione tipo de cargo..." />
                        </SelectTrigger>
                        <SearchableSelectContent
                          searchPlaceholder="Buscar cargo de autoridad..."
                          onFilterChange={setCargoSearch}
                        >
                          {filteredCargoList.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.descripcion} ({c.codigo})
                            </SelectItem>
                          ))}
                        </SearchableSelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                      value={selectedTipoId ? String(selectedTipoId) : ""}
                      onValueChange={(val) => setSelectedTipoId(val ? Number(val) : "")}
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
                    <div className="text-xs text-muted-foreground py-3">Cargando catálogo...</div>
                  ) : (
                    <>
                      <div className="space-y-1.5 flex flex-col">
                        <label
                          htmlFor="select-hora-inicio"
                          className="text-xs font-semibold text-foreground/80 font-roboto"
                        >
                          Hora de Entrada <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedStart || ""} onValueChange={handleStartChange}>
                          <SelectTrigger
                            id="select-hora-inicio"
                            className="h-12 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                          >
                            <SelectValue placeholder="Seleccione hora de entrada..." />
                          </SelectTrigger>
                          <SelectContent>
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
                          htmlFor="select-hora-fin"
                          className="text-xs font-semibold text-foreground/80 font-roboto"
                        >
                          Hora de Salida <span className="text-red-500">*</span>
                        </label>
                        <Select value={selectedEnd || ""} onValueChange={handleEndChange}>
                          <SelectTrigger
                            id="select-hora-fin"
                            className="h-12 rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground"
                          >
                            <SelectValue placeholder="Seleccione hora de salida..." />
                          </SelectTrigger>
                          <SelectContent>
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

                {/* Dynamic Workload and Description */}
                {selectedCatalogItem && (
                  <div className="p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-border flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">Descripción: </span>
                      <span className="text-muted-foreground">
                        {selectedCatalogItem.descripcion}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Carga Horaria Diaria: </span>
                      <Badge variant="brand" className="ml-1 text-[11px] px-2 py-0.5">
                        {selectedCatalogItem.carga_horaria_diaria} hrs / día
                      </Badge>
                    </div>
                  </div>
                )}

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
                          className="w-full justify-start text-left font-normal h-12 rounded-lg border border-border bg-card text-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-form-focus/50 focus-visible:border-form-focus focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none"
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
                          className="w-full justify-start text-left font-normal h-12 rounded-lg border border-border bg-card text-foreground hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-form-focus/50 focus-visible:border-form-focus focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none"
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

                {/* Cargo de autoridad checkbox */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 py-1 select-none">
                    <Checkbox
                      id="has-cargo-checkbox"
                      checked={hasCargo}
                      onCheckedChange={(checked) => {
                        const isChecked = !!checked
                        setHasCargo(isChecked)
                        if (!isChecked) {
                          setSelectedCargoId("")
                        }
                      }}
                    />
                    <Label
                      htmlFor="has-cargo-checkbox"
                      className="text-xs font-semibold text-foreground/80 cursor-pointer font-roboto flex items-center gap-1"
                    >
                      Asignar cargo de autoridad que no tickea en biometricos
                    </Label>
                  </div>

                  {hasCargo && (
                    <div className="space-y-1.5 flex flex-col pl-6">
                      <label
                        htmlFor="select-tipo-cargo"
                        className="text-xs font-semibold text-foreground/80 font-roboto"
                      >
                        Tipo de Cargo de Autoridad <span className="text-red-500">*</span>
                      </label>
                      {loadingCargos ? (
                        <div className="text-xs text-muted-foreground py-2">Cargando cargos...</div>
                      ) : (
                        <Select
                          value={selectedCargoId ? String(selectedCargoId) : ""}
                          onValueChange={(val) => setSelectedCargoId(val ? Number(val) : "")}
                        >
                          <SelectTrigger id="select-tipo-cargo" className="w-full">
                            <SelectValue placeholder="Seleccione tipo de cargo..." />
                          </SelectTrigger>
                          <SearchableSelectContent
                            searchPlaceholder="Buscar cargo de autoridad..."
                            onFilterChange={setCargoSearch}
                          >
                            {filteredCargoList.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.descripcion} ({c.codigo})
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      )}
                    </div>
                  )}
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
                      (hasCargo && !selectedCargoId) ||
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
        <div className="w-full max-w-full rounded-3xl border border-border overflow-hidden bg-card">
          {isLoadingSchedules ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/5">
              <Loader2 className="size-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">
                Cargando horarios administrativos...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Consultando las asignaciones del docente
              </p>
            </div>
          ) : sortedSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center bg-muted/10 m-3">
              <AlertCircle className="size-10 text-muted-foreground/60 mb-2.5" />
              <p className="text-sm font-medium text-foreground">
                Sin horarios administrativos asignados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este docente no registra asignaciones administrativas cargadas en el sistema.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <Table className="w-full min-w-[960px] text-left whitespace-nowrap">
                <TableHeader className="bg-muted/50 border-b border-border/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-xs text-foreground/80">
                      Descripción
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">Tipo</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">
                      Cargo Autoridad
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">Día</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">
                      Horario
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">
                      Carga
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">
                      Inicio
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80">Fin</TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80 text-center">
                      Dicta Clases
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80 text-center">
                      Estado
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-foreground/80 w-10 text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSchedules.map((schedule) => {
                    const isVigente = isScheduleVigente(schedule, todayStr)
                    const diaLabel = DIA_LABELS[schedule.dia] || `Día ${schedule.dia}`
                    const cargaDiaria =
                      schedule.carga_horaria_diaria ??
                      schedule.horario_catalogo.carga_horaria_diaria ??
                      0
                    const tipoLabel =
                      schedule.tipo_asignacion_horario_administrativo?.descripcion ||
                      "Administrativo"
                    const cargoLabel = schedule.tipo_cargo ? schedule.tipo_cargo.descripcion : null

                    return (
                      <TableRow key={schedule.id} className="group">
                        <TableCell className="font-medium text-sm text-foreground">
                          {schedule.horario_catalogo.descripcion || "Actividad Administrativa"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{tipoLabel}</TableCell>
                        <TableCell className="text-sm text-foreground">
                          {cargoLabel ? (
                            <Badge
                              variant="brand"
                              className="text-[10px] uppercase px-2 py-0.5 font-bold"
                            >
                              {cargoLabel}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{diaLabel}</TableCell>
                        <TableCell className="text-sm text-foreground font-mono">
                          {formatTime(schedule.horario_catalogo.hora_entrada)} -{" "}
                          {formatTime(schedule.horario_catalogo.hora_salida)}
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-semibold">
                          {cargaDiaria} hrs
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-mono">
                          {formatDate(schedule.fecha_inicio)}
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-mono">
                          {formatDate(schedule.fecha_fin, true)}
                        </TableCell>
                        <TableCell className="text-center">
                          {schedule.permite_clases ? (
                            <Badge variant="brand" className="text-[10px] uppercase px-2 py-0.5">
                              Permitido
                            </Badge>
                          ) : (
                            <Badge variant="neutral" className="text-[10px] uppercase px-2 py-0.5">
                              Restringido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isVigente ? (
                            <Badge
                              variant="brand"
                              className="text-[10px] tracking-wide uppercase px-2 py-0.5"
                            >
                              Vigente
                            </Badge>
                          ) : (
                            <Badge
                              variant="neutral"
                              className="text-[10px] tracking-wide uppercase px-2 py-0.5"
                            >
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
            </div>
          )}
        </div>
      </div>
    </UmssModal>
  )
}
