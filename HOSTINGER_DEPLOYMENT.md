# Hostinger VPS Deployment Guide

Complete step-by-step guide to deploy POSP Admin to Hostinger VPS with Docker, Caddy, and automatic HTTPS.

## Prerequisites

Before starting, ensure you have:
- [ ] Hostinger VPS with SSH access (IP address and root password)
- [ ] Ubuntu 22.04 or 24.04 installed
- [ ] Domain name(s) ready (e.g., posp.example.com, api.posp.example.com)
- [ ] Production PostgreSQL database ready and accessible
- [ ] Microsoft Azure App Registration configured for production redirect URIs

---

## Phase 1: Prepare Your Local Machine (Before Deployment)

### Step 1.1: Create Production Environment Files

On your LOCAL machine (Windows):

#### Create `.env.prod`
```bash
# In your project root directory
# Copy from template:
copy .env.prod.example .env.prod
```

**Edit `.env.prod` with your Hostinger details:**
```
DOMAIN_APP=posp.example.com
DOMAIN_API=api.posp.example.com

NEXT_PUBLIC_API_BASE_URL=https://api.posp.example.com/api/v1
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=cda4551f-ec13-43cd-a643-31b6e6d2b3e9
NEXT_PUBLIC_MICROSOFT_TENANT_ID=b60a0c65-a3a1-4652-a271-786595256530
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://posp.example.com/auth/callback
```

#### Create `apps/api/.env.prod`
```bash
# In your project root directory
# Copy from template:
copy apps/api\.env.prod.example apps/api/.env.prod
```

**Edit `apps/api/.env.prod` with your production database:**
```
NODE_ENV=production
DATABASE_URL=postgres://produser:prodpassword@your-db-host:5432/prod_posp_db
DB_SSL_MODE=require
DB_POOL_MIN=2
DB_POOL_MAX=20

MICROSOFT_CLIENT_ID=cda4551f-ec13-43cd-a643-31b6e6d2b3e9
MICROSOFT_TENANT_ID=b60a0c65-a3a1-4652-a271-786595256530
MICROSOFT_ALLOWED_TENANT_IDS=b60a0c65-a3a1-4652-a271-786595256530
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/b60a0c65-a3a1-4652-a271-786595256530

APP_JWT_ISSUER=digi-posp-api
APP_JWT_AUDIENCE=digi-posp-web
APP_JWT_SECRET=<GENERATE A NEW SECURE SECRET>
APP_JWT_EXPIRES_IN_SECONDS=3600

CORS_ALLOWED_ORIGINS=https://posp.example.com
LOG_LEVEL=info
SLOW_QUERY_THRESHOLD_MS=500

ENABLE_PASSWORD_LOGIN=false

PERFIOS_API_BASE_URL=https://uat-hub.perfios.com
PERFIOS_API_KEY=<YOUR_KEY_HERE>

NAME_MATCH_GREEN_THRESHOLD=70
NAME_MATCH_ORANGE_THRESHOLD=50
```

**Generate a NEW JWT Secret for production:**
```powershell
# In PowerShell:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

✅ **Important:** Do NOT commit these `.env.prod` files to git — they contain secrets!

---

## Phase 2: Prepare Hostinger VPS

### Step 2.1: Connect to Your VPS via SSH

```bash
# From your local machine (PowerShell or Git Bash)
ssh root@YOUR_HOSTINGER_IP_ADDRESS

# Example:
ssh root@203.0.113.45
```

When prompted, enter your Hostinger root password.

### Step 2.2: Install Required Software

Once connected to your VPS, run these commands:

```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify Docker installation
docker --version
docker compose version
```

### Step 2.3: Prepare Directories

```bash
# Create project directory
mkdir -p /opt/posp_app
cd /opt/posp_app

# Create directories for Caddy SSL certificates
mkdir -p /data/caddy

# Set permissions
chmod 755 /data/caddy
```

---

## Phase 3: Clone and Configure Repository

### Step 3.1: Clone the GitHub Repository

```bash
# Clone your repository to VPS
cd /opt/posp_app
git clone https://github.com/YOUR_USERNAME/posp_app.git .

# Verify files were cloned
ls -la
```

### Step 3.2: Copy Production Environment Files

**Option A: Upload from your local machine (Recommended)**

On your LOCAL machine, use SCP to upload the env files:

```powershell
# From PowerShell on your local machine:
scp .env.prod root@YOUR_HOSTINGER_IP:/opt/posp_app/
scp apps/api/.env.prod root@YOUR_HOSTINGER_IP:/opt/posp_app/apps/api/.env.prod
```

**Option B: Manually create on VPS**

If SCP doesn't work, create files manually on VPS:

```bash
# On VPS:
nano .env.prod
# Paste the content, then Ctrl+X → Y → Enter to save

nano apps/api/.env.prod
# Paste the content, then Ctrl+X → Y → Enter to save
```

### Step 3.3: Verify Environment Files

```bash
# On VPS, verify files exist and have content:
cat .env.prod
cat apps/api/.env.prod

# Should show your production configuration
```

---

## Phase 4: Build and Deploy

### Step 4.1: Build Docker Images

```bash
# On VPS, in /opt/posp_app directory:
cd /opt/posp_app

# Build images for production
docker compose -f docker-compose.prod.yml build

# This takes 2-3 minutes...
```

### Step 4.2: Run Database Migrations

```bash
# Migrate database schema to production database:
docker compose -f docker-compose.prod.yml run --rm api \
  /repo/node_modules/.bin/tsx scripts/migrate.ts

# You should see: "Migrations complete."
```

### Step 4.3: Start Services

```bash
# Start API, Web, and Caddy in background:
docker compose -f docker-compose.prod.yml up -d

