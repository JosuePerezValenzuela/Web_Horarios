## Exploration: Vista de horario docente con ruta `/docentes/[id]/horarios`

### Current State
La app ya tiene listado de docentes en `app/docentes/page.tsx` con una acción visual (ícono `CalendarClock`) en `DocentesTable`, pero hoy no navega a ningún detalle ni consume horarios por docente. El stack usa App Router (Next 16), `ProtectedRoute` cliente y `AppLayout` para shell protegida. No existe todavía un módulo de dominio para horarios, ni tipos/normalización para `/docentes/:id/horarios`.

### Affected Areas
- `features/scheduling/docentes/ui/DocentesTable.tsx` — conectar acción de fila a ruta explícita por docente id (no modal).
- `app/docentes/` — mantener listado como punto de entrada y origen del botón “volver”.
- `app/docentes/[id]/horarios/page.tsx` (nuevo) — nueva página protegida de horario docente.
- `features/scheduling/docentes/domain/` (nuevo archivo de tipos) — contrato tipado de respuesta backend + view model normalizado.
- `features/scheduling/docentes/application/api.ts` — agregar fetch `getDocenteHorariosById(id)` hacia `/docentes/:id/horarios`.
- `features/scheduling/docentes/application/` (nuevo store/hook) — estado de carga/error, período editable, selección de grupo, y datos listos para grid.
- `features/scheduling/docentes/ui/` (nuevos componentes locales) — cards por grupo + grid semanal + estado vacío.
- `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/button.tsx` — reutilización de primitives existentes para cumplir diseño.

### Approaches
1. **Página cliente con store dedicado + normalizador explícito** — crear página y componentes clientes que consumen un store de horarios docente.
   - Pros: Encaja con patrón actual (Zustand + feature module), simple de evolucionar para redraw al click de cards, desacopla backend shape de UI mediante adapter.
   - Cons: Más archivos iniciales; cuidado con sincronización entre período y render del grid.
   - Effort: Medium

2. **Página cliente mínima con estado local en un solo componente** — fetch directo en `page.tsx` y lógica embebida para cards/grid.
   - Pros: Menos archivos al inicio, entrega rápida.
   - Cons: Acopla fetch + transformación + UI, complica mantenimiento y evolución (filtros/actualización futura), rompe modularidad hexagonal del proyecto.
   - Effort: Low/Medium

### Recommendation
Recomiendo **Approach 1 (store + normalizador + componentes locales)**. La razón es FUTURO: la vista ya requiere selección por grupo, efecto visual sincronizado, y capacidad de redibujar grilla cuando cambien horarios; eso pide separación clara entre contrato backend, estado derivado y presentación.

**Data mapping design (propuesto):**
- `DocenteHorariosApiResponse` (raw): respuesta directa de `/docentes/:id/horarios` (sin asumir naming final).
- `NormalizedSchedule`: `{ id, day(1..6), startMin, endMin, durationMin, materia, grupo, carreras[], ambienteNombre, ambienteTipo, fechaInicio, fechaFin }`.
- `GroupSummary`: `{ groupKey, materia, grupo, carrerasLabel, countHorarios, estado, colorToken }`.
- Pipeline: `raw -> normalizeSchedules(raw) -> groupByGroupKey() -> computeGridRows(periodoMin)`.
- Default de `periodoMin`: `gcd(all durationMin > 0)`, fallback `90` cuando no hay horarios válidos.

**UI composition plan (propuesto):**
- `app/docentes/[id]/horarios/page.tsx`: contenedor protegido + header (`Horario` + metadata docente) + botón volver fijo a `/docentes`.
- `TeacherSchedulePage` (feature UI root): layout responsive `flex-col lg:flex-row`.
- Sidebar izquierda (`lg:w-80` aprox): `Input` editable de período + lista de `Card` por grupo con estado y contador.
- Main derecha: `WeeklyScheduleGrid` (Lunes..Sábado) renderizado solo si hay horarios.
- Empty state global: si no hay horarios, mostrar mensaje y ocultar grid.
- Estado de selección: card activa oscurece variante; bloques del mismo `groupKey` reutilizan mismo color token (`primary/secondary/accent/muted`).

### Risks
- **Contrato backend no confirmado**: faltan nombres/formatos exactos de campos para ambiente, tipo de ambiente, fechas y relación grupo-carrera.
- **Colores por grupo con tokens limitados**: hay que mapear grupos a variantes basadas en `primary/secondary/accent/muted` (sin colores custom), evitando baja legibilidad en modo oscuro.
- **Cálculo de período por GCD**: si duraciones vienen en formato irregular (strings, cruces de hora, null), puede fallar sin una normalización robusta.
- **Navegación por id**: en lista actual `Docente.id` es opcional; si backend no lo envía en algún caso, no se debe romper el CTA.
- **Open questions bloqueantes para especificación fina**:
  - Shape exacto del endpoint `/docentes/:id/horarios` (keys y anidación).
  - Formato horario (HH:mm, ISO, timestamps) y timezone esperada.
  - Qué define “mismo grupo” para color estable (id de grupo, materia+grupo, u otro identificador).
  - Si el click en card filtra horarios o solo resalta (hoy se recomienda filtrar + redraw).

### Ready for Proposal
Yes — listo para `/sdd-propose` con foco en: (1) contrato de datos + normalización, (2) composición UI sidebar/cards/grid responsive, (3) navegación fija de retorno a `/docentes`, (4) reglas de estado vacío y fallbacks de bloque.
