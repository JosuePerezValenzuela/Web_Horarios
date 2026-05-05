"use client"

import { useEffect, useState } from "react"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { useAsignarHorarioStore } from "../application/asignarHorarioStore"
import { Button } from "@/components/ui/button"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MultiSelect } from "@/components/ui/multi-select"
import { horariosApi } from "@/shared/services/api/client"

const DIA_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
}

function formatTimeDiff(start: string, end: string): string {
  if (!start || !end) return ""
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const diffMinutes = eh * 60 + em - (sh * 60 + sm)
  if (diffMinutes <= 0) return ""
  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

interface AsignarHorarioModalProps {
  onAssigned?: () => void | Promise<void>
}

export function AsignarHorarioModal({ onAssigned }: AsignarHorarioModalProps) {
  const {
    isOpen,
    selectedGroup,
    facultades,
    tiposAmbiente,
    selectedFacultades,
    selectedBloques,
    selectedTipos,
    estudiantes,
    dateRange,
    dia,
    horaInicio,
    horaFin,
    ambientes,
    loadingAmbientes,
    closeModal,
    setDia,
    setHoraInicio,
    setHoraFin,
    setEstudiantes,
    setSelectedFacultades,
    setSelectedBloques,
    setSelectedTipos,
    setDateRange,
    fetchAmbientes,
  } = useAsignarHorarioStore()

  const [submitting, setSubmitting] = useState(false)
  const [facultadSearch, setFacultadSearch] = useState("")
  const [allBloques, setAllBloques] = useState<
    Array<{ id: number; nombre: string; codigo?: string; facultadId?: number }>
  >([])

  const filteredFacultades = facultades.filter((facultad) =>
    facultadSearch.trim()
      ? facultad.nombre.toLowerCase().includes(facultadSearch.trim().toLowerCase())
      : true
  )

  // Fetch bloques when facultades change - agregar a la lista existente
  useEffect(() => {
    if (selectedFacultades.length === 0) {
      setAllBloques([])
      setSelectedBloques([])
      return
    }

    const controller = new AbortController()
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
        params.set("facultadId", selectedFacultades.map((f) => f.id.toString()).join(","))
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_INFRA_URL}/bloques?${params.toString()}`,
          { signal: controller.signal }
        ).then((r) => r.json())

        if (mounted && res.items) {
          // Agregar facultadId a cada bloque y mantener los ya seleccionados
          const newBloques = res.items.map(
            (b: { id: number; nombre: string; codigo?: string }) => ({
              ...b,
              facultadId: selectedFacultades[0]?.id,
            })
          )

          // Mantener bloques seleccionados de otras facultades
          const selectedIds = new Set(newBloques.map((b: { id: number }) => b.id))
          const blocksToKeep = allBloques.filter((b) => b.facultadId && !selectedIds.has(b.id))

          setAllBloques([...newBloques, ...blocksToKeep])

          // Seleccionar todos los bloques por defecto
          const allSelected = [...newBloques, ...blocksToKeep]
          useAsignarHorarioStore.getState().setSelectedBloques(allSelected)
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Error fetching bloques:", e)
        }
      }
    }
    fetchBloques()
    return () => {
      mounted = false
      controller.abort()
    }
  }, [selectedFacultades, setSelectedBloques])

  // Fetch ambientes when filters change - mínimo: definición + facultad
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen && dia && horaInicio && horaFin && selectedFacultades.length > 0) {
        fetchAmbientes()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [
    dia,
    horaInicio,
    horaFin,
    selectedFacultades,
    selectedBloques,
    selectedTipos,
    estudiantes,
    isOpen,
    fetchAmbientes,
  ])

  const handleAssign = async (ambiente: { id: number }) => {
    if (!selectedGroup || !dateRange?.from || !dateRange?.to || !dia || !horaInicio || !horaFin) {
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        persona_grupo_id: selectedGroup.persona_grupo_id,
        aula_id: ambiente.id,
        dia: Number(dia) - 1,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        fecha_inicio: dateRange.from.toISOString().split("T")[0],
        fecha_fin: dateRange.to.toISOString().split("T")[0],
      }

      const response = await horariosApi.asignar(payload)
      if (response.success) {
        closeModal()
        await onAssigned?.()
      } else {
        console.error("Error:", response.message)
        alert(response.message || "Error al asignar horario")
      }
    } catch (error) {
      console.error("Error assigning schedule:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const timeDiff = formatTimeDiff(horaInicio, horaFin)
  const canSubmit =
    selectedGroup &&
    dateRange?.from &&
    dateRange?.to &&
    dia &&
    horaInicio &&
    horaFin &&
    timeDiff !== "" &&
    timeDiff !== "00:00"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-h-[90vh] flex flex-col p-0 sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0 sm:px-6 sm:pt-6 sm:pb-2">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
            <DialogTitle className="shrink-0 text-base font-semibold text-foreground sm:text-lg">
              Asignar Horario
            </DialogTitle>
            <DialogDescription className="min-w-0 text-xs text-muted-foreground sm:text-sm">
              {selectedGroup && <span className="font-medium">{selectedGroup.materia}</span>}
              {selectedGroup && <> · Grupo {selectedGroup.grupo}</>}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          {/* Block 1: Date/Time Definition */}
          <section className="mb-4 rounded-2xl border border-border bg-muted/30 p-3 sm:p-4">
            <h3 className="mb-3 text-sm font-semibold">Definición del horario</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {/* Rango de fechas */}
              <div className="col-span-2">
                <Label className="text-xs">Rango de fechas</Label>
                <div className="mt-1">
                  <DatePickerRange
                    value={dateRange as DateRange | undefined}
                    onChange={(range) => {
                      if (range?.from) {
                        setDateRange(range)
                      }
                    }}
                    locale={es}
                  />
                </div>
              </div>

              {/* Dia - usando shadcn Select */}
              <div>
                <Label className="text-xs">Día</Label>
                <Select value={dia?.toString()} onValueChange={(v) => setDia(Number(v) || null)}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIA_LABELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hora inicio */}
              <div>
                <Label className="text-xs">Hora inicio</Label>
                <Input
                  type="time"
                  className="mt-1 h-9"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>

              {/* Hora fin */}
              <div>
                <Label className="text-xs">Hora fin</Label>
                <Input
                  type="time"
                  className="mt-1 h-9"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Block 2: Filters + Table */}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {/* Left: Filters */}
            <div className="space-y-4 sm:space-y-5">
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
                  <SelectTrigger className="mt-1 h-9 w-full">
                    <SelectValue placeholder="Seleccione facultad" />
                  </SelectTrigger>
                  <SearchableSelectContent onFilterChange={setFacultadSearch}>
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
                <Label className="text-xs font-medium">Bloque</Label>
                <MultiSelect
                  options={allBloques.map((b) => ({
                    value: b.id,
                    label: b.nombre || b.codigo || `Bloque ${b.id}`,
                  }))}
                  value={selectedBloques.map((b) => b.id)}
                  onValueChange={(ids) => {
                    // Sincronizar con el store
                    const selected = allBloques.filter((b) =>
                      ids.includes(b.id)
                    ) as unknown as import("@/features/scheduling/docentes/domain/types").InfraBloque[]
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
                  maxVisibleItems={3}
                  className="mt-1"
                  disabled={selectedFacultades.length === 0}
                />
              </div>

              {/* Tipo de ambiente */}
              <div>
                <Label className="text-xs font-medium">Tipo de ambiente</Label>
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
                  maxVisibleItems={3}
                  className="mt-1"
                />
              </div>

              {/* Capacidad mínima */}
              <div>
                <Label className="text-xs font-medium">Capacidad mínima (estudiantes)</Label>
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

            {/* Right: Ambientes Table */}
            <div className="col-span-2 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto rounded-xl border border-border">
                <div className="min-w-full inline-block align-middle">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Bloque</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="whitespace-nowrap">Cap.</TableHead>
                        <TableHead className="whitespace-nowrap">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAmbientes ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Cargando...
                          </TableCell>
                        </TableRow>
                      ) : ambientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            {!dia || !horaInicio || !horaFin || selectedFacultades.length === 0
                              ? "Complete definición de horario y seleccione una facultad"
                              : "No se encontraron ambientes"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        ambientes.map((amb) => (
                          <TableRow key={amb.id}>
                            <TableCell className="text-xs">{amb.facultad_nombre || "-"}</TableCell>
                            <TableCell className="text-xs">{amb.edificio_nombre || "-"}</TableCell>
                            <TableCell className="text-xs">{amb.nombre}</TableCell>
                            <TableCell className="text-xs">{amb.tipo || "-"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {amb.capacidad}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                size="sm"
                                disabled={!canSubmit || submitting}
                                onClick={() => handleAssign(amb)}
                              >
                                Asignar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
