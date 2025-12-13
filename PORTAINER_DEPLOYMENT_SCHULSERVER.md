# JohnnyMonkey in Portainer deployen (Schulserver)

## 🎯 Übersicht

Diese Anleitung zeigt, wie du die JohnnyMonkey-App auf deinem Schulserver mit Portainer.io deployst. Die App läuft dann auf Port 80, damit die Sophos Firewall sie erreichen kann.

## 📋 Voraussetzungen

- ✅ Portainer.io läuft bereits auf dem Server (https://192.168.8.1:9443)
- ✅ Du hast Zugriff auf Portainer
- ✅ Die App-Dateien sind auf dem Server verfügbar (oder per Git)

## 🚀 Schritt-für-Schritt Anleitung

### Schritt 1: Code auf den Server bringen

Du hast zwei Optionen:

#### Option A: Git Repository (empfohlen)
1. Auf dem Server: Code klonen oder pullen
2. In das Projektverzeichnis wechseln

#### Option B: Dateien hochladen
1. Alle Projektdateien auf den Server kopieren
2. Stelle sicher, dass `Dockerfile` und `docker-compose.portainer-production.yml` vorhanden sind

### Schritt 2: Portainer öffnen

1. Öffne: **https://192.168.8.1:9443**
2. Logge dich ein
3. Wähle deine Docker-Umgebung aus (falls mehrere vorhanden)

### Schritt 3: Stack erstellen

1. **Links im Menü**: Klicke auf **"Stacks"**
2. Klicke oben rechts auf **"Add stack"** oder **"+"**
3. **Name**: `johnnymonkey` (oder wie du willst)
4. **Description**: Optional, z.B. "JohnnyMonkey Learning Platform"

### Schritt 4: Build-Methode wählen

Du hast zwei Optionen:

#### Option A: Web Editor (wenn Code bereits auf Server)
1. **Build method**: Wähle **"Web editor"**
2. Öffne die Datei `docker-compose.portainer-production.yml` auf dem Server
3. Kopiere den gesamten Inhalt (Cmd+A, Cmd+C)
4. Füge ihn in den Portainer Web-Editor ein

#### Option B: Git Repository (empfohlen für Updates)
1. **Build method**: Wähle **"Repository"**
2. **Repository URL**: Deine Git-URL (z.B. `https://github.com/username/johnnymonkey.git`)
3. **Compose path**: `docker-compose.portainer-production.yml`
4. **Reference**: `main` oder `master` (dein Branch)
5. **Auto-update**: Optional aktivieren für automatische Updates

### Schritt 5: Stack deployen

1. Scrolle nach unten
2. **Wichtig**: Aktiviere **"Always pull the image"** oder **"Rebuild"** (falls Code geändert)
3. Klicke auf **"Deploy the stack"**
4. Warte, bis Portainer den Stack erstellt hat
   - Das kann einige Minuten dauern (Build-Prozess)
   - Du siehst den Fortschritt in den Logs

### Schritt 6: Container prüfen

1. **Links im Menü**: Klicke auf **"Containers"**
2. Du solltest sehen: `johnnymonkey-app`
3. **Status prüfen**:
   - 🟢 Grüner Punkt = läuft ✅
   - 🔴 Roter Punkt = gestoppt ❌
   - 🟡 Gelber Punkt = startet gerade

### Schritt 7: Logs prüfen (falls Probleme)

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Klicke auf **"Logs"** Tab
3. Prüfe auf Fehlermeldungen
4. Häufige Probleme:
   - Port 80 bereits belegt → Anderen Container stoppen
   - Build-Fehler → Prisma oder npm Probleme
   - Datenbank-Fehler → Prisma Schema prüfen

### Schritt 8: App testen

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Scrolle zu **"Published ports"**
3. Du siehst: `80:80`
4. Die App sollte erreichbar sein über:
   - **Intern**: `http://192.168.8.1` (ohne Port, da Port 80)
   - **Extern**: Über die Sophos Firewall (HTTPS mit Zertifikat)

## 🔧 Wichtige Konfigurationen

### Port-Mapping
- **Host-Port**: `80` (für Sophos Firewall)
- **Container-Port**: `80` (Server läuft auf Port 80)
- **Umgebungsvariable**: `PORT=80`

### Volumes (persistente Daten)
- **Datenbank**: `johnnymonkey_db` → `/app/server/prisma`
- **Material**: `./material` → `/app/material` (read-only)
- **Logs**: `johnnymonkey_logs` → `/app/logs`

### Netzwerk
- **Netzwerk**: `johnnymonkey-network` (Bridge-Modus)
- Alle Container können sich darüber erreichen

## 🔄 Updates deployen

Wenn du Code geändert hast:

### Methode 1: Über Portainer (mit Rebuild)
1. **Stacks** → `johnnymonkey` → Klicke darauf
2. Klicke auf **"Editor"** Tab
3. Ändere die `docker-compose.yml` falls nötig
4. Aktiviere **"Rebuild"** (Checkbox)
5. Klicke auf **"Update the stack"**

### Methode 2: Über Git (wenn Repository-Methode)
1. Code committen und pushen
2. **Stacks** → `johnnymonkey` → **"Editor"**
3. Klicke auf **"Pull and redeploy"** (falls verfügbar)
4. Oder: **"Update the stack"** mit aktiviertem **"Rebuild"**

## 🐛 Troubleshooting

### Problem: Port 80 bereits belegt
**Lösung**:
1. **Containers** → Prüfe, welcher Container Port 80 nutzt
2. Stoppe den anderen Container
3. Oder: Ändere den Port in der docker-compose.yml (aber dann funktioniert Sophos Firewall nicht)

### Problem: Container startet nicht
**Lösung**:
1. **Containers** → `johnnymonkey-app` → **"Logs"**
2. Lies die Fehlermeldung
3. Häufige Ursachen:
   - Datenbank-Fehler → Prisma Schema prüfen
   - Build-Fehler → Node-Version prüfen
   - Port-Konflikt → Port 80 prüfen

### Problem: Build schlägt fehl
**Lösung**:
1. **Stacks** → `johnnymonkey` → **"Logs"**
2. Prüfe Build-Logs
3. Häufige Probleme:
   - `npm ci` Fehler → Dependencies prüfen
   - Prisma Fehler → Schema prüfen
   - TypeScript Fehler → Code prüfen

### Problem: App nicht erreichbar
**Lösung**:
1. **Containers** → `johnnymonkey-app` → **"Logs"**
2. Prüfe, ob Server läuft: `🎯 Server is running on port 80`
3. Prüfe Health-Check: `http://192.168.8.1/health`
4. Prüfe Firewall-Regeln in Sophos

### Problem: Datenbank-Fehler
**Lösung**:
1. **Volumes** → `johnnymonkey_database` → Prüfe, ob vorhanden
2. **Containers** → `johnnymonkey-app` → **"Logs"**
3. Prisma-Fehler prüfen
4. Falls nötig: Container neu starten

## 📊 Monitoring

### Container-Status
- **Containers** → `johnnymonkey-app` → **"Stats"** Tab
- Siehst CPU, RAM, Netzwerk-Nutzung

### Logs
- **Containers** → `johnnymonkey-app` → **"Logs"** Tab
- Echtzeit-Logs der App

### Health-Check
- Die App hat einen Health-Check: `http://192.168.8.1/health`
- Portainer zeigt den Status im Container-Status

## 🔐 Sicherheit

### Port 80 vs HTTPS
- Die App läuft intern auf Port 80 (HTTP)
- Die Sophos Firewall kümmert sich um HTTPS (Zertifikat)
- Externe Zugriffe sollten über HTTPS gehen

### Volumes
- Datenbank-Volume ist persistent
- Backups: **Volumes** → `johnnymonkey_database` → **"Backup"**

## ✅ Checkliste

- [ ] Code auf Server verfügbar (Git oder Dateien)
- [ ] Portainer geöffnet (https://192.168.8.1:9443)
- [ ] Stacks → Add stack geklickt
- [ ] Name vergeben: `johnnymonkey`
- [ ] docker-compose.portainer-production.yml eingefügt
- [ ] "Deploy the stack" geklickt
- [ ] Build erfolgreich (Logs prüfen)
- [ ] Container läuft (grüner Punkt)
- [ ] App erreichbar (http://192.168.8.1)
- [ ] Health-Check funktioniert (/health)
- [ ] Sophos Firewall konfiguriert (HTTPS)

## 🎓 Nächste Schritte

Nach erfolgreichem Deployment:

1. ✅ **Sophos Firewall konfigurieren**
   - Port 80 → HTTPS mit Zertifikat
   - Externe Zugriffe erlauben

2. ✅ **Domain konfigurieren** (optional)
   - DNS-Eintrag für deine Domain
   - Sophos Firewall: Domain → Port 80

3. ✅ **Backup-Strategie**
   - Regelmäßige Backups des Datenbank-Volumes
   - Portainer → Volumes → Backup

4. ✅ **Monitoring einrichten**
   - Health-Check überwachen
   - Logs regelmäßig prüfen

Viel Erfolg! 🚀

