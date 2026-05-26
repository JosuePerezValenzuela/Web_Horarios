# Bulk Schedule Assignment Specification

## Purpose

Enable schedulers to define, validate, and submit multiple horario entries in a single session with shared date range, per-entry ambiente selection, solapamiento detection, and batch API submission — replacing the single-entry modal flow.

## Requirements

### R1: Multi-Entry Form

The system MUST provide a bulk form where users add, edit, and remove horario entries before submission.

#### Scenario: Add entries and review in table

- GIVEN the BulkAssignmentModal is open with a group context
- WHEN the user clicks "Agregar horario" N times
- THEN N entries appear in a table with día (select), hora inicio/fin (time inputs), ambiente (popover trigger), and a remove button

#### Scenario: Remove an entry

- GIVEN the BulkAssignmentModal has 3 entries in the table
- WHEN the user clicks ✕ on entry 2
- THEN the table shows only 2 entries and entry 2's data is discarded

### R2: Per-Entry Ambiente Search

Each entry MUST allow searching ambientes via a popover that uses the entry's día/hora and entry-level filters.

#### Scenario: Search ambientes from popover

- GIVEN an entry with día=1 (Martes), horaInicio="08:00", horaFin="10:00"
- WHEN the user opens the ambiente popover and types "Lab"
- THEN the system calls POST /horario-clases/asignar/buscar-ambientes via apiClient and shows matching ambientes

### R3: Solapamiento Propio Visual Distinction

The ambiente search results MUST sort and visually distinguish ambientes with `tiene_solapamiento_propio=true`.

#### Scenario: Solapamiento-propio entries appear first

- GIVEN the search returns 3 ambientes, 1 with tiene_solapamiento_propio=true
- WHEN the results render
- THEN the conflicting ambiente appears first and is visually distinct (e.g., different background and a conflict icon)

### R4: Solapamiento Validation and Warning

Before submission, the system MUST validate intra-bulk conflicts AND conflicts against existing schedules. If conflicts exist, a SolapamientoWarning dialog MUST appear.

#### Scenario: No conflicts — submit directly

- GIVEN 2 entries with different días and no overlap with existing schedules
- WHEN the user clicks "Asignar N horarios"
- THEN the system submits without showing a warning dialog

#### Scenario: Intra-bulk conflict triggers warning

- GIVEN 2 entries with the same día and overlapping time ranges
- WHEN the user clicks "Asignar N horarios"
- THEN a SolapamientoWarning dialog lists the conflicting pair and offers Confirm/Cancel

#### Scenario: Conflict with existing schedule triggers warning

- GIVEN 1 entry that overlaps a schedule in docenteHorariosStore
- WHEN the user clicks "Asignar N horarios"
- THEN a SolapamientoWarning dialog lists the existing schedule conflict

### R5: Batch Submission and Feedback

The system MUST submit all entries via POST /horario-clases/asignar and handle 201 success and 400 errors appropriately.

#### Scenario: Successful batch submission

- GIVEN 3 valid entries with no conflicts
- WHEN the user confirms submission
- THEN the system POSTs /horario-clases/asignar, receives 201, closes the modal, and shows a success shadcn Alert

#### Scenario: Backend rejects entry N

- GIVEN 3 entries submitted
- WHEN the server returns 400 with "Error en horario 2: aula no disponible"
- THEN the modal stays open, a shadcn Alert shows the error, and entry 2 is visually marked (e.g., border-destructive)

### R6: Global Filters with Per-Entry Overrides

The system MUST provide shared global filters (facultad, bloque, tipo, capacidad) inherited by all entries as defaults, with per-entry override support.

#### Scenario: Global filters apply to all entries

- GIVEN global filter bloque is set to "Aulas estándar"
- WHEN the user opens an entry's ambiente popover
- THEN the popover's bloque filter defaults to "Aulas estándar"

#### Scenario: Per-entry override diverges from global

- GIVEN global filter bloque is "Aulas estándar"
- WHEN the user overrides bloque in entry 2's popover to "Laboratorios"
- THEN entry 1 still filters by "Aulas estándar" and entry 2 filters by "Laboratorios"

### R7: API Client Only

The system MUST use apiClient for ALL HTTP calls in the assignment flow — zero raw fetch() calls. The client MUST expose generic `patch<T>(url, body)` and `delete<T>(url, body?)` methods for PATCH/DELETE requests.

#### Scenario: Assignment flow uses apiClient throughout

- GIVEN the bulk assignment flow
- WHEN ambiente search and batch submission are called
- THEN both use apiClient.post() — no raw fetch() exists in the module

#### Scenario: Edit flow uses apiClient.patch()

