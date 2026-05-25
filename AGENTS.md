<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-conventions -->

# Project Conventions

## Dev Environment

- **Containerizado**: Docker Compose via Dev Containers
- **Nombre del proyecto (Engram)**: `web_horarios`
- **Container name**: `front_horarios-dev`
- **Package manager**: pnpm 11.1.3 (corepack, dentro del contenedor)
- **Puerto dev**: 8000

### Comandos que requieren proyecto

Ninguna tool del proyecto (pnpm, next, eslint, tsc, prettier) está instalada en el host.
TODO comando que dependa de `node_modules/` o de las tools del proyecto debe ejecutarse **dentro del contenedor**:

- **Via `docker exec`** (con el contenedor corriendo):
  ```bash
  docker exec front_horarios-dev sh -c "<command>"
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
  - Use `success` variant (`className="border-green-500/50 text-green-700 dark:text-green-400"`) for success feedback
  - Prefer **sonner toasts** (`toast.success`/`toast.error`) over inline Alerts for transient feedback — see `app/layout.tsx` for Toaster setup
- `button.tsx`
  - Uses **CVA** variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
  - Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
  - Supports `asChild`
  - Use for: primary/secondary actions, toolbar buttons, dialog actions, icon buttons
- `badge.tsx`
  - Small status/count surface
  - Use for: counters, statuses, small semantic labels, selected counts
- `card.tsx`
  - Provides `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`
  - Uses large rounded surfaces and internal spacing variants via `size`
  - Use for: grouped information, summary cards, clickable dashboard/list items
- `input.tsx`
  - Global text input with rounded-pill aesthetic and theme-based focus/invalid states
  - Use for: text, number, time and other native input types when a specialized component does not exist
- `label.tsx`
  - Use for form labeling before creating custom text wrappers
- `checkbox.tsx`
  - Base checkbox control
  - Use for: boolean selection inside custom lists, forms, and multi-selection UIs
- `dialog.tsx`
  - Global modal/dialog primitive wrappers
  - Use for: modal flows, confirmations, forms, and detail overlays that block the page
- `alert-dialog.tsx`
  - Destructive confirmation primitive (cancel/confirm pattern)
  - Use for irreversible actions (e.g., physical deletes) instead of generic `dialog`
  - Pair with `toast.success` / `toast.error` after server responses
- `popover.tsx`
  - Floating anchored surface wrapper
  - Use for: lightweight anchored overlays like pickers, dropdown helpers, and custom floating panels
- `calendar.tsx`
  - Global calendar/date selection UI
  - Use for: single-date or range selection when the interaction is calendar-based
- `date-picker-range.tsx`
  - Reusable date range picker built on `Calendar` + `Popover`
  - Use for: any date range selection flow across modules before building local alternatives
- `select.tsx`
  - **Base select only**
  - Provides `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`, `SelectValue`
  - Use this for **simple selection without search**
- `searchable-select-content.tsx`
  - Specialized dropdown content for searchable selects
  - Includes search input, search icon, autofocus on open, and blocks Radix typeahead while typing
  - Use this when a `Select` needs in-panel filtering but selection remains **single-select**
- `multi-select.tsx`
  - Searchable multi-selection dropdown with internal scroll, optional filter, selected-count badge, and **`selectAll`** prop
  - `selectAll={true}` shows a "Seleccionar todos" / "Quitar todos" toggle as first item in the dropdown
  - Use for: reusable **multi-select** cases (e.g. bloques, tipos, tags) where multiple values are required
- `table.tsx`
  - Provides `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`
  - Also includes `TableRowEven` and `TableRowOdd` helpers for alternating row backgrounds
  - Use for: structured tabular data; prefer internal scroll containers over changing table semantics

### `components/organisms/` — Existing layout-level components

- `AppLayout.tsx`
  - Protected layout shell using `TopHeader` + fixed `Sidebar`
  - Main content scrolls independently; sidebar collapse comes from `useUIStore`
- `Sidebar.tsx`
  - Existing navigation shell; reuse before inventing alternate side navigation patterns
- `TopHeader.tsx`
  - Existing top bar/breadcrumb surface for app pages

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
2. **Duplicating global components** - If it exists in `components/ui/`, don't recreate it
3. **Skipping verification** - Always run Prettier, lint, and TypeScript verification before finishing
4. **Fixed positioning for layout** - Use flexbox or grid for responsive layouts
5. **Forgetting responsive prefixes** - Mobile first, then enhance with `sm:`, `md:`, `lg:`

## Skill Registry

Sub-agents and workflows should reference `.atl/skill-registry.md` for available skills and project-specific patterns.

## Scheduling Module Notes (Docentes)

- `BulkAssignmentModal` now supports two modes:
  - `mode="create"` → creates horarios (POST flow)
  - `mode="edit"` → edits horarios (PATCH flow)
- `AmbienteSearchPopover` is store-agnostic via adapter contract (`AmbienteSearchContract`), used by both create/edit stores.
- In create/edit tables, ambiente selection should validate required fields first (rango/fecha source, día, hora inicio, hora fin) and provide explicit user feedback.
- For destructive actions in this module (delete one/all horarios), use `alert-dialog.tsx` + server-driven toast messages.
- `WeeklyScheduleGrid` uses adaptive timeline segment heights; avoid hardcoded floor heights that add dead space to the last row when real segment data exists.

## Testing

- **Status**: Not configured yet
- **Recommendation**: Vitest + React Testing Library when needed
<!-- END:project-conventions -->
