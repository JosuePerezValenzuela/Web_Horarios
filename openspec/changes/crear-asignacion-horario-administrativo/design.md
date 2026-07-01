# Design: Crear Asignación de Horario Administrativo

## Technical Approach

We will extend the API layer, wrap it in the feature module application service, and manage the form lifecycle locally.

1. **API Client Extension**: Add `getHorarioCatalogo` and `crearAsignacionHorario` to `shared/services/api/client.ts`.
2. **Feature API Layer**: Wrap these client methods in `features/scheduling/docentes/application/api.ts` to expose them as async functions.
3. **Local State Management**: In `AdminSchedulesModal.tsx`, manage form fields (`selectedCatalogId`, `fechaInicio`, `fechaFin`), loading state, and validation error state using React hooks. Validate overlaps in real-time in `useEffect` and block form submission when overlaps exist. On successful post, call `onAssigned()` to refresh parent schedules.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| **Form State Placement** | - Global store: unnecessary boilerplate for a simple modal sub-form.<br>- Local component state: self-contained, lightweight, easy cleanup. | Handled inside `AdminSchedulesModal.tsx` using React hooks since it is a localized, ephemeral sub-form view. |
| **Validation Trigger** | - Submit-time validation: delay feedback until user clicks save.<br>- Real-time `useEffect` validation: immediate feedback to the user before submitting. | Run validation in a `useEffect` watching the selected catalog schedule, start date, and end date. If overlap is found, populate `overlapError` to display the error text and disable the Save button. |
| **Boundaries Overlap Rule** | - Closed boundaries: 12:00 to 12:00 conflicts.<br>- Open boundaries: contiguous times (e.g. 10:00-12:00 and 12:00-14:00) do not conflict. | Open boundaries: `startHourNew < endHourExisting && startHourExisting < endHourNew` is used so contiguous blocks do not trigger an error. |
| **Infinite End Date Representation** | - Represent as `null` in comparison logic (complex logic with lots of checks).<br>- Convert `null` to high date `"9999-12-31"`: simple lexicographical string comparison. | Convert `null` to `"9999-12-31"` to simplify the date range overlap condition. |

## Data Flow

```
AdminSchedulesModal (Local State & Overlap Check)
   │
   ├── [GET /horario-catalogo] ──→ API Client
   │
   └── [POST /asignacion-horario] ──→ API Client ──→ onAssigned() (refresh parent)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `shared/services/api/client.ts` | Modify | Add `getHorarioCatalogo` and `crearAsignacionHorario` methods to `horariosApi`. |
| `features/scheduling/docentes/application/api.ts` | Modify | Add `fetchHorarioCatalogo` and `crearAsignacionHorario` wrappers. |
| `features/scheduling/docentes/domain/types.ts` | Modify | Define `HorarioCatalogoItem`, `CrearAsignacionHorarioRequest`, `CrearAsignacionHorarioResponse` types. |
| `features/scheduling/docentes/ui/AdminSchedulesModal.tsx` | Modify | Implement inline assignment form, local state, overlap logic, and submit handler. Add `onAssigned?: () => void` prop. |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modify | Pass refresh callback `fetchByDocenteId` / reload function to the modal. |

## Interfaces / Contracts

```typescript
export interface HorarioCatalogoItem {
  id: number;
  descripcion: string;
  hora_entrada: string; // "HH:mm:ss"
  hora_salida: string; // "HH:mm:ss"
}

export interface CrearAsignacionHorarioRequest {
  persona_codigo: string;
  horario_catalogo_id: number;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string | null; // "YYYY-MM-DD" or null
}

export interface CrearAsignacionHorarioResponse {
  success: boolean;
  message?: string;
  data?: AdminScheduleRaw;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Overlap check helper | Test various overlap cases: date overlaps (fully contained, partial, null dates) and time overlaps (open boundaries). |
| Component | `AdminSchedulesModal` | Test that form fields show validation errors and disable the submit button on overlap. |
| Integration | API Submit | Mock API client post and verify that `onAssigned` is called upon a successful 200/201 response. |

## Migration / Rollout

No migration required.

## Open Questions

- None.
