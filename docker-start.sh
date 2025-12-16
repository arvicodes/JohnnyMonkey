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
        echo "🔄 Updating database schema to match current Prisma schema..."
        # Füge fehlende Spalten direkt hinzu (falls db push sie nicht hinzufügt)
        node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        (async () => {
          try {
            const columns = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
            const colNames = columns.map(c => c.name);
            if (!colNames.includes('period1Hours')) {
              await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER\`;
              console.log('✅ Added period1Hours');
            }
            if (!colNames.includes('period2Hours')) {
              await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
              console.log('✅ Added period2Hours');
            }
          } catch (e) {
            if (!e.message.includes('duplicate')) console.error('Error:', e.message);
          } finally {
            await prisma.\$disconnect();
          }
        })();
        " || echo "⚠️  Column addition skipped"
        # Nur Schema aktualisieren, KEINE Daten löschen!
        npx prisma db push --skip-generate --accept-data-loss || echo "⚠️  Schema update failed, but continuing..."
    else
        echo "🗄️  No backup found, initializing new database..."
        npx prisma migrate deploy || npx prisma db push || echo "⚠️  Database initialization skipped"
    fi
else
    echo "✅ Database file exists"
    echo "🔄 Ensuring database schema is up to date..."
    # Füge fehlende Spalten direkt hinzu (falls db push sie nicht hinzufügt)
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      try {
        const columns = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
        const colNames = columns.map(c => c.name);
        if (!colNames.includes('period1Hours')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER\`;
          console.log('✅ Added period1Hours');
        }
        if (!colNames.includes('period2Hours')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
          console.log('✅ Added period2Hours');
        }
      } catch (e) {
        if (!e.message.includes('duplicate')) console.error('Error:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    })();
    " || echo "⚠️  Column addition skipped"
    npx prisma db push --accept-data-loss || npx prisma migrate deploy || echo "⚠️  Schema update skipped"
fi

# Server starten
echo "🚀 Starting server on port ${PORT:-3000}..."
NODE_ENV=production node dist/index.js

