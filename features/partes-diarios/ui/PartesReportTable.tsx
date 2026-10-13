import { memo, useState } from "react"
import { toast, Badge } from "@umss/estilos-base/components"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TimePicker } from "@/components/ui/time-picker"

export interface GroupedRow {
  key: string
  indices: number[]
  ids: number[]
  persona_nombres: string
  persona_codigo?: string
  hora_inicio: string
  hora_fin: string
  horario_id?: number
  detalles: {
    horario_id?: number
    asignatura_nombre: string
    grupo_nombre: string
    aula_codigo: string
    virtual?: boolean
    tiene_justificacion?: boolean
    tipo_justificacion_nombre?: string | null
    estado_justificacion?: string | null
  }[]
  tiene_justificacion?: boolean
  tipo_justificacion_nombre?: string | null
  estado_justificacion?: string | null
  isJustificacionAprobada?: boolean
  ingreso: string
  salida: string
  retraso: number | null
  anticipado: number | null
  falta: boolean
  observacion: string
  originalIngreso: string
  originalSalida: string
  originalObservacion: string
  alreadySaved: boolean
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
}

export function isCalculoPresente(row: GroupedRow): boolean {
  if (row.isJustificacionAprobada) return false
  if (row.falta) return false
  if (!row.hora_ingreso_tickeo && !row.hora_salida_tickeo) return false
  if (row.retraso !== null && row.retraso > 0) return false
  if (row.anticipado !== null && row.anticipado > 0) return false
  return true
}

function ObservationInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const [localValue, setLocalValue] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)

  if (value !== previousValue) {
    setLocalValue(value)
    setPreviousValue(value)
  }

  return (
    <textarea
      disabled={disabled}
      placeholder="Escribir justificación..."
      className="h-8 w-full min-w-[140px] rounded-lg border border-border/80 bg-background px-2 py-1 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75 resize-none overflow-y-auto leading-tight"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={() => onChange(localValue)}
    />
  )
}

const SKELETON_ROWS = Array.from({ length: 8 })

