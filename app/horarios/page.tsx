"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Filter, RefreshCw, Calendar, AlertCircle, AlertTriangle, MapPin } from "lucide-react"

// Stores
import { useHorariosListStore } from "@/features/scheduling/docentes/application/useHorariosListStore"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useCarrerasStore } from "@/shared/stores/catalogos/useCarrerasStore"
import { useAsignaturasStore } from "@/shared/stores/catalogos/useAsignaturasStore"
import { useInfraStore } from "@/shared/stores/catalogos/useInfraStore"
import { useUIStore } from "@/shared/stores/uiStore"

// Normalizadores
import {
  buildRows,
  resolveDefaultPeriod,
  deriveTimeRange,
} from "@/features/scheduling/docentes/application/normalizers"

// UI Componentes
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { MultiSelect } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { TimePicker } from "@/components/ui/time-picker"
import type { DateRange } from "react-day-picker"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import { Checkbox } from "@/components/ui/checkbox"
import { WeeklyScheduleGrid as GlobalWeeklyScheduleGrid } from "@/components/ui/weekly-schedule-grid"
import type { ScheduleItem } from "@/components/ui/weekly-schedule-grid/types"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

// Formateador y normalizador de errores en español
const formatErrorMessage = (error: string | null): string | null => {
  if (!error) return null
  const errorLower = error.toLowerCase()
  if (
    errorLower.includes("failed to fetch") ||
    errorLower.includes("fetch") ||
    errorLower.includes("network") ||
    errorLower.includes("api key") ||
    errorLower.includes("unexpected token") ||
    errorLower.includes("networkerror")
  ) {
    return "No se pudo conectar con el servidor. Por favor, verifique su conexión o intente más tarde."
  }

  if (errorLower.includes("unauthorized") || errorLower.includes("401")) {
    return "Sesión no autorizada o expirada. Por favor, inicie sesión nuevamente."
  }

  if (errorLower.includes("forbidden") || errorLower.includes("403")) {
    return "No tiene permisos para acceder a esta información."
  }

  if (errorLower.includes("internal server error") || errorLower.includes("500")) {
    return "Ocurrió un error en el servidor. Por favor, intente más tarde."
  }

  if (errorLower.includes("not found") || errorLower.includes("404")) {
    return "El recurso o listado solicitado no fue encontrado en el servidor."
  }

  return error
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
  const [carreraSearch, setCarreraSearch] = useState("")
  const [asignaturaSearch, setAsignaturaSearch] = useState("")

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

  const {
    campus,
    facultades: facultadesInfra,
    bloques,
    ambientes,
    loading: loadingInfra,
    error: errorInfra,
    fetchCampus,
    fetchFacultades: fetchFacultadesInfra,
    fetchBloques,
    fetchAmbientes,
    clearBloques,
    clearAmbientes,
  } = useInfraStore()

  // Local search query for infrastructure select elements
  const [campusSearch, setCampusSearch] = useState("")
  const [facultadInfraSearch, setFacultadInfraSearch] = useState("")
  const [bloqueSearch, setBloqueSearch] = useState("")
  const [ambienteSearch, setAmbienteSearch] = useState("")

  // Toasts de error automáticos para las peticiones de catálogos y listado
  useEffect(() => {
    const formatted = formatErrorMessage(errorFacultades)
    if (formatted) toast.error(formatted)
  }, [errorFacultades])

  useEffect(() => {
    const formatted = formatErrorMessage(errorCarreras)
    if (formatted) toast.error(formatted)
  }, [errorCarreras])

  useEffect(() => {
    const formatted = formatErrorMessage(errorAsignaturas)
    if (formatted) toast.error(formatted)
  }, [errorAsignaturas])

  useEffect(() => {
    const formatted = formatErrorMessage(errorInfra)
    if (formatted) toast.error(formatted)
  }, [errorInfra])

  useEffect(() => {
    const formatted = formatErrorMessage(listError)
    if (formatted) toast.error(formatted)
  }, [listError])

  // Determinar si los filtros obligatorios están establecidos
  const isMandatoryFiltersSet = useMemo(() => {
    return !!(filters.facultad_codigo && filters.gestion && filters.periodo !== undefined)
  }, [filters.facultad_codigo, filters.gestion, filters.periodo])

  // Asegurar que la asignatura actualmente seleccionada no sea filtrada por la búsqueda del dropdown
  const filteredAsignaturas = useMemo(() => {
    const term = asignaturaSearch.toLowerCase().trim()
    const selectedCodigo = filters.asignatura_codigo?.[0]
    return asignaturas
      .filter((a) => {
        if (selectedCodigo && a.codigo === selectedCodigo) return true
        return a.nombre.toLowerCase().includes(term) || a.codigo.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [asignaturas, asignaturaSearch, filters.asignatura_codigo])

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

  // Carga inicial de infraestructura al montar o mostrar filtros
  useEffect(() => {
    if (showFilters) {
      fetchCampus()
      fetchFacultadesInfra()
    }
  }, [showFilters, fetchCampus, fetchFacultadesInfra])

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

  // Asegurar que la carrera actualmente seleccionada no sea filtrada por la búsqueda del dropdown
  const filteredCarreras = useMemo(() => {
    const term = carreraSearch.toLowerCase().trim()
    const selectedCodigo = filters.plan_estudio_codigo
    return carreras
      .filter((c) => {
        if (selectedCodigo && c.codigo === selectedCodigo) return true
        return c.nombre.toLowerCase().includes(term) || c.codigo.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [carreras, carreraSearch, filters.plan_estudio_codigo])

  // Asegurar que el campus seleccionado no se filtre
  const filteredCampus = useMemo(() => {
    const term = campusSearch.toLowerCase().trim()
    const selectedId = filters.infra_campus_id
    return campus
      .filter((c) => {
        if (selectedId && c.id.toString() === selectedId) return true
        return c.nombre.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [campus, campusSearch, filters.infra_campus_id])

  // Asegurar que la facultad de infraestructura seleccionada no se filtre
  const filteredFacultadesInfra = useMemo(() => {
    const term = facultadInfraSearch.toLowerCase().trim()
    const selectedId = filters.infra_facultad_id
    return facultadesInfra
      .filter((f) => {
        if (selectedId && f.id.toString() === selectedId) return true
        return f.nombre.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [facultadesInfra, facultadInfraSearch, filters.infra_facultad_id])

  // Asegurar que el bloque seleccionado no se filtre
  const filteredBloques = useMemo(() => {
    const term = bloqueSearch.toLowerCase().trim()
    const selectedId = filters.infra_bloque_id
    return bloques
      .filter((b) => {
        if (selectedId && b.id.toString() === selectedId) return true
        return b.nombre.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [bloques, bloqueSearch, filters.infra_bloque_id])

  // Asegurar que el ambiente seleccionado no se filtre
  const filteredAmbientes = useMemo(() => {
    const term = ambienteSearch.toLowerCase().trim()
    const selectedId = filters.infra_ambiente_id
    return ambientes
      .filter((a) => {
        if (selectedId && a.id.toString() === selectedId) return true
        return a.nombre.toLowerCase().includes(term)
      })
      .slice(0, 100)
  }, [ambientes, ambienteSearch, filters.infra_ambiente_id])

  const [customPeriod, setCustomPeriod] = useState<number | "">("")

  // Calcular el período por defecto o usar el personalizado
  const activePeriod = useMemo(() => {
    if (typeof customPeriod === "number" && customPeriod > 0) {
      return customPeriod
    }
    return resolveDefaultPeriod(normalizedSchedules)
  }, [normalizedSchedules, customPeriod])

  // Lógica de cálculo del rango de tiempo dinámico para la grilla semanal
  const { timeRange, rows } = useMemo(() => {
    if (normalizedSchedules.length === 0) {
      const defaultRange = { startMin: 7 * 60, endMin: 22 * 60 }
      return {
        timeRange: defaultRange,
        rows: buildRows(defaultRange, 90),
      }
    }
    const range = deriveTimeRange(normalizedSchedules)
    return {
      timeRange: range,
      rows: buildRows(range, activePeriod),
    }
  }, [normalizedSchedules, activePeriod])

  // Map normalized schedules to ScheduleItem for GlobalWeeklyScheduleGrid
  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    return normalizedSchedules.map((schedule) => ({
      id: schedule.scheduleId,
      day: schedule.day,
      startMin: schedule.startMin,
      endMin: schedule.endMin,
      durationMin: schedule.durationMin,
      title: schedule.materia,
      subtitle: schedule.docente || "Docente no asignado",
      badge: `G: ${schedule.grupo} · ${schedule.ambienteLabel}`,
      colorIndex: schedule.colorIndex,
      meta: { schedule },
    }))
  }, [normalizedSchedules])

  // Helper local para forzar actualización solo si los obligatorios están completos
  const triggerFetchIfValid = () => {
    const updatedFilters = useHorariosListStore.getState().filters
    const hasMandatory = !!(
      updatedFilters.facultad_codigo &&
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
      setFilter("plan_estudio_codigo", undefined)
      setFilter("asignatura_codigo", [])
      setFilter("grupo", [])
      clearCarreras()
      clearAsignaturas()
    } else {
      setFilter("facultad_codigo", value)
      // Resetear filtros dependientes aguas abajo al cambiar facultad
      setFilter("plan_estudio_codigo", undefined)
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

  const handleCarreraChange = (value: string) => {
    const nextCarreraCodigo = value === "none" ? undefined : value
    setFilter("plan_estudio_codigo", nextCarreraCodigo)
    setFilter("asignatura_codigo", []) // reset asignatura
    setFilter("grupo", []) // reset group

    const fac = facultades.find((f) => f.codigo === filters.facultad_codigo)
    const carr = carreras.find((c) => c.codigo === nextCarreraCodigo)

    if (fac) {
      fetchAsignaturas(carr?.id.toString(), fac.id.toString())
    }
    triggerFetchIfValid()
  }

  const handleClearAcademicFilters = () => {
    setFilter("facultad_codigo", undefined)
    setFilter("plan_estudio_codigo", undefined)
    setFilter("asignatura_codigo", [])
    setFilter("grupo", [])
    setFilter("fecha_desde", undefined)
    setFilter("fecha_hasta", undefined)
    setFilter("hora_desde", undefined)
    setFilter("hora_hasta", undefined)
    setFilter("solo_conflicto", false)
    clearCarreras()
    clearAsignaturas()
    triggerFetchIfValid()
    toast.success("Filtros académicos limpiados")
  }

  const handleCampusChange = (value: string) => {
    const campusId = value === "none" ? undefined : value
    setFilter("infra_campus_id", campusId)
    setFilter("infra_bloque_id", undefined)
    setFilter("infra_ambiente_id", undefined)
    setFilter("aula_id", undefined)
    clearBloques()
    clearAmbientes()

    const facId = filters.infra_facultad_id

    if (campusId || facId) {
      fetchBloques(facId, campusId)
    }
    triggerFetchIfValid()
  }

  const handleFacultadInfraChange = (value: string) => {
    const facId = value === "none" ? undefined : value
    setFilter("infra_facultad_id", facId)
    setFilter("infra_bloque_id", undefined)
    setFilter("infra_ambiente_id", undefined)
    setFilter("aula_id", undefined)
    clearBloques()
    clearAmbientes()

    const campusId = filters.infra_campus_id

    if (facId || campusId) {
      fetchBloques(facId, campusId)
    }
    triggerFetchIfValid()
  }

  const handleBloqueChange = (value: string) => {
    const bloqueId = value === "none" ? undefined : value
    setFilter("infra_bloque_id", bloqueId)
    setFilter("infra_ambiente_id", undefined)
    setFilter("aula_id", undefined)
    clearAmbientes()

    if (bloqueId) {
      fetchAmbientes(bloqueId)
    }
    triggerFetchIfValid()
  }

  const handleAmbienteChange = (value: string) => {
    const ambienteId = value === "none" ? undefined : value
    setFilter("infra_ambiente_id", ambienteId)
    setFilter("aula_id", ambienteId)
    triggerFetchIfValid()
  }

  const handleClearInfraFilters = () => {
    setFilter("infra_campus_id", undefined)
    setFilter("infra_facultad_id", undefined)
    setFilter("infra_bloque_id", undefined)
    setFilter("infra_ambiente_id", undefined)
    setFilter("aula_id", undefined)
    clearBloques()
    clearAmbientes()
    setCampusSearch("")
    setFacultadInfraSearch("")
    setBloqueSearch("")
    setAmbienteSearch("")
    triggerFetchIfValid()
    toast.success("Filtros de infraestructura limpiados")
  }

  const handleClearAllFilters = () => {
    resetFilters()
    clearCarreras()
    clearAsignaturas()
    clearBloques()
    clearAmbientes()
    setCampusSearch("")
    setFacultadInfraSearch("")
    setBloqueSearch("")
    setAmbienteSearch("")
    toast.success("Todos los filtros han sido limpiados")
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

              <div className="flex items-center gap-3">
                {/* Campo para modificar el valor del período */}
                <div className="flex items-center gap-1.5">
                  <Label
                    htmlFor="periodo-global"
                    className="text-xs font-semibold text-foreground/80 whitespace-nowrap"
                  >
                    Período (min):
                  </Label>
                  <Input
                    id="periodo-global"
                    type="number"
                    min={1}
                    value={customPeriod !== "" ? customPeriod : activePeriod}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value)
                      setCustomPeriod(val)
                    }}
                    className="h-9 w-18 text-xs text-center font-medium bg-background no-spinner"
                    aria-label="Periodo de segmentacion en minutos"
                  />
                </div>

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
            {showFilters && (
              <aside className="w-80 shrink-0 flex flex-col gap-4 h-full min-h-0">
                {/* Tarjeta 1: Filtros Académicos */}
                <div
                  className="flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden min-h-0"
                  style={{ flex: "7 1 0%" }}
                >
                  <div className="flex items-center justify-between border-b border-border p-4 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Filter className="size-3.5" />
                      Filtros Académicos
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleClearAcademicFilters}
                      className="text-[10px] h-6 px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      Limpiar
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
                              placeholder={
                                loadingFacultades ? "Cargando..." : "Seleccione Facultad"
                              }
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
                            className="h-9 text-xs no-spinner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección: Filtros Opcionales */}
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1">
                        Filtros Opcionales
                      </div>

                      {/* Plan de Estudio / Carrera */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Plan de Estudio
                        </Label>
                        <Select
                          value={filters.plan_estudio_codigo || "none"}
                          onValueChange={handleCarreraChange}
                          disabled={loadingCarreras || !filters.facultad_codigo}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={
                                loadingCarreras ? "Cargando..." : "Seleccione Plan de Estudio"
                              }
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setCarreraSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Plan de Estudio</SelectItem>
                            {filteredCarreras.map((c) => (
                              <SelectItem key={c.id} value={c.codigo}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>

                      {/* Asignatura */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Asignatura</Label>
                        <Select
                          value={filters.asignatura_codigo?.[0] || "none"}
                          onValueChange={(val) => {
                            setFilter("asignatura_codigo", val === "none" ? [] : [val])
                            triggerFetchIfValid()
                          }}
                          disabled={loadingAsignaturas || !isMandatoryFiltersSet}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={
                                loadingAsignaturas ? "Cargando..." : "Seleccione Asignatura"
                              }
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setAsignaturaSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Asignatura</SelectItem>
                            {filteredAsignaturas.map((a) => (
                              <SelectItem key={a.id} value={a.codigo}>
                                {a.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>

                      {/* Grupo (Depende de asignatura y muestra dinámicamente sus grupos) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">Grupo</Label>
                          {(!filters.asignatura_codigo ||
                            filters.asignatura_codigo.length === 0) && (
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
                        <Label className="text-xs font-semibold text-foreground">
                          Rango Horario
                        </Label>
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
                </div>

                {/* Tarjeta 2: Filtros de Infraestructura / Espacios Físicos */}
                <div
                  className="flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden min-h-0"
                  style={{ flex: "3 1 0%" }}
                >
                  <div className="flex items-center justify-between border-b border-border p-4 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      Espacios Físicos
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleClearInfraFilters}
                      className="text-[10px] h-6 px-2 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      Limpiar
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 pt-1.5 space-y-4 min-h-0">
                    <div className="space-y-3 pb-2">
                      {/* Campus */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Campus</Label>
                        <Select
                          value={filters.infra_campus_id || "none"}
                          onValueChange={handleCampusChange}
                          disabled={loadingInfra}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={loadingInfra ? "Cargando..." : "Seleccione Campus"}
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setCampusSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Campus</SelectItem>
                            {filteredCampus.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>

                      {/* Facultad de Infraestructura */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Facultad</Label>
                        <Select
                          value={filters.infra_facultad_id || "none"}
                          onValueChange={handleFacultadInfraChange}
                          disabled={loadingInfra}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={loadingInfra ? "Cargando..." : "Seleccione Facultad"}
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setFacultadInfraSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Facultad</SelectItem>
                            {filteredFacultadesInfra.map((f) => (
                              <SelectItem key={f.id} value={f.id.toString()}>
                                {f.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>

                      {/* Bloque */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Bloque</Label>
                        <Select
                          value={filters.infra_bloque_id || "none"}
                          onValueChange={handleBloqueChange}
                          disabled={
                            loadingInfra || !filters.infra_campus_id || !filters.infra_facultad_id
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={
                                loadingInfra
                                  ? "Cargando..."
                                  : !filters.infra_campus_id || !filters.infra_facultad_id
                                    ? "Seleccione Campus y Facultad"
                                    : "Seleccione Bloque"
                              }
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setBloqueSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Bloque</SelectItem>
                            {filteredBloques.map((b) => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                {b.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>

                      {/* Ambiente */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Ambiente</Label>
                        <Select
                          value={filters.infra_ambiente_id || "none"}
                          onValueChange={handleAmbienteChange}
                          disabled={loadingInfra || !filters.infra_bloque_id}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue
                              placeholder={
                                loadingInfra
                                  ? "Cargando..."
                                  : !filters.infra_bloque_id
                                    ? "Seleccione Bloque primero"
                                    : "Seleccione Ambiente"
                              }
                            />
                          </SelectTrigger>
                          <SearchableSelectContent
                            onFilterChange={setAmbienteSearch}
                            onKeyDownCapture={(e) => {
                              if (e.key === "Escape") e.stopPropagation()
                            }}
                          >
                            <SelectItem value="none">Seleccione Ambiente</SelectItem>
                            {filteredAmbientes.map((a) => (
                              <SelectItem key={a.id} value={a.id.toString()}>
                                {a.nombre}
                              </SelectItem>
                            ))}
                          </SearchableSelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            )}

            {/* Contenido de Visualización */}
            <main className="flex-1 flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden min-w-0">
              {/* Avisos de Error */}
              {listError && (
                <div className="m-4">
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Atención</AlertTitle>
                    <AlertDescription>{formatErrorMessage(listError)}</AlertDescription>
                  </Alert>
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
                        Por favor, establecé una Facultad, Gestión y Periodo en el panel lateral
                        para poder visualizar los horarios correspondientes.
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
                      <GlobalWeeklyScheduleGrid
                        items={scheduleItems}
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
