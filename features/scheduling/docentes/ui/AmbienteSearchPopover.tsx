"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle } from "lucide-react"

import type {
  AmbienteSearchContract,
  EditScheduleEntry,
  InfraAmbiente,
  InfraBloque,
} from "../domain/types"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { infraApiClient } from "@/shared/services/api/infraClient"

interface AmbienteSearchPopoverProps {
  entryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  adapter: AmbienteSearchContract
}

/** Compute the same cache key the store uses for ambienteCache lookups */
function computeCacheKey(params: {
  entryId: string
  dia: number | null
  horaInicio: string
  horaFin: string
  facultadIds: number[]
  bloqueIds: number[]
  tipoIds: number[]
  capacidadMin: number | null
}): string | null {
  const { entryId, dia, horaInicio, horaFin, facultadIds, bloqueIds, tipoIds, capacidadMin } =
    params
  if (dia === null || !horaInicio || !horaFin) return null
  const filtersHash = `${facultadIds.join(",")}|${bloqueIds.join(",")}|${tipoIds.join(",")}|${capacidadMin ?? ""}`
  return `${entryId}-${dia}-${horaInicio}-${horaFin}-${filtersHash}`
}

export function AmbienteSearchPopover({
  entryId,
  open,
  onOpenChange,
  adapter,
}: AmbienteSearchPopoverProps) {
  const [facultadSearch, setFacultadSearch] = useState("")
  const [availableBloques, setAvailableBloques] = useState<InfraBloque[]>([])

  // ── Adapter reads ──────────────────────────
  const entry = adapter.getEntry(entryId)
  const entryFilters = adapter.getEntryFilters(entryId)
  const facultades = adapter.facultades
  const tiposAmbiente = adapter.tiposAmbiente
  const selectedFacultades = adapter.selectedFacultades
  const selectedBloques = adapter.selectedBloques
  const selectedTipos = adapter.selectedTipos
  const estudiantes = adapter.estudiantes
  const loadingAmbientesForEntry = adapter.loadingAmbientesForEntry
  const ambienteCache = adapter.ambienteCache
  const dateRange = adapter.dateRange

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Derive effective filter values ─────────
  const effectiveFacultad = entryFilters?.selectedFacultades ?? selectedFacultades
  const effectiveBloques = entryFilters?.selectedBloques ?? selectedBloques
  const effectiveTipos = entryFilters?.selectedTipos ?? selectedTipos
  const effectiveCapacidad = entryFilters?.estudiantes ?? estudiantes

  // ── Derived state ────────────────────────────
  const hasGlobalDates = dateRange?.from != null && dateRange?.to != null
  const hasEntryDates =
    entry && "fechaInicio" in entry ? !!(entry as EditScheduleEntry).fechaInicio : false
  const hasDateSource = hasGlobalDates || hasEntryDates
  const isComplete = entry?.dia !== null && !!entry?.horaInicio && !!entry?.horaFin && hasDateSource
  const isLoading = loadingAmbientesForEntry === entryId

  const filteredFacultades = facultades.filter((facultad) =>
    facultadSearch.trim()
      ? facultad.nombre.toLowerCase().includes(facultadSearch.trim().toLowerCase())
      : true
  )

  // ── Fetch available bloques when facultad changes ──
  useEffect(() => {
    if (effectiveFacultad.length === 0) return

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
        params.set("facultadId", effectiveFacultad.map((f) => f.id).join(","))

        const res = await infraApiClient.get<{ items: InfraBloque[] }>(
          `/bloques?${params.toString()}`
        )

        if (!mounted) return
        setAvailableBloques(res.items || [])
      } catch (e) {
        console.error("Error fetching bloques in popover:", e)
      }
    }

    fetchBloques()
    return () => {
      mounted = false
    }
  }, [effectiveFacultad])

  // ── Auto-search on open or when entry becomes complete ──
  useEffect(() => {
    if (!open || !isComplete) return
    adapter.fetchAmbientesForEntry(entryId)
  }, [open, isComplete, entryId, adapter])

  // ── Debounced search helper ───────────────────
  const triggerDebouncedSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      adapter.fetchAmbientesForEntry(entryId)
    }, 300)
  }, [entryId, adapter])

  // ── Filter handlers ──────────────────────────
  const handleFacultadChange = (value: string) => {
    if (value === "none") {
      setAvailableBloques([])
      adapter.setEntryFilters(entryId, { selectedFacultades: [], selectedBloques: [] })
    } else {
      const selected = facultades.find((f) => f.id.toString() === value)
      const newFacultad = selected ? [selected] : []
      setAvailableBloques([])
      adapter.setEntryFilters(entryId, { selectedFacultades: newFacultad, selectedBloques: [] })
    }
    if (isComplete) triggerDebouncedSearch()
  }

  const handleBloqueChange = (ids: (string | number)[]) => {
    const selected = availableBloques.filter((b) => ids.includes(b.id))
    adapter.setEntryFilters(entryId, {
      selectedFacultades: effectiveFacultad,
      selectedBloques: selected,
      selectedTipos: effectiveTipos,
      estudiantes: effectiveCapacidad,
    })
    if (isComplete) triggerDebouncedSearch()
  }

  const handleTipoChange = (ids: (string | number)[]) => {
    const selected = tiposAmbiente.filter((t) => ids.includes(t.id))
    adapter.setEntryFilters(entryId, {
      selectedFacultades: effectiveFacultad,
      selectedBloques: effectiveBloques,
      selectedTipos: selected,
      estudiantes: effectiveCapacidad,
    })
    if (isComplete) triggerDebouncedSearch()
  }

  const handleCapacidadChange = (value: string) => {
    const numValue = value ? Number(value) : null
    adapter.setEntryFilters(entryId, {
      selectedFacultades: effectiveFacultad,
      selectedBloques: effectiveBloques,
      selectedTipos: effectiveTipos,
      estudiantes: numValue,
    })
    if (isComplete) triggerDebouncedSearch()
  }

  // ── Read results from cache ──────────────────
  const cacheKey = computeCacheKey({
    entryId,
    dia: entry?.dia ?? null,
    horaInicio: entry?.horaInicio ?? "",
    horaFin: entry?.horaFin ?? "",
    facultadIds: (entryFilters?.selectedFacultades ?? selectedFacultades).map((f) => f.id),
    bloqueIds: (entryFilters?.selectedBloques ?? selectedBloques).map((b) => b.id),
    tipoIds: (entryFilters?.selectedTipos ?? selectedTipos).map((t) => t.id),
    capacidadMin: entryFilters?.estudiantes ?? estudiantes,
  })

  const ambientes = cacheKey ? ambienteCache[cacheKey] : undefined
  const sortedAmbientes = ambientes
    ? [...ambientes].sort((a, b) => {
        if (a.tiene_solapamiento_propio && !b.tiene_solapamiento_propio) return -1
        if (!a.tiene_solapamiento_propio && b.tiene_solapamiento_propio) return 1
        return 0
      })
    : []

  const hasSolapamientoPropio = sortedAmbientes.some((a) => a.tiene_solapamiento_propio)

  // ── Selection handler ────────────────────────
  const handleSelect = (ambiente: InfraAmbiente) => {
    adapter.setEntryAmbiente(entryId, ambiente)
    onOpenChange(false)
  }

  // ── Render ───────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-auto min-h-80 p-4" showCloseButton={false}>
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-semibold">Seleccionar ambiente</DialogTitle>
        </DialogHeader>

        {/* ═══ Filters ═══ */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          {/* Facultad */}
          <div>
            <Label className="text-[10px] font-medium leading-4">Facultad</Label>
            <Select
              value={effectiveFacultad[0]?.id?.toString() ?? "none"}
              onValueChange={handleFacultadChange}
            >
              <SelectTrigger size="sm" className="mt-0.5 text-xs">
                <SelectValue placeholder="Facultad" />
              </SelectTrigger>
              <SearchableSelectContent onFilterChange={setFacultadSearch}>
                <SelectItem value="none">Todas</SelectItem>
                {filteredFacultades.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SearchableSelectContent>
            </Select>
          </div>

          {/* Bloque */}
          <div>
            <Label className="text-[10px] font-medium leading-4">Bloque</Label>
            <MultiSelect
              options={availableBloques.map((b) => ({
                value: b.id,
                label: b.nombre || b.codigo || `Bloque ${b.id}`,
              }))}
              value={effectiveBloques.map((b) => b.id)}
              onValueChange={handleBloqueChange}
              placeholder={effectiveFacultad.length === 0 ? "Sin facultad" : "Todos"}
              searchable
              selectAll
              maxVisibleItems={3}
              className="mt-0.5"
              disabled={effectiveFacultad.length === 0}
            />
          </div>

          {/* Tipo ambiente */}
          <div>
            <Label className="text-[10px] font-medium leading-4">Tipo ambiente</Label>
            <MultiSelect
              options={tiposAmbiente.map((t) => ({
                value: t.id,
                label: t.nombre,
              }))}
              value={effectiveTipos.map((t) => t.id)}
              onValueChange={handleTipoChange}
              placeholder="Todos"
              searchable
              selectAll
              maxVisibleItems={3}
              className="mt-0.5"
            />
          </div>

          {/* Capacidad */}
          <div>
            <Label className="text-[10px] font-medium leading-4">Capacidad</Label>
            <Input
              type="number"
              className="mt-0.5 h-8 text-xs"
              min={0}
              placeholder="Mín."
              value={effectiveCapacidad ?? ""}
              onChange={(e) => handleCapacidadChange(e.target.value)}
            />
          </div>
        </div>

        {/* ═══ Results ═══ */}
        <div className="min-h-45">
          {!isComplete ? (
            <div className="flex min-h-45 items-center justify-center rounded-xl bg-muted/30 px-3 py-6 text-xs text-muted-foreground">
              {!hasDateSource
                ? "Configure fechas para el horario primero"
                : entry?.dia === null
                  ? "Seleccione un día primero"
                  : !entry?.horaInicio || !entry?.horaFin
                    ? "Complete hora de inicio y fin"
                    : "Complete los datos del horario"}
            </div>
          ) : isLoading ? (
            <div className="flex min-h-45 items-center justify-center rounded-xl bg-muted/30 px-3 py-6 text-xs text-muted-foreground">
              Cargando...
            </div>
          ) : !ambientes ? (
            <div className="flex min-h-45 items-center justify-center rounded-xl bg-muted/30 px-3 py-6 text-xs text-muted-foreground">
              Buscando ambientes...
            </div>
          ) : sortedAmbientes.length === 0 ? (
            <div className="flex min-h-45 items-center justify-center rounded-xl bg-muted/30 px-3 py-6 text-xs text-muted-foreground">
              No se encontraron ambientes disponibles
            </div>
          ) : (
            <>
              <div className="max-h-45 min-h-45 space-y-1 overflow-y-auto">
                {sortedAmbientes.map((amb) => (
                  <button
                    key={amb.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
                      amb.tiene_solapamiento_propio
                        ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
                        : ""
                    }`}
                    onClick={() => handleSelect(amb)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {amb.tiene_solapamiento_propio && (
                          <AlertTriangle className="size-3 shrink-0 text-amber-500" />
                        )}
                        <span className="truncate font-medium text-foreground">{amb.nombre}</span>
                        {amb.tiene_solapamiento_propio && (
                          <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400">
                            Mismo docente
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        {amb.edificio_nombre && <span>{amb.edificio_nombre} · </span>}
                        {amb.tipo && <span>{amb.tipo} · </span>}
                        <span>Cap. {amb.capacidad}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Legend */}
              {hasSolapamientoPropio && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50/50 px-2.5 py-1.5 text-[10px] text-amber-700 dark:bg-amber-950/10 dark:text-amber-400">
                  <AlertTriangle className="size-3 shrink-0" />
                  <span>
                    Ambiente con solapamiento: el docente ya utiliza este ambiente en este dia y
                    hora
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
