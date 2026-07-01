# Tasks: Administrative Schedule View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Implementation of read-only Administrative Schedule modal and integration | PR 1 | Includes state additions, sorting, and UI components |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Modify [types.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/domain/types.ts) to export/define any supporting interfaces for administrative schedules.
- [x] 1.2 Modify [docenteHorariosStore.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/docenteHorariosStore.ts) to include `rawAdminSchedules` in `DocenteHorariosState` and `INITIAL_STATE`.
- [x] 1.3 Update the `fetchByDocenteId` function in [docenteHorariosStore.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/docenteHorariosStore.ts) to save `rawAdminSchedules` from the API response to state.

## Phase 2: Core Implementation

- [x] 2.1 Create [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) importing `Dialog`, `Table`, and `Badge` components.
- [x] 2.2 Add the sorting logic inside [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) to place schedules with null `fecha_fin` first, and remaining schedules sorted by `fecha_fin` descending.
- [x] 2.3 Implement the UI layout in [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) to display the table or an empty state notice if no schedules exist.
- [x] 2.4 Style the active status badge with the label "Vigente sin límite" and apply proper colors/styling.

## Phase 3: Integration / Wiring

- [x] 3.1 Modify [TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx) to accept `rawAdminSchedules` prop and add state/props for modal open control.
- [x] 3.2 Add the "Ver horarios administrativos" button to the header of [TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx), disabling it if `docente?.codigo` is missing or "Sin dato".
- [x] 3.3 Import and mount `<AdminSchedulesModal>` inside [TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx) controlled by the header button.
- [x] 3.4 Modify [page.tsx](file:///home/josue/dev/Web_Horarios/app/docentes/[id]/horarios/page.tsx) to retrieve `rawAdminSchedules` from the store and pass it down to `<TeacherSchedulePage>`.

## Phase 4: Verification

- [x] 4.1 Test: Verify page loaded with valid `codigo_persona` displays the enabled header button.
- [x] 4.2 Test: Verify page loaded with missing `codigo_persona` disables the header button.
- [x] 4.3 Test: Verify clicking the button opens the modal without triggering new API requests.
- [x] 4.4 Test: Verify sorting places null `fecha_fin` first with "Vigente sin límite" badge, and others descending by `fecha_fin`.
- [x] 4.5 Test: Verify that if the teacher has no administrative schedules, the modal displays the empty state message.
