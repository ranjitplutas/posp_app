# POSP Admin v2

A separate, standalone admin panel — Next.js + Fastify + PostgreSQL + Microsoft
Entra ID (MSAL, Authorization Code + PKCE) — built alongside `posp_app` without
touching it. Directus is not involved anywhere in this app; the API talks
directly to the same PostgreSQL database `posp_app`'s Directus instance uses.

## Repo layout

```
apps/api/               Fastify API (TypeScript, ESM/NodeNext)
apps/web/                Next.js App Router frontend
packages/contracts/      Shared role/menu/error-code constants, used by both apps
docker-compose.yml        Local dev convenience — does NOT seed the real database
docker-compose.prod.yml   Production stack: api + web + Caddy (reverse proxy, auto HTTPS)
Caddyfile                 Reverse-proxy routing for the production stack
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

## Running with Docker (local dev)

```bash
docker compose up --build
```

Builds both apps from their `Dockerfile`s and runs them as non-root
containers, reading config from `apps/api/.env` and `apps/web/.env.local` (so
complete steps 1–3 above first). This does **not** initialize or seed the
real database — `DATABASE_URL` should still point at a real (or your own
throwaway) Postgres instance, and you still run the migration once yourself
(`npm run migrate --workspace=apps/api`, from outside Docker, against the
same `DATABASE_URL`). This compose file is dev-only; for a real deployment
use `docker-compose.prod.yml` — see below.

## Production Deployment (Hostinger VPS)

This targets a **Hostinger VPS** (KVM/Cloud plan with root SSH access — not
shared hosting, which can't run Docker) pointed at by two DNS records, e.g.
`app.yourdomain.com` and `api.yourdomain.com` (an A record each, at the VPS's
public IP — set these in Hostinger's DNS zone editor, or wherever your domain
is managed, before starting). The stack is three containers: `api`, `web`,
and `caddy` (reverse proxy with automatic Let's Encrypt HTTPS) — defined in
[`docker-compose.prod.yml`](docker-compose.prod.yml) and
[`Caddyfile`](Caddyfile) at the repo root.

### 1. Provision the VPS

SSH into the Hostinger VPS (credentials/IP from `hPanel → VPS → your
server`), then install Docker if it's not already there:

```bash
ssh root@<your-vps-ip>
curl -fsSL https://get.docker.com | sh
docker compose version   # confirm the Compose plugin is present (bundled with the script above)
```

Open the firewall for HTTP/HTTPS only — the app/API ports stay internal to
Docker, never exposed publicly:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. Get the code onto the server

```bash
git clone https://github.com/ranjitplutas/posp_app.git
cd posp_app
```

(For later updates: `git pull` from this same directory — see [Updating /
redeploying](#5-updating--redeploying) below.)

### 3. Configure production environment

Two `.env` files, neither committed to git:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Edit **`apps/api/.env`** — this is the API's real runtime config (see the
"Configuration" section above for what each variable means).
Production-specific settings to double-check:

```
NODE_ENV=production
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
DB_SSL_MODE=require                          # if your Postgres requires TLS
APP_JWT_SECRET=<generate with the node -e command above — a real secret, not the dev one>
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
ADMIN_BOOTSTRAP_EMAILS=you@company.com        # set before your first login
ENABLE_PASSWORD_LOGIN=false                   # MUST be false in production
```

Edit the root **`.env`** — this only feeds `docker-compose.prod.yml`'s Caddy
domains and the web image's build-time `NEXT_PUBLIC_*` values (Next.js bakes
these into the client bundle at *build* time, so they must already be the
real public HTTPS URLs before you build):

```
DOMAIN_APP=app.yourdomain.com
DOMAIN_API=api.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=<same App Registration client ID as apps/api/.env>
NEXT_PUBLIC_MICROSOFT_TENANT_ID=<same tenant ID as apps/api/.env>
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://app.yourdomain.com/auth/callback
```

Add that redirect URI to the Azure App Registration too (**Authentication →
Platform: SPA**), alongside the localhost one from dev.

### 4. Build images, run the migration, start the stack

```bash
# Build both application images (Caddy is pulled pre-built, not built locally)
docker compose -f docker-compose.prod.yml build

# One-time (and safe to re-run — it skips already-applied migrations):
# creates digi_posp_app_users, never touches digi_user/digi_user_verification/digi_educations
docker compose -f docker-compose.prod.yml run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts

# Start everything, detached
docker compose -f docker-compose.prod.yml up -d
```

Caddy requests and renews its own TLS certificates automatically the first
time it sees traffic on each domain — no separate certbot step. First
request to a fresh domain can take a few seconds while that happens.

Verify:

```bash
curl https://api.yourdomain.com/health/live     # {"status":"ok",...}
curl https://api.yourdomain.com/health/ready    # {"status":"ok",...} — confirms DB connectivity too
curl -I https://app.yourdomain.com/login        # 200
```

Then sign in with Microsoft using the email you put in
`ADMIN_BOOTSTRAP_EMAILS` — you land as an active Admin immediately. Once
signed in as Admin, `/system-health` gives the same live DB/API/error status
from inside the app itself.

### 5. Updating / redeploying

```bash
cd posp_app
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts   # only does something if new migrations exist
docker compose -f docker-compose.prod.yml up -d
```

`up -d` recreates only the containers whose image actually changed — Caddy
keeps running (and keeps its certificates) unless the Caddyfile itself
changed.

### 6. Operating the stack

```bash
docker compose -f docker-compose.prod.yml ps                 # container status + health
docker compose -f docker-compose.prod.yml logs -f api         # follow API logs
docker compose -f docker-compose.prod.yml logs -f web         # follow web logs
docker compose -f docker-compose.prod.yml logs -f caddy       # follow proxy/TLS logs
docker compose -f docker-compose.prod.yml restart api         # restart just one service
docker compose -f docker-compose.prod.yml down                # stop everything (keeps images/volumes)
```

`api` and `web` both carry a Docker `HEALTHCHECK` (hitting `/health/live` and
`/login` respectively) — `docker compose ps` and `docker inspect` reflect
`healthy`/`unhealthy` status directly, and `restart: unless-stopped` brings a
crashed container back automatically.

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
