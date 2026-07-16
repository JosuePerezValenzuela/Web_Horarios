"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, AlertCircle, Pencil, HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "../domain/types"
import {
  fetchHorarioCatalogo,
  crearAsignacionHorario,
  patchAsignacionHorario,
} from "../application/api"

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
  const [catalogList, setCatalogList] = useState<HorarioCatalogoItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)

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
  const resetForm = () => {
    setSelectedCatalogId("")
    setSelectedStart("")
    setSelectedEnd("")
    setFechaInicio(new Date())
    setFechaFin(undefined)
    setPermiteClases(false)
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
  // Load catalog when form opens
  useEffect(() => {
    if (isFormOpen && catalogList.length === 0) {
      const load = async () => {
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
      load()
    }
  }, [isFormOpen, catalogList.length])

  // Real-time overlap validation
  useEffect(() => {
    let computed: string | null = null

    if (selectedCatalogId) {
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
            if (datesOverlap) {
              const startET = timeToMinutes(item.horario_catalogo.hora_entrada)
              const endET = timeToMinutes(item.horario_catalogo.hora_salida)
              if (startNewTime < endET && startET < endNewTime) {
                computed = `El horario se solapa con '${item.horario_catalogo.descripcion}' (${formatTime(item.horario_catalogo.hora_entrada)} - ${formatTime(item.horario_catalogo.hora_salida)}) en el período ${formatDate(item.fecha_inicio)} a ${formatDate(item.fecha_fin, true)}.`
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
  }, [selectedCatalogId, fechaInicio, fechaFin, catalogList, schedules, overlapError])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docente || !selectedCatalogId || overlapError) return
    setIsSubmitting(true)
    try {
      const payload: CrearAsignacionHorarioRequest = {
        persona_codigo: docente.codigo,
        horario_catalogo_id: Number(selectedCatalogId),
        fecha_inicio: format(fechaInicio, "yyyy-MM-dd"),
        fecha_fin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : null,
        permite_clases: permiteClases,
      }
      const res = await crearAsignacionHorario(payload)
      if (res.success) {
        toast.success(res.message || "Horario administrativo asignado con éxito")
        resetForm()
        setIsFormOpen(false)
        onAssigned?.()
      } else {
        toast.error(res.message || "Error al asignar el horario administrativo")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error inesperado al asignar el horario administrativo")
    } finally {
      setIsSubmitting(false)
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl gap-4 overflow-hidden rounded-4xl bg-popover p-6 shadow-xl">
        {/* ── Header ── */}
        <DialogHeader className="flex flex-col gap-1 pb-1">
          <DialogTitle className="font-roboto text-xl font-bold text-foreground">
            Horario Administrativo
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pb-2">
            Listado de horarios activos.
          </DialogDescription>
          {docente && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
              Docente: {docente.nombres} · CI: {docente.documento || "—"} · SIS: {docente.codigo}
            </div>
          )}
        </DialogHeader>

        {/* ── Assign form (animated collapse) ── */}
        <div
          className={cn(
            "grid transition-all duration-500 ease-in-out overflow-hidden",
            isFormOpen
              ? "grid-rows-[1fr] opacity-100 mb-3"
              : "grid-rows-[0fr] opacity-0 mb-0 pointer-events-none"
          )}
        >
          <div className="min-h-0">
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-3xl border border-border bg-muted/20 space-y-4"
            >
              <h4 className="text-sm font-semibold text-foreground font-roboto">
                Nueva Asignación de Horario
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingCatalog ? (
                  <div className="text-xs text-muted-foreground sm:col-span-2 py-2">
                    Cargando catálogo de horarios...
                  </div>
                ) : (
                  <>
                    {/* Hora inicio */}
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-semibold text-foreground/80 font-roboto">
                        Hora de Inicio <span className="text-red-500">*</span>
                      </label>
                      <Select value={selectedStart} onValueChange={handleStartChange}>
                        <SelectTrigger className="h-12 w-full rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground">
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

                    {/* Hora fin */}
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-semibold text-foreground/80 font-roboto">
                        Hora de Fin <span className="text-red-500">*</span>
                      </label>
                      <Select value={selectedEnd} onValueChange={handleEndChange}>
                        <SelectTrigger className="h-12 w-full rounded-lg border border-gray-300 dark:border-[#333333] bg-white dark:bg-[#242424] text-foreground hover:bg-white hover:text-foreground">
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

                {/* Fecha inicio */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-foreground/80 font-roboto">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
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

                {/* Fecha fin */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-foreground/80 font-roboto">
                    Fecha de Fin{" "}
                    <span className="text-muted-foreground font-normal">(Opcional)</span>
                  </label>
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

                {/* Permite clases checkbox */}
                <div className="sm:col-span-2 flex items-center gap-2 py-1 select-none">
                  <Checkbox
                    id="permite-clases"
                    checked={permiteClases}
                    onCheckedChange={(checked) => setPermiteClases(!!checked)}
                  />
                  <label
                    htmlFor="permite-clases"
                    className="text-xs font-semibold text-foreground/80 cursor-pointer font-roboto flex items-center gap-1"
                  >
                    Permitir dictar clases en este horario administrativo
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground outline-none transition-colors"
                      >
                        <HelpCircle className="size-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 text-xs leading-relaxed bg-popover rounded-2xl shadow-lg border border-border">
                      <p className="font-semibold text-foreground mb-1 font-roboto">
                        Habilitar compatibilidad de clases
                      </p>
                      <p className="text-muted-foreground">
                        Permite registrar clases regulares simultáneas al docente dentro de este
                        mismo bloque de horario asignado para labores administrativas.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Error — above action buttons */}
                {overlapError && (
                  <div className="sm:col-span-2 p-3 rounded-2xl bg-red-500/10 border border-red-200/50 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{overlapError}</span>
                  </div>
                )}

                {/* Cancelar (left) + Asignar (right) */}
                <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
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
                    disabled={isSubmitting || !selectedCatalogId || !!overlapError}
                    className="rounded-2xl bg-umss-btn-blue hover:bg-[#001b3a] text-white px-6"
                  >
                    {isSubmitting ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="my-1 max-h-[400px] overflow-y-auto">
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
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    Horario
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Inicio</TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    {isEditMode ? "Fecha Fin" : "Fin"}
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">
                    {isEditMode ? "Dicta Clases" : "Clases"}
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-foreground/80">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSchedules.map((schedule) => {
                  const isVigente = schedule.fecha_fin === null
                  const checkedValue = editPermiteClases[schedule.id] ?? schedule.permite_clases
                  return (
                    <TableRow key={schedule.id} className="group">
                      <TableCell className="font-medium text-sm text-foreground">
                        {schedule.horario_catalogo.descripcion || "Actividad Administrativa"}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {formatTime(schedule.horario_catalogo.hora_entrada)} -{" "}
                        {formatTime(schedule.horario_catalogo.hora_salida)}
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
                                  variant="ghost"
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
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 pt-2">
          {isEditMode ? (
            <>
              <Button
                variant="ghost"
                onClick={cancelEditMode}
                disabled={isSaving}
                className="rounded-2xl text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="rounded-2xl bg-umss-btn-blue hover:bg-[#001b3a] text-white"
              >
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </>
          ) : (
            <>
              {!isFormOpen && (
                <>
                  <Button
                    variant="outline"
                    onClick={enterEditMode}
                    disabled={sortedSchedules.length === 0}
                    className="rounded-2xl gap-1.5"
                  >
                    <Pencil className="size-3.5" />
                    Editar Fechas
                  </Button>
                  <Button
                    onClick={() => setIsFormOpen(true)}
                    className="rounded-2xl bg-umss-btn-blue hover:bg-[#001b3a] text-white"
                  >
                    Asignar Horario
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Cerrar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
