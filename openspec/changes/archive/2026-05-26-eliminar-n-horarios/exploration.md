## Exploration: eliminar-n-horarios

### Current State
The teacher schedule route (`app/docentes/[id]/horarios/page.tsx`) already wires add/edit actions and refreshes data through `fetchByDocenteId(docenteId)` after successful create/edit (`onAssigned`).

Delete intent exists in UI but is not implemented:
- Card-level trash currently calls `handleDeleteClick` with a placeholder toast (`"Próximamente disponible"`).
- Edit modal row trash currently calls `removeEntry(entry.id)`, which only removes the row from local modal state and does not delete persisted horario records.

`dbId` for persisted horarios is already available end-to-end:
- extracted in `normalizers.ts` from backend schedule `id` into `NormalizedSchedule.dbId`
- passed into edit store entries as `EditScheduleEntry.dbId`
- available in grid row edit and modal table rows.

API client currently supports `GET/POST/PATCH` helpers only, but `request()` already supports method `DELETE` + JSON body via `options.body`.

### Affected Areas
- `app/docentes/[id]/horarios/page.tsx` — replace placeholder card delete handler; orchestrate confirmation + delete call + refresh.
- `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` — optional prop plumbing if delete callbacks are split by scope.
- `features/scheduling/docentes/ui/GroupSummaryCard.tsx` — triggers group-level delete intent (already exposes `onDeleteClick`).
- `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` — row-level persisted delete action in edit mode (instead of local-only removal for rows with `dbId`).
- `features/scheduling/docentes/application/useEditScheduleStore.ts` — optional helper action to delete one persisted horario and sync local entry list.
- `features/scheduling/docentes/application/useBulkAsignacionStore.ts` — no delete API change expected; only ensure create flow remains untouched.
- `features/scheduling/docentes/domain/types.ts` — add delete payload/response types if kept in domain contracts.
- `shared/services/api/client.ts` — add explicit `delete()` helper and `horariosApi.deleteBatch(ids)` wrapper.
- `components/ui/alert-dialog.tsx` — reusable primitive to confirm destructive actions for both flows.

### Approaches
1. **Page-owned delete orchestration + modal-owned row delete** — route page handles group delete, modal handles row delete in edit mode.
   - Pros: keeps group context and refresh trigger near page store (`fetchByDocenteId`), minimal prop churn, clear ownership by UX surface.
   - Cons: delete logic split across page and modal, requires duplicated success/error mapping unless shared helper is extracted.
   - Effort: Medium

2. **Centralized delete service/store actions consumed by page + modal** — move both group and row delete into a shared scheduling action layer.
   - Pros: single source for API/error mapping and stale-id handling.
   - Cons: larger refactor for current flow, higher risk of coupling create/edit stores with fetch lifecycle, slower delivery for a focused change.
   - Effort: High

### Recommendation
Use **Approach 1** for this change. It fits the current architecture (page composes top-level actions, modal manages edit UX) and keeps blast radius low.

Implementation direction:
- Add `apiClient.delete<T>(endpoint, body)` and `horariosApi.eliminarBatch({ ids })`.
- **Group/card delete**: in route page, derive IDs by filtering `schedules` by `group.groupKey`, mapping `dbId`, removing null/invalid IDs, and opening `AlertDialog` before request.
- **Row/modal delete (edit mode)**:
  - if row has `dbId`, show `AlertDialog`, call delete endpoint with `[dbId]`, then remove row locally and call `onAssigned` to refresh source-of-truth.
  - if row has `dbId === null`, keep current local `removeEntry` behavior (unsaved row).
- Reuse sonner toasts for success/error (already used in create/edit) and keep server message when provided.

### Risks
- **Null/non-numeric dbId**: group or row may include entries not persisted; calling DELETE with empty ids should be blocked in UI.
- **Stale IDs (404)**: backend may report missing IDs after concurrent edits; front should show server message and trigger refresh to reconcile.
- **Transactional all-or-nothing**: mixed-validity group delete fails entirely; avoid optimistic UI removal before server success.
- **Edit modal state drift**: deleting in modal must sync both local entries and page-level fetched schedules (`onAssigned`) to prevent ghost rows.

### Ready for Proposal
Yes — scope is clear, touchpoints are identified, and API/UX decisions are constrained enough to write proposal/spec next.
