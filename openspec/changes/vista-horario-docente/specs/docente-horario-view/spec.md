# Docente Horario View Specification

## Purpose

Vista semanal de horarios docente read-only (sin mutaciones backend), con período editable en UI y consistencia visual por grupo.

## Requirements

### Requirement: Route and navigation
The system MUST expose `/docentes/{id}/horarios`, navigate from docentes list using `docente.id`, and MUST provide “Volver” to `/docentes`.

#### Scenario: Go to schedule page
- GIVEN a row with valid `docente.id`
- WHEN user triggers schedule action
- THEN app opens `/docentes/{id}/horarios`
- AND “Volver” goes to `/docentes`

### Requirement: Header
The system MUST render header title/context plus docente metadata, visible in mobile and desktop layouts.

#### Scenario: Header stays visible
- GIVEN the horario page loaded
- WHEN viewport changes
- THEN title and metadata remain readable

### Requirement: Sidebar and editable period
The system MUST render sidebar with period input (minutes) and group cards. The page MUST NOT create/update/delete backend data. Period input MUST be editable and SHALL re-render grid sloting.

#### Scenario: Edit period
- GIVEN schedules are loaded
- WHEN period changes
- THEN slots are recomputed and grid re-renders
- AND no mutation request is sent

### Requirement: Default period
The system MUST set default period to GCD of valid positive durations and SHALL fallback to `90` when none are valid.

#### Scenario: Compute GCD
- GIVEN durations `[60, 90, 120]`
- WHEN defaults initialize
- THEN period is `30`

#### Scenario: Fallback 90
- GIVEN durations null/0/negative/unparsable
- WHEN defaults initialize
- THEN period is `90`

### Requirement: Group cards
The system MUST render one card per group with Materia, Grupo, Carreras, cantidad de horarios, and estado. Same group SHALL keep stable color mapping.

#### Scenario: Card fields and color
- GIVEN grouped schedules
- WHEN cards render
- THEN each card shows required fields
- AND uses group-consistent color

### Requirement: Weekly grid Lunes-Sábado
The system MUST render day columns 1..6 mapped to Lunes..Sábado and use current period for row segmentation.

#### Scenario: Day mapping
- GIVEN schedules in days 1..6 and period `30`
- WHEN grid renders
- THEN blocks appear in correct day column and slot rows

### Requirement: Block fallbacks
The system MUST render schedule blocks with fallbacks: ambiente=`Sin ambiente`, tipo=`No especificado`, fechas=`Fechas no definidas` when values are missing.

#### Scenario: Null block fields
- GIVEN null ambiente/tipo/fechas
- WHEN block renders
- THEN fallback labels are shown

### Requirement: Empty state
The system MUST show empty-state and SHALL NOT render weekly grid when normalized horarios are empty.

#### Scenario: No horarios
- GIVEN API returns no horarios
- WHEN state resolves
- THEN empty-state appears and grid is hidden

### Requirement: Color rule scope
The system MUST apply same group same color in card + blocks. Selection/darken behavior MAY be added later and is out of scope now.

#### Scenario: Same group color parity
- GIVEN one group card and its blocks
- WHEN UI renders
- THEN all share the same base color

### Requirement: Non-functional UI constraints
The system MUST use only theme tokens, SHOULD be responsive (mobile-first), and SHOULD reuse existing shadcn/ui components.

#### Scenario: UI compliance
- GIVEN the implemented view
- WHEN styles/components are inspected
- THEN no non-theme colors are used
- AND existing shadcn/ui primitives are reused

## Acceptance Criteria
- Route + return flow works by `docente.id`.
- Header/sidebar/grid remain usable across breakpoints.
- GCD default + `90` fallback + editable period re-sloting work.
- Group card and block color parity is preserved.
- Empty-state hides grid when no horarios.

## Edge Cases
- Invalid durations (`0`, `<0`, null, NaN, malformed) are ignored for GCD.
- Malformed times that cannot yield valid duration are treated as invalid for period computation.
- Null fields always render declared fallback labels.
- Groups with `0` horarios MAY appear in summary but SHALL NOT create blocks.
