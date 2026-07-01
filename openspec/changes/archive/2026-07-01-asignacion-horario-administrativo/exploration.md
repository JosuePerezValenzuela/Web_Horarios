## Exploration: Asignación de Horario Administrativo

### Current State
El sistema actualmente cuenta con soporte para consumir y visualizar horarios administrativos de docentes dentro de la grilla semanal (`WeeklyScheduleGrid`), la cual ya recibe y renderiza los horarios pasados como `adminSchedules`. La recuperación de estos horarios se realiza a través de `useDocenteHorariosStore` llamando a `fetchDocenteAdminHorarios` que consulta `GET /asignacion-horario?codigo_persona=...`.

Sin embargo, en la interfaz actual no existe un mecanismo para administrar estas asignaciones (creación, edición, consulta de histórico o cierre de períodos). No existen los componentes visuales ni stores para gestionar este flujo, ni las firmas correspondientes para interactuar con los endpoints de creación (`POST /asignacion-horario`), cierre de período (`PATCH /asignacion-horario` o `PATCH /asignacion-horario/:id`), ni para recuperar el catálogo disponible (`GET /horario-catalogo`).

### Affected Areas
- [shared/services/api/client.ts](file:///home/josue/dev/Web_Horarios/shared/services/api/client.ts) — Extender `apiClient` o crear métodos para interactuar con `POST /asignacion-horario`, `PATCH /asignacion-horario` (o con el ID), y `GET /horario-catalogo` (con soporte para parámetros de paginación `page` y `pageSize`).
- [features/scheduling/docentes/application/api.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/api.ts) — Agregar las funciones de fetch correspondientes para consumir los nuevos endpoints administrativos.
- [features/scheduling/docentes/domain/types.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/domain/types.ts) — Definir los tipos y contratos de petición/respuesta para `POST /asignacion-horario`, `PATCH /asignacion-horario` y `GET /horario-catalogo`.
- [features/scheduling/docentes/application/useAdminSchedulesStore.ts](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/application/useAdminSchedulesStore.ts) (Nuevo) — Crear un store de Zustand para manejar el estado del modal (apertura/cierre, carga del catálogo, carga de asignaciones activas, estados de envío `submitting` y errores).
- [features/scheduling/docentes/ui/AdminSchedulesModal.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/AdminSchedulesModal.tsx) (Nuevo) — Componente Modal interactivo utilizando la primitiva `Dialog` de shadcn/ui. Debe listar los horarios administrativos del docente, permitir cerrar el período de uno activo (añadir `fecha_fin` vía `PATCH`), y asignar un nuevo horario del catálogo (mediante selección en catálogo paginado y especificando `fecha_inicio` vía `POST`). No requiere implementar eliminación (`DELETE`).
- [features/scheduling/docentes/ui/TeacherSchedulePage.tsx](file:///home/josue/dev/Web_Horarios/features/scheduling/docentes/ui/TeacherSchedulePage.tsx) — Añadir un botón en la cabecera (header) de la vista de horarios para abrir el modal `AdminSchedulesModal`.
- [app/docentes/[id]/horarios/page.tsx](file:///home/josue/dev/Web_Horarios/app/docentes/[id]/horarios/page.tsx) — Integrar el nuevo modal `AdminSchedulesModal` y asegurar que la llamada de actualización (`onAssigned` o similar) refresque los datos generales del docente (recargando tanto horarios académicos como administrativos en la grilla principal).

### Approaches
1. **Store de Zustand Dedicado (`useAdminSchedulesStore`) + Modal Dialog Reutilizable**
   - Crear un store de Zustand separado exclusivamente para administrar la UI y lógica de asignaciones de horarios administrativos. El modal se abre y obtiene de manera asíncrona la lista del catálogo de horarios (`GET /horario-catalogo?page=1&pageSize=100`) y las asignaciones vigentes.
   - **Pros**: Mantiene el principio de responsabilidad única. No sobrecarga el store principal `useDocenteHorariosStore`. Sigue el patrón establecido en el proyecto con otros componentes de programación (como `useBulkAsignacionStore.ts`). Facilita las pruebas y el manejo de estados de envío (`submitting`) y errores.
   - **Cons**: Requiere la creación de un nuevo archivo de store.
   - **Effort**: Medium

2. **Estado Local (`useState`) dentro de `AdminSchedulesModal` + Llamadas directas a API**
   - Manejar todo el estado (lista del catálogo de turnos, estado de envío, inputs de formulario) usando React hooks locales dentro del componente visual `AdminSchedulesModal`.
   - **Pros**: Evita la creación de un archivo de store Zustand.
   - **Cons**: Mezcla lógica de negocio y presentación en la UI. Dificulta compartir el estado o disparar recargas limpias desde fuera del modal. Puede hacer que el componente modal crezca en tamaño y sea más difícil de mantener.
   - **Effort**: Low/Medium

### Recommendation
Recomiendo el **Approach 1 (Store de Zustand Dedicado + Modal Dialog)**. El proyecto ya utiliza stores dedicados para separar la lógica de negocio y flujo en otros diálogos de horarios (`useBulkAsignacionStore.ts` y `useEditScheduleStore.ts`). Además, al completar una acción exitosa (como asignar un nuevo turno administrativo o cerrar uno vigente), es crucial invocar una recarga del store principal `useDocenteHorariosStore` para refrescar visualmente la grilla semanal (`WeeklyScheduleGrid`). Esto se logra de manera mucho más limpia desacoplando la lógica en un store. Usaremos `Dialog` en lugar de `Sheet` dado que `@/components/ui/dialog.tsx` ya está instalado en el proyecto.

### Risks
- **Formato de Fechas**: La API espera formatos de fechas en cadena de texto `"YYYY-MM-DD"`. Es necesario asegurar la conversión correcta de los DatePickers antes de enviarlos en los payloads de `POST` y `PATCH`.
- **Cierre de Horario Activo (`PATCH`)**: Se debe clarificar la forma en que se cierra un período de horario. Esto usualmente requiere especificar una `fecha_fin` válida (que debe ser posterior o igual a la `fecha_inicio`). Se debe validar esto en el cliente para evitar errores del backend.
- **Refresco de Grilla**: Si la grilla no se recarga inmediatamente tras la asignación/cierre exitoso, el usuario verá información desactualizada. Debemos invocar `fetchByDocenteId` del store principal en el callback de éxito.
- **Validación del Docente**: Es importante asegurar que el docente seleccionado cuente con un código de persona válido antes de permitir abrir el modal. Si `docente.codigo` es inválido o no existe, el botón de administración debe deshabilitarse y mostrar una advertencia.

### Ready for Proposal
Yes — Listo para avanzar a la fase `sdd-propose` para definir el diseño de los contratos API, el esquema detallado del payload de `POST` y `PATCH` para `/asignacion-horario`, y el flujo detallado de refresco en la UI.
