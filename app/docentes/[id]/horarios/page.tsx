"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

import { AppLayout } from "@/components/organisms/AppLayout"
import { ProtectedRoute } from "@/features/auth/ui/ProtectedRoute"
import { useDocenteHorariosStore } from "@/features/scheduling/docentes/application/docenteHorariosStore"
import { useBulkAsignacionStore } from "@/features/scheduling/docentes/application/useBulkAsignacionStore"
import { useUIStore } from "@/shared/stores/uiStore"
import type { GroupSummary } from "@/features/scheduling/docentes/domain/types"
import { TeacherSchedulePage } from "@/features/scheduling/docentes/ui/TeacherSchedulePage"

export default function DocenteHorariosRoutePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const docenteId = params?.id ?? ""

  const {
    docente,
    groups,
    schedules,
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

  useEffect(() => {
    if (!docenteId) return
    setSidebarCollapsed(true)
    fetchByDocenteId(docenteId)

    return () => {
      clear()
    }
  }, [clear, docenteId, fetchByDocenteId, setSidebarCollapsed])

  const handleAssignClick = (group: GroupSummary) => {
    openModal({
      persona_grupo_id: group.persona_grupo_id,
      groupKey: group.groupKey,
      materia: group.materia,
      grupo: group.grupo,
      carrerasLabel: group.carrerasLabel,
    })
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
          onAssignClick={handleAssignClick}
          onAssigned={() => fetchByDocenteId(docenteId)}
        />
      </AppLayout>
    </ProtectedRoute>
  )
}
