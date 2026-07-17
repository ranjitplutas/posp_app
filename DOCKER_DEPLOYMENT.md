# Docker Deployment Guide

This guide covers both **local Docker development** and **production Hostinger VPS deployment**.

---

## Overview

The project uses Docker Compose for both environments:
- **Local Development**: `docker-compose.yml` (dev mode with hot features)
- **Production**: `docker-compose.prod.yml` (with Caddy reverse proxy and HTTPS)

Both versions can coexist on your machine — developers continue working locally while production deploys independently.

---

## Part 1: Local Docker Development Setup

### Prerequisites
- Docker Desktop installed and running
- PostgreSQL database (local or remote)
- Node.js 22+ (for non-Docker development, optional)

### Step 1: Configure Local Environment Variables

#### API Configuration
Copy and customize the example:
```bash
# Create apps/api/.env from the template
# Edit DATABASE_URL to point to your local database
DATABASE_URL=postgres://user:password@localhost:5432/dev_digisafe_posp
```

The `apps/api/.env` file is already created with local defaults.

#### Web Configuration
The `apps/web/.env.local` file is already created with localhost API URL.

### Step 2: Build and Start Local Containers

```bash
# Build images
docker compose build

# Run migrations (if database exists and migrations are pending)
docker compose run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts

# Start containers
docker compose up -d

# View logs
docker compose logs -f
```

**Container URLs:**
- Web App: http://localhost:3000
- API: http://localhost:4000/api/v1
- Health Check: http://localhost:4000/health/live

### Step 3: Verify Deployment

```bash
# Check container status
docker compose ps

# Check logs for errors
docker compose logs api
docker compose logs web

# Test API health
curl http://localhost:4000/health/live

# Test web app
curl http://localhost:3000/login
```

### Common Development Commands

```bash
# Stop containers
docker compose down

# Stop and remove volumes (WARNING: clears data!)
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache

# Restart a specific service
docker compose restart api

# View real-time logs
docker compose logs -f

# Run a command in a container
docker compose exec api npm run migrate
```

### Database Setup

If you don't have a local PostgreSQL instance:

**Option A: Run PostgreSQL in Docker (easiest for local dev)**
```bash
docker run -d \
  --name postgres-local \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=dev_digisafe_posp \
  -p 5432:5432 \
  postgres:16-alpine
```

**Option B: Use Hostinger or Remote Database**
Update `apps/api/.env`:
```
DATABASE_URL=postgres://user:password@remote-host:5432/dev_digisafe_posp
```

---

## Part 2: Production Deployment on Hostinger VPS

### Prerequisites
- Hostinger VPS account with SSH access
- Domain names (e.g., app.yourdomain.com, api.yourdomain.com)
- PostgreSQL database (managed or self-hosted on VPS)
- Docker + Docker Compose installed on VPS

### Step 1: Prepare Production Environment Files

**On your local machine:**

```bash
# Create production configuration files (NOT committed to git)
cp .env.prod.example .env.prod
cp apps/api/.env.prod.example apps/api/.env.prod
```

Edit `.env.prod`:
```
DOMAIN_APP=app.yourdomain.com
DOMAIN_API=api.yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://app.yourdomain.com/auth/callback
```

Edit `apps/api/.env.prod`:
```
DATABASE_URL=postgres://user:password@db-host:5432/prod_digisafe_posp
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
# Generate a NEW JWT secret:
APP_JWT_SECRET=your-new-production-secret
# Other production settings...
```

### Step 2: Setup DNS Records

Point your domains to your Hostinger VPS IP address:
```
A record: app.yourdomain.com  → YOUR_VPS_IP
A record: api.yourdomain.com  → YOUR_VPS_IP
```

(Can also use a wildcard: *.yourdomain.com → YOUR_VPS_IP)

### Step 3: Deploy to Hostinger VPS

Connect to your VPS via SSH:
```bash
ssh root@your-vps-ip
```

Clone the repository:
```bash
cd /opt
git clone https://github.com/yourusername/posp_app.git
cd posp_app
```

Copy environment files from your local machine:
```bash
# Via SCP from your local machine:
scp .env.prod root@your-vps-ip:/opt/posp_app/
scp apps/api/.env.prod root@your-vps-ip:/opt/posp_app/apps/api/.env.prod
```

Or manually on the VPS (Vi/Nano editor):
```bash
nano .env.prod
nano apps/api/.env.prod
```

### Step 4: Build and Start Production Containers

On your Hostinger VPS:

