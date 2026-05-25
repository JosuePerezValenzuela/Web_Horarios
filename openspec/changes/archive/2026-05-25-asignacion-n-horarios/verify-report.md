## Verification Report

**Change**: asignacion-n-horarios
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 12 |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: ✅ Passed

```text
$ docker exec front_horarios-dev sh -c "pnpm tsc --noEmit"
✅ Exit code 0 — zero TypeScript errors.
```

**Lint**: ✅ Passed (4 pre-existing errors, zero new)

```text
$ docker exec front_horarios-dev sh -c "pnpm lint"
✅ 4 errors found — ALL pre-existing in api.ts and GroupSummaryCard.tsx.
   Zero errors in change-related files.
```

**Tests**: ➖ Not configured (no test runner in project yet)

**Coverage**: ➖ Not available

### Spec Compliance Matrix

| Requirement | Scenario | Evidence | Result |
|-------------|----------|----------|--------|
| R1: Multi-Entry Form | Add entries and review in table | `useBulkAsignacionStore.addEntry()` (line 141) creates UUID entries; `BulkAssignmentModal` (lines 381-495) renders entries table with día select, hora_inicio/fin time inputs, ambiente popover trigger, remove button; "Agregar horario" button (line 499) | ✅ COMPLIANT |
| R1: Multi-Entry Form | Remove an entry | `useBulkAsignacionStore.removeEntry()` (line 151) filters by UUID, cleans up entryFilters and ambienteCache; Trash2 button (line 480-489) calls `removeEntry(entry.id)`, disabled when only 1 entry | ✅ COMPLIANT |
| R2: Per-Entry Ambiente Search | Search ambientes from popover | `AmbienteSearchPopover` (line 122-126) calls `fetchAmbientesForEntry(entryId)` on open; store method (line 196) calls `horariosApi.buscarAmbientes()` via `apiClient.post()` with día/hora/filters payload | ✅ COMPLIANT |
| R3: Solapamiento Propio | Solapamiento-propio entries appear first | `AmbienteSearchPopover` lines 181-187: sort `tiene_solapamiento_propio` first; lines 298-302: amber background (`bg-amber-50`/`dark:bg-amber-950/20`); lines 307-315: `AlertTriangle` icon + "Mismo docente" label | ✅ COMPLIANT |
| R4: Solapamiento Validation | No conflicts — submit directly | `BulkAssignmentModal.handleSubmit` (line 199-209): calls `checkSolapamientos(schedules ?? [])` — if empty, calls `doSubmit()` directly without warning | ✅ COMPLIANT |
| R4: Solapamiento Validation | Intra-bulk conflict triggers warning | `useBulkAsignacionStore.checkSolapamientos()` (line 246): double loop over all entry pairs, detects overlapping day+time, pushes `intra-bulk` SolapamientoInfo; modal opens SolapamientoWarning (line 507-513) | ✅ COMPLIANT |
| R4: Solapamiento Validation | Existing schedule conflict triggers warning | `checkSolapamientos()` (line 279-300): loops entries vs `existingSchedules[]`, matches `entry.dia + 1 === schedule.day`, detects time overlap; SolapamientoWarning dialog lists conflicts grouped by type | ✅ COMPLIANT |
| R5: Batch Submission | Successful batch submission | `submitBatch()` (line 305) calls `horariosApi.asignarBatch(payload)` → 201 → closes modal (line 174) + shows success Alert (line 516-524) | ✅ COMPLIANT |
| R5: Batch Submission | Backend rejects entry N | `submitBatch()` catch block (line 342-361): parses 400 error "Error en horario N: ...", returns `{ success: false, errorIndex }`; modal shows destructive Alert (line 516-524), errored row gets `border-l-destructive bg-destructive/5` (line 412-413) | ✅ COMPLIANT |
| R6: Global Filters | Global filters apply to all entries | `fetchAmbientesForEntry` (line 202-206): falls back to global `selectedFacultades`/`selectedBloques`/`selectedTipos`/`estudiantes` when no per-entry override exists | ✅ COMPLIANT |
| R6: Global Filters | Per-entry override diverges from global | `AmbienteSearchPopover` (lines 137-166): `handleFacultadChange`, `handleBloqueChange`, `handleTipoChange`, `handleCapacidadChange` call `setEntryFilters()` in store; store `entryFilters` (line 177) allows per-entry partial overrides; `effective*` values (lines 72-75) prefer entry override, fallback to global | ✅ COMPLIANT |
| R7: API Client Only | Assignment flow uses apiClient | Search for `fetch(` in `features/scheduling/docentes/` → zero results. All calls via `horariosApi` (client.ts) or `infraApiClient` (infraClient.ts) | ✅ COMPLIANT |

