## Exploration: Rework GroupSummaryCard + Add Edit/Delete + PATCH Integration

### Current State

The teacher schedule view at `app/docentes/[id]/horarios/page.tsx` uses:
- `TeacherSchedulePage` — grid layout with sidebar (18-22rem) and schedule grid
- `GroupSummaryCard` — clickable card per group with PlusCircle icon, badge, ChevronRight
- `BulkAssignmentModal` — modal for creating new schedules (POST)
- `WeeklyScheduleGrid` / `ScheduleBlock` — rendered grid with no edit interaction
- `useBulkAsignacionStore` — Zustand store for bulk schedule creation

The sidebar takes significant space and the cards are action-heavy (clickable whole card) without edit/delete capabilities. The PATCH endpoint `/horario-clases` exists on the backend but is not consumed yet.

### Affected Areas

- `features/scheduling/docentes/ui/GroupSummaryCard.tsx` — full redesign
- `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` — layout change + wire new callbacks
- `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` — add edit mode support
- `features/scheduling/docentes/application/useEditScheduleStore.ts` — NEW store for edit flow
- `features/scheduling/docentes/ui/WeeklyScheduleGrid.tsx` — add onEditSchedule callback
- `features/scheduling/docentes/ui/ScheduleBlock.tsx` — make clickable for edit
- `features/scheduling/docentes/application/normalizers.ts` — add dbId, raw fecha fields
- `features/scheduling/docentes/domain/types.ts` — new EditScheduleEntry type, edit payload
- `shared/services/api/client.ts` — add patch() method to ApiClient + editarBatch to horariosApi
- `app/docentes/[id]/horarios/page.tsx` — wire onEditSchedule handler

### Approaches

1. **Reuse BulkAssignmentModal with edit mode** — extend existing modal to support both create and edit flows. Separate store for edit (useEditScheduleStore).
   - Pros: Reuses 400+ lines of UI (entries table, ambiente search, solapamiento check). Consistent UX. Less code.
   - Cons: Modal becomes dual-mode. Must carefully switch between stores. AmbienteSearchPopover needs adaptation.
   - Effort: Medium

2. **Create separate EditScheduleModal** — standalone modal for editing, copying the UI structure.
   - Pros: No risk of breaking create flow. Clean decoupling.
   - Cons: Massive duplication (~400 lines). Two modals to maintain. Inconsistent if they drift.
   - Effort: High

### Recommendation

**Approach 1** (reuse with mode flag). The create and edit modals are visually identical — same table, same ambiente search, same solapamiento check. The differences are just: pre-filled data, endpoint, and title. A single `mode` prop keeps things DRY.

### Key Risks

1. **scheduleId is NOT always numeric** — `toStringValue(schedule.id, ...)` can produce composite keys. Must add `dbId: number | null` to NormalizedSchedule.
2. **fechasLabel is opaque** — display string like "2024-01-15 - 2024-06-30". Need raw `fechaInicio`/`fechaFin` fields for PATCH pre-fill.
3. **AmbienteSearchPopover reads directly from useBulkAsignacionStore** — needs a strategy to operate with edit store.
4. **Dia format mapping** — NormalizedSchedule.day = 1-6 (Monday=1), modal entries use 0-6 (Monday=0). Must convert.
5. **apiClient has no patch() method** — needs to be added (request supports arbitrary methods).
6. **Cluster expansion vs single schedule click** — schedules in collapsed clusters aren't individually clickable.
7. **No push to remote** — all work is local, no commit/PR.
