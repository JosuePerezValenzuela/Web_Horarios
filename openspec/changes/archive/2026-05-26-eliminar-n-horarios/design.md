# Design: Eliminar N horarios

## Technical Approach

Se implementa borrado persistido en dos flujos existentes sin cambiar contrato backend: `DELETE /horario-clases` con body `{ ids: number[] }`. La página de horarios (`app/docentes/[id]/horarios/page.tsx`) orquesta borrado por card (grupo completo), y `BulkAssignmentModal` en `mode="edit"` orquesta borrado por fila persistida. Ambos usan `AlertDialog` controlado por estado local del owner del flujo, toasts con mensaje backend, y refresh vía `fetchByDocenteId`/`onAssigned` para reconciliar UI.

## Architecture Decisions

| Decisión | Opciones | Tradeoff | Elección |
|---|---|---|---|
| Ownership de delete por flujo | Centralizar en store compartido vs owner por superficie UX | Centralizar reduce duplicación pero aumenta refactor y acoplamiento | Owner por superficie: page (card delete) + modal (row delete) |
| Estado de confirmación destructiva | `AlertDialogTrigger` inline vs controlado (`open/onOpenChange`) | Trigger inline es simple, pero difícil con datos dinámicos (preview/row activa) | Estado controlado para seleccionar grupo/fila antes de confirmar |
| Fuente de verdad post-delete | Optimistic remove only vs remove + refresh | Solo local puede dejar drift ante 404/concurrencia | Confirmar API y luego refresh siempre |
| API access | Llamar `request("DELETE")` ad hoc vs helper explícito | Ad hoc dispersa patrón | `apiClient.delete<T>()` + `horariosApi.eliminarBatch` |

## Data Flow

### Flujo 1: borrar todos los horarios de un grupo (card)

1. Usuario click papelera en `GroupSummaryCard`.
2. `page.tsx` recibe `group`, deriva `groupSchedules = schedules.filter(s.groupKey===group.groupKey)`.
3. Extrae `ids = groupSchedules.map(s.dbId).filter(Number.isInteger)`.
4. Abre `AlertDialog` con preview compacta (día/inicio/fin/ambiente).
5. Confirmar → `horariosApi.eliminarBatch({ ids })`.
6. `toast.success/error` con `response.message` o fallback.
7. Siempre `fetchByDocenteId(docenteId)` tras success; en 404 también refresh para reconciliar.

```text
User -> GroupSummaryCard -> page.tsx(state: pendingGroupDelete)
page.tsx -> AlertDialog(confirm)
AlertDialog -> horariosApi.eliminarBatch(ids)
horariosApi -> apiClient.delete('/horario-clases', {ids})
API -> page.tsx -> toast -> fetchByDocenteId
```

### Flujo 2: borrar un horario desde fila en edición

1. Usuario click papelera fila en `BulkAssignmentModal` (`mode="edit"`).
2. Si `entry.dbId === null` → mantener `removeEntry(entry.id)` local (sin API).
3. Si `entry.dbId` numérico → abrir `AlertDialog` para esa fila.
4. Confirmar → `horariosApi.eliminarBatch({ ids: [dbId] })`.
5. Success: `removeEntry(entry.id)` + `toast.success` + `onAssigned()` refresh.
6. Error: `toast.error`; no remover fila; para 404 disparar `onAssigned()` para reconciliar.

```text
User -> BulkAssignmentModal(row trash)
if dbId null: removeEntry(local)
if dbId number: AlertDialog -> horariosApi.eliminarBatch([dbId])
API -> modal -> toast -> removeEntry(success only) -> onAssigned(refresh)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `shared/services/api/client.ts` | Modify | Agregar `delete<T>(endpoint, body?, options?)` en `ApiClient` y wrapper `horariosApi.eliminarBatch`. |
| `features/scheduling/docentes/domain/types.ts` | Modify | Añadir `EliminarHorariosBatchRequest/Response` tipados para contrato fijo `{ ids:number[] }`. |
| `app/docentes/[id]/horarios/page.tsx` | Modify | Estado/control `AlertDialog` para delete por card, derivación de IDs, preview, llamada API, toasts, refresh. |
| `features/scheduling/docentes/ui/BulkAssignmentModal.tsx` | Modify | Estado/control `AlertDialog` por fila en edit, bifurcación persisted vs unsaved, delete API y secuencia de refresh. |
| `features/scheduling/docentes/ui/TeacherSchedulePage.tsx` | Optional modify | Solo si hace falta prop adicional para delete contextual; mantener mínima superficie si no es necesario. |

## Interfaces / Contracts

```ts
export interface EliminarHorariosBatchRequest { ids: number[] }
export interface EliminarHorariosBatchResponse {
  success: boolean
  message?: string
  data?: unknown
}

apiClient.delete<T>(endpoint: string, body?: unknown): Promise<T>
horariosApi.eliminarBatch(payload: EliminarHorariosBatchRequest)
  : Promise<EliminarHorariosBatchResponse>
```

## Error Handling Matrix (400/404)

| Contexto | 400 | 404 |
|---|---|---|
| Card delete (N) | Mostrar `toast.error(message)`; no mutar UI local; no cerrar confirm automáticamente | Mostrar `toast.error(message)` y ejecutar refresh para reconciliar IDs obsoletos |
| Row delete (1) | Mostrar error; mantener fila | Mostrar error; mantener fila y ejecutar `onAssigned()` para sincronizar |

Validaciones previas UI:
- `ids.length > 0` obligatorio antes de API.
- Excluir `dbId` nulos/no numéricos en extracción.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Extracción de IDs por grupo/fila; guardas `dbId` null | Funciones puras/helpers con casos mixtos persisted/no-persisted |
| Integration (manual) | Confirm dialogs + secuencia API/toast/refresh | Prueba manual en flujo card y row con respuestas 200/400/404 |
| E2E | N/A | No framework configurado actualmente |

## Migration / Rollout

No migration required.

## Open Questions

- [ ] Confirmar payload exacto de error backend en 404 para fallback de mensaje (si no viene `message`, usar texto genérico).
