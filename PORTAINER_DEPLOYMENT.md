# Portainer.io Deployment Anleitung für JohnnyMonkey

**Aktueller Schülerzugang (nicht diese alte 8080-Anleitung):**

- Unterricht: `https://mnsplusdocker:44443/`
- Von außen: `https://rpl-50147-0.dn.mnsnet.de:44443/`

Die App läuft mit Host-Netz auf Port **80** (HTTP intern). HTTPS und Port 44443 kommen von der Sophos-Firewall. Siehe README und `DEPLOY_PORTAINER_CHECKLIST.md`.

## Übersicht

Diese Anleitung zeigt Schritt für Schritt, wie du die JohnnyMonkey App mit nginx Reverse Proxy in Portainer.io deployst.

**Wichtig:** Port 80 ist nicht verfügbar, daher verwenden wir Port **8080** auf dem Host.

## Voraussetzungen

- Portainer.io läuft bereits (z.B. auf `https://192.168.8.1:9443/`)
- Docker Host ist erreichbar
- Git Repository mit JohnnyMonkey Code
- Zugriff auf Portainer Admin-Panel

## Schritt 1: Portainer öffnen

1. Öffne Portainer in deinem Browser:
   ```
   https://192.168.8.1:9443/
   ```
2. Logge dich ein

## Schritt 2: Stack erstellen oder aktualisieren

### Option A: Neuer Stack (wenn noch keiner existiert)

1. Klicke links auf **Stacks**
2. Klicke auf **Add stack**
3. Gib einen Namen ein: `johnnymonkey` oder `JohnnyMonkey`
4. Wähle die Methode:

   **Methode 1: Git Repository (empfohlen)**
   - Wähle **Repository**
   - Repository URL: `https://github.com/arvicodes/JohnnyMonkey.git`
   - Reference: `main` (oder dein Branch)
   - Compose path: `docker-compose.yml`
   - Klicke auf **Pull and deploy**

   **Methode 2: Web Editor**
   - Wähle **Web editor**
   - Kopiere den Inhalt der `docker-compose.yml` (siehe unten)
   - Füge ihn ein
   - Klicke auf **Deploy the stack**

### Option B: Bestehenden Stack aktualisieren

1. Klicke links auf **Stacks**
2. Finde deinen JohnnyMonkey Stack
3. Klicke auf den Stack-Namen
4. Klicke auf **Editor** (oder **Update the stack**)

   **Wenn Git-basiert:**
   - Klicke auf **Pull and redeploy**
   - Portainer lädt automatisch die neueste Version

   **Wenn Web Editor:**
   - Ersetze den Inhalt mit der neuen `docker-compose.yml`
   - Klicke auf **Update the stack**

## Schritt 3: docker-compose.yml Inhalt

Falls du den Web Editor verwendest, kopiere diesen Inhalt:

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
      # Persistente Datenbank
      - johnnymonkey_db:/app/server/prisma
      # Material-Dateien
      - ./material:/app/material:ro
      # Optional: Logs für einfacheren Zugriff
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
    # Erstelle nginx.conf direkt im Container (für Portainer Git-basierte Stacks)
    command: >
      sh -c "
      echo 'server {
        listen 80;
        server_name _;
        client_max_body_size 50M;
        location / {
          proxy_pass http://johnnymonkey:3000;
          proxy_http_version 1.1;
          proxy_set_header Host $$host;
          proxy_set_header X-Real-IP $$remote_addr;
          proxy_set_header X-Forwarded-For $$proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $$scheme;
          proxy_set_header X-Forwarded-Host $$host;
          proxy_set_header Upgrade $$http_upgrade;
          proxy_set_header Connection \"upgrade\";
          proxy_connect_timeout 60s;
          proxy_send_timeout 60s;
          proxy_read_timeout 60s;
        }
      }' > /etc/nginx/conf.d/default.conf &&
      nginx -g 'daemon off;'
      "
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

## Schritt 4: nginx.conf - Automatisch erstellt

**Wichtig:** Die `nginx.conf` wird automatisch im Container erstellt. Du musst nichts tun!

Die aktuelle `docker-compose.yml` erstellt die nginx-Konfiguration direkt beim Container-Start. Das funktioniert sowohl mit Git-basierten als auch mit Web Editor Stacks.

**Falls du die nginx.conf manuell ändern möchtest:**

1. Gehe zu **Containers** → **johnnymonkey-nginx** → **Console**
2. Prüfe die aktuelle Config:
   ```bash
   cat /etc/nginx/conf.d/default.conf
   ```
3. Die Config wird automatisch beim Container-Start erstellt

**Inhalt der automatisch erstellten nginx.conf:**
```nginx
server {
  listen 80;
  server_name _;
  client_max_body_size 50M;
  location / {
    proxy_pass http://johnnymonkey:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}
```

## Schritt 5: Stack deployen

1. Nach dem Einfügen der Konfiguration:
   - Klicke auf **Deploy the stack** (neuer Stack)
   - Oder **Update the stack** (bestehender Stack)

2. Portainer startet jetzt:
   - Build des johnnymonkey Images (kann einige Minuten dauern)
   - Start des johnnymonkey Containers
   - Start des nginx Containers