# Verify containers started:
docker compose -f docker-compose.prod.yml ps

# All three should show "Up" status
```

---

## Phase 5: Configure DNS and HTTPS

### Step 5.1: Point Domain to Your VPS

In your domain registrar (wherever you registered your domain):

1. Go to DNS settings
2. Create/Update A records:
   ```
   Name: posp              Type: A    Value: YOUR_HOSTINGER_IP
   Name: api.posp          Type: A    Value: YOUR_HOSTINGER_IP
   
   OR use wildcard:
   Name: *.posp            Type: A    Value: YOUR_HOSTINGER_IP
   ```

3. Wait 10-30 minutes for DNS to propagate

### Step 5.2: Verify DNS Resolution

```bash
# On VPS, verify DNS is working:
nslookup posp.example.com
nslookup api.posp.example.com

# Should return your VPS IP address
```

### Step 5.3: Open Firewall Ports

```bash
# On VPS, allow HTTP and HTTPS:
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

Or in Hostinger panel, ensure ports 80/443 are open.

### Step 5.4: Caddy Certificate Auto-Provisioning

Caddy automatically provisions Let's Encrypt SSL certificates when:
1. ✅ Domains point to your VPS (DNS configured)
2. ✅ Ports 80/443 are open
3. ✅ Caddyfile has correct domain names

Check certificate status:
```bash
# On VPS:
docker compose -f docker-compose.prod.yml exec caddy caddy list-certs
```

---

## Phase 6: Verification

### Step 6.1: Check Container Logs

```bash
# View all logs:
docker compose -f docker-compose.prod.yml logs -f

# View specific service:
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f caddy
```

### Step 6.2: Test API Health

```bash
# Test API from VPS:
curl https://api.posp.example.com/health/live

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 6.3: Test Web App

```bash
# From your local browser:
https://posp.example.com

# Should load the login page with HTTPS (green lock)
```

### Step 6.4: Test Microsoft Login

1. Open https://posp.example.com in browser
2. Click "Sign in with Microsoft"
3. Login with your Azure AD account
4. Should authenticate and redirect to dashboard

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# On VPS, verify database connection:
docker compose -f docker-compose.prod.yml logs api | grep -i "database\|connection\|error"

# Check your DATABASE_URL in apps/api/.env.prod
```

### Issue: "Certificate not provisioning"

**Solution:**
```bash
# Check Caddy logs:
docker compose -f docker-compose.prod.yml logs caddy

# Ensure ports 80/443 are open:
curl http://posp.example.com

# DNS must be pointing to VPS:
nslookup posp.example.com
```

### Issue: "502 Bad Gateway"

**Solution:**
```bash
# API might not be running:
docker compose -f docker-compose.prod.yml restart api

# Check API health:
curl http://localhost:4000/health/live

# View API logs:
docker compose -f docker-compose.prod.yml logs api
```

### Issue: "Microsoft login not working"

**Solution:**
1. Verify redirect URI is registered in Azure AD:
   `https://posp.example.com/auth/callback`
2. Check CORS configuration in API logs
3. Verify environment variables match Azure App ID

---

## Maintenance

### Update Application

```bash
# On VPS:
cd /opt/posp_app

# Pull latest code:
git pull origin main

# Rebuild images:
docker compose -f docker-compose.prod.yml build --no-cache

# Start updated services:
docker compose -f docker-compose.prod.yml up -d
```

### View Logs

```bash
# Real-time logs:
docker compose -f docker-compose.prod.yml logs -f

# Last 50 lines:
docker compose -f docker-compose.prod.yml logs --tail=50

# Specific service (last hour):
docker compose -f docker-compose.prod.yml logs --since 1h api
```

### Backup Database

```bash
# Backup production database:
docker compose -f docker-compose.prod.yml exec api \
  pg_dump -U youruser -h db-host yourdb > backup-$(date +%Y%m%d).sql

# Download to local machine:
scp root@YOUR_IP:/opt/posp_app/backup-*.sql ./
```

### Stop/Restart Services

```bash
# Stop all services:
docker compose -f docker-compose.prod.yml down

# Start again:
docker compose -f docker-compose.prod.yml up -d

# Restart single service:
docker compose -f docker-compose.prod.yml restart api
```

---

## Checklist Before Going Live

- [ ] Domain names point to VPS (DNS configured)
- [ ] Ports 80/443 are open in firewall
- [ ] PostgreSQL database is running and accessible
- [ ] `.env.prod` and `apps/api/.env.prod` are uploaded
- [ ] Docker images built successfully
- [ ] Database migrations completed
- [ ] Containers are running and healthy
- [ ] SSL certificate provisioned (Caddy shows cert)
- [ ] API responds at https://api.yourdomain.com/health/live
- [ ] Web app loads at https://yourdomain.com
- [ ] Microsoft login redirect URI registered in Azure AD
- [ ] Test Microsoft login works
- [ ] Password login disabled in production (ENABLE_PASSWORD_LOGIN=false)

---

## File Structure on VPS

```
/opt/posp_app/
├── .env.prod                      ← Production root config
├── docker-compose.prod.yml        ← Production compose file
├── Caddyfile                      ← Reverse proxy config
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   └── .env.prod             ← Production API config
│   └── web/
│       └── Dockerfile
├── packages/
└── ...
```

---

## Getting Help

If you encounter issues:
1. Check container logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify environment files are correct
3. Check DNS resolution: `nslookup yourdomain.com`
4. Verify database connection
5. Check Caddy certificate status

---

**You're ready to deploy!** 🚀

Follow these steps in order, and your app will be running on Hostinger with automatic HTTPS.
