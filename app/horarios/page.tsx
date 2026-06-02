"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Filter,
  Grid,
  List,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
} from "lucide-react"

// Stores
import { useHorariosListStore } from "@/features/scheduling/docentes/application/useHorariosListStore"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useCarrerasStore } from "@/shared/stores/catalogos/useCarrerasStore"
import { useAsignaturasStore } from "@/shared/stores/catalogos/useAsignaturasStore"
import { useDocentesSearchStore } from "@/shared/stores/catalogos/useDocentesSearchStore"
import { useUIStore } from "@/shared/stores/uiStore"

// Normalizadores
import { buildRows } from "@/features/scheduling/docentes/application/normalizers"

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
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { TimePicker } from "@/components/ui/time-picker"
import type { DateRange } from "react-day-picker"
import { DatePickerRange } from "@/components/ui/date-picker-range"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowEven,
  TableRowOdd,
} from "@/components/ui/table"
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

  // Búsqueda local de docentes (para debounce)
  const [docenteInput, setDocenteInput] = useState("")
  const [selectedDocenteName, setSelectedDocenteName] = useState("")
  const [showDocenteSugerencias, setShowDocenteSugerencias] = useState(false)

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
    setPage,
    setSort,
    fetchHorarios,
    resetFilters,
  } = useHorariosListStore()

  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()

  const { carreras, loading: loadingCarreras, fetchCarreras } = useCarrerasStore()

  const { asignaturas, loading: loadingAsignaturas, fetchAsignaturas } = useAsignaturasStore()

  const {
    docentes: docentesSugeridos,
    loading: searchingDocentes,
    searchDocentes,
    clear: clearDocenteSearch,
  } = useDocentesSearchStore()

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
    fetchHorarios()
  }

  // Carga inicial de datos base
  useEffect(() => {
    fetchFacultades()
    fetchCarreras()
    fetchAsignaturas()
    fetchHorarios()
  }, [fetchFacultades, fetchCarreras, fetchAsignaturas, fetchHorarios])

  // Debounce para búsqueda de docentes
  useEffect(() => {
    if (!docenteInput.trim()) {
      clearDocenteSearch()
      return
    }

    const timer = setTimeout(() => {
      searchDocentes(docenteInput)
    }, 450)

    return () => clearTimeout(timer)
  }, [docenteInput, searchDocentes, clearDocenteSearch])

  // Filtrado de catálogos en el cliente (Limitado a 100 elementos para rendimiento con scrollbar)
  const filteredFacultades = useMemo(() => {
    const term = facultadSearch.toLowerCase().trim()
    return facultades
      .filter((f) => f.nombre.toLowerCase().includes(term) || f.codigo.toLowerCase().includes(term))
      .slice(0, 100)
  }, [facultades, facultadSearch])

  const filteredCarreras = useMemo(() => {
    const term = carreraSearch.toLowerCase().trim()
    return carreras
      .filter((c) => c.nombre.toLowerCase().includes(term) || c.codigo.toLowerCase().includes(term))
      .slice(0, 100)
  }, [carreras, carreraSearch])

  const filteredAsignaturas = useMemo(() => {
    const term = asignaturaSearch.toLowerCase().trim()
    return asignaturas
      .filter((a) => a.nombre.toLowerCase().includes(term) || a.codigo.toLowerCase().includes(term))
      .slice(0, 100)
  }, [asignaturas, asignaturaSearch])

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
    return {
      timeRange: range,
      rows: buildRows(range, 90),
    }
  }, [normalizedSchedules])

  // Handlers de selección de filtros
  const handleFacultadChange = (value: string) => {
    if (value === "none") {
      setFilter("facultad_codigo", undefined)
      // Refrescar carreras sin filtro de facultad
      fetchCarreras()
    } else {
      const fac = facultades.find((f) => f.id.toString() === value || f.codigo === value)
      if (fac) {
        setFilter("facultad_codigo", fac.codigo)
        // Cargar carreras filtradas por esta facultad
        fetchCarreras(fac.id.toString())
      }
    }
    fetchHorarios()
  }

  const handleCarreraChange = (value: string) => {
    if (value === "none") {
      setFilter("plan_estudio_codigo", undefined)
      fetchAsignaturas()
    } else {
      const car = carreras.find((c) => c.id.toString() === value || c.codigo === value)
      if (car) {
        setFilter("plan_estudio_codigo", car.codigo)
        // Filtrar asignaturas vinculadas a esta carrera
        fetchAsignaturas(car.id.toString())
      }
    }
    fetchHorarios()
  }

  const handleAsignaturaChange = (value: string) => {
    if (value === "none") {
      setFilter("asignatura_codigo", undefined)
    } else {
      const asig = asignaturas.find((a) => a.id.toString() === value || a.codigo === value)
      if (asig) {
        setFilter("asignatura_codigo", asig.codigo)
      }
    }
    fetchHorarios()
  }

  const handleDocenteSelect = (docente: { documento: string | null; nombres: string }) => {
    if (docente.documento) {
      setFilter("persona_documento", docente.documento)
      setSelectedDocenteName(docente.nombres)
      setDocenteInput("")
      setShowDocenteSugerencias(false)
      fetchHorarios()
    }
  }

  const handleClearDocente = () => {
    setFilter("persona_documento", undefined)
    setSelectedDocenteName("")
    setDocenteInput("")
    fetchHorarios()
  }

  const handleClearAllFilters = () => {
    resetFilters()
    handleClearDocente()
    toast.success("Filtros limpiados exitosamente")
  }

  const totalConflictosCount = useMemo(() => {
    // Si viene solo_conflicto=true de backend todos lo son,
    // pero calculamos los conflictos detectados localmente
    return normalizedSchedules.length
  }, [normalizedSchedules])

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
                  onClick={() => fetchHorarios()}
                  className="size-9 rounded-lg"
                  disabled={loading}
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

                <div className="flex-1 overflow-y-auto p-4 pt-1.5 space-y-1.5 min-h-0">
                  {/* Facultad */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Facultad</Label>
                    <Select
                      value={
                        facultades
                          .find((f) => f.codigo === filters.facultad_codigo)
                          ?.id.toString() || "none"
                      }
                      onValueChange={handleFacultadChange}
                      disabled={loadingFacultades}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue
                          placeholder={loadingFacultades ? "Cargando..." : "Todas las Facultades"}
                        />
                      </SelectTrigger>
                      <SearchableSelectContent onFilterChange={setFacultadSearch}>
                        <SelectItem value="none">Todas las Facultades</SelectItem>
                        {filteredFacultades.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.nombre}
                          </SelectItem>
                        ))}
                      </SearchableSelectContent>
                    </Select>
                  </div>

                  {/* Plan de Estudio / Carrera */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Plan de Estudio</Label>
                    <Select
                      value={
                        carreras
                          .find((c) => c.codigo === filters.plan_estudio_codigo)
                          ?.id.toString() || "none"
                      }
                      onValueChange={handleCarreraChange}
                      disabled={loadingCarreras}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue
                          placeholder={loadingCarreras ? "Cargando..." : "Todos los Planes"}
                        />
                      </SelectTrigger>
                      <SearchableSelectContent onFilterChange={setCarreraSearch}>
                        <SelectItem value="none">Todos los Planes</SelectItem>
                        {filteredCarreras.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
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
                      value={
                        asignaturas
                          .find((a) => a.codigo === filters.asignatura_codigo)
                          ?.id.toString() || "none"
                      }
                      onValueChange={handleAsignaturaChange}
                      disabled={loadingAsignaturas}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue
                          placeholder={loadingAsignaturas ? "Cargando..." : "Todas las Asignaturas"}
                        />
                      </SelectTrigger>
                      <SearchableSelectContent onFilterChange={setAsignaturaSearch}>
                        <SelectItem value="none">Todas las Asignaturas</SelectItem>
                        {filteredAsignaturas.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.nombre}
                          </SelectItem>
                        ))}
                      </SearchableSelectContent>
                    </Select>
                  </div>

                  {/* Grupo (Depende de asignatura) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Grupo</Label>
                      {!filters.asignatura_codigo && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Requiere asignatura
                        </span>
                      )}
                    </div>
                    <Select
                      value={filters.grupo || "none"}
                      onValueChange={(val) => {
                        setFilter("grupo", val === "none" ? undefined : val)
                        fetchHorarios()
                      }}
                      disabled={!filters.asignatura_codigo}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Seleccione Grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Todos los Grupos</SelectItem>
                        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((g) => (
                          <SelectItem key={g} value={g}>
                            Grupo {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Docente (Autocompletado con Debounce) */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-semibold text-foreground">Docente</Label>
                    {selectedDocenteName ? (
                      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs text-foreground font-medium shadow-sm">
                        <span className="truncate">{selectedDocenteName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleClearDocente}
                          className="size-5 shrink-0 rounded-full hover:bg-muted"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar docente..."
                          value={docenteInput}
                          onChange={(e) => {
                            setDocenteInput(e.target.value)
                            setShowDocenteSugerencias(true)
                          }}
                          onFocus={() => setShowDocenteSugerencias(true)}
                          className="pl-9 h-9 text-xs"
                        />
                        {searchingDocentes && (
                          <div className="absolute right-3 top-2.5">
                            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sugerencias de docentes */}
                    {showDocenteSugerencias && docenteInput.trim().length > 0 && (
                      <div className="absolute z-50 w-full left-0 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {docentesSugeridos.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">
                            No se encontraron docentes
                          </div>
                        ) : (
                          docentesSugeridos.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleDocenteSelect(doc)}
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors flex flex-col gap-0.5"
                            >
                              <span className="font-semibold text-foreground">{doc.nombres}</span>
                              <span className="text-[10px] text-muted-foreground">
                                CI: {doc.documento || "No especificado"} · Cod: {doc.codigo}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gestión y Periodo */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Gestión</Label>
                      <Input
                        type="number"
                        placeholder="Año"
                        value={filters.gestion || ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined
                          setFilter("gestion", val)
                          fetchHorarios()
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Periodo</Label>
                      <Select
                        value={filters.periodo !== undefined ? filters.periodo.toString() : "none"}
                        onValueChange={(val) => {
                          setFilter("periodo", val === "none" ? undefined : Number(val))
                          fetchHorarios()
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Todos</SelectItem>
                          {[0, 1, 2, 3, 4].map((p) => (
                            <SelectItem key={p} value={p.toString()}>
                              Periodo {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Aula y Día */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Aula ID</Label>
                      <Input
                        type="number"
                        placeholder="ID"
                        value={filters.aula_id || ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined
                          setFilter("aula_id", val)
                          fetchHorarios()
                        }}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Día</Label>
                      <Select
                        value={filters.dia !== undefined ? filters.dia.toString() : "none"}
                        onValueChange={(val) => {
                          setFilter("dia", val === "none" ? undefined : Number(val))
                          fetchHorarios()
                        }}
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
                          fetchHorarios()
                        }}
                        className="h-9 text-xs"
                      />
                      <TimePicker
                        value={filters.hora_hasta}
                        onChange={(val) => {
                          setFilter("hora_hasta", val || undefined)
                          fetchHorarios()
                        }}
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
                        fetchHorarios()
                      }}
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
                  {horarios.length === 0 ? (
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
