# Proposal: Administrative Schedule Assignment - Read-Only View

## Intent

Schedulers need a way to view a teacher's administrative schedules (e.g., department meetings, office hours, coordinations) directly from the weekly schedule view to inspect active and past administrative duties in a structured modal.

## Scope

### In Scope
- Header button on `TeacherSchedulePage.tsx` to open the modal.
- Modal Dialog (`AdminSchedulesModal.tsx`) using `@/components/ui/dialog.tsx` displaying the list of administrative schedules.
- Integration with the API endpoint to fetch a teacher's schedules (`GET /asignacion-horario?codigo_persona=...`).
- Sorting & Mapping logic for the displayed list:
  - First, schedules where `fecha_fin` is null (mapped to the label "Vigente sin límite").
  - Then, other schedules sorted by `fecha_fin` descending (most recent to oldest).
- Dedicated Zustand store `useAdminSchedulesStore.ts` to manage UI and fetch state.

### Out of Scope
- Creating new assignments (`POST /asignacion-horario`).
- Closing periods or editing dates (`PATCH /asignacion-horario` or `PATCH /asignacion-horario/:id`).
- Deleting assignments (`DELETE /asignacion-horario/:id`).
- Fetching or displaying the catalog of administrative schedules (`GET /horario-catalogo`).
- Forms or editing fields inside the modal.

## Capabilities

### New Capabilities
- `administrative-schedule-view`: Enables a read-only modal displaying a teacher's active and past administrative schedules sorted by activity status and date.

### Modified Capabilities
- None

## Approach

1. **State Management**: Implement `useAdminSchedulesStore` to manage modal visibility and fetch the teacher's administrative schedules using their `codigo_persona`.
2. **Sorting Logic**: Sort retrieved schedules in the store/selector: null `fecha_fin` first (with "Vigente sin límite" label), followed by defined `fecha_fin` descending.
3. **UI Components**: Build `AdminSchedulesModal` using shadcn `Dialog` layout, listing the sorted assignments in a table or list.
4. **Integration**: Link trigger button in `TeacherSchedulePage` header.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `features/scheduling/docentes/application/useAdminSchedulesStore.ts` | New | Zustand store for modal state, active schedules, and fetch status. |
| `features/scheduling/docentes/ui/AdminSchedulesModal.tsx` | New | Dialog modal to display current assignments sorted as required. |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modified | Add trigger button to open the new modal. |
| `app/docentes/[id]/horarios/page.tsx` | Modified | Mount `AdminSchedulesModal`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing teacher ID context | Low | Disable the modal trigger button if the active teacher's ID is missing. |

## Rollback Plan

Revert frontend files to previous git commits.

## Dependencies

- Existing endpoint `GET /asignacion-horario?codigo_persona=...`.

## Success Criteria

- [ ] Users can open the modal from the Teacher Schedule view.
- [ ] Modal correctly displays administrative schedules returned by the GET endpoint.
- [ ] Schedules without `fecha_fin` appear first and display the label "Vigente sin límite".
- [ ] Other schedules appear afterwards sorted descending by `fecha_fin`.
