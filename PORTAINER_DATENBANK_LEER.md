# 🔍 Datenbank ist leer - Import prüfen

## ⚠️ Problem

- `DATABASE_URL` ist gesetzt ✅
- Aber Login-Codes werden nicht gefunden ❌
- Datenbank ist leer oder nicht importiert

## 🔍 Schritt 1: Prüfe ob backup_latest.db im Container ist

**In Container-Console:**

```bash
ls -lh /app/backup_latest.db
```

**Sollte zeigen:**
- Datei existiert
- Größe: ~1.6 MB

## 🔍 Schritt 2: Prüfe ob dev.db existiert und wie groß sie ist

**In Container-Console:**

```bash
ls -lh /app/server/prisma/dev.db
```

**Wenn Datei existiert aber klein ist (< 100 KB):**
- Datenbank wurde nicht vollständig importiert
- Lösung: Datei löschen und Container neu starten

## 🔍 Schritt 3: Prüfe Datenbank-Inhalt

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.user.count(),
  prisma.learningGroup.count(),
  prisma.user.findFirst()
]).then(([userCount, groupCount, firstUser]) => {
  console.log('\\n📊 Datenbank-Status:');
  console.log('  Benutzer:', userCount, '(sollte 61 sein)');
  console.log('  LearningGroups:', groupCount, '(sollte 6 sein)');
  console.log('  Erster Benutzer:', firstUser ? firstUser.name + ' (' + firstUser.loginCode + ')' : 'Keine');
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 🔧 Lösung: Datenbank löschen und neu importieren

**In Container-Console:**

```bash
# 1. Datenbank löschen
rm /app/server/prisma/dev.db

# 2. Container neu starten (von außen in Portainer)
```

**Oder Stack neu deployen:**
1. Portainer.io → Stacks → `johnnymonkey`
2. Editor → Pull and redeploy

## ✅ Erwartetes Ergebnis nach Neustart

In den Logs solltest du sehen:
```
📥 Found backup_latest.db, importing...
✅ Database imported from backup_latest.db
📊 Database contains: 61 users, 6 groups
```

Dann sollte Login funktionieren!

