# Docker Deployment - POSP Admin

Containerized deployment for Node.js API and Next.js UI with existing remote PostgreSQL.

## Quick Start

### 1. Configure Database
Edit `apps/api/.env`:
```bash
DATABASE_URL=postgres://user:password@your-host:5432/your-db
```

### 2. Run Setup
**Windows:**
```powershell
.\docker-setup.ps1
```

**Mac/Linux:**
```bash
./docker-setup.sh
```

### 3. Access
- Web: http://localhost:3000
- API: http://localhost:4000/api/v1

---

## What's Running

- **API**: Node.js Express server (port 4000)
- **Web**: Next.js UI (port 3000)
- **Database**: Your remote PostgreSQL

---

## Common Commands

```bash
# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart API
docker compose restart api

# Run migrations
docker compose run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts

# Check status
docker compose ps
```

---

## Files to Update

**Before running setup, edit these:**
- `apps/api/.env` — Add your database connection string

---

## Documentation

- **Quick Start**: See `DOCKER_QUICKSTART.md`
- **Full Guide**: See `DOCKER_DEPLOYMENT.md`
- **Setup Details**: See `SETUP_SUMMARY.md`

---

## Production Deployment

Deploy to Hostinger VPS:

1. See `DOCKER_DEPLOYMENT.md` → "Production Deployment"
2. Use `docker-compose.prod.yml` with Caddy reverse proxy
3. Automatic HTTPS with Let's Encrypt

---

## Troubleshooting

**Can't connect to database?**
- Verify DATABASE_URL in `apps/api/.env`
- Test connection: `psql -h your-host -U your-user -d your-db`
- Check logs: `docker compose logs api`

**Port in use?**
```bash
docker compose down
```

**Build failed?**
```bash
docker compose build --no-cache
```

---

## Next Steps

1. Update `apps/api/.env` with database connection
2. Run the setup script for your OS
3. Open http://localhost:3000
4. Start coding!

For detailed information, see the documentation files.
