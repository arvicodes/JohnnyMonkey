# nginx Reverse Proxy Setup für JohnnyMonkey

## Übersicht

Diese Anleitung beschreibt die Einrichtung von nginx als Reverse Proxy für die JohnnyMonkey App mit Sophos Firewall.

**Architektur:**
```
Internet/Schulnetz
  ↓ HTTPS (Sophos macht TLS-Termination)
Sophos Firewall
  ↓ HTTP auf Port 8080
Docker Host (Port 8080)
  ↓ nginx Container (intern Port 80)
  ↓ HTTP im Docker-Netzwerk
Node.js App Container (Port 3000)
```

**Hinweis:** Port 80 ist nicht verfügbar, daher verwenden wir Port **8080** auf dem Host.

## Voraussetzungen

- Docker und Docker Compose installiert
- Portainer.io läuft bereits (auf Port 9443)
- Sophos Firewall ist konfiguriert für HTTPS-Termination
- JohnnyMonkey App ist bereits als Docker Image vorhanden

## Was wurde konfiguriert

### 1. nginx.conf
- Reverse Proxy auf Port 80
- Weiterleitung an `johnnymonkey:3000`
- X-Forwarded-Proto Header werden gesetzt
- Upload-Limit: 50MB
- WebSocket-Support vorbereitet

### 2. docker-compose.yml
- **nginx Service**: Veröffentlicht Port 8080:80 (Host Port 8080 → Container Port 80)
- **johnnymonkey Service**: Keine published ports mehr (nur expose 3000)
- Beide Container im selben Netzwerk

### 3. Express trust proxy
- `app.set('trust proxy', true)` aktiviert
- Verhindert Redirect-Schleifen bei HTTPS über Sophos

## Schritt-für-Schritt Anleitung für Portainer

### Schritt 1: Git Repository aktualisieren

1. Öffne Portainer: `https://192.168.8.1:9443/`
2. Gehe zu **Stacks**
3. Finde deinen JohnnyMonkey Stack
4. Klicke auf den Stack-Namen

### Schritt 2: Stack-Konfiguration aktualisieren

**Option A: Git-basierter Stack (empfohlen)**

1. Im Stack-Editor findest du die Git-Konfiguration
2. Stelle sicher, dass der **Branch** auf `main` steht
3. Klicke auf **Pull and redeploy** oder **Update the stack**
4. Portainer lädt die neueste `docker-compose.yml` vom Git-Repository

**Option B: Manueller Editor**

1. Klicke auf **Editor** im Stack
2. Kopiere den Inhalt der neuen `docker-compose.yml`:
   ```yaml
   version: '3.8'

   services:
     johnnymonkey:
       build: 
         context: .
         dockerfile: Dockerfile
       image: johnnymonkey:latest
       pull_policy: build
       container_name: johnnymonkey-app
       # Keine published ports mehr - nginx leitet weiter
       expose:
         - "3000"
       environment:
         - NODE_ENV=production
         - PORT=3000
       volumes:
         - johnnymonkey_db:/app/server/prisma
         - ./material:/app/material:ro
         - johnnymonkey_logs:/app/logs
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 40s
       labels:
         - "com.portainer.io.name=JohnnyMonkey"
         - "com.portainer.io.description=Educational Learning Platform"
         - "com.portainer.io.category=Application"
         - "com.portainer.io.managed=true"
       networks:
         - johnnymonkey-network

     nginx:
       image: nginx:alpine
       container_name: johnnymonkey-nginx
       ports:
         - "8080:80"  # Host Port 8080 → Container Port 80
       volumes:
         - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
       depends_on:
         - johnnymonkey
       restart: unless-stopped
       networks:
         - johnnymonkey-network
       labels:
         - "com.portainer.io.name=JohnnyMonkey Nginx"
         - "com.portainer.io.description=Reverse Proxy for JohnnyMonkey"
         - "com.portainer.io.category=Application"
         - "com.portainer.io.managed=true"

   networks:
     johnnymonkey-network:
       driver: bridge
       name: johnnymonkey-network

   volumes:
     johnnymonkey_db:
       name: johnnymonkey_database
       driver: local
     johnnymonkey_logs:
       name: johnnymonkey_logs
       driver: local
   ```
3. Ersetze den alten Inhalt
4. Klicke auf **Update the stack**

### Schritt 3: nginx.conf hochladen

**Wichtig:** Die `nginx.conf` muss im gleichen Verzeichnis wie `docker-compose.yml` liegen.

**Option A: Git-basierter Stack**
- Die `nginx.conf` ist bereits im Git-Repository
- Portainer lädt sie automatisch mit

**Option B: Manueller Upload**

1. Erstelle die Datei `nginx.conf` auf dem Docker Host im Stack-Verzeichnis
2. Oder verwende Portainer's File Manager (falls verfügbar)
3. Inhalt der `nginx.conf`:
   ```nginx
   server {
     listen 80;
     server_name _;

     # Increase body size limit for file uploads
     client_max_body_size 50M;

     location / {
       proxy_pass http://johnnymonkey:3000;
       proxy_http_version 1.1;
       
       # Preserve original host and IP
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-Host $host;
       
       # WebSocket support (falls benötigt)
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       
       # Timeouts
       proxy_connect_timeout 60s;
       proxy_send_timeout 60s;
       proxy_read_timeout 60s;
     }
   }
   ```

### Schritt 4: Stack deployen

1. Nach dem Update der `docker-compose.yml` klicke auf **Update the stack**
2. Portainer startet die Container neu
3. Warte, bis beide Container laufen:
   - `johnnymonkey-app`
   - `johnnymonkey-nginx`

### Schritt 5: Container-Status prüfen

