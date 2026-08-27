<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-conventions -->

# Project Conventions

## Dev Environment

- **Containerizado**: Docker Compose via Dev Containers
- **Nombre del proyecto (Engram)**: `web_horarios`
- **Container name**: `web_horarios`
- **Package manager**: pnpm 11.1.3 (corepack, dentro del contenedor)
- **Puerto dev**: 8000

### Comandos que requieren proyecto

Ninguna tool del proyecto (pnpm, next, eslint, tsc, prettier) está instalada en el host.
TODO comando que dependa de `node_modules/` o de las tools del proyecto debe ejecutarse **dentro del contenedor**:

- **Via `docker exec`** (con el contenedor corriendo):
  ```bash
  docker exec web_horarios sh -c "<command>"
  ```

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **UI Components**: shadcn/ui + TailwindCSS 4 + Radix UI
- **Icons**: Lucide React

## Architecture

- **Pattern**: Atomic Design + Hexagonal Modular
- **Structure**:
  ```
  app/                    # Next.js App Router (routes)
  components/
    atoms/              # Button, Input, Label, Icon
    molecules/         # Form fields, Cards
    organisms/         # Headers, Sidebar, Layouts
    templates/         # Page layouts
    ui/                # shadcn/ui base components (GLOBAL)
  features/
    scheduling/        # Feature-based modules (This is the example, it could be more or new modules)
      domain/          # Types, interfaces, contracts
      application/     # Hooks, services, stores
      ui/              # Feature-specific components (LOCAL)
  shared/
    hooks/             # Custom hooks
    services/         # API/HTTP services
    styles/           # Global styles
    validators/       # Zod schemas, validations
    config/           # Constants, env vars
  core/
    providers/         # Global providers
  lib/                 # Utils (cn, etc.)
  ```

## Current Component Inventory (IMPORTANT)

This is the CURRENT state of the codebase. Prefer these components/patterns before creating new ones.

### `components/ui/` — Global base components

- `alert.tsx`
  - Installed via shadcn; variants: `default`, `destructive`, **`success`**
  - Use `success` variant for success feedback.
  - Prefer **toast notifications** (`toast.success`/`toast.error` de la librería base `@umss/estilos-base`) over inline Alerts for transient feedback.
- `button.tsx`
  - Local button component containing customization styles y Radix layout sizes (`icon-xs`, `xs`, `icon-lg`).
  - Prefer the official `<Button />` from `@umss/estilos-base/components` for general views unless specific layout sizes are required.
- `input.tsx`
  - Local input wrapper used by custom search dropdown inputs.
  - Prefer the official `<Input />` from `@umss/estilos-base/components` for standard form views.
- `label.tsx`
  - Local label control wrapper.
- `dialog.tsx`
  - Global modal/dialog primitive wrappers for custom overlays.
- `popover.tsx`
  - Floating anchored surface wrapper.
- `calendar.tsx`
  - Global calendar/date selection UI.
- `select.tsx`
  - **Base select only**
  - Provides `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`, `SelectValue`.
  - Use this for **simple selection without search** y to compose custom dropdown behaviors.
- `searchable-select-content.tsx`
  - Specialized dropdown content for searchable selects.
  - Includes search input, search icon, autofocus on open, and blocks Radix typeahead while typing.
  - Supports `maxVisibleItems` property (defaults to `3`) to dynamically and mathematically compute and enforce `maxHeight` so dropdown viewport doesn't overflow vertically.
  - Use this when a `Select` needs in-panel filtering but selection remains **single-select**.
- `multi-select.tsx`
  - Searchable multi-selection dropdown with internal scroll, optional filter, selected-count badge, and **`selectAll`** prop.
  - `selectAll={true}` shows a "Seleccionar todos" / "Quitar todos" toggle as first item in the dropdown.
  - Long content options are truncated with an ellipsis and use native `title` tooltips to reveal the full content on hover without breaking the dropdown structure.
  - Use for: reusable **multi-select** cases (e.g. bloques, tipos, tags) where multiple values are required.
