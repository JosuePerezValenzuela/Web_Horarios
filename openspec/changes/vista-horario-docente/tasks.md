# Tasks: Vista Horario Docente

## Phase 1: Foundation (types, API, normalizers)

- [x] 1.1 Extend `features/scheduling/docentes/domain/types.ts` with exact `/docentes/:id/horarios` response types plus view models (`NormalizedSchedule`, `GroupSummary`, lane/time-range types).
- [x] 1.2 Add `getDocenteHorariosById(id)` in `features/scheduling/docentes/application/api.ts`, reusing current client and returning typed payload without mutations.
- [x] 1.3 Create `features/scheduling/docentes/application/normalizers.ts` with time parsing + fallback labels (`Sin ambiente`, `No especificado`, `Fechas no definidas`) and invalid-record filtering.
- [x] 1.4 Implement `gcdDurations` and `resolveDefaultPeriod` in `normalizers.ts`; verify with `[60,90,120] => 30` and invalid durations => `90`.
- [x] 1.5 Implement dynamic range + slot helpers in `normalizers.ts` (`deriveTimeRange`, `buildRows`) using min/max normalized times and period-based row segmentation.
- [x] 1.6 Implement overlap lane assignment in `normalizers.ts` per day (stable ordering, first free lane, cluster `laneCount` for width/left calculations).

## Phase 2: State and route wiring

- [x] 2.1 Create `features/scheduling/docentes/application/docenteHorariosStore.ts` with `loading/error/data/period`, fetch action, recompute-on-period-change, and derived selectors.
- [x] 2.2 Modify `features/scheduling/docentes/ui/DocentesTable.tsx` to navigate schedule action to `/docentes/${docente.id}/horarios`.
- [x] 2.3 Create `app/docentes/[id]/horarios/page.tsx` to load by route param, trigger store fetch, and wire explicit `Volver` to `/docentes`.

## Phase 3: UI composition (sidebar, cards, grid, states)

- [x] 3.1 Create `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` as responsive shell (mobile-first stack, `lg` sidebar + grid area) and header metadata.
- [x] 3.2 Create `features/scheduling/docentes/ui/GroupSummaryCard.tsx` rendering Materia/Grupo/Carreras/cantidad/estado (`Con Horarios`/`Sin Horarios`) with stable group color token mapping.
- [x] 3.3 Create `features/scheduling/docentes/ui/ScheduleBlock.tsx` for block content + shared group color parity with cards.
- [x] 3.4 Create `features/scheduling/docentes/ui/WeeklyScheduleGrid.tsx` for columns Lunes..Sábado, period rows, lane-based overlap layout, and horizontal/vertical scroll behavior.
- [x] 3.5 Implement loading/error/empty states in `TeacherSchedulePage.tsx`: skeletons while loading, retry panel on error, and hide grid when normalized horarios are empty.

## Phase 4: Compliance and verification

- [x] 4.1 Verify theme-token-only styling and shadcn/ui reuse across new UI files (`bg-*`, `text-*`, `border-*` from theme variables only).
- [ ] 4.2 Run manual scenario checks from spec: navigation + volver, period edit re-sloting, GCD/fallback, same-group color parity, empty-state grid hidden.
- [x] 4.3 Run `npm run lint -- --fix` and then `npm run lint` (no build), resolving reported errors in touched files.
