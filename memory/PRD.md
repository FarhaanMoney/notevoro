# Notevoro — PRD & Build Log

## Original problem statement (summary)
Build Notevoro from scratch as ONE coherent product: Brain (global hub) → Spaces (Personal | Team chambers) → Space Library (modules / tools / views / AI / integrations) → modules → data → collaboration (real, persisted chat + presence) → Voro (space-aware, permission-aware AI with confirmable actions) → integrations. Backend is the source of truth for authz, subscriptions and usage (race-safe). Local-first (Tauri/Rust vault, SQLite index). AWS target stack (EC2/FastAPI, Aurora Postgres, S3, SQS, Cognito, Liveblocks) with keys left blank for the user to fill. UI must match the 3 reference screenshots (Space Home, Chat, Brain).

## User choices
- AWS architecture; env vars left blank (Cognito, S3, SQS, Liveblocks, Zoom/Google/Microsoft OAuth).
- Voro model: OpenAI gpt-4o with the user's own key (`OPENAI_API_KEY`, blank).
- Auth: Cognito. Tauri 2 scaffold requested. Priority: Brain + wizard + Space Home + Chat pixel-close, plus working Notes/Tasks/Projects/Calendar/Files/Documents/Library/Voro.

## Architecture (as built)
- **Backend** `/app/backend` FastAPI + SQLAlchemy 2 async → PostgreSQL (`DATABASE_URL`; local Postgres 15 under supervisor here, swap to Aurora). Routers under `/api/v1`: auth, spaces (+library, members, invitations, home), items (notes, documents+versions, tasks, projects, events, records, files, search, export, transcribe), chat (conversations, messages, reactions, read, presence, `/ws`), voro (ask, actions confirm/reject, agents, history, context), account (brain, notifications, activity, billing, webhook, integrations, registry).
- **Identity**: ONE auth system, pluggable provider — `CognitoProvider` (JWKS RS256) when `AUTH_PROVIDER=cognito` + IDs set; `LocalProvider` (bcrypt + HS256) for dev/self-host. Frontend uses Amplify v6 for Cognito automatically (`lib/auth.js`).
- **Authorization**: `authz.py` → user → Space membership → role (owner/admin/member/viewer) → capability enabled → resource. Tested cross-space 403.
- **Entitlement + Usage engines** (`entitlements.py`): single PLANS table (free/pro/premium/enterprise), lifecycle active→expiring→grace→restricted, atomic `UPDATE … WHERE amount+n<=limit` (10 concurrent at 29/30 → exactly 1 passes), refunds on failed ops, 429 LIMIT_REACHED with resource/current/limit/reset/upgrade.
- **Realtime**: FastAPI WebSocket hub (delivery only; Postgres is truth). Message statuses sending→sent→delivered→seen, client_id idempotency, typing ephemeral, presence broadcast.
- **Storage adapter**: S3 (SSE, presigned) when `S3_BUCKET` set, local disk otherwise. **Registry**: 130+ capabilities, sidebar derived from enabled keys + order.
- **Frontend** `/app/frontend` React + react-query + zustand. Brain layout, Space wizard (chamber SVG animation, idempotent create), Space shell (data-driven sidebar, switcher), Space Home (one viewport at 1440×900 and 1366×768), Chat (3-pane, matches reference), Tasks (list/board/table/timeline), Projects (detail hub), Calendar, Notes (autosave, [[links]], backlinks), Documents (markdown, versions, export/print), Files, Records (generic engine for library modules), Library, Team, Meetings (agenda/notes/transcript/action items→tasks), Knowledge, Tools (pomodoro/calculator/converter/focus/transcriber), Voro panel/page (agents, confirmable actions), Settings (profile, billing/usage, export, security), Space Settings (identity, sidebar order, Voro instructions, integrations, delete).
- **Desktop** `/app/desktop` Tauri 2 scaffold: Rust vault commands (open/reindex/list/read/write/delete/search over Markdown + SQLite FTS5), restricted capabilities, CSP, GitHub Actions release matrix. Untestable in this environment (no Rust toolchain).

## Implemented — 2026-06 (session 1)
All of the above; testing agent iteration_1: backend 26/26, frontend flows 100%. Manual verification: dual-browser realtime chat, presence, seen receipts; calendar/meetings/files/team-invite/billing/Cmd+K.

## Known limits / honest status
- Voro/transcription return 503 `AI_NOT_CONFIGURED` until `OPENAI_API_KEY` is set (usage not consumed).
- Integrations (Zoom/Google/Microsoft) return 503 `INTEGRATION_NOT_CONFIGURED` until OAuth client ids/secrets set; OAuth callback flow not yet implemented.
- Liveblocks collaborative editing not wired (key blank); documents use autosave + version history over the API. SQS adapter not yet added (jobs run inline).
- Billing: `change-plan` endpoint + idempotent webhook exist; no payment provider connected.

## Backlog (prioritized)
- P0: Fill AWS/Cognito/S3 keys → verify Cognito login, S3 uploads on real infra. OpenAI key → Voro end-to-end incl. tool actions.
- P1: Liveblocks room auth endpoint + collaborative doc editor with cursors; Zoom/Google/Microsoft OAuth callbacks + meeting link generation; SQS worker + DLQ; Alembic migrations; rate limiting middleware.
- P1: Payment provider (Stripe) → webhook already idempotent; enterprise org model + SSO.
- P2: Mind maps / whiteboards canvases; spaced repetition scheduler for flashcards; automations engine; desktop offline sync queue; load tests; backup/restore drill.
