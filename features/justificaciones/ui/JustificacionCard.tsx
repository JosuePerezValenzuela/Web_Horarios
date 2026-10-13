"use client"

import { useState } from "react"
import { Badge, Button } from "@umss/estilos-base/components"
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Banknote,
  MapPin,
  Laptop,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { JustificacionListItem, TipoJustificacion } from "../domain/types"

interface JustificacionCardProps {
  justificacion: JustificacionListItem
  tipo?: TipoJustificacion
  onAprobar: (justificacion: JustificacionListItem) => void
  onRechazar: (justificacion: JustificacionListItem) => void
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

export function JustificacionCard({
  justificacion,
  tipo,
  onAprobar,
  onRechazar,
}: JustificacionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isPendiente = justificacion.estado === "pendiente"
  const isAprobada = justificacion.estado === "aprobada"
  const isRechazada = justificacion.estado === "rechazada"

  const tipoNombre =
    justificacion.tipo_justificacion?.nombre ||
    tipo?.nombre ||
    `Tipo #${justificacion.tipo_justificacion_id}`

  const totalOcurrencias = (justificacion.horarios || []).reduce(
    (acc, h) => acc + (h.ocurrencias?.length || 0),
    0
  )

  const formatHora = (hora: string) => (hora ? hora.slice(0, 5) : "")

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all bg-card overflow-hidden shadow-xs",
        isPendiente && "border-border hover:border-primary/40",
        isAprobada && "border-green-200 dark:border-green-900/50 bg-green-50/10",
        isRechazada && "border-destructive/20 bg-destructive/5 opacity-85"
      )}
    >
      {/* Encabezado de la Tarjeta */}
      <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Docente / Persona */}
          <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
            <User className="w-4 h-4 text-primary shrink-0" />
            <span>Docente #{justificacion.persona_id}</span>
          </div>

          <span className="text-muted-foreground/40 hidden sm:inline">•</span>

          {/* Fecha */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {justificacion.fecha_desde === justificacion.fecha_hasta
                ? justificacion.fecha_desde
                : `${justificacion.fecha_desde} al ${justificacion.fecha_hasta}`}
            </span>
          </div>

          {/* Badges de tamaño uniforme */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full"
            >
              {tipoNombre}
            </Badge>

            {isPendiente && (
              <Badge
                variant="warning"
                className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full uppercase tracking-wider"
              >
                Pendiente
              </Badge>
            )}

            {isAprobada && (
              <Badge
                variant="primary"
                className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full uppercase tracking-wider bg-green-600 text-white dark:bg-green-700"
              >
                Aprobada
              </Badge>
            )}

            {isRechazada && (
              <Badge
                variant="destructive"
                className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full uppercase tracking-wider"
              >
                Rechazada
              </Badge>
            )}

            <Badge
              variant={justificacion.con_goce_haberes ? "primary" : "neutral"}
              className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full"
            >
              <Banknote className="w-3.5 h-3.5 shrink-0" />
              <span>
                {justificacion.con_goce_haberes ? "Con goce de haberes" : "Sin goce de haberes"}
              </span>
            </Badge>

            {justificacion.uuid_doc && (
              <Badge
                variant="outline"
                className="h-6 px-2.5 text-xs font-semibold inline-flex items-center gap-1 rounded-full border-primary/30 text-primary"
                title={`UUID SGD: ${justificacion.uuid_doc}`}
              >
                <FileCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Documento SGD</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Si está pendiente: Aprobar o Rechazar */}
          {isPendiente && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRechazar(justificacion)}
                className="h-8 px-3 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 rounded-xl"
              >
                <XCircle className="w-3.5 h-3.5" />
                Rechazar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onAprobar(justificacion)}
                className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobar
              </Button>
            </>
          )}

          {/* Si está aprobada: Se permite rechazar (transición aprobada -> rechazada) */}
          {isAprobada && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRechazar(justificacion)}
              className="h-8 px-3 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 rounded-xl"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rechazar
            </Button>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="p-4 sm:p-5 space-y-3.5 text-xs">
        {/* Descripción / Motivo y Resumen de Horarios */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Motivo / Descripción
            </span>

            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <span>
                {justificacion.horarios?.length || 0}{" "}
                {justificacion.horarios?.length === 1
                  ? "horario involucrado"
                  : "horarios involucrados"}
              </span>
              <span className="text-primary font-medium">
                • {totalOcurrencias} ocurrencias {totalOcurrencias === 1 ? "cubierta" : "cubiertas"}
              </span>
            </div>
          </div>

          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {justificacion.descripcion}
          </p>
        </div>

        {/* Motivo de rechazo si existe */}
        {justificacion.motivo_rechazo && (
          <div
            className={cn(
              "p-3 rounded-xl border text-xs space-y-1",
              isRechazada
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-muted/40 border-border text-foreground"
            )}
          >
            <span className="font-bold block text-[11px]">Motivo del Rechazo:</span>
            <p className="italic text-foreground">{justificacion.motivo_rechazo}</p>
          </div>
        )}

        {/* Toggle para Ver Horarios Detallados */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer select-none py-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ocultar detalle de horarios y ocurrencias ({totalOcurrencias})
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver detalle de horarios y ocurrencias ({totalOcurrencias})
              </>
            )}
          </button>

          {/* Lista Expandida de Horarios y sus Ocurrencias */}
          {expanded && (
            <div className="mt-3 space-y-3 pt-3 border-t border-border/50 animate-in fade-in-50 duration-150">
              {(justificacion.horarios || []).map((horarioItem) => (
                <div
                  key={`horario-${horarioItem.horario_id}`}
                  className="p-3 rounded-xl border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Horario #{horarioItem.horario_id}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {horarioItem.ocurrencias?.length || 0}{" "}
                      {horarioItem.ocurrencias?.length === 1 ? "ocurrencia" : "ocurrencias"}
                    </span>
                  </div>

                  {(!horarioItem.ocurrencias || horarioItem.ocurrencias.length === 0) && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Sin ocurrencias proyectadas en el rango de fechas.
                    </p>
                  )}

                  {horarioItem.ocurrencias && horarioItem.ocurrencias.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {horarioItem.ocurrencias.map((oc, oIdx) => (
                        <div
                          key={`${horarioItem.horario_id}-${oc.fecha}-${oIdx}`}
                          className="p-2 rounded-lg bg-card border border-border/60 text-[11px] space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span>
                              {DIAS_SEMANA[oc.dia] ?? "Día"} {oc.fecha}
                            </span>
                            {oc.virtual && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                                <Laptop className="w-3 h-3" />
                                Virtual
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary shrink-0" />
                              {formatHora(oc.hora_inicio)} - {formatHora(oc.hora_fin)}
                            </span>

                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {oc.aula_codigo ? `Aula ${oc.aula_codigo}` : "Sin aula"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
