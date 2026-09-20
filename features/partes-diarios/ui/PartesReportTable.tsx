import { memo, useState } from "react"
import { toast, Button, Badge } from "@umss/estilos-base/components"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"

export interface GroupedRow {
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
    virtual?: boolean
  }[]
  ingreso: string
  salida: string
  retraso: number | null
  anticipado: number | null
  falta: boolean
  tipo_tickeo: string
  observacion: string
  originalIngreso: string
  originalSalida: string
  originalTipoTickeo: string
  originalObservacion: string
  alreadySaved: boolean
  hora_ingreso_tickeo?: string | null
  hora_salida_tickeo?: string | null
}

type TipoTickeo = { codigo: string; nombre: string }

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
  tiposTickeo,
  onRowChange,
  isClosed,
}: {
  row: GroupedRow
  tiposTickeo: TipoTickeo[]
  onRowChange: (key: string, field: keyof GroupedRow, value: any) => void
  isClosed: boolean
}) {
  const isOverlap = row.detalles.length > 1
  const handleCellClick = () => {
    if (isClosed)
      toast.info("El parte diario está cerrado y no se permite realizar modificaciones.")
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
          {row.alreadySaved ? (
            row.ingreso !== row.originalIngreso ||
            row.salida !== row.originalSalida ||
            row.tipo_tickeo !== row.originalTipoTickeo ||
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
          <div
            key={index}
            className={detailClass(
              index,
              "font-semibold flex items-center justify-between gap-1 leading-snug"
            )}
          >
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
      <TableCell className="text-center px-1.5 py-1.5 w-24" onClick={handleCellClick}>
        <TimePicker
          value={row.ingreso}
          onChange={(value) => onRowChange(row.key, "ingreso", value)}
          className="mx-auto h-7 w-20 text-xs px-1"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center px-1.5 py-1.5 w-24" onClick={handleCellClick}>
        <TimePicker
          value={row.salida}
          onChange={(value) => onRowChange(row.key, "salida", value)}
          className="mx-auto h-7 w-20 text-xs px-1"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center px-1.5 py-1.5 w-28">
        <div className="flex flex-col gap-1 items-center justify-center">
          {row.falta ? (
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
      <TableCell className="px-1.5 py-1.5 w-32" onClick={handleCellClick}>
        <Select
          value={row.tipo_tickeo}
          onValueChange={(value) => onRowChange(row.key, "tipo_tickeo", value)}
          disabled={isClosed}
        >
          <SelectTrigger size="sm" className="w-full text-xs h-7 px-2">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {tiposTickeo.map((tipo) => (
              <SelectItem key={tipo.codigo} value={tipo.codigo} className="text-xs">
                {tipo.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-1.5 py-1.5 min-w-[140px]" onClick={handleCellClick}>
        <ObservationInput
          value={row.observacion}
          onChange={(value) => onRowChange(row.key, "observacion", value)}
          disabled={isClosed}
        />
      </TableCell>
    </TableRow>
  )
})

export function PartesReportTable({
  rows,
  tiposTickeo,
  onRowChange,
  isClosed,
  loading = false,
}: {
  rows: GroupedRow[]
  tiposTickeo: TipoTickeo[]
  onRowChange: (key: string, field: keyof GroupedRow, value: any) => void
  isClosed: boolean
  loading?: boolean
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
              { label: "Tipo Tickeo", className: "w-32 text-left" },
              { label: "Observación", className: "min-w-[140px] text-left" },
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
          {loading
            ? SKELETON_ROWS.map((_, idx) => (
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
                    <div className="h-7 w-24 bg-muted-foreground/20 rounded-xl" />
                  </TableCell>
                  <TableCell className="px-1.5 py-2">
                    <div className="h-7 w-full max-w-[200px] bg-muted-foreground/20 rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            : rows.map((row) => (
                <PartesTableRow
                  key={row.key}
                  row={row}
                  tiposTickeo={tiposTickeo}
                  onRowChange={onRowChange}
                  isClosed={isClosed}
                />
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
