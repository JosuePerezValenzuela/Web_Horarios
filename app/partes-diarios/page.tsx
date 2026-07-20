"use client"

import { useEffect, useState, memo, useCallback } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import { partesApiClient, PartesApiError } from "@/shared/services/api/partesClient"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select"
import { SearchableSelectContent } from "@/components/ui/searchable-select-content"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/ui/time-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Calendar as CalendarIcon,
  Printer,
  Search,
  ClipboardCheck,
  Info,
  FileText,
  Loader2,
  AlertCircle,
  Save,
  Lock,
} from "lucide-react"

interface ReferenciaOrigen {
  horario: {
    hora_entrada: string
    hora_salida: string
  }
  usuario: {
    nombre: string
    email: string
  }
  auditoria: {
    fecha_registro: string
    origen: string
  }
}

interface ReporteDetalle {
  detalle_parte_id: number
  hora_inicio: string
  hora_fin: string
  persona_nombres: string
  asignatura_nombre: string
  grupo_nombre: string
  aula_codigo: string
  minutos_retraso: number | null
  referencia_origen: ReferenciaOrigen | null
  observacion: string | null
  tipo_tickeo: string | null
  persona_codigo?: string
  asignatura_codigo?: string
}

interface ParteDiarioReporte {
  id?: number
  parte_id?: number
  parte_diario_id?: number
  fecha: string
  facultad_codigo: string
  estado: string
  campusNombre?: string
  facultadNombre: string
  detalles: ReporteDetalle[]
}

interface GroupedRow {
  key: string
  indices: number[]
  ids: number[]
  persona_nombres: string
  persona_codigo?: string
  hora_inicio: string
  hora_fin: string
  detalles: {
    asignatura_nombre: string
    grupo_nombre: string
    aula_codigo: string
  }[]
  // Estados editables de cada fila
  ingreso: string
  salida: string
  retraso: number
  tipo_tickeo: string
  observacion: string
  // Valores originales para comparación de cambios
  originalIngreso: string
  originalSalida: string
  originalTipoTickeo: string
  originalObservacion: string
  // Control de persistencia previa
  alreadySaved: boolean
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = Number(parts[0] || 0)
  const m = Number(parts[1] || 0)
  return h * 60 + m
}

function calculateTotalDelay(
  scheduledStart: string,
  actualStart: string,
  scheduledEnd: string,
  actualEnd: string
): number {
  const schedStartMin = parseTimeToMinutes(scheduledStart)
  const actualStartMin = parseTimeToMinutes(actualStart)
  const schedEndMin = parseTimeToMinutes(scheduledEnd)
  const actualEndMin = parseTimeToMinutes(actualEnd)

  const startDelay = Math.max(0, actualStartMin - schedStartMin)
  const endDelay = Math.max(0, schedEndMin - actualEndMin)

  return startDelay + endDelay
}

