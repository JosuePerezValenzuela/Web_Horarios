"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button, Input, DatePicker } from "@umss/estilos-base/components"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePicker } from "@/components/ui/time-picker"
import { CalendarIcon, Clock, Users, BookOpen, Layers, Search, AlignLeft } from "lucide-react"

import type { CheckAvailabilityRequest } from "../domain/reservation.types"

interface ReservationFormProps {
  formData: CheckAvailabilityRequest
  setFormData: React.Dispatch<React.SetStateAction<CheckAvailabilityRequest>>
  onSubmit: (e?: React.FormEvent) => void
  isLoading: boolean
}

export function ReservationForm({
  formData,
  setFormData,
  onSubmit,
  isLoading,
}: ReservationFormProps) {
  const handleFieldChange = (field: keyof CheckAvailabilityRequest, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e)
  }

  // Parse YYYY-MM-DD to a safe local Date object for the Calendar display
  const targetDate = formData.fecha ? new Date(formData.fecha + "T12:00:00") : undefined

  return (
    <form
      onSubmit={handleFormSubmit}
      className="bg-white/95 dark:bg-[#1e1e1e]/95 border border-gray-150 dark:border-[#2e2e2e] p-4 md:p-5 rounded-2xl shadow-xs flex flex-col gap-4 transition-all duration-300"
    >
      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-3">
        {/* ROW 1: PRIMARY FILTERS & SUBMIT BUTTON */}

        {/* Date Picker (3 cols) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Fecha de Reserva
          </Label>
          <DatePicker
            value={targetDate}
            onValueChange={(date) => {
              if (date) {
                const formatted = date.toISOString().split("T")[0]
                handleFieldChange("fecha", formatted)
              }
            }}
            placeholder="Elegir fecha"
            className="h-9 w-full bg-background rounded-xl border border-border text-xs"
          />
        </div>

        {/* Hora Inicio (2 cols) */}
        <div className="col-span-6 sm:col-span-3 lg:col-span-2 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Hora Inicio
          </Label>
          <TimePicker
            value={formData.horaInicio}
            onChange={(val: string) => handleFieldChange("horaInicio", val)}
            className="h-9 text-xs"
          />
        </div>

        {/* Hora Fin (2 cols) */}
        <div className="col-span-6 sm:col-span-3 lg:col-span-2 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Hora Fin
          </Label>
          <TimePicker
            value={formData.horaFin}
            onChange={(val: string) => handleFieldChange("horaFin", val)}
            className="h-9 text-xs"
          />
        </div>

        {/* Alumnos (Capacity, 2 cols) */}
        <div className="col-span-6 sm:col-span-4 lg:col-span-2 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Alumnos
          </Label>
          <Input
            type="number"
            min={1}
            required
            value={formData.capacidad || ""}
            onChange={(e) => handleFieldChange("capacidad", parseInt(e.target.value) || 0)}
            className="h-9 text-xs w-full"
            placeholder="50"
          />
        </div>

        {/* Consultar Button (Aligned in Row 1 on large screens, 3 cols) */}
        <div className="col-span-6 sm:col-span-8 lg:col-span-3 flex flex-col justify-end">
          {/* Label spacer to align vertically with inputs on lg and above */}
          <div className="hidden lg:block h-[14px] mb-1"></div>
          <Button
            type="submit"
            disabled={isLoading}
            className="umss-btn-primary cursor-pointer w-full h-9 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            {isLoading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Consultar Disponibilidad
          </Button>
        </div>

        {/* ROW 2: SECONDARY FILTERS (DISTRIBUTION, GROUPING, PURPOSE) */}

        {/* Distribución (3 cols) */}
        <div className="col-span-12 sm:col-span-4 lg:col-span-3 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Distribución
          </Label>
          <Select
            value={formData.tipoCapacidad}
            onValueChange={(val: string) => handleFieldChange("tipoCapacidad", val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total" className="text-xs">
                Total (Clase)
              </SelectItem>
              <SelectItem value="examen" className="text-xs">
                Examen
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agrupación (3 cols) */}
        <div className="col-span-12 sm:col-span-4 lg:col-span-3 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Agrupación
          </Label>
          <Select
            value={formData.agrupacion || "bloque"}
            onValueChange={(val: string) => handleFieldChange("agrupacion", val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Agrupación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual" className="text-xs">
                Individuales
              </SelectItem>
              <SelectItem value="bloque" className="text-xs">
                Conjuntos (Bloque)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Motivo (6 cols) */}
        <div className="col-span-12 sm:col-span-4 lg:col-span-6 flex flex-col gap-1">
          <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <AlignLeft className="w-3 h-3 text-[#002855] dark:text-blue-400" /> Motivo
          </Label>
          <Input
            type="text"
            value={formData.purpose || ""}
            onChange={(e) => handleFieldChange("purpose", e.target.value)}
            className="h-9 text-xs w-full"
            placeholder="Ej. Clase de Reposición, Tesis, Examen Parcial"
          />
        </div>
      </div>
    </form>
  )
}
