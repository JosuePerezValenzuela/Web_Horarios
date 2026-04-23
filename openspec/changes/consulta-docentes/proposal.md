# Proposal: Consulta de Docentes

## Intent

Allow authorized users to view a paginated list of docentes (teachers) with filters to quickly identify and manage who to assign to their schedule.

## Scope

### In Scope
- Paginated table displaying docentes (Codigo, CI, Nombre, Acciones)
- Three dropdown filters: Facultad, Carrera, Asignatura
- Search input for CI, Codigo, or Nombre (partial, case-insensitive)
- Default sorting by Nombre ASC
- Pagination with "1 de X paginas" format and manual page input
- "Registrar docente" button (permission-gated)

### Out of Scope
- Adding/Editing/Deleting docentes (future feature)
- Scheduling assignment (future feature)
- Export/Print functionality
- Bulk actions

## Capabilities

### New Capabilities
- `docente-list`: Display paginated list of docentes with filters and search
- `docente-filters`: Faculty/Career/Subject dropdowns with cascading data
- `docente-search`: Text search across CI, Codigo, and Nombre fields

### Modified Capabilities
- None (new module)

## Approach

1. **Create Zustand store**: `docentesStore` with filters, pagination, sorting, and search state
2. **Build API layer**: HTTP client with Bearer token auth for `/docentes`, `/facultad/all`, `/carrera/all`, `/asignatura/all`
3. **Create UI components**:
   - `DocentesTable` (organism) - paginated table with columns
   - `DocentesFilters` (molecule) - dropdowns + search input
   - `DocentesPagination` (molecule) - page indicator + manual input
4. **Integrate authentication**: Check permissions for "Registrar docente" button visibility and protected API routes

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `features/scheduling/docentes/domain/` | New | Types, interfaces, API contracts |
| `features/scheduling/docentes/application/` | New | Zustand store, hooks |
| `features/scheduling/docentes/ui/` | New | Feature-specific components |
| `shared/services/api/` | New | HTTP client with auth header |
| `components/organisms/DocentesTable.tsx` | New | Main table component |
| `components/organisms/DocentesFilters.tsx` | New | Filter dropdowns + search |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| API response latency on filter changes | Medium | Debounce filter API calls, show loading states |
| Cascading dropdowns dependency | Medium | Load carrera on facultad change, load asignatura on carrera change |
| Duplicate records in list | Low | Backend handles deduplication; add client-side check if needed |
| Auth token expiration | Medium | Implement token refresh or prompt re-login |

## Rollback Plan

- Delete `features/scheduling/docentes/` directory and its components
- Remove `useDocentesStore` from Zustand store index
- Remove API routes from HTTP client service

## Dependencies

- Authentication system (login endpoint returns access_token)
- Existing `/docentes`, `/facultad/all`, `/carrera/all`, `/asignatura/all` endpoints

## Success Criteria

- [ ] Table displaysCodigo, CI, Nombre, Acciones columns
- [ ] Pagination shows "1 de X paginas" format with manual input
- [ ] All three filters work with cascading data
- [ ] Search returns partial matches (case-insensitive)
- [ ] "Registrar docente" button hidden for unauthorized users
- [ ] No duplicate rows in table