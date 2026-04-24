# Proposal: Vista Horario Docente

## Intent

Entregar una vista de consulta (read-only) del horario semanal de un docente desde el listado de docentes, usando el contrato backend exacto de `/docentes/:id/horarios` provisto por el usuario, sin interacciones de asignación en esta fase.

## Scope

### In Scope
- Nueva ruta `app/docentes/[id]/horarios/page.tsx` accesible desde la acción del listado de docentes por `docente.id`.
- Layout responsive no modal: sidebar izquierda pequeña + grilla semanal derecha.
- Sidebar: input editable de período (`min`), default = GCD de duraciones de horarios válidos; fallback `90` si no hay horarios.
- Cards por grupo con mapeo de color amigable y consistente; cada card muestra Materia, Grupo, Carreras, cantidad de horarios y estado.
- Grilla semanal Lunes(1) a Sábado(6) poblada con backend data.
- Bloques de horario con fallbacks obligatorios para ambiente/tipo/fechas.
- Mismo grupo = mismo color en card y bloque de grilla.
- Si no hay horarios: ocultar grilla y mostrar empty state.
- Header con texto y estilo de metadata según requerimiento de usuario.
- Botón “Volver” navega directo a `/docentes` (no `router.back()`).

### Out of Scope
- Click de card para filtrar, resaltar o asignar.
- Cualquier flujo de edición/asignación de horarios.
- Modales o acciones de mutación sobre datos.

## Capabilities

### New Capabilities
- `docente-horario-view`: Visualización semanal read-only de horarios de un docente con sidebar de período y resumen por grupos.

### Modified Capabilities
- None.

## Approach

Implementar en módulo `features/scheduling/docentes` con adapter de contrato backend → modelo de vista normalizado, cálculo de período por GCD, agrupación por grupo y renderer de grilla semanal usando componentes base shadcn/ui y tokens de tema existentes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/docentes/page.tsx` | Modified | Mantener origen de navegación hacia detalle horario. |
| `features/scheduling/docentes/ui/DocentesTable.tsx` | Modified | Enlazar acción a `/docentes/{id}/horarios`. |
| `app/docentes/[id]/horarios/page.tsx` | New | Página de visualización read-only. |
| `features/scheduling/docentes/domain/*` | New/Modified | Tipos contrato exacto + view models de horarios/grupos. |
| `features/scheduling/docentes/application/*` | New/Modified | Fetch `/docentes/:id/horarios`, normalización, estado UI. |
| `features/scheduling/docentes/ui/*` | New | Sidebar, cards por grupo, grilla semanal y empty state. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Campos opcionales/nulos en backend | Med | Normalizador con fallbacks explícitos en bloque. |
| Legibilidad de colores con tokens limitados | Med | Paleta derivada de tokens (`primary/secondary/accent/muted`) y contraste validado. |
| Errores en cálculo GCD con duraciones inválidas | Low | Filtrar duraciones no positivas y fallback fijo a 90. |

## Rollback Plan

Revertir cambios en ruta nueva y wiring de tabla (`app/docentes/[id]/horarios`, `DocentesTable`), dejando intacto el listado actual sin navegación adicional.

## Dependencies

- Contrato backend exacto de `/docentes/:id/horarios` (autoritativo del usuario).
- `docente.id` siempre presente para routing.

## Success Criteria

- [ ] Desde listado de docentes se accede a la vista por id y se puede volver a `/docentes`.
- [ ] Sidebar muestra período editable con default GCD/fallback 90 y cards por grupo completas.
- [ ] Grilla Lunes-Sábado renderiza bloques con fallbacks requeridos y color consistente por grupo.
- [ ] Sin horarios, se muestra empty state y no se renderiza grilla.
