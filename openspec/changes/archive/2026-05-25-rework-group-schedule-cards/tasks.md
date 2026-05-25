# Tasks: Rework GroupSummaryCard + Edit/Delete + PATCH Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (infra+store) → PR 2 (UI redesign) → PR 3 (wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infrastructure + Store (tasks 1.1–2.2) | PR 1 | API client, types, normalizer, edit store, adapters |
| 2 | UI Modal + Card + Grid changes (tasks 3.1–4.3) | PR 2 | Depends on PR 1 |
| 3 | Page integration + Verification (tasks 5.1–6.3) | PR 3 | Depends on PR 2 |

## Phase 1: Infrastructure

- [x] **1.1** Add `patch<T>()` to `ApiClient` in `shared/services/api/client.ts` — generic PATCH method delegating to `request()`. Update `ApiClientOptions.method` to accept `"PATCH"`.
- [x] **1.2** Add types to `domain/types.ts`: `EditScheduleEntry`, `EditarHorarioItem`, `EditarHorariosBatchRequest`, `EditarHorariosBatchResponse`, `AmbienteSearchContract`, `EntryFilterOverrides`. Update `NormalizedSchedule` with `dbId`, `fechaInicioRaw`, `fechaFinRaw`. Add new prop interfaces for `GroupSummaryCardProps`, `BulkAssignmentModalProps`, `ScheduleBlockProps`, `WeeklyScheduleGridProps`, `TeacherSchedulePageProps`.
- [x] **1.3** Add `editarBatch()` to `horariosApi` in `client.ts` — calls `apiClient.patch<EditarHorariosBatchResponse>("/horario-clases", payload)`.
- [x] **1.4** Update `normalizeSingleSchedule` in `normalizers.ts` — extract `dbId` from schedule `id` (number/null), parse `fechaInicioRaw`/`fechaFinRaw` from `vigencia` (split on " - "), handle null/malformed gracefully.
- [ ] **1.5** Update `GroupSummaryCardProps` (replace `onAssignClick` with `onAddClick`/`onEditClick`/`onDeleteClick`), `BulkAssignmentModalProps` (add `mode: "create" | "edit"`), `ScheduleBlockProps` (add `onClick`), `WeeklyScheduleGridProps` (add `onEditSchedule`), `TeacherSchedulePageProps` (add edit/delete/schedule handlers).

## Phase 2: Edit Store

- [x] **2.1** Create `useEditScheduleStore.ts` — Zustand store with state (`isOpen`, `selectedGroup`, `existingSchedules`, `entries`, `entryFilters`, `ambienteCache`, `facultades`, `tiposAmbiente`, `submitting`, `solapamientos`) and actions (`open`/`close`/`addEntry`/`removeEntry`/`updateEntry`/`setEntryAmbiente`/`setEntryFilters`/`fetchAmbientesForEntry`/`checkSolapamientos`/`submitEdit`/`fetchInitialData`/`reset`). Day conversion 1-6→0-5. Solapamiento self-exclusion by `dbId`. PATCH payload with optional fields.
- [x] **2.2** Add adapter factories `createBulkAmbienteAdapter(store)` and `createEditAmbienteAdapter(store)` to `useBulkAsignacionStore.ts` (export) and `useEditScheduleStore.ts` — returns `AmbienteSearchContract` by mapping store selectors.

## Phase 3: UI — Modal Components

- [ ] **3.1** Update `AmbienteSearchPopover.tsx` — accept `adapter: AmbienteSearchContract` prop replacing direct `useBulkAsignacionStore` calls. Read entry/facultades/filters/cache/actions from adapter instead of store.
- [ ] **3.2** Update `BulkAssignmentModal.tsx` — accept `mode` prop. Conditional store reads (`createBulkAmbienteAdapter` vs `createEditAmbienteAdapter`), title (`"Asignar"`/`"Editar"`), submit text (`"Asignar N"`/`"Guardar cambios"`), date range (global picker vs read-only per-entry fechas), submit action (`submitBatch` vs `submitEdit`), entry init (auto-add blank vs pre-filled).

## Phase 4: UI — Card and Grid

- [ ] **4.1** Redesign `GroupSummaryCard.tsx` — remove `onAssignClick`/`onClick`/`PlusCircle`/`ChevronRight`. Badge shows `"Horarios: N"`. Add 3 icon buttons bottom-right: `Plus` (onAddClick), `Pencil` (onEditClick), `Trash2` (onDeleteClick). No hover shift. Responsive `size-3 sm:size-3.5` icons.
- [ ] **4.2** Update `ScheduleBlock.tsx` — add optional `onClick?: (schedule: NormalizedSchedule) => void` prop. Render as `<button>` when onClick provided (non-cluster), as `<article>` when not.
- [ ] **4.3** Update `WeeklyScheduleGrid.tsx` — add `onEditSchedule?: (schedule: NormalizedSchedule) => void` prop. Pass to standalone `ScheduleBlock` renders (non-cluster). Clusters remain expand-only (no edit click).

## Phase 5: Page Integration

- [ ] **5.1** Update `TeacherSchedulePage.tsx` — sidebar grid to `lg:grid-cols-[280px_minmax(0,1fr)]`. Add `onEditClick`, `onDeleteClick`, `onEditSchedule` handler wiring. Pass `onAddClick` (renamed from `onAssignClick`). Pass `editStore` to `BulkAssignmentModal`.
- [ ] **5.2** Update `DocenteHorariosRoutePage` (`page.tsx`) — create `useEditScheduleStore`. Wire `handleEditSchedule` (filter schedules by groupKey → `editStore.open()`), `handleDeleteSchedule` (`toast.info("Próximamente disponible")`), `handleAddSchedule` (existing `openModal`). Pass new handlers to `TeacherSchedulePage`.

## Phase 6: Verification

- [ ] **6.1** Manual check: card has no onClick/PlusCircle/ChevronRight, badge shows "Horarios: N", 3 icons render. Pencil opens edit modal with pre-filled entries. Plus opens create modal. Trash2 shows toast. ScheduleBlock click opens edit modal.
- [ ] **6.2** Format with Prettier: `docker exec front_horarios-dev sh -c "pnpm prettier --write 'features/scheduling/docentes/**/*.{ts,tsx}' 'shared/services/api/client.ts' 'app/docentes/**/*.tsx'"`. Then lint: `docker exec front_horarios-dev sh -c "pnpm lint"`. Then typecheck: `docker exec front_horarios-dev sh -c "pnpm tsc --noEmit"`.
- [ ] **6.3** Fix any issues from 6.2 — address lint errors and type errors.
