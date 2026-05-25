# Design: Asignación N Horarios — Bulk Schedule Assignment

## Technical Approach

Replace the single-entry `AsignarHorarioModal` with a multi-entry `BulkAssignmentModal` managed by a new `useBulkAsignacionStore` (Zustand). Each entry tracks día/hora/ambiente/filter-overrides in a local array. Per-entry `AmbienteSearchPopover` queries `POST /horario-clases/asignar/buscar-ambientes` via `apiClient` and sorts results by `tiene_solapamiento_propio`. Client-side solapamiento detection (intra-bulk + against loaded `docenteHorariosStore` schedules) triggers a `SolapamientoWarning` dialog before submission. Batch POST to `/horario-clases/asignar` via `apiClient`. All raw `fetch()` calls in the assignment flow migrate to `apiClient` or `infraApiClient`.

## Architecture Decisions

| Decision | Options | Tradeoff | Chosen |
|----------|---------|----------|--------|
| Store strategy | (a) New store / (b) Extend existing | (a) Clean break, easy removal / (b) Less duplication, more surface | **New store** — old removed |
| API transport | (a) `apiClient.post` / (b) Keep raw `fetch()` | (a) Auth+error handling unified / (b) Duplicated token logic | **apiClient** — fixes casing bug `Facultad_ids`→`facultad_ids` |
| Solapamiento detection | (a) Client-side / (b) Server-only | (a) Instant feedback / (b) Always correct, extra round-trip | **Client-side** — compare against `docenteHorariosStore.schedules`; server is final gate |
| Per-entry filters | (a) Deep clone globals / (b) Lazy inheritance | (a) Simple, stale / (b) Lightweight, partial overrides | **Lazy inheritance** — `entryFilters?` partial; null = use global |
| Entry ID | (a) Array index / (b) UUID | (a) Fragile on delete / (b) Stable reference | **UUID** (`crypto.randomUUID()`) |

## Data Flow

```
GroupSummaryCard click
       │
       ▼
page.tsx: openModal(group) → useBulkAsignacionStore
       │
       ▼
BulkAssignmentModal
  ├── Date picker (shared) + Row of filters (facultad, bloque, tipo, capacidad)
  ├── HorarioEntry[] table
  │     └── Row: [Día 0-6] [Hora inicio] [Hora fin] [Ambiente→popover] [✕]
  │           └── AmbienteSearchPopover
  │                 ├── Filters (inherited global, overridable)
  │                 ├── POST /horario-clases/asignar/buscar-ambientes
  │                 └── Results: solapamiento_propio first, distinct bg
  └── [Asignar N horarios]
        ├── checkSolapamientos() → intra-bulk + docenteHorariosStore
        │     └── Conflicts → SolapamientoWarning → [Confirm/Cancel]
        └── submitBatch() → POST /horario-clases/asignar (bulk)
              ├── 201 → close modal, refresh schedules
              └── 400 → shadcn Alert in modal
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `features/scheduling/docentes/application/useBulkAsignacionStore.ts` | Create | Entries array, global filters, CRUD, solapamiento check, batch submit |
| `features/scheduling/docentes/application/asignarHorarioStore.ts` | Delete | Single-entry store — fully replaced |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | Create | Multi-entry modal (date range + filters + entries table + submit) |
| `features/scheduling/docentes/ui/AsignarHorarioModal.tsx` | Delete | Single-entry modal — fully replaced |
| `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` | Create | Per-entry ambiente search with inherited filters |
| `features/scheduling/docentes/ui/SolapamientoWarning.tsx` | Create | Conflict dialog listing intra-bulk + existing conflicts |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modify | Import `BulkAssignmentModal`; pass group via store (not props) |
| `features/scheduling/docentes/domain/types.ts` | Modify | Add `HorarioEntry`, `AsignarHorariosBatchRequest/Response`; remove `AsignarHorarioPayload` |
| `shared/services/api/client.ts` | Modify | Add `asignarBatch()`, batch types; fix `Facultad_ids`→`facultad_ids` in actual POST body |
| `shared/services/api/infraClient.ts` | Use | Migrate initial data fetch (facultades, bloques, tipos) from raw `fetch()` to `infraApiClient` |
| `components/ui/alert.tsx` | New | Install `pnpm dlx shadcn@latest add alert` |
| `app/docentes/[id]/horarios/page.tsx` | Modify | Import `useBulkAsignacionStore`; update `handleAssignClick`/`openModal` call |

## Interfaces / Contracts

```typescript
// domain/types.ts — new types
export interface HorarioEntry {
  id: string                           // crypto.randomUUID()
  dia: number | null                   // 0-6 (API: 0=Lunes)
  horaInicio: string                   // HH:mm
  horaFin: string                      // HH:mm
  ambienteId: number | null
  ambienteLabel: string | null
  entryFilters?: {
    facultadIds?: number[]
    bloqueIds?: number[]
    tipoAmbienteIds?: number[]
    capacidadMin?: number
  }
  ambientes?: InfraAmbiente[]
  loadingAmbientes?: boolean
}

// Exact API contracts:
export interface AsignarHorariosBatchRequest {
  persona_grupo_id: number
  fecha_inicio: string                 // YYYY-MM-DD
  fecha_fin: string                    // YYYY-MM-DD
  horarios: Array<{
    dia: number                        // 0-6
    hora_inicio: string                // HH:mm
    hora_fin: string                   // HH:mm
    aula_id: number
  }>
}
export interface AsignarHorariosBatchResponse {
  success: boolean
  message: string                      // "N horarios asignados correctamente"
  data: Array<{ id: number; persona_grupo_id: number; aula_id: number;
    dia: number; hora_inicio: string; hora_fin: string;
    fecha_inicio: string; fecha_fin: string }>
}
// Error: { statusCode: 400, message: "Error en horario N: ...", error: "Bad Request" }
```

`BuscarAmbienteRequest` stores have `Facultad_ids` (PascalCase) — the type in `client.ts` already uses `facultad_ids`. The fix removes the raw fetch in the store; the `apiClient` call uses the typed interface directly.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Solapamiento math | Pure functions: `detectIntraBulkConflicts(entries)` and `detectExistingConflicts(entries, existing[])` — test all overlap permutations |
| Unit | Batch payload | `buildBatchPayload(entries, groupId, dateRange)` → verify JSON matches API contract |
| Integration | apiClient error | Mock 400 → Alert shows in modal; mock 201 → modal closes + `onAssigned` fires |
| Manual | Full walkthrough | Add 2 overlapping entries → SolapamientoWarning → Confirm → 201 → refresh |

## Open Questions

- [ ] Resolve field casing for `buscar-ambientes` body: store sends `Facultad_ids` (PascalCase F), type uses `facultad_ids` (snake). Confirm which the API expects — align all code to that.
- [ ] Cache strategy: should identical (día, hora, filters) queries across entries share results?
- [ ] 400 error shape: `{ statusCode: number, message: string, error: string }` — verify `apiClient.handleResponse` can parse it for display.