- GIVEN the edit submission flow
- WHEN the user clicks "Guardar cambios"
- THEN the system calls apiClient.patch() for PATCH /horario-clases — no raw fetch()

#### Scenario: Delete flow uses apiClient.delete()

- GIVEN group delete or row delete in edit mode
- WHEN persisted horarios are removed
- THEN the system calls apiClient.delete() for DELETE /horario-clases with `{ ids: number[] }`

### R8: Edit Mode in BulkAssignmentModal

The system MUST support `mode: "create" | "edit"` in BulkAssignmentModal. Edit mode MUST pre-fill entries from existing schedules and submit via PATCH. Row deletion in edit mode MUST be persisted when `dbId` is valid, MUST require destructive confirmation, and MAY remove only local unsaved rows when `dbId` is absent.

#### Scenario: Edit modal shows correct title

- GIVEN BulkAssignmentModal opens with `mode="edit"`
- WHEN the modal renders
- THEN the title shows "Editar Horarios"
- AND the submit button shows "Guardar cambios"

#### Scenario: Entries pre-filled from existing schedules

- GIVEN a group with 3 schedules containing `id`, `dia` (1-6), `hora_inicio`, `hora_fin`, `aula_id`, and `vigencia` ("01/04/2026 - 30/04/2026")
- WHEN edit mode opens
- THEN the table shows 3 entries with día converted to 0-6, correct hora_inicio/hora_fin, ambiente label, and date range parsed from vigencia

#### Scenario: User can add entries in edit mode

- GIVEN the edit modal with 2 pre-filled entries
- WHEN the user clicks "Agregar horario"
- THEN a new empty entry appears in the table

#### Scenario: Persisted row delete requires confirmation and API call

- GIVEN an edit row with numeric `dbId`
- WHEN the user clicks trash and confirms in AlertDialog
- THEN the system DELETEs `/horario-clases` with `{ ids: [dbId] }`
- AND on success removes the row, triggers refresh (`onAssigned`), and shows success toast

#### Scenario: Unsaved row delete remains local

- GIVEN an edit row with `dbId` null/invalid
- WHEN the user clicks row delete
- THEN the system removes the row locally without calling DELETE API

#### Scenario: Row delete guard for invalid IDs

- GIVEN a persisted-delete attempt where no valid numeric IDs are derivable
- WHEN the user confirms deletion
- THEN the system MUST NOT call DELETE API
- AND MUST show an error toast

#### Scenario: Row delete stale ID handling

- GIVEN DELETE `/horario-clases` returns 404 for stale/missing ID
- WHEN the user confirms persisted row delete
- THEN the system shows error toast using backend message when available
- AND triggers refresh to reconcile UI state

#### Scenario: User can modify existing entries

- GIVEN pre-filled entry with día=1, hora_inicio="08:00"
- WHEN the user changes día to 2 and hora_inicio to "10:00"
- THEN the entry reflects the new values

#### Scenario: Submit calls PATCH with correct payload

- GIVEN 3 entries in edit mode
- WHEN the user clicks "Guardar cambios"
- THEN the system PATCHes /horario-clases with `{ horarios: [{ id (numeric, required), dia?, hora_inicio?, hora_fin?, aula_id? }] }`
- AND the call is transactional (all-or-nothing)
- AND on success: toast.success(), modal closes, grid refreshes

#### Scenario: Edit error handling

- GIVEN PATCH returns 400 with "Error en horario 2: aula no disponible"
- WHEN the user submits edits
- THEN toast.error() shows, modal stays open, entry 2 highlighted with error

#### Scenario: Solapamiento excludes own entries

- GIVEN edit mode with entries having schedule IDs 42, 43, 44
- WHEN solapamiento check runs
- THEN those IDs are excluded from conflict detection (self-exclusion)

#### Scenario: Edit state resets on close

- GIVEN the edit modal with modified but unsaved entries
- WHEN the user closes via X or click outside
- THEN useEditScheduleStore is cleared (no stale data persists)

### R9: Group Summary Card Actions

The system MUST render GroupSummaryCard as a compact card with NO card-level onClick, NO PlusCircle/ChevronRight icons, badge showing "Horarios: N", and three action icons at bottom-right. Card trash action MUST open destructive confirmation and MUST execute persisted group deletion for valid IDs.

#### Scenario: Card renders without decoration icons

- GIVEN a group with schedules
- WHEN GroupSummaryCard renders
- THEN the card has no onClick handler, no PlusCircle icon, no ChevronRight icon

#### Scenario: Badge shows "Horarios: N"

- GIVEN a group with 4 schedules
- WHEN GroupSummaryCard renders
- THEN the badge shows "Horarios: 4"

#### Scenario: Three action icons rendered

