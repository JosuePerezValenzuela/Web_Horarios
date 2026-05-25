# Design: Rework GroupSummaryCard + Edit/Delete + PATCH Integration

## Technical Approach

Redesign `GroupSummaryCard` as a static card with three action icons (add/edit/delete) in bottom-right, replace sidebar grid to `280px`, and extend `BulkAssignmentModal` with a `mode: "create" | "edit"` prop. A separate `useEditScheduleStore` handles edit state, pre-fills entries from `NormalizedSchedule[]`, and submits via `PATCH /horario-clases`. Extract a shared `AmbienteSearchContract` interface that both stores implement, so `AmbienteSearchPopover` becomes store-agnostic.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Edit store | (A) Extend bulk store | (A) Couples create/edit state, reset complexity | **B — Separate store** |
| AmbienteSearch | (A) Prop-drill 15+ props (B) Shared hook/contract | (A) Verbose but explicit (B) Cleaner but needs contract | **B — Shared `AmbienteSearchContract`** |
| Date range in edit | (A) Global picker (B) Per-entry from normalizer | (A) Adds friction (B) Uses existing schedule dates | **B — Per-entry dates** |
| Delete | (A) No-op toast (B) Partial DELETE endpoint | (B) Out of scope per proposal | **A — No-op with toast** |

## Data Flow

```
CREATE:  Card[+] → TeacherSchedulePage → useBulkAsignacionStore.openModal(group)
         → BulkAssignmentModal (mode:create) → POST /horario-clases → refresh

EDIT (card):  Card[✏️] → TeacherSchedulePage → useEditScheduleStore.open(group, schedules)
              → BulkAssignmentModal (mode:edit) → PATCH /horario-clases → refresh

EDIT (grid):  ScheduleBlock.onClick → WeeklyScheduleGrid → TeacherSchedulePage
              → useEditScheduleStore.open(group, [schedule]) → same edit flow

DELETE:  Card[🗑️] → TeacherSchedulePage → toast("Próximamente disponible")
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `features/scheduling/docentes/application/useEditScheduleStore.ts` | **Create** | Zustand store for edit mode — pre-fill, ambient search, PATCH submit |
| `features/scheduling/docentes/domain/types.ts` | Modify | Add `EditScheduleEntry`, `EditHorariosBatchRequest/Response`, `AmbienteSearchContract`, new fields on `NormalizedSchedule` |
| `features/scheduling/docentes/application/normalizers.ts` | Modify | Add `dbId`, `fechaInicioRaw`, `fechaFinRaw` to `NormalizedSchedule` |
| `features/scheduling/docentes/ui/GroupSummaryCard.tsx` | Modify | Redesign as static card with 3 icon buttons, new props |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | Modify | Add `mode` prop, conditional store/submit/title/date behavior |
| `features/scheduling/docentes/ui/AmbienteSearchPopover.tsx` | Modify | Accept `AmbienteSearchContract` instead of direct store coupling |
| `features/scheduling/docentes/ui/WeeklyScheduleGrid.tsx` | Modify | Add `onEditSchedule` prop, pass to `ScheduleBlock` |
| `features/scheduling/docentes/ui/ScheduleBlock.tsx` | Modify | Add `onClick` prop (non-cluster blocks) |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Modify | Add edit/delete handlers, pass new props, sidebar grid width |
| `features/scheduling/docentes/application/useBulkAsignacionStore.ts` | Modify | Export `createBulkAmbienteAdapter()` for contract conformance (no state change) |
| `shared/services/api/client.ts` | Modify | Add `patch<T>()` method, `EditarHorariosBatchRequest/Response` types, `horariosApi.editarBatch()` |
| `app/docentes/[id]/horarios/page.tsx` | Modify | Wire `handleEditSchedule`, `handleDeleteSchedule`, `handleAddSchedule` |

## Interfaces / Contracts

### 1. Component Tree

```
TeacherSchedulePage
├── GroupSummaryCard (redesigned — no onClick, no PlusCircle/ChevronRight)
│   ├── Icon: Plus        → onAddClick(group) [create mode]
│   ├── Icon: Pencil      → onEditClick(group) [edit mode, pre-fills ALL group schedules]
│   └── Icon: Trash2      → onDeleteClick(group) [toast]
├── BulkAssignmentModal (extended with mode prop)
│   ├── DatePickerRange (mode=create) | Read-only fechas (mode=edit)
│   ├── Entries table (per row)
│   │   ├── Select (dia)
│   │   ├── Input (horaInicio)
│   │   ├── Input (horaFin)
│   │   └── Button "Seleccionar" → AmbienteSearchPopover
│   ├── AmbienteSearchPopover (via AmbienteSearchContract — store-agnostic)
│   ├── SolapamientoWarning
│   └── Submit button (mode=create: "Asignar N horarios" | mode=edit: "Guardar cambios")
└── WeeklyScheduleGrid (extended)
    └── ScheduleBlock (with onClick, non-cluster only)
        └── onClick → onEditSchedule(schedule) → edit store.open() with [schedule]
