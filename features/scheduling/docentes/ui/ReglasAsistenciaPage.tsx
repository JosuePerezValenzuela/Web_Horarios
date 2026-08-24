"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useAttendanceConfigStore } from "@/features/scheduling/docentes/application/useAttendanceConfigStore"
import { useUIStore } from "@/shared/stores/uiStore"
import {
  UmssCard,
  UmssCardHeader,
  UmssCardTitle,
  UmssCardDescription,
  UmssCardContent,
  Button,
  Input,
  DatePicker,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@umss/estilos-base/components"
import { toast } from "sonner"
import {
  Pencil,
  Trash,
  HelpCircle,
  AlertCircle,
  Calendar,
  Settings2,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react"

export default function ReglasAsistenciaPage() {
  const { setSidebarCollapsed } = useUIStore()

  // Colapsar el sidebar por defecto para maximizar espacio
  useEffect(() => {
    setSidebarCollapsed(true)
  }, [setSidebarCollapsed])

  const { configs, loading, fetchConfigs, createConfig, updateConfig, deleteConfig } =
    useAttendanceConfigStore()

  // Form State - initialized to empty strings so fields start empty but display their labels/placeholders
  const [ingresoAnticipado, setIngresoAnticipado] = useState<string>("")
  const [toleranciaIngreso, setToleranciaIngreso] = useState<string>("")
  const [limiteFalta, setLimiteFalta] = useState<string>("")
  const [toleranciaSalidaPost, setToleranciaSalidaPost] = useState<string>("")
  const [toleranciaSalidaAnt, setToleranciaSalidaAnt] = useState<string>("")
  const [validFrom, setValidFrom] = useState<Date | undefined>(undefined)

  // Edit/Delete state variables
  const [editingConfig, setEditingConfig] = useState<any | null>(null)
  const [editValidFrom, setEditValidFrom] = useState<Date | undefined>(undefined)
  const [editValidTo, setEditValidTo] = useState<Date | undefined>(undefined)
  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null)

  // Confirmation Alert Dialog State
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)

  // Carga inicial
  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  // Abre el modal de confirmación antes de registrar
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validFrom) {
      toast.error("Por favor, seleccione la fecha de inicio de vigencia (Válido desde)")
      return
    }

    const configPayload = {
      ingreso_anticipado_minutos: parseInt(ingresoAnticipado, 10),
      tolerancia_ingreso_minutos: parseInt(toleranciaIngreso, 10),
      limite_falta_ingreso_minutos: parseInt(limiteFalta, 10),
      tolerancia_salida_posterior_minutos: parseInt(toleranciaSalidaPost, 10),
      tolerancia_salida_anticipada_minutos: parseInt(toleranciaSalidaAnt, 10),
    }

    // Validaciones básicas de no-negativos
    if (
      isNaN(configPayload.ingreso_anticipado_minutos) ||
      isNaN(configPayload.tolerancia_ingreso_minutos) ||
      isNaN(configPayload.limite_falta_ingreso_minutos) ||
      isNaN(configPayload.tolerancia_salida_posterior_minutos) ||
      isNaN(configPayload.tolerancia_salida_anticipada_minutos) ||
      configPayload.ingreso_anticipado_minutos < 0 ||
      configPayload.tolerancia_ingreso_minutos < 0 ||
      configPayload.limite_falta_ingreso_minutos < 0 ||
      configPayload.tolerancia_salida_posterior_minutos < 0 ||
      configPayload.tolerancia_salida_anticipada_minutos < 0
    ) {
      toast.error("Todos los umbrales de minutos deben ser números enteros mayores o iguales a 0")
      return
    }

    setShowConfirmDialog(true)
  }

  // Envío real al API
  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false)
    if (!validFrom) return

    // Convert date to YYYY-MM-DD local format
    const offset = validFrom.getTimezoneOffset()
    const localDate = new Date(validFrom.getTime() - offset * 60 * 1000)
    const validFromStr = localDate.toISOString().split("T")[0]

    const configPayload = {
      ingreso_anticipado_minutos: parseInt(ingresoAnticipado, 10),
      tolerancia_ingreso_minutos: parseInt(toleranciaIngreso, 10),
      limite_falta_ingreso_minutos: parseInt(limiteFalta, 10),
      tolerancia_salida_posterior_minutos: parseInt(toleranciaSalidaPost, 10),
      tolerancia_salida_anticipada_minutos: parseInt(toleranciaSalidaAnt, 10),
      valid_from: validFromStr,
      valid_to: null,
    }

    try {
      await createConfig(configPayload)
      toast.success("Nueva regla de asistencia registrada con éxito")

      // Recargar el listado/historial desde la base de datos para ver reflejados los cambios y fechas recalculadas
      await fetchConfigs()

      // Resetear a campos vacíos
      setIngresoAnticipado("")
      setToleranciaIngreso("")
      setLimiteFalta("")
      setToleranciaSalidaPost("")
      setToleranciaSalidaAnt("")
      setValidFrom(undefined)
    } catch (err: unknown) {
      // El cliente API muestra automáticamente el toast de error del servidor
    }
  }
  const handleEditSubmit = async () => {
    if (!editingConfig) return

    // Construct updates payload with date validations
    const updates: any = {}
    if (editValidFrom) {
      const offset = editValidFrom.getTimezoneOffset()
      const localDate = new Date(editValidFrom.getTime() - offset * 60 * 1000)
      updates.valid_from = localDate.toISOString().split("T")[0]
    }
    if (editValidTo) {
      const offset = editValidTo.getTimezoneOffset()
      const localDate = new Date(editValidTo.getTime() - offset * 60 * 1000)
      updates.valid_to = localDate.toISOString().split("T")[0]
    } else if (editValidTo === null) {
      updates.valid_to = null
    }

    try {
      await updateConfig(editingConfig.id, updates)
      toast.success("Vigencia de la regla actualizada con éxito")
      setEditingConfig(null)
      setEditValidFrom(undefined)
      setEditValidTo(undefined)
      await fetchConfigs()
    } catch (err: unknown) {
      // El cliente API muestra automáticamente el toast de error del servidor
    }
  }

  const handleDeleteSubmit = async () => {
    if (deletingConfigId === null) return
    try {
      await deleteConfig(deletingConfigId)
      toast.success("Regla de asistencia eliminada con éxito")
      setDeletingConfigId(null)
      await fetchConfigs()
    } catch (err: unknown) {
      // El cliente API muestra automáticamente el toast de error del servidor
    }
  }

  // Verifica si una regla es la actualmente activa basándose en la fecha actual
  const isCurrentlyActive = (validFromStr: string, validToStr: string | null) => {
    const now = new Date()
    // Normalizar a YYYY-MM-DD
    const nowStr = now.toISOString().split("T")[0]

    if (nowStr >= validFromStr) {
      if (validToStr === null || nowStr <= validToStr) {
        return true
      }
    }
    return false
  }

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[
          { name: "Inicio", href: "/" },
          { name: "Configuración de Reglas de Asistencia" },
        ]}
      >
        <div className="flex flex-col h-full gap-4 bg-background">
          {/* Título de Vista */}
          <div className="flex items-center gap-2 border-b border-border pb-3 shrink-0">
            <Settings2 className="w-6 h-6 text-primary" />
            <div>
              <h1 className="umss-title-h1 text-xl md:text-2xl uppercase tracking-wide">
                Reglas de Asistencia
              </h1>
              <p className="text-xs text-shadow-secondary-foreground font-medium">
                Defina los límites de tiempos, tolerancia y faltas para el control de asistencia.
              </p>
            </div>
          </div>

          {/* Grid de 2 Columnas Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
            {/* LADO IZQUIERDO: Formulario de Registro (5 cols) */}
            <div className="lg:col-span-5 flex flex-col min-h-0">
              <UmssCard className="flex flex-col border border-border/60 bg-card rounded-2xl shadow-sm overflow-hidden">
                <UmssCardHeader className="border-b border-border p-4 shrink-0">
                  <UmssCardTitle className="text-sm font-bold uppercase tracking-wider text-shadow-secondary-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-shadow-secondary-foreground" />
                    Registrar Nueva Regla
                  </UmssCardTitle>
                  <UmssCardDescription className="text-xs text-muted-foreground">
                    Cree una versión de configuración. Reemplazará a la actual a partir de la fecha
                    indicada.
                  </UmssCardDescription>
                </UmssCardHeader>

                <UmssCardContent className="p-4 space-y-4">
                  {/* Mensaje Llamativo/Explicativo Institucional */}
                  <div className="flex gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Importante sobre Asistencias
                      </p>
                      <p className="leading-relaxed">
                        Si no se registra la hora de inicio u hora de fin de una clase, o si el
                        ingreso se marca antes del umbral de tolerancia anticipado, la asistencia{" "}
                        <b>no será contabilizada</b> y se considerará automáticamente como{" "}
                        <b>falta</b>.
                      </p>
                    </div>
                  </div>

                  <form
                    id="attendance-config-form"
                    onSubmit={handlePreSubmit}
                    className="space-y-4"
                  >
                    {/* Campo: Ingreso Anticipado */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="ingreso-anticipado"
                          className="text-xs font-semibold text-foreground"
                        >
                          Ingreso Anticipado (minutos)
                        </label>
                        <div className="group relative cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-60 rounded-lg bg-gray-900 dark:bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md z-50">
                            Cantidad de minutos antes en las que puede marcar un docente para marcar
                            el ingreso a una clase.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="ingreso-anticipado"
                        type="number"
                        min="0"
                        required
                        value={ingresoAnticipado}
                        onChange={(e) => setIngresoAnticipado(e.target.value)}
                        placeholder="Ej. 15"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Campo: Tolerancia Ingreso */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="tolerancia-ingreso"
                          className="text-xs font-semibold text-foreground"
                        >
                          Tolerancia de Ingreso (minutos)
                        </label>
                        <div className="group relative cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-60 rounded-lg bg-gray-900 dark:bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md z-50">
                            Cantidad de minutos post inicio a la clase que son de tolerancia/sin
                            retraso.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="tolerancia-ingreso"
                        type="number"
                        min="0"
                        required
                        value={toleranciaIngreso}
                        onChange={(e) => setToleranciaIngreso(e.target.value)}
                        placeholder="Ej. 15"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Campo: Limite Falta */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="limite-falta"
                          className="text-xs font-semibold text-foreground"
                        >
                          Límite para Falta (minutos)
                        </label>
                        <div className="group relative cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-60 rounded-lg bg-gray-900 dark:bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md z-50">
                            Pasado esta cantidad de minutos la asistencia se considera como falta.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="limite-falta"
                        type="number"
                        min="0"
                        required
                        value={limiteFalta}
                        onChange={(e) => setLimiteFalta(e.target.value)}
                        placeholder="Ej. 30"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Campo: Tolerancia Salida Posterior */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="tolerancia-salida-post"
                          className="text-xs font-semibold text-foreground"
                        >
                          Tolerancia Salida Posterior (minutos)
                        </label>
                        <div className="group relative cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-60 rounded-lg bg-gray-900 dark:bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md z-50">
                            Pasada esa cantidad de minutos de su hora de salida de clase se
                            considera falta.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="tolerancia-salida-post"
                        type="number"
                        min="0"
                        required
                        value={toleranciaSalidaPost}
                        onChange={(e) => setToleranciaSalidaPost(e.target.value)}
                        placeholder="Ej. 30"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Campo: Tolerancia Salida Anticipada */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="tolerancia-salida-ant"
                          className="text-xs font-semibold text-foreground"
                        >
                          Tolerancia Salida Anticipada (minutos)
                        </label>
                        <div className="group relative cursor-help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                          <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 w-60 rounded-lg bg-gray-900 dark:bg-gray-800 p-2 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md z-50">
                            Cantidad de minutos antes de que termine la clase en las que puede
                            marcar el docente su salida sin penalizacion.
                          </div>
                        </div>
                      </div>
                      <Input
                        id="tolerancia-salida-ant"
                        type="number"
                        min="0"
                        required
                        value={toleranciaSalidaAnt}
                        onChange={(e) => setToleranciaSalidaAnt(e.target.value)}
                        placeholder="Ej. 15"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Campo: Fecha Vigencia (DatePicker) */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="valid-from-picker"
                        className="text-xs font-semibold text-foreground flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        Válido Desde
                      </label>
                      <DatePicker
                        id="valid-from-picker"
                        value={validFrom}
                        onValueChange={setValidFrom}
                        placeholder="Seleccione fecha de inicio"
                        className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                      />
                    </div>

                    {/* Botón de Enviar */}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 rounded-xl font-bold bg-umss-dark-blue text-white hover:bg-[#001b3a] transition-all cursor-pointer mt-2"
                    >
                      {loading ? "Registrando..." : "REGISTRAR CONFIGURACIÓN"}
                    </Button>
                  </form>
                </UmssCardContent>
              </UmssCard>
            </div>

            {/* LADO DERECHO: Historial/Listado (7 cols) */}
            <div className="lg:col-span-7 flex flex-col min-h-0">
              <UmssCard className="flex flex-col h-full border border-border/60 bg-card rounded-2xl shadow-sm overflow-hidden min-h-0">
                <UmssCardHeader className="border-b border-border p-4 shrink-0 flex flex-row items-center justify-between">
                  <div>
                    <UmssCardTitle className="text-sm font-bold uppercase tracking-wider text-shadow-secondary-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Historial de Reglas
                    </UmssCardTitle>
                    <UmssCardDescription className="text-xs text-muted-foreground">
                      Historial de reglas ordenado por fecha de vigencia.
                    </UmssCardDescription>
                  </div>
                </UmssCardHeader>

                <UmssCardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {loading && configs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="w-6 h-6 border-2 border-[#002855] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs text-muted-foreground">
                        Cargando reglas de asistencia...
                      </p>
                    </div>
                  ) : configs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10">
                      <Settings2 className="w-8 h-8 text-muted-foreground/45 mb-2" />
                      <p className="text-xs text-muted-foreground font-semibold">
                        No hay configuraciones registradas
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Utilice el formulario de la izquierda para registrar la primera regla.
                      </p>
                    </div>
                  ) : (
                    configs.map((config) => {
                      const isActive = isCurrentlyActive(config.valid_from, config.valid_to)

                      return (
                        <div
                          key={config.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            isActive
                              ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-800/40"
                              : "bg-muted/10 border-border/60 hover:bg-muted/20"
                          }`}
                        >
                          {/* Cabecera del Item */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/40 pb-2 mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                ID versión:{" "}
                                <span className="font-mono text-foreground">{config.id}</span>
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-bold bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-250 dark:border-green-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Activa
                                </span>
                              )}

                              {/* Edit & Delete Action Buttons */}
                              <div className="flex items-center gap-1.5 ml-2">
                                <Button
                                  variant="outline"
                                  size="xs"
                                  title="Editar vigencia de regla"
                                  onClick={() => {
                                    setEditingConfig(config)
                                    setEditValidFrom(
                                      config.valid_from
                                        ? new Date(config.valid_from + "T00:00:00")
                                        : undefined
                                    )
                                    setEditValidTo(
                                      config.valid_to
                                        ? new Date(config.valid_to + "T00:00:00")
                                        : undefined
                                    )
                                  }}
                                  className="h-6 w-6 p-0 border-border/60 hover:bg-muted text-foreground/80"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="xs"
                                  title="Eliminar regla de asistencia"
                                  onClick={() => {
                                    if (config.id !== undefined) {
                                      setDeletingConfigId(config.id)
                                    }
                                  }}
                                  className="h-6 w-6 p-0 border-destructive/20 hover:bg-destructive/10 text-destructive/80"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              {config.valid_from}
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              {config.valid_to ? (
                                config.valid_to
                              ) : (
                                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  Vigente
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Cuerpo con Valores de Configuración */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-background/40 p-2 rounded-xl border border-border/40">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                Ingreso Anticipado
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {config.ingreso_anticipado_minutos} min
                              </p>
                            </div>
                            <div className="bg-background/40 p-2 rounded-xl border border-border/40">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                Tolerancia Ingreso
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {config.tolerancia_ingreso_minutos} min
                              </p>
                            </div>
                            <div className="bg-background/40 p-2 rounded-xl border border-border/40">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                Límite Falta
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {config.limite_falta_ingreso_minutos} min
                              </p>
                            </div>
                            <div className="bg-background/40 p-2 rounded-xl border border-border/40">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                Salida Posterior
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {config.tolerancia_salida_posterior_minutos} min
                              </p>
                            </div>
                            <div className="bg-background/40 p-2 rounded-xl border border-border/40 col-span-2 md:col-span-1">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                Salida Anticipada
                              </p>
                              <p className="font-mono text-xs font-bold text-foreground">
                                {config.tolerancia_salida_anticipada_minutos} min
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </UmssCardContent>
              </UmssCard>
            </div>
          </div>
        </div>

        {/* Modal de Advertencia AlertDialog de la librería antes de registrar */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowConfirmDialog(false)
            }
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive font-bold">
                Advertencia de Configuración
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground/80 leading-relaxed">
                Al registrar una nueva regla de asistencia, la regla de asistencia actual será
                vigente hasta un día antes de la regla de asistencia nueva que se está registrando.
                Esta regla se aplica para todas las facultades. ¿Desea continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-xl h-9 text-xs"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSubmit}
                className="rounded-xl h-9 text-xs font-bold bg-[#BC000C] text-white hover:bg-[#90000a] transition-all cursor-pointer"
              >
                Aceptar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal para Editar Vigencia de Regla */}
        <AlertDialog
          open={editingConfig !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingConfig(null)
            }
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold text-foreground">
                Editar Vigencia de Regla (ID: {editingConfig?.id})
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Modifique el intervalo de vigencia de esta configuración. La actualización no
                afectará a los umbrales de minutos si la regla ya está en uso.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 my-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Válido Desde (Inclusivo)
                </label>
                <DatePicker
                  value={editValidFrom}
                  onValueChange={setEditValidFrom}
                  placeholder="Seleccione fecha de inicio"
                  className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Válido Hasta (Exclusivo)
                </label>
                <DatePicker
                  value={editValidTo}
                  onValueChange={setEditValidTo}
                  placeholder="Sin fecha límite (Indefinido)"
                  className="h-9 w-full bg-background rounded-xl border border-border text-xs"
                />
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setEditValidTo(undefined)}
                  className="text-[10px] h-6 px-2 mt-1 rounded-lg"
                >
                  Establecer como Indefinido
                </Button>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setEditingConfig(null)}
                className="rounded-xl h-9 text-xs"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEditSubmit}
                className="rounded-xl h-9 text-xs font-bold bg-umss-dark-blue text-white hover:bg-[#001832] transition-all cursor-pointer"
              >
                Guardar Cambios
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Confirmación para Eliminar Regla */}
        <AlertDialog
          open={deletingConfigId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingConfigId(null)
            }
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive font-bold">
                ¿Eliminar Regla de Asistencia?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground/80 leading-relaxed">
                Esta acción eliminará de forma permanente esta versión de configuración (ID:{" "}
                {deletingConfigId}). Las configuraciones vinculadas a partes diarios registrados en
                borrador o confirmados no pueden ser eliminadas. ¿Desea continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setDeletingConfigId(null)}
                className="rounded-xl h-9 text-xs"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSubmit}
                className="rounded-xl h-9 text-xs font-bold bg-destructive text-white hover:bg-destructive/90 transition-all cursor-pointer"
              >
                Confirmar Eliminación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </ProtectedRoute>
  )
}
