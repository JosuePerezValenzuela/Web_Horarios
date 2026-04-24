<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-conventions -->

# Project Conventions

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
    scheduling/        # Feature-based modules
      domain/          # Types, interfaces, contracts
      application/    # Hooks, services, stores
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

## Design System Rules

### 1. Responsive First
- Design for mobile-first, enhance for larger screens
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Test layouts at breakpoints: 640px, 768px, 1024px, 1280px

### 2. Color System (MUST USE)
- **ALL colors MUST come from `app/globals.css` theme variables**
- NEVER use custom colors like `surface-container-*`, `stone-*`, `zinc-*`, etc.
- NEVER use `outline-variant` (it doesn't exist in theme)

**Valid theme colors:**
```css
--background      /* Page background */
--foreground     /* Text color */
--primary        /* Primary actions */
--secondary      /* Secondary elements */
--muted          /* Subtle backgrounds */
--accent         /* Accent highlights */
--border         /* Borders and dividers */
--destructive   /* Error/danger actions */
--card          /* Card backgrounds */
--popover       /* Dropdown backgrounds */
--ring          /* Focus rings */
```

**Usage examples:**
- ✅ `bg-background`, `text-foreground`, `border-border`
- ✅ `bg-primary`, `hover:bg-muted`, `bg-card`
- ❌ `bg-surface-container-low`, `bg-stone-50`, `border-outline-variant`

### 3. Component Hierarchy
- **`components/ui/`** = shadcn/ui base components (GLOBAL, reusable everywhere)
- **`features/*/ui/`** = Feature-specific components (LOCAL, single feature)
- **Rule**: If it's reusable across features, move to `components/ui/`

### 4. Global vs Local
| Location | Scope | Examples |
|---------|-------|---------|
| `components/ui/` | Global | Table, Select, Button, Input, Card |
| `features/*/ui/` | Local only | DocentesTable, DocentesFilters |

## Code Style

- **Indentation**: 2 spaces
- **Quotes**: Double quotes (`"`) or single quotes (`'`) allowed
- **Semicolons**: No (Prettier config)
- **Line ending**: LF
- **Print width**: 100 characters

## Quality Tools

- **Linting**: ESLint + Prettier plugin
- **Type checking**: TypeScript strict
- **Formatting**: Prettier

## Formatting Workflow (IMPORTANT)

When writing code, agents should follow this workflow:

1. **Write the files** - Implement the code normally
2. **DO NOT run format after each file** - This causes unnecessary file changes
3. **At the end of each implementation session**, run:
   ```bash
   npm run lint -- --fix
   ```
4. **Verify with**: `npm run lint` - Ensure 0 errors (warnings are ok)

Why? Because when an agent writes a file directly to the filesystem (bypassing VS Code). Running lint --fix at the end ensures consistent formatting across all modified files.

## Common Mistakes to Avoid

1. **Using non-theme colors** - Creates inconsistency and breaks dark mode
2. **Duplicating global components** - If it exists in `components/ui/`, don't recreate it
3. **Skipping lint** - Always verify with `npm run lint` before finishing
4. **Fixed positioning for layout** - Use flexbox or grid for responsive layouts
5. **Forgetting responsive prefixes** - Mobile first, then enhance with `sm:`, `md:`, `lg:`

## Skill Registry

Sub-agents and workflows should reference `.atl/skill-registry.md` for available skills and project-specific patterns.

## API

- **Base URL**: `NEXT_PUBLIC_API_URL` (env var, defaults to http://localhost:3000)
- **Protocol**: REST
- **Authentication**: JWT (future: KeyCloak SSO)

## Testing

- **Status**: Not configured yet
- **Recommendation**: Vitest + React Testing Library when needed
<!-- END:project-conventions -->
