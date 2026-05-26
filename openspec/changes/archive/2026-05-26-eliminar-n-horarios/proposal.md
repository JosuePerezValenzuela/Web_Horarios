# Proposal: Eliminar N horarios

## Intent

Implementar eliminación real de horarios persistidos desde dos puntos UX ya existentes (papelera de card y papelera por fila en edición), manteniendo el contrato backend `DELETE /horario-clases` con body `{ ids: number[] }` y feedback de servidor en toasts.

## Scope

### In Scope
- Confirmación destructiva con `AlertDialog` para borrar **todos** los horarios de un grupo desde `GroupSummaryCard`.
- Confirmación destructiva con `AlertDialog` para borrar **un** horario desde fila del `BulkAssignmentModal` en `mode="edit"`.
- Vista previa compacta (día, inicio, fin, ambiente) en confirmación de borrado por card.
- Soporte API: `apiClient.delete<T>()` y `horariosApi.eliminarBatch({ ids })`.
- Toasts `success/error` usando mensaje de servidor cuando exista.

### Out of Scope
- Cambios de contrato backend, endpoint o semántica transaccional.
- Soft delete, undo, papelera o recuperación.
- Refactor amplio de stores/arquitectura fuera del flujo de borrado.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `bulk-schedule-assignment`: reemplazar delete no-op/local-only por delete persistido con confirmación en card y fila de edición.

## Approach (by flow)

### 1) Card delete (grupo completo)
- En `app/docentes/[id]/horarios/page.tsx`, al click en trash abrir `AlertDialog` con mensaje: “Esta acción eliminará los N horarios de este grupo”.
- Renderizar preview table compacta con columnas: día, inicio, fin, ambiente.
- Derivar `ids` desde schedules del grupo (`dbId` numérico válido).
- Si `ids` vacío: bloquear acción y mostrar error toast.
- Confirmar → `horariosApi.eliminarBatch({ ids })` → mostrar toast de servidor y refrescar con `fetchByDocenteId`.

### 2) Row delete (horario individual en edit modal)
- En `BulkAssignmentModal` (`mode="edit"`), trash de fila:
  - con `dbId`: `AlertDialog` con mensaje “Esta acción eliminará este horario de este grupo”. Confirmar delete batch con `[dbId]`, remover fila local y refrescar (`onAssigned`).
  - sin `dbId`: mantener comportamiento actual de remoción local (no API).

## Affected Files

| Area | Impact | Description |
|---|---|---|
| `shared/services/api/client.ts` | Modified | Agregar helper `delete<T>(url, body?)`. |
| `features/scheduling/docentes/domain/types.ts` | Modified | Tipos de payload/respuesta para delete batch. |
| `features/scheduling/docentes/application/services/horariosApi.ts` *(o archivo equivalente)* | Modified | `eliminarBatch({ ids })`. |
| `app/docentes/[id]/horarios/page.tsx` | Modified | Orquestación delete por card + refresh. |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | Modified | Delete por fila persistida + confirmación. |
| `components/ui/alert-dialog.tsx` | Reused | Primitive de confirmación destructiva. |

## Validation & Error Strategy
- Validar `ids.length > 0` y numerales válidos antes de llamar API.
- Mantener UI sin optimismo destructivo hasta success.
- Mapear errores de red/servidor a `toast.error`; preferir `message` backend cuando exista.
- Ante stale IDs/error parcial, forzar refresh para reconciliar estado.

## Rollback Plan
- Revertir cambios de handlers UI a comportamiento previo (toast “Próximamente disponible” en card y `removeEntry` local en fila).
- Mantener `apiClient.delete` sin uso o revertir helper y wrapper `eliminarBatch` en el mismo commit de rollback.

## Risks
- IDs nulos/obsoletos generan fallos de delete.
- Derivación incorrecta de grupo puede borrar subconjunto erróneo.
- Desincronización modal vs grilla si falla refresh post-delete.

## Success Criteria
- [ ] Card trash elimina N horarios persistidos del grupo tras confirmación y refresca grilla.
- [ ] Row trash en edit elimina 1 horario persistido tras confirmación; fila desaparece y estado queda consistente.
- [ ] Toasts reflejan éxito/error con mensaje backend cuando existe.
- [ ] No se modifica contrato `DELETE /horario-clases { ids: number[] }`.
