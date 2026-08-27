# Notevoro V2 — Unified Spaces (living spec)

## What the app is
A unified personal knowledge, productivity and AI workspace. ONE application under
`/dashboard`. Student / Educator / Professional are **Space templates** (configuration),
never separate apps.

## Storage split (deliberate)
- **Local-first (IndexedDB)** — personal workspace data: tasks, calendar events,
  Knowledge items, Voro AI chats. `src/lib/idb.ts` (primitive) → `src/lib/repo.ts`
  (repository). Scoped by `userId` + `spaceId`.
- **Server (FastAPI + MongoDB)** — only genuinely shared things: accounts/sessions,
  Spaces, membership + roles, invitations, conversations, messages, mentions, activity.
  Other people must be able to see these, so they cannot live in one browser.
- Supabase Auth drops into `src/lib/auth.ts` when `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` are set; nothing else changes.

## Backend endpoints (all on api_router under /api)
- `POST /auth/signup|login|logout`, `GET /auth/me`, `POST /auth/recover`, `GET /auth/directory`
  — httpOnly cookie session (`nv_session`), PBKDF2-SHA256 passwords.
- `GET|POST /spaces`, `DELETE /spaces/{id}`, `GET /spaces/{id}/members`,
  `PATCH|DELETE /spaces/{id}/members/{userId}`
- `POST|GET /spaces/{id}/invitations`, `GET /invitations`,
  `POST /invitations/{id}/accept|decline`, `POST /invitations/redeem`
- `GET|POST /conversations`, `GET|POST /conversations/{id}/messages`,
  `POST /conversations/{id}/read`, `GET /mentions`, `GET /activity`, `GET /inbox/counts`
- `GET /voro/provider`, `POST /voro/chat` (any OpenAI-compatible endpoint via
  `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`; 503 with actionable detail when unset)

## Roles
`owner` > `editor` > `viewer`. Owner: full control (roles, remove, delete Space).
Editor: can invite, message, work. Viewer: read-only, cannot invite.
Enforced server-side; a Space you are not a member of returns **404**, so URL tampering
reveals nothing.

## Shared engines (one implementation each)
`Tasks`, `Knowledge`, `CalendarPage` are single components taking optional
`spaceId` + `embedded`. `SpaceDetail` embeds them as module tabs. `SpaceTeam` serves both
the "Team" (Professional/Student/Blank) and "Students" (Educator) modules.

## Key flows
1. Signup → `/dashboard/spaces` welcome → Create Space (name + template).
2. Space switch from the sidebar → route, header, search scope, module tabs, metrics and
   Voro context all update. No reload.
3. Tasks / Events / Knowledge CRUD (local), aggregated by My Day (the one global context).
4. Invite: Team module → by email (lands in invitee's Inbox → Invitations) or by invite
   code (Spaces page → "Have an invite code?"). Accept → Space appears in their sidebar.
5. Messaging: Inbox → New Message → DM by email, or a Space team chat. Enter or the send
   button sends. `@their-email` creates a mention. Unread badges on the sidebar + threads.
6. Voro panel: per-Space conversations, context label, template suggestions, Knowledge→AI
   actions.

## Known non-goals / not built yet (declared, not faked)
- Non-core template modules (Courses, Flashcards, Quizzes, Grading, Projects, Analytics…)
  render an explicit placeholder pointing at Knowledge/Tasks.
- No email delivery: invitations and password recovery are in-app only.
- Messaging polls (5–12s) rather than using websockets.
- Calendar has month + agenda; day/week and recurring events are later.
- Supabase not connected (no credentials supplied yet).

## Fixes made during this phase (do not regress)
- Toaster is `top-center`: bottom-right toasts covered the Inbox and Voro send buttons.
- `SpaceTeam` and `Inbox` use `refetchQueries` + optimistic `setQueryData`; a plain
  invalidate that lands mid-flight gets deduped and the stale empty result wins.
- Inbox seeds a newly created thread into the cache **before** selecting it, and sends to
  `activeThread.id`, so a message can never land in the previously selected thread.
