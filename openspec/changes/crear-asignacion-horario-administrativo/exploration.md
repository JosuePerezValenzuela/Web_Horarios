## Exploration: Crear Asignación de Horario Administrativo

### Current State
Actualmente, el sistema ofrece una visualización de solo lectura para los horarios administrativos de un docente. Estos horarios se muestran en la grilla semanal (`WeeklyScheduleGrid`) y se detallan en el modal `AdminSchedulesModal.tsx`.
La recuperación de los horarios administrativos existentes se realiza mediante el endpoint `GET /asignacion-horario?codigo_persona=...` a través de la función `fetchDocenteAdminHorarios` en `features/scheduling/docentes/application/api.ts`.
Sin embargo, no existe soporte en la interfaz para:
1. Consultar el catálogo general de turnos/horarios administrativos (`GET /horario-catalogo`).
2. Asignar un nuevo horario administrativo a un docente (`POST /asignacion-horario`).
3. Validar solapamientos (tanto de fechas como de horas) en el cliente antes de enviar la solicitud.

### Affected Areas
- **[shared/services/api/client.ts](file:///home/josue/dev/Web_Horarios/shared/services/api/client.ts)** — Añadir métodos `getHorarioCatalogo` y `crearAsignacionHorario` en el cliente unificado `horariosApi`.
- **[features/scheduling/docentes/application/api.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/api.ts)** — Crear wrappers `fetchHorarioCatalogo` y `crearAsignacionHorario` para consumir los endpoints desde el módulo de docentes.
- **[features/scheduling/docentes/domain/types.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/domain/types.ts)** — Definir los tipos de datos para el catálogo de horarios y para el payload/respuesta de creación de asignaciones.
- **[features/scheduling/docentes/ui/AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx)** — Integrar un formulario inline toggleable para seleccionar un horario del catálogo, elegir fechas de inicio/fin y enviar la asignación. Implementar en este modal la validación de solapamientos.
- **[features/scheduling/docentes/ui/TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx)** y **[app/docentes/[id]/horarios/page.tsx](file:///home/josue/dev/Web_Horarios/app/docentes/[id]/horarios/page.tsx)** — Asegurar que la recarga de datos (`onAssigned` o similar) refresque correctamente tanto horarios académicos como administrativos tras una asignación exitosa.

### Approaches
1. **Control de Estado en Store Zustand Dedicado**
   - Crear un nuevo store (ej. `useAdminScheduleFormStore.ts`) para manejar el catálogo de horarios administrativos, el estado del formulario, la validación de solapamientos y la llamada al POST.
   - **Pros**: Desacopla por completo la lógica del componente visual, permitiendo realizar pruebas unitarias del store de manera aislada. Sigue la arquitectura del proyecto para flujos complejos.
   - **Cons**: Incrementa el número de archivos y la complejidad para un formulario que solo vive dentro del modal.
   - **Effort**: Medium

2. **Control de Estado Local e Inline en el Modal**
   - Manejar el estado del formulario (horario seleccionado, fechas), la carga del catálogo y las validaciones de solapamiento directamente con React Hooks (`useState`, `useEffect`) dentro de `AdminSchedulesModal.tsx`.
   - **Pros**: Mantiene todo el comportamiento de la asignación agrupado dentro del modal. Es más ágil de implementar y consume menos tokens/archivos.
   - **Cons**: Aumenta el tamaño y responsabilidad de `AdminSchedulesModal.tsx`, mezclando renderizado de la tabla con lógica de validación de formulario.
   - **Effort**: Low/Medium

### Recommendation
Recomendamos el **Approach 2 (Control de Estado Local e Inline en el Modal)** con funciones de validación desacopladas en el mismo archivo para mantener el orden. El formulario es una tarjeta inline simple que se expande dentro del modal actual, por lo que un store global de Zustand no aporta valor real y sobrecarga el proyecto.
Se utilizará un callback `onAssigned` provisto por el componente padre para disparar un refresco de la grilla principal llamando a `fetchByDocenteId` del store global de horarios del docente tras un POST exitoso.

### Validation Logic (Overlap Checks)
La validación se realizará en el cliente frente a las asignaciones existentes en `rawAdminSchedules` (las cuales ocurren siempre de Lunes a Viernes).

1. **Date Overlap**:
   - `startNew` y `endNew` (nueva asignación) vs `startExisting` y `endExisting` (existente).
   - Fórmula: `(startNew <= (endExisting ?? Infinity)) && ((endNew ?? Infinity) >= startExisting)`.
   - Representación en string: `(startNew <= (endExisting ?? "9999-12-31")) && ((endNew ?? "9999-12-31") >= startExisting)`.

2. **Time Overlap**:
   - `startHourNew` y `endHourNew` vs `startHourExisting` y `endHourExisting`.
   - Ambas horas se convertirán a minutos desde la medianoche para una comparación numérica precisa.
   - Fórmula: `startHourNew < endHourExisting && startHourExisting < endHourNew` (los límites son abiertos, por lo que horas contiguas como `12:00` y `12:00` no solapan).

Si se cumple tanto el solapamiento de fechas como el de horas con cualquier asignación de `rawAdminSchedules`, se mostrará un mensaje de error inline y se deshabilitará el botón de confirmación ("Asignar").

### Risks
- **Conversión de Fechas y Timezones**: Al usar inputs de tipo `date`, el valor devuelto es `"YYYY-MM-DD"`. Comparar directamente strings evita problemas relacionados con la zona horaria del cliente.
- **Fechas Fin Nulas (`null`)**: Un horario administrativo puede ser indefinido (fecha fin nula). La lógica debe tratar el `null` como `"9999-12-31"` de forma consistente.
- **Refresco Visual**: Si tras un POST exitoso no se invoca correctamente `onAssigned`, la grilla semanal y la tabla interna mostrarán datos desactualizados. Es imperativo ejecutar el callback de éxito y limpiar el formulario.

### Ready for Proposal
Yes — La exploración está completa y el flujo técnico está totalmente mapeado. El proyecto está listo para proceder a la fase de propuesta (`sdd-propose`).
