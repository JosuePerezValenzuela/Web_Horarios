import { memo, useState } from "react"
import { toast, Button, Badge } from "@umss/estilos-base/components"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  detalles: { asignatura_nombre: string; grupo_nombre: string; aula_codigo: string }[]
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
      className="h-9 w-full min-w-[200px] max-w-[320px] rounded-lg border border-border/80 bg-background px-2 py-1 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75 resize-none overflow-y-auto leading-normal"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={() => onChange(localValue)}
    />
  )
}

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
      <TableCell className="text-center font-mono font-bold text-slate-500 px-2 py-1.5">
        {row.indices.join(", ")}
      </TableCell>
      <TableCell className="whitespace-nowrap text-center font-mono font-medium leading-tight text-slate-800 dark:text-slate-200 px-2 py-1.5">
        <div>{row.hora_inicio}</div>
        <div className="text-[10px] text-slate-400">↓</div>
        <div>{row.hora_fin}</div>
        <div className="mt-1.5 flex flex-col items-center gap-1">
          {isOverlap && (
            <Badge variant="brand" className="text-[8px] font-bold uppercase leading-none">
              Solapado
            </Badge>
          )}
          {row.alreadySaved ? (
            row.ingreso !== row.originalIngreso ||
            row.salida !== row.originalSalida ||
            row.tipo_tickeo !== row.originalTipoTickeo ||
            row.observacion !== row.originalObservacion ? (
              <Badge variant="primary" className="text-[8px] font-bold uppercase leading-none">
                Modificado
              </Badge>
            ) : (
              <Badge variant="brand" className="text-[8px] font-bold uppercase leading-none">
                Registrado
              </Badge>
            )
          ) : (
            <Badge variant="neutral" className="text-[8px] font-bold uppercase leading-none">
              Pendiente
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-bold text-slate-900 dark:text-white px-2 py-1.5">
        {row.persona_nombres}
      </TableCell>
      <TableCell className="text-xs text-slate-700 dark:text-slate-300 px-2 py-1.5">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-semibold")}>
            {detail.asignatura_nombre} -{" "}
            <span className="font-bold text-foreground">{detail.grupo_nombre}</span>
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300 px-2 py-1.5">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-mono")}>
            {detail.aula_codigo || "S/R"}
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center px-2 py-1.5" onClick={handleCellClick}>
        <TimePicker
          value={row.ingreso}
          onChange={(value) => onRowChange(row.key, "ingreso", value)}
          className="mx-auto h-8 w-24"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center px-2 py-1.5" onClick={handleCellClick}>
        <TimePicker
          value={row.salida}
          onChange={(value) => onRowChange(row.key, "salida", value)}
          className="mx-auto h-8 w-24"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center px-2 py-1.5">
        <div className="flex flex-col gap-1.5 items-center justify-center">
          {!row.hora_ingreso_tickeo && !row.hora_salida_tickeo ? (
            <span className="text-slate-400 font-mono text-xs">—</span>
          ) : (
            <>
              {row.retraso !== null && row.retraso > 0 && (
                <Badge variant="error" className="font-mono text-[10px] font-bold">
                  {row.retraso} min retr.
                </Badge>
              )}
              {row.anticipado !== null && row.anticipado > 0 && (
                <Badge variant="warning" className="font-mono text-[10px] font-bold">
                  {row.anticipado} min ant.
                </Badge>
              )}
              {row.falta && (
                <Badge
                  variant="error"
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                >
                  FALTA
                </Badge>
              )}
              {(!row.retraso || row.retraso <= 0) &&
                (!row.anticipado || row.anticipado <= 0) &&
                !row.falta && (
                  <Badge variant="brand" className="font-mono text-[10px] font-bold uppercase">
                    Presente
                  </Badge>
                )}
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="px-2 py-1.5" onClick={handleCellClick}>
        <Select
          value={row.tipo_tickeo}
          onValueChange={(value) => onRowChange(row.key, "tipo_tickeo", value)}
          disabled={isClosed}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-36 rounded-lg text-xs disabled:cursor-not-allowed disabled:opacity-75 bg-background"
          >
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {tiposTickeo.map((tipo) => (
              <SelectItem key={tipo.codigo} value={tipo.codigo}>
                {tipo.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-2 py-1.5" onClick={handleCellClick}>
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
}: {
  rows: GroupedRow[]
  tiposTickeo: TipoTickeo[]
  onRowChange: (key: string, field: keyof GroupedRow, value: any) => void
  isClosed: boolean
}) {
  return (
    <div className="flex-grow overflow-x-auto max-h-[calc(100vh-270px)] rounded-3xl border border-border">
      <Table className="min-w-[1000px] w-full">
        <TableHeader className="bg-muted/50 border-b border-border/80 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            {[
              "N°",
              "Horario",
              "Docente",
              "Asignatura - Gr",
              "Aula",
              "Ingreso",
              "Salida",
              "Cálculos Asistencia",
              "Tipo Tickeo",
              "Observación",
            ].map((label, index) => (
              <TableHead
                key={label}
                className={`${index === 0 ? "w-12" : ""} text-center font-bold text-xs text-foreground/80 px-2 py-2`}
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
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
