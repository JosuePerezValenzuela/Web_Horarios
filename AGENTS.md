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
    organisms/         # Headers, Sidebar, ScheduleCard
    templates/         # Page layouts
    ui/                # shadcn/ui base components
  features/
    scheduling/        # Feature-based modules
      domain/          # Types, interfaces, contracts
      application/    # Hooks, services
      ui/              # Feature-specific components
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

## Code Style
- **Indentation**: 2 spaces
- **Quotes**: Double quotes (`"`) or single quotes (`'`) allowed
- **Semicolons**: Yes
- **Line ending**: LF
- **Print width**: 100 characters

## Quality Tools
- **Linting**: ESLint + Prettier plugin
- **Type checking**: TypeScript strict
- **Formatting**: Prettier

## API
- **Base URL**: `NEXT_PUBLIC_API_URL` (env var, defaults to http://localhost:3000)
- **Protocol**: REST
- **Authentication**: JWT (future: KeyCloak SSO)

## Testing
- **Status**: Not configured yet
- **Recommendation**: Vitest + React Testing Library when needed
<!-- END:project-conventions -->