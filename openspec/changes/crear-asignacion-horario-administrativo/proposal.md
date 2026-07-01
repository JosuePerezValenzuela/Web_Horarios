# Proposal: Crear Asignación de Horario Administrativo

## Intent

Provide coordinators the ability to assign administrative schedules to teachers and validate overlaps in the frontend, preventing database conflicts and double-bookings.

## Scope

### In Scope
- Fetch administrative schedules catalog via `GET /horario-catalogo`.
- Inline creation form in `AdminSchedulesModal` to assign schedules via `POST /asignacion-horario`.
- Frontend date and time overlap validation blocking save when conflicts exist with existing administrative schedules.
- Automatic visual refresh of the weekly grid and modal table after successful assignment.

### Out of Scope
- Modifying (PATCH) or deleting (DELETE) existing administrative schedules.
- Validating overlap against academic schedules (unless configured as warning only).

## Capabilities

### New Capabilities
- `administrative-schedule-assignment`: Creation and assignment of administrative schedules to teachers.

### Modified Capabilities
- `administrative-schedule-view`: Integrating the creation form and trigger inside the existing view modal.

## Approach

Implement local UI state for the assignment form directly in `AdminSchedulesModal.tsx` (Approach 2). Create validation helper functions in the same file to check date and time overlaps against `rawAdminSchedules` before permitting the submit action. Refresh the parent grid via an `onAssigned` callback invoking `fetchByDocenteId`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `shared/services/api/client.ts` | Modified | Add `getHorarioCatalogo` and `crearAsignacionHorario` to `horariosApi`. |
| `features/scheduling/docentes/application/api.ts` | Modified | Wrap client methods to expose fetch and post functions. |
| `features/scheduling/docentes/domain/types.ts` | Modified | Define TypeScript contracts for catalog and payload. |
| `features/scheduling/docentes/ui/AdminSchedulesModal.tsx` | Modified | Add inline form, validation helpers, and submit handler. |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modified | Pass refresh callback to the modal. |
| `app/docentes/[id]/horarios/page.tsx` | Modified | Ensure layout/page updates on refresh. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Timezone shift in date comparison | Medium | Compare ISO string format `YYYY-MM-DD` directly. |
| Infinite end date (`null`) | Medium | Treat `null` end date as `"9999-12-31"` in comparisons. |
| Stale grid data after post | Low | Call parent trigger callback on successful API response. |

## Rollback Plan

Revert the git commit of this change branch and redeploy the previous build.

## Dependencies

- API endpoints `GET /horario-catalogo` and `POST /asignacion-horario` must be deployed and functional.

## Success Criteria

- [ ] Schedulers can open the modal, see the list, and toggle the inline assignment form.
- [ ] Overlap check disables the submit button and displays inline warnings on conflicts.
- [ ] Submitting a valid assignment performs a successful API POST request.
- [ ] The weekly grid and modal list update immediately without a full page reload.
