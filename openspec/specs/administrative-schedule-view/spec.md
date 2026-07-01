# Administrative Schedule View Specification

## Purpose

Schedulers need a way to view a teacher's administrative schedules (e.g., department meetings, office hours, coordinations) directly from the weekly schedule view to inspect active and past administrative duties in a structured modal.

## Requirements

### Requirement: Triggering the View

The system MUST provide a header button on the weekly schedule page that opens the administrative schedules modal. The button MUST be disabled if the active teacher's unique identifier (`codigo_persona`) is missing.

#### Scenario: Open modal with teacher context
- GIVEN the weekly schedule page is loaded for a teacher with a valid `codigo_persona`
- WHEN the user clicks the "Ver horarios administrativos" button in the header
- THEN the Administrative Schedules modal opens

#### Scenario: Button disabled without teacher context
- GIVEN the weekly schedule page is loaded but `codigo_persona` is missing or undefined
- WHEN the header renders
- THEN the button to view administrative schedules MUST be disabled

### Requirement: Data Reading

The modal MUST read the pre-loaded administrative schedules directly from the state of the store (`useDocenteHorariosStore`). The modal MUST NOT execute any new API request on open.

#### Scenario: Read schedules from store state on modal open
- GIVEN the weekly schedule page has pre-loaded administrative schedules for the teacher in `useDocenteHorariosStore`
- WHEN the modal is opened
- THEN the modal reads the administrative schedules list directly from the store state

### Requirement: Empty State Handling

The UI components MUST handle empty states gracefully when the teacher has no administrative schedules.

#### Scenario: Empty state feedback
- GIVEN the store state has an empty list of administrative schedules for the teacher
- WHEN the modal is rendered
- THEN the modal MUST display a friendly notice indicating that the teacher has no administrative schedules assigned

### Requirement: List Presentation and Sorting

The modal MUST display a list or table of administrative schedules. The schedules MUST be sorted according to their status and end date, with specific formatting for active schedules.

#### Scenario: Sorting and labeling schedules
- GIVEN the teacher has schedules: A (`fecha_fin` is null), B (`fecha_fin="2026-05-01"`), and C (`fecha_fin="2026-06-01"`)
- WHEN the list is rendered in the modal
- THEN the schedules are sorted as A first, then C, then B
- AND schedule A displays the label "Vigente sin límite"
