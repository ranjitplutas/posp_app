# POSP Admin v2

A separate, standalone admin panel — Next.js + Fastify + PostgreSQL + Microsoft
Entra ID (MSAL, Authorization Code + PKCE) — built alongside `posp_app` without
touching it. Directus is not involved anywhere in this app; the API talks
directly to the same PostgreSQL database `posp_app`'s Directus instance uses.

## Repo layout

```
apps/api/            Fastify API (TypeScript, ESM/NodeNext)
apps/web/             Next.js App Router frontend
packages/contracts/   Shared role/menu/error-code constants, used by both apps
docker-compose.yml     Local dev convenience — does NOT seed the real database
```

## Quick start (for a new developer)

Prerequisites: Node.js 20+, npm 10+, and a reachable PostgreSQL connection
string (see [Database](#1-database) below — you don't need to run Postgres
yourself, just point at the real one or a throwaway local instance).

```bash
git clone https://github.com/ranjitplutas/posp_app.git
cd posp_app
npm install
```

Then work through the three config steps below, run the migration once, and
start both apps:

```bash
npm run migrate --workspace=apps/api   # one-time, see step 4
npm run dev                             # runs API (:4000) + web (:3000) together
```

Or run them separately in two terminals: `npm run dev:api` / `npm run dev:web`.

- Web: http://localhost:3000
- API: http://localhost:4000
- API docs (Swagger UI, dev only): http://localhost:4000/docs
- Raw OpenAPI JSON (importable into Postman): http://localhost:4000/docs/json

## Configuration — what a new developer must change

Both apps read from `.env` files that are **gitignored** — you copy the
`.example` file and fill in your own values. Nothing secret is committed.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 1. Database

Set `DATABASE_URL` in `apps/api/.env` to a real Postgres connection string:

```
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
```

This app reads/writes the **same** database `posp_app`/Directus uses
(`digi_user`, `digi_user_verification`, `digi_educations` — read-mostly, no
create/delete on those three tables per spec) and owns one table of its own,
`digi_posp_app_users` (created by the migration in step 4). If you're
connecting to a managed Postgres that requires TLS, also set:

```
DB_SSL_MODE=require
```

Pool sizing (`DB_POOL_MIN`/`DB_POOL_MAX`), timeouts
(`DB_IDLE_TIMEOUT_MS`/`DB_CONNECTION_TIMEOUT_MS`/`DB_STATEMENT_TIMEOUT_MS`),
and `SLOW_QUERY_THRESHOLD_MS` (queries slower than this get logged as
warnings) all have sensible defaults in `.env.example` — leave them unless
you have a specific reason to change them.

### 2. Microsoft Entra ID (Azure AD SSO)

Both `apps/api/.env` and `apps/web/.env.local` need matching Microsoft
values — they must describe the **same** App Registration:

| Variable | File | Notes |
|---|---|---|
| `MICROSOFT_CLIENT_ID` / `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` | api / web | Application (client) ID |
| `MICROSOFT_TENANT_ID` / `NEXT_PUBLIC_MICROSOFT_TENANT_ID` | api / web | Directory (tenant) ID |
| `MICROSOFT_ALLOWED_TENANT_IDS` | api | Comma-separated; usually just the one tenant ID above |
| `MICROSOFT_AUTHORITY` | api | `https://login.microsoftonline.com/<tenant-id>` |
| `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI` | web | `http://localhost:3000/auth/callback` in dev |

`.env.example` ships pre-filled with the same App Registration `posp_app`
uses. If you're reusing that registration, you only need to add **this app's
own redirect URI** under **Azure Portal → App registrations → (the app) →
Authentication → Platform: SPA**:

```
http://localhost:3000/auth/callback
```

(plus your production URL's `/auth/callback` when you deploy). If instead
you're standing up a **new** App Registration for this project, set it up as
a **Single-page application (SPA)** platform (not "Web"), enable
Authorization Code + PKCE (the default for SPA), and put its Application ID,
Tenant ID, and Authority into both `.env` files.

### 3. App JWT secret

```
APP_JWT_SECRET=
```

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

This signs the app's own short-lived session token (issued after Microsoft
sign-in). `APP_JWT_EXPIRES_IN_SECONDS` (default `3600`) doubles as the
effective session timeout — the frontend persists the token across page
refreshes and treats this JWT's expiry as "session timed out".

### 4. Run the migration (one-time, per database)

```bash
npm run migrate --workspace=apps/api
```

Creates `digi_posp_app_users` (this app's own user/role table) plus its
indexes. Never touches `digi_user`, `digi_user_verification`, or
`digi_educations` — purely additive, safe to run against the real database.

### 5. Bootstrap your first Admin

Set before that person's first sign-in:

```
ADMIN_BOOTSTRAP_EMAILS=you@company.com,someoneelse@company.com
```

Anyone signing in with Microsoft using one of these emails is auto-promoted
to `ADMIN`/`ACTIVE` on their very first login. Anyone else lands as
`PENDING_ROLE` until an Admin assigns them a role from **User Management**.

Forgot to set it before someone's first login? Fix it after the fact:

```bash
npm run user:assign-role --workspace=apps/api -- --email someone@company.com --role ADMIN
```

### 6. (Optional) Local username/password login, no Azure AD needed

Useful for quick local testing without going through Microsoft's consent
screen. In `apps/api/.env`:

```
ENABLE_PASSWORD_LOGIN=true
```

Then seed a local admin (default `admin`/`admin`, override with
`-- --username --password`):

```bash
npm run seed:local-admin --workspace=apps/api
```

**Turn `ENABLE_PASSWORD_LOGIN` back to `false` before deploying anywhere
beyond your own machine** — it's a dev-only fallback, never intended for
production.

### CORS

`CORS_ALLOWED_ORIGINS` in `apps/api/.env` must include every origin the
frontend is served from (comma-separated). Defaults to
`http://localhost:3000` for local dev — add your staging/production URL(s)
when you deploy.

## Running with Docker

```bash
docker compose up --build
```

Builds both apps from their multi-stage `Dockerfile`s and runs them as
non-root containers, reading config from `apps/api/.env` and
`apps/web/.env.local` (so complete steps 1–3 above first). This does **not**
initialize or seed the real database — `DATABASE_URL` should still point at
a real (or your own throwaway) Postgres instance, and you still run the
migration once yourself (`npm run migrate --workspace=apps/api`, from
outside Docker, against the same `DATABASE_URL`).

## What's implemented

- **Auth**: MSAL popup sign-in → backend verifies the Microsoft ID token
  against Microsoft's own JWKS (never decode-and-trust) → upserts
  `digi_posp_app_users` → issues a short-lived app JWT held **in-memory +
  sessionStorage** on the frontend (never `localStorage`) → silent refresh
  via MSAL `acquireTokenSilent` re-exchanged for a new app JWT on `401`.
- **RBAC**: `authenticate`/`authorizeRoles` Fastify middleware re-enforce
  every rule server-side; frontend `RouteGuard` + role-filtered sidebar are
  UX only, never the actual security boundary. Pending/disabled/access-denied
  screens included, each with an animated illustration.
- **User management**: cursor-paginated list, search, role/status filters,
  role assignment (auto-activates), enable/disable with explicit allowed
  status transitions, last-active-Admin protection on both role change and
  disable.
- **POSP APIs** (`digi_user`/`digi_user_verification`/`digi_educations`):
  page-based pagination, search across name/email/mobile/POSP ID, multi-value
  status filter, Cluster Manager assignment (Admin/Executive only —
  validated against an actually-active Cluster Manager), single-POSP
  verification detail with bank/PAN de-duplication, whitelisted single-field
  verification updates, read-only educations list. No create/delete anywhere
  on these three tables, per spec. Cluster Managers only ever see their own
  assigned POSPs — enforced in the repository query, not just the UI.
- **Dashboard / Performance / Analytics**: zero-filled trend charts
  (daily/weekly/monthly/quarterly/yearly), per-Cluster-Manager comparison
  (one grouped query, not one-per-manager), state/education distribution
  pie & bar charts, all with hover tooltips and direct value labels.
- **System Health** (`/system-health`, Admin-only): live DB
  connectivity/latency/pool stats, API uptime/memory, and the last 25
  unhandled/5xx server errors — for spotting production issues at a glance.
- **Responsive UI**: pinned header + sidebar with a scrollable content area,
  mobile drawer nav, card-view POSP registry and accordion-based POSP detail
  page below the 900px breakpoint.
- **Hardening**: strict CORS allowlist (never wildcard+credentials), Helmet
  security headers + CSP, global rate limiting (100/min), structured Pino
  logging with automatic secret/token redaction, slow-query logging,
  centralized error handler mapping to stable error codes (never leaks stack
  traces/SQL/paths), graceful shutdown on SIGTERM/SIGINT.
- **Tests**: `npm run test:api` — covers JWT sign/verify, cursor pagination
  encode/decode, and the shared role/status/error contracts.

## Known gaps / next steps

- Full Postman collection wasn't hand-authored — use the auto-generated
  OpenAPI JSON at `/docs/json` instead (equivalent, always in sync with the
  actual routes).
- Frontend test suite (Vitest/RTL for the MSAL flow, role-filtered menu,
  modals) wasn't built — the backend test suite covers the logic-heavy
  pieces; the frontend is mostly thin API-bound UI at this point.
- Integration tests against a live Postgres aren't part of the automated
  suite — run through the full flow once yourself end-to-end after setup
  (Microsoft popup login can't be driven headlessly — it needs a real user
  clicking through Microsoft's consent screen).
