# Delta for bulk-schedule-assignment

## MODIFIED Requirements

### Requirement: R7: API Client Only

The system MUST use apiClient for ALL HTTP calls in the assignment flow — zero raw fetch() calls. The client MUST expose generic `patch<T>(url, body)` and `delete<T>(url, body?)` methods for PATCH/DELETE requests.
(Previously: API client requirement only mandated `patch<T>` and did not require `delete<T>` for persisted removals.)

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

### Requirement: R8: Edit Mode in BulkAssignmentModal

The system MUST support `mode: "create" | "edit"` in BulkAssignmentModal. Edit mode MUST pre-fill entries from existing schedules and submit via PATCH. Row deletion in edit mode MUST be persisted when `dbId` is valid, MUST require destructive confirmation, and MAY remove only local unsaved rows when `dbId` is absent.
(Previously: row removal in edit mode was local-only without destructive confirmation or persisted DELETE.)

#### Scenario: Edit modal shows correct title

- GIVEN BulkAssignmentModal opens with `mode="edit"`
- WHEN the modal renders
- THEN the title shows "Editar Horarios"
- AND the submit button shows "Guardar cambios"

#### Scenario: Entries pre-filled from existing schedules

- GIVEN a group with persisted schedules
- WHEN edit mode opens
- THEN the table shows entries pre-filled from those schedules

#### Scenario: User can add entries in edit mode

- GIVEN the edit modal with pre-filled entries
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

#### Scenario: Edit state resets on close

- GIVEN the edit modal with modified but unsaved entries
- WHEN the user closes via X or click outside
- THEN useEditScheduleStore is cleared (no stale data persists)

### Requirement: R9: Group Summary Card Actions

The system MUST render GroupSummaryCard as a compact card with NO card-level onClick, NO PlusCircle/ChevronRight icons, badge showing "Horarios: N", and three action icons at bottom-right. Card trash action MUST open destructive confirmation and MUST execute persisted group deletion for valid IDs.
(Previously: card trash showed `toast.info("Próximamente disponible")` and did not delete persisted horarios.)

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
- WHEN the user clicks the card body (not icons)
- THEN no action occurs
