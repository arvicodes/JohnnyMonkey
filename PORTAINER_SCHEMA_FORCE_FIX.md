# 🔧 Schema-Force-Fix: Fehlende Spalten definitiv hinzufügen

## ⚠️ Problem

Die Spalten `period1Hours` und `period2Hours` fehlen weiterhin, obwohl sie im Schema definiert sind.

## 🔍 Schritt 1: Prüfe ob Spalte wirklich fehlt

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`.then(columns => {
  console.log('\\n📋 LearningGroup Spalten:');
  columns.forEach(col => console.log(\`  - \${col.name} (\${col.type})\`));
  
  const hasPeriod1 = columns.some(col => col.name === 'period1Hours');
  const hasPeriod2 = columns.some(col => col.name === 'period2Hours');
  
  console.log('\\nperiod1Hours vorhanden:', hasPeriod1 ? '✅' : '❌');
  console.log('period2Hours vorhanden:', hasPeriod2 ? '✅' : '❌');
  
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 🔧 Schritt 2: Spalte definitiv hinzufügen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  try {
    // Prüfe ob Spalte existiert
    const columns = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
    const hasPeriod1 = columns.some(col => col.name === 'period1Hours');
    const hasPeriod2 = columns.some(col => col.name === 'period2Hours');
    
    if (!hasPeriod1) {
      await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER\`;
      console.log('✅ period1Hours hinzugefügt');
    } else {
      console.log('ℹ️  period1Hours existiert bereits');
    }
    
    if (!hasPeriod2) {
      await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
      console.log('✅ period2Hours hinzugefügt');
    } else {
      console.log('ℹ️  period2Hours existiert bereits');
    }
    
    // Prüfe erneut
    const columnsAfter = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
    console.log('\\n📋 Aktuelle Spalten:');
    columnsAfter.forEach(col => {
      if (col.name.includes('period')) {
        console.log(\`  ✅ \${col.name} (\${col.type})\`);
      }
    });
    
  } catch (e) {
    console.error('❌ Fehler:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}

addColumns();
"
```

## 🔄 Schritt 3: Prisma Client neu generieren

**In Container-Console:**

```bash
cd /app/server
npx prisma generate
```

## 🚀 Schritt 4: Container neu starten

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app** → **Restart**
2. Warte 30-60 Sekunden
3. Prüfe Logs

## 🐛 Falls es immer noch nicht funktioniert

### Option A: Datenbank komplett neu erstellen (⚠️ Löscht Daten!)

```bash
cd /app/server/prisma

# Backup erstellen
cp dev.db dev.db.backup

# Datenbank löschen
rm dev.db

# Neu erstellen
cd /app/server
npx prisma migrate deploy
npx prisma generate

# Datenbank wiederherstellen (wenn gewünscht)
# cp dev.db.backup dev.db
# Dann Spalten hinzufügen (siehe Schritt 2)
```

### Option B: Prisma db push mit Force

```bash
cd /app/server
npx prisma db push --force-reset --accept-data-loss
npx prisma generate
```

**⚠️ Vorsicht:** Das löscht alle Daten!

### Option C: Migration manuell erstellen

```bash
cd /app/server
npx prisma migrate dev --name add_period_hours_to_learning_group --create-only
```

Dann die Migration-Datei bearbeiten und ausführen.

## 📋 Debugging: Prüfe was wirklich passiert

**In Container-Console:**

```bash
cd /app/server

# 1. Prüfe Schema-Datei
grep -A 5 "period1Hours" prisma/schema.prisma

# 2. Prüfe Datenbank-Struktur
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT sql FROM sqlite_master WHERE type='table' AND name='LearningGroup'\`.then(result => {
  console.log('LearningGroup CREATE Statement:');
  console.log(result[0].sql);
  prisma.\$disconnect();
});
"

# 3. Prüfe Prisma Client
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Prisma Client Model:', Object.keys(prisma));
prisma.\$disconnect();
"
```

## ✅ Erwartetes Ergebnis

Nach erfolgreichem Fix:
- ✅ `period1Hours` Spalte in LearningGroup vorhanden
- ✅ `period2Hours` Spalte in LearningGroup vorhanden
- ✅ Keine Fehler mehr in Logs
- ✅ LearningGroup-Abfragen funktionieren

---

**Wichtig:** Führe Schritt 2 aus und teile die Ausgabe mit mir, dann kann ich sehen, ob die Spalte wirklich hinzugefügt wurde!

