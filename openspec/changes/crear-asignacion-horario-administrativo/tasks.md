# Tasks: Crear Asignación de Horario Administrativo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-220 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infrastructure, types, client, wrapper API additions. | PR 1 | Base branch containing catalog and post API integration. |
| 2 | Component UI modal form, validation, and layout wiring. | PR 1 | Same PR containing UI, local state, overlap check, page callback. |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Add `HorarioCatalogoItem`, `CrearAsignacionHorarioRequest`, and `CrearAsignacionHorarioResponse` to [types.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/domain/types.ts).
- [x] 1.2 Add `getHorarioCatalogo` and `crearAsignacionHorario` to `horariosApi` in [client.ts](file:///home/josue/dev/Web_Horarios/shared/services/api/client.ts).
- [x] 1.3 Add `fetchHorarioCatalogo` and `crearAsignacionHorario` wrappers to [api.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/api.ts).

## Phase 2: Core Implementation

- [x] 2.1 Add React hooks for form state, catalog list, and validation errors in [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx).
- [x] 2.2 Add `checkOverlap` helper in [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) using open boundaries rule and high-date fallback `"9999-12-31"`.
- [x] 2.3 Implement inline expandable form structure and inputs in [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) using UMSS classes.
- [x] 2.4 Add `useEffect` to validate fields against existing `rawAdminSchedules`, set `overlapError`, and disable submit.
- [x] 2.5 Add POST submit handler to [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) that invokes `onAssigned()` upon success.

## Phase 3: Integration / Wiring

- [x] 3.1 Expose and pass `onAssigned` callback invoking `fetchByDocenteId` from [TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx) to [AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx).

## Phase 4: Verification

- [x] 4.1 Verify `/horario-catalogo` GET fetch and form layout rendering.
- [x] 4.2 Verify overlap warnings and disabled submit button when conflicting assignments are selected.
- [x] 4.3 Verify contiguous time slots do not trigger conflicts.
- [x] 4.4 Verify POST response triggers grid and modal reload via `onAssigned`.
