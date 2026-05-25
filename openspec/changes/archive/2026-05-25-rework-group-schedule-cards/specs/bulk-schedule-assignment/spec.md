# Delta for Bulk Schedule Assignment

## ADDED Requirements

### Requirement: R8 — Edit Mode in BulkAssignmentModal

The system MUST support `mode: "create" | "edit"` in BulkAssignmentModal. Edit mode MUST pre-fill entries from existing schedules and submit via PATCH.

#### SC-3.1: Edit modal shows correct title
- GIVEN BulkAssignmentModal opens with `mode="edit"`
- WHEN the modal renders
- THEN the title shows "Editar Horarios"
- AND the submit button shows "Guardar cambios"

#### SC-3.2: Entries pre-filled from existing schedules
- GIVEN a group with 3 schedules containing `id`, `dia` (1-6), `hora_inicio`, `hora_fin`, `aula_id`, and `vigencia` ("01/04/2026 - 30/04/2026")
- WHEN edit mode opens
- THEN the table shows 3 entries with día converted to 0-6, correct hora_inicio/hora_fin, ambiente label, and date range parsed from vigencia

#### SC-3.5: User can add entries in edit mode
- GIVEN the edit modal with 2 pre-filled entries
- WHEN the user clicks "Agregar horario"
- THEN a new empty entry appears in the table

#### SC-3.6: User can remove entries in edit mode
- GIVEN the edit modal with 3 entries
- WHEN the user clicks ✕ on entry 2
- THEN entry 2 is removed and remaining entries stay unchanged

#### SC-3.7: User can modify existing entries
- GIVEN pre-filled entry with día=1, hora_inicio="08:00"
- WHEN the user changes día to 2 and hora_inicio to "10:00"
- THEN the entry reflects the new values

#### SC-3.9: Submit calls PATCH with correct payload
- GIVEN 3 entries in edit mode
- WHEN the user clicks "Guardar cambios"
- THEN the system PATCHes /horario-clases with `{ horarios: [{ id (numeric, required), dia?, hora_inicio?, hora_fin?, aula_id? }] }`
- AND the call is transactional (all-or-nothing)
- AND on success: toast.success(), modal closes, grid refreshes

#### SC-3.12: Edit error handling
- GIVEN PATCH returns 400 with "Error en horario 2: aula no disponible"
- WHEN the user submits edits
- THEN toast.error() shows, modal stays open, entry 2 highlighted with error

#### SC-3.13: Solapamiento excludes own entries
- GIVEN edit mode with entries having schedule IDs 42, 43, 44
- WHEN solapamiento check runs
- THEN those IDs are excluded from conflict detection (self-exclusion)

#### SC-3.14: Edit state resets on close
- GIVEN the edit modal with modified but unsaved entries
- WHEN the user closes via X or click outside
- THEN useEditScheduleStore is cleared (no stale data persists)

### Requirement: R9 — Group Summary Card Actions

The system MUST render GroupSummaryCard as a compact card with NO card-level onClick, NO PlusCircle/ChevronRight icons, badge showing "Horarios: N", and three action icons at bottom-right.

#### SC-1.1: Card renders without decoration icons
- GIVEN a group with schedules
- WHEN GroupSummaryCard renders
- THEN the card has no onClick handler, no PlusCircle icon, no ChevronRight icon

#### SC-1.2: Badge shows "Horarios: N"
- GIVEN a group with 4 schedules
- WHEN GroupSummaryCard renders
- THEN the badge shows "Horarios: 4"

#### SC-1.3: Three action icons rendered
- GIVEN a GroupSummaryCard
- WHEN the card renders
- THEN three icons appear at bottom-right: Plus (add), Pencil (edit), Trash2 (delete)

#### SC-1.4: Add opens create modal
- GIVEN a GroupSummaryCard
- WHEN the user clicks Plus
- THEN BulkAssignmentModal opens in create mode

#### SC-1.5: Edit opens edit modal
- GIVEN a GroupSummaryCard
- WHEN the user clicks Pencil
- THEN BulkAssignmentModal opens in edit mode with pre-filled entries for that group

#### SC-1.6: Delete shows toast
- GIVEN a GroupSummaryCard
- WHEN the user clicks Trash2
- THEN toast.info("Próximamente disponible") is shown (no-op)

