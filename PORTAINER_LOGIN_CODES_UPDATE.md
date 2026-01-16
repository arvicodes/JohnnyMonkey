# 🔐 Login-Codes werden nicht geladen - Lösung

## ❌ Problem

Neue Login-Codes (z.B. `AckJak13` für Jakob Ackermann) funktionieren nicht im Portainer-Container, obwohl sie lokal funktionieren.

**Ursache:** Die Datenbank im Container ist nicht synchronisiert mit der lokalen Datenbank.

## ✅ Lösung

### Schritt 1: Lokale Datenbank prüfen

**Auf deinem Mac:**

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { loginCode: 'AckJak13' },
  select: { name: true, loginCode: true }
}).then(user => {
  console.log(user ? \`✅ Gefunden: \${user.name} (\${user.loginCode})\` : '❌ Nicht gefunden');
  prisma.\$disconnect();
});
"
```

**Sollte zeigen:** `✅ Gefunden: Jakob Ackermann (AckJak13)`

### Schritt 2: Backup aktualisieren

**Auf deinem Mac:**

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
cp server/prisma/dev.db backup_latest.db
git add backup_latest.db
git commit -m "Datenbank-Backup aktualisiert - neue Login-Codes"
git push
```

### Schritt 3: Datenbank im Container aktualisieren

**Option A: Volume löschen und neu importieren (empfohlen)**

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Stop**

2. **Portainer.io** → **Volumes** → `johnnymonkey_database` → **Remove**
   - ⚠️ **Wichtig**: Das Volume muss gelöscht werden, damit die neue Datenbank importiert wird

3. **Portainer.io** → **Stacks** → `johnnymonkey` → **Editor** → **Pull and redeploy**
   - Oder: **Git repository** → **Pull latest changes**

4. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Start**

5. **Logs prüfen:**
   - Portainer → Containers → `johnnymonkey-app` → Logs
   - Suche nach:
     ```
     📥 Found backup_latest.db, importing...
     ✅ Database imported from backup_latest.db
     📊 Database contains: X users, Y groups
     ```

**Option B: Datenbank manuell ersetzen**

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

2. **Datenbank ersetzen:**
   ```bash
   # Alte Datenbank löschen
   rm -f /app/server/prisma/dev.db
   
   # Backup kopieren (aus Git)
   cp /app/backup_latest.db /app/server/prisma/dev.db
   
   # Prüfen
   ls -lh /app/server/prisma/dev.db
   ```

3. **Container neu starten:**
   - Portainer → Containers → `johnnymonkey-app` → Restart

### Schritt 4: Login testen

1. App öffnen
2. Mit `AckJak13` einloggen
3. Sollte jetzt funktionieren ✅

## 🔍 Debugging

### Login-Code in Container prüfen

**Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { loginCode: 'AckJak13' },
  select: { name: true, loginCode: true }
}).then(user => {
  console.log(user ? \`✅ Gefunden: \${user.name} (\${user.loginCode})\` : '❌ Nicht gefunden');
  prisma.\$disconnect();
});
"
```

**Wenn nicht gefunden:**
- Datenbank ist nicht synchronisiert
- Volume löschen und neu importieren (siehe Schritt 3, Option A)

### Alle Login-Codes anzeigen

**Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  select: { name: true, loginCode: true },
  orderBy: { loginCode: 'asc' }
}).then(users => {
  console.log('Login-Codes in Container:');
  users.forEach(u => console.log(\`  \${u.loginCode} - \${u.name}\`));
  prisma.\$disconnect();
});
"
```

## ✅ Was wurde verbessert?

1. **Login-Code Suche:**
   - Whitespace wird automatisch entfernt (`trim()`)
   - Case-insensitive Suche als Fallback
   - Bessere Debug-Logs

2. **Datenbank-Synchronisation:**
   - `backup_latest.db` wird automatisch beim Start importiert
   - Volume muss gelöscht werden, damit neue Datenbank importiert wird

## 💡 Präventive Maßnahmen

1. **Nach Login-Code-Änderungen:**
   - `backup_latest.db` aktualisieren
   - Ins Git committen und pushen
   - Container-Volume löschen und neu importieren

2. **Regelmäßig prüfen:**
   - Login-Codes in Container-Datenbank prüfen
   - Bei Diskrepanzen → Volume löschen und neu importieren

3. **Bei Git-Updates:**
   - Stack neu deployen
   - Volume löschen, damit neue Datenbank importiert wird

## 🆘 Wenn es immer noch nicht funktioniert

1. **Prüfe Container-Logs:**
   - Portainer → Containers → `johnnymonkey-app` → Logs
   - Suche nach: `🔐 Login attempt`, `🔍 Searching for user`

2. **Prüfe Datenbank-Größe:**
   ```bash
   # In Container-Console
   ls -lh /app/server/prisma/dev.db
   ```
   - Sollte ~1.6 MB sein (wie lokal)

3. **Prüfe ob backup_latest.db aktuell ist:**
   ```bash
   # In Container-Console
   ls -lh /app/backup_latest.db
   ```
   - Sollte existieren und aktuell sein

4. **Manueller Import:**
   - Siehe Schritt 3, Option B
