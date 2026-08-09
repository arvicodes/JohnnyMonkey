#!/bin/sh

# Docker-optimiertes Start-Skript für JohnnyMonkey
# Dieses Skript ist für Container-Umgebungen optimiert

set -e

echo "🐵 Starting JohnnyMonkey in Docker container..."

cd /app/server

# Persistente DB liegt im Volume /app/server/data — NICHT unter prisma/,
# sonst überschreibt das Volume schema.prisma und der Prisma-Client wird unvollständig.
mkdir -p /app/server/data

# Migration: altes Volume hing früher auf prisma/ → Dateien liegen nach Remount unter data/
if [ ! -f /app/server/data/dev.db ]; then
  if [ -f /app/server/prisma/dev.db ]; then
    echo "📦 Migriere dev.db von prisma/ nach data/..."
    cp /app/server/prisma/dev.db /app/server/data/dev.db
  elif [ -f /app/backup_latest.db ]; then
    echo "📥 Importiere backup_latest.db nach data/..."
    cp /app/backup_latest.db /app/server/data/dev.db
  fi
fi

export DATABASE_URL="file:/app/server/data/dev.db"

echo "📦 Generating Prisma client..."
# Schema kommt immer aus dem Image (prisma/ wird nicht mehr vom DB-Volume überdeckt)
if [ -f "prisma/schema.prisma" ]; then
  npx prisma generate --schema=prisma/schema.prisma || {
    echo "⚠️  Prisma generate failed, trying without explicit schema..."
    npx prisma generate || echo "⚠️  Prisma generate failed completely"
  }
else
  echo "ℹ️  prisma/schema.prisma not found at runtime, using bundled Prisma Client"
fi

SHOULD_IMPORT=false
if [ ! -f /app/server/data/dev.db ]; then
  SHOULD_IMPORT=true
elif [ "$FORCE_DB_IMPORT" = "true" ] && [ -f /app/backup_latest.db ]; then
  echo "🔄 FORCE_DB_IMPORT=true, forcing import..."
  SHOULD_IMPORT=true
fi

if [ "$SHOULD_IMPORT" = "true" ] && [ -f /app/backup_latest.db ]; then
  echo "📥 Importing backup_latest.db..."
  cp /app/backup_latest.db /app/server/data/dev.db
  ls -lh /app/backup_latest.db /app/server/data/dev.db || true
  echo "✅ Database imported from backup_latest.db"
fi

if [ ! -f /app/server/data/dev.db ]; then
  echo "🗄️  No database found, initializing..."
  npx prisma db push --schema=prisma/schema.prisma --skip-generate || echo "⚠️  Database initialization skipped"
fi

if [ -f /app/server/data/dev.db ]; then
  echo "✅ Database file exists at /app/server/data/dev.db"
  echo "🔄 Adding missing columns/tables if needed..."
  node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  (async () => {
    try {
      const columns = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
      const colNames = columns.map(c => c.name);
      const addCol = async (name, sql) => {
        if (!colNames.includes(name)) {
          await prisma.\$executeRawUnsafe(sql);
          console.log('✅ Added ' + name);
        } else {
          console.log('ℹ️  ' + name + ' already exists');
        }
      };
      await addCol('period1Hours', 'ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER');
      await addCol('period2Hours', 'ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER');
      await addCol('seatingOrder', 'ALTER TABLE LearningGroup ADD COLUMN seatingOrder TEXT');
      await addCol('statisticsOrder', 'ALTER TABLE LearningGroup ADD COLUMN statisticsOrder TEXT');

      // Schedule-/AutoLesson-Tabellen (falls DB älter als Schema)
      await prisma.\$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS TeacherScheduleSettings (
          id TEXT PRIMARY KEY NOT NULL,
          teacherId TEXT NOT NULL UNIQUE,
          startWindowMinutes INTEGER NOT NULL DEFAULT 5,
          endWindowMinutes INTEGER NOT NULL DEFAULT 5,
          periodTimes TEXT NOT NULL DEFAULT '[]',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      \`);
      await prisma.\$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS ScheduleSlot (
          id TEXT PRIMARY KEY NOT NULL,
          teacherId TEXT NOT NULL,
          groupId TEXT NOT NULL,
          dayOfWeek INTEGER NOT NULL,
          periodNumber INTEGER NOT NULL,
          lessonPath TEXT,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      \`);
      await prisma.\$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS AutoLessonSession (
          id TEXT PRIMARY KEY NOT NULL,
          teacherId TEXT NOT NULL,
          groupId TEXT NOT NULL,
          sessionDate TEXT NOT NULL,
          dayOfWeek INTEGER NOT NULL,
          periodNumber INTEGER NOT NULL,
          lessonPath TEXT,
          opensAt DATETIME NOT NULL,
          startsAt DATETIME NOT NULL,
          endsAt DATETIME NOT NULL,
          closesAt DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'OPEN',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      \`);

      const userCount = await prisma.user.count();
      const groupCount = await prisma.learningGroup.count();
      console.log('📊 Database contains:', userCount, 'users,', groupCount, 'groups');
      if (prisma.teacherScheduleSettings) {
        console.log('✅ Prisma model teacherScheduleSettings available');
      } else {
        console.warn('⚠️  Prisma model teacherScheduleSettings MISSING after generate');
      }
    } catch (e) {
      if (!String(e.message || e).includes('duplicate')) console.error('Error:', e.message || e);
    } finally {
      await prisma.\$disconnect();
    }
  })();
  " || echo "⚠️  Column/table addition skipped"
  echo "✅ Database ready (no db push to preserve data)"
fi

echo "🚀 Starting server on port ${PORT:-3000}..."
NODE_ENV=production DATABASE_URL="$DATABASE_URL" node dist/index.js
