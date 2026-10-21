"use client"

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { AppLayout } from "@/components/organisms/AppLayout"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { partesDiariosApi, ApiError } from "@/shared/services/api/client"
import type {
  ParteDiarioReporte,
  RegistrarAsistenciaDetalleItem,
} from "@/features/partes-diarios/domain/types"
import { GenerarParteDialog } from "@/features/partes-diarios/ui/GenerarParteDialog"
import {
  PartesReportTable,
  isCalculoPresente,
  type GroupedRow,
} from "@/features/partes-diarios/ui/PartesReportTable"
import { PartesReportState } from "@/features/partes-diarios/ui/PartesReportState"
import {
  CrearJustificacionParteModal,
  type JustificarParteTarget,
} from "@/features/partes-diarios/ui/CrearJustificacionParteModal"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"
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
  AlertTriangle,
  Filter,
  Save,
  Lock,
  MapPin,
  Ban,
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

export interface ReporteDetalle {
  detalle_parte_id: number
  horario_id?: number
  hora_inicio: string
  hora_fin: string
  persona_nombres: string
  asignatura_nombre: string
  grupo_nombre: string
  grupo_tipo?: string
  aula_codigo?: string | null
  tipo_designacion?: string
  minutos_retraso?: number | null
  minutos_anticipados?: number | null
  minutos_anticipados_salida?: number | null
  falta?: boolean | null
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
  referencia_origen?: ReferenciaOrigen | null
  observacion?: string | null
  virtual?: boolean
  asignatura_tipo?: string
  tiene_justificacion?: boolean
  tipo_justificacion_nombre?: string | null
  estado_justificacion?: string | null
  detalle_partes_diarios_id?: number
  id?: number
  persona_codigo?: string
  asignatura_codigo?: string
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":")
  const h = Number(parts[0] || 0)
  const m = Number(parts[1] || 0)
  return h * 60 + m
}

export function groupSchedules(detalles: ReporteDetalle[]): GroupedRow[] {
  const itemsWithIndex = detalles.map((d, idx) => ({
    ...d,
    originalIndex: idx + 1,
    startMin: parseTimeToMinutes(d.hora_inicio),
    endMin: parseTimeToMinutes(d.hora_fin),
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
    const sorted = [...list].sort((a, b) => a.startMin - b.startMin)

    const mergedGroups: (typeof itemsWithIndex)[] = []
    const groupStarts: number[] = []
    const groupEnds: number[] = []

    sorted.forEach((item) => {
      const start = item.startMin
      const end = item.endMin

      let merged = false
      if (mergedGroups.length > 0) {
        const lastIdx = mergedGroups.length - 1
        const gStart = groupStarts[lastIdx]
        const gEnd = groupEnds[lastIdx]

        if (start < gEnd && gStart < end) {
          mergedGroups[lastIdx].push(item)
          groupStarts[lastIdx] = Math.min(gStart, start)
          groupEnds[lastIdx] = Math.max(gEnd, end)
          merged = true
        }
      }

      if (!merged) {
        mergedGroups.push([item])
        groupStarts.push(start)
        groupEnds.push(end)
      }
    })

    mergedGroups.forEach((group, gIdx) => {
      const indices = group.map((item) => item.originalIndex).sort((a, b) => a - b)
      const minStart = groupStarts[gIdx]
      const maxEnd = groupEnds[gIdx]

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
      // (hora_ingreso_tickeo, hora_salida_tickeo, u observacion), justificación aprobada o falta calculada/persistida.
      const hasPersistedData = Boolean(
        first.hora_ingreso_tickeo || first.hora_salida_tickeo || first.observacion
      )

      const hasJustificacion = group.some((item) => Boolean(item.tiene_justificacion))
      const tipoJustificacionNombre =
        group.find((item) => item.tipo_justificacion_nombre)?.tipo_justificacion_nombre || null
      const estadoJustificacion =
        group.find((item) => item.estado_justificacion)?.estado_justificacion || null

      const isJustificacionAprobada =
        hasJustificacion && (estadoJustificacion?.toLowerCase().startsWith("aprob") ?? false)

      const isFalta = Boolean(first.falta)

      const alreadySaved = hasPersistedData || isJustificacionAprobada || isFalta

      // Si la justificación está aprobada, no se permite editar la hora de entrada y salida,
      // poniendo no el horario ideal, sino como si no se hubiera marcado (Sin ingreso ni salida: "")
      // Si ya está guardado en el backend (o es falta), usamos exactamente lo que tiene persistido.
      // Si es nuevo (pendiente) y sin justificación aprobada ni falta, precargamos con el horario programado de la clase.
      const defaultIngreso = isJustificacionAprobada
        ? first.hora_ingreso_tickeo || ""
        : alreadySaved
          ? first.hora_ingreso_tickeo || first.referencia_origen?.horario?.hora_entrada || ""
          : first.hora_ingreso_tickeo || first.hora_inicio

      const defaultSalida = isJustificacionAprobada
        ? first.hora_salida_tickeo || ""
        : alreadySaved
          ? first.hora_salida_tickeo || first.referencia_origen?.horario?.hora_salida || ""
          : first.hora_salida_tickeo || first.hora_fin

      const defaultObservacion = first.observacion || ""
      const defaultRetraso = first.minutos_retraso ?? null
      const defaultAnticipado =
        first.minutos_anticipados_salida ?? first.minutos_anticipados ?? null
      const defaultFalta = Boolean(first.falta)

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
        horario_id: first.horario_id,
        detalles: group.map((item) => ({
          horario_id: item.horario_id,
          asignatura_nombre: item.asignatura_nombre,
          grupo_nombre: item.grupo_nombre,
          aula_codigo: item.aula_codigo || (item.virtual ? "VIRTUAL" : "S/R"),
          virtual: Boolean(item.virtual),
          tiene_justificacion: Boolean(item.tiene_justificacion),
          tipo_justificacion_nombre: item.tipo_justificacion_nombre ?? null,
          estado_justificacion: item.estado_justificacion ?? null,
        })),
        tiene_justificacion: hasJustificacion,
        tipo_justificacion_nombre: tipoJustificacionNombre,
        estado_justificacion: estadoJustificacion,
        isJustificacionAprobada,
        hora_ingreso_tickeo: first.hora_ingreso_tickeo ?? null,
        hora_salida_tickeo: first.hora_salida_tickeo ?? null,
        ingreso: defaultIngreso,
        salida: defaultSalida,
        retraso: defaultRetraso,
        anticipado: defaultAnticipado,
        falta: defaultFalta,
        observacion: defaultObservacion,
        originalIngreso: defaultIngreso,
        originalSalida: defaultSalida,
        originalObservacion: defaultObservacion,
        alreadySaved,
      })
    })
  })

  return groupedRows.sort((a, b) => a.indices[0] - b.indices[0])
}

