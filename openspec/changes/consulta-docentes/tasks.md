# Tasks: Consulta de Docentes + Auth Login

## Phase 1: Infrastructure / shadcn Components

- [x] 1.1 Install shadcn/ui components: `input`, `label`, `table`, `select`, `card`, `button`
- [x] 1.2 Create `features/auth/domain/types.ts` with LoginRequest, LoginResponse, User interfaces
- [x] 1.3 Create `features/scheduling/docentes/domain/types.ts` with Docente, DocentesFilters, PaginationState interfaces
- [x] 1.4 Create `shared/services/api/client.ts` with apiClient (get, post) using native fetch + Bearer token from authStore

## Phase 2: Authentication System

- [x] 2.1 Create `features/auth/application/authStore.ts` with Zustand + persist middleware (token, user, login/logout actions)
- [x] 2.2 Create `features/auth/application/useAuth.ts` convenience hook wrapping authStore
- [x] 2.3 Create `shared/services/api/auth.ts` with login API call using apiClient (ya integrado en client.ts)
- [x] 2.4 Create `features/auth/ui/LoginForm.tsx` with username/password inputs + submit handling
- [x] 2.5 Create `features/auth/ui/ProtectedRoute.tsx` wrapper component that checks token and redirects to /login
- [x] 2.6 Create `app/login/page.tsx` with LoginForm component
- [x] 2.7 Modify `app/layout.tsx` to include any necessary auth provider setup (no requiere - Zustand sin providers)
- [x] 2.8 Create `app/dashboard/page.tsx` as post-login home

## Phase 3: Docentes Feature

- [x] 3.1 Create `features/scheduling/docentes/application/api.ts` with fetchDocentes, fetchFacultades, fetchCarreras, fetchAsignaturas
- [x] 3.2 Create `features/scheduling/docentes/application/docentesStore.ts` with Zustand store (list, filters, pagination, sorting)
- [x] 3.3 Create `features/scheduling/docentes/application/useDocentes.ts` convenience hook
- [x] 3.4 Create `features/scheduling/docentes/ui/DocentesFilters.tsx` with Faculty, Career, Subject dropdowns + search input
- [x] 3.5 Create `features/scheduling/docentes/ui/DocentesTable.tsx` with Codigo, CI, Nombre, Acciones columns
- [x] 3.6 Create `features/scheduling/docentes/ui/DocentesPagination.tsx` with "1 de X paginas" format + manual input
- [x] 3.7 Create `app/docentes/page.tsx` protected page rendering DocentesFilters + DocentesTable
- [x] 3.8 Add "Registrar docente" button with permission check (CREAR_DOCENTE) to DocentesTable or DocentesFilters

## Phase 4: Testing / Verification

- [ ] 4.1 Verify login flow: valid credentials → token stored → redirect to dashboard
- [ ] 4.2 Verify login error: invalid credentials → error message displayed
- [ ] 4.3 Verify protected route: accessing /docentes without token → redirect to /login
- [ ] 4.4 Verify docentes table displays Codigo, CI, Nombre columns
- [ ] 4.5 Verify pagination shows "1 de X paginas" format
- [ ] 4.6 Verify filter dropdowns cascade (facultad → carrera → asignatura)
- [ ] 4.7 Verify search returns partial, case-insensitive matches
- [ ] 4.8 Verify "Registrar docente" button hidden for users without CREAR_DOCENTE permission

## Phase 5: Cleanup

- [ ] 5.1 Remove any temporary debug code
- [ ] 5.2 Verify no duplicate Codigo entries in table

(End of file - total 46 lines)