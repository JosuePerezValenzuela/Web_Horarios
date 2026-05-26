# Tasks: Eliminar N horarios

## Review Workload Forecast

| Field                   | Value                       |
| ----------------------- | --------------------------- |
| Estimated changed lines | 260-360                     |
| 400-line budget risk    | Medium                      |
| Chained PRs recommended | No                          |
| Suggested split         | Single PR with 3 work units |
| Delivery strategy       | ask-on-risk                 |
| Chain strategy          | pending                     |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                                           | Likely PR | Notes                                     |
| ---- | ---------------------------------------------- | --------- | ----------------------------------------- |
| 1    | API delete contract + typed wrapper            | PR 1      | Base: main; includes client/types/service |
| 2    | Card-level delete all UX + orchestration       | PR 1      | Depends on Unit 1                         |
| 3    | Row-level delete one + guards + refresh/errors | PR 1      | Depends on Unit 1; verify 400/404 paths   |

## Phase 1: Infrastructure & Contracts

- [x] 1.1 Add `delete<T>(endpoint, body?, options?)` to `shared/services/api/client.ts`, reusing auth headers and response parsing patterns from `post/patch`.
- [x] 1.2 Add `EliminarHorariosBatchRequest` and `EliminarHorariosBatchResponse` in `features/scheduling/docentes/domain/types.ts` with fixed `{ ids: number[] }` contract.
- [x] 1.3 Add `horariosApi.eliminarBatch(payload)` in `features/scheduling/docentes/application/services/horariosApi.ts` calling `apiClient.delete('/horario-clases', payload)`.
- [x] 1.4 Verify R7 alignment: no raw `fetch()` in delete flow files (`client.ts`, `horariosApi.ts`, modal/page owners).

## Phase 2: Group Card Delete (N horarios)

- [x] 2.1 In `app/docentes/[id]/horarios/page.tsx`, add controlled `AlertDialog` state for pending group deletion and derive valid numeric `ids` from group schedules.
- [x] 2.2 Implement compact preview table in the dialog (día, inicio, fin, ambiente) and destructive copy with count `N`.
- [x] 2.3 Implement confirm handler: guard empty/invalid `ids` (error toast, no API), else call `horariosApi.eliminarBatch`, show server message fallback, and refresh via `fetchByDocenteId` on success.
- [x] 2.4 Handle 400/404: show `toast.error`; for 404 trigger refresh to reconcile stale IDs; keep destructive action blocked while request is in-flight.

## Phase 3: Edit Modal Row Delete (1 horario)

- [x] 3.1 In `features/scheduling/docentes/ui/BulkAssignmentModal.tsx`, add row-level controlled `AlertDialog` for persisted delete when `mode='edit'` and `dbId` is numeric.
- [x] 3.2 Keep unsaved-row behavior: if `dbId` is null/invalid, remove locally without DELETE API.
- [x] 3.3 Implement persisted confirm handler: call batch delete with `[dbId]`; on success remove row, toast success, call `onAssigned()` refresh.
- [x] 3.4 Implement error paths: 400/404 show backend/fallback toast; do not remove row on error; on 404 call `onAssigned()` for reconciliation.

## Phase 4: Verification & Quality Gates

- [ ] 4.1 Manual verify checklist (card delete): open confirm, preview data correctness, guard invalid IDs, success toast, refresh, and 404 reconciliation.
- [ ] 4.2 Manual verify checklist (row delete edit): persisted row confirm+DELETE, unsaved row local remove, error toast behavior for 400/404, refresh consistency.
- [x] 4.3 Run quality commands inside container for touched files/project: `docker exec front_horarios-dev sh -c "pnpm prettier --write <modified-files>"`, then `docker exec front_horarios-dev sh -c "pnpm lint"`, then `docker exec front_horarios-dev sh -c "pnpm tsc --noEmit"`.
