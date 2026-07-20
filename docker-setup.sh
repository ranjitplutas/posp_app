#!/bin/bash
# Docker setup helper script for local development (Mac/Linux)
# Connects to existing remote PostgreSQL database

echo "POSP Admin - Docker Setup (Remote Database)"
echo "==========================================="
echo ""

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker found"
echo ""

# Create .env files
if [ ! -f "apps/api/.env" ]; then
    echo "Creating apps/api/.env..."
    cp apps/api/.env.example apps/api/.env
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo "Creating apps/web/.env.local..."
    cp apps/web/.env.local.example apps/web/.env.local
fi

echo ""
echo "IMPORTANT: Update your database connection"
echo "Edit: apps/api/.env"
echo "Set DATABASE_URL to your remote PostgreSQL connection string"
echo ""

# Ask user to confirm database is configured
read -p "Have you updated DATABASE_URL in apps/api/.env? (yes/no): " response
if [ "$response" != "yes" ]; then
    echo "Please update DATABASE_URL first, then run this script again"
    exit 1
fi

echo ""
echo "Building Docker images..."
docker compose build

echo ""
echo "Running database migrations..."
docker compose run --rm app /repo/node_modules/.bin/tsx apps/api/scripts/migrate.ts

if [ $? -ne 0 ]; then
    echo "WARNING: Migrations failed"
    echo "Check DATABASE_URL and verify database is accessible"
fi

echo ""
echo "Starting container..."
docker compose up -d

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Access your application:"
echo "  Web App:  http://localhost:3000"
echo "  API:      http://localhost:3000/api/v1  (proxied through the same container)"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose logs -f"
echo "  Stop:          docker compose down"
echo "  Restart:       docker compose restart app"
echo ""
