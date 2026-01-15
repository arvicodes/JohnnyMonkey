# 📊 Datenbank-Verwaltung in Portainer.io

## 🎯 Übersicht

Deine JohnnyMonkey-App läuft auf Portainer.io und wird automatisch aus Git gepullt. Die Datenbank wird in einem **persistenten Docker Volume** gespeichert und bleibt auch bei App-Updates erhalten.

## 🔧 Wie funktioniert es?

### Datenbank-Speicherung

- **Docker Volume**: `johnnymonkey_database`
- **Mount-Punkt im Container**: `/app/server/prisma`
- **Datenbank-Datei**: `/app/server/prisma/dev.db`
- **Typ**: SQLite

### Automatisches Verhalten beim Start

Das `docker-start.sh` Script macht beim Container-Start automatisch:

1. ✅ **Prüft ob `dev.db` existiert**
   - Wenn **JA** → Behält die Datenbank (keine Datenverluste!)
   - Wenn **NEIN** → Sucht nach `backup_latest.db` und importiert sie

2. ✅ **Fügt fehlende Spalten hinzu**
   - Prüft Schema und fügt nur fehlende Spalten hinzu
   - **KEIN `db push`** → Daten bleiben erhalten!

3. ✅ **Zeigt Datenbank-Status**
   - Anzahl Benutzer und LearningGroups in den Logs

## 📥 Erste Einrichtung (einmalig)

### Schritt 1: Backup-Datei ins Git committen

Damit beim ersten Start die Datenbank automatisch importiert wird:

```bash
# Auf deinem Mac
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey

# Kopiere deine aktuelle Datenbank als Backup
cp server/prisma/dev.db backup_latest.db

# Committe und pushe
git add backup_latest.db
git commit -m "Datenbank-Backup für Portainer.io"
git push
```

### Schritt 2: Stack in Portainer deployen

1. Portainer.io → **Stacks** → **Add stack**
2. **Name**: `johnnymonkey`
3. **Build method**: **Web editor**
4. Füge deine `docker-compose.yml` ein
5. **Deploy the stack**

Beim ersten Start wird automatisch:
- `backup_latest.db` aus dem Git-Repository importiert
- `dev.db` im Volume erstellt
- Alle Daten sind verfügbar

## 🔄 App-Updates aus Git

### Was passiert bei Git-Updates?

Wenn Portainer die App aus Git neu baut:

1. ✅ **Datenbank bleibt erhalten** (im Volume)
2. ✅ **Neue Spalten werden automatisch hinzugefügt**
3. ✅ **Keine Datenverluste**

### Workflow für Updates

1. **Lokale Änderungen committen und pushen:**
   ```bash
   git add .
   git commit -m "Deine Änderungen"
   git push
   ```

2. **In Portainer Stack aktualisieren:**
   - Portainer.io → **Stacks** → `johnnymonkey`
   - **Editor** → **Pull and redeploy**
   - Oder: **Git repository** → **Pull latest changes**

3. **Container wird neu gebaut:**
   - Datenbank bleibt im Volume erhalten ✅
   - Neue Features werden aktiviert
   - Schema-Updates werden automatisch angewendet

## 💾 Datenbank sichern

### Option 1: Über Portainer Volume-Backup

1. Portainer.io → **Volumes**
2. `johnnymonkey_database` → **Backup**
3. Datei wird heruntergeladen

### Option 2: Über Container-Console

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Console**
2. Datenbank kopieren:
   ```bash
   cp /app/server/prisma/dev.db /app/backup_$(date +%Y%m%d).db
   ```
3. Datei aus Container exportieren (über Portainer)

### Option 3: Lokales Backup erstellen

```bash
# Auf deinem Mac
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey

# Aktuelle Datenbank als Backup speichern
cp server/prisma/dev.db backup_latest.db

# Ins Git committen (optional)
git add backup_latest.db
git commit -m "Datenbank-Backup $(date +%Y-%m-%d)"
git push
```

## 🔧 Datenbank zurücksetzen

### Datenbank auf Backup zurücksetzen

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Stop**

2. **Volume löschen:**
   - Portainer.io → **Volumes**
   - `johnnymonkey_database` → **Remove**

3. **Container neu starten:**
   - Portainer.io → **Containers** → `johnnymonkey-app` → **Start**
   - Beim Start wird automatisch `backup_latest.db` importiert

### Datenbank manuell ersetzen

1. Portainer.io → **Containers** → `johnnymonkey-app` → **Console**

2. Datenbank ersetzen:
   ```bash
   # Alte Datenbank löschen
   rm /app/server/prisma/dev.db
   
   # Backup kopieren
   cp /app/backup_latest.db /app/server/prisma/dev.db
   
   # Prüfen
   ls -lh /app/server/prisma/dev.db
   ```

3. Container neu starten:
   - Portainer.io → **Containers** → `johnnymonkey-app` → **Restart**

## 📊 Datenbank-Status prüfen

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
     prisma.learningGroup.count()
   ]).then(([users, groups]) => {
     console.log('📊 Datenbank-Status:');
     console.log('  Benutzer:', users);
     console.log('  LearningGroups:', groups);
     prisma.\$disconnect();
   });
   "
   ```

### Über Container-Logs

Portainer.io → **Containers** → `johnnymonkey-app` → **Logs**

Suche nach:
```
📊 Database contains: X users, Y groups
```

## ⚠️ Wichtige Hinweise

1. **Datenbank bleibt erhalten**
   - Bei App-Updates bleibt die Datenbank im Volume erhalten
   - Keine Sorge vor Datenverlusten bei Git-Updates

2. **Schema-Updates automatisch**
   - Fehlende Spalten werden automatisch hinzugefügt
   - Kein `db push` → Daten bleiben erhalten

3. **Backup regelmäßig aktualisieren**
   - Committe regelmäßig `backup_latest.db` ins Git
   - So ist immer ein aktuelles Backup verfügbar

4. **Volume nicht löschen**
   - Das Volume `johnnymonkey_database` enthält alle Daten
   - Nur löschen, wenn du wirklich zurücksetzen willst

## 🆘 Troubleshooting

### Datenbank ist leer

**Lösung:**
1. Container-Console öffnen
2. Prüfe ob `backup_latest.db` existiert: `ls -lh /app/backup_latest.db`
3. Falls nicht → Container neu bauen (holt `backup_latest.db` aus Git)
4. Falls ja → Datenbank manuell importieren (siehe oben)

### Schema-Fehler

**Lösung:**
1. Container-Console öffnen
2. Prisma Client neu generieren:
   ```bash
   cd /app/server
   npx prisma generate
   ```
3. Container neu starten

### Volume ist voll

**Lösung:**
1. Portainer.io → **Volumes** → `johnnymonkey_database` → **Inspect**
2. Prüfe Größe
3. Bei Bedarf: Alte Logs löschen oder Volume erweitern

## ✅ Checkliste für Production

- [ ] `backup_latest.db` ist im Git-Repository
- [ ] Stack ist in Portainer deployt
- [ ] Datenbank-Volume existiert (`johnnymonkey_database`)
- [ ] Container startet erfolgreich
- [ ] Datenbank enthält Benutzer und Gruppen
- [ ] Regelmäßige Backups eingerichtet