const PartesTableRow = memo(function PartesTableRow({
  row,
  onRowChange,
  isClosed,
  onJustificar,
}: {
  row: GroupedRow
  onRowChange: (key: string, field: keyof GroupedRow, value: string) => void
  isClosed: boolean
  onJustificar?: (row: GroupedRow) => void
}) {
  const isOverlap = row.detalles.length > 1
  const isJustificacionAprobada = Boolean(row.isJustificacionAprobada)

  const handleCellClick = () => {
    if (isClosed) {
      toast.info("El parte diario está cerrado y no se permite realizar modificaciones.")
    } else if (isJustificacionAprobada) {
      toast.info(
        "Este horario cuenta con una justificación aprobada. No se permite modificar el ingreso ni la salida."
      )
    }
  }
  const detailClass = (index: number, extra = "") =>
    `${index > 0 ? "border-t border-slate-200 pt-1 mt-1 dark:border-slate-800" : ""} ${extra}`

  return (
    <TableRow
      className={isOverlap ? "bg-amber-50/20 hover:bg-amber-50/30 dark:bg-amber-950/10" : ""}
    >
      <TableCell className="text-center font-mono font-bold text-slate-500 px-1.5 py-1.5 w-10">
        {row.indices.join(", ")}
      </TableCell>
      <TableCell className="whitespace-nowrap text-center font-mono font-medium leading-tight text-slate-800 dark:text-slate-200 px-1.5 py-1.5 w-24">
        <div>{row.hora_inicio}</div>
        <div className="text-[10px] text-muted-foreground font-bold">↓</div>
        <div>{row.hora_fin}</div>
        <div className="mt-1 flex flex-col items-center gap-0.5">
          {isOverlap && (
            <Badge
              variant="brand"
              className="text-[8px] px-1 py-0 font-bold uppercase leading-none rounded-md"
            >
              Solapado
            </Badge>
          )}
          {row.isJustificacionAprobada ? (
            <Badge
              variant="primary"
              className="text-[8px] px-1 py-0 font-bold uppercase leading-none rounded-md bg-green-600 text-white dark:bg-green-700"
            >
              Justificado
            </Badge>
          ) : row.alreadySaved ? (
            row.ingreso !== row.originalIngreso ||
            row.salida !== row.originalSalida ||
            row.observacion !== row.originalObservacion ? (
              <Badge
                variant="primary"
                className="text-[8px] px-1 py-0 font-bold uppercase leading-none rounded-md"
              >
                Modificado
              </Badge>
            ) : (
              <Badge
                variant="brand"
                className="text-[8px] px-1 py-0 font-bold uppercase leading-none rounded-md"
              >
                Registrado
              </Badge>
            )
          ) : (
            <Badge
              variant="neutral"
              className="text-[8px] px-1 py-0 font-bold uppercase leading-none rounded-md"
            >
              Pendiente
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-bold text-foreground px-2 py-1.5 min-w-[130px] max-w-[180px] break-words">
        <span className="line-clamp-2 leading-snug">{row.persona_nombres}</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground px-2 py-1.5 min-w-[150px] max-w-[210px] break-words">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-semibold leading-snug")}>
            <div className="flex items-center justify-between gap-1">
              <span className="break-words">
                {detail.asignatura_nombre} -{" "}
                <span className="font-bold text-foreground">{detail.grupo_nombre}</span>
              </span>
              {detail.virtual && (
                <Badge
                  variant="brand"
                  className="text-[9px] px-1 py-0 font-bold uppercase tracking-wider shrink-0 rounded-md"
                >
                  Virtual
                </Badge>
              )}
            </div>

            {detail.tiene_justificacion && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <Badge
                  variant={
                    detail.estado_justificacion?.toLowerCase().startsWith("aprob")
                      ? "primary"
                      : detail.estado_justificacion?.toLowerCase().startsWith("rechaz")
                        ? "destructive"
                        : "warning"
                  }
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 font-semibold rounded-md flex items-center gap-1",
                    detail.estado_justificacion?.toLowerCase().startsWith("aprob") &&
                      "bg-green-600 text-white dark:bg-green-700"
                  )}
                  title={`Justificación ${detail.estado_justificacion || "pendiente"}: ${detail.tipo_justificacion_nombre || "Sin tipo"}`}
                >
                  <span className="truncate max-w-[130px]">
                    {detail.tipo_justificacion_nombre || "Justificación"}
                  </span>
                  <span className="uppercase font-bold text-[8px] opacity-90 shrink-0">
                    ({detail.estado_justificacion || "pendiente"})
                  </span>
                </Badge>
              </div>
            )}
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center font-mono font-semibold text-foreground px-1.5 py-1.5 w-16">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-mono text-xs")}>
            {detail.virtual ? (
              <span className="text-[11px] text-primary dark:text-primary-text font-bold">
                VIRTUAL
              </span>
            ) : (
              detail.aula_codigo || "S/R"
            )}
          </div>
        ))}
      </TableCell>
      <TableCell
        className="text-center px-1.5 py-1.5 w-24"
        onClick={handleCellClick}
        title={
          isJustificacionAprobada
            ? "Justificación aprobada: no se permite editar el ingreso"
            : undefined
        }
      >
        <TimePicker
          value={row.ingreso}
          onChange={(value) => onRowChange(row.key, "ingreso", value)}
          className="mx-auto h-7 w-20 text-xs px-1"
          disabled={isClosed || isJustificacionAprobada}
        />
      </TableCell>
      <TableCell
        className="text-center px-1.5 py-1.5 w-24"
        onClick={handleCellClick}
        title={
          isJustificacionAprobada
            ? "Justificación aprobada: no se permite editar la salida"
            : undefined
        }
      >
        <TimePicker
          value={row.salida}
          onChange={(value) => onRowChange(row.key, "salida", value)}
          className="mx-auto h-7 w-20 text-xs px-1"
          disabled={isClosed || isJustificacionAprobada}
        />
      </TableCell>
      <TableCell className="text-center px-1.5 py-1.5 w-28">
        <div className="flex flex-col gap-1 items-center justify-center">
          {isJustificacionAprobada ? (
            <Badge
              variant="primary"
              className="font-mono text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-md bg-green-600 text-white dark:bg-green-700"
              title="Horario con justificación aprobada"
            >
              Justificado
            </Badge>
          ) : row.falta ? (
            <Badge
              variant="error"
              className="font-mono text-[9px] px-1 py-0 font-bold uppercase tracking-wider rounded-md"
            >
              FALTA
            </Badge>
          ) : !row.hora_ingreso_tickeo && !row.hora_salida_tickeo ? (
            <span className="text-muted-foreground font-mono text-xs">—</span>
          ) : (
            <>
              {row.retraso !== null && row.retraso > 0 && (
                <Badge
                  variant="error"
                  className="font-mono text-[9px] px-1 py-0 font-bold rounded-md"
                >
                  {row.retraso} min retr.
                </Badge>
              )}
              {row.anticipado !== null && row.anticipado > 0 && (
                <Badge
                  variant="warning"
                  className="font-mono text-[9px] px-1 py-0 font-bold rounded-md"
                >
                  {row.anticipado} min ant.
                </Badge>
              )}
              {(!row.retraso || row.retraso <= 0) && (!row.anticipado || row.anticipado <= 0) && (
                <Badge
                  variant="brand"
                  className="font-mono text-[9px] px-1 py-0 font-bold uppercase rounded-md"
                >
                  Presente
                </Badge>
              )}
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="px-1.5 py-1.5 min-w-[140px]" onClick={handleCellClick}>
        <ObservationInput
          value={row.observacion}
          onChange={(value) => onRowChange(row.key, "observacion", value)}
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center px-1.5 py-1.5 w-16">
        <button
          type="button"
          onClick={() => onJustificar?.(row)}
          className={cn(
            "inline-flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer",
            row.isJustificacionAprobada
              ? "text-green-600 dark:text-green-400 hover:bg-green-100/30"
              : row.tiene_justificacion
                ? "text-amber-600 dark:text-amber-400 hover:bg-amber-100/30"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          )}
          title={
            row.isJustificacionAprobada
              ? "Horario con justificación aprobada"
              : row.tiene_justificacion
                ? "Horario con justificación registrada"
                : "Registrar justificación"
          }
          aria-label="Registrar justificación"
        >
          <FileText className="w-4 h-4" />
        </button>
      </TableCell>
    </TableRow>
  )
})

