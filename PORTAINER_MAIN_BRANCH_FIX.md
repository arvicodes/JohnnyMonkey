# Portainer main Branch Problem lösen

## ✅ Bestätigung: main Branch existiert!

Der `main` Branch existiert definitiv auf GitHub. Das Problem liegt bei Portainer.

## 🔍 Mögliche Ursachen

1. **Portainer-Cache** - Portainer hat alte Daten gecacht
2. **GitHub API-Limit** - Zu viele Anfragen
3. **Repository-Zugriff** - Portainer kann das Repository nicht erreichen
4. **Timing** - Portainer prüft zu schnell, bevor GitHub antwortet

## ✅ Lösung 1: Repository-URL genau prüfen

In Portainer beim Stack erstellen:

1. **Repository URL**: Stelle sicher, dass es **genau** so ist:
   ```
   https://github.com/arvicodes/JohnnyMonkey.git
   ```
   
2. **NICHT verwenden**:
   - `git@github.com:arvicodes/JohnnyMonkey.git` (SSH)
   - `https://github.com/arvicodes/JohnnyMonkey` (ohne .git)
   - Leerzeichen am Anfang/Ende

3. **Branch**: `main` (kleingeschrieben, nicht `Main` oder `MAIN`)

## ✅ Lösung 2: Portainer neu starten

Manchmal hilft es, Portainer neu zu starten:

1. **Containers** → Suche nach `portainer`
2. **Drei Punkte** (⋮) → **"Restart"**
3. Warte 30 Sekunden
4. Versuche es nochmal

## ✅ Lösung 3: Stack mit vollständiger URL erstellen

Versuche es mit der vollständigen GitHub-URL:

1. **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
2. **Branch**: `main`
3. **Compose path**: `docker-compose.yml`
4. **Optional**: Aktiviere **"Always pull the image"** (falls vorhanden)

## ✅ Lösung 4: Web Editor verwenden (funktioniert immer)

Falls die Repository-Methode weiterhin Probleme macht:

1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"**
4. **Kopiere** den Inhalt der `docker-compose.yml` aus deinem Projekt
5. **Füge** ihn ein
6. **"Deploy the stack"**

⚠️ **ABER**: Bei Web Editor muss Portainer Zugriff auf den Build-Kontext haben. Das funktioniert nur mit Repository-Methode oder vorherigem Build.

## ✅ Lösung 5: Image lokal bauen (Sicherste Methode)

### Schritt 1: Image bauen
```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker build -t johnnymonkey:latest .
```

### Schritt 2: Vereinfachte docker-compose.yml verwenden
1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"**
4. **Füge** diese docker-compose.yml ein (verwendet `image:` statt `build:`):

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

5. **"Deploy the stack"**

## 🎯 Empfohlene Reihenfolge

1. **Zuerst**: Lösung 1 - Repository-URL genau prüfen
2. **Dann**: Lösung 2 - Portainer neu starten
3. **Falls nicht**: Lösung 5 - Image lokal bauen

## 💡 Warum funktioniert main nicht?

Der Branch existiert, aber Portainer findet ihn nicht. Das kann passieren, wenn:
- Portainer-Cache veraltet ist
- GitHub API-Limit erreicht
- Netzwerk-Problem zwischen Portainer und GitHub
- Repository ist privat (dann braucht man Authentifizierung)

## ✅ Schnelltest

Teste, ob GitHub erreichbar ist:
```bash
curl -I https://github.com/arvicodes/JohnnyMonkey.git
```

Falls das funktioniert, sollte auch Portainer es erreichen können.

Viel Erfolg! 🚀