function groupSchedules(detalles: ReporteDetalle[]): GroupedRow[] {
  const itemsWithIndex = detalles.map((d, idx) => ({
    ...d,
    originalIndex: idx + 1,
  }))

  const byTeacher: Record<string, typeof itemsWithIndex> = {}
  itemsWithIndex.forEach((item) => {
    const key = item.persona_codigo || item.persona_nombres
    if (!byTeacher[key]) {
      byTeacher[key] = []
    }
    byTeacher[key].push(item)
  })

  const groupedRows: GroupedRow[] = []

  Object.entries(byTeacher).forEach(([teacherKey, list]) => {
    const sorted = [...list].sort((a, b) => {
      return parseTimeToMinutes(a.hora_inicio) - parseTimeToMinutes(b.hora_inicio)
    })

    const mergedGroups: (typeof itemsWithIndex)[] = []

    sorted.forEach((item) => {
      const start = parseTimeToMinutes(item.hora_inicio)
      const end = parseTimeToMinutes(item.hora_fin)

      let merged = false
      if (mergedGroups.length > 0) {
        const lastGroup = mergedGroups[mergedGroups.length - 1]
        const gStarts = lastGroup.map((g) => parseTimeToMinutes(g.hora_inicio))
        const gEnds = lastGroup.map((g) => parseTimeToMinutes(g.hora_fin))
        const gStart = Math.min(...gStarts)
        const gEnd = Math.max(...gEnds)

        if (start < gEnd && gStart < end) {
          lastGroup.push(item)
          merged = true
        }
      }

      if (!merged) {
        mergedGroups.push([item])
      }
    })

    mergedGroups.forEach((group) => {
      const indices = group.map((item) => item.originalIndex).sort((a, b) => a - b)
      const starts = group.map((item) => parseTimeToMinutes(item.hora_inicio))
      const ends = group.map((item) => parseTimeToMinutes(item.hora_fin))
      const minStart = Math.min(...starts)
      const maxEnd = Math.max(...ends)

      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60)
          .toString()
          .padStart(2, "0")
        const m = (mins % 60).toString().padStart(2, "0")
        return `${h}:${m}`
      }

      const hora_inicio = formatTime(minStart)
      const hora_fin = formatTime(maxEnd)

      const first = group[0]
      const alreadySaved = first.referencia_origen !== null

      const defaultIngreso = first.referencia_origen?.horario?.hora_entrada || first.hora_inicio
      const defaultSalida = first.referencia_origen?.horario?.hora_salida || first.hora_fin
      const defaultTipoTickeo = first.tipo_tickeo || "presente"
      const defaultObservacion = first.observacion || ""
      const defaultRetraso =
        typeof first.minutos_retraso === "number"
          ? first.minutos_retraso
          : calculateTotalDelay(hora_inicio, defaultIngreso, hora_fin, defaultSalida)

      const ids = group
        .map(
          (item) =>
            item.detalle_partte_id ??
            item.detalle_parte_id ??
            item.id ??
            item.detalle_partes_diarios_id
        )
        .map((val) => Number(val))
        .filter((val) => !isNaN(val) && val > 0)

      groupedRows.push({
        key: `${teacherKey}-${minStart}-${maxEnd}-${indices[0]}`,
        indices,
        ids,
        persona_nombres: first.persona_nombres,
        persona_codigo: first.persona_codigo,
        hora_inicio,
        hora_fin,
        detalles: group.map((item) => ({
          asignatura_nombre: item.asignatura_nombre,
          grupo_nombre: item.grupo_nombre,
          aula_codigo: item.aula_codigo,
        })),
        ingreso: defaultIngreso,
        salida: defaultSalida,
        retraso: defaultRetraso,
        tipo_tickeo: defaultTipoTickeo,
        observacion: defaultObservacion,
        originalIngreso: defaultIngreso,
        originalSalida: defaultSalida,
        originalTipoTickeo: defaultTipoTickeo,
        originalObservacion: defaultObservacion,
        alreadySaved,
      })
    })
  })

  return groupedRows.sort((a, b) => a.indices[0] - b.indices[0])
}

function ObservationInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [localValue, setLocalValue] = useState(value)
  const [prevValue, setPrevValue] = useState(value)

  if (value !== prevValue) {
    setLocalValue(value)
    setPrevValue(value)
  }

  return (
    <Input
      type="text"
      size="sm"
      placeholder="Escribir observación..."
      className="h-8 rounded-lg text-xs bg-background border border-border/80 shadow-sm focus-visible:ring-1 focus-visible:ring-primary w-full"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
    />
  )
}

