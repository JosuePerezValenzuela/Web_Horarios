# Proposal: Asignación N Horarios

## Intent

Replace the single-entry assignment modal with a bulk multi-entry flow that lets schedulers define multiple horario entries (día/hora_inicio/hora_fin/ambiente) in one session with shared date range and filters, validate solapamiento before submitting, and submit all entries in a single API call — reducing repetitive work and catching conflicts before they reach the server.

## Scope

### In Scope
- `BulkAssignmentModal` component replacing `AsignarHorarioModal`
- Multi-entry table with per-row día/time picks + ambiente popover selector
- Shared global date range + row of global filters (facultad, bloque, tipo, capacidad)
- `AmbienteSearchPopover` per entry with inherited but independently modifiable filters
- Solapamiento validation: intra-bulk and against existing schedules (`docenteHorariosStore`)
- `SolapamientoWarning` confirmation dialog before conflict submission
- Batch API contract (`POST /horario-clases/asignar`) via `apiClient`
- shadcn Alert component installation
- Migration of all raw `fetch()` calls in assignment flow to `apiClient`
- New types: `AsignarHorariosBatchRequest`, `AsignarHorariosBatchResponse`

### Out of Scope
- Editing existing assigned schedules (edit/delete flows)
- Batch unassignment
- CSV/Excel bulk upload
- Drag-and-drop schedule manipulation

## Capabilities

### New Capabilities
- `bulk-schedule-assignment`: Create and submit multiple horario entries in a single session with shared date range, per-entry ambiente selection, solapamiento validation, and batch API submission.

### Modified Capabilities
None — this is a replacement within the existing assignment surface; no existing spec changes at the requirements level.

## Approach

Replace the single-entry `AsignarHorarioModal` with a new `BulkAssignmentModal` that manages a local list of `HorarioEntry` items. A new `useBulkAsignacionStore` (Zustand) replaces the single-entry store. The ambiente search delegates to a dedicated `AmbienteSearchPopover` component. Solapamiento is validated client-side by comparing entries against each other and against `docenteHorariosStore` schedules before submission. A new `horariosApi.asignarBatch()` method on the existing `apiClient` handles the POST. Old store, types, and component are removed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `features/scheduling/docentes/ui/AsignarHorarioModal.tsx` | Removed | Replaced by BulkAssignmentModal |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | New | Main bulk assignment UI |
| `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` | New | Per-entry ambiente selector |
| `features/scheduling/docentes/ui/SolapamientoWarning.tsx` | New | Conflict confirmation dialog |
| `features/scheduling/docentes/application/asignarHorarioStore.ts` | Removed | Replaced by bulk store |
| `features/scheduling/docentes/application/useBulkAsignacionStore.ts` | New | Bulk assignment state |
| `features/scheduling/docentes/domain/types.ts` | Modified | Add batch request/response types |
| `shared/services/api/client.ts` | Modified | Add `asignarBatch()`, batch types, fix `BuscarAmbienteRequest` field casing |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modified | Wire BulkAssignmentModal |
| `components/ui/` | New | Install shadcn Alert |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend batch contract differs from exploration spec | Low | Match existing `POST /horario-clases/asignar` endpoint; fall back to sequential single POSTs if 404 |
| Solapamiento detection misses edge cases (recurring dates, partial overlap) | Med | Validate all intra-bulk pairs via day+time-range intersection math; cross-reference with loaded schedules |
| Per-entry ambiente popover performance with many entries | Low | Lazy-load ambientes per entry on popover open; cache search results per día/time combo |

## Rollback Plan

- Git revert the commit(s) for this change
- Restore `AsignarHorarioModal.tsx`, `asignarHorarioStore.ts`, and previous `client.ts` types
- Revert `TeacherSchedulePage.tsx` to its previous wiring
- Uninstall shadcn Alert if no other consumers

## Dependencies

- shadcn Alert component (`npx shadcn@latest add alert`)
- Confirm API contract for `POST /horario-clases/asignar` batch body exactly
- Existing `Popover` and `Dialog` from `components/ui/` are already available

## Success Criteria

- [ ] BulkAssignmentModal opens from GroupSummaryCard with correct group context
- [ ] User can add N entries with distinct día/hora/ambiente and see them in a table
- [ ] AmbienteSearchPopover shows solapamiento-propio entries first with visual distinction
- [ ] Submitting a batch with no conflicts succeeds (201) and closes the modal
- [ ] Submitting with conflicts shows SolapamientoWarning before allowing submission
- [ ] Submission with server error (400) shows Alert error and keeps modal open
- [ ] All API calls use `apiClient` — zero raw `fetch()` in the assignment flow
