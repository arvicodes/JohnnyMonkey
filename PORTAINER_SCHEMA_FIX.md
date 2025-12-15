# 🔧 Schema-Fehler beheben: Fehlende Spalten/Tabellen

## ⚠️ Problem

Nach `prisma db push` fehlen immer noch:
- `LearningGroup.period1Hours` Spalte
- `DocumentProcessingHistory` Tabelle
- `FlashcardDeck` Tabelle

## 🔍 Schritt 1: Datenbank-Struktur prüfen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Prüfe LearningGroup Struktur
prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`.then(columns => {
  console.log('\\n📋 LearningGroup Spalten:');
  columns.forEach(col => console.log(\`  - \${col.name} (\${col.type})\`));
  
  // Prüfe ob period1Hours existiert
  const hasPeriod1Hours = columns.some(col => col.name === 'period1Hours');
  console.log('\\nperiod1Hours vorhanden:', hasPeriod1Hours ? '✅' : '❌');
  
  return prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 🔧 Schritt 2: Schema manuell aktualisieren

**Option A: Prisma db push mit Reset (⚠️ Vorsicht: Kann Daten löschen)**

```bash
cd /app/server
npx prisma db push --accept-data-loss
```

**Option B: SQL direkt ausführen**

```bash
cd /app/server/prisma
sqlite3 dev.db
```

**Dann im SQLite:**

```sql
-- Prüfe aktuelle Struktur
.schema LearningGroup

-- Füge fehlende Spalte hinzu (falls nicht vorhanden)
ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER;

-- Prüfe andere Tabellen
.tables

-- Prüfe ob DocumentProcessingHistory existiert
.schema DocumentProcessingHistory
```

## 🚀 Schritt 3: Prisma Schema prüfen

**In Container-Console:**

```bash
cd /app/server
cat prisma/schema.prisma | grep -A 20 "model LearningGroup"
```

**Prüfe ob `period1Hours` im Schema definiert ist.**

## 🔧 Schritt 4: Force Reset (⚠️ Letzte Option)

**Wenn nichts anderes funktioniert:**

```bash
cd /app/server

# Backup der aktuellen DB
cp prisma/dev.db prisma/dev.db.backup

# Force Reset (⚠️ Löscht alle Daten!)
npx prisma migrate reset --force

# Dann Datenbank neu importieren
cp /app/backup_latest.db prisma/dev.db

# Schema aktualisieren
npx prisma db push

# Prisma Client neu generieren
npx prisma generate
```

## 📋 Schritt 5: Prüfe ob Schema aktuell ist

**In Container-Console:**

```bash
cd /app/server
npx prisma db pull

# Vergleiche mit schema.prisma
# Falls Unterschiede → prisma db push
```

## 🐛 Häufige Probleme

### Problem 1: Schema-Datei nicht aktuell

**Lösung:**
```bash
cd /app/server
git pull  # Hole neuestes Schema
npx prisma generate
npx prisma db push
```

### Problem 2: Migrations nicht angewendet

**Lösung:**
```bash
cd /app/server
npx prisma migrate resolve --applied <migration-name>
npx prisma migrate deploy
```

### Problem 3: Datenbank-Datei korrupt

**Lösung:**
```bash
cd /app/server/prisma
sqlite3 dev.db "VACUUM;"
```

## ✅ Erwartetes Ergebnis

Nach erfolgreichem Fix:
- ✅ `LearningGroup.period1Hours` Spalte vorhanden
- ✅ `DocumentProcessingHistory` Tabelle vorhanden
- ✅ `FlashcardDeck` Tabelle vorhanden
- ✅ Keine Schema-Fehler mehr in Logs

---

**Wichtig:** Erstelle immer ein Backup vor Schema-Änderungen!

