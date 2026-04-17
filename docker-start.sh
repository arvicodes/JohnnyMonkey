#!/bin/sh

# Docker-optimiertes Start-Skript für JohnnyMonkey
# Dieses Skript ist für Container-Umgebungen optimiert

set -e

echo "🐵 Starting JohnnyMonkey in Docker container..."

# Prisma Client generieren - IMMER neu generieren, um sicherzustellen, dass Schema aktuell ist
cd /app/server
# Erzwinge einen stabilen SQLite-Pfad im Container (unabhängig von Compose-Overrides)
export DATABASE_URL="file:./prisma/dev.db"
echo "📦 Generating Prisma client..."
# Verwende explizit schema.prisma (enthält seatingOrder und statisticsOrder)
if [ -f "prisma/schema.prisma" ]; then
  npx prisma generate --schema=prisma/schema.prisma || {
    echo "⚠️  Prisma generate failed, trying without explicit schema..."
    npx prisma generate || echo "⚠️  Prisma generate failed completely"
  }
else
  echo "ℹ️  prisma/schema.prisma not found at runtime, using bundled Prisma Client"
fi

# Datenbank initialisieren oder aktualisieren
SHOULD_IMPORT=false

if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  Database file not found, checking for backup..."
    SHOULD_IMPORT=true
elif [ -f "/app/backup_latest.db" ]; then
    # Prüfe ob backup_latest.db neuer ist als dev.db
    BACKUP_TIME=$(stat -c %Y /app/backup_latest.db 2>/dev/null || stat -f %m /app/backup_latest.db 2>/dev/null || echo 0)
    DB_TIME=$(stat -c %Y prisma/dev.db 2>/dev/null || stat -f %m prisma/dev.db 2>/dev/null || echo 0)
    
    if [ "$BACKUP_TIME" -gt "$DB_TIME" ]; then
        echo "🔄 backup_latest.db is newer than dev.db, will import..."
        SHOULD_IMPORT=true
    fi
    
    # Erzwinge Import wenn Umgebungsvariable gesetzt ist
    if [ "$FORCE_DB_IMPORT" = "true" ]; then
        echo "🔄 FORCE_DB_IMPORT=true, forcing import..."
        SHOULD_IMPORT=true
    fi
fi

if [ "$SHOULD_IMPORT" = "true" ] && [ -f "/app/backup_latest.db" ]; then
    echo "📥 Importing backup_latest.db..."
    cp /app/backup_latest.db prisma/dev.db
    echo "✅ Database imported from backup_latest.db"
    echo "🔄 Adding missing columns if needed..."
    # Füge nur fehlende Spalten hinzu - KEIN db push (würde Daten löschen!)
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
        } else {
          console.log('ℹ️  period1Hours already exists');
        }
        if (!colNames.includes('period2Hours')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
          console.log('✅ Added period2Hours');
        } else {
          console.log('ℹ️  period2Hours already exists');
        }
        // Prüfe Datenbank-Inhalt
        const userCount = await prisma.user.count();
        const groupCount = await prisma.learningGroup.count();
        console.log('📊 Database contains:', userCount, 'users,', groupCount, 'groups');
      } catch (e) {
        if (!e.message.includes('duplicate')) console.error('Error:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    })();
    " || echo "⚠️  Column addition skipped"
    echo "✅ Database ready (no db push to preserve data)"
elif [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  No backup found, initializing new database..."
    npx prisma migrate deploy || npx prisma db push || echo "⚠️  Database initialization skipped"
fi

# Wenn Datenbank existiert (entweder importiert oder bereits vorhanden)
if [ -f "prisma/dev.db" ]; then
    echo "✅ Database file exists"
    echo "🔄 Adding missing columns if needed..."
    # Füge nur fehlende Spalten hinzu - KEIN db push (würde Daten löschen!)
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
        } else {
          console.log('ℹ️  period1Hours already exists');
        }
        if (!colNames.includes('period2Hours')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
          console.log('✅ Added period2Hours');
        } else {
          console.log('ℹ️  period2Hours already exists');
        }
        if (!colNames.includes('seatingOrder')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN seatingOrder TEXT\`;
          console.log('✅ Added seatingOrder');
        } else {
          console.log('ℹ️  seatingOrder already exists');
        }
        if (!colNames.includes('statisticsOrder')) {
          await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN statisticsOrder TEXT\`;
          console.log('✅ Added statisticsOrder');
        } else {
          console.log('ℹ️  statisticsOrder already exists');
        }
        // Prüfe Datenbank-Inhalt
        const userCount = await prisma.user.count();
        const groupCount = await prisma.learningGroup.count();
        console.log('📊 Database contains:', userCount, 'users,', groupCount, 'groups');
      } catch (e) {
        if (!e.message.includes('duplicate')) console.error('Error:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    })();
    " || echo "⚠️  Column addition skipped"
    echo "✅ Database ready (no db push to preserve data)"
fi

# Server starten
echo "🚀 Starting server on port ${PORT:-3000}..."
NODE_ENV=production node dist/index.js

