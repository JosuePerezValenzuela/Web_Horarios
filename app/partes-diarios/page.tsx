"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import { partesApiClient, PartesApiError } from "@/shared/services/api/partesClient"
import { Select, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/ui/time-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PdfHeader } from "@/components/templates/pdf/PdfHeader"
import { PdfFooter } from "@/components/templates/pdf/PdfFooter"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Printer,
  Search,
  ClipboardCheck,
  Info,
  FileText,
  Loader2,
} from "lucide-react"

interface ReporteDetalle {
  hora_inicio: string
  hora_fin: string
  persona_nombres: string
  asignatura_nombre: string
  grupo_nombre: string
  aula_codigo: string
}

interface ParteDiarioReporte {
  fecha: string
  facultad_codigo: string
  estado: string
  campusNombre?: string
  facultadNombre: string
  detalles: ReporteDetalle[]
}

export default function PartesDiariosPage() {
  const { user } = useAuthStore()
  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()
  // Filtros del formulario
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [facultadSearch, setFacultadSearch] = useState<string>("")
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [horaInicio, setHoraInicio] = useState<string>("")
  const [horaFin, setHoraFin] = useState<string>("")

  // Estados de carga e información del reporte
  const [loading, setLoading] = useState<boolean>(false)
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false)
  const [reporteData, setReporteData] = useState<ParteDiarioReporte | null>(null)
  const [hasSearched, setHasSearched] = useState<boolean>(false)

  const selectedFacultad = facultades.find((f) => String(f.id) === selectedFacultadId)

  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  // Obtener el día de la semana en español para mostrar en el reporte
  const getNombreDia = (fechaStr: string) => {
    if (!fechaStr) return ""
    const partes = fechaStr.split("-")
    if (partes.length !== 3) return ""
    const date = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
    return date.toLocaleDateString("es-BO", { weekday: "long" })
  }

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFacultadId) {
      toast.error("Por favor, seleccione una facultad")
      return
    }
    if (!fecha) {
      toast.error("Por favor, seleccione una fecha")
      return
    }
    if ((horaInicio && !horaFin) || (!horaInicio && horaFin)) {
      toast.error("Para filtrar por hora, debe ingresar tanto la hora de inicio como la de fin")
      return
    }

    const facultad = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!facultad) return

    setLoading(true)
    setHasSearched(true)
    setReporteData(null)

    // Formatear fecha de YYYY-MM-DD a DD-MM-YYYY
    const [year, month, day] = fecha.split("-")
    const fechaFormateada = `${day}-${month}-${year}`

    try {
      let endpoint = `/partes-diarios/reporte?fecha=${fechaFormateada}&facultadCodigo=${facultad.codigo}`

      if (horaInicio && horaFin) {
        endpoint += `&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
      }

      const response = await partesApiClient.get<ParteDiarioReporte>(endpoint)
      setReporteData(response)
      toast.success("Parte diario cargado correctamente")
    } catch (error) {
      console.error("Error al cargar reporte:", error)
      const apiErr = error as PartesApiError
      if (apiErr.status === 404) {
        toast.error("No se encontró un parte diario para la facultad y fecha seleccionadas")
      } else {
        toast.error(
          apiErr.body && typeof apiErr.body === "object" && "message" in apiErr.body
            ? String(apiErr.body.message)
            : "Error al consultar el servicio de partes diarios"
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!reporteData) return

    const facultad = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!facultad) return

    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial en el servidor...")

    // Formatear fecha de YYYY-MM-DD a DD-MM-YYYY
    const [year, month, day] = fecha.split("-")
    const fechaFormateada = `${day}-${month}-${year}`

    try {
      let url = `/api/pdf/reporte-partes?fecha=${fechaFormateada}&facultadCodigo=${facultad.codigo}&facultadNombre=${encodeURIComponent(facultad.nombre)}&userName=${encodeURIComponent(user?.name || "")}`
      if (horaInicio && horaFin) {
        url += `&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "No se pudo compilar el archivo PDF en el servidor")
      }

      const blob = await res.blob()
      const fileUrl = window.URL.createObjectURL(blob)

      // 1. Abrir en pestaña nueva para previsualizar e imprimir
      window.open(fileUrl, "_blank")

      // 2. Descargar automáticamente en segundo plano
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = `parte_diario_${fechaFormateada}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("PDF generado y descargado con éxito", { id: toastId })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error(
        error instanceof Error ? error.message : "Error al procesar la exportación del PDF",
        { id: toastId }
      )
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Filtrar facultades por búsqueda local
  const filteredFacultades = facultades.filter((f) =>
    f.nombre.toLowerCase().includes(facultadSearch.toLowerCase())
  )

  // Convertir string de fecha local (YYYY-MM-DD) a objeto Date para el calendario
  const getCalendarDate = () => {
    if (!fecha) return undefined
    const parts = fecha.split("-")
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  }

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Partes Diarios" }]}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
        @media print {
          /* Habilitar colores exactos al imprimir */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ocultar toda la interfaz del frontend de la app */
          body * {
            visibility: hidden !important;
          }
          
          /* Mostrar únicamente el contenedor del PDF */
          #pdf-preview-wrapper, #pdf-preview-wrapper * {
            visibility: visible !important;
          }
          
          /* Posicionar el wrapper del PDF en el inicio absoluto de la página */
          #pdf-preview-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          
          /* Estilo para simular páginas físicas de impresión */
          .pdf-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `,
          }}
        />

        <div className="space-y-4">
          {/* Encabezado compacto */}
          <div className="no-print flex items-center justify-between border-b border-border pb-2">
            <h1 className="text-xl font-roboto font-black text-[#001B47] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-[#003770]" />
              Partes Diarios
            </h1>
          </div>

          {/* Panel de Filtros Compacto para priorizar espacio */}
          <Card className="no-print border-border/60 shadow-sm">
            <CardContent className="p-3">
              <form
                onSubmit={handleBuscar}
                className="flex flex-col md:flex-row md:items-end gap-3"
              >
                {/* Selector de Facultad */}
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Facultad
                  </label>
                  <Select
                    value={selectedFacultadId}
                    onValueChange={setSelectedFacultadId}
                    disabled={loadingFacultades}
                  >
                    <SelectTrigger className="w-full bg-background rounded-xl border border-border h-9 text-xs">
                      <SelectValue placeholder="Seleccione una facultad" />
                    </SelectTrigger>
                    <SearchableSelectContent onFilterChange={setFacultadSearch}>
                      {filteredFacultades.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SearchableSelectContent>
                  </Select>
                </div>

                {/* Fecha con Popover + Calendario */}
                <div className="w-full md:w-44 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Fecha
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-start text-left font-normal text-xs border-border hover:bg-gray-50/50 dark:hover:bg-slate-800/50 rounded-xl"
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        {fecha ? (
                          format(getCalendarDate()!, "dd 'de' MMMM, yyyy", { locale: es })
                        ) : (
                          <span className="text-muted-foreground">Elegir fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={getCalendarDate()}
                        onSelect={(date) => {
                          if (date) {
                            const formatted = date.toISOString().split("T")[0]
                            setFecha(formatted)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Rango de Horas con TimePicker */}
                <div className="w-full md:w-32 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Hora Inicio
                  </label>
                  <TimePicker
                    value={horaInicio}
                    onChange={setHoraInicio}
                    placeholder="00:00"
                    className="rounded-xl h-9"
                  />
                </div>

                <div className="w-full md:w-32 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Hora Fin
                  </label>
                  <TimePicker
                    value={horaFin}
                    onChange={setHoraFin}
                    placeholder="00:00"
                    className="rounded-xl h-9"
                  />
                </div>

                {/* Botón Buscar */}
                <div className="w-full md:w-auto">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="umss-btn-primary rounded-xl px-5 h-9 w-full text-xs font-semibold gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Buscar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Sección de resultados / Preview */}
          {loading && (
            <div className="no-print flex flex-col items-center justify-center py-10 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#002855]" />
              <p className="text-muted-foreground text-xs">Cargando reporte...</p>
            </div>
          )}

          {!loading && !reporteData && hasSearched && (
            <Card className="no-print border-dashed border-2 py-8 text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-2">
                <Info className="w-10 h-10 text-gray-400" />
                <h3 className="font-bold text-base text-gray-700">No se encontraron resultados</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  No hay clases registradas para la facultad y fecha seleccionada en este día.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && reporteData && (
            <div className="space-y-4">
              {/* Barra de Acciones del Preview */}
              <div className="no-print flex justify-between items-center bg-muted p-3 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#002855]" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Vista Previa del Parte de Asistencia
                  </span>
                  <Badge
                    variant={reporteData.estado === "confirmado" ? "default" : "secondary"}
                    className={
                      reporteData.estado === "confirmado"
                        ? "bg-green-100 text-green-800 border-green-200 text-[10px] px-2 py-0.5"
                        : "text-[10px] px-2 py-0.5"
                    }
                  >
                    {reporteData.estado.toUpperCase()}
                  </Badge>
                </div>
                <Button
                  onClick={handlePrint}
                  disabled={generatingPdf}
                  className="umss-btn-primary gap-1.5 rounded-xl h-8 text-xs px-3 disabled:opacity-75"
                >
                  {generatingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  {generatingPdf ? "Generando PDF..." : "Imprimir / PDF"}
                </Button>
              </div>

              {/* Contenedor del Preview (Estilizado como una hoja A4 de demostración) */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-2 md:p-6 rounded-xl overflow-x-auto no-print">
                <div
                  id="pdf-preview-wrapper"
                  className="bg-white text-black p-[15mm] shadow-2xl border border-gray-300 mx-auto w-[210mm] min-h-[297mm] select-none text-[11px] font-sans flex flex-col justify-between"
                >
                  <div className="flex-1 flex flex-col justify-start">
                    {/* Cabecera del Documento */}
                    <PdfHeader
                      institutionName="UNIVERSIDAD MAYOR DE SAN SIMÓN"
                      systemName="SISTEMA DE PARTES"
                      reportTitle="PARTE DIARIO DE ASISTENCIA"
                      userName={user?.name || "Administrador"}
                      fechaEmision={reporteData.fecha.split("-").reverse().join("-")}
                    />

                    {/* Sub-cabecera con metadatos del Reporte */}
                    <div className="grid grid-cols-2 gap-4 border border-gray-300 bg-gray-50/50 p-2.5 rounded-lg font-medium text-gray-700 text-[10px] mb-4">
                      <div className="space-y-1">
                        <div>
                          <span className="font-bold text-gray-900">Facultad: </span>
                          {selectedFacultad
                            ? `${selectedFacultad.nombre} (${selectedFacultad.codigo})`
                            : reporteData.facultadNombre || ""}
                        </div>
                        {reporteData.campusNombre && (
                          <div>
                            <span className="font-bold text-gray-900">Campus: </span>
                            {reporteData.campusNombre}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-right flex flex-col justify-center">
                        <div>
                          <span className="font-bold text-gray-900">Fecha: </span>
                          {reporteData.fecha.split("-").reverse().join("/")}
                          <span className="mx-2 text-gray-400">|</span>
                          <span className="font-bold text-gray-900">Día: </span>
                          <span className="capitalize">{getNombreDia(fecha)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabla de Firmas de Docentes (Muestra todos los registros fluidamente en pantalla) */}
                    <div className="overflow-hidden border border-gray-300 rounded-lg">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-300 text-gray-900 font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2.5 px-2 border-r border-gray-300 w-8 text-center">
                              N°
                            </th>
                            <th className="py-2.5 px-2 border-r border-gray-300 w-20 text-center">
                              Horario
                            </th>
                            <th className="py-2.5 px-2 border-r border-gray-300">Docente</th>
                            <th className="py-2.5 px-2 border-r border-gray-300">Asignatura</th>
                            <th className="py-2.5 px-2 border-r border-gray-300 w-10 text-center">
                              GP
                            </th>
                            <th className="py-2.5 px-2 border-r border-gray-300 w-14 text-center">
                              Aula
                            </th>
                            <th className="py-2.5 px-2 border-r border-gray-300 w-24 text-center">
                              Ingreso
                            </th>
                            <th className="py-2.5 px-2 border-r border-gray-300 w-24 text-center">
                              Salida
                            </th>
                            <th className="py-2.5 px-2 w-24">Obs.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {reporteData.detalles.map((detalle, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              {/* Número */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center font-mono text-gray-500">
                                {idx + 1}
                              </td>
                              {/* Horario */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center font-mono font-medium text-gray-800">
                                {detalle.hora_inicio} - {detalle.hora_fin}
                              </td>
                              {/* Docente */}
                              <td className="py-2 px-2 border-r border-gray-200 font-semibold text-gray-900">
                                {detalle.persona_nombres}
                              </td>
                              {/* Asignatura */}
                              <td className="py-2 px-2 border-r border-gray-200 text-gray-700 text-[9.5px]">
                                {detalle.asignatura_nombre}
                              </td>
                              {/* Grupo */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center font-bold text-gray-800">
                                {detalle.grupo_nombre}
                              </td>
                              {/* Aula */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center font-mono font-semibold text-gray-700">
                                {detalle.aula_codigo || "S/R"}
                              </td>
                              {/* Firma Ingreso */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center relative h-9">
                                <div className="absolute inset-x-2 bottom-1 border-b border-dotted border-gray-400"></div>
                                <span className="text-[7px] text-gray-300 absolute top-0.5 left-2 font-mono">
                                  Hora:
                                </span>
                              </td>
                              {/* Firma Salida */}
                              <td className="py-2 px-2 border-r border-gray-200 text-center relative h-9">
                                <div className="absolute inset-x-2 bottom-1 border-b border-dotted border-gray-400"></div>
                                <span className="text-[7px] text-gray-300 absolute top-0.5 left-2 font-mono">
                                  Hora:
                                </span>
                              </td>
                              {/* Observaciones */}
                              <td className="py-2 px-2 relative h-9">
                                <div className="absolute inset-x-2 bottom-1 border-b border-dotted border-gray-300"></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pie de página representativo para el preview (El PDF real calculará su paginación real) */}
                  <PdfFooter systemName="SISTEMA DE PARTES" page={1} total={1} />
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
