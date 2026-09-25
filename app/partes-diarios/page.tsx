"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useAuthStore } from "@/features/auth/application/authStore"
import { partesApiClient, PartesApiError } from "@/shared/services/api/partesClient"
import { GenerarParteDialog } from "@/features/partes-diarios/ui/GenerarParteDialog"
import { PartesReportTable } from "@/features/partes-diarios/ui/PartesReportTable"
import { PartesReportState } from "@/features/partes-diarios/ui/PartesReportState"
import { TimePicker } from "@/components/ui/time-picker"
import {
  toast,
  UmssModal,
  Button,
  Badge,
  UmssCard,
  UmssCardContent,
  Select,
  SearchableSelect,
  DatePicker,
} from "@umss/estilos-base/components"
import {
  infraService,
  Campus,
  FacultadInfra,
  Bloque,
  Ambiente,
} from "@/shared/services/api/infraClient"
import {
  Printer,
  Search,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  Save,
  Lock,
  MapPin,
} from "lucide-react"

const ALL_FILTER_VALUE = "__all__"

function parseResponseData<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[]
  }
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    if (Array.isArray(obj.items)) {
      return obj.items as T[]
    }
    if (Array.isArray(obj.data)) {
      return obj.data as T[]
    }
  }
  return []
}

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
  grupo_tipo?: string
  aula_codigo: string
  tipo_designacion?: string
  minutos_retraso: number | null
  minutos_anticipados: number | null
  falta: boolean
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
  referencia_origen?: ReferenciaOrigen | null
  observacion?: string | null
  tipo_tickeo?: string | null
  virtual?: boolean
  asignatura_tipo?: string
  detalle_partes_diarios_id?: number
  id?: number
  persona_codigo?: string
  asignatura_codigo?: string
}

interface ParteDiarioReporte {
  id?: number
  parte_id?: number
  parte_diario_id?: number
  fecha: string
  facultad_id?: number | string
  facultad_codigo?: string
  facultad_nombre?: string | null
  estado: string
  total_detalles?: number
  campusNombre?: string | null
  facultadNombre?: string | null
  detalles: ReporteDetalle[]
}

import type { GroupedRow } from "@/features/partes-diarios/ui/PartesReportTable"

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = Number(parts[0] || 0)
  const m = Number(parts[1] || 0)
  return h * 60 + m
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
      // Un registro se considera previamente guardado si tiene datos persistidos de asistencia
      // (hora_ingreso_tickeo, hora_salida_tickeo, observacion, o referencia_origen)
      const hasPersistedData = Boolean(
        first.hora_ingreso_tickeo ||
        first.hora_salida_tickeo ||
        first.observacion ||
        (first.tipo_tickeo && first.tipo_tickeo !== "presente") ||
        (first.referencia_origen !== null && first.referencia_origen !== undefined)
      )
      const alreadySaved = hasPersistedData

      // Si ya está guardado en el backend, usamos exactamente lo que tiene persistido.
      // Si es nuevo (pendiente), precargamos con el horario programado de la clase.
      const defaultIngreso = alreadySaved
        ? first.hora_ingreso_tickeo || first.referencia_origen?.horario?.hora_entrada || ""
        : first.hora_ingreso_tickeo || first.hora_inicio

      const defaultSalida = alreadySaved
        ? first.hora_salida_tickeo || first.referencia_origen?.horario?.hora_salida || ""
        : first.hora_salida_tickeo || first.hora_fin

      const defaultTipoTickeo = first.tipo_tickeo || "presente"
      const defaultObservacion = first.observacion || ""
      const defaultRetraso = first.minutos_retraso
      const defaultAnticipado = first.minutos_anticipados
      const defaultFalta = first.falta

      const ids = group
        .map((item) => item.detalle_parte_id ?? item.id ?? item.detalle_partes_diarios_id)
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
          aula_codigo: item.aula_codigo || (item.virtual ? "VIRTUAL" : "S/R"),
          virtual: Boolean(item.virtual),
        })),
        hora_ingreso_tickeo: first.hora_ingreso_tickeo ?? null,
        hora_salida_tickeo: first.hora_salida_tickeo ?? null,
        ingreso: defaultIngreso,
        salida: defaultSalida,
        retraso: defaultRetraso,
        anticipado: defaultAnticipado,
        falta: defaultFalta,
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

