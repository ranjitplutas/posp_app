# POSP Deployment to Hostinger VPS - Step-by-Step Guide

**VPS Details:**
- IP: 187.127.136.179
- Root Password: 5@UCSFIE@MwxU3n9dCsr
- Location: /opt/app (careful - other apps are there!)
- Main Domain: posp.digisafe.co.in
- API Domain: pospapi.digisafe.co.in
- Ports: 80 & 3000 in use → using 8081, 8082, 8443

---

## PHASE 1: Upload Environment Files from Local Machine

### Step 1: Open PowerShell on Your Local Machine

```powershell
# Navigate to your project directory
cd D:\plutas\posp

# Upload environment files using SCP
scp .env.prod root@187.127.136.179:/opt/app/posp_app/
scp apps/api/.env.prod root@187.127.136.179:/opt/app/posp_app/apps/api/.env.prod

# When prompted for password, enter: 5@UCSFIE@MwxU3n9dCsr
```

**Files being uploaded:**
- `.env.prod` — Root environment with domains
- `apps/api/.env.prod` — API environment with database credentials

---

## PHASE 2: SSH into Your VPS and Setup

### Step 2.1: Connect to VPS

```bash
# Open PowerShell or Git Bash on your local machine
ssh root@187.127.136.179

# When prompted for password, enter: 5@UCSFIE@MwxU3n9dCsr
```

You should see: `root@vps-id:~#`

### Step 2.2: Navigate to Project Location (IMPORTANT - Don't delete other apps!)

```bash
# List what's in /opt/app to see other applications
ls -la /opt/app

# Create posp_app directory if it doesn't exist
mkdir -p /opt/app/posp_app
cd /opt/app/posp_app

# Verify you're in the right place
pwd
# Should output: /opt/app/posp_app
```

### Step 2.3: Install Docker and Docker Compose (if not installed)

```bash
# Check if Docker is installed
docker --version
docker compose version

# If not installed, run:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker
systemctl start docker
systemctl enable docker
```

### Step 2.4: Clone Repository

```bash
# Clone your repository
git clone https://github.com/ranjitplutas/posp_app.git .

# Verify files are there
ls -la
# Should show: docker-compose.prod-custom.yml, apps/, packages/, etc.
```

### Step 2.5: Verify Environment Files Were Uploaded

```bash
# Check if .env.prod exists
cat .env.prod

# Check if apps/api/.env.prod exists
cat apps/api/.env.prod

# Both should show your production configuration
```

---

## PHASE 3: Build and Deploy

### Step 3.1: Build Docker Images

```bash
# Build images using custom ports config
docker compose -f docker-compose.prod-custom.yml build

# This takes 3-5 minutes...
# Wait for "Image posp-api Built" and "Image posp-web Built"
```

### Step 3.2: Run Database Migrations

```bash
# Run migrations to create/update database schema
docker compose -f docker-compose.prod-custom.yml run --rm api \
  /repo/node_modules/.bin/tsx scripts/migrate.ts

# You should see:
# INFO: Skipping already-applied migration: ...
# INFO: Migrations complete.
```

### Step 3.3: Start Services

```bash
# Start all containers in background
docker compose -f docker-compose.prod-custom.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod-custom.yml ps

# Should show 3 containers: api, web, caddy - all "Up"
```

### Step 3.4: Check Logs

```bash
# View startup logs
docker compose -f docker-compose.prod-custom.yml logs

# If there are errors, check specific service:
docker compose -f docker-compose.prod-custom.yml logs api
docker compose -f docker-compose.prod-custom.yml logs web
```

---

## PHASE 4: Configure DNS and Firewall

### Step 4.1: Point Domains to Your VPS

In your Hostinger control panel or domain registrar:

1. Go to DNS settings for digisafe.co.in
2. Update A records:
   ```
   posp.digisafe.co.in      A Record    187.127.136.179
   pospapi.digisafe.co.in   A Record    187.127.136.179
   ```
3. Save changes
4. Wait 5-15 minutes for DNS to propagate

### Step 4.2: Verify DNS Resolution

```bash
# On VPS, test DNS resolution
nslookup posp.digisafe.co.in
nslookup pospapi.digisafe.co.in

# Should return: 187.127.136.179
```

### Step 4.3: Open Firewall Ports

```bash
# On VPS, open ports for your app
ufw allow 8081/tcp
ufw allow 8082/tcp
ufw allow 8443/tcp

# Verify UFW is enabled
ufw status
```

Or in Hostinger control panel, allow ports: 8081, 8082, 8443

---

## PHASE 5: Test Deployment

### Step 5.1: Test API Health

```bash
# From VPS command line
curl http://localhost:8081/api/v1/health/live

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 5.2: Test Web App

```bash
# From your local machine browser
# Open: http://187.127.136.179:8082

# Should show POSP Admin login page
```

### Step 5.3: Test Reverse Proxy (Caddy)

```bash
# From VPS
curl http://localhost:8443/health/live

