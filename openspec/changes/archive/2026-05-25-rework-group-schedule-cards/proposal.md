# Proposal: Rework GroupSummaryCard + Edit/Delete + PATCH Integration

## Intent

Redesign GroupSummaryCard to be compact (no card onClick, no ChevronRight/PlusCircle), add 3 action icons at bottom-right (add/edit/delete), and wire the edit flow to PATCH /horario-clases via BulkAssignmentModal in edit mode — reusing existing UI while decoupling the edit state.

## Scope

**In Scope**: Sidebar 280px replacement, card redesign, 3 action icons (Plus/Pencil/Trash2), add→create modal, edit→edit modal (pre-filled), delete→toast, `useEditScheduleStore`, AmbienteSearchPopover abstraction (shared hook), ScheduleBlock click for edit, normalizer fields (`dbId`, `fechaInicioRaw`/`fechaFinRaw`), `apiClient.patch()`, `horariosApi.editarBatch()`, page handler wiring.

**Out of Scope**: Delete implementation (no-op only), no remote push, cluster schedule individual click (requires prior expand), testing infrastructure.

## Capabilities

### New Capabilities

None — edit flow extends the existing capability.

### Modified Capabilities

- `bulk-schedule-assignment`: Add edit mode — `mode: "create" | "edit"` prop on BulkAssignmentModal, pre-fill entries from existing schedules, PATCH instead of POST, edit-specific state via separate store.

## Approach

- **GroupSummaryCard**: Static card (no onClick), remove PlusCircle/ChevronRight. Badge shows `"Horarios: N"`. Bottom-right flex row with 3 icon buttons (Plus, Pencil, Trash2). No hover effects.
- **Sidebar**: Grid changes to `280px minmax(0,1fr)` from `minmax(18rem,22rem) minmax(0,1fr)`.
- **BulkAssignmentModal**: Accept `mode: "create" | "edit"` prop. Edit mode: different title, reads from `useEditScheduleStore`, pre-fills entry table, submits via PATCH, no global date range (uses schedule fechas).
- **useEditScheduleStore**: Separate Zustand store. Pre-filled entries from NormalizedSchedule[], `editarBatch()` action wraps PATCH /horario-clases, day conversion (subtract 1 for 0-6 infra format), solapamiento check reuses same logic.
- **AmbienteSearchPopover**: Extract `useAmbienteSearch` hook with store-agnostic interface. Both stores (`useBulkAsignacionStore`, `useEditScheduleStore`) implement the same ambient-search contract.
- **ScheduleBlock click**: Add `onClick` prop with schedule data. Non-cluster blocks pass click up. Clusters remain expand-only (no individual click without expand).
- **Normalizer**: Add `dbId: number | null` (numeric schedule ID from API, nullable fallback), `fechaInicioRaw: string`, `fechaFinRaw: string` parsed from `vigencia` field.
- **API client**: Add generic `patch<T>()` method to ApiClient. Add `horariosApi.editarBatch(payload)` for PATCH /horario-clases with transactional body.
- **Page handler**: `handleEditSchedule(schedule)`, `handleDeleteSchedule(schedule)`, `handleAddSchedule(group)` callbacks wired in `page.tsx` and passed through `TeacherSchedulePage`.

## Affected Files

| Area | Impact |
|------|--------|
| `features/scheduling/docentes/ui/GroupSummaryCard.tsx` | **Modified** |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | **Modified** |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | **Modified** |
| `features/scheduling/docentes/application/useEditScheduleStore.ts` | **New** |
| `features/scheduling/docentes/application/useBulkAsignacionStore.ts` | **Modified** |
| `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` | **Modified** |
| `features/scheduling/docentes/ui/WeeklyScheduleGrid.tsx` | **Modified** |
| `features/scheduling/docentes/ui/ScheduleBlock.tsx` | **Modified** |
| `features/scheduling/docentes/application/normalizers.ts` | **Modified** |
| `features/scheduling/docentes/domain/types.ts` | **Modified** |
| `shared/services/api/client.ts` | **Modified** |
| `app/docentes/[id]/horarios/page.tsx` | **Modified** |

## Data Flow

- **Create**: Card Add icon → `onAddClick(group)` → `openModal()` (bulk store) → BulkAssignmentModal mode:create → POST → refresh
- **Edit**: Card/Grid Edit → push NormalizedSchedule[] to edit store → BulkAssignmentModal mode:edit → `editarBatch()` → PATCH → refresh
- **Grid edit**: ScheduleBlock `onClick` → `WeeklyScheduleGrid.onEditSchedule` → same edit flow

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| scheduleId non-numeric → no PATCH id | High | Add nullable `dbId`, skip PATCH if null |
| Dia 1-6 ↔ 0-6 conversion wrong | High | Subtract 1 on NormalizedSchedule→PATCH |
| Popover coupled to one store | Medium | Extract shared hook interface |
| Delete no-op confuses users | Low | Toast + disabled styling |
| Merge conflicts in normalizers | Medium | Coordinate with parallel branches |

## Rollback

1. `git revert` the merge commit
2. Verify sidebar grid width reverts, cards show original icons/onClick
3. Verify `apiClient.patch()` removal doesn't break other code
4. Delete `useEditScheduleStore.ts` if orphaned

## Dependencies

- PATCH /horario-clases endpoint deployed on backend
- No new libraries

## Success Criteria

- [ ] Card: no PlusCircle/ChevronRight/onClick, badge shows "Horarios: N", 3 icons bottom-right
- [ ] Add icon opens create modal (existing behavior intact)
- [ ] Edit icon opens edit modal with pre-filled entries
- [ ] Delete icon shows "Próximamente disponible" toast
- [ ] ScheduleBlock click opens edit modal (non-cluster only)
- [ ] PATCH call succeeds, grid refreshes
- [ ] Responsive layout preserved at all breakpoints
