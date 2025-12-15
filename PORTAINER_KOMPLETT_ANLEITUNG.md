# 🚀 Portainer.io Deployment - Komplette Anleitung für Schulserver

Diese Anleitung führt dich Schritt für Schritt durch das Deployment der JohnnyMonkey App auf Portainer.io.

## 📋 Voraussetzungen

- ✅ Portainer.io läuft bereits auf dem Server (Port 9443)
- ✅ Git-Repository ist verfügbar
- ✅ Sophos Firewall übernimmt HTTPS-Terminierung
- ⚠️ **Wichtig:** Ein nginx-Container ("webserver") läuft bereits auf Port 80

## 🔗 Wichtige Links

- **Git-Repository**: https://github.com/arvicodes/JohnnyMonkey.git
- **Branch**: `main`
- **Docker Compose Datei**: `docker-compose.yml`
- **Portainer.io**: Normalerweise erreichbar über `https://<server-ip>:9443`

## ⚠️ Schritt 0: Port-Konflikt lösen

**WICHTIG:** Es läuft bereits ein nginx-Container ("webserver") auf Port 80!

### Option A: Node.js direkt auf Port 80 (Empfohlen)

1. Öffne Portainer.io: `https://<server-ip>:9443`
2. Navigiere zu **Containers** (linke Seitenleiste)
3. Suche den Container **webserver** (nginx)
4. Klicke auf den Container-Namen
5. Klicke auf **Stop** (Stoppt den Container)
6. Optional: Klicke auf **Delete** (Löscht den Container, wenn nicht mehr benötigt)

### Option B: Bestehenden nginx behalten

Wenn der nginx-Container weiterhin benötigt wird, muss die `docker-compose.yml` angepasst werden. Kontaktiere die Schulserververwaltung für Details.

## 📦 Schritt 1: Stack in Portainer.io erstellen

### 1.1 Portainer.io öffnen

1. Öffne deinen Browser
2. Navigiere zu: `https://<server-ip>:9443`
3. Logge dich mit deinen Administrator-Credentials ein

### 1.2 Zu Stacks navigieren

1. In der linken Seitenleiste klicke auf **Stacks**
2. Du siehst eine Liste aller vorhandenen Stacks
3. Klicke auf **Add Stack** (Button oben rechts)

### 1.3 Stack-Konfiguration

**Wähle "Repository" als Build-Methode:**

1. **Name**: `johnnymonkey` (oder ein anderer Name deiner Wahl)
2. **Build method**: Wähle **Repository** (nicht "Web editor")
3. **Repository URL**: 
   ```
   https://github.com/arvicodes/JohnnyMonkey.git
   ```
4. **Repository reference**: `main` (oder dein Branch-Name)
5. **Compose path**: `docker-compose.yml` (Standard, sollte bereits ausgefüllt sein)
6. **Auto update**: Optional aktivieren für automatische Updates

### 1.4 Stack deployen

1. Scrolle nach unten
2. Klicke auf **Deploy the stack**
3. Portainer beginnt mit dem Build-Prozess
4. Dies kann einige Minuten dauern (erster Build)

## 🔍 Schritt 2: Build-Prozess überwachen

### 2.1 Build-Logs ansehen

1. Nach dem Klicken auf "Deploy the stack" siehst du die Build-Logs
2. Der Build-Prozess umfasst:
   - Git-Repository klonen
   - Docker Image bauen
   - Dependencies installieren
   - Client und Server kompilieren
   - Container starten

### 2.2 Was du sehen solltest

```
✓ Cloning repository...
✓ Building image...
✓ Installing dependencies...
✓ Building server...
✓ Building client...
✓ Starting container...
```

### 2.3 Bei Fehlern

- Prüfe die Build-Logs auf Fehlermeldungen
- Stelle sicher, dass Port 80 nicht belegt ist
- Prüfe, ob der nginx-Container gestoppt wurde

## ✅ Schritt 3: Container-Status prüfen

### 3.1 Container-Liste ansehen

1. Navigiere zu **Containers** (linke Seitenleiste)
2. Suche nach **johnnymonkey-app**
3. Status sollte **Running** (grün) sein

### 3.2 Container-Details prüfen

1. Klicke auf **johnnymonkey-app**
2. Prüfe die Details:
   - **Status**: Running ✓
   - **Published Ports**: `80:3000` ✓
   - **Image**: `johnnymonkey:latest` ✓
   - **Restart Policy**: `unless-stopped` ✓

### 3.3 Logs prüfen

1. Klicke auf den Tab **Logs**
2. Suche nach:
   ```
   🎯 Server is running on port 3000
   🌐 Environment: production
   🔗 Health check: http://localhost:3000/health
   ✅ Monitoring system initialized
   ```

## 🧪 Schritt 4: App testen

### 4.1 Interner Test (auf dem Server)

1. Öffne einen Browser auf dem Server
2. Navigiere zu: `http://localhost` oder `http://127.0.0.1`
3. Die JohnnyMonkey App sollte geladen werden

### 4.2 Externer Test (vom Schulnetzwerk)

1. Öffne einen Browser auf einem anderen Computer im Schulnetzwerk
2. Navigiere zu: `http://<server-ip>`
3. Die App sollte erreichbar sein

### 4.3 Health Check testen

1. Öffne: `http://<server-ip>/health`
2. Du solltest eine JSON-Antwort sehen:
   ```json
   {"status":"ok","timestamp":"..."}
   ```

## 🔒 Schritt 5: HTTPS über Sophos Firewall

Die Sophos Firewall übernimmt die HTTPS-Terminierung. Die Konfiguration muss von der Schulserververwaltung durchgeführt werden:

