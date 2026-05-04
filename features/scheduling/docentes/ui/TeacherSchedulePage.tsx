import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, RefreshCw } from "lucide-react"

import type {
  DocenteScheduleMeta,
  GroupSummary,
  NormalizedSchedule,
  TimeRange,
  TimeRow,
} from "../domain/types"
import { GroupSummaryCard } from "./GroupSummaryCard"
import { WeeklyScheduleGrid } from "./WeeklyScheduleGrid"
import { AsignarHorarioModal } from "./AsignarHorarioModal"

interface TeacherSchedulePageProps {
  docente: DocenteScheduleMeta | null
  groups: GroupSummary[]
  schedules: NormalizedSchedule[]
  period: number
  rows: TimeRow[]
  timeRange: TimeRange
  loading: boolean
  error: string | null
  onRetry: () => void
  onBack: () => void
  onPeriodChange: (period: number) => void
  docenteId?: string
  onAssignClick?: (group: GroupSummary) => void
  onAssigned?: () => void | Promise<void>
}

export function TeacherSchedulePage({
  docente,
  groups,
  schedules,
  period,
  rows,
  timeRange,
  loading,
  error,
  onRetry,
  onBack,
  onPeriodChange,
  docenteId,
  onAssignClick,
  onAssigned,
}: TeacherSchedulePageProps) {
  const hasSchedules = schedules.length > 0

  const handleAssignClick = (group: GroupSummary) => {
    if (onAssignClick) {
      onAssignClick(group)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:gap-5">
      <header className="rounded-3xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Vista semanal del docente</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {docente?.nombres ?? "Cargando..."} · CI: {docente?.documento ?? "--"} · Código:{" "}
              {docente?.codigo ?? "--"}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Button>
        </div>
      </header>

      {error ? (
        <section className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6">
          <p className="font-medium text-destructive">
            No pudimos cargar los horarios del docente.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            <RefreshCw className="mr-2 size-4" />
            Reintentar
          </Button>
        </section>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:items-stretch">
        <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-3 md:p-4 lg:h-full lg:max-h-full">
          <div className="space-y-1.5">
            <Label htmlFor="periodo-horario" className="text-sm font-medium">
              Período (minutos)
            </Label>
            <Input
              id="periodo-horario"
              type="number"
              min={1}
              value={period}
              onChange={(event) => onPeriodChange(Number(event.target.value))}
              aria-label="Periodo de segmentacion en minutos"
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground"> Valor editable.</p>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen por grupo
            </p>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`skeleton-card-${index + 1}`}
                    className="h-20 animate-pulse rounded-3xl border border-border bg-muted"
                  />
                ))
              ) : groups.length > 0 ? (
                groups.map((group) => (
                  <GroupSummaryCard
                    key={group.groupKey}
                    group={group}
                    onAssignClick={onAssignClick ? handleAssignClick : undefined}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  Sin grupos disponibles para este docente.
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full lg:max-h-full">
          {loading ? (
            <div className="h-[420px] animate-pulse rounded-3xl border border-border bg-muted" />
          ) : hasSchedules ? (
            <div className="min-h-0 flex-1">
              <WeeklyScheduleGrid schedules={schedules} rows={rows} timeRange={timeRange} />
            </div>
          ) : (
            <section className="rounded-3xl border border-border bg-muted/40 p-8 text-center">
              <h3 className="text-lg font-semibold">Sin horarios cargados</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Este docente no tiene horarios normalizados para mostrar en la grilla semanal.
              </p>
            </section>
          )}
        </main>
      </div>

      {docenteId && onAssignClick && <AsignarHorarioModal onAssigned={onAssigned} />}
    </div>
  )
}
