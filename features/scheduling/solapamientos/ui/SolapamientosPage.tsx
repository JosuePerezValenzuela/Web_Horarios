"use client"

import { useEffect, useState, useMemo } from "react"
import {
  useSolapamientosStore,
  DAY_LABELS,
  formatTime,
  formatDate,
} from "../application/useSolapamientosStore"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useUIStore } from "@/shared/stores/uiStore"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { WeeklyScheduleGrid } from "../../docentes/ui/WeeklyScheduleGrid"
import { Button, Input, Badge, ScrollArea } from "@umss/estilos-base/components"
import { Label } from "@/components/ui/label"
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  AlertTriangle,
  Calendar,
  Users,
  ShieldAlert,
  Info,
  Clock,
} from "lucide-react"

export function SolapamientosPage() {
  const { setSidebarCollapsed } = useUIStore()

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarCollapsed(true)
  }, [setSidebarCollapsed])

  // Faculades store
  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()

  // Solapamientos store
  const {
    docentes,
    loading,
    error,
    filters,
    currentDocenteIndex,
    schedules,
    adminSchedules,
    conflicts,
    horariosSinSolapamiento,
    timeRange,
    rows,
    nextDocente,
    prevDocente,
    setFilter,
    fetchSolapamientos,
    setCurrentDocenteIndex,
    reset,
  } = useSolapamientosStore()

  // Local state for docente code input (triggers API query param search)
  const [localCodigo, setLocalCodigo] = useState(filters.persona_codigo)
  const [facultadSearch, setFacultadSearch] = useState("")
  // Local state to filter the left jump list dropdown by teacher name
  const [docenteDropdownSearch, setDocenteDropdownSearch] = useState("")

  // Fetch initial data
  useEffect(() => {
    fetchFacultades()
    fetchSolapamientos()
    return () => {
      reset()
    }
  }, [fetchFacultades, fetchSolapamientos, reset])

  // Debounced search for docente code
  useEffect(() => {
    const handler = setTimeout(() => {
      if (filters.persona_codigo !== localCodigo) {
        setFilter("persona_codigo", localCodigo)
        fetchSolapamientos()
      }
    }, 600)

    return () => {
      clearTimeout(handler)
    }
  }, [localCodigo, setFilter, fetchSolapamientos, filters.persona_codigo])

  // Handle filter changes
  const handleFacultadChange = (value: string) => {
    setFilter("facultad_codigo", value === "none" ? "" : value)
    fetchSolapamientos()
  }

  const handleToleranciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setFilter("tolerancia_minutos", isNaN(val) ? 0 : val)
    fetchSolapamientos()
  }

  const handleManualSearch = () => {
    setFilter("persona_codigo", localCodigo)
    fetchSolapamientos()
  }

  // Filter faculties list in the dropdown
  const filteredFacultades = facultades.filter((f) =>
    f.nombre.toLowerCase().includes(facultadSearch.toLowerCase())
  )

  // Filter docentes dropdown list locally based on name
  const filteredDocentesForDropdown = useMemo(() => {
    if (!docenteDropdownSearch.trim()) return docentes
    const search = docenteDropdownSearch.toLowerCase()
    return docentes.filter((d) => d.nombres.toLowerCase().includes(search))
  }, [docentes, docenteDropdownSearch])

  const activeDocente = docentes[currentDocenteIndex]
  const hasDocentes = docentes.length > 0

  // Permission error view (403 Forbidden)
  const isForbiddenError = error?.toLowerCase().includes("forbidden") || error?.includes("403")

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Detectar Solapamientos" }]}
        disablePageScroll
        className="p-3 sm:p-4 md:p-6 lg:p-8"
      >
        <div className="flex flex-col gap-4 lg:gap-5 w-full flex-1 h-full min-h-0 overflow-hidden">
          {/* Header & Controls Panel */}
          <header className="rounded-3xl border border-border bg-card p-4 shadow-sm shrink-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
              {/* Left Side: Filter inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Docente Code Input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="docente-codigo-input"
                    className="text-xs font-semibold text-foreground"
                  >
                    Código de Docente
                  </Label>
                  <div className="relative">
                    <Input
                      id="docente-codigo-input"
                      type="text"
                      placeholder="Ej: 199700035"
                      value={localCodigo}
                      onChange={(e) => setLocalCodigo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                      className="h-9 pr-8 text-xs rounded-xl"
                    />
                    <button
                      onClick={handleManualSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <Search className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Facultad Searchable Select */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="facultad-select"
                    className="text-xs font-semibold text-foreground"
                  >
                    Facultad
                  </Label>
                  <Select
                    value={filters.facultad_codigo || "none"}
                    onValueChange={handleFacultadChange}
                    disabled={loadingFacultades}
                  >
                    <SelectTrigger id="facultad-select" className="h-9 text-xs rounded-xl">
                      <SelectValue
                        placeholder={loadingFacultades ? "Cargando..." : "Seleccione Facultad"}
                      />
                    </SelectTrigger>
                    <SearchableSelectContent
                      onFilterChange={setFacultadSearch}
                      onKeyDownCapture={(e) => {
                        if (e.key === "Escape") e.stopPropagation()
                      }}
                    >
                      <SelectItem value="none">Todas las Facultades</SelectItem>
                      {filteredFacultades.map((f) => (
                        <SelectItem key={f.id} value={f.codigo}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SearchableSelectContent>
                  </Select>
                </div>

                {/* Tolerancia Minutos Input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="tolerancia-input"
                    className="text-xs font-semibold text-foreground"
                  >
                    Tolerancia (minutos)
                  </Label>
                  <Input
                    id="tolerancia-input"
                    type="number"
                    min={0}
                    value={filters.tolerancia_minutos}
                    onChange={handleToleranciaChange}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Right Side: Refresh / Reload Action */}
              <div className="shrink-0 flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSolapamientos()}
                  disabled={loading}
                  className="rounded-xl h-9 px-3.5 text-xs font-semibold"
                  title="Actualizar solapamientos"
                >
                  <RefreshCw className={cn("size-3.5 mr-1.5", loading && "animate-spin")} />
                  Actualizar
                </Button>
              </div>
            </div>
          </header>

          {/* Error and Forbidden Screen Handling */}
          {isForbiddenError ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center flex-1 min-h-0 overflow-hidden">
              <ShieldAlert className="size-16 text-destructive mb-4" />
              <h3 className="text-lg font-bold text-foreground">Acceso Denegado</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                No cuenta con el permiso{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VER_SOLAPAMIENTOS</code>{" "}
                necesario para visualizar los solapamientos de horarios. Por favor, contacte con su
                administrador.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 lg:gap-5 items-start lg:items-stretch flex-1 min-h-0 overflow-hidden">
              {/* Left Column: Teacher Navigation & Conflict Details */}
              <aside className="flex flex-col rounded-3xl border border-border bg-card p-4 shadow-sm w-full lg:h-full lg:max-h-full lg:overflow-hidden shrink-0">
                {/* Docente Navigation Control */}
                <div className="border-b border-border pb-2 mb-2 shrink-0">
                  <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Users className="size-4 text-primary" />
                    Docentes Solapados
                  </h2>

                  {hasDocentes ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-1 bg-muted/50 p-1 rounded-lg border border-border/40">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={prevDocente}
                          disabled={currentDocenteIndex === 0}
                          className="rounded-md h-7 w-7"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="text-xs font-semibold">
                          {currentDocenteIndex + 1} de {docentes.length}
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={nextDocente}
                          disabled={currentDocenteIndex === docentes.length - 1}
                          className="rounded-md h-7 w-7"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>

                      {/* Direct Jump Dropdown */}
                      <Select
                        value={String(currentDocenteIndex)}
                        onValueChange={(val) => {
                          setCurrentDocenteIndex(Number(val))
                          // Reset dropdown filter state when selection is made
                          setDocenteDropdownSearch("")
                        }}
                      >
                        <SelectTrigger className="h-8 text-[11px] rounded-lg">
                          <SelectValue placeholder="Ir a docente..." />
                        </SelectTrigger>
                        <SearchableSelectContent
                          maxVisibleItems={5}
                          onFilterChange={setDocenteDropdownSearch}
                          searchPlaceholder="Buscar por nombre..."
                        >
                          {filteredDocentesForDropdown.map((d) => {
                            const originalIndex = docentes.findIndex(
                              (orig) => orig.persona_id === d.persona_id
                            )
                            return (
                              <SelectItem key={d.persona_id} value={String(originalIndex)}>
                                {d.nombres}
                              </SelectItem>
                            )
                          })}
                        </SearchableSelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground block py-1.5 text-center bg-muted/30 rounded-xl">
                      Sin docentes detectados
                    </span>
                  )}
                </div>

                {/* Active Docente Quick Info */}
                {activeDocente && (
                  <div className="mb-2 p-2 rounded-xl bg-muted/30 border border-border/40 space-y-0.5 shrink-0">
                    <h3 className="text-xs font-bold text-foreground line-clamp-1">
                      {activeDocente.nombres}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Código:{" "}
                      <span className="font-mono text-foreground/80">{activeDocente.codigo}</span>
                    </p>
                  </div>
                )}

                {/* Conflict List */}
                <div className="flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    Conflictos Detectados ({conflicts.length})
                  </h3>

                  <ScrollArea className="flex-1 lg:min-h-0 pr-1">
                    <div className="space-y-2 pb-2">
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={`conflict-skeleton-${i}`}
                            className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
                          />
                        ))
                      ) : conflicts.length > 0 ? (
                        conflicts.map((conflict) => {
                          const isWarning = conflict.overlapDuration <= 15
                          const cardColorClasses = isWarning
                            ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300"
                            : "border-red-200 bg-red-50/40 dark:border-red-900/30 dark:bg-red-950/10 text-red-800 dark:text-red-300"

                          return (
                            <div
                              key={conflict.id}
                              className={`p-3 rounded-2xl border flex flex-col gap-2.5 transition-all hover:shadow-sm ${cardColorClasses}`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold uppercase tracking-wider opacity-90">
                                  {conflict.horarioA.diaLabel}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {conflict.tipo === "clase-clase" ? (
                                    <Badge
                                      variant="error"
                                      className="text-[9px] font-bold px-1.5 py-0"
                                    >
                                      Clase-Clase
                                    </Badge>
                                  ) : conflict.tipo === "admin-clase" ? (
                                    <Badge
                                      variant="warning"
                                      className="text-[9px] font-bold px-1.5 py-0"
                                    >
                                      Admin-Clase
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="warning"
                                      className="text-[9px] font-bold px-1.5 py-0"
                                    >
                                      Admin-Admin
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="neutral"
                                    className="text-[9px] font-mono font-bold px-1.5 py-0 flex items-center gap-0.5 bg-background/50 border-none"
                                  >
                                    <Clock className="size-2.5" />
                                    {conflict.overlapDuration} min
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="border-l-2 border-primary/40 pl-2 space-y-0.5 min-w-0">
                                  <p className="font-semibold text-foreground break-words leading-snug">
                                    {conflict.horarioA.label}
                                  </p>
                                  {conflict.horarioA.carreras &&
                                    conflict.horarioA.carreras.length > 0 && (
                                      <div className="text-[9.5px] font-medium text-primary/80 dark:text-blue-400/80 mt-0.5 space-y-0.5">
                                        {conflict.horarioA.carreras.map((car, idx) => (
                                          <p key={idx} className="break-words" title={car}>
                                            {car}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {conflict.horarioA.hora} ·{" "}
                                    <span className="text-[10px]">
                                      {conflict.horarioA.rangoFechas}
                                    </span>
                                  </p>
                                </div>

                                <div className="border-l-2 border-destructive/40 pl-2 space-y-0.5 min-w-0">
                                  <p className="font-semibold text-foreground break-words leading-snug">
                                    {conflict.horarioB.label}
                                  </p>
                                  {conflict.horarioB.carreras &&
                                    conflict.horarioB.carreras.length > 0 && (
                                      <div className="text-[9.5px] font-medium text-destructive/80 dark:text-red-400/80 mt-0.5 space-y-0.5">
                                        {conflict.horarioB.carreras.map((car, idx) => (
                                          <p key={idx} className="break-words" title={car}>
                                            {car}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {conflict.horarioB.hora} ·{" "}
                                    <span className="text-[10px]">
                                      {conflict.horarioB.rangoFechas}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : activeDocente ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10">
                          <Info className="size-8 text-muted-foreground/40 mb-2" />
                          <p className="text-xs text-muted-foreground font-semibold">
                            Sin solapamientos registrados
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            El docente no tiene solapamientos activos bajo los filtros actuales.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10 my-auto">
                          <Info className="size-8 text-muted-foreground/40 mb-2" />
                          <p className="text-xs text-muted-foreground font-semibold">
                            Sin docentes seleccionados
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Aplique filtros para buscar docentes con solapamientos.
                          </p>
                        </div>
                      )}

                      {/* Horarios sin solapamiento */}
                      {activeDocente && horariosSinSolapamiento.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Calendar className="size-3 text-emerald-600 dark:text-emerald-400" />
                            Horarios Sin Solapamiento ({horariosSinSolapamiento.length})
                          </h4>
                          <div className="space-y-1.5">
                            {horariosSinSolapamiento.map((h) => {
                              const diaLabel = DAY_LABELS[h.dia || 1] || `Día ${h.dia}`
                              const title =
                                h.tipo === "clase"
                                  ? `${h.asignatura_nombre} (G: ${h.grupo})`
                                  : h.horario_descripcion || "Horario Administrativo"
                              const rangoFechas = h.fecha_fin
                                ? `${formatDate(h.fecha_inicio)} a ${formatDate(h.fecha_fin)}`
                                : `Desde ${formatDate(h.fecha_inicio)}`

                              return (
                                <div
                                  key={`${h.tipo}-${h.id}`}
                                  className="p-2.5 rounded-xl border border-border/70 bg-card/60 text-xs flex flex-col gap-1 hover:border-border transition-colors"
                                >
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold uppercase tracking-wider text-muted-foreground">
                                      {diaLabel}
                                    </span>
                                    <Badge
                                      variant="neutral"
                                      className="text-[9px] font-semibold px-1.5 py-0 uppercase bg-muted text-muted-foreground"
                                    >
                                      {h.tipo === "clase" ? "Clase" : "Admin"}
                                    </Badge>
                                  </div>
                                  <p className="font-semibold text-foreground line-clamp-1">
                                    {title}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {formatTime(h.hora_inicio)} - {formatTime(h.hora_fin)} ·{" "}
                                    <span className="text-[10px] opacity-80">{rangoFechas}</span>
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </aside>

              {/* Right Column: Weekly Schedule Grid */}
              <main className="flex min-w-0 flex-1 flex-col w-full h-full max-h-full min-h-[420px] lg:min-h-0 overflow-hidden">
                {loading ? (
                  <div className="h-96 animate-pulse rounded-3xl border border-border bg-muted/30 h-full w-full min-h-0" />
                ) : hasDocentes ? (
                  <div className="flex flex-1 min-h-0 w-full max-w-full min-w-0 overflow-hidden flex-col h-full">
                    <WeeklyScheduleGrid
                      schedules={schedules}
                      rows={rows}
                      timeRange={timeRange}
                      adminSchedules={adminSchedules}
                      isCompactMode={false}
                      className="h-full"
                    />
                  </div>
                ) : (
                  <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm w-full h-full min-h-0">
                    <Calendar className="size-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-base font-bold text-foreground">
                      Búsqueda sin solapamientos
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
                      No se encontraron docentes con horarios solapados activos bajo los filtros
                      actuales.
                    </p>
                  </section>
                )}
              </main>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