1. Gehe zu **Containers**
2. Prüfe beide Container:

   **johnnymonkey-nginx:**
   - Status: Running (grün)
   - Published Ports: `8080:80` ✓
   - Keine anderen Ports

   **johnnymonkey-app:**
   - Status: Running (grün)
   - Published Ports: **leer** ✓ (nur expose 3000)
   - Keine Ports nach außen

### Schritt 6: Logs prüfen

1. Klicke auf **johnnymonkey-app** → **Logs**
2. Suche nach: `🎯 Server is running on port 3000`
3. Klicke auf **johnnymonkey-nginx** → **Logs**
4. Sollte keine Fehler zeigen

### Schritt 7: Intern testen

1. Auf dem Docker Host oder im selben Netzwerk:
   ```
   http://mnsplusdocker/
   ```
   oder
   ```
   http://<DOCKER_HOST_IP>/
   ```
2. Die App sollte erreichbar sein
3. Keine Fehlermeldungen

### Schritt 8: Sophos Firewall konfigurieren

**Wichtig:** Diese Schritte müssen in der Sophos Firewall durchgeführt werden.

1. **HTTPS-Termination einrichten:**
   - Sophos macht TLS-Termination (Zertifikat-Verwaltung)
   - Externe Anfragen kommen per HTTPS an Sophos

2. **Weiterleitung konfigurieren:**
   - Sophos leitet HTTP-Anfragen weiter an Docker Host Port **8080**
   - Ziel: IP-Adresse deines Docker Hosts
   - Port: **8080** (HTTP, nicht HTTPS!)

3. **Regel erstellen:**
   - NAT-Regel oder Reverse Proxy Regel
   - Externe Adresse → Docker Host:80

### Schritt 9: Extern testen

1. Über die Sophos-konfigurierte URL:
   ```
   https://<deine-externe-url>/
   ```
2. Die App sollte über HTTPS erreichbar sein
3. Zertifikat wird von Sophos bereitgestellt

## Troubleshooting

### Problem: Container startet nicht

**Lösung:**
1. Prüfe Logs: Containers → Container → Logs
2. Prüfe, ob Port 80 bereits belegt ist:
   ```bash
   # Auf dem Docker Host
   sudo lsof -i :80
   ```
3. Falls Port belegt: Anderen Service stoppen oder Port ändern

### Problem: 502 Bad Gateway

**Ursache:** nginx kann die App nicht erreichen

**Lösung:**
1. Prüfe, ob `johnnymonkey-app` läuft
2. Prüfe Netzwerk: Beide Container müssen im selben Netzwerk sein
3. Prüfe Logs von beiden Containern
4. Prüfe, ob die App auf Port 3000 hört:
   ```bash
   # Im johnnymonkey-app Container
   curl http://localhost:3000/health
   ```

### Problem: Redirect-Schleifen

**Ursache:** Express versucht auf HTTPS umzuleiten

**Lösung:**
1. Prüfe, ob `trust proxy` aktiviert ist in `server/src/index.ts`
2. Prüfe nginx Logs auf X-Forwarded-Proto Header
3. Stelle sicher, dass Sophos die Header korrekt setzt

### Problem: nginx.conf wird nicht geladen

**Ursache:** Datei liegt nicht im richtigen Verzeichnis

**Lösung:**
1. Prüfe Volume-Mapping in docker-compose.yml:
   ```yaml
   volumes:
     - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
   ```
2. Stelle sicher, dass `nginx.conf` im Stack-Verzeichnis liegt
3. Prüfe nginx Logs:
   ```bash
   # Im nginx Container
   cat /etc/nginx/conf.d/default.conf
   ```

### Problem: Port 80 bereits belegt

**Lösung:**
1. Finde den Prozess:
   ```bash
   sudo lsof -i :80
   ```
2. Stoppe den Prozess oder ändere nginx Port:
   ```yaml
   ports:
     - "8080:80"  # Statt 80:80
   ```
3. Sophos muss dann auf Port 8080 weiterleiten

## Wichtige Ports

| Service | Host Port | Container Port | Beschreibung |
|---------|-----------|----------------|--------------|
| nginx | **8080** | 80 | Reverse Proxy (für Sophos) |
| johnnymonkey | - | 3000 | App (nur intern) |
| Portainer | 9443 | 9443 | Portainer UI |

## Sicherheitshinweise

1. **Keine direkten Ports:** Die App ist nicht direkt von außen erreichbar
2. **HTTPS nur über Sophos:** Kein Zertifikat im Docker Container nötig
3. **Firewall:** Sophos schützt vor direkten Angriffen
4. **Netzwerk:** Container kommunizieren nur im Docker-Netzwerk

## Zusammenfassung der Änderungen

✅ nginx.conf erstellt  
✅ docker-compose.yml mit nginx Service aktualisiert  
✅ Express trust proxy aktiviert  
✅ Port von 3001 auf 3000 geändert  
✅ Alle Änderungen auf Git gepusht  

## Nächste Schritte nach erfolgreicher Einrichtung

1. Monitoring einrichten (optional)
2. Log-Rotation für nginx konfigurieren (optional)
3. Backup-Strategie für Volumes prüfen
4. Performance-Monitoring (optional)

## Support

Bei Problemen:
1. Prüfe Container-Logs in Portainer
2. Prüfe nginx Logs: `docker logs johnnymonkey-nginx`
3. Prüfe App Logs: `docker logs johnnymonkey-app`
4. Teste Netzwerk-Verbindung zwischen Containern

---

**Stand:** Port 3000, nginx Reverse Proxy Setup  
**Letzte Aktualisierung:** Nach Port-Änderung auf 3000

