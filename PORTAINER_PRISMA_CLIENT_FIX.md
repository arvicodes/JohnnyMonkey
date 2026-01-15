# 🔧 Prisma Client Fehler beheben - "Unknown field seatingOrder"

## ❌ Problem

```
Unknown field `seatingOrder` for select statement on model `LearningGroup`.
```

**Ursache:** Der Prisma Client im Container wurde nicht mit dem aktuellen Schema generiert. Das Schema enthält `seatingOrder` und `statisticsOrder`, aber der generierte Client kennt diese Felder nicht.

## ✅ Lösung

### Schritt 1: Änderungen committen und pushen

```bash
git add Dockerfile docker-start.sh server/src/routes/learningGroups.ts
git commit -m "Fix: Prisma Client mit aktuellem Schema generieren"
git push
```

### Schritt 2: Stack in Portainer neu bauen

1. **Portainer.io** → **Stacks** → `johnnymonkey`
2. **Editor** → **Pull and redeploy**
   - Oder: **Git repository** → **Pull latest changes**
3. Warte, bis der Build fertig ist (kann 5-10 Minuten dauern)

### Schritt 3: Container neu starten

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Restart**

### Schritt 4: Logs prüfen

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Logs**
2. Suche nach:
   ```
   📦 Generating Prisma client...
   ✅ Database file exists
   📊 Database contains: X users, Y groups
   ```

## 🔍 Was wurde geändert?

1. **Dockerfile:**
   - Prisma Client wird jetzt explizit mit `schema.prisma` generiert
   - Stellt sicher, dass alle Felder (inkl. `seatingOrder` und `statisticsOrder`) bekannt sind

2. **docker-start.sh:**
   - Prisma Client wird beim Start neu generiert
   - Verwendet explizit `schema.prisma`
   - Prüft und fügt fehlende Spalten hinzu (inkl. `statisticsOrder`)

3. **server/src/routes/learningGroups.ts:**
   - Verbesserte Fehlerbehandlung
   - `Promise.allSettled` statt `Promise.all` (ein Fehler blockiert nicht alle Gruppen)

## ✅ Erwartetes Ergebnis

Nach dem Neustart:
- ✅ Gruppen werden geladen
- ✅ Keine Fehler mehr: "Unknown field seatingOrder"
- ✅ Logs zeigen: `✅ Found X groups for teacher`

## 🆘 Falls es immer noch nicht funktioniert

### Option 1: Prisma Client manuell neu generieren

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

2. Prisma Client neu generieren:
   ```bash
   cd /app/server
   npx prisma generate --schema=prisma/schema.prisma
   ```

3. Container neu starten:
   - Portainer → Containers → `johnnymonkey-app` → Restart

### Option 2: Container komplett neu bauen

1. **Portainer.io** → **Stacks** → `johnnymonkey`
2. **Editor** → **Remove** (Stack löschen)
3. **Add stack** → Stack neu erstellen mit aktuellem Code
4. **Deploy the stack**

### Option 3: Prisma Schema prüfen

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

2. Prüfe, ob `seatingOrder` im Schema ist:
   ```bash
   cd /app/server
   grep -A 10 "model LearningGroup" prisma/schema.prisma | grep seatingOrder
   ```

3. Sollte zeigen:
   ```
   seatingOrder         String? // JSON-Array mit Schüler-IDs...
   statisticsOrder      String? // JSON-Array mit Schüler-IDs...
   ```

## 💡 Präventive Maßnahmen

1. **Immer nach Schema-Änderungen:**
   - Prisma Client neu generieren: `npx prisma generate`
   - Container neu bauen

2. **Bei Git-Updates:**
   - Stack in Portainer neu deployen
   - Container wird automatisch neu gebaut

3. **Regelmäßig prüfen:**
   - Logs auf Prisma-Fehler überwachen
   - Bei "Unknown field" Fehlern → Prisma Client neu generieren