```

### 2. Store Design: useEditScheduleStore

```typescript
// ── State shape ───────────────────────────────────────
interface EditScheduleState {
  // Modal
  isOpen: boolean
  selectedGroup: GroupInfo | null
  existingSchedules: NormalizedSchedule[]   // Original for solapamiento self-exclusion

  // Entries (pre-filled from NormalizedSchedule[])
  entries: EditScheduleEntry[]

  // Ambiente search (mirrors bulk store shape for contract conformance)
  entryFilters: Record<string, EntryFilterOverrides>
  ambienteCache: Record<string, InfraAmbiente[]>
  loadingAmbientesForEntry: string | null
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null
  initialLoadError: string | null

  // Submission
  submitting: boolean
  solapamientos: SolapamientoInfo[]
}

// ── Actions ───────────────────────────────────────────
interface EditScheduleActions {
  // Open modal with pre-filled entries from existing schedules
  open: (group: GroupInfo, schedules: NormalizedSchedule[]) => void

  close: () => void

  // Entry management (same signature as bulk store)
  addEntry: () => void
  removeEntry: (id: string) => void
  updateEntry: (id: string, partial: Partial<EditScheduleEntry>) => void
  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => void

  // Per-entry filter overrides (same as bulk store)
  setEntryFilters: (entryId: string, filters: Partial<EntryFilterOverrides>) => void

  // Ambiente search (same signature as bulk store)
  fetchAmbientesForEntry: (entryId: string) => Promise<void>

  // Solapamiento — excludes entries whose dbId matches existing schedules (self-exclusion)
  checkSolapamientos: (existingSchedules: NormalizedSchedule[]) => SolapamientoInfo[]

  // Submit — builds PATCH payload and calls horariosApi.editarBatch()
  submitEdit: () => Promise<{ success: boolean; message?: string; errorIndex?: number }>