- `table.tsx`
  - Provides `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.
  - Also includes `TableRowEven` and `TableRowOdd` helpers for alternating row backgrounds.
- `time-picker.tsx`
  - Hybrid 12-hour format time picker (segmented keyboard inputs + scrollable column picker popover).
  - Handles local 12h UX interaction (AM/PM selection) while outputting and managing standard 24h (`HH:mm`) format for integration with the scheduling stores.

### `components/organisms/` — Existing layout-level components

- `AppLayout.tsx`
  - Protected layout shell using the navigation menus y theme layouts.
  - Main content scrolls independently; sidebar collapse comes from `useUIStore`.

### Atomic folders status

- `components/atoms/` is currently **empty**
- `components/molecules/` is currently **empty**
- `components/templates/` is currently **empty**

Do not document or generate fictional atoms/molecules/templates as if they already exist. If you create them later, update this file.

## Design System Rules

### 1. Responsive First

- Design for mobile-first, enhance for larger screens
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Test layouts at breakpoints: 640px, 768px, 1024px, 1280px

### 2. Color System (MUST USE)

- **ALL colors MUST come from `app/globals.css` theme variables**
- NEVER use custom colors like `surface-container-*`, `stone-*`, `zinc-*`, etc.
- NEVER use `outline-variant` (it doesn't exist in theme)

**Usage examples:**

- ✅ `bg-background`, `text-foreground`, `border-border`
- ✅ `bg-primary`, `hover:bg-muted`, `bg-card`
- ❌ `bg-surface-container-low`, `bg-stone-50`, `border-outline-variant`

### 3. Component Hierarchy

- **`components/ui/`** = shadcn/ui base components (GLOBAL, reusable everywhere)
- **`features/*/ui/`** = Feature-specific components (LOCAL, single feature)
- **Rule**: If it's reusable across features, move to `components/ui/`

### 4. Before Creating New Components

- Before creating a new component, **always verify first** if there is already a suitable base in `components/ui/` or if it can be built by composing existing shadcn/ui primitives already configured in this project or install using npx.
- Prefer **extending or composing** the current shadcn/ui setup instead of creating parallel custom primitives.
- Only create a brand-new component when the existing global base components do not cover the interaction or visual requirement.

### 5. API Service Boundaries

- Before consuming or creating a new API service, verify if the request belongs to one of the existing global clients in `shared/services/api/`.
- Current global API clients:
  - `shared/services/api/client.ts` → main application API (`NEXT_PUBLIC_API_URL`)
  - `shared/services/api/infraClient.ts` → infrastructure/physical resources API (`NEXT_PUBLIC_INFRA_URL`)
- Reuse these clients instead of creating ad-hoc fetch wrappers inside features whenever possible.

### 6. Unified UMSS Design System (CRITICAL)

- Toda implementación de vistas, pantallas o componentes visuales debe seguir estrictamente las reglas tipográficas, de paleta de colores, atmósfera y utilidades definidas en la guía de estilos [design-system-umss.md](file:///home/josue/dev/Web_Horarios/design-system-umss.md) (referenciado como design-style.md en la raíz).
- Priorizar el uso de las clases de utilidad provistas en dicho archivo (como `umss-btn-primary`, `umss-title-h1`, `umss-input`, etc.) para asegurar una experiencia institucional coherente y uniforme.

## Formatting Workflow (IMPORTANT)

When writing code, agents should follow this workflow:

1. **Write the files** - Implement the code normally
2. **DO NOT run format after each file** - This causes unnecessary file changes
3. **At the end of each implementation session**, format with Prettier first
   ```bash
   pnpm prettier --write <modified-files>
   ```
4. **Then run the linter** on the affected files / project
   ```bash
   pnpm lint
   ```
5. **Then run TypeScript check** focused on modified files when feasible; otherwise run project-level typecheck
   ```bash
   pnpm tsc --noEmit
   ```

## Common Mistakes to Avoid

1. **Using non-theme colors** - Creates inconsistency and breaks dark mode
2. **Duplicating global components** - If it exists in `components/ui/` or `@umss/estilos-base`, don't recreate it
3. **Skipping verification** - Always run Prettier, lint, and TypeScript verification before finishing
4. **Fixed positioning for layout** - Use flexbox or grid for responsive layouts
5. **Forgetting responsive prefixes** - Mobile first, then enhance with `sm:`, `md:`, `lg:`
6. **Manual Toast Error Handling** - Do NOT catch API errors in views to show generic error toasts. Let the central network interceptor inside the HTTP clients handle notifying the user of server/network exceptions.

## Skill Registry

Sub-agents and workflows should reference `.atl/skill-registry.md` for available skills and project-specific patterns.

## Scheduling Module Notes (Docentes & Global)

- `BulkAssignmentModal` now supports two modes:
  - `mode="create"` → creates horarios (POST flow)
  - `mode="edit"` → edits horarios (PATCH flow)
- `AmbienteSearchPopover` is store-agnostic via adapter contract (`AmbienteSearchContract`), used by both create/edit stores.
- In create/edit tables, ambiente selection should validate required fields first (rango/fecha source, día, hora inicio, hora fin) and provide explicit user feedback.
- For destructive actions in this module (delete one/all horarios), use `@umss/estilos-base` `AlertDialog` + server-driven toast messages.
- `WeeklyScheduleGrid` uses adaptive timeline segment heights; avoid hardcoded floor heights that add dead space to the last row when real segment data exists.

### Zustand Stores & Vista Global

- **Stores de Catálogos Modulares** (`shared/stores/catalogos/`):
  - `useFacultadesStore`: Obtiene y cachea facultades (`/facultad/all`).
  - `useCarrerasStore`: Obtiene y cachea carreras/planes (`/carrera/all`).
  - `useAsignaturasStore`: Obtiene y cachea asignaturas (`/asignatura/all`).
  - `useDocentesSearchStore`: Búsqueda debounced interactiva de docentes (`/docentes?search=...`).
- **Store de Horarios Globales** (`features/scheduling/docentes/application/useHorariosListStore.ts`):
  - Maneja la consulta `GET /horario-clases` con filtros complejos (`facultad_codigo`, `plan_estudio_codigo`, `asignatura_codigo`, `grupo`, `persona_documento`, `aula_id`, etc.).
  - Valida reglas de negocio en frontend (el filtro de grupo requiere código de asignatura, rangos de fechas/horas válidos) antes de llamar a la API.
  - Paginación establecida por defecto a `1000` registros para evitar scrollbar global en la ventana de navegación, delegando la visualización única en la grilla semanal (`WeeklyScheduleGrid`) con scroll interno.

## Testing

- **Testing Engine**: Configured inside the docker container to avoid global dependency issues.
- **Unit & Integration Tests**: Powered by **Vitest** + **React Testing Library** + **jsdom** + **@testing-library/jest-dom**.
  - Files should follow the `*.test.tsx` or `*.spec.ts` naming convention.
  - Run tests:
    ```bash
    docker exec web_horarios sh -c "pnpm vitest run"
    ```
- **End-to-End (E2E) Testing**: Powered by **Playwright**.
  - Confirms system integrations, routing, login portals, and database updates.
  - Run Playwright:
    ```bash
    docker exec web_horarios sh -c "pnpm playwright test"
    ```
- **UI/UX Visual Testing**: Covered by Playwright's native visual comparison snapshots (e.g., `expect(page).toHaveScreenshot()`).
- **Resilience & Security Testing**:
  - Run simulated network failures (offline mock service workers) and slow connection latency configurations inside tests to verify client graceful-degradation (e.g., infinite loaders, error alerts).
  - Secure input validators (Zod schemas) under `shared/validators/` should have unit testing coverage verifying SQL Injection, XSS, and boundary inputs.
- **Performance & Performance Audits**:
  - Covered by Lighthouse / Web Vitals metrics checking, specifically monitoring chunk sizes and heavy layout re-renders on the weekly grid container.
  <!-- END:project-conventions -->
