"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import { usePartesMensualesStore } from "@/features/scheduling/docentes/application/usePartesMensualesStore"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@umss/estilos-base/components"
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast, Button } from "@umss/estilos-base/components"
import {
  Search,
  Printer,
  FileText,
  AlertTriangle,
  Clock,
  UserCheck,
  CalendarDays,
  CalendarRange,
  Loader2,
} from "lucide-react"

export default function PartesMensualesPage() {
  const { facultades, fetchFacultades } = useFacultadesStore()
  const { user } = useAuthStore()
  const { reporte, loading, error, generarReporte } = usePartesMensualesStore()

  // Filtros de Búsqueda
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined)
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined)
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

    if (!selectedFacultadId) {
      toast.error("Por favor seleccione una facultad")
      return
    }
    if (!fechaDesde || !fechaHasta) {
      toast.error("Por favor seleccione ambas fechas de rango")
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

    try {
      await generarReporte({
        facultadCodigo: fac.codigo,
        fechaDesde: toLocalYmd(fechaDesde),
        fechaHasta: toLocalYmd(fechaHasta),
      })
      toast.success("Parte mensual consultado correctamente")
    } catch (err: any) {
      // Los errores ya son interceptados por partesClient, pero podemos capturar local
    }
  }

  // Generar reporte en PDF
  const handlePrint = async () => {
    if (!reporte) return
    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF horizontal...")

    try {
      const fac = facultades.find((f) => f.codigo === reporte.facultad_codigo)
      const res = await fetch("/api/pdf/reporte-mensuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte,
          userName: user?.name || "Administrador",
          facultadNombre: fac?.nombre || reporte.facultad_codigo,
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
      toast.success("Reporte generado con éxito", { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "Error al imprimir el reporte", { id: toastId })
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Generar con datos mock
  const handleMockGenerate = async () => {
    const mockReport = {
      id: 99,
      facultad_codigo: "FCYT",
      fecha_desde: "2026-05-25",
      fecha_hasta: "2026-06-22",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      personas: [
        {
          persona_codigo: "1020304",
          persona_nombres: "Lic. Carlos Valenzuela",
          carga_horaria_mensual: 64,
          minutos_retraso: 12,
          minutos_anticipados: 15,
          cantidad_retrasos: 2,
          cantidad_faltas: 1,
        },
        {
          persona_codigo: "2030405",
          persona_nombres: "Dr. Roberto Quiroga",
          carga_horaria_mensual: 48,
          minutos_retraso: 45,
          minutos_anticipados: 0,
          cantidad_retrasos: 4,
          cantidad_faltas: 3,
        },
        {
          persona_codigo: "3040506",
          persona_nombres: "Msc. Angela Rojas",
          carga_horaria_mensual: 32,
          minutos_retraso: 0,
          minutos_anticipados: 25,
          align_right: true,
          cantidad_retrasos: 0,
          cantidad_faltas: 0,
        },
      ],
      alertas: {
        retrasos: [
          {
            persona_codigo: "1020304",
            persona_nombres: "Lic. Carlos Valenzuela",
            evidencias: [
              {
                fecha: "2026-05-28",
                hora_ingreso_tickeo: "08:12",
                hora_salida_tickeo: "09:30",
                minutos_retraso: 12,
                minutos_anticipados: 0,
                falta: false,
                hora_inicio: "08:00",
                hora_fin: "09:30",
                grupo_nombre: "A",
                asignatura_codigo: "INF-111",
                asignatura_nombre: "Introducción a la Programación",
                aula_codigo: "Aula 691B",
              },
            ],
          },
          {
            persona_codigo: "2030405",
            persona_nombres: "Dr. Roberto Quiroga",
            evidencias: [
              {
                fecha: "2026-06-02",
                hora_ingreso_tickeo: "10:15",
                hora_salida_tickeo: "11:15",
                minutos_retraso: 15,
                minutos_anticipados: 0,
                falta: false,
                hora_inicio: "10:00",
                hora_fin: "11:15",
                grupo_nombre: "C",
                asignatura_codigo: "MAT-210",
                asignatura_nombre: "Algebra Lineal",
                aula_codigo: "Aula 692",
              },
            ],
          },
        ],
        faltas: [
          {
            persona_codigo: "2030405",
            persona_nombres: "Dr. Roberto Quiroga",
            evidencias: [
              {
                fecha: "2026-06-09",
                hora_ingreso_tickeo: null,
                hora_salida_tickeo: null,
                minutos_retraso: 0,
                minutos_anticipados: 0,
                falta: true,
                hora_inicio: "10:00",
                hora_fin: "11:15",
                grupo_nombre: "C",
                asignatura_codigo: "MAT-210",
                asignatura_nombre: "Algebra Lineal",
                aula_codigo: "Aula 692",
              },
            ],
          },
        ],
        inasistencias_consecutivas: [
          {
            persona_codigo: "2030405",
            persona_nombres: "Dr. Roberto Quiroga",
            secuencias: [
              {
                fecha_inicio: "2026-06-08",
                fecha_fin: "2026-06-15",
                cantidad_ocurrencias: 3,
                evidencias: [
                  {
                    fecha: "2026-06-08",
                    hora_ingreso_tickeo: null,
                    hora_salida_tickeo: null,
                    minutos_retraso: 0,
                    minutos_anticipados: 0,
                    falta: true,
                    hora_inicio: "08:00",
                    hora_fin: "09:30",
                    grupo_nombre: "B",
                    asignatura_codigo: "MAT-210",
                    asignatura_nombre: "Algebra Lineal",
                    aula_codigo: "Aula 692",
                  },
                ],
              },
            ],
          },
        ],
      },
    }

    setGeneratingPdf(true)
    const toastId = toast.loading("Generando PDF Mock horizontal...")

    try {
      const res = await fetch("/api/pdf/reporte-mensuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte: mockReport,
          userName: "Administrador (Mock)",
          facultadNombre: "FACULTAD DE CIENCIAS Y TECNOLOGÍA",
        }),
      })

      if (!res.ok) {
        throw new Error("No se pudo compilar el archivo PDF de simulación")
      }

      const blob = await res.blob()
      const fileUrl = window.URL.createObjectURL(blob)
      const printWindow = window.open(fileUrl)
      if (printWindow) {
        printWindow.focus()
      } else {
        toast.error("El navegador bloqueó la ventana emergente.")
      }
      toast.success("PDF Mock generado con éxito", { id: toastId })
    } catch (err: any) {
      toast.error(err.message || "Error", { id: toastId })
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Partes Mensuales" }]}>
        <div className="flex flex-col gap-4 lg:gap-5 w-full">
          {/* Cabecera Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 shrink-0 gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-6 h-6 text-primary" />
              <div>
                <h1 className="umss-title-h1 text-xl md:text-2xl uppercase tracking-wide">
                  Partes Mensuales de Asistencia
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Consolide y genere reportes mensuales y alertas de asistencia por facultad.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={handleMockGenerate}
                disabled={generatingPdf}
                className="h-9 rounded-xl text-xs gap-1.5 border-dashed border-amber-500 text-amber-600 hover:bg-amber-50"
              >
                <FileText className="w-4 h-4" />
                Generar PDF (Mock)
              </Button>

              {reporte && (
                <Button
                  onClick={handlePrint}
                  disabled={generatingPdf}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-umss-dark-blue hover:bg-[#001c38] text-white"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir PDF Oficial
                </Button>
              )}
            </div>
          </div>

          {/* Formulario de Filtros */}
          <header className="rounded-3xl border border-border bg-card p-4 shadow-sm shrink-0">
            <form
              onSubmit={handleBuscar}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
            >
              {/* Facultad */}
              <div className="space-y-1.5 flex flex-col">
                <Label htmlFor="facultad-select" className="text-xs font-semibold text-foreground">
                  Facultad
                </Label>
                <Select value={selectedFacultadId} onValueChange={setSelectedFacultadId}>
                  <SelectTrigger id="facultad-select" className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Seleccione Facultad" />
                  </SelectTrigger>
                  <SearchableSelectContent
                    onFilterChange={setFacultadSearch}
                    onKeyDownCapture={(e) => e.key === "Escape" && e.stopPropagation()}
                  >
                    {filteredFacultades.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nombre}
                      </SelectItem>
                    ))}
                  </SearchableSelectContent>
                </Select>
              </div>

              {/* Fecha Desde */}
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-xs font-semibold text-foreground">Fecha Desde</Label>
                <DatePicker
                  value={fechaDesde}
                  onValueChange={setFechaDesde}
                  placeholder="Válido desde"
                  className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                />
              </div>

              {/* Fecha Hasta */}
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-xs font-semibold text-foreground">Fecha Hasta</Label>
                <DatePicker
                  value={fechaHasta}
                  onValueChange={setFechaHasta}
                  placeholder="Válido hasta"
                  className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                />
              </div>

              {/* Buscar */}
              <Button
                type="submit"
                disabled={loading}
                className="h-9 rounded-xl font-bold bg-umss-dark-blue hover:bg-[#001c38] text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                CONSULTAR REPORTE
              </Button>
            </form>
          </header>

          {/* Resultados del Reporte */}
          {reporte ? (
            <div className="space-y-6">
              {/* Resumen Informativo */}
              <Card className="border border-border/80 bg-card rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 p-4 border-b border-border">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Detalles del Parte Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/20 border border-border/40 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Facultad Evaluada
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {reporte.facultad_codigo}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/40 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Intervalo de Vigencia
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {reporte.fecha_desde} al {reporte.fecha_hasta}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/40 rounded-xl">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                      Docentes Consolidados
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {reporte.personas.length} funcionarios
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Listado Principal de Personas */}
              <Card className="border border-border/80 bg-card rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 p-4 border-b border-border">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Cargas Horarias y Asistencias Consolidadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-12 text-center">N°</TableHead>
                        <TableHead className="w-28 text-center">Código</TableHead>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead className="text-center w-28">Carga Mensual</TableHead>
                        <TableHead className="text-center w-28">Minutos Retraso</TableHead>
                        <TableHead className="text-center w-28">Minutos Ant.</TableHead>
                        <TableHead className="text-center w-24">Retrasos</TableHead>
                        <TableHead className="text-center w-24">Faltas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporte.personas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground text-xs py-8"
                          >
                            Sin datos consolidados de personal.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.personas.map((p, idx) => (
                          <TableRow key={p.persona_codigo} className="hover:bg-muted/10">
                            <TableCell className="text-center font-bold text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {p.persona_codigo}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {p.persona_nombres}
                            </TableCell>
                            <TableCell className="text-center font-semibold font-mono text-xs">
                              {p.carga_horaria_mensual} hrs
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs text-amber-700 font-medium">
                              {p.minutos_retraso} min
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs text-green-700 font-medium">
                              {p.minutos_anticipados} min
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {p.cantidad_retrasos}
                            </TableCell>
                            <TableCell className="text-center font-bold font-mono text-xs text-red-600">
                              {p.cantidad_faltas}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Sección de Alertas - Retrasos */}
              <Card className="border border-amber-200 bg-amber-50/5 dark:border-amber-900/40 dark:bg-amber-950/5 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-amber-100/40 dark:bg-amber-950/20 p-4 border-b border-amber-200 dark:border-amber-900/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                    Alertas: Retrasos del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-amber-50/20 dark:bg-amber-950/10">
                      <TableRow>
                        <TableHead className="w-28 text-center">Código</TableHead>
                        <TableHead>Docente</TableHead>
                        <TableHead className="w-28 text-center">Fecha</TableHead>
                        <TableHead>Materia / Grupo</TableHead>
                        <TableHead className="w-28 text-center">Horario Clase</TableHead>
                        <TableHead className="w-28 text-center">Tickeo</TableHead>
                        <TableHead className="w-28 text-center">Retraso</TableHead>
                        <TableHead className="w-28 text-center">Aula</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporte.alertas.retrasos.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No se registraron alertas de retrasos en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas.retrasos.flatMap((grupo) =>
                          grupo.evidencias.map((ev, evIdx) => (
                            <TableRow
                              key={`${grupo.persona_codigo}-ret-${ev.fecha}-${evIdx}`}
                              className="hover:bg-amber-50/10"
                            >
                              <TableCell className="text-center font-mono text-xs">
                                {grupo.persona_codigo}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {grupo.persona_nombres}
                              </TableCell>
                              <TableCell className="text-center text-xs">{ev.fecha}</TableCell>
                              <TableCell className="text-xs font-medium">
                                {ev.asignatura_nombre} (Gp: {ev.grupo_nombre})
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono">
                                {ev.hora_inicio} - {ev.hora_fin}
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono">
                                {ev.hora_ingreso_tickeo || "S/R"}
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono font-bold text-amber-700">
                                {ev.minutos_retraso} min
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono">
                                {ev.aula_codigo || "S/R"}
                              </TableCell>
                            </TableRow>
                          ))
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Sección de Alertas - Faltas */}
              <Card className="border border-red-200 bg-red-50/5 dark:border-red-900/40 dark:bg-red-950/5 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-red-100/40 dark:bg-red-950/20 p-4 border-b border-red-200 dark:border-red-900/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-500" />
                    Alertas: Faltas del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-red-50/20 dark:bg-red-950/10">
                      <TableRow>
                        <TableHead className="w-28 text-center">Código</TableHead>
                        <TableHead>Docente</TableHead>
                        <TableHead className="w-28 text-center">Fecha</TableHead>
                        <TableHead>Materia / Grupo</TableHead>
                        <TableHead className="w-28 text-center">Horario Clase</TableHead>
                        <TableHead className="w-32 text-center">Estado</TableHead>
                        <TableHead className="w-28 text-center">Aula</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporte.alertas.faltas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No se registraron alertas de faltas en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas.faltas.flatMap((grupo) =>
                          grupo.evidencias.map((ev, evIdx) => (
                            <TableRow
                              key={`${grupo.persona_codigo}-fal-${ev.fecha}-${evIdx}`}
                              className="hover:bg-red-50/10"
                            >
                              <TableCell className="text-center font-mono text-xs">
                                {grupo.persona_codigo}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {grupo.persona_nombres}
                              </TableCell>
                              <TableCell className="text-center text-xs">{ev.fecha}</TableCell>
                              <TableCell className="text-xs font-medium">
                                {ev.asignatura_nombre} (Gp: {ev.grupo_nombre})
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono">
                                {ev.hora_inicio} - {ev.hora_fin}
                              </TableCell>
                              <TableCell className="text-center text-xs font-bold text-red-600 uppercase tracking-wide">
                                FALTA
                              </TableCell>
                              <TableCell className="text-center text-xs font-mono">
                                {ev.aula_codigo || "S/R"}
                              </TableCell>
                            </TableRow>
                          ))
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Sección de Alertas - Inasistencias Consecutivas */}
              <Card className="border border-red-300 bg-red-100/5 dark:border-red-950/40 dark:bg-red-950/5 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-red-200/20 dark:bg-red-950/30 p-4 border-b border-red-300 dark:border-red-900/40">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-red-900 dark:text-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                    Alertas: Inasistencias Consecutivas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-red-200/10">
                      <TableRow>
                        <TableHead className="w-28 text-center">Código</TableHead>
                        <TableHead>Docente</TableHead>
                        <TableHead className="w-48 text-center">Período de Inasistencia</TableHead>
                        <TableHead className="w-28 text-center">Ocurrencias</TableHead>
                        <TableHead>Materias Involucradas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reporte.alertas.inasistencias_consecutivas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No hay alertas de faltas consecutivas en este periodo.
                          </TableCell>
                        </TableRow>
                      ) : (
                        reporte.alertas.inasistencias_consecutivas.flatMap((grupo) =>
                          grupo.secuencias.map((sec, secIdx) => (
                            <TableRow
                              key={`${grupo.persona_codigo}-sec-${secIdx}`}
                              className="hover:bg-red-50/5"
                            >
                              <TableCell className="text-center font-mono text-xs">
                                {grupo.persona_codigo}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {grupo.persona_nombres}
                              </TableCell>
                              <TableCell className="text-center text-xs font-semibold text-slate-700">
                                Desde: {sec.fecha_inicio} <br /> Hasta: {sec.fecha_fin}
                              </TableCell>
                              <TableCell className="text-center font-bold text-xs text-red-700">
                                {sec.cantidad_ocurrencias} clases
                              </TableCell>
                              <TableCell className="py-2.5">
                                <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                                  {sec.evidencias.map((e: any, idx: number) => (
                                    <li key={idx}>
                                      <span className="font-medium text-foreground">{e.fecha}</span>
                                      : {e.asignatura_nombre} ({e.hora_inicio} - {e.hora_fin})
                                    </li>
                                  ))}
                                </ul>
                              </TableCell>
                            </TableRow>
                          ))
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-3xl bg-muted/10">
              <CalendarDays className="w-12 h-12 text-muted-foreground/35 mb-3" />
              <h3 className="text-base font-bold text-foreground">
                Consolidación de Partes Mensuales
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Seleccione una facultad y el rango de fechas en los filtros superiores para
                consultar y consolidar el reporte oficial.
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
