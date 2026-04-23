# Docente List Specification

## Purpose

Display paginated list of docentes with filters and search for managing schedule assignments.

## Requirements

### Requirement: Docentes Table Display

The system MUST display a table with Codigo, CI, Nombre, and Acciones columns.

- GIVEN user navigates to `/docentes` with valid token
- WHEN page loads
- THEN table displays with columns: Codigo, CI, Nombre, Acciones

### Requirement: Pagination

The system MUST show "1 de X paginas" format with manual page input.

- GIVEN docente list loads with more than 10 records
- WHEN pagination renders
- THEN displays "1 de X paginas" text and manual input field

### Requirement: Pagination Navigation

The system MUST allow manual page input and navigation buttons.

- GIVEN user is on page 1 of X
- WHEN user enters page number Y (1 ≤ Y ≤ X) and presses Enter
- THEN table displays page Y
- AND user enters invalid value (Y < 1 or Y > X)
- THEN display current page without change

### Requirement: Faculty Filter

The system MUST filter docentes by selected facultad.

- GIVEN user selects a facultad from dropdown
- WHEN selection changes
- THEN table refreshes with only docentes from that facultad

### Requirement: Career Filter

The system MUST filter docentes by selected carrera (cascading from facultad).

- GIVEN user selects a carrera from dropdown
- WHEN selection changes
- THEN table refreshes with only docentes from that carrera

### Requirement: Subject Filter

The system MUST filter docente by selected asignatura (cascading from carrera).

- GIVEN user selects an asignatura from dropdown
- WHEN selection changes
- THEN table refreshes with only docentes from that asignatura

### Requirement: Search

The system MUST search across CI, Codigo, and Nombre fields (partial, case-insensitive).

- GIVEN user enters search text
- WHEN user presses Enter or clicks search
- THEN table displays matching records

### Requirement: Default Sorting

The system MUST sort by Nombre ASC by default.

- GIVEN docente list loads
- WHEN initial render
- THEN records ordered alphabetically by Nombre

### Requirement: Register Button Visibility

The system MUST show "Registrar docente" button only for authorized users.

- GIVEN user has "registrar_docente" permission
- WHEN page renders
- THEN "Registrar docente" button is visible

### Requirement: No Duplicate Rows

The system MUST not display duplicate records.

- GIVEN API returns data
- WHEN table renders
- AND no duplicate Codigo entries appear

## Acceptance Criteria

| Scenario | Criterion |
|----------|-----------|
| Table display | Shows Codigo, CI, Nombre, Acciones columns |
| Pagination format | Shows "1 de X paginas" with input |
| Faculty filter | Updates list on selection change |
| Career filter | Cascades from facultad |
| Subject filter | Cascades from carrera |
| Search | Partial, case-insensitive match |
| Default sort | Alphabetical by Nombre |
| Register button | Hidden for unauthorized users |
| No duplicates | Each Codigo appears once |