- GIVEN a GroupSummaryCard
- WHEN the card renders
- THEN three icons appear at bottom-right: Plus (add), Pencil (edit), Trash2 (delete)

#### Scenario: Add opens create modal

- GIVEN a GroupSummaryCard
- WHEN the user clicks Plus
- THEN BulkAssignmentModal opens in create mode

#### Scenario: Edit opens edit modal

- GIVEN a GroupSummaryCard
- WHEN the user clicks Pencil
- THEN BulkAssignmentModal opens in edit mode with pre-filled entries for that group

#### Scenario: Delete all opens confirmation with preview

- GIVEN a GroupSummaryCard with N persisted horarios
- WHEN the user clicks Trash2
- THEN AlertDialog opens with destructive message for deleting N horarios
- AND a compact preview lists día, inicio, fin, ambiente

#### Scenario: Delete all validates IDs before request

- GIVEN group deletion where derived IDs are empty/invalid
- WHEN the user confirms deletion
- THEN the system MUST NOT call DELETE API
- AND MUST show an error toast

#### Scenario: Delete all success and refresh

- GIVEN group deletion with valid IDs
- WHEN the user confirms and backend returns success
- THEN the system shows success toast (server message when available)
- AND refreshes schedules via `fetchByDocenteId`

#### Scenario: Delete all stale IDs handling

- GIVEN group deletion where backend returns 404 for stale IDs
- WHEN the user confirms deletion
- THEN the system shows error toast (server message when available)
- AND refreshes schedules to reconcile stale state

#### Scenario: No card onClick

- GIVEN a GroupSummaryCard
- WHEN the user clicks anywhere on the card body (not on icons)
- THEN no action occurs

#### Scenario: Responsive at all breakpoints

- GIVEN GroupSummaryCards in a grid
- WHEN viewed at any breakpoint
- THEN cards remain responsive and the grid stacks below lg

#### Scenario: Skeleton state functional

- GIVEN loading state
- WHEN GroupSummaryCard skeleton renders
- THEN the skeleton is visually consistent and non-interactive

#### Scenario: Empty state functional

- GIVEN no groups
- WHEN the group list renders
- THEN an empty state is shown with no cards

### R10: Grid Click to Edit

The system MUST allow clicking a non-cluster ScheduleBlock to open the edit modal.

#### Scenario: Non-cluster block opens edit modal

- GIVEN a visible non-cluster ScheduleBlock
- WHEN the user clicks it
- THEN the edit modal opens

#### Scenario: All schedules pre-filled, not just clicked one

- GIVEN a group with 4 schedules and one is clicked
- WHEN the edit modal opens
- THEN ALL 4 schedules appear in the entries table

#### Scenario: Clicked entry is highlighted

- GIVEN a ScheduleBlock is clicked
- WHEN the edit modal opens
- THEN the clicked entry is visually highlighted in the entries table

#### Scenario: Collapsed cluster does NOT trigger edit

- GIVEN a collapsed cluster ScheduleBlock (showing "+N more")
- WHEN the user clicks on it
- THEN no edit modal opens (cluster expands instead)

#### Scenario: Expanded cluster DOES trigger edit

- GIVEN an expanded cluster showing individual schedules
- WHEN the user clicks a schedule inside it
- THEN the edit modal opens with all schedules for that group

### R11: Normalizer Extended Fields

NormalizedSchedule MUST expose `dbId: number | null`, `fechaInicioRaw: string | null`, and `fechaFinRaw: string | null` parsed from API date fields.

#### Scenario: dbId and fechas parsed correctly

- GIVEN a schedule with `id: 42` and date fields present
- WHEN the normalizer processes it
- THEN `dbId` = 42 and `fechaInicioRaw`/`fechaFinRaw` are parsed correctly

#### Scenario: Malformed date fields produce null

- GIVEN a schedule with malformed date fields
- WHEN the normalizer processes it
- THEN `fechaInicioRaw` = `null` and `fechaFinRaw` = `null`

#### Scenario: Null id produces null dbId

- GIVEN a schedule with `id: null`
- WHEN the normalizer processes it
- THEN `dbId` is `null` (not NaN, not 0)

### R12: Sidebar Layout

The system MUST use a 280px sidebar width on lg+ screens with the grid filling the remaining space.

#### Scenario: Sidebar width on lg+

- GIVEN the TeacherSchedulePage layout
- WHEN viewed on lg+ screens
- THEN the sidebar is 280px wide and the grid occupies `minmax(0, 1fr)`

#### Scenario: Sidebar stacks below lg

- GIVEN the layout
- WHEN viewed below lg breakpoint
- THEN the sidebar stacks vertically above the grid (unchanged from current behavior)
