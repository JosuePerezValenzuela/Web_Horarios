"use client"

import { format } from "date-fns"
import type { Locale } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerRangeProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  locale?: Locale
  placeholder?: string
  className?: string
  numberOfMonths?: number
  disabled?: boolean
}

export function DatePickerRange({
  value,
  onChange,
  locale,
  placeholder = "Seleccionar rango",
  className,
  numberOfMonths = 2,
  disabled,
}: DatePickerRangeProps) {
  const displayText = value?.from
    ? value.to
      ? `${format(value.from, "dd MMM", { locale })} - ${format(value.to, "dd MMM yyyy", { locale })}`
      : format(value.from, "dd MMM yyyy", { locale })
    : placeholder

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={className ?? "h-9 w-full justify-start text-left font-normal"}
        >
          <CalendarIcon className="mr-2 size-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  )
}
