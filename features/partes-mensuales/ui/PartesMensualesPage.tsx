"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useCarrerasStore } from "@/shared/stores/catalogos/useCarrerasStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import {
  partesMensualesApi,
  type ReporteMensualResponse,
  type AlertaRetrasoItem,
  type AlertaFaltaItem,
  type AlertaInasistenciaConsecutivaItem,
  type AlertaOcurrenciaDetalle,
} from "../application/partesMensualesApi"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { Select, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { toast, Button, DateRangePicker, type DateRange } from "@umss/estilos-base/components"
import {
  Printer,
  AlertTriangle,
  Clock,
  UserCheck,
  CalendarRange,
  Loader2,
  FileCheck2,
} from "lucide-react"

export default function PartesMensualesPage() {
  const { facultades, fetchFacultades } = useFacultadesStore()
  const { carreras, fetchCarreras, loading: loadingCarreras } = useCarrerasStore()
  const { user } = useAuthStore()

  // Estado local del reporte
  const [reporte, setReporte] = useState<ReporteMensualResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtros de Búsqueda
  const [alcance, setAlcance] = useState<"facultad" | "plan_estudio">("facultad")
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [filtroFacultadId, setFiltroFacultadId] = useState<string>("all")
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [facultadSearch, setFacultadSearch] = useState("")
  const [planSearch, setPlanSearch] = useState("")
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  useEffect(() => {
    if (alcance === "plan_estudio") {
      if (filtroFacultadId && filtroFacultadId !== "all") {
        fetchCarreras(filtroFacultadId)
      } else {
        fetchCarreras()
      }
    }
  }, [alcance, filtroFacultadId, fetchCarreras])

  // Filtrar facultades por búsqueda
  const filteredFacultades = useMemo(() => {
    return facultades.filter(
      (f) =>
        f.nombre.toLowerCase().includes(facultadSearch.toLowerCase()) ||
        f.codigo.toLowerCase().includes(facultadSearch.toLowerCase())
    )
  }, [facultades, facultadSearch])

  // Filtrar planes de estudio por búsqueda
  const filteredCarreras = useMemo(() => {
    return carreras.filter((c) => {
      const term = planSearch.toLowerCase()
      return (
        c.nombre.toLowerCase().includes(term) ||
        c.codigo.toLowerCase().includes(term) ||
        String(c.id).includes(term)
      )
    })
  }, [carreras, planSearch])

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast.error("Por favor seleccione un rango de fechas")
      return
    }

    if (dateRange.from > dateRange.to) {
      toast.error("La fecha de inicio debe ser anterior o igual a la fecha de fin")
      return
    }

    let objetivo = ""

    if (alcance === "facultad") {
      if (!selectedFacultadId) {
        toast.error("Por favor seleccione una facultad")
        return
      }
      const fac = facultades.find((f) => String(f.id) === selectedFacultadId)
      if (!fac) {
        toast.error("Facultad no encontrada")
        return
      }
      objetivo = fac.codigo.trim().toUpperCase()
    } else if (alcance === "plan_estudio") {
      if (!selectedPlanId) {
        toast.error("Por favor seleccione un plan de estudio")
        return
      }
      const planIdNum = parseInt(selectedPlanId.trim(), 10)
      if (isNaN(planIdNum) || planIdNum <= 0) {
        toast.error("El plan de estudio seleccionado debe tener un identificador numérico válido")
        return
      }
      objetivo = String(planIdNum)
    } else {
      toast.error("Alcance no reconocido")
      return
    }

    // Convert dates to YYYY-MM-DD local timezone strings
    const toLocalYmd = (d: Date) => {
      const offset = d.getTimezoneOffset()
      const local = new Date(d.getTime() - offset * 60 * 1000)
      return local.toISOString().split("T")[0]
    }

    setLoading(true)
    try {
      const data = await partesMensualesApi.generar({
        fecha_desde: toLocalYmd(dateRange.from),
        fecha_hasta: toLocalYmd(dateRange.to),
        alcance,
        objetivo,
      })
      setReporte(data)
      toast.success("Parte mensual generado y consultado con éxito")
    } catch {
      // Los errores ya son interceptados y notificados por partesClient
    } finally {
      setLoading(false)
    }
  }

  // Generar reporte en PDF
  const handlePrint = async () => {
    if (!reporte) return
    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial...")

    try {
      const isPlan = reporte.alcance === "plan_estudio"
      const targetCarrera = isPlan
        ? carreras.find((c) => String(c.id) === String(reporte.objetivo))
        : null
      const targetFac = !isPlan
        ? facultades.find((f) => f.codigo.toUpperCase() === reporte.objetivo.toUpperCase())
        : null

      const objetivoNombre = isPlan
        ? targetCarrera
          ? `${targetCarrera.nombre} (${targetCarrera.codigo || targetCarrera.id})`
          : `Plan ${reporte.objetivo}`
        : targetFac?.nombre || reporte.objetivo

      const res = await fetch("/api/pdf/reporte-mensuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte,
          userName: user?.name || "Administrador",
          facultadNombre: objetivoNombre,
          objetivoNombre,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Fallo en la compilación del reporte en PDF")
      }

      const blob = await res.blob()
      const fileUrl = window.URL.createObjectURL(blob)
      const printWindow = window.open(fileUrl)
      if (printWindow) {
        printWindow.focus()
      } else {
        toast.error("El navegador bloqueó la ventana emergente. Por favor permita popups.")
      }
      toast.success("Reporte PDF generado con éxito", { id: toastId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al imprimir el reporte"
      toast.error(message, { id: toastId })
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Helper para extraer evidencias de items de alertas
  const getEvidencias = (
    item: AlertaRetrasoItem | AlertaFaltaItem | AlertaInasistenciaConsecutivaItem
  ): AlertaOcurrenciaDetalle[] => {
    if (Array.isArray(item.evidence) && item.evidence.length > 0) return item.evidence
    if (Array.isArray(item.evidencias) && item.evidencias.length > 0) return item.evidencias
    if ("secuencias" in item && Array.isArray(item.secuencias) && item.secuencias.length > 0) {
      return item.secuencias.flatMap((s) => s.evidence || s.evidencias || [])
    }
    return []
  }

  const isPlanReporte = reporte?.alcance === "plan_estudio"
  const planObj = isPlanReporte
    ? carreras.find((c) => String(c.id) === String(reporte?.objetivo))
    : null
  const facObj = !isPlanReporte
    ? facultades.find((f) => f.codigo.toUpperCase() === reporte?.objetivo?.toUpperCase())
    : null

  const targetNombreDisplay = isPlanReporte
    ? planObj
      ? `${planObj.nombre} (${planObj.codigo || planObj.id})`
      : `Plan ID: ${reporte?.objetivo}`
    : facObj?.nombre || reporte?.objetivo || "—"

  const isFormValid =
    Boolean(dateRange?.from && dateRange?.to) &&
    (alcance === "facultad" ? Boolean(selectedFacultadId) : Boolean(selectedPlanId))

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Partes Mensuales" }]}
        disablePageScroll
        className="p-3 sm:p-4 md:p-6 lg:p-8"
      >
        <div className="flex flex-col gap-4 lg:gap-5 w-full max-w-full min-w-0">
          {/* Cabecera Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 shrink-0 gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarRange className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg md:text-xl font-roboto font-black text-foreground uppercase tracking-wide">
                  Control de Partes Mensuales
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Generación y consulta de alertas e incidencias de asistencia mensual por facultad
                  o plan de estudio.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de Filtros y Generación */}
          <header className="rounded-2xl border border-border bg-card p-3.5 shadow-xs shrink-0 w-full min-w-0 max-w-full">
            <form onSubmit={handleBuscar}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 w-full min-w-0 max-w-full">
                {/* 1. Alcance */}
                <div
                  className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 ${
                    alcance === "facultad" ? "lg:col-span-2" : "lg:col-span-3"
                  }`}
                >
                  <label
                    htmlFor="alcance-select"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                  >
                    Alcance
                  </label>
                  <Select
                    value={alcance}
                    onValueChange={(val: "facultad" | "plan_estudio") => {
                      setAlcance(val)
                      setReporte(null)
                    }}
                  >
                    <SelectTrigger
                      id="alcance-select"
                      className="w-full h-full min-h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                    >
                      <SelectValue placeholder="Seleccione Alcance" />
                    </SelectTrigger>
                    <SearchableSelectContent>
                      <SelectItem value="facultad">Facultad</SelectItem>
                      <SelectItem value="plan_estudio">Plan de Estudio</SelectItem>
                    </SearchableSelectContent>
                  </Select>
                </div>

                {/* 2. Target Selector: Si es facultad -> Facultad Objetivo. Si es plan_estudio -> Facultad (Filtro) + Plan Objetivo */}
                {alcance === "facultad" ? (
                  <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-4">
                    <label
                      htmlFor="facultad-select"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                    >
                      Facultad Objetivo
                    </label>
                    <Select value={selectedFacultadId} onValueChange={setSelectedFacultadId}>
                      <SelectTrigger
                        id="facultad-select"
                        className="w-full h-full min-h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                      >
                        <SelectValue placeholder="Seleccione una facultad" />
                      </SelectTrigger>
                      <SearchableSelectContent
                        onFilterChange={setFacultadSearch}
                        onKeyDownCapture={(e) => e.key === "Escape" && e.stopPropagation()}
                      >
                        {filteredFacultades.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nombre} ({f.codigo})
                          </SelectItem>
                        ))}
                      </SearchableSelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    {/* Filtro Opcional de Facultad para acotar carreras */}
                    <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-4">
                      <label
                        htmlFor="filtro-facultad-plan"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                      >
                        Facultad (Filtro)
                      </label>
                      <Select
                        value={filtroFacultadId}
                        onValueChange={(val) => {
                          setFiltroFacultadId(val)
                          setSelectedPlanId("")
                        }}
                      >
                        <SelectTrigger
                          id="filtro-facultad-plan"
                          className="w-full h-full min-h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                        >
                          <SelectValue placeholder="Todas las facultades" />
                        </SelectTrigger>
                        <SearchableSelectContent
                          onFilterChange={setFacultadSearch}
                          onKeyDownCapture={(e) => e.key === "Escape" && e.stopPropagation()}
                        >
                          <SelectItem value="all">Todas las facultades</SelectItem>
                          {filteredFacultades.map((f) => (
                            <SelectItem key={f.id} value={String(f.id)}>
                              {f.nombre} ({f.codigo})
                            </SelectItem>
                          ))}
                        </SearchableSelectContent>
                      </Select>
                    </div>

                    {/* Plan de Estudio Objetivo */}
                    <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-2 lg:col-span-5">
                      <label
                        htmlFor="plan-select"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                      >
                        Plan de Estudio Objetivo
                      </label>
                      <Select
                        value={selectedPlanId}
                        onValueChange={setSelectedPlanId}
                        disabled={loadingCarreras}
                      >
                        <SelectTrigger
                          id="plan-select"
                          className="w-full h-full min-h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                        >
                          <SelectValue
                            placeholder={
                              loadingCarreras
                                ? "Cargando planes..."
                                : "Seleccione un plan de estudio"
                            }
                          />
                        </SelectTrigger>
                        <SearchableSelectContent
                          onFilterChange={setPlanSearch}
                          onKeyDownCapture={(e) => e.key === "Escape" && e.stopPropagation()}
                        >
                          {filteredCarreras.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              {loadingCarreras
                                ? "Cargando..."
                                : "No se encontraron planes de estudio"}
                            </div>
                          ) : (
                            filteredCarreras.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre} ({c.codigo || c.id})
                              </SelectItem>
                            ))
                          )}
                        </SearchableSelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* 3. Rango de Fechas */}
                <div
                  className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 ${
                    alcance === "facultad" ? "lg:col-span-3" : "lg:col-span-7"
                  }`}
                >
                  <label
                    htmlFor="filtro-rango-fechas"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                  >
                    Rango de Fechas
                  </label>
                  <DateRangePicker
                    id="filtro-rango-fechas"
                    value={dateRange}
                    onValueChange={setDateRange}
                    dateFormat="dd/MM/yyyy"
                    placeholder="Seleccione Rango de Fechas"
                    className="w-full h-full max-w-full min-w-0 overflow-hidden text-xs [&>button]:w-full [&>button]:h-full [&>button]:max-w-full [&>button]:min-w-0 [&>button]:overflow-hidden [&>button]:min-h-11 [&>button]:rounded-xl [&>button]:text-xs [&>button]:bg-card [&>button]:border-border [&>button]:text-foreground"
                  />
                </div>

                {/* 4. Botón de Acción alineado automáticamente en altura y posición */}
                <div
                  className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 ${
                    alcance === "facultad" ? "lg:col-span-3" : "lg:col-span-5"
                  }`}
                >
                  <label
                    className="text-xs font-bold uppercase tracking-wider select-none block h-5 leading-5 truncate invisible hidden sm:block"
                    aria-hidden="true"
                  >
                    &nbsp;
                  </label>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || !isFormValid}
                    className="w-full h-full min-h-11 max-w-full min-w-0 overflow-hidden rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 cursor-pointer text-xs truncate"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <FileCheck2 className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">Generar Parte Mensual</span>
                  </Button>
                </div>
              </div>
            </form>
          </header>

          {/* Resultados del Reporte */}
          {reporte ? (
            <div className="space-y-4 pb-6 w-full min-w-0 max-w-full">
              {/* 1. Resumen Informativo de lo Solicitado y Estadísticas */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex flex-row items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    Resumen del Reporte Solicitado
                  </div>
                  <Button
                    type="button"
                    onClick={handlePrint}
                    disabled={generatingPdf}
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 border-border hover:bg-muted/70 cursor-pointer shrink-0"
                  >
                    {generatingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    {generatingPdf ? "Generando..." : "Imprimir Reporte"}
                  </Button>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Alcance
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {reporte.alcance === "plan_estudio" ? "Plan de Estudio" : "Facultad"}
                    </span>
                  </div>

                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      {reporte.alcance === "plan_estudio" ? "Plan de Estudio" : "Facultad"}
                    </span>
                    <span
                      className="text-xs font-bold text-foreground line-clamp-1"
                      title={targetNombreDisplay}
                    >
                      {targetNombreDisplay}
                    </span>
                  </div>

                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Rango de Fechas
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {reporte.fecha_desde} / {reporte.fecha_hasta}
                    </span>
                  </div>

                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider block">
                      Alertas Retrasos (&gt; 3)
                    </span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      {reporte.alertas?.mas_3_retrasos?.length ?? 0} docentes
                    </span>
                  </div>

                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-red-700 dark:text-red-400 uppercase font-bold tracking-wider block">
                      Alertas Faltas (≥ 3)
                    </span>
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">
                      {reporte.alertas?.["3_faltas_mas"]?.length ?? 0} docentes
                    </span>
                  </div>

                  <div className="p-2 bg-muted/20 border border-border rounded-xl">
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold tracking-wider block">
                      Inasist. Consecutivas
                    </span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      {reporte.alertas?.inasistencias_consecutivas?.length ?? 0} docentes
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Sección de Alertas - Retrasos Recurrentes (> 3) */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    1. Alertas: Retrasos Recurrentes (&gt; 3 retrasos)
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground">
                    {reporte.alertas?.mas_3_retrasos?.length ?? 0} docentes
                  </span>
                </div>
                <div className="overflow-x-auto w-full min-w-0 max-w-full">
                  <Table className="min-w-[950px] w-full border-collapse">
                    <TableHeader className="bg-muted/30 border-b border-border">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-24 text-center border-r border-border font-bold text-xs text-foreground">
                          Código
                        </TableHead>
                        <TableHead className="w-48 border-r border-border font-bold text-xs text-foreground">
                          Docente
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Fecha
                        </TableHead>
                        <TableHead className="min-w-[180px] font-bold text-xs text-foreground border-r border-border">
                          Materia y Grupo
                        </TableHead>
                        <TableHead className="w-28 text-center font-bold text-xs text-foreground border-r border-border">
                          Horario Clase
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Tickeo Ingreso
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Tickeo Salida
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-amber-700 dark:text-amber-400 border-r border-border">
                          Retraso
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-emerald-700 dark:text-emerald-400 border-r border-border">
                          Anticipado
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground">
                          Aula
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!reporte.alertas?.mas_3_retrasos ||
                      reporte.alertas.mas_3_retrasos.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={10}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No se registraron alertas de retrasos (&gt; 3) en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas.mas_3_retrasos.map((item) => {
                          const evs = getEvidencias(item)
                          if (evs.length === 0) {
                            return (
                              <TableRow
                                key={item.persona_codigo}
                                className="border-b-2 border-border"
                              >
                                <TableCell className="text-center font-mono text-xs border-r-2 border-border font-semibold">
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground text-xs border-r-2 border-border">
                                  {item.persona_nombres}
                                </TableCell>
                                <TableCell
                                  colSpan={8}
                                  className="text-center text-muted-foreground text-xs py-3"
                                >
                                  Sin detalle de incidencias registradas
                                </TableCell>
                              </TableRow>
                            )
                          }

                          const first = evs[0]
                          const remaining = evs.slice(1)
                          const rowspan = evs.length
                          const isSingle = remaining.length === 0

                          return (
                            <>
                              <TableRow
                                key={`${item.persona_codigo}-first`}
                                className={`${
                                  isSingle ? "border-b-2 border-border" : "border-b border-border"
                                } hover:bg-muted/10 transition-colors`}
                              >
                                <TableCell
                                  rowSpan={rowspan}
                                  className="text-center font-mono text-xs font-semibold align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell
                                  rowSpan={rowspan}
                                  className="font-bold text-foreground text-xs align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  <div>{item.persona_nombres}</div>
                                  <div className="text-[10px] font-normal text-amber-700 dark:text-amber-400 mt-0.5">
                                    {item.count ?? rowspan} retrasos
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.fecha}
                                </TableCell>
                                <TableCell className="text-xs font-medium border-r border-border">
                                  {first.asignatura_nombre || first.asignatura_codigo || "—"} (
                                  {first.asignatura_codigo || "—"}) - G: {first.grupo_nombre || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_inicio} - {first.hora_fin}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_ingreso_tickeo || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_salida_tickeo || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-border">
                                  {first.minutos_retraso && first.minutos_retraso > 0
                                    ? `${first.minutos_retraso} min`
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono text-emerald-700 dark:text-emerald-400 border-r border-border">
                                  {first.minutos_anticipados && first.minutos_anticipados > 0
                                    ? `${first.minutos_anticipados} min`
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono">
                                  {first.aula_codigo || "—"}
                                </TableCell>
                              </TableRow>
                              {remaining.map((ev, rIdx) => {
                                const isLast = rIdx === remaining.length - 1
                                return (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-${rIdx}`}
                                    className={`${
                                      isLast ? "border-b-2 border-border" : "border-b border-border"
                                    } hover:bg-muted/10 transition-colors`}
                                  >
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.fecha}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium border-r border-border">
                                      {ev.asignatura_nombre || ev.asignatura_codigo || "—"} (
                                      {ev.asignatura_codigo || "—"}) - G: {ev.grupo_nombre || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_inicio} - {ev.hora_fin}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_ingreso_tickeo || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_salida_tickeo || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-border">
                                      {ev.minutos_retraso && ev.minutos_retraso > 0
                                        ? `${ev.minutos_retraso} min`
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono text-emerald-700 dark:text-emerald-400 border-r border-border">
                                      {ev.minutos_anticipados && ev.minutos_anticipados > 0
                                        ? `${ev.minutos_anticipados} min`
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.aula_codigo || "—"}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 3. Sección de Alertas - Faltas Acumuladas (3 o más) */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    2. Alertas: Faltas Acumuladas (3 faltas o más)
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground">
                    {reporte.alertas?.["3_faltas_mas"]?.length ?? 0} docentes
                  </span>
                </div>
                <div className="overflow-x-auto w-full min-w-0 max-w-full">
                  <Table className="min-w-[950px] w-full border-collapse">
                    <TableHeader className="bg-muted/30 border-b border-border">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-24 text-center border-r border-border font-bold text-xs text-foreground">
                          Código
                        </TableHead>
                        <TableHead className="w-48 border-r border-border font-bold text-xs text-foreground">
                          Docente
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Fecha
                        </TableHead>
                        <TableHead className="min-w-[180px] font-bold text-xs text-foreground border-r border-border">
                          Materia y Grupo
                        </TableHead>
                        <TableHead className="w-28 text-center font-bold text-xs text-foreground border-r border-border">
                          Horario Clase
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Tickeo Ingreso
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground border-r border-border">
                          Tickeo Salida
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-red-600 dark:text-red-400 border-r border-border">
                          Estado
                        </TableHead>
                        <TableHead className="w-24 text-center font-bold text-xs text-foreground">
                          Aula
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!reporte.alertas?.["3_faltas_mas"] ||
                      reporte.alertas["3_faltas_mas"].length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No se registraron alertas de faltas (3 o más) en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas["3_faltas_mas"].map((item) => {
                          const evs = getEvidencias(item)
                          if (evs.length === 0) {
                            return (
                              <TableRow
                                key={item.persona_codigo}
                                className="border-b-2 border-border"
                              >
                                <TableCell className="text-center font-mono text-xs border-r-2 border-border font-semibold">
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground text-xs border-r-2 border-border">
                                  {item.persona_nombres}
                                </TableCell>
                                <TableCell
                                  colSpan={7}
                                  className="text-center text-muted-foreground text-xs py-3"
                                >
                                  Sin detalle de faltas registradas
                                </TableCell>
                              </TableRow>
                            )
                          }

                          const first = evs[0]
                          const remaining = evs.slice(1)
                          const rowspan = evs.length
                          const isSingle = remaining.length === 0

                          return (
                            <>
                              <TableRow
                                key={`${item.persona_codigo}-first-fal`}
                                className={`${
                                  isSingle ? "border-b-2 border-border" : "border-b border-border"
                                } hover:bg-muted/10 transition-colors`}
                              >
                                <TableCell
                                  rowSpan={rowspan}
                                  className="text-center font-mono text-xs font-semibold align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell
                                  rowSpan={rowspan}
                                  className="font-bold text-foreground text-xs align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  <div>{item.persona_nombres}</div>
                                  <div className="text-[10px] font-normal text-red-700 dark:text-red-400 mt-0.5">
                                    {item.count ?? rowspan} faltas
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.fecha}
                                </TableCell>
                                <TableCell className="text-xs font-medium border-r border-border">
                                  {first.asignatura_nombre || first.asignatura_codigo || "—"} (
                                  {first.asignatura_codigo || "—"}) - G: {first.grupo_nombre || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_inicio} - {first.hora_fin}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_ingreso_tickeo || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono border-r border-border">
                                  {first.hora_salida_tickeo || "—"}
                                </TableCell>
                                <TableCell className="text-center text-xs font-bold text-red-600 dark:text-red-400 uppercase border-r border-border">
                                  FALTA
                                </TableCell>
                                <TableCell className="text-center text-xs font-mono">
                                  {first.aula_codigo || "—"}
                                </TableCell>
                              </TableRow>
                              {remaining.map((ev, rIdx) => {
                                const isLast = rIdx === remaining.length - 1
                                return (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-fal-${rIdx}`}
                                    className={`${
                                      isLast ? "border-b-2 border-border" : "border-b border-border"
                                    } hover:bg-muted/10 transition-colors`}
                                  >
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.fecha}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium border-r border-border">
                                      {ev.asignatura_nombre || ev.asignatura_codigo || "—"} (
                                      {ev.asignatura_codigo || "—"}) - G: {ev.grupo_nombre || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_inicio} - {ev.hora_fin}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_ingreso_tickeo || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono border-r border-border">
                                      {ev.hora_salida_tickeo || "—"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-bold text-red-600 dark:text-red-400 uppercase border-r border-border">
                                      FALTA
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.aula_codigo || "—"}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 4. Sección de Alertas - Inasistencias Consecutivas (6 o más días) */}
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    3. Alertas: Inasistencias Consecutivas (Secuencia de 6 o más días)
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground">
                    {reporte.alertas?.inasistencias_consecutivas?.length ?? 0} docentes
                  </span>
                </div>
                <div className="overflow-x-auto w-full min-w-0 max-w-full">
                  <Table className="min-w-[950px] w-full border-collapse">
                    <TableHeader className="bg-muted/30 border-b border-border">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-24 text-center border-r border-border font-bold text-xs text-foreground">
                          Código
                        </TableHead>
                        <TableHead className="w-48 border-r border-border font-bold text-xs text-foreground">
                          Docente
                        </TableHead>
                        <TableHead className="w-44 text-center font-bold text-xs text-foreground border-r border-border">
                          Período Consecutivo
                        </TableHead>
                        <TableHead className="w-28 text-center font-bold text-xs text-rose-700 dark:text-rose-400 border-r border-border">
                          Faltas Seguidas
                        </TableHead>
                        <TableHead className="min-w-[300px] font-bold text-xs text-foreground">
                          Detalle de Clases Faltadas (Fecha - Horario - Materia - Aula)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!reporte.alertas?.inasistencias_consecutivas ||
                      reporte.alertas.inasistencias_consecutivas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No hay alertas de inasistencias consecutivas en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas.inasistencias_consecutivas.map((item) => {
                          const secuencias =
                            item.secuencias ||
                            (item.evidencias || item.evidence
                              ? [
                                  {
                                    fecha_inicio:
                                      item.fecha_inicio ||
                                      item.evidencias?.[0]?.fecha ||
                                      item.evidence?.[0]?.fecha ||
                                      reporte.fecha_desde,
                                    fecha_fin:
                                      item.fecha_fin ||
                                      item.evidencias?.[(item.evidencias?.length ?? 1) - 1]
                                        ?.fecha ||
                                      item.evidence?.[(item.evidence?.length ?? 1) - 1]?.fecha ||
                                      reporte.fecha_hasta,
                                    cantidad_ocurrencias:
                                      item.count ||
                                      item.evidencias?.length ||
                                      item.evidence?.length ||
                                      0,
                                    evidencias: item.evidencias || item.evidence || [],
                                  },
                                ]
                              : [])

                          if (secuencias.length === 0) {
                            return (
                              <TableRow
                                key={item.persona_codigo}
                                className="border-b-2 border-border"
                              >
                                <TableCell className="text-center font-mono text-xs border-r-2 border-border font-semibold">
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground text-xs border-r-2 border-border">
                                  {item.persona_nombres}
                                </TableCell>
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-muted-foreground text-xs py-3"
                                >
                                  Sin secuencias consecutivas detectadas
                                </TableCell>
                              </TableRow>
                            )
                          }

                          const firstSec = secuencias[0]
                          const remainingSec = secuencias.slice(1)
                          const rowspan = secuencias.length
                          const isSingle = remainingSec.length === 0

                          return (
                            <>
                              <TableRow
                                key={`${item.persona_codigo}-first-sec`}
                                className={`${
                                  isSingle ? "border-b-2 border-border" : "border-b border-border"
                                } hover:bg-muted/10 transition-colors`}
                              >
                                <TableCell
                                  rowSpan={rowspan}
                                  className="text-center font-mono text-xs font-semibold align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  {item.persona_codigo}
                                </TableCell>
                                <TableCell
                                  rowSpan={rowspan}
                                  className="font-bold text-foreground text-xs align-middle bg-card border-r-2 border-border border-b-2 border-border"
                                >
                                  {item.persona_nombres}
                                </TableCell>
                                <TableCell className="text-center text-xs font-semibold text-foreground border-r border-border">
                                  Desde: {firstSec.fecha_inicio} <br /> Hasta: {firstSec.fecha_fin}
                                </TableCell>
                                <TableCell className="text-center font-bold text-xs text-rose-700 dark:text-rose-400 border-r border-border">
                                  {firstSec.cantidad_ocurrencias ??
                                    firstSec.evidencias?.length ??
                                    0}{" "}
                                  clases
                                </TableCell>
                                <TableCell className="py-2.5 text-xs">
                                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                                    {firstSec.evidencias?.map(
                                      (e: AlertaOcurrenciaDetalle, idx: number) => (
                                        <li key={idx}>
                                          <span className="font-semibold text-foreground">
                                            {e.fecha}
                                          </span>{" "}
                                          ({e.hora_inicio} - {e.hora_fin}):{" "}
                                          <span className="font-medium">
                                            {e.asignatura_nombre || e.asignatura_codigo || "Clase"}
                                          </span>{" "}
                                          - G: {e.grupo_nombre || "—"} | Aula:{" "}
                                          {e.aula_codigo || "—"}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </TableCell>
                              </TableRow>
                              {remainingSec.map((sec, sIdx) => {
                                const isLast = sIdx === remainingSec.length - 1
                                return (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-sec-${sIdx}`}
                                    className={`${
                                      isLast ? "border-b-2 border-border" : "border-b border-border"
                                    } hover:bg-muted/10 transition-colors`}
                                  >
                                    <TableCell className="text-center text-xs font-semibold text-foreground border-r border-border">
                                      Desde: {sec.fecha_inicio} <br /> Hasta: {sec.fecha_fin}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-xs text-rose-700 dark:text-rose-400 border-r border-border">
                                      {sec.cantidad_ocurrencias ?? sec.evidencias?.length ?? 0}{" "}
                                      clases
                                    </TableCell>
                                    <TableCell className="py-2.5 text-xs">
                                      <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                                        {sec.evidencias?.map(
                                          (e: AlertaOcurrenciaDetalle, idx: number) => (
                                            <li key={idx}>
                                              <span className="font-semibold text-foreground">
                                                {e.fecha}
                                              </span>{" "}
                                              ({e.hora_inicio} - {e.hora_fin}):{" "}
                                              <span className="font-medium">
                                                {e.asignatura_nombre ||
                                                  e.asignatura_codigo ||
                                                  "Clase"}
                                              </span>{" "}
                                              - G: {e.grupo_nombre || "—"} | Aula:{" "}
                                              {e.aula_codigo || "—"}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10">
              <Clock className="w-12 h-12 text-muted-foreground/35 mb-3" />
              <h3 className="text-base font-bold text-foreground">
                Control de Incidencias y Alertas Mensuales
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Seleccione el alcance, la facultad y el rango de fechas para consultar las alertas
                mensuales de retrasos, faltas e inasistencias consecutivas con su evidencia
                completa.
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