1. **HTTPS-Terminierung**: Sophos macht TLS-Termination
2. **Weiterleitung**: Sophos leitet HTTP-Anfragen an Port 80 weiter
3. **Zertifikat**: Sophos verwaltet das SSL-Zertifikat

**Nach der Konfiguration:**
- Die App ist über HTTPS erreichbar: `https://<externe-url>`
- HTTP wird automatisch auf HTTPS umgeleitet

## 🔄 Schritt 6: Updates durchführen

### 6.1 Automatische Updates (wenn aktiviert)

Wenn "Auto update" aktiviert wurde, aktualisiert Portainer automatisch, wenn neue Commits gepusht werden.

### 6.2 Manuelle Updates

1. Navigiere zu **Stacks**
2. Klicke auf **johnnymonkey**
3. Klicke auf **Editor**
4. Klicke auf **Pull and redeploy**
5. Portainer lädt die neueste Version vom Git-Repository
6. Der Container wird neu gebaut und gestartet

### 6.3 Container neu bauen

1. Navigiere zu **Stacks**
2. Klicke auf **johnnymonkey**
3. Klicke auf **Editor**
4. Klicke auf **Rebuild**
5. Der Container wird neu gebaut ohne Git-Pull

## 🐛 Troubleshooting

### Problem: Container startet nicht

**Lösung:**
1. Prüfe die Logs: **Containers** → **johnnymonkey-app** → **Logs**
2. Prüfe, ob Port 80 belegt ist:
   - Gehe zu **Containers**
   - Suche nach anderen Containern auf Port 80
   - Stoppe diese Container
3. Prüfe die Health Check Logs

### Problem: Port 80 bereits belegt

**Fehlermeldung:** `Error: bind: address already in use`

**Lösung:**
1. Stoppe den nginx-Container ("webserver")
2. Oder ändere den Port in der docker-compose.yml (nicht empfohlen)

### Problem: App nicht erreichbar

**Lösung:**
1. Prüfe Container-Status: Muss "Running" sein
2. Prüfe Port-Mapping: Muss `80:3000` sein
3. Prüfe Firewall-Regeln auf dem Server
4. Teste intern: `http://localhost`
5. Prüfe Logs auf Fehler

### Problem: 502 Bad Gateway

**Ursache:** Container läuft nicht oder Port-Mapping falsch

**Lösung:**
1. Prüfe Container-Status
2. Prüfe Logs
3. Prüfe Port-Mapping in Container-Details

### Problem: Datenbank-Fehler

**Lösung:**
1. Prüfe Volume `johnnymonkey_database`:
   - **Volumes** → **johnnymonkey_database**
   - Stelle sicher, dass es existiert
2. Prüfe Logs auf Datenbank-Fehler
3. Prüfe Berechtigungen des Volumes

### Problem: Build schlägt fehl

**Lösung:**
1. Prüfe Build-Logs auf spezifische Fehler
2. Stelle sicher, dass Git-Repository erreichbar ist
3. Prüfe Branch-Name (sollte `main` sein)
4. Prüfe Compose-Pfad (sollte `docker-compose.yml` sein)

## 📊 Wichtige Ports und Services

| Service | Host Port | Container Port | Beschreibung |
|---------|-----------|----------------|--------------|
| JohnnyMonkey | **80** | 3000 | Node.js Webserver |
| Portainer | 9443 | 9443 | Portainer.io UI |

## 📁 Volumes

Folgende Volumes werden automatisch erstellt:

1. **johnnymonkey_database**
   - Pfad: `/app/server/prisma`
   - Zweck: Persistente SQLite-Datenbank

2. **johnnymonkey_logs**
   - Pfad: `/app/logs`
   - Zweck: Log-Dateien

3. **Material-Dateien**
   - Pfad: `./material` (vom Git-Repository)
   - Zweck: Statische Material-Dateien

## 🔐 Sicherheitshinweise

1. **HTTPS**: Wird von Sophos Firewall übernommen
2. **Port 80**: Nur HTTP, HTTPS-Terminierung extern
3. **Volumes**: Werden persistent gespeichert
4. **Netzwerk**: Container läuft im isolierten Docker-Netzwerk

## 📝 Zusammenfassung der Konfiguration

- ✅ **Port**: 80 (Host) → 3000 (Container)
- ✅ **HTTPS**: Sophos Firewall übernimmt Terminierung
- ✅ **Git-Repository**: https://github.com/arvicodes/JohnnyMonkey.git
- ✅ **Branch**: `main`
- ✅ **Compose-Datei**: `docker-compose.yml`
- ✅ **Container-Name**: `johnnymonkey-app`
- ✅ **Image**: `johnnymonkey:latest`

## 🎯 Checkliste für erfolgreiches Deployment

- [ ] Portainer.io ist erreichbar
- [ ] nginx-Container ("webserver") wurde gestoppt
- [ ] Stack wurde erstellt mit Git-Repository
- [ ] Build-Prozess erfolgreich abgeschlossen
- [ ] Container läuft (Status: Running)
- [ ] Port-Mapping korrekt (80:3000)
- [ ] App erreichbar über HTTP (Port 80)
- [ ] Health Check funktioniert (`/health`)
- [ ] Logs zeigen keine Fehler
- [ ] Sophos Firewall konfiguriert für HTTPS

## 🆘 Support

Bei Problemen:
1. Prüfe die Logs in Portainer.io
2. Prüfe die Container-Details
3. Kontaktiere die Schulserververwaltung für Firewall-Konfiguration
4. Siehe Troubleshooting-Abschnitt oben

---

**Stand:** November 2024  
**Version:** 1.0  
**Git-Repository:** https://github.com/arvicodes/JohnnyMonkey.git

