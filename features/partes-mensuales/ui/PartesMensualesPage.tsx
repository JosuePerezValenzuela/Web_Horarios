"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { useFacultadesStore } from "@/shared/stores/catalogos/useFacultadesStore"
import { useCarrerasStore } from "@/shared/stores/catalogos/useCarrerasStore"
import {
  partesMensualesApi,
  type ReporteMensualResponse,
  type AlertaRetrasoItem,
  type AlertaFaltaItem,
  type AlertaInasistenciaConsecutivaItem,
  type AlertaOcurrenciaDetalle,
  type AlcanceReporteMensual,
  type GenerarReporteMensualRequest,
  type DraftPartItem,
  type CargaHorariaItem,
  type CargaFaltaItem,
  type CargaJustificadaItem,
  type VistaPreviaReporteMensualResponse,
  type VistaPreviaReporteMensualParams,
  calcularPeriodoMensual,
  MESES_OPTIONS,
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
import { toast, Button, UmssModal } from "@umss/estilos-base/components"
import { partesDiariosApi } from "@/shared/services/api/client"
import {
  Printer,
  AlertTriangle,
  Clock,
  UserCheck,
  CalendarRange,
  Loader2,
  FileCheck2,
  Building2,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Eye,
  ClipboardCheck,
} from "lucide-react"

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function getDiaSemana(fechaStr: string): string {
  if (!fechaStr) return "—"
  const [y, m, d] = fechaStr.split("-").map(Number)
  if (!y || !m || !d) return "—"
  const date = new Date(y, m - 1, d)
  return DIAS_SEMANA[date.getDay()] ?? "—"
}

function formatFechaHora(isoStr: string | null | undefined): string {
  if (!isoStr) return "Sin registro (Histórico)"
  try {
    const date = new Date(isoStr)
    if (isNaN(date.getTime())) return isoStr
    const pad = (n: number) => String(n).padStart(2, "0")
    const d = pad(date.getDate())
    const m = pad(date.getMonth() + 1)
    const y = date.getFullYear()
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${d}/${m}/${y} ${hh}:${mm}`
  } catch {
    return isoStr
  }
}

function formatHoraCorta(h: string | null | undefined): string {
  if (!h) return "—"
  return h.slice(0, 5)
}

export default function PartesMensualesPage() {
  const { facultades, fetchFacultades } = useFacultadesStore()
  const { carreras, fetchCarreras, loading: loadingCarreras } = useCarrerasStore()

  // Estado local de la vista previa
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaReporteMensualResponse | null>(null)
  const [loadingVistaPrevia, setLoadingVistaPrevia] = useState(false)

  // Estado local del reporte generado
  const [reporte, setReporte] = useState<ReporteMensualResponse | null>(null)
  const [loadingGeneracion, setLoadingGeneracion] = useState(false)
  const [isStaleUpdated, setIsStaleUpdated] = useState(false)

  // Filtros de Búsqueda
  const [alcance, setAlcance] = useState<AlcanceReporteMensual>("facultad")
  const [selectedFacultadId, setSelectedFacultadId] = useState<string>("")
  const [filtroFacultadId, setFiltroFacultadId] = useState<string>("all")
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [selectedMes, setSelectedMes] = useState<number>(() => new Date().getMonth() + 1)
  const [selectedAnio, setSelectedAnio] = useState<number>(() => new Date().getFullYear())
  const [facultadSearch, setFacultadSearch] = useState("")
  const [planSearch, setPlanSearch] = useState("")
  const [personasSearch, setPersonasSearch] = useState("")
  const [partesSearch, setPartesSearch] = useState("")
  const [justificacionesSearch, setJustificacionesSearch] = useState("")
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Modal de confirmación cuando existen justificaciones pendientes
  const [showJustificacionesPendientesModal, setShowJustificacionesPendientesModal] =
    useState(false)

  // Modal de partes diarios en borrador que impiden la generación
  const [showDraftPartsModal, setShowDraftPartsModal] = useState(false)
  const [draftParts, setDraftParts] = useState<DraftPartItem[]>([])
  const [closingPartsMap, setClosingPartsMap] = useState<Record<number, boolean>>({})

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

  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const aniosOptions = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => currentYear + 1 - idx),
    [currentYear]
  )

  // Período institucional calculado: del 15 del mes anterior al 15 del mes seleccionado
  const periodo = useMemo(
    () => calcularPeriodoMensual(selectedMes, selectedAnio),
    [selectedMes, selectedAnio]
  )

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

  // Métrica de partes confirmados para la vista previa
  const totalPartesConfirmadosVista = useMemo(() => {
    if (!vistaPrevia?.fechas) return 0
    return vistaPrevia.fechas.reduce(
      (acc, f) =>
        acc + (f.partes?.filter((p) => p.estado?.toLowerCase() === "confirmado")?.length || 0),
      0
    )
  }, [vistaPrevia])

  // Filtrar personas del reporte mensual por búsqueda
  const filteredPersonas = useMemo(() => {
    if (!reporte?.personas) return []
    if (!personasSearch.trim()) return reporte.personas
    const term = personasSearch.toLowerCase().trim()
    return reporte.personas.filter(
      (p) =>
        p.persona_nombres.toLowerCase().includes(term) ||
        p.persona_codigo.toLowerCase().includes(term)
    )
  }, [reporte, personasSearch])

  // Filtrar partes del reporte mensual por búsqueda
  const filteredPartes = useMemo(() => {
    if (!reporte?.partes) return []
    if (!partesSearch.trim()) return reporte.partes
    const term = partesSearch.toLowerCase().trim()
    return reporte.partes.filter(
      (p) =>
        String(p.id).includes(term) ||
        p.fecha.toLowerCase().includes(term) ||
        getDiaSemana(p.fecha).toLowerCase().includes(term) ||
        (p.fecha_confirmacion && p.fecha_confirmacion.toLowerCase().includes(term))
    )
  }, [reporte, partesSearch])

  // Filtrar justificaciones aprobadas del reporte mensual por búsqueda
  const filteredJustificaciones = useMemo(() => {
    if (!reporte?.justificaciones_aprobadas) return []
    if (!justificacionesSearch.trim()) return reporte.justificaciones_aprobadas
    const term = justificacionesSearch.toLowerCase().trim()
    return reporte.justificaciones_aprobadas.filter(
      (j) =>
        j.persona_nombre.toLowerCase().includes(term) ||
        j.persona_codigo.toLowerCase().includes(term) ||
        j.asignatura_nombre.toLowerCase().includes(term) ||
        j.grupo_nombre.toLowerCase().includes(term) ||
        j.fecha.toLowerCase().includes(term) ||
        (j.descripcion && j.descripcion.toLowerCase().includes(term))
    )
  }, [reporte, justificacionesSearch])

  const isFormValid = useMemo(() => {
    if (alcance === "todas_facultades") return true
    if (alcance === "facultad") return Boolean(selectedFacultadId)
    if (alcance === "plan_estudio") return Boolean(selectedPlanId)
    return false
  }, [alcance, selectedFacultadId, selectedPlanId])

  const handleVisualizarVistaPrevia = async (e: React.FormEvent) => {
    e.preventDefault()

    const { fecha_desde, fecha_hasta } = periodo

    let params: VistaPreviaReporteMensualParams

    if (alcance === "facultad") {
      if (!selectedFacultadId) {
        toast.error("Por favor seleccione una facultad")
        return
      }
      const facIdNum = parseInt(selectedFacultadId.trim(), 10)
      if (isNaN(facIdNum) || facIdNum <= 0) {
        toast.error("La facultad seleccionada no es válida")
        return
      }
      params = {
        alcance: "facultad",
        facultad_id: facIdNum,
        fecha_desde,
        fecha_hasta,
      }
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
      params = {
        alcance: "plan_estudio",
        plan_estudio_id: planIdNum,
        fecha_desde,
        fecha_hasta,
      }
    } else if (alcance === "todas_facultades") {
      params = {
        alcance: "todas_facultades",
        fecha_desde,
        fecha_hasta,
      }
    } else {
      toast.error("Alcance no reconocido")
      return
    }

    setLoadingVistaPrevia(true)
    try {
      const data = await partesMensualesApi.obtenerVistaPrevia(params)
      setVistaPrevia(data)
      setReporte(null)
      toast.success("Vista previa obtenida correctamente")
    } catch (err: unknown) {
      const apiErr = err as {
        body?: {
          code?: string
          message?: string
          partes?: DraftPartItem[]
        }
      }
      if (
        (apiErr?.body?.code === "DRAFT_PARTS" || apiErr?.body?.code === "UNCONFIRMED_PARTS") &&
        Array.isArray(apiErr.body.partes)
      ) {
        setDraftParts(apiErr.body.partes)
        setShowDraftPartsModal(true)
      }
    } finally {
      setLoadingVistaPrevia(false)
    }
  }

  const handleSolicitarGeneracion = () => {
    if (!vistaPrevia) return
    if (
      vistaPrevia.justificaciones_pendientes &&
      vistaPrevia.justificaciones_pendientes.length > 0
    ) {
      setShowJustificacionesPendientesModal(true)
    } else {
      ejecutarGeneracionReporte()
    }
  }

  const ejecutarGeneracionReporte = async () => {
    if (!vistaPrevia) return

    const { fecha_desde, fecha_hasta, fingerprint } = vistaPrevia

    let payload: GenerarReporteMensualRequest

    if (vistaPrevia.alcance === "facultad") {
      const facIdNum = parseInt(selectedFacultadId.trim(), 10)
      payload = {
        alcance: "facultad",
        facultad_id: facIdNum,
        fecha_desde,
        fecha_hasta,
        fingerprint,
      }
    } else if (vistaPrevia.alcance === "plan_estudio") {
      const planIdNum = parseInt(selectedPlanId.trim(), 10)
      payload = {
        alcance: "plan_estudio",
        plan_estudio_id: planIdNum,
        fecha_desde,
        fecha_hasta,
        fingerprint,
      }
    } else {
      payload = {
        alcance: "todas_facultades",
        fecha_desde,
        fecha_hasta,
        fingerprint,
      }
    }

    setLoadingGeneracion(true)
    setIsStaleUpdated(false)
    try {
      const data = await partesMensualesApi.generar(payload, { showErrorToast: false })
      setReporte(data)
      setShowJustificacionesPendientesModal(false)
      setIsStaleUpdated(false)
      toast.success("Parte mensual generado y consultado con éxito")
    } catch (err: unknown) {
      const apiErr = err as {
        status?: number
        body?: {
          code?: string
          message?: string
          partes?: DraftPartItem[]
          vista_previa?: VistaPreviaReporteMensualResponse
        }
      }

      // Caso 1: 409 STALE_FINGERPRINT (La vista previa cambió y el backend devuelve la nueva)
      if (
        (apiErr?.status === 409 || apiErr?.body?.code === "STALE_FINGERPRINT") &&
        apiErr?.body?.vista_previa
      ) {
        setVistaPrevia(apiErr.body.vista_previa)
        setShowJustificacionesPendientesModal(false)
        setIsStaleUpdated(true)
        toast.warning(
          apiErr.body.message || "La vista previa cambió. Revísela y vuelva a generar el reporte"
        )
        return
      }

      // Caso 2: 400 UNCONFIRMED_PARTS o DRAFT_PARTS (Partes diarios no confirmados)
      if (
        (apiErr?.body?.code === "DRAFT_PARTS" || apiErr?.body?.code === "UNCONFIRMED_PARTS") &&
        Array.isArray(apiErr.body.partes)
      ) {
        setDraftParts(apiErr.body.partes)
        setShowDraftPartsModal(true)
        return
      }

      // Otros errores (INVALID_SCOPE_IDENTITY, INVALID_DATE_RANGE, FINGERPRINT_REQUIRED, NOT_FOUND, 500)
      const msg =
        apiErr?.body?.message ||
        (err instanceof Error ? err.message : "Error al generar el reporte mensual")
      toast.error(msg)
    } finally {
      setLoadingGeneracion(false)
    }
  }

  // Cerrar / confirmar un parte diario directamente desde el modal
  const handleConfirmParte = async (partId: number) => {
    setClosingPartsMap((prev) => ({ ...prev, [partId]: true }))
    try {
      await partesDiariosApi.cambiarEstado(partId, {
        estado: "confirmado",
      })
      toast.success(`Parte diario #${partId} confirmado exitosamente`)

      setDraftParts((prev) => {
        const remaining = prev.filter((p) => p.part_id !== partId)
        if (remaining.length === 0) {
          setShowDraftPartsModal(false)
        }
        return remaining
      })
    } catch {
      // El cliente HTTP global ya maneja y muestra el toast de error
    } finally {
      setClosingPartsMap((prev) => ({ ...prev, [partId]: false }))
    }
  }

  // Generar reporte en PDF
  const handlePrint = async () => {
    if (!reporte) return
    setGeneratingPdf(true)
    const toastId = toast.loading("Generando documento PDF oficial...")

    try {
      const isPlan = reporte.alcance === "plan_estudio"
      const isTodas = reporte.alcance === "todas_facultades"
      const targetCarrera = isPlan
        ? carreras.find(
            (c) =>
              String(c.id) === String(reporte.objetivo) ||
              c.nombre.toLowerCase() === reporte.objetivo.toLowerCase()
          )
        : null
      const targetFac =
        !isPlan && !isTodas
          ? facultades.find(
              (f) =>
                f.codigo.toUpperCase() === reporte.objetivo.toUpperCase() ||
                String(f.id) === String(selectedFacultadId) ||
                f.nombre.toLowerCase() === reporte.objetivo.toLowerCase()
            )
          : null

      const objetivoNombre = isTodas
        ? "Todas las facultades"
        : isPlan
          ? targetCarrera
            ? `${targetCarrera.nombre} (${targetCarrera.codigo || targetCarrera.id})`
            : reporte.objetivo || `Plan ${selectedPlanId}`
          : targetFac?.nombre || reporte.objetivo

      const res = await fetch("/api/pdf/reporte-mensuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporte,
          userName: "Administrador",
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
  const isTodasReporte = reporte?.alcance === "todas_facultades"
  const planObj = isPlanReporte
    ? carreras.find((c) => String(c.id) === String(reporte?.objetivo))
    : null
  const facObj =
    !isPlanReporte && !isTodasReporte
      ? facultades.find((f) => f.codigo.toUpperCase() === reporte?.objetivo?.toUpperCase())
      : null

  const targetNombreDisplay = isTodasReporte
    ? "Todas las facultades"
    : isPlanReporte
      ? planObj
        ? `${planObj.nombre} (${planObj.codigo || planObj.id})`
        : `Plan ID: ${reporte?.objetivo}`
      : facObj?.nombre || reporte?.objetivo || "—"

  const isPlanVista = vistaPrevia?.alcance === "plan_estudio"
  const isTodasVista = vistaPrevia?.alcance === "todas_facultades"
  const planObjVista = isPlanVista
    ? carreras.find((c) => String(c.id) === String(vistaPrevia?.objetivo))
    : null
  const facObjVista =
    !isPlanVista && !isTodasVista
      ? facultades.find((f) => f.codigo.toUpperCase() === vistaPrevia?.objetivo?.toUpperCase())
      : null

  const targetNombreDisplayVista = isTodasVista
    ? "Todas las facultades"
    : isPlanVista
      ? planObjVista
        ? `${planObjVista.nombre} (${planObjVista.codigo || planObjVista.id})`
        : `Plan ID: ${vistaPrevia?.objetivo}`
      : facObjVista?.nombre || vistaPrevia?.objetivo || "—"

  const formatFechaConDia = (fechaIso: string): { diaNombre: string; fechaFormateada: string } => {
    if (!fechaIso) return { diaNombre: "—", fechaFormateada: "—" }
    const parts = fechaIso.split("-")
    if (parts.length !== 3) return { diaNombre: "—", fechaFormateada: fechaIso }
    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = Number(parts[2])
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const diaNombre = dias[dateObj.getUTCDay()]
    const fechaFormateada = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
    return { diaNombre, fechaFormateada }
  }

  const formatFechaConfirmacion = (fechaConf: string | null): string => {
    if (!fechaConf) return "Histórico / Sin fecha registrada"
    try {
      const d = new Date(fechaConf)
      if (isNaN(d.getTime())) return fechaConf
      return d.toLocaleString("es-BO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return fechaConf
    }
  }

  const formatCargaHoraria = (val?: number | CargaHorariaItem[]): React.ReactNode => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "number") return val > 0 ? `${val} hrs` : "—"
    if (Array.isArray(val)) {
      if (val.length === 0) return "—"
      return (
        <div className="flex flex-col gap-0.5 items-center justify-center">
          {val.map((item, idx) => (
            <span key={idx} className="whitespace-nowrap">
              {item.carga_horaria} hrs
              {item.grupo_tipo ? (
                <span className="text-[10px] text-muted-foreground ml-1">({item.grupo_tipo})</span>
              ) : null}
            </span>
          ))}
        </div>
      )
    }
    return "—"
  }

  const formatCargaFaltas = (val?: number | CargaFaltaItem[]): React.ReactNode => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "number") return val > 0 ? val : "—"
    if (Array.isArray(val)) {
      if (val.length === 0) return "—"
      return (
        <div className="flex flex-col gap-0.5 items-center justify-center">
          {val.map((item, idx) => (
            <span key={idx} className="whitespace-nowrap">
              {item.carga_faltas}
              {item.grupo_tipo ? (
                <span className="text-[10px] opacity-75 ml-1">({item.grupo_tipo})</span>
              ) : null}
            </span>
          ))}
        </div>
      )
    }
    return "—"
  }

  const formatCargaJustificada = (val?: number | CargaJustificadaItem[]): React.ReactNode => {
    if (val === null || val === undefined) return "—"
    if (typeof val === "number") return val > 0 ? val : "—"
    if (Array.isArray(val)) {
      if (val.length === 0) return "—"
      return (
        <div className="flex flex-col gap-0.5 items-center justify-center">
          {val.map((item, idx) => (
            <span key={idx} className="whitespace-nowrap">
              {item.carga_justificada}
              {item.grupo_tipo ? (
                <span className="text-[10px] opacity-75 ml-1">({item.grupo_tipo})</span>
              ) : null}
            </span>
          ))}
        </div>
      )
    }
    return "—"
  }

  return (
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
                Generación y consulta de alertas e incidencias de asistencia mensual por facultad o
                plan de estudio.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario de Filtros y Generación */}
        <header className="rounded-2xl border border-border bg-card p-3.5 shadow-xs shrink-0 w-full min-w-0 max-w-full">
          <form onSubmit={handleVisualizarVistaPrevia}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 w-full min-w-0 max-w-full items-end">
              {/* 1. Alcance */}
              <div
                className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden ${
                  alcance === "plan_estudio"
                    ? "sm:col-span-1 lg:col-span-2"
                    : alcance === "todas_facultades"
                      ? "sm:col-span-1 lg:col-span-3"
                      : "sm:col-span-1 lg:col-span-2"
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
                  onValueChange={(val: AlcanceReporteMensual) => {
                    setAlcance(val)
                    setReporte(null)
                    setVistaPrevia(null)
                  }}
                >
                  <SelectTrigger
                    id="alcance-select"
                    className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                  >
                    <SelectValue placeholder="Seleccione Alcance" />
                  </SelectTrigger>
                  <SearchableSelectContent>
                    <SelectItem value="facultad">Facultad</SelectItem>
                    <SelectItem value="plan_estudio">Plan de Estudio</SelectItem>
                    <SelectItem value="todas_facultades">Todas las Facultades</SelectItem>
                  </SearchableSelectContent>
                </Select>
              </div>

              {/* 2. Target Selector: Según alcance */}
              {alcance === "facultad" && (
                <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-3">
                  <label
                    htmlFor="facultad-select"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                  >
                    Facultad Objetivo
                  </label>
                  <Select
                    value={selectedFacultadId}
                    onValueChange={(val) => {
                      setSelectedFacultadId(val)
                      setReporte(null)
                      setVistaPrevia(null)
                    }}
                  >
                    <SelectTrigger
                      id="facultad-select"
                      className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
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
              )}

              {alcance === "plan_estudio" && (
                <>
                  {/* Filtro Opcional de Facultad para acotar carreras */}
                  <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-2">
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
                        setReporte(null)
                        setVistaPrevia(null)
                      }}
                    >
                      <SelectTrigger
                        id="filtro-facultad-plan"
                        className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
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
                  <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-3">
                    <label
                      htmlFor="plan-select"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                    >
                      Plan de Estudio Objetivo
                    </label>
                    <Select
                      value={selectedPlanId}
                      onValueChange={(val) => {
                        setSelectedPlanId(val)
                        setReporte(null)
                        setVistaPrevia(null)
                      }}
                      disabled={loadingCarreras}
                    >
                      <SelectTrigger
                        id="plan-select"
                        className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                      >
                        <SelectValue
                          placeholder={
                            loadingCarreras ? "Cargando planes..." : "Seleccione un plan de estudio"
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

              {alcance === "todas_facultades" && (
                <div className="grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden sm:col-span-1 lg:col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate">
                    Cobertura
                  </label>
                  <div className="h-11 rounded-xl bg-muted/30 border border-border px-3 flex items-center gap-2 text-xs font-medium text-foreground">
                    <Building2 className="size-4 text-primary shrink-0" />
                    <span className="truncate">Todas las facultades de la universidad</span>
                  </div>
                </div>
              )}

              {/* 3. Selección de Mes */}
              <div
                className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden ${
                  alcance === "plan_estudio"
                    ? "sm:col-span-1 lg:col-span-2"
                    : "sm:col-span-1 lg:col-span-2"
                }`}
              >
                <label
                  htmlFor="mes-select"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                >
                  Mes
                </label>
                <Select
                  value={String(selectedMes)}
                  onValueChange={(val) => {
                    setSelectedMes(Number(val))
                    setReporte(null)
                    setVistaPrevia(null)
                  }}
                >
                  <SelectTrigger
                    id="mes-select"
                    className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                  >
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SearchableSelectContent>
                    {MESES_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SearchableSelectContent>
                </Select>
              </div>

              {/* 4. Selección de Año */}
              <div
                className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden ${
                  alcance === "plan_estudio"
                    ? "sm:col-span-1 lg:col-span-1"
                    : "sm:col-span-1 lg:col-span-2"
                }`}
              >
                <label
                  htmlFor="anio-select"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none block h-5 leading-5 truncate"
                >
                  Año
                </label>
                <Select
                  value={String(selectedAnio)}
                  onValueChange={(val) => {
                    setSelectedAnio(Number(val))
                    setReporte(null)
                    setVistaPrevia(null)
                  }}
                >
                  <SelectTrigger
                    id="anio-select"
                    className="w-full h-11 max-w-full min-w-0 text-xs rounded-xl bg-card border-border text-foreground overflow-hidden"
                  >
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SearchableSelectContent>
                    {aniosOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SearchableSelectContent>
                </Select>
              </div>

              {/* 5. Botón de Acción */}
              <div
                className={`grid grid-rows-[auto_1fr] gap-1.5 min-w-0 max-w-full w-full overflow-hidden ${
                  alcance === "plan_estudio"
                    ? "sm:col-span-2 lg:col-span-2"
                    : "sm:col-span-1 lg:col-span-3"
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
                  disabled={loadingVistaPrevia || !isFormValid}
                  className="w-full h-11 max-w-full min-w-0 overflow-hidden rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 cursor-pointer text-xs truncate"
                >
                  {loadingVistaPrevia ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <Eye className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">Visualizar Vista Previa</span>
                </Button>
              </div>
            </div>

            {/* Indicador visual del período institucional calculado */}
            <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-border/50 text-xs text-muted-foreground flex-wrap">
              <Calendar className="size-3.5 text-primary shrink-0" />
              <span>
                Período mensual institucional:{" "}
                <strong className="text-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                  {periodo.fecha_desde}
                </strong>{" "}
                al{" "}
                <strong className="text-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                  {periodo.fecha_hasta}
                </strong>{" "}
                <span className="text-[11px] text-muted-foreground/80">
                  (15 de {MESES_OPTIONS[(selectedMes + 10) % 12].label.toLowerCase()} al 15 de{" "}
                  {MESES_OPTIONS[selectedMes - 1].label.toLowerCase()})
                </span>
              </span>
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
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                <div className="p-2 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Alcance
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {reporte.alcance === "plan_estudio"
                      ? "Plan de Estudio"
                      : reporte.alcance === "todas_facultades"
                        ? "Todas las Facultades"
                        : "Facultad"}
                  </span>
                </div>

                <div className="p-2 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    {reporte.alcance === "plan_estudio"
                      ? "Plan de Estudio"
                      : reporte.alcance === "todas_facultades"
                        ? "Objetivo"
                        : "Facultad"}
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
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider block">
                    Partes Confirmados
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {reporte.partes?.length ?? 0} partes
                  </span>
                </div>

                <div className="p-2 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 uppercase font-bold tracking-wider block">
                    Justif. Aprobadas
                  </span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                    {reporte.justificaciones_aprobadas?.length ?? 0} registradas
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

            {/* 1. Sección de Resumen por Personal y Cargas Horarias */}
            {reporte.personas && reporte.personas.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    1. Resumen por Personal y Cargas Horarias
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código..."
                      value={personasSearch}
                      onChange={(e) => setPersonasSearch(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background text-foreground h-8 w-56 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0">
                      {filteredPersonas.length} de {reporte.personas.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto w-full min-w-0 max-w-full">
                  <Table className="min-w-[1000px] w-full border-collapse">
                    <TableHeader className="bg-muted/30 border-b border-border">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead
                          rowSpan={2}
                          className="w-12 text-center border-r border-border font-bold text-xs text-foreground"
                        >
                          N°
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="w-24 text-center border-r border-border font-bold text-xs text-foreground"
                        >
                          Código
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="min-w-[180px] border-r border-border font-bold text-xs text-foreground"
                        >
                          Docente / Funcionario
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="w-24 text-center border-r border-border font-bold text-xs text-foreground bg-muted/40"
                        >
                          Carga Base
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="text-center border-r border-border font-bold text-xs text-red-700 dark:text-red-400 bg-red-500/10"
                        >
                          Faltas
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="text-center border-r border-border font-bold text-xs text-blue-700 dark:text-blue-400 bg-blue-500/10"
                        >
                          Justificaciones Con Goce
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="text-center font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10"
                        >
                          Justificaciones Sin Goce
                        </TableHead>
                      </TableRow>
                      <TableRow className="border-b border-border hover:bg-transparent text-[11px]">
                        {/* Faltas */}
                        <TableHead className="w-20 text-center border-r border-border font-bold text-red-700 dark:text-red-400">
                          Carga
                        </TableHead>
                        <TableHead className="w-20 text-center border-r border-border font-bold text-amber-700 dark:text-amber-400">
                          Retrasos
                        </TableHead>
                        <TableHead className="w-20 text-center border-r border-border font-bold text-emerald-700 dark:text-emerald-400">
                          Anticipados
                        </TableHead>
                        {/* Justificaciones Con Goce */}
                        <TableHead className="w-20 text-center border-r border-border font-bold text-blue-700 dark:text-blue-400">
                          Carga
                        </TableHead>
                        <TableHead className="w-20 text-center border-r border-border font-bold text-blue-700 dark:text-blue-400">
                          Retrasos
                        </TableHead>
                        <TableHead className="w-20 text-center border-r border-border font-bold text-blue-700 dark:text-blue-400">
                          Anticipados
                        </TableHead>
                        {/* Justificaciones Sin Goce */}
                        <TableHead className="w-20 text-center border-r border-border font-bold text-amber-700 dark:text-amber-400">
                          Carga
                        </TableHead>
                        <TableHead className="w-20 text-center border-r border-border font-bold text-amber-700 dark:text-amber-400">
                          Retrasos
                        </TableHead>
                        <TableHead className="w-20 text-center font-bold text-amber-700 dark:text-amber-400">
                          Anticipados
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPersonas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={13}
                            className="text-center text-muted-foreground text-xs py-6"
                          >
                            No se encontraron docentes coincidentes con la búsqueda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPersonas.map((p, idx) => {
                          const justConGoce = p.justificaciones_con_goce ?? p.justificaciones
                          const justSinGoce = p.justificaciones_sin_goce

                          return (
                            <TableRow
                              key={p.persona_codigo || idx}
                              className="border-b border-border hover:bg-muted/10"
                            >
                              <TableCell className="text-center font-mono text-xs text-muted-foreground border-r border-border">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-semibold border-r border-border">
                                {p.persona_codigo}
                              </TableCell>
                              <TableCell className="font-semibold text-xs text-foreground border-r border-border">
                                {p.persona_nombres}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-bold border-r border-border bg-muted/20">
                                {formatCargaHoraria(p.carga_horaria)}
                              </TableCell>
                              {/* Faltas */}
                              <TableCell className="text-center font-mono text-xs font-semibold text-red-600 dark:text-red-400 border-r border-border">
                                {formatCargaFaltas(p.faltas?.carga_faltas)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-amber-700 dark:text-amber-400 border-r border-border">
                                {p.faltas?.retrasos_min ? `${p.faltas.retrasos_min} min` : "—"}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-emerald-700 dark:text-emerald-400 border-r border-border">
                                {p.faltas?.anticipados_min
                                  ? `${p.faltas.anticipados_min} min`
                                  : "—"}
                              </TableCell>
                              {/* Justificaciones Con Goce */}
                              <TableCell className="text-center font-mono text-xs text-blue-600 dark:text-blue-400 border-r border-border">
                                {formatCargaJustificada(justConGoce?.carga_justificada)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-blue-600 dark:text-blue-400 border-r border-border">
                                {justConGoce?.retrasos_min_justificados
                                  ? `${justConGoce.retrasos_min_justificados} min`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-blue-600 dark:text-blue-400 border-r border-border">
                                {justConGoce?.anticipado_min_justificados
                                  ? `${justConGoce.anticipado_min_justificados} min`
                                  : "—"}
                              </TableCell>
                              {/* Justificaciones Sin Goce */}
                              <TableCell className="text-center font-mono text-xs text-amber-700 dark:text-amber-400 border-r border-border">
                                {formatCargaJustificada(justSinGoce?.carga_justificada)}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-amber-700 dark:text-amber-400 border-r border-border">
                                {justSinGoce?.retrasos_min_justificados
                                  ? `${justSinGoce.retrasos_min_justificados} min`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs text-amber-700 dark:text-amber-400">
                                {justSinGoce?.anticipado_min_justificados
                                  ? `${justSinGoce.anticipado_min_justificados} min`
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 2. Sección de Resumen de Partes Diarios */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  2. Resumen de Partes Diarios
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por fecha, día, ID..."
                    value={partesSearch}
                    onChange={(e) => setPartesSearch(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background text-foreground h-8 w-56 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0">
                    {filteredPartes.length} de {reporte.partes?.length ?? 0} partes
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto w-full min-w-0 max-w-full">
                <Table className="min-w-[800px] w-full border-collapse">
                  <TableHeader className="bg-muted/30 border-b border-border">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-16 text-center border-r border-border font-bold text-xs text-foreground">
                        N°
                      </TableHead>
                      <TableHead className="w-24 text-center border-r border-border font-bold text-xs text-foreground">
                        ID Parte
                      </TableHead>
                      <TableHead className="w-36 text-center border-r border-border font-bold text-xs text-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="w-36 text-center border-r border-border font-bold text-xs text-foreground">
                        Día
                      </TableHead>
                      <TableHead className="border-r border-border font-bold text-xs text-foreground">
                        Fecha de Confirmación
                      </TableHead>
                      <TableHead className="w-32 text-center font-bold text-xs text-foreground">
                        Estado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reporte.partes || reporte.partes.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground text-xs py-6"
                        >
                          Sin partes diarios registrados en este período.
                        </TableCell>
                      </TableRow>
                    ) : filteredPartes.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground text-xs py-6"
                        >
                          No se encontraron partes coincidentes con la búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartes.map((p, idx) => (
                        <TableRow key={p.id} className="border-b border-border hover:bg-muted/10">
                          <TableCell className="text-center font-mono text-xs text-muted-foreground border-r border-border">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-semibold border-r border-border">
                            #{p.id}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-semibold border-r border-border">
                            {p.fecha}
                          </TableCell>
                          <TableCell className="text-center font-medium text-xs text-foreground border-r border-border">
                            {getDiaSemana(p.fecha)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground border-r border-border">
                            {formatFechaHora(p.fecha_confirmacion)}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                              Confirmado
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 3. Sección de Justificaciones Aprobadas */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  3. Justificaciones Aprobadas
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por docente, materia, grupo..."
                    value={justificacionesSearch}
                    onChange={(e) => setJustificacionesSearch(e.target.value)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-border bg-background text-foreground h-8 w-56 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground shrink-0">
                    {filteredJustificaciones.length} de{" "}
                    {reporte.justificaciones_aprobadas?.length ?? 0}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto w-full min-w-0 max-w-full">
                <Table className="min-w-[1000px] w-full border-collapse">
                  <TableHeader className="bg-muted/30 border-b border-border">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="w-14 text-center border-r border-border font-bold text-xs text-foreground">
                        N°
                      </TableHead>
                      <TableHead className="w-60 border-r border-border font-bold text-xs text-foreground">
                        Docente
                      </TableHead>
                      <TableHead className="min-w-[200px] border-r border-border font-bold text-xs text-foreground">
                        Asignatura
                      </TableHead>
                      <TableHead className="w-20 text-center border-r border-border font-bold text-xs text-foreground">
                        Grupo
                      </TableHead>
                      <TableHead className="w-28 text-center border-r border-border font-bold text-xs text-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="w-32 text-center border-r border-border font-bold text-xs text-foreground">
                        Horario
                      </TableHead>
                      <TableHead className="w-28 text-center border-r border-border font-bold text-xs text-foreground">
                        Régimen
                      </TableHead>
                      <TableHead className="min-w-[180px] font-bold text-xs text-foreground">
                        Motivo / Descripción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!reporte.justificaciones_aprobadas ||
                    reporte.justificaciones_aprobadas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground text-xs py-6"
                        >
                          Sin justificaciones aprobadas registradas en este período.
                        </TableCell>
                      </TableRow>
                    ) : filteredJustificaciones.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground text-xs py-6"
                        >
                          No se encontraron justificaciones coincidentes con la búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJustificaciones.map((j, idx) => (
                        <TableRow
                          key={j.id || idx}
                          className="border-b border-border hover:bg-muted/10"
                        >
                          <TableCell className="text-center font-mono text-xs text-muted-foreground border-r border-border">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="border-r border-border py-2">
                            <div className="font-semibold text-xs text-foreground">
                              {j.persona_nombre}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              Cód: {j.persona_codigo}
                            </div>
                          </TableCell>
                          <TableCell className="border-r border-border font-medium text-xs text-foreground">
                            {j.asignatura_nombre}
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-xs text-foreground border-r border-border">
                            {j.grupo_nombre}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-foreground border-r border-border">
                            {j.fecha}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-semibold text-foreground border-r border-border">
                            {formatHoraCorta(j.hora_inicio)} - {formatHoraCorta(j.hora_fin)}
                          </TableCell>
                          <TableCell className="text-center border-r border-border">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                j.con_goce_haberes
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                              }`}
                            >
                              {j.con_goce_haberes ? "Con goce" : "Sin goce"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {j.descripcion || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 4. Sección de Alertas - Retrasos Recurrentes (> 3) */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  4. Alertas: Retrasos Recurrentes (&gt; 3 retrasos)
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
                          <Fragment key={item.persona_codigo}>
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
                          </Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 5. Sección de Alertas - Faltas Acumuladas (3 o más) */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  5. Alertas: Faltas Acumuladas (3 faltas o más)
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
                          <Fragment key={item.persona_codigo}>
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
                          </Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 6. Sección de Alertas - Inasistencias Consecutivas (6 o más días) */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  6. Alertas: Inasistencias Consecutivas (Secuencia de 6 o más días)
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
                                    item.evidencias?.[(item.evidencias?.length ?? 1) - 1]?.fecha ||
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
                          <Fragment key={item.persona_codigo}>
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
                                {firstSec.cantidad_ocurrencias ?? firstSec.evidencias?.length ?? 0}{" "}
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
                                        - G: {e.grupo_nombre || "—"} | Aula: {e.aula_codigo || "—"}
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
                                    {sec.cantidad_ocurrencias ?? sec.evidencias?.length ?? 0} clases
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
                          </Fragment>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : vistaPrevia ? (
          <div className="space-y-4 pb-6 w-full min-w-0 max-w-full">
            {/* Aviso si la vista previa fue actualizada por 409 STALE_FINGERPRINT */}
            {isStaleUpdated && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-bold">Vista previa actualizada por cambios recientes</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Las fuentes de datos cambiaron desde la última consulta. Se cargó la versión
                      vigente con su nueva huella. Revise los datos y presione nuevamente{" "}
                      <strong>Generar Parte Mensual</strong>.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStaleUpdated(false)}
                  className="h-7 px-2 text-xs border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 rounded-lg cursor-pointer shrink-0"
                >
                  Entendido
                </Button>
              </div>
            )}

            {/* 1. Resumen de la Vista Previa */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                    <Eye className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Vista Previa del Período
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Verifique el estado de partes diarios y justificaciones pendientes antes de
                      generar el reporte definitivo.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSolicitarGeneracion}
                  disabled={loadingGeneracion}
                  className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center justify-center gap-2 h-10 px-4 shadow-sm cursor-pointer shrink-0"
                >
                  {loadingGeneracion ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <FileCheck2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>Generar Parte Mensual</span>
                </Button>
              </div>

              <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Alcance
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {vistaPrevia.alcance === "plan_estudio"
                      ? "Plan de Estudio"
                      : vistaPrevia.alcance === "todas_facultades"
                        ? "Todas las Facultades"
                        : "Facultad"}
                  </span>
                </div>

                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Objetivo
                  </span>
                  <span
                    className="text-xs font-bold text-foreground line-clamp-1"
                    title={targetNombreDisplayVista}
                  >
                    {targetNombreDisplayVista}
                  </span>
                </div>

                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Rango de Fechas
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground">
                    {vistaPrevia.fecha_desde} al {vistaPrevia.fecha_hasta}
                  </span>
                </div>

                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Total Fechas
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {vistaPrevia.fechas.length} días
                  </span>
                </div>

                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span
                    className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block truncate"
                    title="Partes Diarios Confirmados"
                  >
                    Partes Diarios Confirmados
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {totalPartesConfirmadosVista}
                  </span>
                </div>

                <div className="p-2.5 bg-muted/20 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Justif. Pendientes
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      vistaPrevia.justificaciones_pendientes.length > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {vistaPrevia.justificaciones_pendientes.length > 0
                      ? `${vistaPrevia.justificaciones_pendientes.length} pendientes`
                      : "0 (Al día)"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Sección: Tabla de Fechas y Partes Diarios */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Fechas y Partes Diarios del Período ({vistaPrevia.fechas.length} fechas)
                  </h2>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {totalPartesConfirmadosVista} confirmados
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow className="border-b border-border">
                      <TableHead className="w-12 text-center font-bold">N°</TableHead>
                      <TableHead className="w-32 text-center font-bold">Fecha</TableHead>
                      <TableHead className="w-28 text-center font-bold">Día</TableHead>
                      <TableHead className="w-32 text-center font-bold">Partes Diarios</TableHead>
                      <TableHead className="font-bold">Detalle y Estado de Partes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vistaPrevia.fechas.map((f, idx) => {
                      const { diaNombre, fechaFormateada } = formatFechaConDia(f.fecha)
                      const hasPartes = f.partes && f.partes.length > 0
                      const sortedPartes = hasPartes
                        ? [...f.partes].sort((a, b) => {
                            const aIsConf = a.estado?.toLowerCase() === "confirmado" ? 1 : 0
                            const bIsConf = b.estado?.toLowerCase() === "confirmado" ? 1 : 0
                            return bIsConf - aIsConf
                          })
                        : []

                      return (
                        <TableRow
                          key={f.fecha}
                          className="border-b border-border hover:bg-muted/10"
                        >
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold text-foreground">
                            {fechaFormateada}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {diaNombre}
                          </TableCell>
                          <TableCell className="text-center">
                            {hasPartes ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                                {f.partes.length} {f.partes.length === 1 ? "parte" : "partes"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                                0 partes
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasPartes ? (
                              <div className="flex flex-wrap items-center gap-2 py-1">
                                {sortedPartes.map((p) => {
                                  const isConfirmado = p.estado?.toLowerCase() === "confirmado"
                                  const isBorrador = p.estado?.toLowerCase() === "borrador"

                                  return (
                                    <div
                                      key={p.id}
                                      className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs ${
                                        isConfirmado
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                                          : isBorrador
                                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                                            : "bg-muted/40 border-border text-foreground"
                                      }`}
                                    >
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/60">
                                        {p.estado}
                                      </span>
                                      {isConfirmado && (
                                        <span className="text-[10px] opacity-80">
                                          Confirmación:{" "}
                                          {formatFechaConfirmacion(p.fecha_confirmacion)}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                Sin parte diario generado para esta fecha
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 3. Sección: Justificaciones Pendientes */}
            <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Justificaciones Pendientes de Aprobación (
                    {vistaPrevia.justificaciones_pendientes.length})
                  </h2>
                </div>
              </div>

              <div className="p-4">
                {vistaPrevia.justificaciones_pendientes.length === 0 ? (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold">No existen justificaciones pendientes</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Todas las solicitudes del período se encuentran resueltas. El reporte
                        mensual se generará sin omitir justificaciones.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium">
                        Atención: Hay {vistaPrevia.justificaciones_pendientes.length}{" "}
                        justificaciones pendientes, estas no serán consideradas.
                      </span>
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table className="w-full text-xs">
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-b border-border">
                            <TableHead className="w-16 text-center font-bold">ID</TableHead>
                            <TableHead className="font-bold">Docente / Funcionario</TableHead>
                            <TableHead className="w-48 text-center font-bold">
                              Rango Justificado
                            </TableHead>
                            <TableHead className="w-32 text-center font-bold">
                              Goce Haberes
                            </TableHead>
                            <TableHead className="font-bold">Motivo / Descripción</TableHead>
                            <TableHead className="w-28 text-center font-bold">Horarios</TableHead>
                            <TableHead className="w-28 text-center font-bold">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vistaPrevia.justificaciones_pendientes.map((j) => (
                            <TableRow
                              key={j.id}
                              className="border-b border-border hover:bg-muted/10"
                            >
                              <TableCell className="text-center font-mono font-semibold">
                                #{j.id}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {j.persona?.nombres || "—"}
                              </TableCell>
                              <TableCell className="text-center font-mono text-[11px]">
                                {j.fecha_desde} al {j.fecha_hasta}
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    j.con_goce_haberes
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                  }`}
                                >
                                  {j.con_goce_haberes ? "Con goce" : "Sin goce"}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {j.descripcion || "Sin descripción"}
                              </TableCell>
                              <TableCell className="text-center font-mono text-[11px]">
                                {j.horario_ids?.length || 0} horarios
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300">
                                  {j.estado}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie de acción */}
              <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-end">
                <Button
                  type="button"
                  onClick={handleSolicitarGeneracion}
                  disabled={loadingGeneracion}
                  size="lg"
                  className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {loadingGeneracion ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <FileCheck2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>Generar Parte Mensual</span>
                </Button>
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
              Seleccione el alcance, el mes y el año para consultar las alertas mensuales de
              retrasos, faltas, inasistencias consecutivas y el consolidado de asistencia docente.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Alerta: Partes Diarios en Borrador */}
      <UmssModal
        isOpen={showDraftPartsModal}
        onClose={() => setShowDraftPartsModal(false)}
        title={
          <div className="flex items-center gap-2 text-base font-bold text-destructive">
            <AlertTriangle className="size-5 text-destructive" />
            Partes Diarios en Borrador
          </div>
        }
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setShowDraftPartsModal(false)}
              className="rounded-xl text-xs"
            >
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              Existen partes diarios en estado borrador en el período seleccionado que impiden
              generar el reporte mensual. Debe confirmarlos o anularlos en la vista de Partes
              Diarios antes de continuar.
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-20 text-center font-bold">ID Parte</TableHead>
                  <TableHead className="w-28 text-center font-bold">Fecha</TableHead>
                  <TableHead className="w-28 text-center font-bold">Código Fac.</TableHead>
                  <TableHead className="font-bold">Facultad</TableHead>
                  <TableHead className="w-44 text-center font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftParts.map((p) => {
                  const isClosing = Boolean(closingPartsMap[p.part_id])
                  return (
                    <TableRow key={p.part_id}>
                      <TableCell className="text-center font-mono font-semibold">
                        {p.part_id}
                      </TableCell>
                      <TableCell className="text-center font-mono">{p.date}</TableCell>
                      <TableCell className="text-center font-mono">{p.faculty_code}</TableCell>
                      <TableCell>{p.faculty_name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] rounded-lg gap-1"
                            onClick={() => {
                              window.open(
                                `/partes-diarios?facultad_codigo=${encodeURIComponent(
                                  p.faculty_code
                                )}&fecha=${encodeURIComponent(p.date)}`,
                                "_blank"
                              )
                            }}
                            title="Ver y editar en partes diarios"
                          >
                            <Eye className="w-3 h-3 text-muted-foreground" />
                            Ver
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isClosing}
                            className="h-7 px-2.5 text-[11px] rounded-lg gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => handleConfirmParte(p.part_id)}
                            title="Confirmar y cerrar parte diario"
                          >
                            {isClosing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Cerrar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </UmssModal>

      {/* Modal de Confirmación: Justificaciones Pendientes */}
      <UmssModal
        isOpen={showJustificacionesPendientesModal}
        onClose={() => setShowJustificacionesPendientesModal(false)}
        title={
          <div className="flex items-center gap-2 text-base font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
            Justificaciones Pendientes en el Período
          </div>
        }
        size="lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setShowJustificacionesPendientesModal(false)}
              className="rounded-xl text-xs w-full sm:w-auto"
            >
              Cancelar y Revisar
            </Button>
            <Button
              onClick={ejecutarGeneracionReporte}
              disabled={loadingGeneracion}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 w-full sm:w-auto cursor-pointer"
            >
              {loadingGeneracion ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileCheck2 className="w-3.5 h-3.5" />
              )}
              Continuar y Generar Reporte
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">
              Atención: Hay {vistaPrevia?.justificaciones_pendientes.length} justificaciones
              pendientes, estas no serán consideradas.
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead className="w-16 text-center font-bold">ID</TableHead>
                  <TableHead className="font-bold">Docente</TableHead>
                  <TableHead className="w-36 text-center font-bold">Fechas</TableHead>
                  <TableHead className="w-24 text-center font-bold">Goce</TableHead>
                  <TableHead className="font-bold">Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vistaPrevia?.justificaciones_pendientes.map((j) => (
                  <TableRow key={j.id} className="border-b border-border">
                    <TableCell className="text-center font-mono font-semibold">#{j.id}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {j.persona?.nombres || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono text-[11px]">
                      {j.fecha_desde} al {j.fecha_hasta}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          j.con_goce_haberes
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        {j.con_goce_haberes ? "Con goce" : "Sin goce"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs truncate max-w-xs">
                      {j.descripcion || "Sin descripción"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </UmssModal>
    </AppLayout>
  )
}
