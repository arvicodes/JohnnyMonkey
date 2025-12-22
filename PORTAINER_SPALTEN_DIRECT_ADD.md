# 🔧 Spalten direkt hinzufügen - Bypass Migration

## ⚠️ Problem

Migration wird nicht als pending erkannt. Füge Spalten direkt per SQL hinzu.

## ✅ Lösung: Spalten direkt hinzufügen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumns() {
  console.log('🔧 Adding missing columns to LearningGroup...\n');
  
  // Prüfe aktuelle Spalten
  const columns = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
  const columnNames = columns.map(col => col.name);
  
  console.log('📋 Aktuelle Spalten:', columnNames.join(', '));
  console.log('');
  
  // Füge period1Hours hinzu
  if (!columnNames.includes('period1Hours')) {
    try {
      await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period1Hours INTEGER\`;
      console.log('✅ period1Hours hinzugefügt');
    } catch (e) {
      console.error('❌ Fehler beim Hinzufügen von period1Hours:', e.message);
    }
  } else {
    console.log('ℹ️  period1Hours existiert bereits');
  }
  
  // Füge period2Hours hinzu
  if (!columnNames.includes('period2Hours')) {
    try {
      await prisma.\$executeRaw\`ALTER TABLE LearningGroup ADD COLUMN period2Hours INTEGER\`;
      console.log('✅ period2Hours hinzugefügt');
    } catch (e) {
      console.error('❌ Fehler beim Hinzufügen von period2Hours:', e.message);
    }
  } else {
    console.log('ℹ️  period2Hours existiert bereits');
  }
  
  // Prüfe erneut
  console.log('\n📋 Prüfe erneut...');
  const columnsAfter = await prisma.\$queryRaw\`PRAGMA table_info(LearningGroup)\`;
  const columnNamesAfter = columnsAfter.map(col => col.name);
  
  console.log('📋 Neue Spalten:', columnNamesAfter.join(', '));
  console.log('');
  console.log('period1Hours vorhanden:', columnNamesAfter.includes('period1Hours') ? '✅' : '❌');
  console.log('period2Hours vorhanden:', columnNamesAfter.includes('period2Hours') ? '✅' : '❌');
  
  await prisma.\$disconnect();
  console.log('\n✅ Fertig!');
}

addColumns().catch(e => {
  console.error('❌ Fehler:', e);
  process.exit(1);
});
"
```

## 🔄 Nach dem Hinzufügen

**1. Prisma Client neu generieren:**

```bash
cd /app/server
npx prisma generate
```

**2. Container neu starten:**

**In Portainer.io:** Containers → `johnnymonkey-app` → Restart

## ✅ Prüfe ob es funktioniert

**Nach dem Neustart, prüfe Logs:**

Die Fehler sollten verschwunden sein:
- ❌ `The column main.LearningGroup.period1Hours does not exist` → Sollte nicht mehr erscheinen
- ✅ LearningGroup-Abfragen sollten funktionieren

---

**Wichtig:** Führe diesen Befehl aus und teile die Ausgabe mit mir!

