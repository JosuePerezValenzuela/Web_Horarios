"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { es } from "date-fns/locale"
import { Plus, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"

import type { BulkAssignmentModalProps, EditScheduleEntry, SolapamientoInfo } from "../domain/types"
import {
  useBulkAsignacionStore,
  createBulkAmbienteAdapter,
} from "../application/useBulkAsignacionStore"
import {
  useEditScheduleStore,
  createEditAmbienteAdapter,
} from "../application/useEditScheduleStore"
import { AmbienteSearchPopover } from "./AmbienteSearchPopover"
import { SolapamientoWarning } from "./SolapamientoWarning"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { TimePicker } from "@/components/ui/time-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { horariosApi } from "@/shared/services/api/client"

const DIA_LABELS: Record<number, string> = {
  0: "Lunes",
  1: "Martes",
  2: "Miércoles",
  3: "Jueves",
  4: "Viernes",
  5: "Sábado",
  6: "Domingo",
}

export function BulkAssignmentModal({ mode, onAssigned, schedules }: BulkAssignmentModalProps) {
  // ── Adapter (memoised, stable across renders) ─────────
  const ambienteAdapter = useMemo(
    () =>
      mode === "create"
        ? createBulkAmbienteAdapter(useBulkAsignacionStore)
        : createEditAmbienteAdapter(useEditScheduleStore),
    [mode]
  )

  // ── Store subscriptions (both, unconditional — rules of hooks) ──
  const bulk = useBulkAsignacionStore()
  const edit = useEditScheduleStore()

  // Mode-conditional state
  const isOpen = mode === "create" ? bulk.isOpen : edit.isOpen
  const selectedGroup = mode === "create" ? bulk.selectedGroup : edit.selectedGroup
  const entries = mode === "create" ? bulk.entries : edit.entries
  const initialLoadError = mode === "create" ? bulk.initialLoadError : edit.initialLoadError
  const submitting = mode === "create" ? bulk.submitting : edit.submitting
  const dateRange = mode === "create" ? bulk.dateRange : edit.dateRange

  // Mode-conditional actions (stable references)
  const bulkSubmitBatch = useBulkAsignacionStore((s) => s.submitBatch)
  const bulkCloseModal = useBulkAsignacionStore((s) => s.closeModal)
  const bulkEntries = useBulkAsignacionStore((s) => s.entries)

  const editSubmitEdit = useEditScheduleStore((s) => s.submitEdit)
  const editClose = useEditScheduleStore((s) => s.close)
  const editSetDateRange = useEditScheduleStore((s) => s.setDateRange)
  const editEntries = useEditScheduleStore((s) => s.entries)
  const editHighlightedEntryId = useEditScheduleStore((s) => s.highlightedEntryId)

  const addEntry = mode === "create" ? bulk.addEntry : edit.addEntry
  const removeEntry = mode === "create" ? bulk.removeEntry : edit.removeEntry
  const updateEntry = mode === "create" ? bulk.updateEntry : edit.updateEntry
  const checkSolapamientos = mode === "create" ? bulk.checkSolapamientos : edit.checkSolapamientos
  // ── Local state ──────────────────────────────────────
  const [ambientePopoverEntry, setAmbientePopoverEntry] = useState<string | null>(null)
  const [solapamientoOpen, setSolapamientoOpen] = useState(false)
  const [pendingSolapamientos, setPendingSolapamientos] = useState<SolapamientoInfo[]>([])
  const [errorEntryId, setErrorEntryId] = useState<string | null>(null)
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<string | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)

  const pendingDeleteEntry = useMemo(
    () => entries.find((entry) => entry.id === pendingDeleteEntryId) ?? null,
    [entries, pendingDeleteEntryId]
  )

  const toTimeLabel = (value: string) => value || "--"

  const getDeleteErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as Error & { body?: { message?: string } }
    return apiError?.body?.message || apiError?.message || fallback
  }

  // ── Computed ─────────────────────────────────────────
  const allEntriesIncomplete =
    entries.length === 0 ||
    entries.every((e) => e.dia === null || !e.horaInicio || !e.horaFin || !e.ambienteId)

  const hasValidDateRange = dateRange?.from != null && dateRange?.to != null

  // ── Effects ──────────────────────────────────────────
  // Auto-add first entry when modal opens (only in create mode)
  useEffect(() => {
    if (mode !== "create") return
    if (isOpen && entries.length === 0) {
      addEntry()
    }
  }, [mode, isOpen, entries.length, addEntry])

  // ── Handlers ─────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (mode === "create") {
      if (!selectedGroup || !hasValidDateRange) return

      const result = await bulkSubmitBatch(selectedGroup.persona_grupo_id)

      if (result.success) {
        toast.success(result.message || "Horarios asignados correctamente")
        bulkCloseModal()
        onAssigned?.()
      } else {
        toast.error(result.message || "Error en la asignación")

        if (result.erroredEntryId) {
          setErrorEntryId(result.erroredEntryId)
        } else if (result.errorIndex !== undefined) {
          const validEntries = bulkEntries.filter(
            (e) => e.dia !== null && e.horaInicio && e.horaFin && e.ambienteId
          )
          const erroredEntry = validEntries[result.errorIndex]
          if (erroredEntry) {
            setErrorEntryId(erroredEntry.id)
          }
        }
      }
    } else {
      const result = await editSubmitEdit()

      if (result.success) {
        toast.success(result.message || "Horarios editados correctamente")
        editClose()
        onAssigned?.()
      } else {
        toast.error(result.message || "Error al editar horarios")

        if (result.erroredEntryId) {
          setErrorEntryId(result.erroredEntryId)
        } else if (result.errorIndex !== undefined) {
          const erroredEntry = editEntries[result.errorIndex]
          if (erroredEntry) {
            setErrorEntryId(erroredEntry.id)
          }
        }
      }
    }
  }, [
    mode,
    selectedGroup,
    hasValidDateRange,
    bulkSubmitBatch,
    bulkCloseModal,
    bulkEntries,
    editSubmitEdit,
    editClose,
    editEntries,
    onAssigned,
  ])

  const handleSubmit = useCallback(() => {
    if (mode === "create") {
      if (!selectedGroup || !hasValidDateRange) return

      const solapamientos = checkSolapamientos(schedules ?? [])
      if (solapamientos.length > 0) {
        setPendingSolapamientos(solapamientos)
        setSolapamientoOpen(true)
      } else {
        doSubmit()
      }
    } else {
      // Edit mode: solapamiento check handled inside submitEdit
      doSubmit()
    }
  }, [mode, selectedGroup, hasValidDateRange, checkSolapamientos, doSubmit, schedules])

  const handleConfirm = useCallback(() => {
    setSolapamientoOpen(false)
    doSubmit()
  }, [doSubmit])

  const handleCancel = useCallback(() => {
    setSolapamientoOpen(false)
    setPendingSolapamientos([])
  }, [])

  const handleRowDeleteClick = useCallback(
    (entryId: string) => {
      const entry = entries.find((item) => item.id === entryId)
      if (!entry) return

      if (mode !== "edit") {
        removeEntry(entry.id)
        return
      }

      const editEntry = entry as EditScheduleEntry
      if (!Number.isInteger(editEntry.dbId)) {
        removeEntry(entry.id)
        return
      }

      setPendingDeleteEntryId(entry.id)
    },
    [entries, mode, removeEntry]
  )

  const handleConfirmDeleteRow = useCallback(async () => {
    if (mode !== "edit" || !pendingDeleteEntry || deletingEntry) return

    const dbId = (pendingDeleteEntry as EditScheduleEntry).dbId
    if (!Number.isInteger(dbId)) {
      toast.error("No se encontró un ID válido para eliminar este horario")
      return
    }
    const validDbId = Number(dbId)

    try {
      setDeletingEntry(true)
      const response = await horariosApi.eliminarBatch({ ids: [validDbId] })
      removeEntry(pendingDeleteEntry.id)
      setPendingDeleteEntryId(null)
      toast.success(response.message || "Horario eliminado correctamente")
      await onAssigned?.()
    } catch (error) {
      const apiError = error as Error & { status?: number }
      toast.error(getDeleteErrorMessage(error, "No se pudo eliminar el horario"))
      if (apiError.status === 404) {
        await onAssigned?.()
      }
    } finally {
      setDeletingEntry(false)
    }
  }, [deletingEntry, mode, onAssigned, pendingDeleteEntry, removeEntry])

  const handleSolapamientoOpenChange = useCallback((open: boolean) => {
    setSolapamientoOpen(open)
    if (!open) {
      setPendingSolapamientos([])
    }
  }, [])

  // ── Render ───────────────────────────────────────────
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSolapamientoOpen(false)
          setPendingSolapamientos([])
          setErrorEntryId(null)
          if (mode === "create") {
            bulkCloseModal()
          } else {
            editClose()
          }
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full flex-col p-0 sm:max-w-fit">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-2">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
            <DialogTitle className="shrink-0 text-base font-semibold text-foreground sm:text-lg">
              {mode === "edit" ? "Editar Horarios" : "Asignar Horarios"}
            </DialogTitle>
            <DialogDescription className="min-w-0 text-xs text-muted-foreground sm:text-sm">
              {selectedGroup && <span className="font-medium">{selectedGroup.materia}</span>}
              {selectedGroup && <> · Grupo {selectedGroup.grupo}</>}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          {/* ═══ Global Date Range + Filters ═══ */}
          <section className="mb-4 rounded-2xl border border-border bg-muted/30 p-3 sm:p-4">
            {/* Date range row */}
            <div className="mb-4">
              <Label className="text-xs">Rango de fechas</Label>
              <div className="mt-1">
                <DatePickerRange
                  value={dateRange}
                  onChange={(range) => {
                    if (!range?.from || !range?.to) return
                    if (mode === "create") {
                      bulk.setDateRange(range)
                      return
                    }
                    editSetDateRange(range)
                    const fechaInicio = range.from.toISOString().split("T")[0]
                    const fechaFin = range.to.toISOString().split("T")[0]
                    entries.forEach((entry) => {
                      updateEntry(entry.id, { fechaInicio, fechaFin })
                    })
                  }}
                  locale={es}
                />
              </div>
            </div>

            {/* Location filters intentionally hidden in both modes */}
          </section>

          {/* ═══ Initial load error ═══ */}
          {initialLoadError && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="size-4 shrink-0" />
              <AlertTitle>Error de carga</AlertTitle>
              <AlertDescription>{initialLoadError}</AlertDescription>
            </Alert>
          )}

          {/* ═══ Entries Table ═══ */}
          <section className="mb-4 rounded-2xl border border-border bg-muted/30 p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-semibold">Horarios a asignar</h3>

            {entries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay horarios. Agregue al menos uno.
              </p>
            ) : (
              <div className="max-h-75 overflow-auto rounded-xl border border-border/50 shadow-sm">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 z-10 bg-secondary">
                    <tr className="border-b-2 border-border/80">
                      <th className="h-10 w-8 px-2 text-left align-middle text-xs font-semibold text-foreground">
                        #
                      </th>
                      <th className="h-10 px-2 text-left align-middle text-xs font-semibold text-foreground">
                        Día
                      </th>
                      <th className="h-10 px-2 text-left align-middle text-xs font-semibold text-foreground">
                        Inicio
                      </th>
                      <th className="h-10 px-2 text-left align-middle text-xs font-semibold text-foreground">
                        Fin
                      </th>
                      <th className="h-10 px-2 text-left align-middle text-xs font-semibold text-foreground">
                        Ambiente
                      </th>
                      <th className="h-10 w-10 px-2 text-center align-middle text-xs font-semibold text-foreground" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => {
                      const isErrored = errorEntryId === entry.id
                      const isHighlighted = mode === "edit" && editHighlightedEntryId === entry.id

                      return (
                        <tr
                          key={entry.id}
                          className={`border-b border-border/30 transition-colors hover:bg-primary/5 ${
                            isErrored
                              ? "border-l-2 border-l-destructive bg-destructive/5"
                              : isHighlighted
                                ? "border-l-2 border-l-primary bg-primary/5"
                                : ""
                          }`}
                        >
                          <td className="px-2 py-2 align-middle text-xs text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <Select
                              value={entry.dia?.toString() ?? ""}
                              onValueChange={(v) =>
                                updateEntry(entry.id, {
                                  dia: v ? Number(v) : null,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-full min-w-25">
                                <SelectValue placeholder="Día" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DIA_LABELS).map(([id, label]) => (
                                  <SelectItem key={id} value={id}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <TimePicker
                              value={entry.horaInicio}
                              onChange={(val) =>
                                updateEntry(entry.id, {
                                  horaInicio: val,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <TimePicker
                              value={entry.horaFin}
                              onChange={(val) =>
                                updateEntry(entry.id, {
                                  horaFin: val,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {(() => {
                              const hasEntryData =
                                entry.dia !== null && !!entry.horaInicio && !!entry.horaFin
                              const hasDateData =
                                mode === "create"
                                  ? hasValidDateRange
                                  : hasValidDateRange ||
                                    Boolean((entry.fechaInicio ?? "") && (entry.fechaFin ?? ""))
                              const canSelectAmbiente = hasEntryData && hasDateData

                              return (
                                <Button
                                  variant={entry.ambienteLabel ? "secondary" : "outline"}
                                  size="xs"
                                  className="h-7 w-full justify-start text-xs"
                                  onClick={() => {
                                    if (!canSelectAmbiente) {
                                      const missing: string[] = []
                                      if (!hasDateData) missing.push("rango de fechas")
                                      if (entry.dia === null) missing.push("día")
                                      if (!entry.horaInicio) missing.push("hora inicio")
                                      if (!entry.horaFin) missing.push("hora fin")
                                      toast.error(`Completá: ${missing.join(", ")}`)
                                      return
                                    }
                                    setAmbientePopoverEntry(entry.id)
                                  }}
                                  title={
                                    !canSelectAmbiente
                                      ? "Definí rango, día, hora inicio y hora fin para seleccionar ambiente"
                                      : entry.ambienteLabel
                                        ? `Cambiar ambiente (${entry.ambienteLabel})`
                                        : "Seleccionar ambiente"
                                  }
                                >
                                  {entry.ambienteLabel
                                    ? `Cambiar: ${entry.ambienteLabel}`
                                    : "Seleccionar"}
                                </Button>
                              )
                            })()}
                          </td>
                          <td className="px-2 py-2 text-center align-middle">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={mode === "create" && entries.length <= 1}
                              onClick={() => handleRowDeleteClick(entry.id)}
                              title="Eliminar horario"
                            >
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add entry */}
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => addEntry()}>
                <Plus className="mr-1 size-3.5" />
                Agregar horario
              </Button>
            </div>
          </section>

          {/* ═══ Alert Area ═══ */}
          <div className="space-y-2">
            <SolapamientoWarning
              open={solapamientoOpen}
              onOpenChange={handleSolapamientoOpenChange}
              solapamientos={pendingSolapamientos}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </div>

          <AlertDialog
            open={pendingDeleteEntry !== null}
            onOpenChange={(open) => {
              if (!open && !deletingEntry) {
                setPendingDeleteEntryId(null)
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar horario</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará este horario de este grupo.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {pendingDeleteEntry && (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                  <p>
                    <span className="font-semibold">Día:</span>{" "}
                    {pendingDeleteEntry.dia !== null
                      ? DIA_LABELS[pendingDeleteEntry.dia] || pendingDeleteEntry.dia
                      : "--"}
                  </p>
                  <p>
                    <span className="font-semibold">Inicio:</span>{" "}
                    {toTimeLabel(pendingDeleteEntry.horaInicio)}
                  </p>
                  <p>
                    <span className="font-semibold">Fin:</span>{" "}
                    {toTimeLabel(pendingDeleteEntry.horaFin)}
                  </p>
                  <p>
                    <span className="font-semibold">Ambiente:</span>{" "}
                    {pendingDeleteEntry.ambienteLabel || "Sin ambiente"}
                  </p>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingEntry}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deletingEntry}
                  onClick={(event) => {
                    event.preventDefault()
                    void handleConfirmDeleteRow()
                  }}
                >
                  {deletingEntry ? "Eliminando..." : "Eliminar horario"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ═══ Submit Button ═══ */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {entries.length > 0 &&
                `${entries.length} horario${entries.length !== 1 ? "s" : ""} definido${entries.length !== 1 ? "s" : ""}`}
              {allEntriesIncomplete && entries.length > 0 && " — complete los datos para asignar"}
            </span>

            <Button
              size="lg"
              disabled={
                submitting ||
                (mode === "create" && (!selectedGroup || !hasValidDateRange)) ||
                entries.length === 0 ||
                allEntriesIncomplete
              }
              onClick={handleSubmit}
            >
              {submitting
                ? "Guardando..."
                : mode === "edit"
                  ? "Guardar cambios"
                  : `Asignar ${entries.length} horario${entries.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
        {/* ═══ Ambiente Search Overlay ═══ */}
        <AmbienteSearchPopover
          entryId={ambientePopoverEntry ?? ""}
          open={ambientePopoverEntry !== null}
          onOpenChange={(open) => {
            if (!open) setAmbientePopoverEntry(null)
          }}
          adapter={ambienteAdapter}
        />
      </DialogContent>
    </Dialog>
  )
}