  fetchInitialData: () => Promise<void>
  reset: () => void
}
```

**Implementation notes:**

**`open(group, schedules)`** — Pre-fills entries:
```typescript
open: (group, schedules) => {
  const entries: EditScheduleEntry[] = schedules.map((s) => ({
    id: crypto.randomUUID(),
    dbId: s.dbId,                           // numeric from normalizer, null if composite
    dia: (s.day - 1) as 0 | 1 | 2 | 3 | 4 | 5 | null,  // 1-6 → 0-5
    horaInicio: formatTime(s.startMin),     // minutes → "HH:mm"
    horaFin: formatTime(s.endMin),
    ambienteId: s.ambienteId ?? undefined,
    ambienteLabel: s.ambienteLabel,
    fechaInicio: s.fechaInicioRaw ?? undefined,
    fechaFin: s.fechaFinRaw ?? undefined,
    error: null,
  }))
  set({
    isOpen: true,
    selectedGroup: group,
    existingSchedules: schedules,
    entries,
  })
  get().fetchInitialData()
}
```

**`submitEdit()`** — Builds PATCH payload:
```typescript
submitEdit: async () => {
  const { entries } = get()
  const validEntries = entries.filter(
    (e) => e.dbId !== null && e.dia !== null && e.horaInicio && e.horaFin
  )
  if (validEntries.length === 0)
    return { success: false, message: "No hay horarios editables" }

  set({ submitting: true })
  try {
    const payload: EditHorariosBatchRequest = {
      horarios: validEntries.map((e) => ({
        id: e.dbId!,                         // Required numeric ID
        ...(e.dia !== null && { dia: e.dia }),          // 0-6 infra format
        ...(e.horaInicio && { hora_inicio: e.horaInicio }),
        ...(e.horaFin && { hora_fin: e.horaFin }),
        ...(e.ambienteId && { aula_id: e.ambienteId }),
        ...(e.fechaInicio && { fecha_inicio: e.fechaInicio }),
        ...(e.fechaFin && { fecha_fin: e.fechaFin }),
      })),
    }
    const response = await horariosApi.editarBatch(payload)
    set({ submitting: false })
    return { success: true, message: response.message }
  } catch (error) {
    set({ submitting: false })
    return { success: false, message: extractErrorMessage(error) }
  }
}
```

**Dia conversion summary:**
| Context | Format | Range |
|---------|--------|-------|
| `NormalizedSchedule.day` | Display (Lunes=1) | 1-6 |
| Store `entry.dia` | Entry/Modal (Lunes=0) | 0-6 |
| PATCH body `dia` | Infra (Lunes=0) | 0-6 |
| `checkSolapamientos` | `entry.dia + 1 === schedule.day` | — |

**Solapamiento check** — reuses same logic as bulk store but adds self-exclusion:
```typescript
// Before checking against existing schedules, filter out schedules whose dbId
// matches any entry's dbId:
const filteredSchedules = existingSchedules.filter(
  (s) => !entries.some((e) => e.dbId !== null && e.dbId === s.dbId)
)
// Then run same intra-bulk + cross-check against filteredSchedules
```

**Fetch ambientes in edit mode** — uses per-entry `fechaInicio`/`fechaFin` instead of global `dateRange`:
```typescript
fetchAmbientesForEntry: async (entryId: string) => {
  // ... same as bulk store ...
  const payload: BuscarAmbienteRequest = {
    dia: entry.dia,  // 0-6, same as bulk
    hora_inicio: entry.horaInicio,
    hora_fin: entry.horaFin,
    fecha_inicio: entry.fechaInicio,  // Per-entry, not dateRange
    fecha_fin: entry.fechaFin,        // Per-entry, not dateRange
    persona_grupo_id: selectedGroup?.persona_grupo_id,
    // ... same filters ...
  }
}
```

**Reset behavior** — full state reset on close (same pattern as bulk store):
```typescript
close: () => {
  set({ isOpen: false })
  setTimeout(() => get().reset(), 300)
}
reset: () => set({ ...INITIAL_STATE })
```

### 3. AmbienteSearch Contract

```typescript
/**
 * Shared contract that both useBulkAsignacionStore and useEditScheduleStore
 * conform to. AmbienteSearchPopover consumes this instead of reading from
 * a specific store directly.
 */
export interface AmbienteSearchContract {
  // Current entry lookup
  getEntry: (entryId: string) => EditScheduleEntry | HorarioEntry | undefined

  // Per-entry filter overrides
  getEntryFilters: (entryId: string) =>
    | { selectedFacultades: InfraFacultad[]; selectedBloques: InfraBloque[]; selectedTipos: InfraTipoAmbiente[]; estudiantes: number | null }
    | undefined

  // Global data
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null

  // Date context — the popover needs this for "isComplete" validation
  dateRange: DateRange | undefined
  // Edit store: dateRange is always undefined; uses per-entry fechas instead

  // Async state
  loadingAmbientesForEntry: string | null
  ambienteCache: Record<string, InfraAmbiente[]>

