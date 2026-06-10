"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Filter, RefreshCw, Calendar, AlertCircle, AlertTriangle } from "lucide-react"

// Stores
import { useHorariosListStore } from "@/features/scheduling/docentes/application/useHorariosListStore"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useCarrerasStore } from "@/shared/stores/catalogos/useCarrerasStore"
import { useAsignaturasStore } from "@/shared/stores/catalogos/useAsignaturasStore"
import { useUIStore } from "@/shared/stores/uiStore"

// Normalizadores
import {
  buildRows,
  resolveDefaultPeriod,
} from "@/features/scheduling/docentes/application/normalizers"

// UI Componentes
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { MultiSelect } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { TimePicker } from "@/components/ui/time-picker"
import type { DateRange } from "react-day-picker"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import { Checkbox } from "@/components/ui/checkbox"
import { WeeklyScheduleGrid } from "@/features/scheduling/docentes/ui/WeeklyScheduleGrid"

const DIAS_MAP: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

export default function HorariosListPage() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const [showFilters, setShowFilters] = useState(true)

  // Colapsar el sidebar por defecto al entrar
  useEffect(() => {
    setSidebarCollapsed(true)
  }, [setSidebarCollapsed])

  // Filtros de búsqueda locales para comboboxes
  const [facultadSearch, setFacultadSearch] = useState("")

  // Stores vinculados
  const {
    horarios,
    normalizedSchedules,
    filters,
    pagination,
    loading,
    error: listError,
    setFilter,
    fetchHorarios,
    resetFilters,
  } = useHorariosListStore()

  const {
    facultades,
    loading: loadingFacultades,
    error: errorFacultades,
    fetchFacultades,
  } = useFacultadesStore()

  const {
    carreras,
    loading: loadingCarreras,
    error: errorCarreras,
    fetchCarreras,
    clear: clearCarreras,
  } = useCarrerasStore()

  const {
    asignaturas,
    loading: loadingAsignaturas,
    error: errorAsignaturas,
    fetchAsignaturas,
    clear: clearAsignaturas,
  } = useAsignaturasStore()

  // Toasts de error automáticos para las peticiones de catálogos y listado
  useEffect(() => {
    if (errorFacultades) toast.error(errorFacultades)
  }, [errorFacultades])

  useEffect(() => {
    if (errorCarreras) toast.error(errorCarreras)
  }, [errorCarreras])

  useEffect(() => {
    if (errorAsignaturas) toast.error(errorAsignaturas)
  }, [errorAsignaturas])

  useEffect(() => {
    if (listError) toast.error(listError)
  }, [listError])

  // Determinar si los filtros obligatorios están establecidos
  const isMandatoryFiltersSet = useMemo(() => {
    return !!(
      filters.facultad_codigo &&
      filters.plan_estudio_codigo &&
      filters.plan_estudio_codigo.length > 0 &&
      filters.gestion &&
      filters.periodo !== undefined
    )
  }, [filters.facultad_codigo, filters.plan_estudio_codigo, filters.gestion, filters.periodo])

  // Filtrar asignaturas basadas en las carreras seleccionadas localmente
  const filteredAsignaturasOptions = useMemo(() => {
    if (!filters.plan_estudio_codigo || filters.plan_estudio_codigo.length === 0) {
      return []
    }

    const selectedCarrerasIds = carreras
      .filter((c) => filters.plan_estudio_codigo?.includes(c.codigo))
      .map((c) => c.id.toString())

    return asignaturas
      .filter((a) => a.carrera_id && selectedCarrerasIds.includes(a.carrera_id.toString()))
      .map((a) => ({ value: a.codigo, label: a.nombre }))
  }, [asignaturas, carreras, filters.plan_estudio_codigo])

  // Obtener grupos únicos de las asignaturas seleccionadas basándonos en los horarios cargados
  const availableGroups = useMemo(() => {
    if (!filters.asignatura_codigo || filters.asignatura_codigo.length === 0) return []

    // Filtrar los grupos asegurándonos que pertenecen a las asignaturas seleccionadas
    const groups = horarios
      .filter((h) => h.asignatura && filters.asignatura_codigo?.includes(h.asignatura.codigo))
      .map((h) => h.grupo)
      .filter((g): g is string => !!g)

    return Array.from(new Set(groups)).sort()
  }, [horarios, filters.asignatura_codigo])

  // Conversión local para DatePickerRange
  const dateRangeValue = useMemo<DateRange | undefined>(() => {
    if (!filters.fecha_desde) return undefined
    return {
      from: new Date(filters.fecha_desde + "T00:00:00"),
      to: filters.fecha_hasta ? new Date(filters.fecha_hasta + "T00:00:00") : undefined,
    }
  }, [filters.fecha_desde, filters.fecha_hasta])

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const fromStr = range?.from ? range.from.toISOString().split("T")[0] : undefined
    const toStr = range?.to ? range.to.toISOString().split("T")[0] : undefined

    setFilter("fecha_desde", fromStr)
    setFilter("fecha_hasta", toStr)
    if (isMandatoryFiltersSet) {
      fetchHorarios()
    }
  }

  // Carga inicial de datos base: Únicamente Facultades al montar
  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  // Asegurar que la facultad actualmente seleccionada no sea filtrada por la búsqueda del dropdown
  const filteredFacultades = useMemo(() => {
    const term = facultadSearch.toLowerCase().trim()
    const selectedCodigo = filters.facultad_codigo
    return facultades
      .filter((f) => {
        if (selectedCodigo && f.codigo === selectedCodigo) return true
        return f.nombre.toLowerCase().includes(term) || f.codigo.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [facultades, facultadSearch, filters.facultad_codigo])

  // Lógica de cálculo del rango de tiempo dinámico para la grilla semanal
  const { timeRange, rows } = useMemo(() => {
    if (normalizedSchedules.length === 0) {
      const defaultRange = { startMin: 7 * 60, endMin: 22 * 60 }
      return {
        timeRange: defaultRange,
        rows: buildRows(defaultRange, 90),
      }
    }
    const min = Math.min(...normalizedSchedules.map((s) => s.startMin))
    const max = Math.max(...normalizedSchedules.map((s) => s.endMin))
    const startMin = Math.max(7 * 60, Math.floor(min / 60) * 60)
    const endMin = Math.min(22 * 60, Math.ceil(max / 60) * 60)

    const range = { startMin, endMin }
    const period = resolveDefaultPeriod(normalizedSchedules)
    return {
      timeRange: range,
      rows: buildRows(range, period),
    }
  }, [normalizedSchedules])

  // Helper local para forzar actualización solo si los obligatorios están completos
  const triggerFetchIfValid = () => {
    const updatedFilters = useHorariosListStore.getState().filters
    const hasMandatory = !!(
      updatedFilters.facultad_codigo &&
      updatedFilters.plan_estudio_codigo &&
      updatedFilters.plan_estudio_codigo.length > 0 &&
      updatedFilters.gestion &&
      updatedFilters.periodo !== undefined
    )
    if (hasMandatory) {
      fetchHorarios()
    }
  }

  // Handlers de selección de filtros
  const handleFacultadChange = (value: string) => {
    if (value === "none") {
      setFilter("facultad_codigo", undefined)
      setFilter("plan_estudio_codigo", [])
      setFilter("asignatura_codigo", [])
      setFilter("grupo", [])
      clearCarreras()
      clearAsignaturas()
    } else {
      setFilter("facultad_codigo", value)
      // Resetear filtros dependientes aguas abajo al cambiar facultad
      setFilter("plan_estudio_codigo", [])
      setFilter("asignatura_codigo", [])
      setFilter("grupo", [])

      const fac = facultades.find((f) => f.codigo === value)
      if (fac) {
        fetchCarreras(fac.id.toString())
        fetchAsignaturas(undefined, fac.id.toString())
      }
    }
    setFacultadSearch("")
    triggerFetchIfValid()
  }

  const handleClearAllFilters = () => {
    resetFilters()
    clearCarreras()
    clearAsignaturas()
    toast.success("Filtros limpiados exitosamente")
  }

  return (
    <ProtectedRoute>
      <AppLayout
        className={cn(
          "fixed top-16 bottom-0 right-0 left-0 overflow-hidden flex flex-col p-4 pt-4 px-4 lg:p-4 lg:pt-4 lg:px-4 xl:p-4 xl:pt-4 xl:px-4 transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-2 lg:gap-5 lg:p-4">
          {/* Header Superior */}
          <header className="rounded-3xl border border-border bg-card p-3 md:p-3 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                    Horarios de Clases
                  </h1>
                  <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                    {pagination.totalRecords} registros
                  </Badge>
                  {filters.solo_conflicto && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse px-2 py-0.5 text-xs font-semibold"
                    >
                      Modo Conflicto Activo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 px-3 text-xs"
                >
                  <Filter className="mr-1.5 size-4" />
                  {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (isMandatoryFiltersSet) {
                      fetchHorarios()
                    } else {
                      toast.error("Complete los filtros obligatorios primero")
                    }
                  }}
                  className="size-9 rounded-lg"
                  disabled={loading || !isMandatoryFiltersSet}
                  title="Refrescar Listado"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </header>

          {/* Área de Filtros y Contenido Principal */}
          <div className="flex min-h-0 flex-1 gap-4 overflow-hidden items-stretch relative">
            {/* Panel de Filtros */}
            {showFilters && (
              <aside className="w-80 shrink-0 flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden h-full">
                <div className="flex items-center justify-between border-b border-border p-4 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Filter className="size-3.5" />
                    Filtros de Búsqueda
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleClearAllFilters}
                    className="text-[10px] h-6 px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    Limpiar todo
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pt-1.5 space-y-4 min-h-0">
                  {/* Sección: Filtros Obligatorios */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-primary uppercase tracking-wider border-b border-border/40 pb-1">
                      Filtros Obligatorios
                    </div>

                    {/* Facultad */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Facultad <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={filters.facultad_codigo || "none"}
                        onValueChange={handleFacultadChange}
                        disabled={loadingFacultades}
                      >
                        <SelectTrigger className="h-9 text-xs">
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
                          <SelectItem value="none">Seleccione Facultad</SelectItem>
                          {filteredFacultades.map((f) => (
                            <SelectItem key={f.id} value={f.codigo}>
                              {f.nombre}
                            </SelectItem>
                          ))}
                        </SearchableSelectContent>
                      </Select>
                    </div>

                    {/* Plan de Estudio / Carrera */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Plan de Estudio <span className="text-destructive">*</span>
                      </Label>
                      <MultiSelect
                        options={carreras.map((c) => ({
                          value: c.codigo,
                          label: c.nombre,
                        }))}
                        value={filters.plan_estudio_codigo || []}
                        onValueChange={(val) => {
                          setFilter("plan_estudio_codigo", val as string[])
                          triggerFetchIfValid()
                        }}
                        disabled={loadingCarreras || !filters.facultad_codigo}
                        searchable
                        selectAll
                        placeholder="Seleccione Planes"
                      />
                    </div>

                    {/* Gestión y Periodo */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Gestión <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          placeholder="Año"
                          value={filters.gestion || ""}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined
                            setFilter("gestion", val)
                            triggerFetchIfValid()
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Periodo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          placeholder="Periodo"
                          value={filters.periodo !== undefined ? filters.periodo : ""}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined
                            setFilter("periodo", val)
                            triggerFetchIfValid()
                          }}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección: Filtros Opcionales */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1">
                      Filtros Opcionales
                    </div>

                    {/* Asignatura */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Asignatura</Label>
                      <MultiSelect
                        options={filteredAsignaturasOptions}
                        value={filters.asignatura_codigo || []}
                        onValueChange={(val) => {
                          setFilter("asignatura_codigo", val as string[])
                          triggerFetchIfValid()
                        }}
                        disabled={loadingAsignaturas || !isMandatoryFiltersSet}
                        searchable
                        selectAll
                        placeholder="Seleccione Asignaturas"
                      />
                    </div>

                    {/* Grupo (Depende de asignatura y muestra dinámicamente sus grupos) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">Grupo</Label>
                        {(!filters.asignatura_codigo || filters.asignatura_codigo.length === 0) && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Requiere asignatura
                          </span>
                        )}
                      </div>
                      <MultiSelect
                        options={availableGroups.map((g) => ({
                          value: g,
                          label: `Grupo ${g}`,
                        }))}
                        value={filters.grupo || []}
                        onValueChange={(val) => {
                          setFilter("grupo", val as string[])
                          triggerFetchIfValid()
                        }}
                        disabled={
                          !filters.asignatura_codigo || filters.asignatura_codigo.length === 0
                        }
                        selectAll
                        placeholder="Seleccione Grupos"
                      />
                    </div>

                    {/* Aula y Día */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Aula ID</Label>
                        <Input
                          type="text"
                          placeholder="Aula"
                          value={filters.aula_id || ""}
                          onChange={(e) => {
                            setFilter("aula_id", e.target.value || undefined)
                            triggerFetchIfValid()
                          }}
                          disabled={!isMandatoryFiltersSet}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Día</Label>
                        <Select
                          value={filters.dia !== undefined ? filters.dia.toString() : "none"}
                          onValueChange={(val) => {
                            setFilter("dia", val === "none" ? undefined : Number(val))
                            triggerFetchIfValid()
                          }}
                          disabled={!isMandatoryFiltersSet}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Todos</SelectItem>
                            {[1, 2, 3, 4, 5, 6].map((d) => (
                              <SelectItem key={d} value={d.toString()}>
                                {DIAS_MAP[d]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Filtro Rango de Fechas */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Fechas</Label>
                      <DatePickerRange
                        value={dateRangeValue}
                        onChange={handleDateRangeChange}
                        disabled={!isMandatoryFiltersSet}
                        className="h-9 w-full justify-start text-left font-normal text-xs bg-background"
                        placeholder="Seleccionar rango"
                      />
                    </div>

                    {/* Filtro Rango de Horas */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Rango Horario</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <TimePicker
                          value={filters.hora_desde}
                          onChange={(val) => {
                            setFilter("hora_desde", val || undefined)
                            triggerFetchIfValid()
                          }}
                          disabled={!isMandatoryFiltersSet}
                          className="h-9 text-xs"
                        />
                        <TimePicker
                          value={filters.hora_hasta}
                          onChange={(val) => {
                            setFilter("hora_hasta", val || undefined)
                            triggerFetchIfValid()
                          }}
                          disabled={!isMandatoryFiltersSet}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Solo Conflicto Checkbox */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-border mt-1.5">
                      <Checkbox
                        id="solo_conflicto"
                        checked={filters.solo_conflicto}
                        onCheckedChange={(checked) => {
                          setFilter("solo_conflicto", !!checked)
                          triggerFetchIfValid()
                        }}
                        disabled={!isMandatoryFiltersSet}
                      />
                      <Label
                        htmlFor="solo_conflicto"
                        className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1 text-destructive"
                      >
                        <AlertTriangle className="size-3.5 shrink-0" />
                        Solo solapamientos / conflictos
                      </Label>
                    </div>
                  </div>
                </div>
              </aside>
            )}

            {/* Contenido de Visualización */}
            <main className="flex-1 flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden min-w-0">
              {/* Avisos de Error */}
              {listError && (
                <div className="m-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Atención: </span>
                    {listError}
                  </div>
                </div>
              )}

              {/* Loader */}
              {loading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="size-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground font-medium animate-pulse">
                      Cargando horarios de clases...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {!isMandatoryFiltersSet ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-muted/10">
                      <Calendar className="size-12 text-muted-foreground/45 mb-3" />
                      <h3 className="text-base font-bold text-foreground">
                        Filtros obligatorios requeridos
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
                        Por favor, establecé una Facultad, Plan de Estudio, Gestión y Periodo en el
                        panel lateral para poder visualizar los horarios correspondientes.
                      </p>
                    </div>
                  ) : horarios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-muted/10">
                      <Calendar className="size-12 text-muted-foreground/40 mb-3" />
                      <h3 className="text-base font-bold text-foreground">
                        Sin resultados disponibles
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
                        No se encontraron horarios cargados en el sistema que coincidan con los
                        filtros aplicados.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 text-xs h-8"
                        onClick={handleClearAllFilters}
                      >
                        Limpiar todos los filtros
                      </Button>
                    </div>
                  ) : (
                    /* Vista Semanal (Grilla) - Única vista permitida */
                    <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
                      <WeeklyScheduleGrid
                        schedules={normalizedSchedules}
                        rows={rows}
                        timeRange={timeRange}
                      />
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
