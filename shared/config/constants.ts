export const SYSTEM_TIMEZONE =
  process.env.NEXT_PUBLIC_TIMEZONE || process.env.TZ || "America/La_Paz"
export const SYSTEM_LOCALE = "es-BO"

/**
 * Retorna la fecha y hora actual de emisión formateada para reportes oficiales (DD/MM/AAAA, HH:mm)
 * garantizando la zona horaria del sistema ("America/La_Paz") y formato 24 horas.
 */
export function formatReportEmissionDate(date: Date = new Date()): string {
  return date.toLocaleString(SYSTEM_LOCALE, {
    timeZone: SYSTEM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