  // Actions
  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => void
  setEntryFilters: (entryId: string, filters: Partial<EntryFilterOverrides>) => void
  fetchAmbientesForEntry: (entryId: string) => Promise<void>
}

// Factory functions to create adapters from each store:
export function createBulkAmbienteAdapter(
  store: typeof useBulkAsignacionStore
): AmbienteSearchContract { /* maps selectors */ }

export function createEditAmbienteAdapter(
  store: typeof useEditScheduleStore
): AmbienteSearchContract { /* maps selectors */ }
```

**AmbienteSearchPopover** changes to accept the contract:
```typescript
interface AmbienteSearchPopoverProps {
  entryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  adapter: AmbienteSearchContract     // ← NEW: replaces direct store coupling
}
```

**isComplete logic in edit mode:**
- Create mode: `isComplete = !!entry.dia && !!entry.horaInicio && !!entry.horaFin && hasGlobalDates`
- Edit mode: `isComplete = !!entry.dia && !!entry.horaInicio && !!entry.horaFin && !!(entry.fechaInicio || hasGlobalDates)`
- The popover checks both `dateRange` (create) and `entry.fechaInicio` (edit)

### 4. BulkAssignmentModal Mode Design

```typescript
interface BulkAssignmentModalProps {
  mode: "create" | "edit"
  onAssigned?: () => void | Promise<void>
  schedules?: NormalizedSchedule[]
}
```

**Mode effects:**

| Aspect | `create` | `edit` |
|--------|----------|--------|
| Store | `useBulkAsignacionStore` | `useEditScheduleStore` |
| Title | "Asignar Horarios" | "Editar Horarios" |
| Date range | Global `DatePickerRange` (mandatory) | Per-entry read-only fechas (hidden or disabled) |
| Submit button | "Asignar N horarios" | "Guardar cambios" |
| API call | `POST /horario-clases/asignar` (via `submitBatch`) | `PATCH /horario-clases` (via `submitEdit`) |
| Solapamiento check | Against all schedules | Self-exclusion by dbId |
| Entry initialization | Auto-add blank entry on open | Pre-filled from `NormalizedSchedule[]` |
| Ambientes fetch | Uses `dateRange.from/to` for fechas | Uses `entry.fechaInicio/fechaFin` per entry |

**State initialization in edit mode:**
```typescript
// In modal, when mode=edit:
if (mode === "edit") {
  // Do NOT auto-add entry (pre-filled by open())
  // Date range section is hidden/shows read-only
  // Submit builds PATCH payload
}
```

**Store switching in modal:**
```typescript
function BulkAssignmentModal({ mode, onAssigned, schedules }: BulkAssignmentModalProps) {
  const createStore = useBulkAsignacionStore
  const editStore = useEditScheduleStore

  const ambienteAdapter = useMemo(
    () => mode === "create"
      ? createBulkAmbienteAdapter(createStore)
      : createEditAmbienteAdapter(editStore),
    [mode]
  )

  const isOpen = mode === "create"
    ? useBulkAsignacionStore((s) => s.isOpen)
    : useEditScheduleStore((s) => s.isOpen)
  // ... similar conditional selectors for entries, submitting, etc.
}
```

### 5. Normalizer Changes

```typescript
// Added fields to NormalizedSchedule:
export interface NormalizedSchedule {
  // ... existing fields ...
  dbId: number | null           // ✨ NEW: numeric schedule ID, null if composite
  fechaInicioRaw: string | null // ✨ NEW: "DD/MM/YYYY" or null
  fechaFinRaw: string | null    // ✨ NEW: "DD/MM/YYYY" or null
}
```

**`dbId` extraction** in `normalizeSingleSchedule`:
```typescript
// After computing other fields:
const rawId = schedule.id ?? schedule.id
const dbId = typeof rawId === "number" && Number.isFinite(rawId)
  ? rawId
  : (typeof rawId === "string" && /^\d+$/.test(rawId.trim())
    ? Number(rawId.trim())
    : null)
