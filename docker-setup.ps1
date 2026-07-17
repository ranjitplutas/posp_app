# Docker setup for POSP Admin (remote PostgreSQL)

Write-Host "POSP Admin - Docker Setup (Remote Database)" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Check Docker
try {
    docker --version | Out-Null
    docker compose version | Out-Null
}
catch {
    Write-Host "ERROR: Docker not installed" -ForegroundColor Red
    exit 1
}

Write-Host "Docker found" -ForegroundColor Green
Write-Host ""

# Create env files if missing
if (!(Test-Path "apps/api/.env")) {
    Copy-Item "apps/api/.env.example" "apps/api/.env"
    Write-Host "Created apps/api/.env" -ForegroundColor Yellow
}

if (!(Test-Path "apps/web/.env.local")) {
    Copy-Item "apps/web/.env.local.example" "apps/web/.env.local"
    Write-Host "Created apps/web/.env.local" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "DATABASE CONFIGURATION REQUIRED" -ForegroundColor Yellow
Write-Host "Edit apps/api/.env and set:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=postgres://user:password@host:port/database" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Is DATABASE_URL updated in apps/api/.env? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Please update DATABASE_URL first" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Building images..." -ForegroundColor Yellow
docker compose build

Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Yellow
docker compose run --rm api /repo/node_modules/.bin/tsx scripts/migrate.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migrations failed - check database connection" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker compose up -d

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API:     http://localhost:4000/api/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Commands:" -ForegroundColor Cyan
Write-Host "  Logs:          docker compose logs -f" -ForegroundColor White
Write-Host "  Stop:          docker compose down" -ForegroundColor White
Write-Host "  Restart API:   docker compose restart api" -ForegroundColor White
Write-Host "  Restart Web:   docker compose restart web" -ForegroundColor White
Write-Host ""
