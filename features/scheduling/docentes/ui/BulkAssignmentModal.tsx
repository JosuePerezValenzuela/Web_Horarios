"use client"

import { useCallback, useEffect, useState } from "react"
import { es } from "date-fns/locale"
import { Plus, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"

import type { InfraBloque, NormalizedSchedule, SolapamientoInfo } from "../domain/types"
import { useBulkAsignacionStore } from "../application/useBulkAsignacionStore"
import { AmbienteSearchPopover } from "./AmbienteSearchPopover"
import { SolapamientoWarning } from "./SolapamientoWarning"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { infraApiClient } from "@/shared/services/api/infraClient"

const DIA_LABELS: Record<number, string> = {
  0: "Lunes",
  1: "Martes",
  2: "Miércoles",
  3: "Jueves",
  4: "Viernes",
  5: "Sábado",
  6: "Domingo",
}

interface BulkAssignmentModalProps {
  onAssigned?: () => void | Promise<void>
  schedules?: NormalizedSchedule[]
}

export function BulkAssignmentModal({ onAssigned, schedules }: BulkAssignmentModalProps) {
  // ── Store selectors ──────────────────────────────────
  const isOpen = useBulkAsignacionStore((s) => s.isOpen)
  const selectedGroup = useBulkAsignacionStore((s) => s.selectedGroup)
  const dateRange = useBulkAsignacionStore((s) => s.dateRange)
  const facultades = useBulkAsignacionStore((s) => s.facultades)
  const tiposAmbiente = useBulkAsignacionStore((s) => s.tiposAmbiente)
  const selectedFacultades = useBulkAsignacionStore((s) => s.selectedFacultades)
  const selectedBloques = useBulkAsignacionStore((s) => s.selectedBloques)
  const selectedTipos = useBulkAsignacionStore((s) => s.selectedTipos)
  const estudiantes = useBulkAsignacionStore((s) => s.estudiantes)
  const entries = useBulkAsignacionStore((s) => s.entries)
  const initialLoadError = useBulkAsignacionStore((s) => s.initialLoadError)
  const submitting = useBulkAsignacionStore((s) => s.submitting)

  const setDateRange = useBulkAsignacionStore((s) => s.setDateRange)
  const setSelectedFacultades = useBulkAsignacionStore((s) => s.setSelectedFacultades)
  const setSelectedBloques = useBulkAsignacionStore((s) => s.setSelectedBloques)
  const setSelectedTipos = useBulkAsignacionStore((s) => s.setSelectedTipos)
  const setEstudiantes = useBulkAsignacionStore((s) => s.setEstudiantes)
  const addEntry = useBulkAsignacionStore((s) => s.addEntry)
  const removeEntry = useBulkAsignacionStore((s) => s.removeEntry)
  const updateEntry = useBulkAsignacionStore((s) => s.updateEntry)
  const closeModal = useBulkAsignacionStore((s) => s.closeModal)
  const checkSolapamientos = useBulkAsignacionStore((s) => s.checkSolapamientos)
  const submitBatch = useBulkAsignacionStore((s) => s.submitBatch)

  // ── Local state ──────────────────────────────────────
  const [allBloques, setAllBloques] = useState<InfraBloque[]>([])
  const [ambientePopoverEntry, setAmbientePopoverEntry] = useState<string | null>(null)
  const [facultadSearch, setFacultadSearch] = useState("")
  const [solapamientoOpen, setSolapamientoOpen] = useState(false)
  const [pendingSolapamientos, setPendingSolapamientos] = useState<SolapamientoInfo[]>([])
  const [errorEntryId, setErrorEntryId] = useState<string | null>(null)

  // ── Computed ─────────────────────────────────────────
  const filteredFacultades = facultades.filter((facultad) =>
    facultadSearch.trim()
      ? facultad.nombre.toLowerCase().includes(facultadSearch.trim().toLowerCase())
      : true
  )

  const allEntriesIncomplete =
    entries.length === 0 ||
    entries.every((e) => e.dia === null || !e.horaInicio || !e.horaFin || !e.ambienteId)

  // ── Effects ──────────────────────────────────────────
  // Auto-add first entry when modal opens
  useEffect(() => {
    if (isOpen && entries.length === 0) {
      addEntry()
    }
  }, [isOpen, entries.length, addEntry])

  // Fetch bloques when selected facultades change
  // NOTE: the onValueChange handler on the Facultad Select already
  // resets allBloques/selectedBloques when facultad is deselected.
  // This effect only runs when facultades ARE selected.
  useEffect(() => {
    if (selectedFacultades.length === 0) return

    let mounted = true

    const fetchBloques = async () => {
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "1000",
          activo: "true",
          orderBy: "nombre",
          orderDir: "asc",
        })
        params.set("facultadId", selectedFacultades.map((f) => f.id).join(","))

        const res = await infraApiClient.get<{ items: InfraBloque[] }>(
          `/bloques?${params.toString()}`
        )

        if (!mounted) return

        const newBloques = res.items.map((b) => ({
          ...b,
          facultadId: selectedFacultades[0]?.id,
        }))

        // Merge with bloques from other facultades
        const newIds = new Set(newBloques.map((b) => b.id))
        const kept = allBloques.filter((b) => b.facultadId && !newIds.has(b.id))
        const merged = [...newBloques, ...kept]
        setAllBloques(merged)

        // Auto-select all bloques
        setSelectedBloques(merged)
      } catch (e) {
        console.error("Error fetching bloques:", e)
      }
    }

    fetchBloques()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacultades])

  // ── Handlers ─────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (!selectedGroup || !dateRange?.from || !dateRange?.to) return

    const result = await submitBatch(selectedGroup.persona_grupo_id)

    if (result.success) {
      toast.success(result.message || "Horarios asignados correctamente")
      closeModal()
      onAssigned?.()
    } else {
      toast.error(result.message || "Error en la asignación")

      // Map error index back to entry ID for highlighting
      if (result.errorIndex !== undefined) {
        const validEntries = entries.filter(
          (e) => e.dia !== null && e.horaInicio && e.horaFin && e.ambienteId
        )
        const erroredEntry = validEntries[result.errorIndex]
        if (erroredEntry) {
          setErrorEntryId(erroredEntry.id)
        }
      }
    }
  }, [selectedGroup, dateRange, entries, submitBatch, closeModal, onAssigned])

  const handleSubmit = useCallback(() => {
    if (!selectedGroup || !dateRange?.from || !dateRange?.to) return

    const solapamientos = checkSolapamientos(schedules ?? [])
    if (solapamientos.length > 0) {
      setPendingSolapamientos(solapamientos)
      setSolapamientoOpen(true)
    } else {
      doSubmit()
    }
  }, [selectedGroup, dateRange, checkSolapamientos, doSubmit, schedules])

  const handleConfirm = useCallback(() => {
    setSolapamientoOpen(false)
    doSubmit()
  }, [doSubmit])

  const handleCancel = useCallback(() => {
    setSolapamientoOpen(false)
    setPendingSolapamientos([])
  }, [])

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
          setFacultadSearch("")
          closeModal()
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-2">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
            <DialogTitle className="shrink-0 text-base font-semibold text-foreground sm:text-lg">
              Asignar Horarios
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
                    if (range?.from) setDateRange(range)
                  }}
                  locale={es}
                />
              </div>
            </div>

            {/* Filters grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Facultad */}
              <div>
                <Label className="text-xs font-medium">Facultad</Label>
                <Select
                  value={selectedFacultades[0]?.id?.toString() ?? "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedFacultades([])
                      setSelectedBloques([])
                      setAllBloques([])
                      return
                    }
                    const selected = facultades.find((f) => f.id.toString() === value)
                    setSelectedBloques([])
                    setAllBloques([])
                    setSelectedFacultades(selected ? [selected] : [])
                  }}
                >
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Seleccione facultad" />
                  </SelectTrigger>
                  <SearchableSelectContent
                    onFilterChange={setFacultadSearch}
                    className="max-h-[200px]"
                  >
                    <SelectItem value="none">Seleccione facultad</SelectItem>
                    {filteredFacultades.map((facultad) => (
                      <SelectItem key={facultad.id} value={facultad.id.toString()}>
                        {facultad.nombre}
                      </SelectItem>
                    ))}
                  </SearchableSelectContent>
                </Select>
              </div>

              {/* Bloque */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Bloque</Label>
                  {selectedFacultades.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="text-[10px] text-primary hover:underline"
                        onClick={() => setSelectedBloques(allBloques)}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:underline"
                        onClick={() => setSelectedBloques([])}
                      >
                        Ninguno
                      </button>
                    </div>
                  )}
                </div>
                <MultiSelect
                  options={allBloques.map((b) => ({
                    value: b.id,
                    label: b.nombre || b.codigo || `Bloque ${b.id}`,
                  }))}
                  value={selectedBloques.map((b) => b.id)}
                  onValueChange={(ids) => {
                    const selected = allBloques.filter((b) => ids.includes(b.id))
                    setSelectedBloques(selected)
                  }}
                  placeholder={
                    selectedFacultades.length === 0
                      ? "Seleccione facultad primero"
                      : allBloques.length === 0
                        ? "Cargando bloques..."
                        : "Todos los bloques"
                  }
                  searchable
                  selectAll
                  maxVisibleItems={3}
                  className="mt-1"
                  disabled={selectedFacultades.length === 0}
                />
              </div>

              {/* Tipo de ambiente */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Tipo ambiente</Label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setSelectedTipos(tiposAmbiente)}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:underline"
                      onClick={() => setSelectedTipos([])}
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
                <MultiSelect
                  options={tiposAmbiente.map((t) => ({
                    value: t.id,
                    label: t.nombre,
                  }))}
                  value={selectedTipos.map((t) => t.id)}
                  onValueChange={(ids) => {
                    const selected = tiposAmbiente.filter((t) => ids.includes(t.id))
                    setSelectedTipos(selected)
                  }}
                  placeholder="Todos los tipos"
                  searchable
                  selectAll
                  maxVisibleItems={3}
                  className="mt-1"
                />
              </div>

              {/* Capacidad mínima */}
              <div>
                <Label className="text-xs font-medium">Capacidad mínima</Label>
                <Input
                  type="number"
                  className="mt-1 h-9"
                  min={0}
                  placeholder="Cantidad mínima"
                  value={estudiantes ?? ""}
                  onChange={(e) => setEstudiantes(e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
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

                      return (
                        <tr
                          key={entry.id}
                          className={`border-b border-border/30 transition-colors hover:bg-primary/5 ${
                            isErrored ? "border-l-2 border-l-destructive bg-destructive/5" : ""
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
                            <Input
                              type="time"
                              className="h-8 w-full min-w-0 max-w-32"
                              value={entry.horaInicio}
                              onChange={(e) =>
                                updateEntry(entry.id, {
                                  horaInicio: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <Input
                              type="time"
                              className="h-8 w-full min-w-0 max-w-32"
                              value={entry.horaFin}
                              onChange={(e) =>
                                updateEntry(entry.id, {
                                  horaFin: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {entry.ambienteLabel ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                {entry.ambienteLabel}
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 text-xs"
                                onClick={() => setAmbientePopoverEntry(entry.id)}
                              >
                                Seleccionar
                              </Button>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center align-middle">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={entries.length <= 1}
                              onClick={() => removeEntry(entry.id)}
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
                !selectedGroup ||
                !dateRange?.from ||
                !dateRange?.to ||
                entries.length === 0 ||
                allEntriesIncomplete
              }
              onClick={handleSubmit}
            >
              {submitting
                ? "Asignando..."
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
        />
      </DialogContent>
    </Dialog>
  )
}
