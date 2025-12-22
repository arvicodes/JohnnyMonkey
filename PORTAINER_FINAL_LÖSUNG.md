# Portainer - Finale Lösung (main Branch Problem)

## ❌ Problem

Portainer findet den `main` Branch nicht, obwohl er existiert. Das ist ein bekanntes Portainer-Problem.

## ✅ Lösung: Image lokal bauen + Web Editor

### Schritt 1: Image lokal bauen

Öffne ein **Terminal** und führe aus:

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker build -t johnnymonkey:latest .
```

Das baut das Image lokal. Warte, bis es fertig ist (kann 5-10 Minuten dauern).

### Schritt 2: In Portainer Stack erstellen

1. **Portainer** öffnen: http://localhost:9000
2. **Stacks** → **"Add stack"**
3. **Name**: `johnnymonkey`
4. **Build method**: **"Web editor"** ← WICHTIG!
5. **Füge** diese docker-compose.yml ein:

```yaml
version: '3.8'

services:
  johnnymonkey:
    image: johnnymonkey:latest
    container_name: johnnymonkey-app
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - johnnymonkey_db:/app/server/prisma
      - ./material:/app/material:ro
      - johnnymonkey_logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.portainer.io.name=JohnnyMonkey"
      - "com.portainer.io.description=Educational Learning Platform"
      - "com.portainer.io.category=Application"
    networks:
      - johnnymonkey-network

networks:
  johnnymonkey-network:
    driver: bridge

volumes:
  johnnymonkey_db:
    name: johnnymonkey_database
  johnnymonkey_logs:
    name: johnnymonkey_logs
```

6. **"Deploy the stack"** klicken

### Schritt 3: Prüfen

1. **Containers** → `johnnymonkey-app` sollte laufen (grüner Punkt)
2. Browser: **http://localhost:3001** → App sollte laufen

## ✅ Alternative: docker-compose.portainer-simple.yml verwenden

Falls du die Datei direkt verwenden willst:

1. Öffne `docker-compose.portainer-simple.yml` in deinem Projekt
2. Kopiere den Inhalt
3. In Portainer einfügen
4. "Deploy the stack"

## 🎯 Warum funktioniert das?

- Das Image ist bereits lokal gebaut
- Portainer muss nichts bauen oder pullen
- Es verwendet einfach das lokale Image
- Keine GitHub-Zugriffsprobleme

## 💡 Tipp

Wenn du später Code-Änderungen machst:

1. **Image neu bauen**: `docker build -t johnnymonkey:latest .`
2. **In Portainer**: Stack → **"Restart"** oder Container → **"Recreate"**

Viel Erfolg! 🚀