```bash
# Build images for production
docker compose -f docker-compose.prod.yml build

# Run database migrations
docker compose -f docker-compose.prod.yml run --rm api \
  /repo/node_modules/.bin/tsx scripts/migrate.ts

# Start services in background
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

**Verification:**
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Test API
curl https://api.yourdomain.com/health/live

# Test Web App
curl -I https://app.yourdomain.com
```

### Step 5: Enable HTTPS with Caddy

Caddy automatically provisions Let's Encrypt SSL certificates for your domains. It listens on:
- Port 80 (HTTP) — automatically redirects to HTTPS
- Port 443 (HTTPS) — serves your app with valid SSL

The `Caddyfile` already has the correct configuration. Just ensure ports 80/443 are open on your firewall.

### Step 6: Monitor Production Deployment

```bash
# View real-time logs
docker compose -f docker-compose.prod.yml logs -f

# Check specific service logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f caddy

# View Caddy certificate status
docker compose -f docker-compose.prod.yml exec caddy caddy list-certs
```

---

## Maintenance & Troubleshooting

### Update Application

**Local Development:**
```bash
git pull origin main
docker compose build --no-cache
docker compose up -d
```

**Production:**
```bash
# On VPS
cd /opt/posp_app
git pull origin main
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Database Backups

**Local:**
```bash
docker exec postgres-local pg_dump -U postgres dev_digisafe_posp > backup.sql
```

**Production:**
```bash
# On VPS
docker compose -f docker-compose.prod.yml exec api \
  pg_dump -U your-user -h db-host prod_digisafe_posp > backup.sql
```

### Common Issues

#### "Cannot connect to database"
- Verify `DATABASE_URL` is correct in `.env` file
- Ensure database server is running
- For local: `docker ps` should show `postgres-local` running
- For Hostinger: test connection: `psql -U user -h host -d database`

#### "Port already in use"
- Local: `docker compose down` (stop all containers)
- Check: `netstat -an | grep 3000` or `netstat -an | grep 4000`

#### "Certificate not provisioning"
- Ensure ports 80/443 are open: `sudo ufw allow 80/443/tcp`
- Verify DNS records propagated: `dig app.yourdomain.com`
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`

#### "Next.js build failure"
- Ensure build args are set in `docker-compose.prod.yml`
- Check that `NEXT_PUBLIC_*` variables are in `.env.prod`
- Rebuild: `docker compose -f docker-compose.prod.yml build --no-cache`

---

## Development vs Production Checklist

### Before Production Deployment

- [ ] All code committed to git
- [ ] Database migrations tested locally
- [ ] `.env.prod` and `apps/api/.env.prod` created with production values
- [ ] New `APP_JWT_SECRET` generated
- [ ] DNS records pointing to VPS IP
- [ ] Firewall allows ports 80/443
- [ ] HTTPS/SSL testing done
- [ ] CORS origins correctly restricted
- [ ] Password login disabled in production
- [ ] Logs reviewed for errors
- [ ] Health check endpoints verified

### File Structure

```
posp_app/
├── docker-compose.yml              # Local development
├── docker-compose.prod.yml         # Production
├── .env.prod.example              # Template (committed)
├── .env                           # Local dev (NOT committed)
├── Caddyfile                      # Reverse proxy config
├── apps/
│   ├── api/
│   │   ├── Dockerfile            # API container image
│   │   ├── .env                  # Local dev (NOT committed)
│   │   └── .env.prod.example     # Template (committed)
│   └── web/
│       ├── Dockerfile            # Web container image
│       └── .env.local            # Local dev (NOT committed)
└── ...
```

---

## Git Ignore Setup

Ensure `.gitignore` includes:
```
.env
.env.local
.env.prod
apps/api/.env
apps/api/.env.prod
apps/web/.env.local
docker-compose.override.yml
```

This prevents accidental credential commits.

---

## Quick Reference

### Local Development
```bash
docker compose build
docker compose up -d
# Visit http://localhost:3000
```

### Production Deployment
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm api tsx scripts/migrate.ts
docker compose -f docker-compose.prod.yml up -d
# Visit https://app.yourdomain.com
```

### Logs
```bash
# Local
docker compose logs -f

# Production
docker compose -f docker-compose.prod.yml logs -f
```

### Stop Services
```bash
# Local
docker compose down

# Production
docker compose -f docker-compose.prod.yml down
```

---

## Support

For issues:
1. Check logs: `docker compose logs`
2. Verify `.env` files are set correctly
3. Ensure database is accessible
4. Review Dockerfile comments for context
5. Check Docker + Docker Compose versions are current
