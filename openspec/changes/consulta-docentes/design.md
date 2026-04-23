# Design: Consulta de Docentes + Auth Login

## Technical Approach

Implement basic JWT authentication with a paginated docentes list. Auth uses Zustand for state + localStorage for persistence. Docentes feature follows atomic design with Zustand stores for state management. HTTP client injects Bearer token on every request.

## Architecture Decisions

### Decision: Auth Store Architecture

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Context API | Verbose, requires provider nesting | ❌ |
| Zustand | Lightweight, persistence built-in, SSR-safe with hydration | ✅ |
| Redux | Overkill for this scope | ❌ |

**Choice**: Zustand with `persist` middleware using localStorage
**Rationale**: Matches project conventions (Zustand already installed), simple API, SSR-safe hydration prevents flash of unauthenticated state

### Decision: Route Protection Pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Next.js Middleware | Runs at edge, can't access Zustand | ❌ |
| Client-side HOC wrapper | Simple, works with Zustand store | ✅ |
| AuthProvider pattern | More boilerplate | ❌ |

**Choice**: `ProtectedRoute` client component wrapper that reads Zustand store
**Rationale**: Direct integration with auth store, no edge runtime complexity

### Decision: HTTP Client Implementation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Axios | Extra dependency, interceptors | ❌ |
| Native fetch with wrapper | Zero dependency, modern | ✅ |

**Choice**: Custom `apiClient` using native fetch with auth header injection
**Rationale**: No extra bundle weight, `Authorization` header added from Zustand store at request time

## Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│ Login Page  │─────▶│  authStore   │─────▶│ localStorage
└─────────────┘      └──────┬───────┘      └────────────┘
                            │
                            ▼
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│ Docentes    │─────▶│docentesStore │─────▶│  API fetch │
│  Page       │      └──────────────│      └────────────┘
└─────────────┘             ▲         │
        │                  │         ▼
        ▼            ┌─────┴───────┐
┌─────────────┐      │  HTTP Client│◀──────Zustand token
│ DocentesTable│◀────│(auth header)│
│ DocentesFilters│   └────────────┘
│DocentesPagination
└─────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/login/page.tsx` | Create | Login form with username/password |
| `app/docentes/page.tsx` | Create | Protected docentes page |
| `app/dashboard/page.tsx` | Create | Post-login home redirect |
| `app/layout.tsx` | Modify | Add auth store provider |
| `features/auth/domain/types.ts` | Create | Auth types (LoginResponse, User) |
| `features/auth/application/authStore.ts` | Create | Zustand store with persist |
| `features/auth/application/useAuth.ts` | Create | Convenience hook for components |
| `features/auth/ui/LoginForm.tsx` | Create | Login form component |
| `features/auth/ui/ProtectedRoute.tsx` | Create | Route guard wrapper |
| `shared/services/api/client.ts` | Create | HTTP client with auth header |
| `shared/services/api/auth.ts` | Create | /auth/login API call |
| `shared/hooks/useAuthGuard.ts` | Create | Hook for redirect logic |
| `features/scheduling/docentes/domain/types.ts` | Create | Docente, filters, pagination types |
| `features/scheduling/docentes/application/docentesStore.ts` | Create | Zustand store |
| `features/scheduling/docentes/application/useDocentes.ts` | Create | Convenience hook |
| `features/scheduling/docentes/application/api.ts` | Create | All docentes API calls |
| `features/scheduling/docentes/ui/DocentesTable.tsx` | Create | Table organism |
| `features/scheduling/docentes/ui/DocentesFilters.tsx` | Create | Filters molecule |
| `features/scheduling/docentes/ui/DocentesPagination.tsx` | Create | Pagination molecule |
| `components/ui/input.tsx` | Create | shadcn Input |
| `components/ui/label.tsx` | Create | shadcn Label |
| `components/ui/table.tsx` | Create | shadcn Table components |
| `components/ui/select.tsx` | Create | shadcn Select |
| `components/ui/card.tsx` | Create | shadcn Card |
| `components/ui/badge.tsx` | Create | shadcn Badge |

## Interfaces / Contracts

```typescript
// features/auth/domain/types.ts
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  access_token?: string;
  message?: string;
}

interface User {
  id: string;
  username: string;
  permissions: string[];
}

// features/scheduling/docentes/domain/types.ts
interface Docente {
  codigo: string;
  ci: string;
  nombre: string;
}

interface DocentesFilters {
  facultadId?: string;
  carreraId?: string;
  asignaturaId?: string;
  search?: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
}

// shared/services/api/client.ts
const apiClient = {
  get: <T>(url: string): Promise<T> => fetchWithAuth('GET', url),
  post: <T>(url: string, body: unknown): Promise<T> => fetchWithAuth('POST', url, body),
};
```

## Component Architecture

```
app/
├── login/page.tsx              # Public - shows LoginForm
├── dashboard/page.tsx          # Protected - home after login
├── docentes/page.tsx           # Protected - renders DocentesFilters + DocentesTable
└── layout.tsx                  # Wraps with AuthProvider

features/
├── auth/
│   ├── application/
│   │   └── authStore.ts        # Zustand store (token, user, login/logout)
│   └── ui/
│       └── LoginForm.tsx       # Form with validation
└── scheduling/docentes/
    ├── application/
    │   ├── docentesStore.ts     # Zustand store (list, filters, pagination)
    │   └── api.ts               # API calls (fetchDocentes, fetchFacultades, etc.)
    └── ui/
        ├── DocentesTable.tsx    # Table with columns
        ├── DocentesFilters.tsx  # Select dropdowns + search
        └── DocentesPagination.tsx # "1 de X" indicator
```

## Route Protection Flow

```
User visits /docentes
        │
        ▼
ProtectedRoute checks authStore.token
        │
   ┌────┴────┐
   │         │
token?    no token
   │         │
   ▼         ▼
render    redirect to /login
page      + store current path
              │
              ▼
         Login succeeds
              │
              ▼
         redirect to stored path
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | authStore actions | Direct store testing |
| Unit | docentesStore selectors | Direct store testing |
| Unit | API functions | Mock fetch |
| Integration | Login flow | Mock API, test UI |
| Integration | Docentes list | Mock API, test pagination |

## Migration / Rollback

No migration required — new feature only.

Rollback:
1. Delete `features/auth/` and `features/scheduling/docentes/`
2. Remove shadcn components from `components/ui/`
3. Remove `app/login/`, `app/docentes/`, `app/dashboard/`
4. Remove from `app/layout.tsx` any auth provider

## Open Questions

- [ ] Should token refresh be implemented now or deferred to future?
- [ ] What are the exact permission strings returned by the API for "registrar_docente"?
- [x] Permission string for viewing docentes: VER_DOCENTES
- [ ] Default page size for pagination (10 or configurable)?