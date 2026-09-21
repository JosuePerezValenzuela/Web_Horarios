import { useState, useMemo } from "react"
import { Button, Input, ScrollArea, Badge } from "@umss/estilos-base/components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, RefreshCw, ClipboardList, Maximize2, Minimize2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

import type {
  DocenteScheduleMeta,
  GroupSummary,
  NormalizedSchedule,
  TimeRange,
  TimeRow,
  AdminSchedule,
  AdminScheduleRaw,
} from "../domain/types"
import { GroupSummaryCard } from "./GroupSummaryCard"
import { WeeklyScheduleGrid } from "./WeeklyScheduleGrid"
import { BulkAssignmentModal } from "./BulkAssignmentModal"
import { AdminSchedulesModal } from "./AdminSchedulesModal"

interface TeacherSchedulePageProps {
  docente: DocenteScheduleMeta | null
  groups: GroupSummary[]
  schedules: NormalizedSchedule[]
  period: number
  overlapRotationIntervalMs?: number
  rows: TimeRow[]
  timeRange: TimeRange
  loading: boolean
  error: string | null
  onRetry: () => void
  onBack: () => void
  onPeriodChange: (period: number) => void
  docenteId?: string
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
  onEditSchedule?: (schedule: NormalizedSchedule) => void
  onAssigned?: () => void | Promise<void>
  adminSchedules?: AdminSchedule[]
  rawAdminSchedules?: AdminScheduleRaw[]
}

