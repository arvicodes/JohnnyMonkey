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
    echo "🗄️  Database file not found, checking for backup..."
    
    # Prüfe ob backup_latest.db existiert (aus Git-Repository)
    if [ -f "/app/backup_latest.db" ]; then
        echo "📥 Found backup_latest.db, importing..."
        cp /app/backup_latest.db prisma/dev.db
        echo "✅ Database imported from backup_latest.db"
    else
        echo "🗄️  No backup found, initializing new database..."
        npx prisma migrate deploy || npx prisma db push || echo "⚠️  Database initialization skipped"
    fi
else
    echo "✅ Database file exists"
fi

# Server starten
echo "🚀 Starting server on port ${PORT:-3000}..."
NODE_ENV=production node dist/index.js