```

**`fechaInicioRaw`/`fechaFinRaw` extraction** in `normalizeSingleSchedule`:
```typescript
const fechaInicioRaw = toStringValue(
  schedule.fechaInicio ?? schedule.fecha_inicio, null
) || null
const fechaFinRaw = toStringValue(
  schedule.fechaFin ?? schedule.fecha_fin, null
) || null
```

**Updated normalizeSingleSchedule return:**
```typescript
return {
  scheduleId,
  dbId,               // ← NEW
  groupKey,
  persona_grupo_id,
  ambienteId,
  colorIndex: 0,
  day,
  startMin,
  endMin,
  durationMin,
  laneIndex: 0,
  laneCount: 1,
  materia,
  grupo,
  carreras,
  ambienteLabel,
  tipoLabel,
  fechasLabel,
  fechaInicioRaw,     // ← NEW
  fechaFinRaw,        // ← NEW
}
```

### 6. API Client Changes

**New `patch<T>()` method on ApiClient:**
```typescript
class ApiClient {
  // ... existing get(), post() ...

  async patch<T>(endpoint: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body })
  }
}
```

**Update `ApiClientOptions` method type:**
```typescript
interface ApiClientOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"   // ← Added "PATCH"
  body?: unknown
  headers?: Record<string, string>
}
```

**New types and endpoint:**
```typescript
export interface EditarHorarioItem {
  id: number              // Required — schedule's numeric dbId
  dia?: number            // 0-6 (Infra format, optional for partial update)
  hora_inicio?: string    // "HH:mm"
  hora_fin?: string       // "HH:mm"
  aula_id?: number        // ambiente ID
  fecha_inicio?: string   // "YYYY-MM-DD"
  fecha_fin?: string      // "YYYY-MM-DD"
}

export interface EditarHorariosBatchRequest {
  horarios: EditarHorarioItem[]
}

export interface EditarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: Array<{
    id: number
    persona_grupo_id: number
    dia: number
    hora_inicio: string
    hora_fin: string
    fecha_inicio: string
    fecha_fin: string
    aula_id: number
  }>
}
```

**New horariosApi method:**
```typescript
export const horariosApi = {
  // ... existing methods ...
  editarBatch: (payload: EditarHorariosBatchRequest): Promise<EditarHorariosBatchResponse> => {
    return apiClient.patch<EditarHorariosBatchResponse>("/horario-clases", payload)
  },
}
```

### 7. Data Flow Diagrams

```
CREATE FLOW:
  Card[Plus] ──→ TeacherSchedulePage.onAddClick(group)
       │
       ├──→ useBulkAsignacionStore.openModal(group)
       │       └── fetchInitialData() [facultades, tipos]
       │       └── auto-add blank entry
       │
       └──→ BulkAssignmentModal (mode:"create")
               ├── DatePickerRange ← user selects
               ├── Entries table ← user fills dia/time/ambiente
               ├── [Submit] → submitBatch(personaGrupoId)
               │       └── POST /horario-clases/asignar
               │       └── on success: toast → close → onAssigned → refresh
               │       └── on error: toast + highlight errored entry
               └── AmbienteSearchPopover (via bulk adapter)

EDIT FLOW (card):
  Card[Pencil] ──→ TeacherSchedulePage.onEditClick(group)
       │
       ├──→ Filter schedules by group.groupKey
       ├──→ useEditScheduleStore.open(group, filteredSchedules)
       │       └── map NormalizedSchedule[] → EditScheduleEntry[]
       │       └── convert day (1-6 → 0-5)
       │       └── convert startMin/endMin → "HH:mm"
       │       └── fetchInitialData()
       │
       └──→ BulkAssignmentModal (mode:"edit")
               ├── [Read-only date display from entry.fechaInicio/fechaFin]
               ├── Entries table ← pre-filled, user can modify
               ├── [Submit] → submitEdit()
               │       └── build PATCH payload { horarios: [{ id, dia?, hora_inicio?, ... }] }
               │       └── PATCH /horario-clases
               │       └── on success: toast → close → onAssigned → refresh
               └── AmbienteSearchPopover (via edit adapter)