export default function PartesDiariosPage() {
  const { user } = useAuthStore()
  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()

  // Filtros
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [horaInicio, setHoraInicio] = useState<string>("")
  const [horaFin, setHoraFin] = useState<string>("")
  const [grupoTipo, setGrupoTipo] = useState<string>("")
  const [tipoDesignacion, setTipoDesignacion] = useState<string>("")
  const [asignaturaTipo, setAsignaturaTipo] = useState<string>("")

  // Filtros de infraestructura
  const [selectedCampusId, setSelectedCampusId] = useState<string>("")
  const [selectedBloqueId, setSelectedBloqueId] = useState<string>("")
  const [selectedAulaId, setSelectedAulaId] = useState<string>("")
  const [campusList, setCampusList] = useState<Campus[]>([])
  const [bloquesList, setBloquesList] = useState<Bloque[]>([])
  const [ambientesList, setAmbientesList] = useState<Ambiente[]>([])
  const [facultadesInfraList, setFacultadesInfraList] = useState<FacultadInfra[]>([])
  const [loadingBloques, setLoadingBloques] = useState<boolean>(false)
  const [loadingAmbientes, setLoadingAmbientes] = useState<boolean>(false)
  const [virtualFilter, setVirtualFilter] = useState<string>("false")

  // Estados de carga y datos
  const [loading, setLoading] = useState<boolean>(false)
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false)
  const [showPrintDialog, setShowPrintDialog] = useState<boolean>(false)
  const [printColumns, setPrintColumns] = useState<string>("Ambos")
  const [reporteData, setReporteData] = useState<ParteDiarioReporte | null>(null)
  const [groupedRows, setGroupedRows] = useState<GroupedRow[]>([])
  const [hasSearched, setHasSearched] = useState<boolean>(false)

  // Control del modal de generación
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)

  // Catálogo de tipos de tickeo
  const [tiposTickeo, setTiposTickeo] = useState<{ codigo: string; nombre: string }[]>([])

  // Diálogos de acción
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [showCloseDialog, setShowCloseDialog] = useState<boolean>(false)
  const [closingParte, setClosingParte] = useState<boolean>(false)

  const selectedFacultad = facultades.find((f) => String(f.id) === selectedFacultadId)
  const isClosed = reporteData?.estado === "confirmado"
  const isOptionalDisabled = !selectedFacultadId || !fecha || loading

  // Mapear la facultad seleccionada a la facultad correspondiente en el microservicio de infraestructura
  const infraFacultadId = useMemo(() => {
    if (!selectedFacultad) return undefined
    const match = facultadesInfraList.find(
      (fi) =>
        (fi.codigo && fi.codigo.toUpperCase() === selectedFacultad.codigo.toUpperCase()) ||
        (fi.nombre_corto &&
          fi.nombre_corto.toUpperCase() === selectedFacultad.codigo.toUpperCase()) ||
        fi.nombre.toLowerCase().includes(selectedFacultad.nombre.toLowerCase()) ||
        selectedFacultad.nombre.toLowerCase().includes(fi.nombre.toLowerCase())
    )
    return match ? String(match.id) : undefined
  }, [selectedFacultad, facultadesInfraList])

  useEffect(() => {
    fetchFacultades()
  }, [fetchFacultades])

  // Cargar catálogos de infraestructura iniciales (campus y facultades de infraestructura para mapeo)
  useEffect(() => {
    const loadInfra = async () => {
      try {
        const [cRes, fRes] = await Promise.all([
          infraService.getCampus(),
          infraService.getFacultades(),
        ])

        setCampusList(parseResponseData<Campus>(cRes))
        setFacultadesInfraList(parseResponseData<FacultadInfra>(fRes))
      } catch (err) {
        console.error("Error al cargar catálogos de infraestructura:", err)
      }
    }
    void loadInfra()
  }, [])

  // Cargar bloques dependientes del Campus seleccionado y la facultad de infraestructura resuelta
  useEffect(() => {
    if (!selectedCampusId) return

    let active = true

    infraService
      .getBloques(infraFacultadId, selectedCampusId)
      .then((res) => {
        if (!active) return
        setBloquesList(parseResponseData<Bloque>(res))
      })
      .catch((err) => {
        console.error("Error al cargar bloques:", err)
        if (active) setBloquesList([])
      })
      .finally(() => {
        if (active) setLoadingBloques(false)
      })

    return () => {
      active = false
    }
  }, [selectedCampusId, infraFacultadId])

  // Cargar ambientes dependientes del Bloque seleccionado
  useEffect(() => {
    if (!selectedBloqueId) return

    let active = true

    infraService
      .getAmbientes(selectedBloqueId, infraFacultadId, selectedCampusId)
      .then((res) => {
        if (!active) return
        setAmbientesList(parseResponseData<Ambiente>(res))
      })
      .catch((err) => {
        console.error("Error al cargar ambientes:", err)
        if (active) setAmbientesList([])
      })
      .finally(() => {
        if (active) setLoadingAmbientes(false)
      })

    return () => {
      active = false
    }
  }, [selectedBloqueId, infraFacultadId, selectedCampusId])

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

    try {
      const params = new URLSearchParams()
      params.append("fecha", fecha)
      params.append("facultadCodigo", facultad.codigo)

      if (horaInicio && horaFin) {
        params.append("hora_inicio", horaInicio)
        params.append("hora_fin", horaFin)
      }
      if (grupoTipo) {
        params.append("grupo_tipo", grupoTipo)
      }
      if (tipoDesignacion) {
        params.append("tipo_designacion", tipoDesignacion)
      }
      if (asignaturaTipo) {
        params.append("asignatura_tipo", asignaturaTipo)
      }
      if (virtualFilter) {
        params.append("virtual", virtualFilter)
      }
      if (selectedCampusId) {
        params.append("campus_id_geografico", selectedCampusId)
      }
      if (selectedBloqueId) {
        params.append("bloque_id_geografico", selectedBloqueId)
      }
      if (selectedAulaId) {
        params.append("aula_id", selectedAulaId)
      }

      const endpoint = `/partes-diarios/reporte?${params.toString()}`
      const response = await partesApiClient.get<ParteDiarioReporte>(endpoint)
      setReporteData(response)

      // Agrupar filas
      const grouped = groupSchedules(response.detalles)
      setGroupedRows(grouped)
    } catch (error) {
      console.error("Error al cargar reporte:", error)
      const apiErr = error as PartesApiError
      if (apiErr.status === 404) {
        setShowGenerateModal(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchReporteData()
  }

  const handlePrint = async () => {
    if (!reporteData) return

    const facultad = facultades.find((f) => String(f.id) === selectedFacultadId)
    if (!facultad) return

    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial...")

    const [year, month, day] = fecha.split("-")
    const fechaFormateada = `${day}-${month}-${year}`

    try {
      const res = await fetch("/api/pdf/reporte-partes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte: {
            ...reporteData,
            facultad_codigo: reporteData.facultad_codigo || facultad.codigo,
          },
          facultadNombre: facultad.nombre,
          userName: user?.name || "Administrador",
          printColumns,
        }),
      })

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

  // Obtener los ítems que realmente se enviarán al endpoint:
  // 1. Registros que NO se han guardado nunca (alreadySaved === false).
  // 2. Registros que ya se guardaron (alreadySaved === true) pero sufrieron modificaciones.
  const getItemsToSubmit = useCallback(() => {
    const toSubmit: GroupedRow[] = []
    groupedRows.forEach((row) => {
      const isModified =
        row.ingreso !== row.originalIngreso ||
        row.salida !== row.originalSalida ||
        row.tipo_tickeo !== row.originalTipoTickeo ||
        row.observacion !== row.originalObservacion

      if (!row.alreadySaved || isModified) {
        toSubmit.push(row)
      }
    })
    return toSubmit
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

    const itemsPayload: Record<string, unknown>[] = []
    const itemsToSubmit = getItemsToSubmit()

    itemsToSubmit.forEach((row) => {
      row.ids.forEach((detalleId) => {
        const item: Record<string, unknown> = {
          detalle_id: detalleId,
          hora_ingreso_tickeo: row.ingreso || null,
          hora_salida_tickeo: row.salida || null,
          tipo_tickeo: row.tipo_tickeo || null,
          fuente_registro: "firma_manual",
        }

        const trimmedObs = row.observacion?.trim()
        if (trimmedObs) {
          item.observacion = trimmedObs
        }

        itemsPayload.push(item)
      })
    })

    try {
      await partesApiClient.request<{
        attempted: number
        succeeded: number
        failed: number
        failed_items?: unknown[]
      }>(`/partes-diarios/${parteId}/detalles`, {
        method: "PATCH",
        body: {
          items: itemsPayload,
        },
        loadingMessage: "Guardando registro de asistencia...",
        successMessage: (data) => {
          const res = data as { attempted: number; succeeded: number; failed: number }
          if (res?.failed > 0) {
            return `Proceso completado con novedades: Se registraron exitosamente ${res.succeeded} de ${res.attempted} cambios, pero fallaron ${res.failed} registros.`
          }
          return `Se registraron exitosamente ${res?.succeeded ?? 0} de ${res?.attempted ?? 0} cambios de asistencia.`
        },
      })

      setShowSaveDialog(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al guardar asistencia:", error)
    } finally {
      setSaving(false)
    }
  }

  // Confirmar y cerrar el parte diario (pasar a Confirmado)
  const handleCloseConfirm = async () => {
    if (!reporteData) return
    const parteId = reporteData.parte_diario_id || reporteData.id || reporteData.parte_id
    if (!parteId) {
      toast.error("No se pudo identificar el ID del parte diario")
      return
    }

    setClosingParte(true)

    try {
      await partesApiClient.request(`/partes-diarios/${parteId}/confirmar`, {
        method: "PATCH",
        loadingMessage: "Cerrando el parte diario...",
        successMessage: "Parte diario cerrado y verificado correctamente",
      })

      setShowCloseDialog(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al cerrar el parte diario:", error)
    } finally {
      setClosingParte(false)
    }
  }

  const facultadOptions = useMemo(
    () => facultades.map((f) => ({ value: String(f.id), label: f.nombre })),
    [facultades]
  )

  const campusOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todos los campus" },
      ...campusList.map((c) => ({ value: String(c.id), label: c.nombre })),
    ],
    [campusList]
  )

  const bloquesOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todos los bloques" },
      ...bloquesList.map((b) => ({ value: String(b.id), label: b.nombre })),
    ],
    [bloquesList]
  )

  const ambientesOptions = useMemo(
    () =>
      ambientesList.map((a) => ({
        value: String(a.id),
        label: a.codigo || a.nombre,
      })),
    [ambientesList]
  )

  const tipoAsignaturaOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todas" },
      { value: "REGULAR", label: "Regular" },
      { value: "TALLER TITULACION", label: "Taller Titulación" },
      { value: "TALLER PRACTICO", label: "Taller Práctico" },
    ],
    []
  )

  const tipoGrupoOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todos" },
      { value: "T", label: "Teórico" },
      { value: "P", label: "Práctico" },
    ],
    []
  )

  const tipoDesignacionOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todos" },
      { value: "N", label: "Normal" },
      { value: "S", label: "Suplente" },
      { value: "A", label: "Acéfalo" },
    ],
    []
  )

  const modalidadOptions = useMemo(
    () => [
      { value: ALL_FILTER_VALUE, label: "Todas" },
      { value: "false", label: "Presencial" },
      { value: "true", label: "Virtual" },
    ],
    []
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
        disablePageScroll
        className="h-full flex flex-col p-3 md:p-4 overflow-y-auto lg:overflow-hidden"
      >
        <div className="flex flex-col h-full min-h-0 flex-1 gap-2.5 w-full max-w-full overflow-y-auto lg:overflow-hidden">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-border pb-1.5 shrink-0">
            <h1 className="text-lg md:text-xl font-roboto font-black text-[#001B47] dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#003770] dark:text-blue-400" />
              Control de Partes Diarios
            </h1>
          </div>

          {/* Panel de Filtros Compacto y Responsivo */}
          <UmssCard className="border-border/60 shadow-xs py-1.5 w-full shrink-0">
            <UmssCardContent className="p-2.5">
              <form onSubmit={handleBuscar} className="flex flex-col gap-2 w-full">
                {/* 1. Grupo de Filtros Principales y Académicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 w-full">
                  {/* 1. Selector de Facultad (Obligatorio) */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none flex items-center gap-0.5">
                      Facultad <span className="text-destructive font-bold">*</span>
                    </label>
                    <SearchableSelect
                      placeholder="Seleccione una facultad"
                      searchPlaceholder="Buscar facultad..."
                      options={facultadOptions}
                      value={selectedFacultadId}
                      onValueChange={(val) => {
                        setSelectedFacultadId(val)
                        setSelectedBloqueId("")
                        setSelectedAulaId("")
                      }}
                      disabled={loadingFacultades}
                      allOption={false}
                      height="sm"
                      className="w-full"
                    />
                  </div>

                  {/* 2. Fecha (Obligatorio) */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none flex items-center gap-0.5">
                      Fecha <span className="text-destructive font-bold">*</span>
                    </label>
                    <DatePicker
                      placeholder="Seleccione fecha"
                      value={getCalendarDate()}
                      onValueChange={(date) => {
                        if (date) {
                          setFecha(format(date, "yyyy-MM-dd"))
                        }
                      }}
                      dateFormat="dd-MM-yyyy"
                      disabled={loading}
                      className="w-full [&_button]:!min-h-9 [&_button]:!h-9 [&_button]:!py-1 [&_button]:!px-3 [&_button]:!text-xs"
                    />
                  </div>

                  {/* 3. Hora Inicio */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Hora Inicio
                    </label>
                    <TimePicker
                      value={horaInicio}
                      onChange={setHoraInicio}
                      placeholder="00:00"
                      disabled={isOptionalDisabled}
                      className="rounded-lg h-9"
                    />
                  </div>

                  {/* 4. Hora Fin */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Hora Fin
                    </label>
                    <TimePicker
                      value={horaFin}
                      onChange={setHoraFin}
                      placeholder="00:00"
                      disabled={isOptionalDisabled}
                      className="rounded-lg h-9"
                    />
                  </div>

                  {/* 5. Tipo de Asignatura */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Tipo Asignatura
                    </label>
                    <Select
                      placeholder="Todas"
                      options={tipoAsignaturaOptions}
                      value={asignaturaTipo || ALL_FILTER_VALUE}
                      onValueChange={(value) =>
                        setAsignaturaTipo(value === ALL_FILTER_VALUE ? "" : value)
                      }
                      disabled={isOptionalDisabled}
                      height="sm"
                      className="w-full"
                    />
                  </div>

                  {/* 6. Tipo de Grupo */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Tipo Grupo
                    </label>
                    <Select
                      placeholder="Todos"
                      options={tipoGrupoOptions}
                      value={grupoTipo || ALL_FILTER_VALUE}
                      onValueChange={(value) =>
                        setGrupoTipo(value === ALL_FILTER_VALUE ? "" : value)
                      }
                      disabled={isOptionalDisabled}
                      height="sm"
                      className="w-full"
                    />
                  </div>

                  {/* 7. Tipo de Designación */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Tipo Designación
                    </label>
                    <Select
                      placeholder="Todos"
                      options={tipoDesignacionOptions}
                      value={tipoDesignacion || ALL_FILTER_VALUE}
                      onValueChange={(value) =>
                        setTipoDesignacion(value === ALL_FILTER_VALUE ? "" : value)
                      }
                      disabled={isOptionalDisabled}
                      height="sm"
                      className="w-full"
                    />
                  </div>

                  {/* 8. Modalidad */}
                  <div className="space-y-1.5 min-w-0">
                    <label
                      className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                        isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Modalidad
                    </label>
                    <Select
                      placeholder="Todas"
                      options={modalidadOptions}
                      value={virtualFilter || ALL_FILTER_VALUE}
                      onValueChange={(value) =>
                        setVirtualFilter(value === ALL_FILTER_VALUE ? "" : value)
                      }
                      disabled={isOptionalDisabled}
                      height="sm"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* 2. Fila Inferior: Filtros Geográficos (Izquierda) + Botones de Acción (Derecha) */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-2.5 pt-2 border-t border-border/50 w-full">
                  {/* Lado Izquierdo: Filtros Geográficos */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[#003770] dark:text-blue-400 shrink-0" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Filtros Geográficos (Ubicación física / Infraestructura)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-end gap-2.5">
                      {/* Campus Geográfico */}
                      <div className="space-y-1.5 min-w-[140px] sm:w-48">
                        <label
                          className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                            isOptionalDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          Campus Geográfico
                        </label>
                        <Select
                          placeholder="Todos los campus"
                          options={campusOptions}
                          value={selectedCampusId || ALL_FILTER_VALUE}
                          onValueChange={(value) => {
                            const val = value === ALL_FILTER_VALUE ? "" : value
                            setSelectedCampusId(val)
                            setSelectedBloqueId("")
                            setSelectedAulaId("")
                            setBloquesList([])
                            setAmbientesList([])
                            if (val) setLoadingBloques(true)
                          }}
                          disabled={isOptionalDisabled}
                          height="sm"
                          className="w-full"
                        />
                      </div>

                      {/* Bloque Geográfico */}
                      <div className="space-y-1.5 min-w-[140px] sm:w-48">
                        <label
                          className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                            isOptionalDisabled || !selectedCampusId || loadingBloques
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          Bloque Geográfico
                        </label>
                        <Select
                          placeholder={loadingBloques ? "Cargando bloques..." : "Todos los bloques"}
                          options={bloquesOptions}
                          value={selectedBloqueId || ALL_FILTER_VALUE}
                          onValueChange={(value) => {
                            const val = value === ALL_FILTER_VALUE ? "" : value
                            setSelectedBloqueId(val)
                            setSelectedAulaId("")
                            setAmbientesList([])
                            if (val) setLoadingAmbientes(true)
                          }}
                          disabled={isOptionalDisabled || !selectedCampusId || loadingBloques}
                          height="sm"
                          className="w-full"
                        />
                      </div>

                      {/* Ambiente */}
                      <div className="space-y-1.5 min-w-[150px] sm:w-52">
                        <label
                          className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block ${
                            isOptionalDisabled || !selectedBloqueId || loadingAmbientes
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          Ambiente
                        </label>
                        <SearchableSelect
                          placeholder={
                            loadingAmbientes ? "Cargando ambientes..." : "Todos los ambientes"
                          }
                          searchPlaceholder="Buscar ambiente..."
                          options={ambientesOptions}
                          value={selectedAulaId}
                          onValueChange={setSelectedAulaId}
                          disabled={isOptionalDisabled || !selectedBloqueId || loadingAmbientes}
                          allOption={true}
                          allLabel="Todos los ambientes"
                          height="sm"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lado Derecho: Estado del Parte y Botones de Acción */}
                  <div className="flex flex-wrap items-center justify-end gap-2 lg:ml-auto pt-1 lg:pt-0">
                    {reporteData && (
                      <>
                        <Badge
                          variant={reporteData.estado === "confirmado" ? "neutral" : "warning"}
                          className="text-[10px] px-2.5 h-9 flex items-center font-bold tracking-wider uppercase rounded-md"
                        >
                          {reporteData.estado}
                        </Badge>

                        <Button
                          type="button"
                          onClick={() => setShowPrintDialog(true)}
                          disabled={!reporteData || generatingPdf}
                          variant="outline"
                          className="gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold border-border hover:bg-muted/70 disabled:opacity-50 cursor-pointer"
                        >
                          {generatingPdf ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Printer className="size-3.5" />
                          )}
                          {generatingPdf ? "Generando..." : "Imprimir / PDF"}
                        </Button>

                        <Button
                          type="button"
                          onClick={() => setShowCloseDialog(true)}
                          disabled={loading || isClosed}
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="size-3.5" />
                          Cerrar Parte
                        </Button>

                        <Button
                          type="button"
                          onClick={handleSaveClick}
                          disabled={loading || isClosed}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="size-3.5" />
                          Guardar Asistencia
                        </Button>
                      </>
                    )}

                    {/* Botón Buscar: Siempre al extremo derecho */}
                    <Button
                      type="submit"
                      disabled={loading || !selectedFacultadId || !fecha}
                      className="rounded-lg px-4 h-9 text-xs font-semibold gap-1.5 text-white bg-[#002855] hover:bg-[#001b3a] shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}
                      Buscar
                    </Button>
                  </div>
                </div>
              </form>
            </UmssCardContent>
          </UmssCard>

          {/* Estados iniciales: sin búsqueda o sin resultados */}
          {!loading && !reporteData && (
            <PartesReportState loading={loading} hasSearched={hasSearched} />
          )}

          {/* Grilla / Tabla principal: con variante dinámica de carga o datos reales */}
          {(loading || (reporteData && groupedRows.length > 0)) && (
            <div className="w-full max-w-full flex-1 min-h-[350px] lg:min-h-0 overflow-hidden flex flex-col">
              <PartesReportTable
                rows={groupedRows}
                tiposTickeo={tiposTickeo}
                onRowChange={handleRowChange}
                isClosed={isClosed}
                loading={loading}
              />
            </div>
          )}
        </div>

        <GenerarParteDialog
          open={showGenerateModal}
          onOpenChange={setShowGenerateModal}
          facultadCodigo={selectedFacultad?.codigo}
          facultadNombre={selectedFacultad?.nombre}
          fecha={fecha}
          onGenerated={fetchReporteData}
        />

        <UmssModal
          isOpen={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
          title="Configurar Impresión / Exportación PDF"
          size="lg"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowPrintDialog(false)}
                disabled={generatingPdf}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowPrintDialog(false)
                  void handlePrint()
                }}
                disabled={generatingPdf}
                className="rounded-xl text-white bg-[#002855] hover:bg-[#001b3a]"
              >
                Generar PDF
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Revise o ajuste los filtros de búsqueda que se aplicarán al reporte impreso. De forma
              predeterminada, se muestran los valores actualmente seleccionados en la pantalla de
              consulta.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Grupo Tipo */}
              <div className="min-w-0">
                <Select
                  label="Grupo Tipo"
                  placeholder="Todos"
                  options={tipoGrupoOptions}
                  value={grupoTipo || ALL_FILTER_VALUE}
                  onValueChange={(value) => setGrupoTipo(value === ALL_FILTER_VALUE ? "" : value)}
                  height="sm"
                  className="w-full"
                />
              </div>

              {/* 2. Tipo Designación */}
              <div className="min-w-0">
                <Select
                  label="Tipo Designación"
                  placeholder="Todos"
                  options={tipoDesignacionOptions}
                  value={tipoDesignacion || ALL_FILTER_VALUE}
                  onValueChange={(value) =>
                    setTipoDesignacion(value === ALL_FILTER_VALUE ? "" : value)
                  }
                  height="sm"
                  className="w-full"
                />
              </div>

              {/* 3. Hora Inicio */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block">
                  Hora Inicio
                </label>
                <TimePicker
                  value={horaInicio}
                  onChange={setHoraInicio}
                  placeholder="00:00"
                  className="rounded-lg h-9"
                />
              </div>

              {/* 4. Hora Fin */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block">
                  Hora Fin
                </label>
                <TimePicker
                  value={horaFin}
                  onChange={setHoraFin}
                  placeholder="00:00"
                  className="rounded-lg h-9"
                />
              </div>

              {/* 5. Campus Geográfico */}
              <div className="min-w-0">
                <Select
                  label="Campus Geográfico"
                  placeholder="Todos los campus"
                  options={campusOptions}
                  value={selectedCampusId || ALL_FILTER_VALUE}
                  onValueChange={(value) => {
                    setSelectedCampusId(value === ALL_FILTER_VALUE ? "" : value)
                    setSelectedBloqueId("")
                    setSelectedAulaId("")
                  }}
                  height="sm"
                  className="w-full"
                />
              </div>

              {/* 6. Bloque Geográfico */}
              <div className="min-w-0">
                <Select
                  label="Bloque Geográfico"
                  placeholder={loadingBloques ? "Cargando bloques..." : "Todos los bloques"}
                  options={bloquesOptions}
                  value={selectedBloqueId || ALL_FILTER_VALUE}
                  onValueChange={(value) => {
                    setSelectedBloqueId(value === ALL_FILTER_VALUE ? "" : value)
                    setSelectedAulaId("")
                  }}
                  disabled={!selectedCampusId || loadingBloques}
                  height="sm"
                  className="w-full"
                />
              </div>

              {/* 7. Columnas de asistencia */}
              <div className="sm:col-span-2 border-t border-border/40 pt-3">
                <Select
                  label="Columnas de asistencia a imprimir"
                  options={[
                    { value: "Ambos", label: "Ambos" },
                    { value: "Entrada", label: "Entrada" },
                  ]}
                  value={printColumns}
                  onValueChange={setPrintColumns}
                  height="sm"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </UmssModal>

        {/* Modal de Guardado Lote Asistencia */}
        <UmssModal
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          title={
            <div className="flex items-center gap-2 text-base md:text-lg font-bold text-foreground">
              <Save className="size-5 text-emerald-600" />
              Guardar Cambios de Asistencia
            </div>
          }
          description="Se registrarán las firmas y observaciones modificadas en el sistema de partes. A continuación se listan las novedades detectadas respecto a la carga por defecto."
          size="lg"
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                disabled={saving}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfirm}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar Guardar"
                )}
              </Button>
            </div>
          }
        >
          <div className="my-2">
            {/* Advertencia si hay registros editados que ya tenían persistencia */}
            {getItemsToSubmit().some((row) => row.alreadySaved) && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <span>
                  Atención: Está intentando editar los datos de{" "}
                  <strong>{getItemsToSubmit().filter((row) => row.alreadySaved).length}</strong>{" "}
                  registro
                  {getItemsToSubmit().filter((row) => row.alreadySaved).length > 1 ? "s" : ""} que
                  ya{" "}
                  {getItemsToSubmit().filter((row) => row.alreadySaved).length > 1
                    ? "fueron guardados"
                    : "fue guardado"}{" "}
                  anteriormente.
                </span>
              </div>
            )}

            {getItemsToSubmit().length === 0 ? (
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
                      <th className="px-3 py-2 w-32">Tipo Tickeo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {getItemsToSubmit().map((mRow) => {
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
        </UmssModal>

        {/* Modal de Confirmar Cerrar Parte */}
        <UmssModal
          isOpen={showCloseDialog}
          onClose={() => setShowCloseDialog(false)}
          title={
            <div className="flex items-center gap-2 text-base md:text-lg font-bold text-foreground">
              <Lock className="size-5 text-amber-600" />
              Confirmar Cierre de Parte Diario
            </div>
          }
          description="¿Está seguro de que desea confirmar y cerrar este parte diario? Una vez cerrado, ningún registro de asistencia podrá ser modificado y el estado pasará a ser definitivo."
          size="md"
          footer={
            <div className="flex gap-2 justify-end w-full">
              <Button
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                disabled={closingParte}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCloseConfirm}
                disabled={closingParte}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl"
              >
                {closingParte ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cerrando...
                  </>
                ) : (
                  "Confirmar Cierre"
                )}
              </Button>
            </div>
          }
        >
          <div />
        </UmssModal>
      </AppLayout>
    </ProtectedRoute>
  )
}