const PartesTableRow = memo(
  ({
    row,
    tiposTickeo,
    onRowChange,
  }: {
    row: GroupedRow
    tiposTickeo: { codigo: string; nombre: string }[]
    onRowChange: (key: string, field: keyof GroupedRow, value: string) => void
  }) => {
    const isOverlap = row.detalles.length > 1

    return (
      <TableRow
        className={isOverlap ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/30" : ""}
      >
        {/* N° */}
        <TableCell className="text-center font-mono font-bold text-slate-500">
          {row.indices.join(", ")}
        </TableCell>

        {/* Horario */}
        <TableCell className="text-center font-mono font-medium whitespace-nowrap text-slate-800 dark:text-slate-200 leading-tight">
          <div>{row.hora_inicio}</div>
          <div className="text-slate-400 dark:text-slate-500 text-[10px]">↓</div>
          <div>{row.hora_fin}</div>
          <div className="flex flex-col gap-1 mt-1.5 items-center">
            {isOverlap && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none text-[8.5px] px-1 py-0.5 rounded">
                Solapado
              </Badge>
            )}
            {row.alreadySaved ? (
              row.ingreso !== row.originalIngreso ||
              row.salida !== row.originalSalida ||
              row.tipo_tickeo !== row.originalTipoTickeo ||
              row.observacion !== row.originalObservacion ? (
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none text-[8.5px] px-1 py-0.5 rounded">
                  Modificado
                </Badge>
              ) : (
                <Badge className="bg-green-600 hover:bg-green-700 text-white border-none text-[8.5px] px-1 py-0.5 rounded">
                  Registrado
                </Badge>
              )
            ) : (
              <Badge className="bg-slate-500 hover:bg-slate-600 text-white border-none text-[8.5px] px-1 py-0.5 rounded">
                Pendiente
              </Badge>
            )}
          </div>
        </TableCell>

        {/* Docente */}
        <TableCell className="font-bold text-slate-900 dark:text-white">
          {row.persona_nombres}
        </TableCell>

        {/* Asignatura */}
        <TableCell className="text-slate-700 dark:text-slate-300 text-xs">
          {row.detalles.map((d, index) => (
            <div
              key={index}
              className={
                index > 0
                  ? "border-t border-slate-200 dark:border-slate-800 pt-1 mt-1 font-semibold text-slate-900 dark:text-slate-100"
                  : "font-semibold"
              }
            >
              {d.asignatura_nombre}
            </div>
          ))}
        </TableCell>

        {/* Grupo */}
        <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200">
          {row.detalles.map((d, index) => (
            <div
              key={index}
              className={
                index > 0
                  ? "border-t border-slate-200 dark:border-slate-800 pt-1 mt-1 font-bold text-foreground"
                  : "font-bold text-foreground"
              }
            >
              {d.grupo_nombre}
            </div>
          ))}
        </TableCell>

        {/* Aula */}
        <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
          {row.detalles.map((d, index) => (
            <div
              key={index}
              className={
                index > 0
                  ? "border-t border-slate-200 dark:border-slate-800 pt-1 mt-1 font-mono"
                  : "font-mono"
              }
            >
              {d.aula_codigo || "S/R"}
            </div>
          ))}
        </TableCell>

        {/* Ingreso (editable) */}
        <TableCell className="text-center">
          <TimePicker
            value={row.ingreso}
            onChange={(val) => onRowChange(row.key, "ingreso", val)}
            className="h-8 w-24 mx-auto"
          />
        </TableCell>

        {/* Salida (editable) */}
        <TableCell className="text-center">
          <TimePicker
            value={row.salida}
            onChange={(val) => onRowChange(row.key, "salida", val)}
            className="h-8 w-24 mx-auto"
          />
        </TableCell>

        {/* Minutos Retraso */}
        <TableCell className="text-center">
          <Badge
            variant={row.retraso > 0 ? "destructive" : "secondary"}
            className="font-mono text-xs px-2 py-0.5 rounded"
          >
            {row.retraso} min
          </Badge>
        </TableCell>

        {/* Tipo Tickeo */}
        <TableCell>
          <Select
            value={row.tipo_tickeo}
            onValueChange={(val) => onRowChange(row.key, "tipo_tickeo", val)}
          >
            <SelectTrigger size="sm" className="h-8 rounded-lg text-xs w-36">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {tiposTickeo.map((t) => (
                <SelectItem key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Observación */}
        <TableCell>
          <ObservationInput
            value={row.observacion}
            onChange={(val) => onRowChange(row.key, "observacion", val)}
          />
        </TableCell>
      </TableRow>
    )
  }
)

PartesTableRow.displayName = "PartesTableRow"

export default function PartesDiariosPage() {
  const { user } = useAuthStore()
  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()

  // Filtros
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [facultadSearch, setFacultadSearch] = useState<string>("")
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [horaInicio, setHoraInicio] = useState<string>("")
  const [horaFin, setHoraFin] = useState<string>("")

  // Estados de carga y datos
  const [loading, setLoading] = useState<boolean>(false)
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false)
  const [reporteData, setReporteData] = useState<ParteDiarioReporte | null>(null)
  const [groupedRows, setGroupedRows] = useState<GroupedRow[]>([])
  const [hasSearched, setHasSearched] = useState<boolean>(false)

  // Control del modal de generación
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)
  const [generatingParte, setGeneratingParte] = useState<boolean>(false)

  // Catálogo de tipos de tickeo
  const [tiposTickeo, setTiposTickeo] = useState<{ codigo: string; nombre: string }[]>([])

  // Diálogos de acción
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)

  const selectedFacultad = facultades.find((f) => String(f.id) === selectedFacultadId)

  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  // Cargar catálogo de tipos de tickeo
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const response = await partesApiClient.get<
          { codigo: string; nombre: string; activo: boolean }[]
        >("/partes-diarios/tipos-tickeo")
        const activos = response
          .filter((t) => t.activo)
          .map((t) => ({ codigo: t.codigo, nombre: t.nombre }))
        setTiposTickeo(activos)
      } catch (error) {
        console.error("Error al cargar catálogo de tipos de tickeo:", error)
        // Fallback robusto local
        setTiposTickeo([
          { codigo: "presente", nombre: "Presente" },
          { codigo: "atraso", nombre: "Atraso" },
          { codigo: "falta", nombre: "Falta" },
          { codigo: "licencia", nombre: "Licencia" },
        ])
      }
    }
    fetchTipos()
  }, [])

  const fetchReporteData = async () => {
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
    setGroupedRows([])

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

      // Agrupar filas
      const grouped = groupSchedules(response.detalles)
      setGroupedRows(grouped)

      toast.success("Parte diario cargado correctamente")
    } catch (error) {
      console.error("Error al cargar reporte:", error)
      const apiErr = error as PartesApiError
      if (apiErr.status === 404) {
        setShowGenerateModal(true)
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

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchReporteData()
  }

  const handleGenerarParte = async () => {
    const facultad = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!facultad) return

    setGeneratingParte(true)
    const toastId = toast.loading("Generando parte diario...")

    try {
      await partesApiClient.post("/partes-diarios", {
        facultadCodigo: facultad.codigo,
        fecha: fecha,
      })

      toast.success("Parte diario generado correctamente", { id: toastId })
      setShowGenerateModal(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al generar parte diario:", error)
      const apiErr = error as PartesApiError
      toast.error(
        apiErr.body && typeof apiErr.body === "object" && "message" in apiErr.body
          ? String(apiErr.body.message)
          : "Error al generar el parte diario",
        { id: toastId }
      )
    } finally {
      setGeneratingParte(false)
    }
  }

  const handlePrint = async () => {
    if (!reporteData) return

    const facultad = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!facultad) return

    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial en el servidor...")

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

      window.open(fileUrl, "_blank")

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

  // Manejo de cambios en los inputs editables
  const handleRowChange = useCallback((key: string, field: keyof GroupedRow, value: string) => {
    setGroupedRows((prev) =>
      prev.map((row) => {
        if (row.key === key) {
          const updatedRow = { ...row, [field]: value }
          // Recalcular minutos de retraso si cambia el ingreso o la salida
          if (field === "ingreso" || field === "salida") {
            const currentIngreso = field === "ingreso" ? value : row.ingreso
            const currentSalida = field === "salida" ? value : row.salida
            updatedRow.retraso = calculateTotalDelay(
              row.hora_inicio,
              currentIngreso,
              row.hora_fin,
              currentSalida
            )
          }
          // Desseleccionar "presente" si cambia el ingreso o la salida
          if (
            (field === "ingreso" || field === "salida") &&
            updatedRow.tipo_tickeo === "presente"
          ) {
            updatedRow.tipo_tickeo = ""
          }
          return updatedRow
        }
        return row
      })
    )
  }, [])

  // Obtener solo las filas que han sido modificadas de sus valores iniciales
  const getModifiedItems = useCallback(() => {
    const modified: GroupedRow[] = []
    groupedRows.forEach((row) => {
      const isIngresoChanged = row.ingreso !== row.originalIngreso
      const isSalidaChanged = row.salida !== row.originalSalida
      const isTickeoChanged = row.tipo_tickeo !== row.originalTipoTickeo
      const isObsChanged = row.observacion !== row.originalObservacion
      if (isIngresoChanged || isSalidaChanged || isTickeoChanged || isObsChanged) {
        modified.push(row)
      }
    })
    return modified
  }, [groupedRows])

  // Obtener los ítems que realmente se enviarán al endpoint (nuevos o modificados)
  const getItemsToSubmit = useCallback(() => {
    return groupedRows.filter((row) => {
      const isModified =
        row.ingreso !== row.originalIngreso ||
        row.salida !== row.originalSalida ||
        row.tipo_tickeo !== row.originalTipoTickeo ||
        row.observacion !== row.originalObservacion
      return !row.alreadySaved || isModified
    })
  }, [groupedRows])

  // Validar y abrir diálogo de guardado
  const handleSaveClick = useCallback(() => {
    const missingTickeo = groupedRows.some((row) => !row.tipo_tickeo)
    if (missingTickeo) {
      toast.error("Debe seleccionar un Tipo de Tickeo para todos los registros antes de guardar.")
      return
    }

    const itemsToSubmit = getItemsToSubmit()
    if (itemsToSubmit.length === 0) {
      toast.info("No se detectaron nuevos registros ni modificaciones para guardar.")
      return
    }

    setShowSaveDialog(true)
  }, [groupedRows, getItemsToSubmit])

  // Registrar cambios del parte en lote
  const handleSaveConfirm = async () => {
    if (!reporteData) return
    const parteId = reporteData.parte_diario_id || reporteData.id || reporteData.parte_id
    if (!parteId) {
      toast.error("No se pudo identificar el ID del parte diario")
      return
    }

    setSaving(true)
    const toastId = toast.loading("Guardando registro de asistencia...")

    const itemsPayload: Record<string, unknown>[] = []
    const itemsToSubmit = getItemsToSubmit()

    const referencia_origen = {
      horario: {
        hora_entrada: "",
        hora_salida: "",
      },
      usuario: {
        id: user?.id || "unknown",
        nombre: user?.name || "Administrador",
        email: user?.email || "",
      },
      auditoria: {
        fecha_registro: new Date().toISOString(),
        origen: "Plataforma Web de Partes Diarias",
      },
    }

    itemsToSubmit.forEach((row) => {
      row.ids.forEach((detalleId) => {
        itemsPayload.push({
          detalle_id: detalleId,
          minutos_retraso: row.retraso,
          observacion: row.observacion || null,
          tipo_tickeo: row.tipo_tickeo || null,
          fuente_registro: "firma_manual",
          referencia_origen: {
            ...referencia_origen,
            horario: {
              hora_entrada: row.ingreso,
              hora_salida: row.salida,
            },
          },
        })
      })
    })

    try {
      const res = await partesApiClient.request<{
        attempted: number
        succeeded: number
        failed: number
        failed_items?: unknown[]
      }>(`/partes-diarios/${parteId}/detalles`, {
        method: "PATCH",
        body: {
          items: itemsPayload,
        },
      })

      if (res.failed > 0) {
        toast.error(
          `Proceso completado con novedades: Se registraron exitosamente ${res.succeeded} de ${res.attempted} cambios, pero fallaron ${res.failed} registros.`,
          { id: toastId }
        )
      } else {
        toast.success(
          `Se registraron exitosamente ${res.succeeded} de ${res.attempted} cambios de asistencia.`,
          { id: toastId }
        )
      }
      setShowSaveDialog(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al guardar asistencia:", error)
      const apiErr = error as PartesApiError
      toast.error(
        apiErr.body && typeof apiErr.body === "object" && "message" in apiErr.body
          ? String(apiErr.body.message)
          : "Error al guardar el registro de asistencia",
        { id: toastId }
      )
    } finally {
      setSaving(false)
    }
  }

  const filteredFacultades = facultades.filter((f) =>
    f.nombre.toLowerCase().includes(facultadSearch.toLowerCase())
  )

  const getCalendarDate = () => {
    if (!fecha) return undefined
    const parts = fecha.split("-")
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  }

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[{ name: "Inicio", href: "/" }, { name: "Partes Diarios" }]}
        className="pt-0 pb-0 md:pb-0"
      >
        <div className="flex flex-col h-full gap-4">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h1 className="text-xl font-roboto font-black text-[#001B47] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-[#003770]" />
              Control de Partes Diarios
            </h1>
          </div>

          {/* Panel de Filtros */}
          <Card className="border-border/60 shadow-sm py-3">
            <CardContent className="p-3">
              <form
                onSubmit={handleBuscar}
                className="flex flex-wrap items-end justify-between gap-4 w-full"
              >
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    reporteData ? "md:grid-cols-2" : "md:grid-cols-4"
                  } gap-3 flex-1 min-w-[300px]`}
                >
                  {/* Selector de Facultad */}
                  <div className="space-y-1.5 m-0 p-0">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-0.5">
                      Facultad <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedFacultadId}
                      onValueChange={setSelectedFacultadId}
                      disabled={loadingFacultades}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full bg-background rounded-xl border border-border h-9 text-xs mb-0"
                      >
                        <SelectValue placeholder="Seleccione una facultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SearchableSelectContent onFilterChange={setFacultadSearch}>
                          {filteredFacultades.map((f) => (
                            <SelectItem key={f.id} value={String(f.id)}>
                              {f.nombre}
                            </SelectItem>
                          ))}
                        </SearchableSelectContent>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5 m-0 p-0">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-0.5">
                      Fecha <span className="text-red-500">*</span>
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
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Hora Inicio (Ocultar si hay búsqueda) */}
                  {!reporteData && (
                    <div className="space-y-1.5 m-0 p-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        Hora Inicio{" "}
                        <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                      </label>
                      <TimePicker
                        value={horaInicio}
                        onChange={setHoraInicio}
                        placeholder="00:00"
                        className="rounded-xl h-9"
                      />
                    </div>
                  )}

                  {/* Hora Fin (Ocultar si hay búsqueda) */}
                  {!reporteData && (
                    <div className="space-y-1.5 m-0 p-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        Hora Fin{" "}
                        <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                      </label>
                      <TimePicker
                        value={horaFin}
                        onChange={setHoraFin}
                        placeholder="00:00"
                        className="rounded-xl h-9"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-auto justify-end m-0 p-0">
                  {reporteData && (
                    <Badge
                      variant={reporteData.estado === "confirmado" ? "default" : "secondary"}
                      className={
                        reporteData.estado === "confirmado"
                          ? "bg-green-100 text-green-800 border-green-200 text-[10px] px-2.5 py-1.5 rounded-lg dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/40"
                          : "bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-2.5 py-1.5 rounded-lg dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                      }
                    >
                      {reporteData.estado.toUpperCase()}
                    </Badge>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="umss-btn-primary rounded-xl px-4 h-9 text-xs font-semibold gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Buscar
                  </Button>

                  {reporteData && (
                    <>
                      <Button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5 rounded-xl h-9 text-xs px-4 font-semibold shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Guardar Asistencia
                      </Button>
                      <Button
                        type="button"
                        disabled={loading}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-xl h-9 text-xs px-4 font-semibold shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Cerrar Parte
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    onClick={handlePrint}
                    disabled={!reporteData || generatingPdf}
                    className="bg-[#003770] hover:bg-[#00254d] text-white gap-1.5 rounded-xl h-9 text-xs px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    {generatingPdf ? "Generando..." : "Imprimir / PDF"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Estados de carga e información */}
          {!loading && !reporteData && !hasSearched && (
            <Card className="border-dashed border-2 bg-white dark:bg-slate-900/45 flex-grow flex-shrink flex flex-col justify-center items-center rounded-xl py-6 min-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center space-y-3">
                <FileText className="w-12 h-12 text-[#003770]/60" />
                <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">
                  Control de Partes Diarios
                </h3>
                <p className="text-xs text-gray-500 text-center max-w-md">
                  Seleccione una facultad y fecha en los filtros superiores para comenzar el control
                  de firmas, retrasos y faltas de los docentes.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="border-dashed border-2 bg-white dark:bg-slate-900/45 flex-grow flex-shrink flex flex-col justify-center items-center rounded-xl py-6 min-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#003770]" />
                <p className="text-muted-foreground text-xs">Cargando horarios de clases...</p>
              </CardContent>
            </Card>
          )}

          {!loading && !reporteData && hasSearched && (
            <Card className="border-dashed border-2 bg-white dark:bg-slate-900/45 flex-grow flex-shrink flex flex-col justify-center items-center rounded-xl py-6 min-h-[300px]">
              <CardContent className="flex flex-col items-center justify-center space-y-3">
                <Info className="w-10 h-10 text-gray-400" />
                <h3 className="font-bold text-base text-gray-700 dark:text-gray-200">
                  No se encontraron resultados
                </h3>
                <p className="text-xs text-gray-500 max-w-md text-center">
                  No hay clases registradas para la facultad y fecha seleccionada.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grilla / Tabla principal */}
          {!loading && reporteData && groupedRows.length > 0 && (
            <div className="overflow-x-auto max-h-[calc(100vh-270px)] border border-border/60 rounded-xl flex-grow">
              <Table className="min-w-[1200px] w-full">
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-12 text-center font-bold">N°</TableHead>
                    <TableHead className="w-24 text-center font-bold">Horario</TableHead>
                    <TableHead className="text-center font-bold">Docente</TableHead>
                    <TableHead className="text-center font-bold">Asignatura</TableHead>
                    <TableHead className="w-16 text-center font-bold">Grupo</TableHead>
                    <TableHead className="w-20 text-center font-bold">Aula</TableHead>
                    <TableHead className="w-28 text-center font-bold">Ingreso</TableHead>
                    <TableHead className="w-28 text-center font-bold">Salida</TableHead>
                    <TableHead className="w-28 text-center font-bold">Retraso (m)</TableHead>
                    <TableHead className="w-32 text-center font-bold">Tipo Tickeo</TableHead>
                    <TableHead className="min-w-[250px] text-center font-bold">
                      Observación
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.map((row) => (
                    <PartesTableRow
                      key={row.key}
                      row={row}
                      tiposTickeo={tiposTickeo}
                      onRowChange={handleRowChange}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Modal de Generación */}
        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogContent className="sm:max-w-[425px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Parte Diario no Encontrado
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-2">
                No se generó un parte diario para la facultad{" "}
                <strong>{selectedFacultad?.nombre || selectedFacultadId}</strong> en la fecha
                seleccionada. ¿Desea proceder a generar el parte diario de asistencia?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setShowGenerateModal(false)}
                disabled={generatingParte}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerarParte}
                disabled={generatingParte}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {generatingParte ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Generar Parte"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Guardado Lote Asistencia */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="sm:max-w-[550px] bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Save className="w-5 h-5 text-green-600" />
                Guardar Cambios de Asistencia
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-2">
                Se registrarán las firmas y observaciones modificadas en el sistema de partes. A
                continuación se listan las novedades detectadas respecto a la carga por defecto.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              {/* Advertencia si hay registros editados que ya tenían persistencia */}
              {getModifiedItems().some((row) => row.alreadySaved) && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-500" />
                  <span>
                    Atención: Está intentando editar los datos de{" "}
                    <strong>{getModifiedItems().filter((row) => row.alreadySaved).length}</strong>{" "}
                    registro
                    {getModifiedItems().filter((row) => row.alreadySaved).length > 1 ? "s" : ""} que
                    ya{" "}
                    {getModifiedItems().filter((row) => row.alreadySaved).length > 1
                      ? "fueron guardados"
                      : "fue guardado"}{" "}
                    anteriormente.
                  </span>
                </div>
              )}

              {getModifiedItems().length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed rounded-xl">
                  No se realizaron cambios sobre las horas u opciones por defecto. Las firmas se
                  guardarán como &quot;Presente&quot; sin novedades.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-center w-12">N°</th>
                        <th className="px-3 py-2">Docente</th>
                        <th className="px-3 py-2 text-center w-24">Retraso</th>
                        <th className="px-3 py-2 w-32">Tipo Tickeo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getModifiedItems().map((mRow) => {
                        const tickeoNombre =
                          tiposTickeo.find((t) => t.codigo === mRow.tipo_tickeo)?.nombre ||
                          mRow.tipo_tickeo ||
                          "S/R"

                        return (
                          <tr key={mRow.key} className="hover:bg-muted/40">
                            <td className="px-3 py-2 text-center font-bold font-mono text-slate-500">
                              {mRow.indices.join(", ")}
                            </td>
                            <td className="px-3 py-2 font-semibold text-foreground">
                              <div>{mRow.persona_nombres}</div>
                              {mRow.alreadySaved && (
                                <div className="text-[10px] text-muted-foreground font-normal">
                                  Anterior: {mRow.originalIngreso} - {mRow.originalSalida} (
                                  {mRow.originalTipoTickeo})
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant={mRow.retraso > 0 ? "destructive" : "secondary"}
                                className="font-mono text-[10px] px-1.5 py-0"
                              >
                                {mRow.retraso} min
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-medium capitalize text-foreground">
                              {tickeoNombre}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfirm}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar Guardar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  )
}