function PartesDiariosContent() {
  const searchParams = useSearchParams()
  const { facultades, loading: loadingFacultades, fetchFacultades } = useFacultadesStore()

  // Filtros
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [fecha, setFecha] = useState<string>(() => {
    const qFecha = searchParams?.get("fecha")
    return qFecha && /^\d{4}-\d{2}-\d{2}$/.test(qFecha)
      ? qFecha
      : new Date().toISOString().split("T")[0]
  })
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
  const [infraUnavailable, setInfraUnavailable] = useState<boolean>(false)

  // Filtro de solo novedades (Cálculos Asistencia distinto a Presente)
  const [filterSoloNovedades, setFilterSoloNovedades] = useState<boolean>(false)

  // Tracking de filtros aplicados en la última búsqueda exitosa
  const [lastSearchedFilters, setLastSearchedFilters] = useState<string | null>(null)

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

  // Diálogos de acción
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [showCloseDialog, setShowCloseDialog] = useState<boolean>(false)
  const [closingParte, setClosingParte] = useState<boolean>(false)
  const [showAnularDialog, setShowAnularDialog] = useState<boolean>(false)
  const [anulandoParte, setAnulandoParte] = useState<boolean>(false)
  const [observacionAnulacion, setObservacionAnulacion] = useState<string>("")

  // Control del modal de justificación desde la fila
  const [justificarTarget, setJustificarTarget] = useState<JustificarParteTarget | null>(null)
  const [showJustificarModal, setShowJustificarModal] = useState<boolean>(false)

  const handleOpenJustificar = useCallback(
    (row: GroupedRow) => {
      const target: JustificarParteTarget = {
        horarioId: row.detalles[0]?.horario_id || row.horario_id || 0,
        docenteNombre: row.persona_nombres,
        docenteCodigo: row.persona_codigo,
        fecha: fecha,
        materia: row.detalles[0]?.asignatura_nombre,
        grupo: row.detalles[0]?.grupo_nombre,
        horaInicio: row.hora_inicio,
        horaFin: row.hora_fin,
        aulaCodigo: row.detalles[0]?.aula_codigo,
        virtual: row.detalles[0]?.virtual,
        detallesOpciones: row.detalles.map((d) => ({
          horarioId: d.horario_id || row.horario_id || 0,
          asignaturaNombre: d.asignatura_nombre,
          grupoNombre: d.grupo_nombre,
          aulaCodigo: d.aula_codigo,
          virtual: d.virtual,
        })),
      }
      setJustificarTarget(target)
      setShowJustificarModal(true)
    },
    [fecha]
  )

  // Precargar facultad si viene en query params (ej. desde el modal de partes mensuales)
  const queryFacultadId = useMemo(() => {
    if (!facultades || facultades.length === 0) return ""
    const qFacultadCodigo = searchParams?.get("facultad_codigo")
    const qFacultadId = searchParams?.get("facultad_id")

    if (qFacultadCodigo) {
      const target = facultades.find(
        (f) => f.codigo.toUpperCase() === qFacultadCodigo.trim().toUpperCase()
      )
      if (target) return String(target.id)
    } else if (qFacultadId) {
      const target = facultades.find((f) => String(f.id) === qFacultadId.trim())
      if (target) return String(target.id)
    }
    return ""
  }, [facultades, searchParams])

  const effectiveFacultadId = selectedFacultadId || queryFacultadId

  const selectedFacultad = facultades.find((f) => String(f.id) === effectiveFacultadId)
  const isClosed = reporteData ? reporteData.estado !== "borrador" : false
  const isOptionalDisabled = !effectiveFacultadId || !fecha || loading

  // Serialización de filtros de búsqueda actuales para detectar modificaciones posteriores a una búsqueda
  const currentFiltersKey = useMemo(
    () =>
      JSON.stringify({
        facultad: effectiveFacultadId,
        fecha,
        horaInicio,
        horaFin,
        grupoTipo,
        tipoDesignacion,
        asignaturaTipo,
        virtualFilter,
        campus: selectedCampusId,
        bloque: selectedBloqueId,
        aula: selectedAulaId,
      }),
    [
      effectiveFacultadId,
      fecha,
      horaInicio,
      horaFin,
      grupoTipo,
      tipoDesignacion,
      asignaturaTipo,
      virtualFilter,
      selectedCampusId,
      selectedBloqueId,
      selectedAulaId,
    ]
  )

  const filtersChanged = Boolean(
    hasSearched && lastSearchedFilters !== null && lastSearchedFilters !== currentFiltersKey
  )

  // Filas visualizadas según el filtro de solo novedades
  const displayedRows = useMemo(() => {
    if (!filterSoloNovedades) return groupedRows
    return groupedRows.filter((r) => !isCalculoPresente(r))
  }, [groupedRows, filterSoloNovedades])

  const novedadesCount = useMemo(
    () => groupedRows.filter((r) => !isCalculoPresente(r)).length,
    [groupedRows]
  )

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
        setInfraUnavailable(false)
      } catch (err) {
        console.error("Error al cargar catálogos de infraestructura:", err)
        setInfraUnavailable(true)
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
        setInfraUnavailable(false)
      })
      .catch((err) => {
        console.error("Error al cargar bloques:", err)
        if (active) {
          setBloquesList([])
          setInfraUnavailable(true)
        }
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
        setInfraUnavailable(false)
      })
      .catch((err) => {
        console.error("Error al cargar ambientes:", err)
        if (active) {
          setAmbientesList([])
          setInfraUnavailable(true)
        }
      })
      .finally(() => {
        if (active) setLoadingAmbientes(false)
      })

    return () => {
      active = false
    }
  }, [selectedBloqueId, infraFacultadId, selectedCampusId])

  const fetchReporteData = useCallback(
    async (targetFacId?: string, targetFecha?: string) => {
      const activeFacId = targetFacId || effectiveFacultadId
      const activeFecha = targetFecha || fecha

      if (!activeFacId) {
        toast.error("Por favor, seleccione una facultad")
        return
      }
      if (!activeFecha) {
        toast.error("Por favor, seleccione una fecha")
        return
      }
      if ((horaInicio && !horaFin) || (!horaInicio && horaFin)) {
        toast.error("Para filtrar por hora, debe ingresar tanto la hora de inicio como la de fin")
        return
      }

      const facultad = facultades.find((f) => String(f.id) === activeFacId)
      if (!facultad) return

      setLoading(true)
      setHasSearched(true)
      setLastSearchedFilters(
        JSON.stringify({
          facultad: activeFacId,
          fecha: activeFecha,
          horaInicio,
          horaFin,
          grupoTipo,
          tipoDesignacion,
          asignaturaTipo,
          virtualFilter,
          campus: selectedCampusId,
          bloque: selectedBloqueId,
          aula: selectedAulaId,
        })
      )
      setReporteData(null)
      setGroupedRows([])

      try {
        const response = await partesDiariosApi.consultarReporte({
          fecha: activeFecha,
          facultadCodigo: facultad.codigo,
          ...(horaInicio && horaFin ? { hora_inicio: horaInicio, hora_fin: horaFin } : {}),
          ...(grupoTipo ? { grupo_tipo: grupoTipo } : {}),
          ...(tipoDesignacion ? { tipo_designacion: tipoDesignacion } : {}),
          ...(asignaturaTipo ? { asignatura_tipo: asignaturaTipo } : {}),
          ...(virtualFilter ? { virtual: virtualFilter } : {}),
          ...(selectedCampusId && Number(selectedCampusId) > 0
            ? { campus_id_geografico: Number(selectedCampusId) }
            : {}),
          ...(selectedBloqueId && Number(selectedBloqueId) > 0
            ? { bloque_id_geografico: Number(selectedBloqueId) }
            : {}),
          ...(selectedAulaId && Number(selectedAulaId) > 0
            ? { aula_id: Number(selectedAulaId) }
            : {}),
        })
        setReporteData(response)

        // Agrupar filas
        const grouped = groupSchedules(response.detalles)
        setGroupedRows(grouped)
      } catch (error) {
        console.error("Error al cargar reporte:", error)
        const apiErr = error as ApiError
        if (apiErr.status === 404) {
          setShowGenerateModal(true)
        } else if (apiErr.status === 502) {
          setInfraUnavailable(true)
        }
      } finally {
        setLoading(false)
      }
    },
    [
      effectiveFacultadId,
      fecha,
      horaInicio,
      horaFin,
      facultades,
      grupoTipo,
      tipoDesignacion,
      asignaturaTipo,
      virtualFilter,
      selectedCampusId,
      selectedBloqueId,
      selectedAulaId,
    ]
  )

  // Ejecución automática de búsqueda cuando se recibe facultad y fecha por query params
  const hasAutoSearchedRef = useRef<boolean>(false)
  useEffect(() => {
    if (hasAutoSearchedRef.current) return
    const hasParamFacultad =
      Boolean(searchParams?.get("facultad_codigo")) || Boolean(searchParams?.get("facultad_id"))
    if (!hasParamFacultad) return
    if (!facultades || facultades.length === 0) return
    if (!queryFacultadId || !fecha) return

    hasAutoSearchedRef.current = true
    Promise.resolve().then(() => {
      void fetchReporteData(queryFacultadId, fecha)
    })
  }, [facultades, queryFacultadId, fecha, searchParams, fetchReporteData])

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchReporteData()
  }

  const handlePrint = async () => {
    if (!reporteData) return

    const facultad = facultades.find((f) => String(f.id) === effectiveFacultadId)
    if (!facultad) return

    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial...")

    const [year, month, day] = fecha.split("-")
    const fechaFormateada = `${day}-${month}-${year}`

    try {
      // Obtener datos frescos aplicando los filtros definidos para la exportación PDF
      const pdfReporteData = await partesDiariosApi.consultarReporte({
        fecha,
        facultadCodigo: facultad.codigo,
        ...(horaInicio && horaFin ? { hora_inicio: horaInicio, hora_fin: horaFin } : {}),
        ...(grupoTipo ? { grupo_tipo: grupoTipo } : {}),
        ...(tipoDesignacion ? { tipo_designacion: tipoDesignacion } : {}),
        ...(asignaturaTipo ? { asignatura_tipo: asignaturaTipo } : {}),
        ...(virtualFilter ? { virtual: virtualFilter } : {}),
        ...(!infraUnavailable && selectedCampusId && Number(selectedCampusId) > 0
          ? { campus_id_geografico: Number(selectedCampusId) }
          : {}),
        ...(!infraUnavailable && selectedBloqueId && Number(selectedBloqueId) > 0
          ? { bloque_id_geografico: Number(selectedBloqueId) }
          : {}),
        ...(!infraUnavailable && selectedAulaId && Number(selectedAulaId) > 0
          ? { aula_id: Number(selectedAulaId) }
          : {}),
      })

      const res = await fetch("/api/pdf/reporte-partes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte: {
            ...pdfReporteData,
            facultad_codigo: pdfReporteData.facultad_codigo || facultad.codigo,
          },
          facultadNombre: facultad.nombre,
          userName: "Administrador",
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
          if ((field === "ingreso" || field === "salida") && row.isJustificacionAprobada) {
            return row
          }
          return { ...row, [field]: value }
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
        row.observacion !== row.originalObservacion

      if (!row.alreadySaved || isModified) {
        toSubmit.push(row)
      }
    })
    return toSubmit
  }, [groupedRows])

  // Validar y abrir diálogo de guardado
  const handleSaveClick = useCallback(() => {
    const itemsToSubmit = getItemsToSubmit()
    if (itemsToSubmit.length === 0) {
      toast.info("No se detectaron nuevos registros ni modificaciones para guardar.")
      return
    }

    setShowSaveDialog(true)
  }, [getItemsToSubmit])

  const formatStrictHHMM = (t?: string | null): string | null => {
    if (!t) return null
    const trimmed = t.trim()
    if (!trimmed) return null
    const parts = trimmed.split(":")
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
    }
    return null
  }

  // Registrar cambios de asistencia del parte en lote
  const handleSaveConfirm = async () => {
    if (!reporteData) return
    const parteId = reporteData.parte_diario_id
    if (!parteId) {
      toast.error("No se pudo identificar el ID del parte diario")
      return
    }

    setSaving(true)
    const toastId = toast.loading("Guardando registro de asistencia...")

    const seenIds = new Set<number>()
    const detallesPayload: RegistrarAsistenciaDetalleItem[] = []
    const itemsToSubmit = getItemsToSubmit()

    itemsToSubmit.forEach((row) => {
      const ingreso = formatStrictHHMM(row.ingreso)
      const salida = formatStrictHHMM(row.salida)
      const observacion = row.observacion?.trim() || null

      row.ids.forEach((detalleId) => {
        const idNum = Number(detalleId)
        if (idNum > 0 && !seenIds.has(idNum)) {
          seenIds.add(idNum)
          detallesPayload.push({
            detalle_parte_id: idNum,
            hora_ingreso_tickeo: ingreso,
            hora_salida_tickeo: salida,
            observacion,
          })
        }
      })
    })

    if (detallesPayload.length === 0) {
      toast.info("No se detectaron detalles válidos para guardar.", { id: toastId })
      setSaving(false)
      setShowSaveDialog(false)
      return
    }

    try {
      const res = await partesDiariosApi.registrarAsistencias(parteId, {
        fuente_registro: "web",
        detalles: detallesPayload,
      })

      if (res.fallidos > 0) {
        if (res.exitosos === 0) {
          const primerMotivo = res.fallos[0]?.motivo || "No se pudo registrar la asistencia"
          toast.error(`Error: ${primerMotivo}`, { id: toastId })
        } else {
          toast.warning(
            `Se registraron ${res.exitosos} asistencias, pero fallaron ${res.fallidos} registros.`,
            { id: toastId }
          )
        }
      } else {
        toast.success(
          `Se registraron exitosamente ${res.exitosos} cambio${res.exitosos === 1 ? "" : "s"} de asistencia.`,
          { id: toastId }
        )
      }

      setShowSaveDialog(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al registrar asistencia:", error)
      toast.dismiss(toastId)
    } finally {
      setSaving(false)
    }
  }

  // Confirmar el parte diario (pasar de borrador a confirmado)
  const handleCloseConfirm = async () => {
    if (!reporteData) return
    const parteId = reporteData.parte_diario_id
    if (!parteId) {
      toast.error("No se pudo identificar el ID del parte diario")
      return
    }

    setClosingParte(true)
    const toastId = toast.loading("Confirmando el parte diario...")

    try {
      await partesDiariosApi.cambiarEstado(parteId, {
        estado: "confirmado",
      })

      toast.success("Parte diario confirmado correctamente", { id: toastId })
      setShowCloseDialog(false)
      await fetchReporteData()
    } catch (error) {
      console.error("Error al confirmar el parte diario:", error)
      toast.dismiss(toastId)
    } finally {
      setClosingParte(false)
    }
  }

  // Anular el parte diario (pasar a anulado con observación obligatoria)
  const handleAnularConfirm = async () => {
    if (!reporteData) return
    const parteId = reporteData.parte_diario_id
    if (!parteId) {
      toast.error("No se pudo identificar el ID del parte diario")
      return
    }

    const trimmedObs = observacionAnulacion.trim()
    if (!trimmedObs) {
      toast.error("Debe ingresar una observación para anular el parte diario")
      return
    }

    setAnulandoParte(true)
    const toastId = toast.loading("Anulando el parte diario...")

    try {
      await partesDiariosApi.cambiarEstado(parteId, {
        estado: "anulado",
        observacion: trimmedObs,
      })

      toast.success("Parte diario anulado correctamente", { id: toastId })
      setShowAnularDialog(false)
      setObservacionAnulacion("")
      await fetchReporteData()
    } catch (error) {
      console.error("Error al anular el parte diario:", error)
      toast.dismiss(toastId)
    } finally {
      setAnulandoParte(false)
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
                    value={effectiveFacultadId}
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
                    onValueChange={(value) => setGrupoTipo(value === ALL_FILTER_VALUE ? "" : value)}
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

              {/* 2. Fila Inferior: Filtros Geográficos y Novedades (Izquierda) + Botones de Acción (Derecha) */}
              <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-end justify-between gap-3 pt-2.5 border-t border-border/50 w-full">
                {/* Bloque Izquierdo: Ubicación Geográfica y Filtro de Novedades */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MapPin className="size-3.5 text-[#003770] dark:text-blue-400 shrink-0" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Filtros Geográficos y Control de Novedades
                    </span>
                    {infraUnavailable && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <AlertTriangle className="size-3" />
                        Infraestructura no disponible
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full">
                    {/* 1. Campus Geográfico */}
                    <div className="space-y-1.5 min-w-0">
                      <label
                        className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block truncate ${
                          isOptionalDisabled || infraUnavailable
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        Campus
                      </label>
                      <Select
                        placeholder={infraUnavailable ? "No disponible" : "Todos los campus"}
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
                        disabled={isOptionalDisabled || infraUnavailable}
                        height="sm"
                        className="w-full"
                      />
                    </div>

                    {/* 2. Bloque Geográfico */}
                    <div className="space-y-1.5 min-w-0">
                      <label
                        className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block truncate ${
                          isOptionalDisabled ||
                          !selectedCampusId ||
                          loadingBloques ||
                          infraUnavailable
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        Bloque
                      </label>
                      <Select
                        placeholder={
                          infraUnavailable
                            ? "No disponible"
                            : loadingBloques
                              ? "Cargando..."
                              : "Todos los bloques"
                        }
                        options={bloquesOptions}
                        value={selectedBloqueId || ALL_FILTER_VALUE}
                        onValueChange={(value) => {
                          const val = value === ALL_FILTER_VALUE ? "" : value
                          setSelectedBloqueId(val)
                          setSelectedAulaId("")
                          setAmbientesList([])
                          if (val) setLoadingAmbientes(true)
                        }}
                        disabled={
                          isOptionalDisabled ||
                          !selectedCampusId ||
                          loadingBloques ||
                          infraUnavailable
                        }
                        height="sm"
                        className="w-full"
                      />
                    </div>

                    {/* 3. Ambiente */}
                    <div className="space-y-1.5 min-w-0">
                      <label
                        className={`text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block truncate ${
                          isOptionalDisabled ||
                          !selectedBloqueId ||
                          loadingAmbientes ||
                          infraUnavailable
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        Ambiente
                      </label>
                      <SearchableSelect
                        placeholder={
                          infraUnavailable
                            ? "No disponible"
                            : loadingAmbientes
                              ? "Cargando..."
                              : "Todos los ambientes"
                        }
                        searchPlaceholder="Buscar ambiente..."
                        options={ambientesOptions}
                        value={selectedAulaId}
                        onValueChange={setSelectedAulaId}
                        disabled={
                          isOptionalDisabled ||
                          !selectedBloqueId ||
                          loadingAmbientes ||
                          infraUnavailable
                        }
                        allOption={true}
                        allLabel="Todos los ambientes"
                        height="sm"
                        className="w-full"
                      />
                    </div>

                    {/* 4. Filtro Asistencia distinto a Presente */}
                    <div className="space-y-1.5 min-w-0 flex flex-col justify-end">
                      <label className="text-xs font-bold uppercase tracking-wider text-umss-dark-blue dark:text-neutral-200 select-none block truncate">
                        Asistencia
                      </label>
                      <Button
                        type="button"
                        variant={filterSoloNovedades ? "primary" : "outline"}
                        onClick={() => setFilterSoloNovedades((prev) => !prev)}
                        disabled={
                          !reporteData || groupedRows.length === 0 || loading || filtersChanged
                        }
                        className={cn(
                          "h-9 w-full text-xs gap-1.5 rounded-lg px-2.5 font-semibold transition-colors border justify-between",
                          !reporteData || groupedRows.length === 0 || loading || filtersChanged
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer",
                          filterSoloNovedades
                            ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs"
                            : "border-border hover:bg-muted text-foreground/80"
                        )}
                        title="Mostrar solo registros donde Cálculos Asistencia sea distinto a Presente"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Filter className="size-3.5 shrink-0" />
                          <span className="truncate">Solo novedades</span>
                        </span>
                        {reporteData && (
                          <Badge
                            variant={filterSoloNovedades ? "neutral" : "warning"}
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 font-mono font-bold leading-none rounded-full shrink-0",
                              filterSoloNovedades
                                ? "bg-white text-amber-800 dark:bg-amber-950 dark:text-white"
                                : ""
                            )}
                          >
                            {novedadesCount}
                          </Badge>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bloque Derecho: Estado del Parte y Botones de Acción */}
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-1.5 2xl:pt-0 border-t 2xl:border-t-0 border-border/40 w-full 2xl:w-auto 2xl:ml-auto">
                  {reporteData && (
                    <>
                      <Badge
                        variant={
                          reporteData.estado === "confirmado"
                            ? "neutral"
                            : reporteData.estado === "anulado"
                              ? "destructive"
                              : "warning"
                        }
                        className={cn(
                          "text-[10px] px-2.5 h-9 flex items-center font-bold tracking-wider uppercase rounded-md shrink-0",
                          filtersChanged && "opacity-50",
                          reporteData.estado === "confirmado" &&
                            "bg-emerald-600 text-white dark:bg-emerald-700",
                          reporteData.estado === "anulado" &&
                            "bg-destructive text-destructive-foreground"
                        )}
                      >
                        {reporteData.estado}
                      </Badge>

                      <Button
                        type="button"
                        onClick={() => setShowPrintDialog(true)}
                        disabled={!reporteData || generatingPdf || loading || filtersChanged}
                        variant="outline"
                        className="gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold border-border hover:bg-muted/70 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        {generatingPdf ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Printer className="size-3.5" />
                        )}
                        {generatingPdf ? "Generando..." : "PDF"}
                      </Button>

                      {reporteData.estado === "borrador" && (
                        <Button
                          type="button"
                          onClick={() => setShowCloseDialog(true)}
                          disabled={
                            loading || closingParte || saving || anulandoParte || filtersChanged
                          }
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          <Lock className="size-3.5" />
                          Confirmar Parte
                        </Button>
                      )}

                      {(reporteData.estado === "borrador" ||
                        reporteData.estado === "confirmado") && (
                        <Button
                          type="button"
                          onClick={() => {
                            setObservacionAnulacion("")
                            setShowAnularDialog(true)
                          }}
                          disabled={
                            loading || closingParte || saving || anulandoParte || filtersChanged
                          }
                          variant="danger"
                          className="gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 text-white"
                        >
                          <Ban className="size-3.5" />
                          Anular Parte
                        </Button>
                      )}

                      {reporteData.estado === "borrador" && (
                        <Button
                          type="button"
                          onClick={handleSaveClick}
                          disabled={
                            loading || closingParte || saving || anulandoParte || filtersChanged
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg h-9 text-xs px-3.5 font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          <Save className="size-3.5" />
                          Guardar Asistencia
                        </Button>
                      )}
                    </>
                  )}

                  {/* Botón Buscar: Siempre al extremo derecho */}
                  <Button
                    type="submit"
                    disabled={loading || !effectiveFacultadId || !fecha}
                    className="rounded-lg px-4 h-9 text-xs font-semibold gap-1.5 text-white bg-[#002855] hover:bg-[#001b3a] shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
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

        {/* Grilla / Tabla principal: con variante dinámica de carga, filtros modificados o datos reales */}
        {loading ? (
          <PartesReportState loading={true} hasSearched={hasSearched} />
        ) : filtersChanged ? (
          <PartesReportState
            loading={false}
            hasSearched={hasSearched}
            filtersChanged={true}
            onBuscar={() => void fetchReporteData()}
          />
        ) : !reporteData || groupedRows.length === 0 ? (
          <PartesReportState loading={false} hasSearched={hasSearched} />
        ) : (
          <div className="w-full max-w-full flex-1 min-h-[350px] lg:min-h-0 overflow-hidden flex flex-col">
            <PartesReportTable
              rows={displayedRows}
              onRowChange={handleRowChange}
              isClosed={isClosed}
              loading={false}
              onJustificar={handleOpenJustificar}
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

      <CrearJustificacionParteModal
        isOpen={showJustificarModal}
        onClose={() => {
          setShowJustificarModal(false)
          setJustificarTarget(null)
        }}
        onSuccess={() => void fetchReporteData()}
        target={justificarTarget}
      />

      <UmssModal
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        title="Exportar a PDF"
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
            Revise o ajuste los filtros de búsqueda que se aplicarán al reporte exportado en PDF. De
            forma predeterminada, se muestran los valores actualmente seleccionados en la pantalla
            de consulta.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Hora Inicio */}
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

            {/* 1. Hora Fin */}
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

            {/* 2. Tipo Asignatura */}
            <div className="min-w-0">
              <Select
                label="Tipo Asignatura"
                placeholder="Todas"
                options={tipoAsignaturaOptions}
                value={asignaturaTipo || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  setAsignaturaTipo(value === ALL_FILTER_VALUE ? "" : value)
                }
                height="sm"
                className="w-full"
              />
            </div>

            {/* 3. Tipo Grupo */}
            <div className="min-w-0">
              <Select
                label="Tipo Grupo"
                placeholder="Todos"
                options={tipoGrupoOptions}
                value={grupoTipo || ALL_FILTER_VALUE}
                onValueChange={(value) => setGrupoTipo(value === ALL_FILTER_VALUE ? "" : value)}
                height="sm"
                className="w-full"
              />
            </div>

            {/* 4. Tipo Designación */}
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

            {!infraUnavailable && (
              <>
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
                <div className="min-w-0 sm:col-span-2">
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
              </>
            )}

            {/* 7. Columnas */}
            <div className="sm:col-span-2 border-t border-border/40 pt-3">
              <Select
                label="Columnas"
                options={[
                  { value: "Ambos", label: "Ambos" },
                  { value: "Entrada", label: "Entrada" },
                  { value: "Salida", label: "Salida" },
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
                {getItemsToSubmit().filter((row) => row.alreadySaved).length > 1 ? "s" : ""} que ya{" "}
                {getItemsToSubmit().filter((row) => row.alreadySaved).length > 1
                  ? "fueron guardados"
                  : "fue guardado"}{" "}
                anteriormente.
              </span>
            </div>
          )}

          {getItemsToSubmit().length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed rounded-xl">
              No se realizaron modificaciones sobre los registros de asistencia.
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-center w-12">N°</th>
                    <th className="px-3 py-2">Docente</th>
                    <th className="px-3 py-2 w-32">Horario a Guardar</th>
                    <th className="px-3 py-2 text-center w-28">Justificación</th>
                    <th className="px-3 py-2">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getItemsToSubmit().map((mRow) => (
                    <tr key={mRow.key} className="hover:bg-muted/40">
                      <td className="px-3 py-2 text-center font-bold font-mono text-slate-500">
                        {mRow.indices.join(", ")}
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">
                        <div>{mRow.persona_nombres}</div>
                        {mRow.alreadySaved && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            Anterior: {mRow.originalIngreso || "S/I"} -{" "}
                            {mRow.originalSalida || "S/S"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium font-mono text-xs text-foreground">
                        {mRow.ingreso || "--:--"} - {mRow.salida || "--:--"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {mRow.estado_justificacion ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <Badge
                              variant={
                                mRow.estado_justificacion === "aprobada"
                                  ? "primary"
                                  : mRow.estado_justificacion === "pendiente"
                                    ? "warning"
                                    : "neutral"
                              }
                              className={cn(
                                "text-[9px] px-1.5 py-0 font-bold uppercase rounded-md tracking-wider leading-tight",
                                mRow.estado_justificacion === "aprobada"
                                  ? "bg-green-600 text-white dark:bg-green-700"
                                  : ""
                              )}
                            >
                              {mRow.estado_justificacion}
                            </Badge>
                            {mRow.tipo_justificacion_nombre && (
                              <span
                                className="text-[9px] text-muted-foreground truncate max-w-[110px]"
                                title={mRow.tipo_justificacion_nombre}
                              >
                                {mRow.tipo_justificacion_nombre}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[150px]">
                        {mRow.observacion || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </UmssModal>

      {/* Modal de Confirmar Parte */}
      <UmssModal
        isOpen={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
        title={
          <div className="flex items-center gap-2 text-base md:text-lg font-bold text-foreground">
            <Lock className="size-5 text-amber-600" />
            Confirmar Parte Diario
          </div>
        }
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
                  Confirmando...
                </>
              ) : (
                "Confirmar Parte"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              ¿Está seguro de que desea confirmar este parte diario? Una vez confirmado, no se
              podrán modificar las asistencias, aunque podrá ser anulado posteriormente si fuera
              necesario.
            </p>
          </div>
        </div>
      </UmssModal>

      {/* Modal de Anular Parte Diario con Observación Obligatoria */}
      <UmssModal
        isOpen={showAnularDialog}
        onClose={() => setShowAnularDialog(false)}
        title={
          <div className="flex items-center gap-2 text-base md:text-lg font-bold text-destructive">
            <Ban className="size-5 text-destructive" />
            Anular Parte Diario
          </div>
        }
        size="md"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => setShowAnularDialog(false)}
              disabled={anulandoParte}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAnularConfirm}
              disabled={anulandoParte || !observacionAnulacion.trim()}
              variant="danger"
              className="font-semibold rounded-xl text-white"
            >
              {anulandoParte ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                "Anular Parte"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              La anulación de este parte diario es una acción terminal e irreversible. Se requiere
              ingresar obligatoriamente una observación o motivo de anulación.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>
                Observación / Motivo de Anulación <span className="text-destructive">*</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {observacionAnulacion.trim().length} caracteres
              </span>
            </label>
            <textarea
              rows={3}
              value={observacionAnulacion}
              onChange={(e) => setObservacionAnulacion(e.target.value)}
              placeholder="Ingrese el motivo de anulación del parte diario..."
              className="w-full text-xs rounded-xl border border-border bg-background p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>
        </div>
      </UmssModal>
    </AppLayout>
  )
}

export default function PartesDiariosPage() {
  return (
    <Suspense fallback={null}>
      <PartesDiariosContent />
    </Suspense>
  )
}
