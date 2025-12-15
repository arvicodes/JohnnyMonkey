#!/bin/sh

# Docker-optimiertes Start-Skript für JohnnyMonkey
# Dieses Skript ist für Container-Umgebungen optimiert

set -e

echo "🐵 Starting JohnnyMonkey in Docker container..."

# Prisma Client generieren
cd /app/server
echo "📦 Generating Prisma client..."
npx prisma generate

# Datenbank initialisieren (falls nicht vorhanden)
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  Initializing database..."
    npx prisma migrate deploy || npx prisma db push || echo "⚠️  Database initialization skipped"
else
    echo "✅ Database file exists"
fi

# Server starten
echo "🚀 Starting server on port ${PORT:-3000}..."
NODE_ENV=production node dist/index.js