#### SC-1.7: No card onClick
- GIVEN a GroupSummaryCard
- WHEN the user clicks anywhere on the card body (not on icons)
- THEN no action occurs

#### SC-1.8: Responsive at all breakpoints
- GIVEN GroupSummaryCards in a grid
- WHEN viewed at any breakpoint
- THEN cards remain responsive and the grid stacks below lg

#### SC-1.9: Skeleton state functional
- GIVEN loading state
- WHEN GroupSummaryCard skeleton renders
- THEN the skeleton is visually consistent and non-interactive

#### SC-1.10: Empty state functional
- GIVEN no groups
- WHEN the group list renders
- THEN an empty state is shown with no cards

### Requirement: R10 — Grid Click to Edit

The system MUST allow clicking a non-cluster ScheduleBlock to open the edit modal.

#### SC-4.1: Non-cluster block opens edit modal
- GIVEN a visible non-cluster ScheduleBlock
- WHEN the user clicks it
- THEN the edit modal opens

#### SC-4.2: All schedules pre-filled, not just clicked one
- GIVEN a group with 4 schedules and one is clicked
- WHEN the edit modal opens
- THEN ALL 4 schedules appear in the entries table

#### SC-4.3: Clicked entry is highlighted
- GIVEN a ScheduleBlock is clicked
- WHEN the edit modal opens
- THEN the clicked entry is visually highlighted in the entries table

#### SC-4.4: Collapsed cluster does NOT trigger edit
- GIVEN a collapsed cluster ScheduleBlock (showing "+N more")
- WHEN the user clicks on it
- THEN no edit modal opens (cluster expands instead)

#### SC-4.5: Expanded cluster DOES trigger edit
- GIVEN an expanded cluster showing individual schedules
- WHEN the user clicks a schedule inside it
- THEN the edit modal opens with all schedules for that group

### Requirement: R11 — Normalizer Extended Fields

NormalizedSchedule MUST expose `dbId: number | null`, `fechaInicioRaw: string`, and `fechaFinRaw: string` parsed from the API `vigencia` field.

#### SC-6.1: dbId and fechas parsed correctly
- GIVEN a schedule with `id: 42` and `vigencia: "01/04/2026 - 30/04/2026"`
- WHEN the normalizer processes it
- THEN `dbId` = 42, `fechaInicioRaw` = "01/04/2026", `fechaFinRaw` = "30/04/2026"

#### SC-6.2: Malformed vigencia produces empty strings
- GIVEN a schedule with `vigencia: "invalid"`
- WHEN the normalizer processes it
- THEN `fechaInicioRaw` = "" and `fechaFinRaw` = ""

#### SC-6.3: Null id produces null dbId
- GIVEN a schedule with `id: null`
- WHEN the normalizer processes it
- THEN `dbId` is `null` (not NaN, not 0)

### Requirement: R12 — Sidebar Layout

The system MUST use a 280px sidebar width on lg+ screens with the grid filling the remaining space.

#### SC-2.1: Sidebar width on lg+
- GIVEN the TeacherSchedulePage layout
- WHEN viewed on lg+ screens
- THEN the sidebar is 280px wide and the grid occupies `minmax(0, 1fr)`

#### SC-2.2: Sidebar stacks below lg
- GIVEN the layout
- WHEN viewed below lg breakpoint
- THEN the sidebar stacks vertically above the grid (unchanged from current behavior)

## MODIFIED Requirements

### Requirement: R7 — API Client Only

The system MUST use apiClient for ALL HTTP calls in the assignment flow — zero raw fetch() calls. The client MUST expose a generic `patch<T>(url, body)` method for PATCH requests.
(Previously: client did not expose patch() — POST only)

#### Scenario: Assignment flow uses apiClient throughout
- GIVEN the bulk assignment flow
- WHEN ambiente search and batch submission are called
- THEN both use apiClient.post() — no raw fetch() exists in the module

#### Scenario: Edit flow uses apiClient.patch()
- GIVEN the edit submission flow
- WHEN the user clicks "Guardar cambios"
- THEN the system calls apiClient.patch() for PATCH /horario-clases — no raw fetch()