export function TeacherSchedulePage({
  docente,
  groups,
  schedules,
  period,
  overlapRotationIntervalMs,
  rows,
  timeRange,
  loading,
  error,
  onRetry,
  onBack,
  onPeriodChange,
  docenteId,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onEditSchedule,
  onAssigned,
  adminSchedules,
  rawAdminSchedules = [],
}: TeacherSchedulePageProps) {
  const hasSchedules = schedules.length > 0 || Boolean(adminSchedules && adminSchedules.length > 0)
  const [isCompactMode, setIsCompactMode] = useState(false)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)

  const handleAddClick = (group: GroupSummary) => {
    onAddClick?.(group)
  }

  const handleEditClick = (group: GroupSummary) => {
    onEditClick?.(group)
  }

  const handleDeleteClick = (group: GroupSummary) => {
    onDeleteClick?.(group)
  }

  // Calcular la carga horaria administrativa total acumulada de horarios vigentes/activos
  const totalCargaAdministrativa = useMemo(() => {
    // Get local today string in YYYY-MM-DD
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    const todayStr = `${y}-${m}-${d}`

    const activeAdmin = rawAdminSchedules.filter((h) => {
      const startOk = h.fecha_inicio <= todayStr
      const endOk = h.fecha_fin === null || h.fecha_fin >= todayStr
      return startOk && endOk
    })

    return activeAdmin.reduce((acc, h) => {
      const carga = h.carga_horaria_diaria ?? h.horario_catalogo?.carga_horaria_diaria ?? 0
      return acc + Number(carga)
    }, 0)
  }, [rawAdminSchedules])

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col gap-4 overflow-hidden lg:gap-5">
      <header className="rounded-3xl border border-border bg-card p-3 md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 flex-row items-center gap-3">
            <Button variant="outline" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft className="mr-2 size-4" />
              Volver
            </Button>

            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
              <h1 className="shrink-0 text-sm font-semibold text-foreground md:text-base">
                Vista semanal del docente
              </h1>
              <p
                className="min-w-0 truncate text-xs text-muted-foreground"
                title={`${docente?.nombres ?? "Cargando..."} · CI: ${docente?.documento ?? "--"} · Código: ${docente?.codigo ?? "--"}`}
              >
                {docente?.nombres ?? "Cargando..."} · CI: {docente?.documento ?? "--"} · Código:{" "}
                {docente?.codigo ?? "--"}
              </p>
              {totalCargaAdministrativa > 0 && (
                <Badge
                  variant="brand"
                  className="w-fit shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                >
                  Carga Horaria Administrativa: {totalCargaAdministrativa} hrs
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-3">
            {/* Horarios Administrativos Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={loading || !docente?.codigo || docente.codigo === "Sin dato"}
              onClick={() => setIsAdminModalOpen(true)}
              className="gap-1.5"
            >
              <ClipboardList className="size-4" />
              Horarios Administrativos
            </Button>

            {/* Vista Compacta / Detallada Toggle */}
            <Button
              variant={isCompactMode ? "outline" : "secondary"}
              size="sm"
              onClick={() => setIsCompactMode((v) => !v)}
              className={
                isCompactMode
                  ? "gap-1.5 border-border bg-muted font-medium text-foreground hover:bg-muted/70"
                  : "gap-1.5"
              }
              title={
                isCompactMode
                  ? "Cambiar a vista detallada (escala cronológica completa)"
                  : "Cambiar a vista compacta (reducir espacios vacíos)"
              }
            >
              {isCompactMode ? (
                <>
                  <Maximize2 className="size-4" />
                  Vista detallada
                </>
              ) : (
                <>
                  <Minimize2 className="size-4" />
                  Vista compacta
                </>
              )}
            </Button>
          </div>
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

      <div className="grid min-h-0 flex-1 w-full max-w-full min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch overflow-hidden">
        <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-3 md:p-4 max-h-80 lg:max-h-full lg:h-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="periodo-horario" className="text-sm font-medium whitespace-nowrap">
              Período (minutos)
            </Label>
            <Input
              id="periodo-horario"
              type="number"
              min={1}
              value={period}
              onChange={(event) => onPeriodChange(Number(event.target.value))}
              aria-label="Periodo de segmentacion en minutos"
              className="h-9 w-24 shrink-0 font-medium no-spinner"
            />
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen por grupo
            </p>

            <ScrollArea className="min-h-0 flex-1 pr-1" data-slot="aside-groups-scroll">
              <div className="space-y-2.5">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`skeleton-card-${index + 1}`}
                      className="h-20 animate-pulse rounded-3xl border border-border bg-muted"
                    />
                  ))
                ) : groups.length > 0 ? (
                  groups.map((group) => (
                    <div
                      key={group.groupKey}
                      className={cn(
                        "transition-all duration-200",
                        group.isSecondary &&
                          "ml-4 pl-3.5 border-l-2 border-dashed border-primary/40 dark:border-primary/50 relative before:absolute before:left-0 before:top-6 before:w-3 before:h-0.5 before:bg-primary/40 dark:before:bg-primary/50"
                      )}
                    >
                      <GroupSummaryCard
                        group={group}
                        schedules={schedules}
                        onAddClick={onAddClick ? handleAddClick : undefined}
                        onEditClick={onEditClick ? handleEditClick : undefined}
                        onDeleteClick={onDeleteClick ? handleDeleteClick : undefined}
                      />
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                    Sin grupos disponibles para este docente.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <main className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden lg:h-full lg:max-h-full">
          {loading ? (
            <div className="h-105 animate-pulse rounded-3xl border border-border bg-muted" />
          ) : hasSchedules ? (
            <div className="flex flex-1 min-h-[520px] sm:min-h-[580px] lg:min-h-0 w-full max-w-full min-w-0 overflow-hidden flex-col">
              <WeeklyScheduleGrid
                schedules={schedules}
                rows={rows}
                timeRange={timeRange}
                overlapRotationIntervalMs={overlapRotationIntervalMs}
                onEditSchedule={onEditSchedule}
                adminSchedules={adminSchedules}
                isCompactMode={isCompactMode}
              />
            </div>
          ) : (
            <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-border bg-muted/10 p-8 text-center shadow-xs">
              <Calendar className="size-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">Sin horarios cargados</h3>
              <p className="mt-1.5 text-xs text-muted-foreground max-w-sm">
                Este docente no tiene horarios normalizados asignados en este período para mostrar
                en la grilla semanal.
              </p>
            </section>
          )}
        </main>
      </div>

      {docenteId && onAddClick && (
        <BulkAssignmentModal mode="create" schedules={schedules} onAssigned={onAssigned} />
      )}
      {docenteId && onEditClick && (
        <BulkAssignmentModal mode="edit" schedules={schedules} onAssigned={onAssigned} />
      )}
      <AdminSchedulesModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        schedules={rawAdminSchedules}
        docente={docente}
        onAssigned={() => onAssigned?.()}
      />
    </div>
  )
}