EDIT FLOW (grid):
  ScheduleBlock[onClick] ──→ WeeklyScheduleGrid.onEditSchedule(schedule)
       │
       ├──→ TeacherSchedulePage.handleEditSchedule(schedule)
       ├──→ Find group for this schedule
       ├──→ useEditScheduleStore.open(group, [schedule])  // single-schedule edit
       └──→ ... same edit flow as card ...
```

### 8. Responsive Layout Design

**Sidebar grid width** (in `TeacherSchedulePage.tsx`):
```tsx
// BEFORE:
lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]
// AFTER:
lg:grid-cols-[280px_minmax(0,1fr)]
```

**Icon buttons on card** (in redesigned `GroupSummaryCard`):
```tsx
// Bottom-right icon row — responsive sizing using size-*
<div className="flex items-center gap-1">
  <Button variant="ghost" size="icon-xs">      {/* h-6 w-6 on mobile */}
    <Plus className="size-3 sm:size-3.5" />
  </Button>
  <Button variant="ghost" size="icon-xs">
    <Pencil className="size-3 sm:size-3.5" />
  </Button>
  <Button variant="ghost" size="icon-xs">
    <Trash2 className="size-3 sm:size-3.5" />
  </Button>
</div>
```

**Modal responsive max-w:**
```tsx
// Create mode (same as current):
<DialogContent className="sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">

// Edit mode (same component, no change needed):
<DialogContent className="sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
```

**Below lg** (sidebar stacks vertically — unchanged existing behavior):
```tsx
// lg:grid-cols-[280px_minmax(0,1fr)]
// Below lg: default block layout (single column, sidebar on top)
```

### 9. Type Definitions

```typescript
// ── EditScheduleEntry ─────────────────────────────────
export interface EditScheduleEntry {
  id: string                    // Local UUID (crypto.randomUUID())
  dbId: number | null           // Numeric schedule ID for PATCH id field; null = cannot edit (skip)
  dia: number | null            // 0-6 (0=Lunes, same as HorarioEntry.dia)
  horaInicio: string            // "HH:mm"
  horaFin: string               // "HH:mm"
  ambienteId?: number
  ambienteLabel?: string
  fechaInicio?: string          // "YYYY-MM-DD" (ISO) from normalizer
  fechaFin?: string             // "YYYY-MM-DD" (ISO) from normalizer
  error?: string | null
}

// ── PATCH types ───────────────────────────────────────
export interface EditarHorarioItem {
  id: number
  dia?: number
  hora_inicio?: string
  hora_fin?: string
  aula_id?: number
  fecha_inicio?: string
  fecha_fin?: string
}

export interface EditarHorariosBatchRequest {
  horarios: EditarHorarioItem[]
}

export interface EditarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: Array<{
    id: number
    persona_grupo_id: number
    dia: number
    hora_inicio: string
    hora_fin: string
    fecha_inicio: string
    fecha_fin: string
    aula_id: number
  }>
}

// ── Updated NormalizedSchedule ────────────────────────
export interface NormalizedSchedule {
  scheduleId: string
  groupKey: string
  persona_grupo_id: number
  ambienteId: number | null
  colorIndex: number
  day: 1 | 2 | 3 | 4 | 5 | 6
  startMin: number
  endMin: number
  durationMin: number
  laneIndex: number
  laneCount: number
  materia: string
  grupo: string
  carreras: string[]
  ambienteLabel: string
  tipoLabel: string
  fechasLabel: string
  dbId: number | null             // ✨ NEW
  fechaInicioRaw: string | null   // ✨ NEW
  fechaFinRaw: string | null      // ✨ NEW
}

// ── GroupSummaryCardProps (redesigned) ────────────────
export interface GroupSummaryCardProps {
  group: GroupSummary
  onAddClick?: (group: GroupSummary) => void
  onEditClick?: (group: GroupSummary) => void
  onDeleteClick?: (group: GroupSummary) => void
}

