# Notevoro V2 — Unified Spaces (living spec)

## What the app is
A unified personal knowledge, productivity and AI workspace. There is ONE application
under `/dashboard`. Student / Educator / Professional are **Space templates**
(configuration), never separate apps.

## Architecture
- **Frontend** (`/app/frontend`) — Vite + React 19 + TS strict, Tailwind v4, shadcn/base-ui.
  - `src/lib/idb.ts` — the only module that knows IndexedDB exists (storage primitive).
  - `src/lib/repo.ts` — repository layer. Every read/write scoped by `userId` and, where
    relevant, `spaceId`. Swapping in a Postgres/BYODB adapter means replacing these two
    files, not the UI.
  - `src/lib/auth.ts` — auth provider abstraction. Reports `supabase` when
    `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` exist; otherwise a local IndexedDB
    identity provider keeps the app usable. Session id in `localStorage`.
  - `src/lib/templates.ts` — `SPACE_TEMPLATES`: data-driven templates (modules, metrics,
    Voro suggestions). Adding a template = appending a record; this is what makes future
    AI-generated Spaces possible.
  - `src/lib/workspace.tsx` — user + spaces + activeSpace + theme context.
  - `src/components/` — GlobalSidebar, VoroPanel, AppShell, TopBar, CreateSpaceDialog, Primitives.
  - `src/pages/` — Auth, MyDay, Knowledge, Tasks, CalendarPage, VoroPage, Spaces,
    SpaceDetail, Settings, Inbox.
- **Backend** (`/app/backend`) — FastAPI. Only responsibility right now is the AI layer,
  so provider credentials never reach the browser.
  - `routers/voro.py` → `GET /api/voro/provider`, `POST /api/voro/chat`
    (any OpenAI-compatible endpoint via `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`).
  - Returns `503` with an actionable `detail` when no provider is configured.

## Shared engines (one implementation each)
`Tasks`, `Knowledge`, `CalendarPage` are single components that take an optional
`spaceId` + `embedded` prop. `SpaceDetail` renders them inside a Space's module tabs.
There is no per-template engine anywhere.

## Data model (IndexedDB stores)
`users`, `spaces`, `tasks`, `events`, `knowledge`, `conversations`, `messages`, `settings`.
All ids are `uuid4` strings. Space-owned records carry `spaceId` (nullable = "No Space").

## Key flows
1. Signup → `/dashboard/spaces` welcome → Create Space (name + template) → Space opens.
2. Space switch from the sidebar → updates route, header, search scope, module tabs,
   metrics and Voro context. No page reload.
3. Tasks / Events / Knowledge CRUD, persisted locally, surfaced in My Day.
4. My Day is the ONE deliberately global context (aggregates all Spaces).
5. Voro panel (right, 300px): conversations scoped per Space, rename/delete/switch,
   context label + template-specific suggestions.
6. Knowledge item → Voro actions (Summarize / Explain / Flashcards / Quiz / Extract tasks).
7. Settings: theme (light designed, not inverted), AI provider status, JSON export.

## Data isolation
Verified: a task created in University does not appear in Startup. A Space id not owned by
the signed-in user resolves to not-found (redirect to `/dashboard/spaces`).

## Not built yet (declared, not faked)
- Inbox messaging / invitations / Space members — Phase 4. The page states this plainly.
- Non-core template modules (Courses, Flashcards, Quizzes, Grading, Projects, Team,
  Analytics…) render an explicit "use Knowledge/Tasks with this folder" placeholder.
- Supabase Auth is wired as an abstraction, not yet connected (no credentials supplied).
- Calendar has month + agenda views; day/week and recurring events are later.