**Compliance summary**: 12/12 scenarios compliant

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| R1: Multi-entry form with add/remove | ✅ Implemented | `addEntry()`, `removeEntry()` in store, table UI in BulkAssignmentModal |
| R2: Per-entry ambiente search | ✅ Implemented | AmbienteSearchPopover + store.fetchAmbientesForEntry via apiClient |
| R3: Solapamiento propio visual distinction | ✅ Implemented | Sort `tiene_solapamiento_propio` first, amber bg, AlertTriangle icon, "Mismo docente" label |
| R4: Solapamiento validation + warning | ✅ Implemented | `checkSolapamientos()` intra-bulk + existing; SolapamientoWarning dialog with confirm/cancel |
| R5: Batch submission | ✅ Implemented | `submitBatch()` via `horariosApi.asignarBatch()`, success/400 error handling with Alert |
| R6: Global filters + per-entry overrides | ✅ Implemented | `entryFilters` record in store, lazy inheritance pattern in popover + fetch |
| R7: API client only | ✅ Implemented | Zero raw `fetch()` in docentes feature; uses `horariosApi` and `infraApiClient` |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| New store (not extend existing) | ✅ Yes | `useBulkAsignacionStore` replaces `asignarHorarioStore` (deleted) |
| API calls via apiClient | ✅ Yes | All assignment calls through `horariosApi`; infra data through `infraApiClient` |
| Client-side solapamiento detection | ✅ Yes | `checkSolapamientos()` compares entries against each other + `docenteHorariosStore` schedules |
| Lazy inheritance for per-entry filters | ✅ Yes | `entryFilters?` partial; null means use global. Both in `AmbienteSearchPopover` and `fetchAmbientesForEntry` |
| UUID entry IDs (`crypto.randomUUID()`) | ✅ Yes | `addEntry()` uses `crypto.randomUUID()` |
| día 0=Lunes format | ✅ Yes | `DIA_LABELS[0]="Lunes"`; `HorarioItem` comment confirms 0=Lunes |
| Cache for ambiente searches | ✅ Yes | `ambienteCache` keyed by `${entryId}-${dia}-${horaInicio}-${horaFin}-${filtersHash}` |
| SolapamientoWarning blocks submission | ✅ Yes | `handleSubmit` checks solapamientos → opens dialog → user must confirm or cancel |

### File Structure Audit

| File | Action | Status |
|------|--------|--------|
| `features/scheduling/docentes/application/useBulkAsignacionStore.ts` | Create | ✅ Created |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | Create | ✅ Created |
| `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` | Create | ✅ Created |
| `features/scheduling/docentes/ui/SolapamientoWarning.tsx` | Create | ✅ Created |
| `features/scheduling/docentes/ui/AsignarHorarioModal.tsx` | Delete | ✅ Deleted |
| `features/scheduling/docentes/application/asignarHorarioStore.ts` | Delete | ✅ Deleted |
| `features/scheduling/docentes/domain/types.ts` | Modify | ✅ Modified — added `HorarioEntry`, `BulkAssignPayload`, `SolapamientoInfo` |
| `shared/services/api/client.ts` | Modify | ✅ Modified — added `HorarioItem`, `AsignarHorariosBatchRequest`, `AsignarHorariosBatchResponse`, `horariosApi.asignarBatch()` |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modify | ✅ Modified — imports `BulkAssignmentModal`, passes `schedules` and `onAssigned` |
| `app/docentes/[id]/horarios/page.tsx` | Modify | ✅ Modified — imports `useBulkAsignacionStore`, uses `openModal` |
| `components/ui/alert.tsx` | Create | ✅ Installed via shadcn |

### Deviations from Design

| Deviation | Impact | Assessment |
|-----------|--------|------------|
| `HorarioEntry.entryFilters?` defined as separate `entryFilters` record in store, not inside the entry object | None — functionally equivalent, cleaner separation | ✅ Non-issue |
| `HorarioEntry` has `error?: string | null` field not in spec | Enhancement — supports per-entry error display | ✅ Enhancement |
| `ambienteId`/`ambienteLabel` are optional (`?`) not `| null` | None — consistent with runtime behavior | ✅ Non-issue |

### Issues Found

**CRITICAL**: None

**WARNING**: None

**SUGGESTION**: 
- Consider adding unit tests for `checkSolapamientos()` overlap math (pure function, easy to test)
- The `allBloques` state in `BulkAssignmentModal` is duplicated with similar state in `AmbienteSearchPopover` — could be lifted to store if cross-component bloking is needed later

### Verdict

**PASS** — All 12 tasks complete, TypeScript compiles with zero errors, lint has zero new errors, all 7 requirements and 12 scenarios are verified compliant by source code inspection, design decisions are followed, file structure audit passes. No critical or warning issues found.