# Should return API health
```

---

## PHASE 6: Setup HTTPS (Important!)

**Current Setup:**
- API running on: http://localhost:8081
- Web running on: http://localhost:8082  
- Caddy (reverse proxy) on: port 8443

**Since port 80 is occupied**, you need to configure HTTPS manually:

### Option A: Use Nginx/Apache as Main Reverse Proxy

If you have Nginx or Apache running on your VPS (on port 80), configure it to proxy to Caddy:

```bash
# Example Nginx config (if you have Nginx):
upstream posp_caddy {
    server 127.0.0.1:8443;
}

server {
    listen 443 ssl;
    server_name posp.digisafe.co.in pospapi.digisafe.co.in;
    
    # Your SSL certificates here
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass https://posp_caddy;
        proxy_ssl_verify off;
    }
}
```

### Option B: Update Caddy Configuration for DNS Challenge

Edit Caddyfile to use DNS-01 challenge (for Let's Encrypt without port 80):

```bash
# On VPS
nano Caddyfile

# Modify to use DNS challenge:
posp.digisafe.co.in {
    tls {
        dns duckdns <your-token>  # or your DNS provider
    }
    reverse_proxy web:3000
}

pospapi.digisafe.co.in {
    tls {
        dns duckdns <your-token>
    }
    reverse_proxy api:4000
}
```

Then restart: `docker compose -f docker-compose.prod-custom.yml restart caddy`

### Option C: For Now - Access via Custom Port

Until you setup proper reverse proxy:

```bash
# Access via custom port with self-signed cert warning:
https://187.127.136.179:8443 (accept self-signed cert warning)

# Or via IP with port 8082 (plain HTTP):
http://187.127.136.179:8082
```

---

## Verification Checklist

- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to /opt/app/posp_app
- [ ] `.env.prod` and `apps/api/.env.prod` uploaded
- [ ] Docker images built successfully
- [ ] Database migrations completed
- [ ] All 3 containers running (api, web, caddy)
- [ ] DNS records point to VPS IP
- [ ] Ports 8081, 8082, 8443 are open in firewall
- [ ] API responds at: http://localhost:8081/api/v1/health/live
- [ ] Can test via: http://187.127.136.179:8082
- [ ] Microsoft login redirect URIs registered in Azure AD

---

## Useful Commands for Future Use

### View Logs

```bash
# All services
docker compose -f docker-compose.prod-custom.yml logs -f

# Specific service
docker compose -f docker-compose.prod-custom.yml logs -f api
docker compose -f docker-compose.prod-custom.yml logs -f web
docker compose -f docker-compose.prod-custom.yml logs -f caddy

# Last 50 lines
docker compose -f docker-compose.prod-custom.yml logs --tail=50
```

### Stop/Start Services

```bash
# Stop all
docker compose -f docker-compose.prod-custom.yml down

# Start all
docker compose -f docker-compose.prod-custom.yml up -d

# Restart single service
docker compose -f docker-compose.prod-custom.yml restart api
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker compose -f docker-compose.prod-custom.yml build --no-cache

# Restart services
docker compose -f docker-compose.prod-custom.yml up -d
```

### View Container Status

```bash
docker compose -f docker-compose.prod-custom.yml ps
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find what's using port 8081
lsof -i :8081

# If needed, use different ports in docker-compose.prod-custom.yml
```

### Cannot Connect to Database
```bash
# Check API logs
docker compose -f docker-compose.prod-custom.yml logs api | grep -i database

# Verify DATABASE_URL in apps/api/.env.prod
cat apps/api/.env.prod | grep DATABASE_URL
```

### DNS Not Resolving
```bash
# Test from VPS
nslookup posp.digisafe.co.in

# Wait 10-15 minutes if just updated
# Or check your registrar's DNS propagation
```

### HTTPS Certificate Issues
Caddy needs either:
1. Port 80 available (HTTP challenge)
2. DNS challenge configured
3. Existing certificates

For now, use HTTP on custom port or accept self-signed cert warning.

---

## Next: Configure Proper HTTPS

After deployment works, you should:

1. **Disable password login** (already set to false)
2. **Setup proper HTTPS**:
   - Option A: Configure main reverse proxy (Nginx/Apache)
   - Option B: Configure Caddy DNS challenge
   - Option C: Use self-signed certs temporarily

3. **Test Microsoft Login** at your domain

4. **Monitor logs regularly**:
   ```bash
   docker compose -f docker-compose.prod-custom.yml logs -f
   ```

---

## Questions Before Deploying?

Before you start, confirm:
- [ ] You have SSH access (password: 5@UCSFIE@MwxU3n9dCsr)
- [ ] You have git installed on VPS
- [ ] You can access /opt/app directory
- [ ] DNS records will be updated
- [ ] You understand custom ports (8081, 8082, 8443)

**Ready to deploy?** Follow the steps above in order! 🚀
