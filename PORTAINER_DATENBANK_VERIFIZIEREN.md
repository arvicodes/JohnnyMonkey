# 🔍 Datenbank im Container verifizieren

## ⚠️ Problem

Login funktioniert, aber:
- 0 LearningGroups (sollten 6 sein)
- STUD001 existiert nicht (sollte existieren)

## 🔍 Schritt 1: Datenbank im Container prüfen

**In Container-Console:**

```bash
cd /app/server/prisma
ls -lh dev.db
```

**Prüfe Größe:**
- Sollte ~1.6 MB sein (wie lokal)
- Wenn kleiner → Datenbank wurde nicht vollständig importiert

## 🔍 Schritt 2: Daten in Container-DB prüfen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

Promise.all([
  prisma.user.count(),
  prisma.learningGroup.count(),
  prisma.user.findUnique({ where: { loginCode: 'STUD001' } })
]).then(([userCount, groupCount, student]) => {
  console.log('\\n📊 Datenbank-Status:');
  console.log('  Benutzer:', userCount, '(sollte 61 sein)');
  console.log('  LearningGroups:', groupCount, '(sollte 6 sein)');
  console.log('  STUD001 gefunden:', student ? '✅ ' + student.name : '❌');
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 🔍 Schritt 3: Prüfe ob backup_latest.db im Container ist

**In Container-Console:**

```bash
ls -lh /app/backup_latest.db
```

**Sollte zeigen:**
- Datei existiert
- Größe: ~1.6 MB

## 🐛 Mögliche Probleme

### Problem 1: backup_latest.db fehlt im Container

**Lösung:**
- Stack neu deployen
- Prüfe ob Datei im Git-Repository ist

### Problem 2: Datenbank wird überschrieben

**Lösung:**
- `prisma db push` könnte Daten löschen
- Verwende nur `ALTER TABLE` für Spalten, nicht `db push`

### Problem 3: Datenbank wird nicht importiert

**Lösung:**
- Prüfe Container-Logs beim Start
- Suche nach: "📥 Found backup_latest.db, importing..."

## ✅ Erwartetes Ergebnis

Nach erfolgreichem Import:
- ✅ 61 Benutzer
- ✅ 6 LearningGroups
- ✅ STUD001 existiert
- ✅ period1Hours/period2Hours Spalten vorhanden

---

**Wichtig:** Prüfe zuerst, ob die Datenbank wirklich importiert wurde!


