# JohnnyMonkey in Portainer deployen (Git-Variante)

## 🎯 Übersicht

Diese Anleitung zeigt, wie du die JohnnyMonkey-App über Git in Portainer.io deployst. Die App wird direkt aus dem Git-Repository gebaut und deployed.

## 📋 Voraussetzungen

- ✅ Portainer.io läuft bereits auf dem Server (https://192.168.8.1:9443)
- ✅ Du hast Zugriff auf Portainer
- ✅ Git-Repository ist öffentlich oder Portainer hat Zugriff (SSH/HTTPS)
- ✅ Repository-URL: `https://github.com/arvicodes/JohnnyMonkey.git` (oder deine URL)

## 🚀 Schritt-für-Schritt Anleitung

### Schritt 1: Portainer öffnen

1. Öffne: **https://192.168.8.1:9443**
2. Logge dich ein
3. Wähle deine Docker-Umgebung aus (falls mehrere vorhanden)

### Schritt 2: Stack erstellen

1. **Links im Menü**: Klicke auf **"Stacks"**
2. Klicke oben rechts auf **"Add stack"** oder **"+"**
3. **Name**: `johnnymonkey` (oder wie du willst)
4. **Description**: Optional, z.B. "JohnnyMonkey Learning Platform"

### Schritt 3: Build-Methode: Repository

1. **Build method**: Wähle **"Repository"** (nicht "Web editor" oder "Upload")
2. Du siehst jetzt Felder für Git-Konfiguration

### Schritt 4: Git-Repository konfigurieren

#### 4.1 Repository-URL
- **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
  - Oder deine eigene Git-URL (GitHub, GitLab, etc.)
  - **HTTPS** funktioniert für öffentliche Repositories
  - **SSH** benötigt SSH-Keys in Portainer (erweitert)

#### 4.2 Branch/Reference
- **Reference**: `main` (oder `master`, je nach deinem Repository)
- Das ist der Branch, aus dem gebaut wird

#### 4.3 Compose-Datei
- **Compose path**: `docker-compose.portainer-production.yml`
- Das ist die Datei, die Portainer für das Deployment verwendet
- **Wichtig**: Diese Datei muss im Repository vorhanden sein!

#### 4.4 Auto-Update (optional)
- **Auto-update**: ✅ Aktivieren (empfohlen)
- **Webhook**: Optional, für automatische Updates bei Git-Push
- **Interval**: Optional, für regelmäßige Checks (z.B. alle 5 Minuten)

### Schritt 5: Erweiterte Optionen (optional)

#### Build-Optionen
- **Build**: ✅ Aktivieren (Container wird gebaut)
- **Always pull**: ✅ Aktivieren (stellt sicher, dass neuester Code verwendet wird)

#### Environment-Variablen (falls nötig)
- Du kannst zusätzliche Environment-Variablen setzen
- Standard: `NODE_ENV=production` und `PORT=80` sind bereits in der docker-compose.yml

### Schritt 6: Stack deployen

1. Scrolle nach unten
2. Prüfe alle Einstellungen nochmal:
   - ✅ Repository URL korrekt
   - ✅ Branch/Reference korrekt (`main`)
   - ✅ Compose path korrekt (`docker-compose.portainer-production.yml`)
   - ✅ Build aktiviert
3. Klicke auf **"Deploy the stack"**
4. Warte, bis Portainer:
   - Repository klont
   - Docker Image baut (kann 5-10 Minuten dauern)
   - Container startet

### Schritt 7: Build-Fortschritt beobachten

1. **Stacks** → `johnnymonkey` → Klicke darauf
2. Klicke auf **"Logs"** Tab
3. Du siehst den Build-Fortschritt:
   - Repository wird geklont
   - Docker Build läuft
   - Dependencies werden installiert
   - App wird gebaut
   - Container wird gestartet

### Schritt 8: Container prüfen

1. **Links im Menü**: Klicke auf **"Containers"**
2. Du solltest sehen: `johnnymonkey-app`
3. **Status prüfen**:
   - 🟢 Grüner Punkt = läuft ✅
   - 🔴 Roter Punkt = gestoppt ❌
   - 🟡 Gelber Punkt = startet gerade

### Schritt 9: Logs prüfen (falls Probleme)

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Klicke auf **"Logs"** Tab
3. Prüfe auf Fehlermeldungen
4. Suche nach: `🎯 Server is running on port 80`

### Schritt 10: App testen

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Scrolle zu **"Published ports"**
3. Du siehst: `80:80`
4. Die App sollte erreichbar sein über:
   - **Intern**: `http://192.168.8.1` (ohne Port, da Port 80)
   - **Extern**: Über die Sophos Firewall (HTTPS mit Zertifikat)

## 🔄 Updates deployen

### Automatisches Update (wenn Auto-update aktiviert)

Wenn du Code änderst und pusht:

1. **Git**: Code committen und pushen
   ```bash
   git add .
   git commit -m "Deine Änderung"
   git push origin main
   ```

2. **Portainer**: 
   - Wenn **Auto-update** aktiviert ist, wird automatisch neu gebaut
   - Oder: **Stacks** → `johnnymonkey` → **"Pull and redeploy"**

### Manuelles Update

1. **Stacks** → `johnnymonkey` → Klicke darauf
2. Klicke auf **"Editor"** Tab
3. Du siehst die aktuelle `docker-compose.yml`
4. Klicke auf **"Pull and redeploy"** (oder **"Update the stack"**)
5. Aktiviere **"Rebuild"** (Checkbox)
6. Klicke auf **"Update the stack"**

## 🔧 Wichtige Konfigurationen

### Git-Repository
- **URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
- **Branch**: `main`
- **Compose-Datei**: `docker-compose.portainer-production.yml`

### Port-Mapping
- **Host-Port**: `80` (für Sophos Firewall)
- **Container-Port**: `80` (Server läuft auf Port 80)
- **Umgebungsvariable**: `PORT=80`

### Volumes (persistente Daten)
- **Datenbank**: `johnnymonkey_db` → `/app/server/prisma`
- **Material**: `./material` → `/app/material` (read-only)
- **Logs**: `johnnymonkey_logs` → `/app/logs`

## 🐛 Troubleshooting

### Problem: Repository nicht erreichbar
**Lösung**:
1. Prüfe, ob Repository öffentlich ist (für HTTPS)
2. Oder: SSH-Keys in Portainer konfigurieren
3. Prüfe Firewall-Regeln auf dem Server

### Problem: Branch nicht gefunden
**Lösung**:
1. Prüfe, ob Branch `main` existiert (oder `master`)
2. Ändere **Reference** in Portainer
3. Prüfe Git-Repository im Browser

### Problem: Compose-Datei nicht gefunden
**Lösung**:
1. Prüfe, ob `docker-compose.portainer-production.yml` im Repository ist
2. Prüfe **Compose path** in Portainer
3. Datei muss im Root-Verzeichnis sein

### Problem: Build schlägt fehl
**Lösung**:
1. **Stacks** → `johnnymonkey` → **"Logs"**
2. Prüfe Build-Logs
3. Häufige Probleme:
   - `npm ci` Fehler → Dependencies prüfen
   - Prisma Fehler → Schema prüfen
   - TypeScript Fehler → Code prüfen

### Problem: Auto-update funktioniert nicht
**Lösung**:
1. Prüfe, ob **Auto-update** aktiviert ist
2. Prüfe **Webhook**-Konfiguration (falls verwendet)
3. Manuell: **"Pull and redeploy"** verwenden

### Problem: Port 80 bereits belegt
**Lösung**:
1. **Containers** → Prüfe, welcher Container Port 80 nutzt
2. Stoppe den anderen Container
3. Oder: Ändere Port in docker-compose.yml (aber dann funktioniert Sophos Firewall nicht)

## 📊 Vorteile der Git-Variante

✅ **Automatische Updates**: Code pushen → Automatisches Deployment
✅ **Versionierung**: Alle Änderungen sind im Git-Repository
✅ **Einfache Updates**: Ein Klick in Portainer
✅ **Nachvollziehbarkeit**: Jeder Deployment ist nachvollziehbar
✅ **Kollaboration**: Mehrere Personen können deployen

## 🔐 Sicherheit

### Öffentliches Repository
- Wenn Repository öffentlich ist, kann jeder den Code sehen
- Für private Repositories: SSH-Keys in Portainer konfigurieren

### SSH-Keys (für private Repositories)
1. **Portainer** → **Settings** → **Registries** oder **Git**
2. SSH-Key hinzufügen
3. Repository-URL mit SSH verwenden: `git@github.com:username/repo.git`

## ✅ Checkliste

- [ ] Portainer geöffnet (https://192.168.8.1:9443)
- [ ] Stacks → Add stack geklickt
- [ ] Name vergeben: `johnnymonkey`
- [ ] Build method: **"Repository"** gewählt
- [ ] Repository URL eingetragen: `https://github.com/arvicodes/JohnnyMonkey.git`
- [ ] Reference: `main` (oder dein Branch)
- [ ] Compose path: `docker-compose.portainer-production.yml`
- [ ] Auto-update aktiviert (optional)
- [ ] Build aktiviert
- [ ] "Deploy the stack" geklickt
- [ ] Build erfolgreich (Logs prüfen)
- [ ] Container läuft (grüner Punkt)
- [ ] App erreichbar (http://192.168.8.1)
- [ ] Health-Check funktioniert (/health)

## 🎓 Nächste Schritte

Nach erfolgreichem Deployment:

1. ✅ **Code-Änderungen deployen**
   - Code ändern → Committen → Pushen
   - Portainer aktualisiert automatisch (wenn aktiviert)

2. ✅ **Sophos Firewall konfigurieren**
   - Port 80 → HTTPS mit Zertifikat
   - Externe Zugriffe erlauben

3. ✅ **Domain konfigurieren** (optional)
   - DNS-Eintrag für deine Domain
   - Sophos Firewall: Domain → Port 80

4. ✅ **Backup-Strategie**
   - Regelmäßige Backups des Datenbank-Volumes
   - Portainer → Volumes → Backup

5. ✅ **Monitoring einrichten**
   - Health-Check überwachen
   - Logs regelmäßig prüfen

## 📝 Wichtige Dateien im Repository

- `docker-compose.portainer-production.yml` - Docker Compose für Port 80
- `Dockerfile` - Docker Build-Konfiguration
- `docker-start.sh` - Start-Skript für Container
- `PORTAINER_DEPLOYMENT_SCHULSERVER.md` - Allgemeine Deployment-Anleitung

Viel Erfolg! 🚀

