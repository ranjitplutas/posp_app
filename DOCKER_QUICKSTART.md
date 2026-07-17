# Docker Quick Start Guide

Get your Docker containers running with the remote database in minutes.

## Prerequisites
- Docker Desktop installed
- Remote PostgreSQL database already configured and accessible
- Database credentials and connection string ready

## For Windows Users

### 1. Update Database Connection
Edit `apps/api/.env` and set your database URL:
```
DATABASE_URL=postgres://user:password@your-db-host:5432/your-database
```

### 2. Run the Setup Script
```powershell
.\docker-setup.ps1
```

This will:
- Create `.env` files
- Verify database connection
- Build API and Web images
- Run database migrations
- Start containers

### 3. Verify It Works
```
Web App:  http://localhost:3000
API:      http://localhost:4000/api/v1
Health:   http://localhost:4000/health/live
```

### 4. View Logs
```powershell
docker compose logs -f
```

### 5. Stop When Done
```powershell
docker compose down
```

---

## For Mac/Linux Users

### 1. Update Database Connection
Edit `apps/api/.env` and set your database URL:
```
DATABASE_URL=postgres://user:password@your-db-host:5432/your-database
```

### 2. Run the Setup Script
```bash
chmod +x docker-setup.sh
./docker-setup.sh
```

This will:
- Create `.env` files
- Verify database connection
- Build API and Web images
- Run database migrations
- Start containers

### 3. Verify It Works
```
Web App:  http://localhost:3000
API:      http://localhost:4000/api/v1
Health:   http://localhost:4000/health/live
```

### 4. View Logs
```bash
docker compose logs -f
```

### 5. Stop When Done
```bash
docker compose down
```

---

## Manual Setup (If Script Doesn't Work)

### 1. Create Environment Files
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 2. Configure Database
Edit `apps/api/.env`:
```
DATABASE_URL=postgres://user:password@your-db-host:5432/your-database
```

### 3. Build Docker Images
```bash
docker compose build
```

### 4. Run Migrations
```bash
docker compose run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts
```

### 5. Start Services
```bash
docker compose up -d
```

### 6. Verify
```bash
# Check containers are running
docker compose ps

# Check logs
docker compose logs -f

# Test API health
curl http://localhost:4000/health/live
```

---

## Connecting to Remote Database

### Get Your Connection String
Your database connection string should look like:
```
postgres://username:password@hostname:5432/database_name
```

**For Hostinger/Standard PostgreSQL:**
- Host: `your-db-host.com` or IP address
- Port: `5432` (default)
- Database: Your database name
- User: Your database username
- Password: Your database password

### Test Connection (Optional)
Before running Docker, test your connection:
```bash
# Install pgAdmin or psql client
psql -h your-db-host -U username -d database_name
```

If connection fails, verify:
- Host/IP is correct
- Port is accessible
- Credentials are correct
- Database exists

---

## Common Issues

### ❌ "Cannot connect to database"
**Solution:** Verify `DATABASE_URL` in `apps/api/.env`

Check connection from terminal:
```bash
psql -h your-host -U your-user -d your-db
```

Then check Docker logs:
```bash
docker compose logs api
```

### ❌ "Port 3000 already in use"
**Solution:** Stop existing containers
```bash
docker compose down
```

### ❌ "Build failed"
**Solution:** Rebuild from scratch
```bash
docker compose build --no-cache
```

### ❌ "Web won't connect to API"
**Solution:** Check `apps/web/.env.local`
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

### ❌ "Migrations failed"
**Solution:** Check:
1. Database connection is working
2. Database user has permission to create tables
3. Check logs: `docker compose logs api`

---

## Development Workflow

### Make Code Changes
Edit code in your editor normally (outside Docker):
```
src/
├── apps/
│   ├── api/
│   └── web/
```

### Rebuild After Changes
```bash
# If you changed dependencies
docker compose build

# Otherwise restart the service
docker compose restart api
docker compose restart web
```

### View Live Logs
```bash
# All services
docker compose logs -f

# Just API
docker compose logs -f api

# Just Web with timestamps
docker compose logs -f --timestamps web
```

### Run Commands in Container
```bash
# Shell access to API
docker compose exec api sh

# Run npm commands
docker compose exec api npm list

# Check API database connection
docker compose exec api node -e "console.log(process.env.DATABASE_URL)"
```

---

## Container Details

### Services Running
- **API** (Node.js/Express)
  - Port: 4000
  - Health: `http://localhost:4000/health/live`
  - Config: `apps/api/.env`

- **Web** (Next.js)
  - Port: 3000
  - Config: `apps/web/.env.local`
  - Depends on: API

### Database
- **Remote PostgreSQL** (configured in `apps/api/.env`)
- User is responsible for:
  - Database setup and maintenance
  - Backups
  - Performance tuning

---

## Production Deployment

After testing locally, deploy to Hostinger:

1. Read: `DOCKER_DEPLOYMENT.md`
2. Update production env files
3. Push to VPS and run:
   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## Environment Files (Git-Safe)

These files are created locally and NOT committed to git:
- `apps/api/.env` — Local API config with DB connection
- `apps/web/.env.local` — Local Web config

Examples are safe to commit:
- `apps/api/.env.example`
- `apps/web/.env.local.example`

---

## Next Steps

1. **Update** `apps/api/.env` with your database connection
2. **Run** `docker-setup.ps1` (Windows) or `docker-setup.sh` (Mac/Linux)
3. **Open** http://localhost:3000
4. **Start developing!**

---

## Need Help?

1. Check logs: `docker compose logs`
2. Verify DATABASE_URL in `apps/api/.env`
3. Test database connection manually
4. Read `DOCKER_DEPLOYMENT.md` for detailed docs
5. Restart services: `docker compose down && docker compose up -d`

Happy coding! 🚀
