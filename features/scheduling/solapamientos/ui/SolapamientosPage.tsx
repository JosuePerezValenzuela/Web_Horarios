"use client"

import { useEffect, useState, useMemo } from "react"
import { useSolapamientosStore } from "../application/useSolapamientosStore"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useUIStore } from "@/shared/stores/uiStore"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { WeeklyScheduleGrid } from "../../docentes/ui/WeeklyScheduleGrid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
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
    timeRange,
    rows,
    setFilter,
    fetchSolapamientos,
    setCurrentDocenteIndex,
    reset,
  } = useSolapamientosStore()

  // Local state for docente search input (filters by name or code locally)
  const [searchTerm, setSearchTerm] = useState("")
  const [facultadSearch, setFacultadSearch] = useState("")

  // Fetch initial data
  useEffect(() => {
    fetchFacultades()
    fetchSolapamientos()
    return () => {
      reset()
    }
  }, [fetchFacultades, fetchSolapamientos, reset])

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

  // Filter faculties list in the dropdown
  const filteredFacultades = facultades.filter((f) =>
    f.nombre.toLowerCase().includes(facultadSearch.toLowerCase())
  )

  // Filter docentes list locally based on name or code
  const filteredDocentes = useMemo(() => {
    if (!searchTerm.trim()) return docentes
    const search = searchTerm.toLowerCase()
    return docentes.filter(
      (d) => d.nombres.toLowerCase().includes(search) || d.codigo.includes(search)
    )
  }, [docentes, searchTerm])

  // Dynamically compute the active index within the filtered list
  const activeDocenteFromStore = docentes[currentDocenteIndex]
  const localIndex = useMemo(() => {
    if (!activeDocenteFromStore) return 0
    const idx = filteredDocentes.findIndex(
      (d) => d.persona_id === activeDocenteFromStore.persona_id
    )
    return idx !== -1 ? idx : 0
  }, [filteredDocentes, activeDocenteFromStore])

  const handleSelectDocente = (fIndex: number) => {
    const targetDoc = filteredDocentes[fIndex]
    if (targetDoc) {
      const mainIndex = docentes.findIndex((d) => d.persona_id === targetDoc.persona_id)
      if (mainIndex !== -1) {
        setCurrentDocenteIndex(mainIndex)
      }
    }
  }

  const activeDocente = filteredDocentes[localIndex]
  const hasDocentes = filteredDocentes.length > 0

  // Standard UMSS colors for conflict types
  const getConflictBadgeClass = (tipo: string) => {
    switch (tipo) {
      case "clase-clase":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30"
      case "clase-admin":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30"
      default:
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30"
    }
  }

  // Permission error view (403 Forbidden)
  const isForbiddenError = error?.toLowerCase().includes("forbidden") || error?.includes("403")

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Detectar Solapamientos" }]}
        className="h-[calc(100dvh-4rem)] overflow-hidden px-3 pb-3 md:px-4 md:pb-4 lg:px-5 xl:px-6"
      >
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:gap-5">
          {/* Header & Controls Panel */}
          <header className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
              {/* Left Side: Filter inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* Search Teacher Input */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="docente-search-input"
                    className="text-xs font-semibold text-foreground"
                  >
                    Buscar Docente
                  </Label>
                  <div className="relative">
                    <Input
                      id="docente-search-input"
                      type="text"
                      placeholder="Nombre o Código de Docente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pr-8 text-xs rounded-xl"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <Search className="size-4" />
                    </div>
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
            </div>
          </header>

          {/* Error and Forbidden Screen Handling */}
          {isForbiddenError ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
              <ShieldAlert className="size-16 text-destructive mb-4" />
              <h3 className="text-lg font-bold text-foreground">Acceso Denegado</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                No cuenta con el permiso{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">VER_SOLAPAMIENTOS</code>{" "}
                necesario para visualizar los solapamientos de horarios. Por favor, contacte con su
                administrador.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6">
              <p className="font-medium text-destructive">
                No se pudieron cargar los solapamientos de horarios.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4 rounded-xl" onClick={fetchSolapamientos}>
                <RefreshCw className="mr-2 size-4" />
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-stretch">
              {/* Left Column: Teacher Navigation & Conflict Details */}
              <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm lg:h-full lg:max-h-full">
                {/* Docente Navigation Control */}
                <div className="border-b border-border pb-2 mb-2">
                  <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Users className="size-4 text-primary" />
                    Docentes Solapados
                  </h2>

                  {hasDocentes ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-1 bg-muted/50 p-1 rounded-lg border border-border/40">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSelectDocente(localIndex - 1)}
                          disabled={localIndex === 0}
                          className="rounded-md h-7 w-7"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="text-xs font-semibold">
                          {localIndex + 1} de {filteredDocentes.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSelectDocente(localIndex + 1)}
                          disabled={localIndex === filteredDocentes.length - 1}
                          className="rounded-md h-7 w-7"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>

                      {/* Direct Jump Dropdown */}
                      <Select
                        value={String(localIndex)}
                        onValueChange={(val) => handleSelectDocente(Number(val))}
                      >
                        <SelectTrigger className="h-8 text-[11px] rounded-lg">
                          <SelectValue placeholder="Ir a docente..." />
                        </SelectTrigger>
                        <SearchableSelectContent maxVisibleItems={5}>
                          {filteredDocentes.map((d, i) => (
                            <SelectItem key={d.persona_id} value={String(i)}>
                              {d.nombres}
                            </SelectItem>
                          ))}
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
                  <div className="mb-2 p-2 rounded-xl bg-muted/30 border border-border/40 space-y-0.5">
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
                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="size-3.5 text-amber-500" />
                    Conflictos Detectados ({conflicts.length})
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div
                          key={`conflict-skeleton-${i}`}
                          className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
                        />
                      ))
                    ) : conflicts.length > 0 ? (
                      conflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all hover:shadow-xs ${getConflictBadgeClass(
                            conflict.tipo
                          )}`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="uppercase tracking-wider">
                              {conflict.horarioA.diaLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Solape: {conflict.overlapDuration} min
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="border-l-2 border-primary/40 pl-2">
                              <p className="font-semibold text-foreground truncate">
                                {conflict.horarioA.label}
                              </p>
                              {conflict.horarioA.carreras &&
                                conflict.horarioA.carreras.length > 0 && (
                                  <div className="text-[9.5px] font-medium text-primary/80 dark:text-blue-400/80 mt-0.5 space-y-0.5">
                                    {conflict.horarioA.carreras.map((car, idx) => (
                                      <p key={idx} className="truncate" title={car}>
                                        {car}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {conflict.horarioA.hora} ·{" "}
                                <span className="text-[10px]">{conflict.horarioA.rangoFechas}</span>
                              </p>
                            </div>

                            <div className="border-l-2 border-destructive/40 pl-2">
                              <p className="font-semibold text-foreground truncate">
                                {conflict.horarioB.label}
                              </p>
                              {conflict.horarioB.carreras &&
                                conflict.horarioB.carreras.length > 0 && (
                                  <div className="text-[9.5px] font-medium text-destructive/80 dark:text-red-400/80 mt-0.5 space-y-0.5">
                                    {conflict.horarioB.carreras.map((car, idx) => (
                                      <p key={idx} className="truncate" title={car}>
                                        {car}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {conflict.horarioB.hora} ·{" "}
                                <span className="text-[10px]">{conflict.horarioB.rangoFechas}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : activeDocente ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10">
                        <Info className="size-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground font-semibold">
                          Sin solapamientos locales significativos
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Los solapamientos no superan la tolerancia de {filters.tolerancia_minutos}{" "}
                          min o no hay horarios coincidentes.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aplique filtros para buscar docentes
                      </p>
                    )}
                  </div>
                </div>
              </aside>

              {/* Right Column: Weekly Schedule Grid */}
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full lg:max-h-full">
                {loading ? (
                  <div className="h-full min-h-[300px] animate-pulse rounded-3xl border border-border bg-muted/30" />
                ) : hasDocentes ? (
                  <div className="min-h-0 flex-1">
                    <WeeklyScheduleGrid
                      schedules={schedules}
                      rows={rows}
                      timeRange={timeRange}
                      adminSchedules={adminSchedules}
                      isCompactMode={false}
                    />
                  </div>
                ) : (
                  <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-border bg-muted/10 p-8 text-center shadow-xs">
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
