# Notevoro — PRD & Build Log

## Original problem statement (summary)
Build Notevoro as ONE coherent product: Brain (global hub) → Spaces (Personal | Team chambers) → Space Library (modules / tools / views / AI / integrations) → modules → data → collaboration (real, persisted chat + presence) → Voro (space-aware, permission-aware AI with confirmable actions) → integrations. Backend is the source of truth for authz, subscriptions and usage (race-safe). Local-first (Tauri/Rust vault, SQLite index). AWS target stack (EC2/FastAPI, Aurora Postgres, S3, SQS, Cognito). Realtime collaboration via **Supabase Realtime + Tiptap/Yjs** (Liveblocks removed).

## Architecture (current)
- **Backend** `/app/backend` FastAPI + SQLAlchemy 2 async → PostgreSQL (`DATABASE_URL`; local Postgres 15 under supervisor here, swap to Aurora). Routers under `/api/v1`: auth, spaces (+library, members, invitations, home), items (notes, documents+versions, tasks, projects, events, records, files, search, export, transcribe), chat (conversations, messages, reactions, read, presence, `/ws`), voro, account, **collab** (Supabase config, space & document authorize, Yjs snapshot log).
- **Identity**: Pluggable — `CognitoProvider` (JWKS RS256) when `AUTH_PROVIDER=cognito`; `LocalProvider` (bcrypt+HS256) for dev.
- **Authorization**: `authz.py` → user → Space membership → role (owner/admin/member/viewer). Cross-space 403 enforced. `collab` router mirrors the same check before returning any Supabase topic.
- **Realtime boundary**:
  - Aurora = source of truth for users, memberships, invitations, chat messages, documents, Yjs update log.
  - Supabase Realtime = ephemeral pub/sub for `workspace:{id}`, `workspace:{id}:chat`, `document:{space_id}:{doc_id}` channels; presence.
  - Existing FastAPI WebSocket (`/api/v1/ws`) remains for backwards-compatible chat/presence delivery; the app runs both cleanly.
  - **No Liveblocks anywhere.**
- **Collaborative editor**: Tiptap 2.10 + Yjs 13.6 + IndexedDB local persistence + collaboration-cursor via y-protocols awareness. Backend endpoint `POST /collab/documents/{id}/yjs-update` durably logs each update chunk; `GET .../yjs-snapshot` returns ordered log for bootstrap.
- **Frontend** `/app/frontend` React 19 + react-query + zustand. Documents page now uses `CollaborativeDocEditor` (Tiptap+Yjs) in the "rich" mode; markdown & read modes retained for compatibility.

## Environment variables (kept BLANK in this container; fill in production)
- Auth: `AUTH_PROVIDER`, `COGNITO_*`, `LOCAL_AUTH_SECRET`
- DB: `DATABASE_URL` (Aurora / local Postgres)
- AWS: `AWS_REGION`, `S3_BUCKET`, `SQS_QUEUE_URL`
- AI: `OPENAI_API_KEY`, `OPENAI_MODEL` (Voro returns 503 AI_NOT_CONFIGURED when blank)
- **Realtime**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (collaboration returns 503 REALTIME_NOT_CONFIGURED when blank; editor falls back to offline-local Yjs via IndexedDB)
- Meetings: `ZOOM_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`
- Payments: `STRIPE_API_KEY`, `RAZORPAY_KEY_ID/SECRET`
- Frontend: `REACT_APP_BACKEND_URL`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`

## Supabase production checklist (when keys are provisioned)
Run in Supabase SQL editor to enforce authorization mirror:
```sql
create policy "workspace channel read" on realtime.messages for select to authenticated
using ( realtime.messages.extension in ('broadcast','presence')
        and exists (select 1 from public.workspace_members m
                    where m.user_id = auth.uid()
                      and realtime.topic() like 'workspace:' || m.workspace_id::text || '%'));
create policy "workspace channel write" on realtime.messages for insert to authenticated
with check ( realtime.messages.extension in ('broadcast','presence')
             and exists (select 1 from public.workspace_members m
                         where m.user_id = auth.uid()
                           and realtime.topic() like 'workspace:' || m.workspace_id::text || '%'));
```

## Roadmap (post Phase 1)
- Phase 2: Chat + invitations wired to Supabase channels + persisted Aurora writes (backend already emits ephemeral events over WS).
- Phase 3: Voro action agent — tool architecture (create_meeting, send_message, create_project, create_task, create_note, invite_member, …) with backend authorization on every tool call.
- Phase 4: Meetings as first-class object + real Zoom OAuth callback + join URL retrieval.
- Phase 5: Landing pricing polish (remove Liveblocks bullet; keep light look).
- Phase 6: Entitlements/plans hardening (Free unlimited local; Pro/Premium/Enterprise progressive).
