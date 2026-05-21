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

- [ ] 5.1 Modify `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` — replace `AsignarHorarioModal` import/usage with `BulkAssignmentModal`, pass same `onAssigned` callback
- [ ] 5.2 Modify `app/docentes/[id]/horarios/page.tsx` — import `useBulkAsignacionStore` instead of `useAsignarHorarioStore`, update `handleAssignClick` to use new store's open method
- [ ] 5.3 Delete `features/scheduling/docentes/ui/AsignarHorarioModal.tsx`
- [ ] 5.4 Delete `features/scheduling/docentes/application/asignarHorarioStore.ts`