export function PartesReportTable({
  rows,
  onRowChange,
  isClosed,
  loading = false,
  onJustificar,
}: {
  rows: GroupedRow[]
  onRowChange: (key: string, field: keyof GroupedRow, value: string) => void
  isClosed: boolean
  loading?: boolean
  onJustificar?: (row: GroupedRow) => void
}) {
  return (
    <div className="flex-1 min-h-0 w-full overflow-auto rounded-2xl border border-border bg-card shadow-xs">
      <Table
        containerClassName="border-0 shadow-none rounded-none w-full"
        className="min-w-[880px] xl:min-w-full w-full"
      >
        <TableHeader className="bg-muted/50 border-b border-border/80 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            {[
              { label: "N°", className: "w-10 text-center" },
              { label: "Horario", className: "w-24 text-center" },
              { label: "Docente", className: "min-w-[130px] max-w-[180px] text-left" },
              { label: "Asignatura - Gr", className: "min-w-[150px] max-w-[210px] text-left" },
              { label: "Aula", className: "w-16 text-center" },
              { label: "Ingreso", className: "w-24 text-center" },
              { label: "Salida", className: "w-24 text-center" },
              { label: "Cálculos Asistencia", className: "w-28 text-center" },
              { label: "Observación", className: "min-w-[140px] text-left" },
              { label: "Acciones", className: "w-16 text-center" },
            ].map(({ label, className }) => (
              <TableHead
                key={label}
                className={`${className} font-bold text-xs text-foreground/80 px-2 py-2`}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            SKELETON_ROWS.map((_, idx) => (
              <TableRow key={idx} className="border-b border-border/50 animate-pulse">
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-4 w-4 mx-auto bg-muted-foreground/20 rounded" />
                </TableCell>
                <TableCell className="px-1.5 py-2">
                  <div className="h-4 w-16 mx-auto bg-muted-foreground/20 rounded mb-1" />
                  <div className="h-3 w-12 mx-auto bg-muted-foreground/15 rounded" />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-1" />
                  <div className="h-3 w-20 bg-muted-foreground/15 rounded" />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="h-4 w-36 bg-muted-foreground/20 rounded mb-1" />
                  <div className="h-3 w-16 bg-muted-foreground/15 rounded" />
                </TableCell>
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-4 w-10 mx-auto bg-muted-foreground/20 rounded" />
                </TableCell>
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-7 w-16 mx-auto bg-muted-foreground/20 rounded-xl" />
                </TableCell>
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-7 w-16 mx-auto bg-muted-foreground/20 rounded-xl" />
                </TableCell>
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-5 w-16 mx-auto bg-muted-foreground/20 rounded-full" />
                </TableCell>
                <TableCell className="px-1.5 py-2">
                  <div className="h-7 w-full max-w-[200px] bg-muted-foreground/20 rounded-lg" />
                </TableCell>
                <TableCell className="px-1.5 py-2 text-center">
                  <div className="h-6 w-6 mx-auto bg-muted-foreground/20 rounded" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="text-center py-10 text-xs text-muted-foreground font-medium"
              >
                No se encontraron horarios que coincidan con el filtro aplicado.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <PartesTableRow
                key={row.key}
                row={row}
                onRowChange={onRowChange}
                isClosed={isClosed}
                onJustificar={onJustificar}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
