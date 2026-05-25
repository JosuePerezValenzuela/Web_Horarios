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

The system MUST use apiClient for ALL HTTP calls in the assignment flow — zero raw fetch() calls.

#### Scenario: Assignment flow uses apiClient throughout

- GIVEN the bulk assignment flow
- WHEN ambiente search and batch submission are called
- THEN both use apiClient.post() — no raw fetch() exists in the module
