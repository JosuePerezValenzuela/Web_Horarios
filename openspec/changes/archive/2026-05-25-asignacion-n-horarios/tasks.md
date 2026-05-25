# Tasks: Asignación N Horarios — Bulk Schedule Assignment

## Review Workload Forecast

| Field                   | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| Estimated changed lines | ~730 added + ~60 modified + ~642 deleted ≈ 1432 total |
| 400-line budget risk    | High                                                  |
| Chained PRs recommended | No                                                    |
| Suggested split         | Single batch (local git only — no PRs)                |
| Delivery strategy       | exception-ok                                          |
| Chain strategy          | size-exception                                        |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

## Phase 1: Foundation — Types, API Client, Store

- [x] 1.1 Install `components/ui/alert.tsx` via `docker exec front_horarios-dev sh -c "pnpm dlx shadcn@latest add alert"`
- [x] 1.2 Add `HorarioEntry`, `BulkAssignPayload`, `SolapamientoInfo` types to `features/scheduling/docentes/domain/types.ts`
- [x] 1.3 Add `HorarioItem` type, `horariosApi.asignarBatch(payload)`, and export `ApiError` in `shared/services/api/client.ts`
- [x] 1.4 Create `features/scheduling/docentes/application/useBulkAsignacionStore.ts` — Zustand store with `entries[]`, global dateRange/filters, `addEntry()`, `removeEntry()`, `updateEntry()`, `setEntryAmbiente()`, `fetchAmbientesForEntry()` (with `ambienteCache`), `checkSolapamientos()` (intra-bulk + vs `NormalizedSchedule[]`), `submitBatch()` via `apiClient`

## Phase 2: Core UI — BulkAssignmentModal

- [x] 2.1 Create `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` — Dialog with global DatePickerRange, global filters row (facultad select + bloque multi-select + tipo multi-select + capacidad input), horario entries table (día select, hora_inicio/time, hora_fin/time, ambiente→popover trigger, remove ✕), "Agregar horario" and "Asignar N horarios" buttons, shadcn Alert for success/400 errors

## Phase 3: Ambiente Search — AmbienteSearchPopover

- [x] 3.1 Create `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` — Popover with inherited (overridable) facultad/bloque/tipo/capacidad filters, calls `store.fetchAmbientesForEntry(entryId)` on open, renders results sorted: `tiene_solapamiento_propio` first with distinct background + conflict icon, clicking returns ambiente to entry

## Phase 4: Validation — SolapamientoWarning

- [x] 4.1 Create `features/scheduling/docentes/ui/SolapamientoWarning.tsx` — Dialog listing intra-bulk conflicts and existing schedule conflicts from `docenteHorariosStore`, "Continuar de todas formas" confirms submission, "Cancelar" closes dialog

## Phase 5: Wiring + Cleanup

- [x] 5.1 Modify `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` — add `schedules` prop + `NormalizedSchedule` import, use `checkSolapamientos(schedules ?? [])`
- [x] 5.2 Modify `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` — replace `AsignarHorarioModal` import/usage with `BulkAssignmentModal`, pass `schedules` and `onAssigned` props
- [x] 5.3 Modify `app/docentes/[id]/horarios/page.tsx` — import `useBulkAsignacionStore` instead of `useAsignarHorarioStore`, update `openModal` call
- [x] 5.4 Delete `features/scheduling/docentes/ui/AsignarHorarioModal.tsx`
- [x] 5.5 Delete `features/scheduling/docentes/application/asignarHorarioStore.ts`

## Phase 6: UI & Bug Fixes

- [x] 6.1 Remove nested `<button>` inside `<button>` (AmbienteSearchPopover result rows)
- [x] 6.2 Limit Facultad select visible items with `max-h-[200px]` scroll
- [x] 6.3 Add "Todos" / "Ninguno" quick-select buttons to Bloque and Tipo MultiSelect (modal + popover)
- [x] 6.4 Fix inconsistent time input widths — both time inputs now use `w-28`
- [x] 6.5 Right-align "Agregar horario" button
- [x] 6.6 Add `initialLoadError` state to store with user-facing error banner in modal
- [x] 6.7 Improve `fetchAmbientesForEntry` error logging with API body message extraction
- [x] 6.8 Add specific validation messages in AmbienteSearchPopover (date range, día, time)

## Phase 7: Post-Implementation Polish

- [x] 7.1 Add `success` variant to shadcn Alert component (`components/ui/alert.tsx`) — green border/text for success outcomes
- [x] 7.2 Make time inputs responsive — replace fixed `w-28` with `w-full min-w-0 max-w-32` on both horaInicio and horaFin inputs

## Phase 8: Dialog Overlay, SelectAll, Scroll Styling

- [x] 8.1 Convert AmbienteSearchPopover from Popover to Dialog (stacked modal overlay) — new `open`/`onOpenChange` props, remove `trigger`, add DialogHeader/Title, render once in BulkAssignmentModal at component level with `ambientePopoverEntry` state
- [x] 8.2 Add `selectAll` prop to MultiSelect — renders "Seleccionar todos"/"Quitar todos" as first item with checkbox; wired into Bloque and Tipo MultiSelects in both BulkAssignmentModal and AmbienteSearchPopover
- [x] 8.3 Align scrollbar styling in MultiSelect — added `[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border` classes

## Phase 9: Toast Notifications & Dialog Sizing

- [x] 9.1 Install `sonner` via pnpm and add `<Toaster>` to root layout (`app/layout.tsx`)
- [x] 9.2 Replace inline shadcn Alert submit result with `sonner` toast in `BulkAssignmentModal.tsx` — remove `submitResult`/`closeTimerRef` state, add `errorEntryId` for row highlighting
- [x] 9.3 Fix `AmbienteSearchPopover.tsx` dialog height to prevent resize on filter change — use `min-h-[320px]` on DialogContent and `min-h-[180px]` with scroll on results area

## Phase 10: Teacher Schedule View UI Refinements

- [x] 10.1 Remove Tipo and Fechas lines from ScheduleBlock (keep only Materia, Grupo, Ambiente)
- [x] 10.2 Increase grid line thickness from 1px to 2px across all grid borders
- [x] 10.3 Vertically center time badge on grid line using `-translate-y-1/2`
- [x] 10.4 Add closing bottom border `border-b-2 border-border/50` to schedule grid container
