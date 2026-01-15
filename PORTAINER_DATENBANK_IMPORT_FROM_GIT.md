# 📥 Datenbank aus Git in Portainer importieren

## ✅ Voraussetzungen

- ✅ `backup_latest.db` ist im Git-Repository
- ✅ Stack ist in Portainer konfiguriert
- ✅ Dockerfile kopiert `backup_latest.db` ins Image (automatisch)

## 🚀 Schritt-für-Schritt Anleitung

### Option 1: Neuer Stack (empfohlen für erste Einrichtung)

Wenn du den Stack noch nicht erstellt hast oder die Datenbank leer ist:

1. **Portainer.io öffnen** → **Stacks**

2. **Stack erstellen oder aktualisieren:**
   - **Stacks** → **Add stack** (oder bestehenden Stack bearbeiten)
   - **Name**: `johnnymonkey`
   - **Build method**: **Web editor** oder **Git repository**
   
   **Wenn Git repository:**
   - Repository URL eingeben
   - Branch: `main` (oder dein Branch)
   - Compose path: `docker-compose.yml`
   - **Pull and redeploy** aktivieren

3. **Deploy the stack**

4. **Beim ersten Start passiert automatisch:**
   - `backup_latest.db` wird aus Git geholt
   - Beim Container-Start wird sie automatisch importiert
   - `dev.db` wird im Volume erstellt

5. **Logs prüfen:**
   - Portainer.io → **Containers** → `johnnymonkey-app` → **Logs**
   - Suche nach:
     ```
     📥 Found backup_latest.db, importing...
     ✅ Database imported from backup_latest.db
     📊 Database contains: X users, Y groups
     ```

### Option 2: Bestehender Stack - Datenbank ersetzen

Wenn der Stack bereits läuft, aber die Datenbank leer oder falsch ist:

#### Schritt 1: Container stoppen

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Stop**

#### Schritt 2: Volume löschen (wichtig!)

1. Portainer.io → **Volumes**
2. Suche nach: `johnnymonkey_database`
3. Klicke auf das Volume
4. **Remove** klicken
5. Bestätigen

⚠️ **Wichtig**: Das Volume muss gelöscht werden, sonst wird die alte (leere) Datenbank verwendet!

#### Schritt 3: Stack neu deployen

1. Portainer.io → **Stacks** → `johnnymonkey`
2. **Editor** → **Pull and redeploy**
   - Oder: **Git repository** → **Pull latest changes**
3. Warte, bis der Build fertig ist

#### Schritt 4: Container starten

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Start**

#### Schritt 5: Logs prüfen

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Logs`
2. Suche nach:
   ```
   🗄️  Database file not found, checking for backup...
   📥 Found backup_latest.db, importing...
   ✅ Database imported from backup_latest.db
   📊 Database contains: X users, Y groups
   ```

### Option 3: Manueller Import (falls automatisch nicht funktioniert)

#### Schritt 1: Container-Console öffnen

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Console**

#### Schritt 2: Prüfe ob backup_latest.db vorhanden ist

```bash
ls -lh /app/backup_latest.db
```

**Sollte zeigen:**
- Datei existiert
- Größe: ~1-2 MB (je nach Datenmenge)

#### Schritt 3: Datenbank importieren

```bash
# Alte Datenbank löschen (falls vorhanden)
rm -f /app/server/prisma/dev.db

# Backup importieren
cp /app/backup_latest.db /app/server/prisma/dev.db

# Prüfen
ls -lh /app/server/prisma/dev.db
```

#### Schritt 4: Container neu starten

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Restart**

## ✅ Erfolg prüfen

### Über Container-Logs

Portainer.io → **Containers** → `johnnymonkey-app` → **Logs**

**Erfolgreich wenn du siehst:**
```
✅ Database file exists
📊 Database contains: X users, Y groups
```

### Über Container-Console

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Console**

2. Datenbank-Status prüfen:
```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
Promise.all([
  prisma.user.count(),
  prisma.learningGroup.count(),
  prisma.user.findFirst()
]).then(([users, groups, firstUser]) => {
  console.log('📊 Datenbank-Status:');
  console.log('  Benutzer:', users);
  console.log('  LearningGroups:', groups);
  console.log('  Erster Benutzer:', firstUser ? firstUser.name + ' (' + firstUser.loginCode + ')' : 'Keine');
  prisma.\$disconnect();
});
"
```

**Erfolgreich wenn:**
- Benutzer > 0
- LearningGroups > 0
- Erster Benutzer wird angezeigt

## 🔍 Troubleshooting

### Problem: "backup_latest.db not found"

**Ursache:** Datei wurde nicht ins Docker-Image kopiert

**Lösung:**
1. Prüfe ob `backup_latest.db` im Git-Repository ist:
   ```bash
   git ls-files | grep backup_latest.db
   ```
2. Falls nicht → Datei committen und pushen
3. Stack neu bauen in Portainer

### Problem: Datenbank bleibt leer

**Ursache:** Volume enthält bereits eine leere `dev.db`

**Lösung:**
1. Container stoppen
2. Volume `johnnymonkey_database` löschen
3. Container neu starten

### Problem: "Database file exists" aber leer

**Ursache:** Volume enthält alte leere Datenbank

**Lösung:**
1. Container-Console öffnen
2. Datenbank manuell ersetzen (siehe Option 3 oben)
3. Container neu starten

### Problem: Schema-Fehler

**Ursache:** Datenbank-Schema ist veraltet

**Lösung:**
1. Container-Console öffnen
2. Prisma Client neu generieren:
   ```bash
   cd /app/server
   npx prisma generate
   ```
3. Container neu starten

## 📋 Checkliste

- [ ] `backup_latest.db` ist im Git-Repository
- [ ] Stack ist in Portainer deployt
- [ ] Container wurde gestartet
- [ ] Logs zeigen: "📥 Found backup_latest.db, importing..."
- [ ] Logs zeigen: "📊 Database contains: X users, Y groups"
- [ ] Login funktioniert mit bekannten Login-Codes

## 💡 Wichtige Hinweise

1. **Volume löschen ist wichtig**
   - Wenn das Volume bereits existiert und eine leere `dev.db` enthält, wird sie nicht automatisch überschrieben
   - Volume muss gelöscht werden, damit der Import funktioniert

2. **Automatischer Import**
   - Funktioniert nur beim ersten Start (wenn `dev.db` nicht existiert)
   - Wenn `dev.db` bereits existiert, wird sie nicht überschrieben

3. **Backup aktualisieren**
   - Wenn du die Datenbank lokal änderst, aktualisiere `backup_latest.db`:
     ```bash
     cp server/prisma/dev.db backup_latest.db
     git add backup_latest.db
     git commit -m "Datenbank-Backup aktualisiert"
     git push
     ```

4. **Bei Git-Updates**
   - Die Datenbank bleibt im Volume erhalten
   - Nur wenn das Volume gelöscht wird, wird `backup_latest.db` neu importiert
