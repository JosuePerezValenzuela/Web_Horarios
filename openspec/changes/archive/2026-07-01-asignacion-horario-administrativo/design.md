# Design: Vista de Horarios Administrativos - Solo Lectura

## Technical Approach

We will display a teacher's administrative schedules (e.g. department meetings, office hours, coordinations) in a read-only modal dialog (`AdminSchedulesModal`).
To avoid loading states or extra API calls when opening the modal, we will leverage the preloaded data from the main `useDocenteHorariosStore`. When the schedules page fetches the teacher's schedule via `fetchByDocenteId`, we will store the raw administrative schedule data directly in the store as `rawAdminSchedules`.
The trigger button "Ver horarios administrativos" in the header of `TeacherSchedulePage` will be disabled if the teacher's code is missing.

## Architecture Decisions

### Decision: Storage and Fetching of Administrative Schedules

| Option | Tradeoffs | Decision |
| :--- | :--- | :--- |
| **Fetch on modal open** | + Keeps the main store clean.<br/>- Triggers extra network requests and displays a loading spinner inside the modal on open. | Rejected |
| **Separate Zustand store** | + Keeps store scopes isolated.<br/>- Results in store bloat and redundant fetch hooks for the same teacher. | Rejected |
| **Add `rawAdminSchedules` to `useDocenteHorariosStore`** | + Reuses existing fetching trigger during page initialization; no loading lag on modal open.<br/>- Increases the state footprint of the main store. | **Chosen** |

*Rationale:* The schedules page already retrieves administrative schedules to calculate the overall grid time range. Reusing this fetched data keeps the frontend fast, responsive, and data-coherent.

### Decision: Modal UI Component Structure

| Option | Tradeoffs | Decision |
| :--- | :--- | :--- |
| **Unstructured Card/List view** | + Flexible layout on small screens.<br/>- Less clean for structured tabular schedule times. | Rejected |
| **`Dialog` with `Table` and `Badge`** | + Highly structured tabular display; clear visual hierarchy for status (vigencia) using badges.<br/>- Slightly more markup boilerplate. | **Chosen** |

*Rationale:* Administrative schedules have explicit start/end times and valid date ranges. A tabular view is the most readable and compact presentation for this type of data.

## Data Flow

Data flows from the API initialization down to the modal dialog:

```
  api.getDocenteHorariosById() ──> normalizeDocenteHorarios()
                                           │ (extracts teacher code)
  api.fetchDocenteAdminHorarios() <────────┘
         │
         ▼
  Store: rawAdminSchedules ──> TeacherSchedulePage ──> AdminSchedulesModal
```

1. `fetchByDocenteId` in `useDocenteHorariosStore` fetches teacher details.
2. If `docente.codigo` is valid, `fetchDocenteAdminHorarios(codigo)` is triggered.
3. The raw response `data.horarios` is saved to `rawAdminSchedules`.
4. `TeacherSchedulePage` reads `rawAdminSchedules` and renders the trigger button.
5. On click, the modal displays the list sorted by active status and fin date.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `features/scheduling/docentes/application/docenteHorariosStore.ts` | Modify | Add `rawAdminSchedules` array to state and populate it during `fetchByDocenteId`. |
| `features/scheduling/docentes/ui/AdminSchedulesModal.tsx` | Create | Dialog modal that displays the sorted list of administrative schedules using shadcn `Table` and `Badge`. |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modify | Accept `rawAdminSchedules` prop, render header trigger button, manage modal state, and mount `AdminSchedulesModal`. |
| `app/docentes/[id]/horarios/page.tsx` | Modify | Retrieve `rawAdminSchedules` from the store and pass it down to `TeacherSchedulePage`. |

## Interfaces / Contracts

### Updated Zustand Store Interface
```typescript
interface DocenteHorariosState {
  docente: DocenteScheduleMeta | null
  schedules: NormalizedSchedule[]
  groups: GroupSummary[]
  adminSchedules: AdminSchedule[]
  rawAdminSchedules: AdminScheduleApiResponse["data"]["horarios"] // New property
  period: number
  timeRange: TimeRange
  rows: TimeRow[]
  loading: boolean
  error: string | null
  fetchByDocenteId: (id: string) => Promise<void>
  setPeriod: (period: number) => void
  clear: () => void
}
```

### Modal Props Interface
```typescript
interface AdminSchedulesModalProps {
  isOpen: boolean
  onClose: () => void
  schedules: AdminScheduleApiResponse["data"]["horarios"]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit / Integration | Sorting and Vigencia formatting | Verify the sorting helper puts null `fecha_fin` first, followed by defined `fecha_fin` descending. |
| Manual / UI | Button state and trigger | Verify the header button is disabled when `docente` has no code, and opens the modal on click. |
| Manual / UI | Modal views | Verify the modal correctly displays the schedules, active badge "Vigente sin límite" when `fecha_fin` is null, and the empty state message when list is empty. |

## Migration / Rollout

No migration required.

## Open Questions

None.
