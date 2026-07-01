# Administrative Schedule Assignment Specification

## Purpose

Manage the creation and assignment of administrative schedules for teachers.

## Requirements

### Requirement: Catalog Fetching

The system MUST retrieve available administrative schedules from the catalog.

#### Scenario: Fetch catalog on render
- GIVEN the user opens the assignment form
- WHEN the form renders
- THEN the system MUST perform a GET request to `/horario-catalogo?page=1&pageSize=100` to retrieve the catalog list

### Requirement: Assignment Form

The system MUST provide an inline expandable form in the modal to assign a schedule. It MUST require selecting a catalog schedule and a start date. The end date MUST be optional.

#### Scenario: Display and validate fields in assignment form
- GIVEN the administrative schedules modal is open
- WHEN the inline form is expanded
- THEN the system MUST display input fields for schedule selection (catalog), start date, and end date
- AND the catalog schedule selection and start date MUST be marked as required
- AND the end date input MUST be marked as optional

### Requirement: Overlap Validation

The system MUST validate the selected schedule against active administrative schedules (`rawAdminSchedules`) for date and time overlaps.

An overlap exists if:
- Date overlap: `(startNew <= (endExisting ?? '9999-12-31')) && ((endNew ?? '9999-12-31') >= startExisting)`
- Time overlap: `startHourNew < endHourExisting && startHourExisting < endHourNew` (boundaries are open, so contiguity like 12:00 to 12:00 does not conflict).

If there's an overlap, the system MUST show an inline error message and MUST disable the submit button.

#### Scenario: Overlapping dates and times disable submit
- GIVEN a teacher has an active administrative schedule from `2026-06-01` to `2026-06-30` at `08:00 - 10:00`
- WHEN the user inputs a new assignment for `2026-06-15` to `2026-06-20` at `09:00 - 11:00`
- THEN the system MUST display an inline error message indicating an overlap
- AND the submit button MUST be disabled

#### Scenario: Contiguous times do not conflict
- GIVEN a teacher has an active administrative schedule at `08:00 - 10:00`
- WHEN the user inputs a new assignment for the same day at `10:00 - 12:00`
- THEN the system MUST NOT flag an overlap
- AND the submit button MUST remain enabled

### Requirement: Refresh

On successful creation, the system MUST perform a POST to `/asignacion-horario` and invoke the callback `onAssigned` to reload all schedules.

#### Scenario: Successful submission triggers reload
- GIVEN the assignment form contains valid data with no overlaps
- WHEN the user clicks the submit button
- THEN the system MUST perform a POST request to `/asignacion-horario` with the assignment payload
- AND on response status 200/201, the system MUST invoke the `onAssigned` callback to refresh the weekly grid and modal lists
