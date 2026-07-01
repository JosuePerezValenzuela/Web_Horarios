# Delta for administrative-schedule-view

## MODIFIED Requirements

### Requirement: List Presentation and Sorting

The modal MUST display a list or table of administrative schedules with the title "Horario Administrativo". The description context of the modal MUST display the teacher's name, CI, and SIS code without bold formatting. The table MUST split dates into "Inicio" and "Fin" columns formatted as "DD-MM-YYYY". The schedules MUST be sorted according to their status and end date. If a schedule has a null end date, the "Fin" column MUST be labeled "Sin límite" and the state badge text MUST be "Vigente".

(Previously: The modal MUST display a list or table of administrative schedules. The schedules MUST be sorted according to their status and end date, with specific formatting for active schedules.)

#### Scenario: Sorting and labeling schedules
- GIVEN the teacher has schedules: A (`fecha_fin` is null), B (`fecha_fin="2026-05-01"`), and C (`fecha_fin="2026-06-01"`)
- WHEN the list is rendered in the modal
- THEN the schedules are sorted as A first, then C, then B
- AND schedule A displays the label "Sin límite" in the "Fin" column
- AND the state badge for schedule A displays the text "Vigente"
- AND the "Inicio" and "Fin" columns display dates formatted as "DD-MM-YYYY"
- AND the teacher's name, CI, and SIS code are rendered in the description context without bold formatting
- AND the table title is "Horario Administrativo"