3. Warte, bis beide Container laufen (Status: **Running**)

## Schritt 6: Container-Status prüfen

1. Gehe zu **Containers** (links im Menü)
2. Du solltest sehen:

   **johnnymonkey-app:**
   - Status: 🟢 Running
   - Published Ports: **leer** ✓ (nur expose 3000)
   - Image: `johnnymonkey:latest`

   **johnnymonkey-nginx:**
   - Status: 🟢 Running
   - Published Ports: `8080:80` ✓
   - Image: `nginx:alpine`

## Schritt 7: Logs prüfen

1. Klicke auf **johnnymonkey-app** → **Logs**
2. Suche nach:
   ```
   🎯 Server is running on port 3000
   ✅ Monitoring system initialized
   ```
3. Klicke auf **johnnymonkey-nginx** → **Logs**
4. Sollte keine Fehler zeigen

## Schritt 8: Testen

### Intern testen:
```
http://<DOCKER_HOST_IP>:8080/
```
oder
```
http://mnsplusdocker:8080/
```

Die App sollte erreichbar sein!

### Über Sophos testen:
1. In Sophos Firewall konfigurieren:
   - HTTPS-Termination (Sophos macht TLS)
   - Weiterleitung auf Docker Host Port **8080** (nicht 80!)
2. Externe URL testen:
   ```
   https://<deine-externe-url>/
   ```

## Schritt 9: Sophos Firewall konfigurieren

**Wichtig:** Da Port 80 nicht verfügbar ist, muss Sophos auf Port **8080** weiterleiten.

1. **HTTPS-Termination:**
   - Sophos macht TLS-Termination
   - Zertifikat wird von Sophos verwaltet

2. **Weiterleitung:**
   - Externe HTTPS-Anfragen → Sophos
   - Sophos leitet HTTP weiter an: `<DOCKER_HOST_IP>:8080`
   - **Nicht Port 80, sondern Port 8080!**

3. **NAT-Regel oder Reverse Proxy:**
   - Ziel: Docker Host IP-Adresse
   - Port: **8080** (HTTP)

## Troubleshooting

### Problem: Container startet nicht

**Lösung:**
1. Prüfe Logs: Containers → Container → Logs
2. Prüfe, ob Port 8080 bereits belegt ist:
   ```bash
   # Auf dem Docker Host
   sudo lsof -i :8080
   ```
3. Falls Port belegt: Anderen Service stoppen oder anderen Port wählen (z.B. 8081)

### Problem: 502 Bad Gateway

**Ursache:** nginx kann die App nicht erreichen

**Lösung:**
1. Prüfe, ob `johnnymonkey-app` läuft
2. Prüfe Netzwerk: Beide Container müssen im selben Netzwerk sein
3. Prüfe Logs von beiden Containern
4. Teste im Container:
   ```bash
   # In Portainer: johnnymonkey-app → Console
   curl http://localhost:3000/health
   ```

### Problem: nginx.conf wird nicht gefunden

**Lösung:**
1. Die nginx.conf wird automatisch beim Container-Start erstellt
2. Prüfe im nginx Container:
   ```bash
   # In Portainer: johnnymonkey-nginx → Console
   cat /etc/nginx/conf.d/default.conf
   ```
3. Falls die Datei leer ist oder fehlt:
   - Prüfe Container-Logs auf Fehler
   - Starte den Container neu
   - Die Config wird beim Start automatisch erstellt

### Problem: Build schlägt fehl

**Lösung:**
1. Prüfe Build-Logs in Portainer
2. Stelle sicher, dass alle Dateien im Git Repository sind
3. Prüfe Dockerfile auf Fehler
4. Teste Build lokal:
   ```bash
   docker build -t johnnymonkey:test .
   ```

### Problem: Port 8080 bereits belegt

**Lösung:**
1. Wähle einen anderen Port, z.B. 8081:
   ```yaml
   ports:
     - "8081:80"
   ```
2. Update den Stack
3. Sophos muss dann auf den neuen Port weiterleiten

## Wichtige Ports

| Service | Host Port | Container Port | Beschreibung |
|---------|-----------|----------------|--------------|
| nginx | **8080** | 80 | Reverse Proxy (für Sophos) |
| johnnymonkey | - | 3000 | App (nur intern) |
| Portainer | 9443 | 9443 | Portainer UI |

## Zusammenfassung

✅ Stack in Portainer erstellt/aktualisiert  
✅ docker-compose.yml mit Port 8080 konfiguriert  
✅ nginx.conf vorhanden  
✅ Container laufen  
✅ Intern getestet auf Port 8080  
✅ Sophos auf Port 8080 konfiguriert  

## Nächste Schritte

1. ✅ Stack ist deployed
2. ✅ Container laufen
3. ✅ Intern getestet
4. ⏭️ Sophos Firewall konfigurieren (Port 8080!)
5. ⏭️ Extern über HTTPS testen

---

**Hinweis:** Port 80 ist nicht verfügbar, daher verwenden wir Port **8080** auf dem Host. nginx läuft intern weiter auf Port 80, nur der Host-Port ist 8080.

