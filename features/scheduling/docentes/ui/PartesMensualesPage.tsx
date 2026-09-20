"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import {
  partesMensualesApi,
  type ReporteMensualResponse,
  type AlertaRetrasoItem,
  type AlertaFaltaItem,
  type AlertaInasistenciaConsecutivaItem,
  type AlertaRetrasoOcurrencia,
} from "@/features/scheduling/docentes/application/partesMensualesApi"
import { Label } from "@/components/ui/label"
import type { DateRange } from "react-day-picker"
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
import {
  toast,
  Button,
  ScrollArea,
  Badge,
  DateRangePicker,
  UmssCard as Card,
  UmssCardHeader as CardHeader,
  UmssCardTitle as CardTitle,
  UmssCardContent as CardContent,
} from "@umss/estilos-base/components"
import {
  Search,
  Printer,
  AlertTriangle,
  Clock,
  UserCheck,
  CalendarDays,
  CalendarRange,
  Loader2,
  FileCheck2,
  Layers,
  Building,
} from "lucide-react"

export default function PartesMensualesPage() {
  const { facultades, fetchFacultades } = useFacultadesStore()
  const { user } = useAuthStore()

  // Estado local del reporte
  const [reporte, setReporte] = useState<ReporteMensualResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtros de Búsqueda
  const [alcance, setAlcance] = useState<string>("facultad")
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [facultadSearch, setFacultadSearch] = useState("")
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  // Filtrar facultades por búsqueda
  const filteredFacultades = facultades.filter(
    (f) =>
      f.nombre.toLowerCase().includes(facultadSearch.toLowerCase()) ||
      f.codigo.toLowerCase().includes(facultadSearch.toLowerCase())
  )

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (alcance !== "facultad") {
      toast.error("Actualmente el alcance soportado es únicamente 'facultad'")
      return
    }

    if (!selectedFacultadId) {
      toast.error("Por favor seleccione una facultad")
      return
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast.error("Por favor seleccione un rango de fechas")
      return
    }

    const fac = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!fac) return

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
        alcance: "facultad",
        objetivo: fac.codigo.trim().toUpperCase(),
      })
      setReporte(data)
      toast.success("Parte mensual generado y consultado con éxito")
    } catch (err: any) {
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
      const fac = facultades.find((f) => f.codigo === reporte.objetivo)
      const res = await fetch("/api/pdf/reporte-mensuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte,
          userName: user?.name || "Administrador",
          facultadNombre: fac?.nombre || reporte.objetivo,
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
    } catch (err: any) {
      toast.error(err.message || "Error al imprimir el reporte", { id: toastId })
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Helper para extraer evidencias de items de alertas
  const getEvidencias = (
    item: AlertaRetrasoItem | AlertaFaltaItem | AlertaInasistenciaConsecutivaItem
  ): AlertaRetrasoOcurrencia[] => {
    if (Array.isArray(item.evidencias) && item.evidencias.length > 0) return item.evidencias
    if (Array.isArray(item.evidence) && item.evidence.length > 0) return item.evidence
    if ("secuencias" in item && Array.isArray(item.secuencias) && item.secuencias.length > 0) {
      return item.secuencias.flatMap((s) => s.evidencias || [])
    }
    return []
  }

  const selectedFac = facultades.find((f) => String(f.id) === selectedFacultadId)

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Partes Mensuales" }]}>
        <div className="flex flex-col gap-4 lg:gap-5 w-full lg:h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden">
          {/* Cabecera Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 shrink-0 gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarRange className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg md:text-xl font-roboto font-black text-[#001B47] dark:text-white uppercase tracking-wide">
                  Control de Partes Mensuales
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Generación y consolidación de reportes de asistencia mensual por facultad.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de Filtros y Generación */}
          <header className="rounded-2xl border border-border bg-card p-3.5 shadow-xs shrink-0">
            <form
              onSubmit={handleBuscar}
              className="flex flex-col gap-3.5 lg:flex-row lg:items-end justify-between"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* 1. Alcance (Dinámico: facultad) */}
                <div className="space-y-1.5 flex flex-col">
                  <Label htmlFor="alcance-select" className="text-xs font-semibold text-foreground">
                    Alcance
                  </Label>
                  <Select value={alcance} onValueChange={setAlcance}>
                    <SelectTrigger id="alcance-select" className="h-9 text-xs rounded-xl">
                      <SelectValue placeholder="Seleccione Alcance" />
                    </SelectTrigger>
                    <SearchableSelectContent>
                      <SelectItem value="facultad">Facultad</SelectItem>
                    </SearchableSelectContent>
                  </Select>
                </div>

                {/* 2. Facultad (Se lista si el alcance es facultad) */}
                <div className="space-y-1.5 flex flex-col">
                  <Label
                    htmlFor="facultad-select"
                    className="text-xs font-semibold text-foreground"
                  >
                    Facultad Objetivo
                  </Label>
                  <Select value={selectedFacultadId} onValueChange={setSelectedFacultadId}>
                    <SelectTrigger id="facultad-select" className="h-9 text-xs rounded-xl">
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

                {/* 3. Rango de Fechas */}
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-xs font-semibold text-foreground">
                    Rango de Fechas (Período)
                  </Label>
                  <DateRangePicker
                    value={dateRange}
                    onValueChange={setDateRange}
                    placeholder="Seleccione Rango de Fechas"
                    className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
                <Button
                  type="submit"
                  disabled={loading || !selectedFacultadId || !dateRange?.from || !dateRange?.to}
                  className="h-9 rounded-xl font-bold bg-[#002855] hover:bg-[#001b3a] text-white flex items-center justify-center gap-1.5 cursor-pointer text-xs px-4"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="w-4 h-4" />
                  )}
                  Generar Parte Mensual
                </Button>
              </div>
            </form>
          </header>

          {/* Resultados del Reporte */}
          {reporte ? (
            <ScrollArea className="flex-1 lg:min-h-0 pr-1" data-slot="monthly-report-scroll">
              <div className="space-y-4 pb-4">
                {/* 1. Resumen Informativo de lo Solicitado y Estadísticas */}
                <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="bg-muted/40 px-4 py-2.5 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      Resumen del Reporte Solicitado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <div className="p-2 bg-muted/20 border border-border/50 rounded-xl">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Alcance
                      </span>
                      <span className="text-xs font-bold text-foreground capitalize">
                        {reporte.alcance}
                      </span>
                    </div>

                    <div className="p-2 bg-muted/20 border border-border/50 rounded-xl">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Facultad
                      </span>
                      <span className="text-xs font-bold text-foreground">{reporte.objetivo}</span>
                    </div>

                    <div className="p-2 bg-muted/20 border border-border/50 rounded-xl">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Rango de Fechas
                      </span>
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {reporte.fecha_desde} / {reporte.fecha_hasta}
                      </span>
                    </div>

                    <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl">
                      <span className="text-[9px] text-amber-800 dark:text-amber-300 uppercase font-bold tracking-wider block">
                        Alertas Retrasos
                      </span>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {reporte.alertas?.retrasos?.length ?? 0} docentes
                      </span>
                    </div>

                    <div className="p-2 bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl">
                      <span className="text-[9px] text-red-800 dark:text-red-300 uppercase font-bold tracking-wider block">
                        Alertas Faltas
                      </span>
                      <span className="text-xs font-bold text-red-900 dark:text-red-200">
                        {reporte.alertas?.faltas?.length ?? 0} docentes
                      </span>
                    </div>

                    <div className="p-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl">
                      <span className="text-[9px] text-rose-800 dark:text-rose-300 uppercase font-bold tracking-wider block">
                        Inasist. Consecutivas
                      </span>
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        {reporte.alertas?.inasistencias_consecutivas?.length ?? 0} docentes
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Listado Principal de Personas (4 Secciones: Carga, Faltas, Justificaciones, Consolidado) */}
                <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="bg-muted/40 px-4 py-2 border-b border-border flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" />
                      1. Detalle por Personal y Carga Horaria Acumulada
                    </CardTitle>
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
                      {generatingPdf ? "Generando..." : "Imprimir Parte"}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[900px] w-full">
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead rowSpan={2} className="w-10 text-center">
                            N°
                          </TableHead>
                          <TableHead rowSpan={2} className="w-24 text-center">
                            Código
                          </TableHead>
                          <TableHead rowSpan={2} className="min-w-[160px]">
                            Docente / Funcionario
                          </TableHead>
                          <TableHead className="text-center font-bold text-[10px] uppercase bg-muted/60 border-l border-border">
                            Carga Horaria
                          </TableHead>
                          <TableHead
                            colSpan={3}
                            className="text-center font-bold text-[10px] uppercase bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-l border-border"
                          >
                            Faltas (Raw)
                          </TableHead>
                          <TableHead
                            colSpan={3}
                            className="text-center font-bold text-[10px] uppercase bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-l border-border"
                          >
                            Justificaciones (License)
                          </TableHead>
                          <TableHead className="text-center font-bold text-[10px] uppercase bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-l border-border">
                            Consolidado (T)
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          {/* Carga Horaria */}
                          <TableHead className="text-center w-24 text-xs font-semibold border-l border-border">
                            Carga Mens.
                          </TableHead>
                          {/* Faltas */}
                          <TableHead className="text-center w-20 text-xs font-semibold border-l border-border text-red-600">
                            Carga Falt.
                          </TableHead>
                          <TableHead className="text-center w-20 text-xs font-semibold text-amber-600">
                            Retrasos (m)
                          </TableHead>
                          <TableHead className="text-center w-20 text-xs font-semibold text-emerald-600">
                            Anticip. (m)
                          </TableHead>
                          {/* Justificaciones */}
                          <TableHead className="text-center w-20 text-xs font-semibold border-l border-border text-blue-600">
                            Carga Just.
                          </TableHead>
                          <TableHead className="text-center w-20 text-xs font-semibold text-muted-foreground">
                            Retrasos (m)
                          </TableHead>
                          <TableHead className="text-center w-20 text-xs font-semibold text-muted-foreground">
                            Anticip. (m)
                          </TableHead>
                          {/* Consolidado */}
                          <TableHead className="text-center w-24 text-xs font-semibold border-l border-border text-emerald-700">
                            Ocurr. Load
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reporte.personas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="text-center text-muted-foreground text-xs py-8"
                            >
                              No existen registros aplicables para este período y facultad.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reporte.personas.map((p, idx) => {
                            const totalCargaMensual =
                              p.asignaciones?.reduce(
                                (acc, a) => acc + (Number(a.carga_horaria_mensual) || 0),
                                0
                              ) || (p.raw?.occurrence_load ? p.raw.occurrence_load * 4 : 0)

                            const raw = p.raw || {
                              absence_load: 0,
                              delay_minutes: 0,
                              early_minutes: 0,
                            }
                            const license = p.license || {
                              absence_load: 0,
                              delay_minutes: 0,
                              early_minutes: 0,
                            }
                            const consolidated = p.consolidated || { occurrence_load: 0 }

                            return (
                              <TableRow key={p.persona_codigo} className="hover:bg-muted/10">
                                <TableCell className="text-center font-bold text-muted-foreground text-xs">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs">
                                  {p.persona_codigo}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground text-xs">
                                  {p.persona_nombres}
                                </TableCell>
                                {/* 1. Carga Horaria */}
                                <TableCell className="text-center font-mono font-bold text-xs border-l border-border/60">
                                  {totalCargaMensual} hrs
                                </TableCell>
                                {/* 2. Faltas Raw */}
                                <TableCell className="text-center font-mono text-xs font-bold text-red-600 border-l border-border/60">
                                  {raw.absence_load ?? 0}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-amber-700 font-medium">
                                  {raw.delay_minutes ?? 0}m
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-emerald-700 font-medium">
                                  {raw.early_minutes ?? 0}m
                                </TableCell>
                                {/* 3. Justificaciones */}
                                <TableCell className="text-center font-mono text-xs font-bold text-blue-600 border-l border-border/60">
                                  {license.absence_load ?? 0}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-muted-foreground font-medium">
                                  {license.delay_minutes ?? 0}m
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs text-muted-foreground font-medium">
                                  {license.early_minutes ?? 0}m
                                </TableCell>
                                {/* 4. Consolidado / T */}
                                <TableCell className="text-center font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border-l border-border/60">
                                  {consolidated.occurrence_load ?? 0}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 3. Sección de Alertas - Retrasos */}
                <Card className="border border-amber-200 bg-amber-50/5 dark:border-amber-900/40 dark:bg-amber-950/5 rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="bg-amber-100/40 dark:bg-amber-950/20 px-4 py-2.5 border-b border-amber-200 dark:border-amber-900/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                      2. Alertas: Retrasos Recurrentes (&gt; 3 retrasos)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[850px] w-full">
                      <TableHeader className="bg-amber-50/20 dark:bg-amber-950/10">
                        <TableRow>
                          <TableHead className="w-24 text-center">Código</TableHead>
                          <TableHead className="w-48">Docente</TableHead>
                          <TableHead className="w-24 text-center">Fecha</TableHead>
                          <TableHead>Materia / Grupo</TableHead>
                          <TableHead className="w-28 text-center">Horario Clase</TableHead>
                          <TableHead className="w-24 text-center">Tickeo</TableHead>
                          <TableHead className="w-24 text-center">Retraso</TableHead>
                          <TableHead className="w-24 text-center">Aula</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reporte.alertas?.retrasos || reporte.alertas.retrasos.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center text-muted-foreground text-xs py-5"
                            >
                              No se registraron alertas de retrasos en este periodo.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reporte.alertas.retrasos.map((item) => {
                            const evs = getEvidencias(item)
                            if (evs.length === 0) {
                              return (
                                <TableRow key={item.persona_codigo}>
                                  <TableCell className="text-center font-mono text-xs">
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell className="font-semibold text-foreground text-xs">
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell
                                    colSpan={6}
                                    className="text-center text-muted-foreground text-xs"
                                  >
                                    Sin detalle de incidencias registradas
                                  </TableCell>
                                </TableRow>
                              )
                            }

                            const first = evs[0]
                            const remaining = evs.slice(1)
                            const rowspan = evs.length

                            return (
                              <>
                                <TableRow
                                  key={`${item.persona_codigo}-first`}
                                  className="hover:bg-amber-50/10"
                                >
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="text-center font-mono text-xs font-semibold align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="font-bold text-foreground text-xs align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.fecha}
                                  </TableCell>
                                  <TableCell className="text-xs font-medium">
                                    {first.asignatura_nombre} ({first.asignatura_codigo}) - G:{" "}
                                    {first.grupo_nombre}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.hora_inicio} - {first.hora_fin}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.hora_ingreso_tickeo || "S/R"}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono font-bold text-amber-700">
                                    {first.minutos_retraso ?? 0} min
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.aula_codigo || "S/R"}
                                  </TableCell>
                                </TableRow>
                                {remaining.map((ev, rIdx) => (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-${rIdx}`}
                                    className="hover:bg-amber-50/10"
                                  >
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.fecha}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">
                                      {ev.asignatura_nombre} ({ev.asignatura_codigo}) - G:{" "}
                                      {ev.grupo_nombre}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.hora_inicio} - {ev.hora_fin}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.hora_ingreso_tickeo || "S/R"}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono font-bold text-amber-700">
                                      {ev.minutos_retraso ?? 0} min
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.aula_codigo || "S/R"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 4. Sección de Alertas - Faltas */}
                <Card className="border border-red-200 bg-red-50/5 dark:border-red-900/40 dark:bg-red-950/5 rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="bg-red-100/40 dark:bg-red-950/20 px-4 py-2.5 border-b border-red-200 dark:border-red-900/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-500" />
                      3. Alertas: Faltas Acumuladas (Entre 3 y 5 faltas)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[850px] w-full">
                      <TableHeader className="bg-red-50/20 dark:bg-red-950/10">
                        <TableRow>
                          <TableHead className="w-24 text-center">Código</TableHead>
                          <TableHead className="w-48">Docente</TableHead>
                          <TableHead className="w-24 text-center">Fecha</TableHead>
                          <TableHead>Materia / Grupo</TableHead>
                          <TableHead className="w-28 text-center">Horario Clase</TableHead>
                          <TableHead className="w-24 text-center">Estado</TableHead>
                          <TableHead className="w-24 text-center">Aula</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reporte.alertas?.faltas || reporte.alertas.faltas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center text-muted-foreground text-xs py-5"
                            >
                              No se registraron alertas de faltas en este periodo.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reporte.alertas.faltas.map((item) => {
                            const evs = getEvidencias(item)
                            if (evs.length === 0) {
                              return (
                                <TableRow key={item.persona_codigo}>
                                  <TableCell className="text-center font-mono text-xs">
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell className="font-semibold text-foreground text-xs">
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell
                                    colSpan={5}
                                    className="text-center text-muted-foreground text-xs"
                                  >
                                    Sin detalle de faltas registradas
                                  </TableCell>
                                </TableRow>
                              )
                            }

                            const first = evs[0]
                            const remaining = evs.slice(1)
                            const rowspan = evs.length

                            return (
                              <>
                                <TableRow
                                  key={`${item.persona_codigo}-first-fal`}
                                  className="hover:bg-red-50/10"
                                >
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="text-center font-mono text-xs font-semibold align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="font-bold text-foreground text-xs align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.fecha}
                                  </TableCell>
                                  <TableCell className="text-xs font-medium">
                                    {first.asignatura_nombre} ({first.asignatura_codigo}) - G:{" "}
                                    {first.grupo_nombre}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.hora_inicio} - {first.hora_fin}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-bold text-red-600 uppercase">
                                    FALTA
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-mono">
                                    {first.aula_codigo || "S/R"}
                                  </TableCell>
                                </TableRow>
                                {remaining.map((ev, rIdx) => (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-fal-${rIdx}`}
                                    className="hover:bg-red-50/10"
                                  >
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.fecha}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">
                                      {ev.asignatura_nombre} ({ev.asignatura_codigo}) - G:{" "}
                                      {ev.grupo_nombre}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.hora_inicio} - {ev.hora_fin}
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-bold text-red-600 uppercase">
                                      FALTA
                                    </TableCell>
                                    <TableCell className="text-center text-xs font-mono">
                                      {ev.aula_codigo || "S/R"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 5. Sección de Alertas - Inasistencias Consecutivas */}
                <Card className="border border-red-300 bg-red-100/5 dark:border-red-950/40 dark:bg-red-950/5 rounded-2xl shadow-xs overflow-hidden">
                  <CardHeader className="bg-red-200/20 dark:bg-red-950/30 px-4 py-2.5 border-b border-red-300 dark:border-red-900/40">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-900 dark:text-red-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                      4. Alertas: Inasistencias Consecutivas (Secuencia de 6 o más días)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[850px] w-full">
                      <TableHeader className="bg-red-200/10">
                        <TableRow>
                          <TableHead className="w-24 text-center">Código</TableHead>
                          <TableHead className="w-48">Docente</TableHead>
                          <TableHead className="w-44 text-center">Período</TableHead>
                          <TableHead className="w-24 text-center">Faltas Seguidas</TableHead>
                          <TableHead>
                            Evidencias de Inasistencia (Asignatura - Fecha - Hora)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reporte.alertas?.inasistencias_consecutivas ||
                        reporte.alertas.inasistencias_consecutivas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground text-xs py-5"
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
                                        reporte.fecha_desde,
                                      fecha_fin:
                                        item.fecha_fin ||
                                        item.evidencias?.[(item.evidencias?.length ?? 1) - 1]
                                          ?.fecha ||
                                        reporte.fecha_hasta,
                                      cantidad_ocurrencias:
                                        item.count || (item.evidencias?.length ?? 0),
                                      evidencias: item.evidencias || item.evidence || [],
                                    },
                                  ]
                                : [])

                            if (secuencias.length === 0) {
                              return (
                                <TableRow key={item.persona_codigo}>
                                  <TableCell className="text-center font-mono text-xs">
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell className="font-semibold text-foreground text-xs">
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell
                                    colSpan={3}
                                    className="text-center text-muted-foreground text-xs"
                                  >
                                    Sin secuencias consecutivas detectadas
                                  </TableCell>
                                </TableRow>
                              )
                            }

                            const firstSec = secuencias[0]
                            const remainingSec = secuencias.slice(1)
                            const rowspan = secuencias.length

                            return (
                              <>
                                <TableRow
                                  key={`${item.persona_codigo}-first-sec`}
                                  className="hover:bg-red-50/5"
                                >
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="text-center font-mono text-xs font-semibold align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_codigo}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={rowspan}
                                    className="font-bold text-foreground text-xs align-middle bg-card border-r border-border/50"
                                  >
                                    {item.persona_nombres}
                                  </TableCell>
                                  <TableCell className="text-center text-xs font-semibold text-foreground">
                                    Desde: {firstSec.fecha_inicio} <br /> Hasta:{" "}
                                    {firstSec.fecha_fin}
                                  </TableCell>
                                  <TableCell className="text-center font-bold text-xs text-red-700">
                                    {firstSec.cantidad_ocurrencias ??
                                      firstSec.evidencias?.length ??
                                      0}{" "}
                                    clases
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                      {firstSec.evidencias?.map((e: any, idx: number) => (
                                        <li key={idx}>
                                          <span className="font-medium text-foreground">
                                            {e.fecha}
                                          </span>
                                          : {e.asignatura_nombre} ({e.hora_inicio} - {e.hora_fin})
                                        </li>
                                      ))}
                                    </ul>
                                  </TableCell>
                                </TableRow>
                                {remainingSec.map((sec, sIdx) => (
                                  <TableRow
                                    key={`${item.persona_codigo}-rem-sec-${sIdx}`}
                                    className="hover:bg-red-50/5"
                                  >
                                    <TableCell className="text-center text-xs font-semibold text-foreground">
                                      Desde: {sec.fecha_inicio} <br /> Hasta: {sec.fecha_fin}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-xs text-red-700">
                                      {sec.cantidad_ocurrencias ?? sec.evidencias?.length ?? 0}{" "}
                                      clases
                                    </TableCell>
                                    <TableCell className="py-2 text-xs">
                                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                        {sec.evidencias?.map((e: any, idx: number) => (
                                          <li key={idx}>
                                            <span className="font-medium text-foreground">
                                              {e.fecha}
                                            </span>
                                            : {e.asignatura_nombre} ({e.hora_inicio} - {e.hora_fin})
                                          </li>
                                        ))}
                                      </ul>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10">
              <CalendarDays className="w-12 h-12 text-muted-foreground/35 mb-3" />
              <h3 className="text-base font-bold text-foreground">
                Consolidación de Partes Mensuales
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Seleccione el alcance, la facultad y el rango de fechas para generar el reporte
                oficial y consultar los cálculos de asistencia consolidados.
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
