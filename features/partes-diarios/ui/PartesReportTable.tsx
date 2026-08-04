"use client"

import { memo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
  tipo_tickeo: string
  observacion: string
  originalIngreso: string
  originalSalida: string
  originalTipoTickeo: string
  originalObservacion: string
  alreadySaved: boolean
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
    <Input
      disabled={disabled}
      type="text"
      placeholder="Escribir observación..."
      className="h-8 w-full rounded-lg border border-border/80 bg-background text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75"
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
  onRowChange: (key: string, field: keyof GroupedRow, value: string) => void
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
      <TableCell className="text-center font-mono font-bold text-slate-500">
        {row.indices.join(", ")}
      </TableCell>
      <TableCell className="whitespace-nowrap text-center font-mono font-medium leading-tight text-slate-800 dark:text-slate-200">
        <div>{row.hora_inicio}</div>
        <div className="text-[10px] text-slate-400">↓</div>
        <div>{row.hora_fin}</div>
        <div className="mt-1.5 flex flex-col items-center gap-1">
          {isOverlap && (
            <Badge className="rounded border-none bg-amber-500 px-1 py-0.5 text-[8.5px] text-white">
              Solapado
            </Badge>
          )}
          {row.alreadySaved ? (
            row.ingreso !== row.originalIngreso ||
            row.salida !== row.originalSalida ||
            row.tipo_tickeo !== row.originalTipoTickeo ||
            row.observacion !== row.originalObservacion ? (
              <Badge className="rounded border-none bg-blue-600 px-1 py-0.5 text-[8.5px] text-white">
                Modificado
              </Badge>
            ) : (
              <Badge className="rounded border-none bg-green-600 px-1 py-0.5 text-[8.5px] text-white">
                Registrado
              </Badge>
            )
          ) : (
            <Badge className="rounded border-none bg-slate-500 px-1 py-0.5 text-[8.5px] text-white">
              Pendiente
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-bold text-slate-900 dark:text-white">
        {row.persona_nombres}
      </TableCell>
      <TableCell className="text-xs text-slate-700 dark:text-slate-300">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-semibold")}>
            {detail.asignatura_nombre}
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center font-bold text-foreground">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-bold")}>
            {detail.grupo_nombre}
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
        {row.detalles.map((detail, index) => (
          <div key={index} className={detailClass(index, "font-mono")}>
            {detail.aula_codigo || "S/R"}
          </div>
        ))}
      </TableCell>
      <TableCell className="text-center" onClick={handleCellClick}>
        <TimePicker
          value={row.ingreso}
          onChange={(value) => onRowChange(row.key, "ingreso", value)}
          className="mx-auto h-8 w-24"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center" onClick={handleCellClick}>
        <TimePicker
          value={row.salida}
          onChange={(value) => onRowChange(row.key, "salida", value)}
          className="mx-auto h-8 w-24"
          disabled={isClosed}
        />
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant={row.retraso !== null && row.retraso > 0 ? "destructive" : "secondary"}
          className="rounded px-2 py-0.5 font-mono text-xs"
        >
          {row.retraso === null ? "-" : `${row.retraso} min`}
        </Badge>
      </TableCell>
      <TableCell onClick={handleCellClick}>
        <Select
          value={row.tipo_tickeo}
          onValueChange={(value) => onRowChange(row.key, "tipo_tickeo", value)}
          disabled={isClosed}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-36 rounded-lg text-xs disabled:cursor-not-allowed disabled:opacity-75"
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
      <TableCell onClick={handleCellClick}>
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
  onRowChange: (key: string, field: keyof GroupedRow, value: string) => void
  isClosed: boolean
}) {
  return (
    <div className="flex-grow overflow-x-auto max-h-[calc(100vh-270px)] rounded-xl border border-border/60">
      <Table className="min-w-[1200px] w-full">
        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
          <TableRow>
            {[
              "N°",
              "Horario",
              "Docente",
              "Asignatura",
              "Grupo",
              "Aula",
              "Ingreso",
              "Salida",
              "Retraso (m)",
              "Tipo Tickeo",
              "Observación",
            ].map((label, index) => (
              <TableHead
                key={label}
                className={`${index === 0 ? "w-12" : ""} text-center font-bold`}
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
