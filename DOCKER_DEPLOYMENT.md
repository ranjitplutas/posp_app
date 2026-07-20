# Docker Deployment Guide

One image, one container, one port (`8082` — avoids the 80/3000 already used
by other apps on the host) — API and web run as sibling processes inside it
(see [`Dockerfile`](Dockerfile) and [`start.sh`](start.sh)). Next.js proxies
`/api/v1/*` and `/health/*` to the Fastify API over `127.0.0.1:4000`
internally (see `apps/web/next.config.js`), so nothing but port 8082 needs to
be reachable from outside the container — no CORS, no second reverse-proxy
route, no second domain.

- **Local dev**: [`docker-compose.yml`](docker-compose.yml)
- **Production**: [`docker-compose.prod-custom.yml`](docker-compose.prod-custom.yml) — routes through an existing Traefik reverse proxy on the VPS

---

## Part 1: Local Docker Development

### Prerequisites
- Docker Desktop
- A reachable PostgreSQL connection string (managed or your own instance)

### Setup

```bash
cp apps/api/.env.example apps/api/.env       # fill in DATABASE_URL, APP_JWT_SECRET, Microsoft values
cp apps/web/.env.local.example apps/web/.env.local
cp .env.example .env                         # feeds build args (already defaults to localhost)
```

Or just run [`docker-setup.ps1`](docker-setup.ps1) (Windows) / [`docker-setup.sh`](docker-setup.sh) (Mac/Linux) — copies the `.env` templates and walks through build → migrate → start.

### Build, migrate, start

```bash
docker compose build
docker compose run --rm app /repo/node_modules/.bin/tsx apps/api/scripts/migrate.ts
docker compose up -d
```

- Web app: http://localhost:8082
- API (proxied through the same container): http://localhost:8082/api/v1
- Health: http://localhost:8082/health/live

### Common commands

```bash
docker compose logs -f              # follow logs
docker compose ps                   # container + health status
docker compose restart app          # restart
docker compose down                 # stop (keeps images)
docker compose build --no-cache     # rebuild after code changes
```

---

## Part 2: Production Deployment (VPS with existing Traefik)

This assumes a VPS that already runs a Traefik reverse proxy for other apps
(Docker labels wire new services into it — no Traefik config file to edit).
If you don't have Traefik yet, point a plain `docker run -p 80:8082`/reverse
proxy of your choice at the container instead; the app itself doesn't care.

### 1. DNS

One A record, at the VPS's public IP:

```
DOMAIN_APP.yourdomain.com   A   <vps-ip>
```

No second domain for the API — it's the same container, same origin.

### 2. Get the code onto the server and configure

```bash
git clone https://github.com/ranjitplutas/posp_app.git
cd posp_app
```

From your local machine, upload the two production env files (neither is
committed to git):

```powershell
scp .env.prod root@<vps-ip>:/opt/app/posp_app/
scp apps/api/.env.prod root@<vps-ip>:/opt/app/posp_app/apps/api/.env.prod
```

`.env.prod` (copy from [`.env.prod.example`](.env.prod.example)) only needs:

```
DOMAIN_APP=app.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=/api/v1
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=<same as apps/api/.env.prod>
NEXT_PUBLIC_MICROSOFT_TENANT_ID=<same as apps/api/.env.prod>
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://app.yourdomain.com/auth/callback
```

`apps/api/.env.prod` (copy from [`apps/api/.env.prod.example`](apps/api/.env.prod.example))
is the real runtime config — set `DATABASE_URL`, a freshly generated
`APP_JWT_SECRET`, `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com`, and
`ENABLE_PASSWORD_LOGIN=false`.

Add the redirect URI to the Azure App Registration too (**Authentication →
Platform: SPA**), alongside the localhost one from dev.

**⚠️ Always pass `--env-file .env.prod`** — `docker compose build`/`run`
only auto-loads plain `.env`, not `.env.prod`.

### 3. If Traefik doesn't already see this container's network

Traefik must be attached to the same Docker network as this app to route to
it. Check with `docker network ls` / your Traefik management UI (Portainer
→ edit the `traefik` container → External networks) — attach
`posp_app_posp-prod` if it isn't already checked, then restart Traefik.
(One-time setup per VPS; skip if already done.)

### 4. Build, migrate, start

```bash
cd /opt/app/posp_app

docker compose --env-file .env.prod -f docker-compose.prod-custom.yml build

docker compose --env-file .env.prod -f docker-compose.prod-custom.yml run --rm app \
  /repo/node_modules/.bin/tsx apps/api/scripts/migrate.ts

docker compose --env-file .env.prod -f docker-compose.prod-custom.yml up -d
```

Traefik requests its own Let's Encrypt certificate for `DOMAIN_APP` on first
request — no separate certbot step.

Verify:

```bash
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml ps
curl https://app.yourdomain.com/health/live      # {"status":"ok",...}
curl https://app.yourdomain.com/health/ready     # confirms DB connectivity too
curl -I https://app.yourdomain.com/login         # 200
```

Then sign in with Microsoft using an `ADMIN_BOOTSTRAP_EMAILS` address — you
land as an active Admin immediately.

### 5. Updating / redeploying

```bash
cd /opt/app/posp_app
git pull
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml build
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml run --rm app \
  /repo/node_modules/.bin/tsx apps/api/scripts/migrate.ts   # no-op if no new migrations
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml up -d
```

### 6. Operating the stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml logs -f app
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml restart app
docker compose --env-file .env.prod -f docker-compose.prod-custom.yml down
```

The container carries a Docker `HEALTHCHECK` (hits `/login`) —
`docker compose ps` reflects `healthy`/`unhealthy` directly, and
`restart: unless-stopped` brings a crashed container back automatically.

---

## Troubleshooting

**"Cannot connect to database"** — verify `DATABASE_URL` in the relevant
`.env` file and that the database is reachable from the VPS/container.

**404 from the domain, app works on `localhost`** — Traefik isn't attached
to `posp_app_posp-prod` (see Part 2, step 3), or DNS hasn't propagated yet
(`nslookup app.yourdomain.com` should return the VPS IP).

**Next.js build failure re: `NEXT_PUBLIC_*`** — these are baked in at
*build* time. Make sure you passed `--env-file .env.prod` (prod) so the
build args actually resolve, then rebuild with `--no-cache`.

**Certificate warnings** — Traefik's `letsencrypt` resolver needs port 80
reachable for the HTTP-01 challenge (or DNS-01 configured). Self-signed
certs will show a browser warning until that's sorted.