// ── BulkAssignmentModalProps (updated) ────────────────
export interface BulkAssignmentModalProps {
  mode: "create" | "edit"
  onAssigned?: () => void | Promise<void>
  schedules?: NormalizedSchedule[]
}
// Note: mode is new; onAssigned and schedules remain

// ── ScheduleBlockProps (updated) ──────────────────────
export interface ScheduleBlockProps {
  schedule: NormalizedSchedule
  compact?: boolean
  mode?: "full" | "peek"
  className?: string
  onClick?: (schedule: NormalizedSchedule) => void   // ✨ NEW
}

// ── WeeklyScheduleGridProps (updated) ─────────────────
export interface WeeklyScheduleGridProps {
  schedules: NormalizedSchedule[]
  rows: TimeRow[]
  timeRange: TimeRange
  overlapRotationIntervalMs?: number
  onEditSchedule?: (schedule: NormalizedSchedule) => void   // ✨ NEW
}

// ── TeacherSchedulePageProps (updated) ────────────────
export interface TeacherSchedulePageProps {
  docente: DocenteScheduleMeta | null
  groups: GroupSummary[]
  schedules: NormalizedSchedule[]
  period: number
  overlapRotationIntervalMs?: number
  rows: TimeRow[]
  timeRange: TimeRange
  loading: boolean
  error: string | null
  onRetry: () => void
  onBack: () => void
  onPeriodChange: (period: number) => void
  docenteId?: string
  // ── New handlers ──
  onAddClick?: (group: GroupSummary) => void       // was onAssignClick
  onEditClick?: (group: GroupSummary) => void       // ✨ NEW
  onDeleteClick?: (group: GroupSummary) => void     // ✨ NEW
  onEditSchedule?: (schedule: NormalizedSchedule) => void  // ✨ NEW (grid)
  onAssigned?: () => void | Promise<void>
}

// ── AmbienteSearchContract ────────────────────────────
export interface AmbienteSearchContract {
  getEntry: (entryId: string) => (HorarioEntry | EditScheduleEntry) | undefined
  getEntryFilters: (entryId: string) => EntryFilterOverrides | undefined
  facultades: InfraFacultad[]
  tiposAmbiente: InfraTipoAmbiente[]
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null
  dateRange: DateRange | undefined
  loadingAmbientesForEntry: string | null
  ambienteCache: Record<string, InfraAmbiente[]>
  setEntryAmbiente: (entryId: string, ambiente: InfraAmbiente) => void
  setEntryFilters: (entryId: string, filters: Partial<EntryFilterOverrides>) => void
  fetchAmbientesForEntry: (entryId: string) => Promise<void>
}

