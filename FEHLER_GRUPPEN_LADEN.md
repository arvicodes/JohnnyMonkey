# 🔧 Fehler beim Laden der Gruppen - Lösung

## ✅ Was wurde behoben

Die Fehlerbehandlung beim Laden der Gruppen wurde verbessert:

1. **Promise.allSettled statt Promise.all**
   - Ein Fehler bei einer Gruppe blockiert nicht mehr alle anderen
   - Alle Gruppen werden geladen, auch wenn `statisticsOrder` bei einer Gruppe Probleme macht

2. **Bessere Fehlerprotokollierung**
   - Detaillierte Fehlermeldungen in den Server-Logs
   - Zeigt genau, welche Gruppe das Problem verursacht

3. **Validierung der Eingaben**
   - Prüft, ob `teacherId` gültig ist
   - Bessere Fehlermeldungen bei ungültigen Anfragen

## 🔍 Fehlerdiagnose

### Schritt 1: Server-Logs prüfen

**In Portainer:**
1. Portainer.io → **Containers** → `johnnymonkey-app` → **Logs**
2. Suche nach:
   - `❌ Error fetching teacher groups:`
   - `⚠️ Konnte statisticsOrder für Gruppe ... nicht lesen:`
   - `📚 Fetching groups for teacher:`

### Schritt 2: Browser-Konsole prüfen

1. Öffne die Browser-Entwicklertools (F12)
2. Gehe zum **Console**-Tab
3. Suche nach:
   - `❌ Error loading groups:`
   - `Fehler beim Laden der Gruppen`

### Schritt 3: API direkt testen

**In Portainer Container-Console:**
```bash
# Teste die API direkt
curl http://localhost:3000/api/learning-groups/teacher/DEINE_TEACHER_ID
```

**Oder im Browser:**
```
http://deine-domain/api/learning-groups/teacher/DEINE_TEACHER_ID
```

## 🔧 Häufige Ursachen und Lösungen

### Problem 1: Datenbank ist leer

**Symptom:**
- Logs zeigen: `✅ Found 0 groups for teacher`
- Keine Gruppen werden angezeigt

**Lösung:**
1. Prüfe, ob die Datenbank richtig importiert wurde:
   ```bash
   # In Container-Console
   cd /app/server
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   prisma.learningGroup.count().then(count => {
     console.log('Anzahl Gruppen:', count);
     prisma.\$disconnect();
   });
   "
   ```

2. Falls 0 Gruppen → Datenbank neu importieren (siehe `PORTAINER_DATENBANK_IMPORT_FROM_GIT.md`)

### Problem 2: statisticsOrder-Fehler

**Symptom:**
- Logs zeigen: `⚠️ Konnte statisticsOrder für Gruppe ... nicht lesen:`
- Gruppen werden trotzdem geladen, aber ohne `statisticsOrder`

**Lösung:**
- **Keine Aktion nötig!** Die Gruppen werden trotzdem geladen
- `statisticsOrder` wird auf `null` gesetzt
- Funktionalität bleibt erhalten

### Problem 3: Prisma-Fehler

**Symptom:**
- Logs zeigen: `❌ Error fetching teacher groups:` mit Prisma-Fehlermeldung
- HTTP 500 Fehler

**Lösung:**
1. Prisma Client neu generieren:
   ```bash
   # In Container-Console
   cd /app/server
   npx prisma generate
   ```

2. Container neu starten:
   - Portainer → Containers → `johnnymonkey-app` → Restart

### Problem 4: Ungültige teacherId

**Symptom:**
- HTTP 400 Fehler
- Logs zeigen: `Invalid teacher ID`

**Lösung:**
1. Prüfe, ob der Benutzer eingeloggt ist
2. Prüfe, ob `userId` im localStorage gespeichert ist
3. Logge dich neu ein

### Problem 5: Datenbank-Verbindungsfehler

**Symptom:**
- Logs zeigen: `PrismaClientInitializationError` oder `Can't reach database server`

**Lösung:**
1. Prüfe, ob die Datenbank-Datei existiert:
   ```bash
   # In Container-Console
   ls -lh /app/server/prisma/dev.db
   ```

2. Prüfe Datenbank-Berechtigungen:
   ```bash
   # In Container-Console
   ls -la /app/server/prisma/dev.db
   ```

3. Falls Datei fehlt → Datenbank neu importieren

## 🚀 Nach dem Fix

1. **Änderungen committen und pushen:**
   ```bash
   git add server/src/routes/learningGroups.ts
   git commit -m "Fehlerbehandlung beim Laden der Gruppen verbessert"
   git push
   ```

2. **In Portainer Stack aktualisieren:**
   - Portainer → Stacks → `johnnymonkey`
   - Editor → Pull and redeploy

3. **Container neu starten:**
   - Portainer → Containers → `johnnymonkey-app` → Restart

4. **Testen:**
   - App öffnen
   - Einloggen
   - Gruppen sollten jetzt laden

## 📊 Erwartetes Verhalten

**Erfolgreich wenn:**
- Logs zeigen: `✅ Found X groups for teacher`
- Gruppen werden im Frontend angezeigt
- Keine Fehlermeldungen in der Browser-Konsole

**Bei Problemen:**
- Logs zeigen detaillierte Fehlermeldungen
- Einzelne Gruppen mit Problemen werden trotzdem geladen (ohne `statisticsOrder`)
- Alle anderen Gruppen funktionieren normal

## 💡 Präventive Maßnahmen

1. **Regelmäßige Backups**
   - Committe regelmäßig `backup_latest.db` ins Git
   - So ist immer ein aktuelles Backup verfügbar

2. **Logs überwachen**
   - Prüfe regelmäßig die Container-Logs
   - Achte auf Warnungen und Fehler

3. **Datenbank-Status prüfen**
   - Prüfe regelmäßig, ob Gruppen vorhanden sind
   - Prüfe, ob Benutzer korrekt zugeordnet sind

## 🆘 Wenn nichts hilft

1. **Container-Logs exportieren:**
   - Portainer → Containers → `johnnymonkey-app` → Logs
   - Kopiere die letzten 100 Zeilen

2. **Browser-Konsole exportieren:**
   - F12 → Console
   - Kopiere alle Fehlermeldungen

3. **Datenbank-Status prüfen:**
   ```bash
   # In Container-Console
   cd /app/server
   node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   Promise.all([
     prisma.user.count(),
     prisma.learningGroup.count(),
     prisma.user.findFirst({ where: { role: 'TEACHER' } })
   ]).then(([users, groups, teacher]) => {
     console.log('Benutzer:', users);
     console.log('Gruppen:', groups);
     console.log('Erster Lehrer:', teacher ? teacher.id + ' - ' + teacher.name : 'Keine');
     prisma.\$disconnect();
   });
   "
   ```

Mit diesen Informationen kann der Fehler genauer diagnostiziert werden.
