"use client"

import { useMemo, useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useDocenteHorariosStore } from "@/features/scheduling/docentes/application/docenteHorariosStore"
import { useBulkAsignacionStore } from "@/features/scheduling/docentes/application/useBulkAsignacionStore"
import { useEditScheduleStore } from "@/features/scheduling/docentes/application/useEditScheduleStore"
import { useUIStore } from "@/shared/stores/uiStore"
import type {
  GroupInfo,
  GroupSummary,
  NormalizedSchedule,
} from "@/features/scheduling/docentes/domain/types"
import { TeacherSchedulePage } from "@/features/scheduling/docentes/ui/TeacherSchedulePage"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { horariosApi } from "@/shared/services/api/client"

type ApiLikeError = Error & {
  status?: number
  body?: { message?: string }
}

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

const formatMinutesAsTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

export default function DocenteHorariosRoutePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const docenteId = params?.id ?? ""

  const {
    docente,
    groups,
    schedules,
    adminSchedules,
    period,
    rows,
    timeRange,
    loading,
    error,
    fetchByDocenteId,
    setPeriod,
    clear,
  } = useDocenteHorariosStore()

  const { openModal } = useBulkAsignacionStore()
  const { setSidebarCollapsed } = useUIStore()
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<GroupSummary | null>(null)
  const [deletingGroup, setDeletingGroup] = useState(false)

  useEffect(() => {
    if (!docenteId) return
    setSidebarCollapsed(true)
    fetchByDocenteId(docenteId)

    return () => {
      clear()
    }
  }, [clear, docenteId, fetchByDocenteId, setSidebarCollapsed])

  const handleAddClick = (group: GroupSummary) => {
    const groupInfo: GroupInfo = {
      persona_grupo_id: group.persona_grupo_id,
      groupKey: group.groupKey,
      materia: group.materia,
      grupo: group.grupo,
      carrerasLabel: group.carrerasLabel,
    }
    openModal(groupInfo)
  }

  const handleEditClick = (group: GroupSummary) => {
    const groupInfo: GroupInfo = {
      persona_grupo_id: group.persona_grupo_id,
      groupKey: group.groupKey,
      materia: group.materia,
      grupo: group.grupo,
      carrerasLabel: group.carrerasLabel,
    }
    const editStore = useEditScheduleStore.getState()
    const groupSchedules = schedules.filter((s) => s.groupKey === group.groupKey)
    editStore.open(groupInfo, groupSchedules)
  }

  const handleEditSchedule = (schedule: NormalizedSchedule) => {
    const group = groups.find((g) => g.groupKey === schedule.groupKey)
    if (!group) return
    const groupInfo: GroupInfo = {
      persona_grupo_id: group.persona_grupo_id,
      groupKey: group.groupKey,
      materia: group.materia,
      grupo: group.grupo,
      carrerasLabel: group.carrerasLabel,
    }
    const editStore = useEditScheduleStore.getState()
    const groupSchedules = schedules.filter((s) => s.groupKey === schedule.groupKey)
    editStore.open(groupInfo, groupSchedules, schedule.dbId ?? undefined)
  }

  const pendingGroupSchedules = useMemo(() => {
    if (!pendingDeleteGroup) return []
    return schedules.filter((schedule) => schedule.groupKey === pendingDeleteGroup.groupKey)
  }, [pendingDeleteGroup, schedules])

  const pendingDeleteIds = useMemo(
    () =>
      pendingGroupSchedules
        .map((schedule) => schedule.dbId)
        .filter((id): id is number => Number.isInteger(id)),
    [pendingGroupSchedules]
  )

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as ApiLikeError
    return apiError?.body?.message || apiError?.message || fallback
  }

  const handleDeleteClick = (group: GroupSummary) => {
    setPendingDeleteGroup(group)
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteGroup || deletingGroup) return

    if (pendingDeleteIds.length === 0) {
      toast.error("No se encontraron horarios persistidos válidos para eliminar")
      return
    }

    try {
      setDeletingGroup(true)
      const response = await horariosApi.eliminarBatch({ ids: pendingDeleteIds })
      toast.success(response.message || "Horarios eliminados correctamente")
      setPendingDeleteGroup(null)
      await fetchByDocenteId(docenteId)
    } catch (error) {
      const apiError = error as ApiLikeError
      toast.error(getApiErrorMessage(error, "No se pudo eliminar los horarios"))
      if (apiError?.status === 404) {
        await fetchByDocenteId(docenteId)
      }
    } finally {
      setDeletingGroup(false)
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout
        breadcrumbs={[{ name: "Docentes", href: "/docentes" }, { name: "Horario docente" }]}
        className="h-[calc(100dvh-4rem)] overflow-hidden px-3 pb-3 md:px-4 md:pb-4 lg:px-5 xl:px-6"
      >
        <TeacherSchedulePage
          docente={docente}
          groups={groups}
          schedules={schedules}
          period={period}
          rows={rows}
          timeRange={timeRange}
          loading={loading}
          error={error}
          onRetry={() => fetchByDocenteId(docenteId)}
          onBack={() => router.push("/docentes")}
          onPeriodChange={setPeriod}
          docenteId={docenteId}
          onAddClick={handleAddClick}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onEditSchedule={handleEditSchedule}
          onAssigned={() => fetchByDocenteId(docenteId)}
          adminSchedules={adminSchedules}
        />

        <AlertDialog
          open={pendingDeleteGroup !== null}
          onOpenChange={(open) => {
            if (!open && !deletingGroup) {
              setPendingDeleteGroup(null)
            }
          }}
        >
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar horarios del grupo</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará {pendingDeleteIds.length} horario
                {pendingDeleteIds.length !== 1 ? "s" : ""} de este grupo.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="max-h-56 overflow-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b border-border/60">
                    <th className="px-3 py-2 text-left text-xs font-semibold">Día</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Inicio</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Fin</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Ambiente</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGroupSchedules.map((schedule) => (
                    <tr key={schedule.scheduleId} className="border-b border-border/30">
                      <td className="px-3 py-2 text-xs">
                        {DAY_LABELS[schedule.day] ?? schedule.day}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {formatMinutesAsTime(schedule.startMin)}
                      </td>
                      <td className="px-3 py-2 text-xs">{formatMinutesAsTime(schedule.endMin)}</td>
                      <td className="px-3 py-2 text-xs">
                        {schedule.ambienteLabel || "Sin ambiente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingGroup}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deletingGroup}
                onClick={(event) => {
                  event.preventDefault()
                  void handleDeleteConfirm()
                }}
              >
                {deletingGroup ? "Eliminando..." : "Eliminar horarios"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </ProtectedRoute>
  )
}