// ── EntryFilterOverrides (extracted for reuse) ────────
export interface EntryFilterOverrides {
  selectedFacultades: InfraFacultad[]
  selectedBloques: InfraBloque[]
  selectedTipos: InfraTipoAmbiente[]
  estudiantes: number | null
}
```

### 10. Sequence Diagram — Edit Flow

```
User                    Card[✏️]           TeacherSchedulePage       useEditScheduleStore       BulkAssignmentModal       Backend
 │                       │                       │                        │                          │                      │
 │  click Pencil icon    │                       │                        │                          │                      │
 │──────────────────────>│                       │                        │                          │                      │
 │                       │ onEditClick(group)    │                        │                          │                      │
 │                       │──────────────────────>│                        │                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │ filter schedules by    │                          │                      │
 │                       │                       │ group.groupKey         │                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │ open(group, schedules) │                          │                      │
 │                       │                       │───────────────────────>│                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │ map schedules → entries   │                      │
 │                       │                       │                        │ day: s.day - 1           │                      │
 │                       │                       │                        │ time: min→"HH:mm"        │                      │
 │                       │                       │                        │ fetchInitialData()       │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │ sets isOpen=true       │                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │        render          │                          │                      │
 │                       │                       │──────────────────────────────────────────────────>│                      │
 │                       │                       │                        │                          │                      │
 │  sees modal with      │                       │                        │                          │                      │
 │  pre-filled entries   │                       │                        │                          │                      │
 │<──────────────────────────────────────────────│                        │                          │                      │
 │                       │                       │                        │                          │                      │
 │  modifies fields      │                       │                        │                          │                      │
 │───────────────────────────────────────────────────────────────────────>│                          │                      │
 │  (dia, time,          │                       │                        │    updateEntry()          │                      │
 │   ambiente, etc.)     │                       │                        │                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │                          │                      │
 │  clicks "Guardar"     │                       │                        │                          │                      │
 │───────────────────────────────────────────────────────────────────────>│                          │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │   checkSolapamientos()   │                      │
 │                       │                       │                        │   (self-exclude by dbId) │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │   submitEdit()           │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │   build PATCH payload    │                      │
 │                       │                       │                        │   { horarios: [{         │                      │
 │                       │                       │                        │       id, dia?,           │                      │
 │                       │                       │                        │       hora_inicio?,       │                      │
 │                       │                       │                        │       hora_fin?,          │                      │
 │                       │                       │                        │       aula_id?,           │                      │
 │                       │                       │                        │       fecha_inicio?,      │                      │
 │                       │                       │                        │       fecha_fin?          │
 │                       │                       │                        │     }] }                  │                      │
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │  editarBatch(payload)    │                      │
 │                       │                       │                        │───────────────────────────────────────────────>│
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │                          │           PATCH /horario-clases
 │                       │                       │                        │                          │           (transactional)
 │                       │                       │                        │                          │                      │
 │                       │                       │                        │        200 OK             │                      │
 │                       │                       │                        │<───────────────────────────────────────────────│
 │                       │                       │                        │                          │                      │
 │                       │                       │               toast.success()                    │                      │
 │                       │                       │               close() → reset()                  │                      │
 │                       │                       │               onAssigned() → fetchByDocenteId()  │                      │
 │                       │                       │                        │                          │                      │
 │  sees toast +         │                       │                        │                          │                      │
 │  refreshed grid       │                       │                        │                          │                      │
 │<──────────────────────│                       │                        │                          │                      │
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useEditScheduleStore.open()` pre-fills entries correctly | Test that day conversion (1-6 → 0-5), time format, dbId assignment work |
| Unit | `submitEdit()` builds correct PATCH payload | Verify payload structure, optional fields, id required |
| Unit | Solapamiento self-exclusion in edit mode | Verify schedules with matching dbId are excluded from conflict check |
| Unit | Normalizer: `dbId` extraction | Test numeric, string-numeric, string-alpha, null/undefined cases |
| Unit | Normalizer: `fechaInicioRaw`/`fechaFinRaw` | Test parsing from various API response formats |
| Integration | PATCH /horario-clases call | Mock API, verify correct method/body/headers |
| Integration | Mode switching in BulkAssignmentModal | Verify correct store reads based on mode prop |
| E2E | Card redesign | Visual: no PlusCircle/ChevronRight, 3 icons, badge format |
| E2E | Edit flow | Click pencil → modal opens with pre-filled data → modify → submit → grid refreshes |
| E2E | Delete flow | Click trash icon → toast appears |

## Migration / Rollout

No migration required. Card redesign and store changes are backward-compatible within the same page. The `mode` prop defaults are not needed since only the page handler decides the mode. The sidebar grid width change is a CSS-only change with immediate effect.

## Open Questions

- [ ] Should `delete` be a no-op toast only, or should we do a soft disable (grayed out icon)?
- [ ] What happens when all entries in edit mode have `dbId: null`? The submit button should be disabled with a tooltip — confirm UX copy.
- [ ] The `AmbienteSearchPopover` in edit mode uses per-entry fechas. If `fechaInicioRaw` is null (malformed data), should it fall back to the global date range or show an error? Decision: fall back to global date range if available, otherwise show "Fechas no disponibles".
- [ ] Cluster schedules in the grid: single-schedule click triggers edit for that one entry. Multi-schedule clusters remain expand-only (no individual click without expand). Confirm this matches product expectation.
