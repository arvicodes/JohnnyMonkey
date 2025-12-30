# 📥 Lokale Datenbank in Container importieren

## 🎯 Ziel

Deine lokale Datenbank (`server/prisma/dev.db`) mit allen Daten in den Container importieren.

## 📋 Schritt-für-Schritt Anleitung

### Option A: Datenbank-Datei direkt kopieren (Einfachste Methode)

#### Schritt 1: Lokale Datenbank finden

**Auf deinem Mac:**

Die Datenbank liegt normalerweise hier:
```
/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/server/prisma/dev.db
```

**Prüfe ob sie existiert:**
```bash
ls -lh server/prisma/dev.db
```

#### Schritt 2: Container-Volume finden

**In Portainer.io:**

1. **Volumes** → Suche nach **johnnymonkey_database**
2. Klicke darauf
3. Prüfe den **Mountpoint** oder **Location**

**Oder über Container:**

1. **Containers** → **johnnymonkey-app** → **Inspect**
2. Suche nach **Mounts** → **Source** (zeigt den Pfad auf dem Host)

#### Schritt 3: Datenbank-Datei kopieren

**Methode 1: Über Portainer File Manager (falls verfügbar)**

1. **Volumes** → **johnnymonkey_database** → **Browse**
2. Lösche die alte `dev.db` (falls vorhanden)
3. Lade deine lokale `dev.db` hoch

**Methode 2: Über Container-Console**

1. **Containers** → **johnnymonkey-app** → **Console**
2. Stoppe den Container temporär (wichtig!)
3. Kopiere die Datei:

```bash
# Auf deinem Mac (im Terminal):
# Finde den Volume-Pfad (siehe Schritt 2)
# Dann kopiere:
cp server/prisma/dev.db /path/to/volume/dev.db
```

**Methode 3: Über Docker Volume direkt**

**Auf dem Server (falls SSH-Zugriff):**

```bash
# Finde Volume-Pfad
docker volume inspect johnnymonkey_database

# Kopiere Datenbank
# (Pfad von Volume-Inspect verwenden)
cp /path/to/local/dev.db /var/lib/docker/volumes/johnnymonkey_database/_data/dev.db
```

### Option B: Datenbank über SQL-Export/Import

#### Schritt 1: Lokale Datenbank exportieren

**Auf deinem Mac:**

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/server/prisma

# Exportiere alle Daten
sqlite3 dev.db .dump > database_export.sql
```

#### Schritt 2: SQL-Datei in Container importieren

**In Container-Console:**

```bash
cd /app/server/prisma

# Importiere Daten (wenn sqlite3 verfügbar wäre)
# Da sqlite3 nicht verfügbar ist, verwende Prisma/Node.js
```

**Oder über Node.js:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

// Lese SQL-Export (muss vorher hochgeladen werden)
// Oder verwende direkten Import über Prisma
"
```

### Option C: Datenbank über Prisma importieren (Empfohlen)

#### Schritt 1: Lokale Datenbank-Datei hochladen

**Über Portainer:**

1. **Containers** → **johnnymonkey-app** → **Console**
2. Erstelle temporäres Verzeichnis:

```bash
mkdir -p /tmp/db-import
```

3. **Lade deine `dev.db` hoch** (über Portainer File Manager oder SCP)

#### Schritt 2: Datenbank ersetzen

**WICHTIG: Container muss gestoppt sein!**

1. **Containers** → **johnnymonkey-app** → **Stop**

2. **In Container-Console (oder auf Server):**

```bash
# Backup der aktuellen DB
cp /app/server/prisma/dev.db /app/server/prisma/dev.db.backup

# Kopiere neue DB
cp /tmp/db-import/dev.db /app/server/prisma/dev.db

# Prüfe Berechtigungen
chmod 644 /app/server/prisma/dev.db
```

3. **Container starten:**

**Containers** → **johnnymonkey-app** → **Start**

#### Schritt 3: Prisma Client neu generieren

**Nach dem Start:**

```bash
cd /app/server
npx prisma generate
```

## 🚀 Schnelllösung: Volume-Mount verwenden

### Wenn du direkten Zugriff auf den Server hast:

**Ändere docker-compose.yml:**

```yaml
volumes:
  # Statt Volume, verwende direktes Mount
  - ./server/prisma:/app/server/prisma
```

**Dann:**
1. Kopiere deine lokale `dev.db` nach `server/prisma/dev.db`
2. Stack neu deployen
3. Datenbank wird direkt gemountet

**⚠️ Achtung:** Das funktioniert nur, wenn der Server Zugriff auf dein lokales Dateisystem hat (normalerweise nicht bei Portainer.io).

## 📋 Empfohlene Methode für Portainer.io

### Schritt 1: Container stoppen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app** → **Stop**

### Schritt 2: Volume-Datenbank ersetzen

**Option A: Über Server-Zugriff (falls SSH verfügbar)**

```bash
# Finde Volume-Pfad
docker volume inspect johnnymonkey_database

# Kopiere Datenbank
# (Pfad von oben verwenden)
cp /path/to/local/dev.db /var/lib/docker/volumes/johnnymonkey_database/_data/dev.db
```

**Option B: Über Portainer File Manager**

1. **Volumes** → **johnnymonkey_database** → **Browse**
2. Lösche alte `dev.db`
3. Lade deine lokale `dev.db` hoch

### Schritt 3: Container starten

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app** → **Start**
2. Warte 30 Sekunden
3. Prüfe Logs

### Schritt 4: Datenbank prüfen

**In Container-Console:**

```bash
cd /app/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findMany().then(users => { console.log('✅ Benutzer in DB:', users.length); users.forEach(u => console.log(\`  - \${u.name} (\${u.loginCode})\`)); prisma.\$disconnect(); });"
```

## 🔍 Volume-Pfad finden

**In Portainer.io:**

1. **Volumes** → **johnnymonkey_database**
2. Prüfe **Mountpoint** oder **Location**

**Oder über Container:**

1. **Containers** → **johnnymonkey-app** → **Inspect**
2. Suche nach **Mounts** → **Source**

## ⚠️ Wichtige Hinweise

1. **Container stoppen:** Wichtig vor dem Kopieren der Datenbank!
2. **Backup:** Erstelle immer ein Backup der aktuellen DB
3. **Berechtigungen:** Stelle sicher, dass die Datei lesbar ist
4. **Prisma Client:** Nach dem Import `npx prisma generate` ausführen

## 🐛 Falls es nicht funktioniert

### Problem: Datei kann nicht kopiert werden

**Lösung:**
- Prüfe Berechtigungen
- Verwende `chmod 644 dev.db`
- Container muss gestoppt sein

### Problem: Datenbank wird nicht erkannt

**Lösung:**
```bash
cd /app/server
npx prisma generate
npx prisma db push
```

### Problem: Volume-Pfad nicht gefunden

**Lösung:**
- Verwende Portainer File Manager
- Oder kopiere über Container-Console

---

**Wichtig:** Erstelle immer ein Backup der aktuellen Datenbank vor dem Import!


