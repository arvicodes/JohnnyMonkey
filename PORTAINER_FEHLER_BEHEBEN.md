# Portainer Fehler beheben: "unknown instruction: version:"

## ❌ Problem

Du siehst den Fehler: `Unable to build image: dockerfile parse error on line 1: unknown instruction: version:`

**Das bedeutet**: Portainer versucht, deine `docker-compose.yml` als Dockerfile zu interpretieren!

## ✅ Lösung

### Schritt 1: Stelle sicher, dass du im richtigen Bereich bist

1. **Gehe zu**: Portainer → **"Stacks"** (NICHT "Images" oder "Containers")
2. Klicke auf **"Add stack"**

### Schritt 2: Wähle die richtige Build-Methode

**WICHTIG**: Du musst **"Web editor"** wählen (für docker-compose.yml), NICHT "Upload" oder "Build image"

### Schritt 3: Korrekte docker-compose.yml verwenden

Portainer hat Probleme mit dem `build` Kontext, wenn der Code nicht verfügbar ist. Hier sind zwei Lösungen:

## 🔧 Lösung A: Repository-Methode (Empfohlen)

1. **Build method**: Wähle **"Repository"** (nicht "Web editor")
2. **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
3. **Branch**: `epo-noten-und-advent` (oder dein aktueller Branch)
4. **Compose path**: `docker-compose.yml`
5. **Deploy the stack**

Portainer lädt dann den Code herunter und baut das Image automatisch!

## 🔧 Lösung B: Web Editor mit vorbereitetem Image

Wenn du die Repository-Methode nicht verwenden kannst:

### 1. Image zuerst manuell bauen (im Terminal)

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker build -t johnnymonkey:latest .
```

### 2. In Portainer: docker-compose.yml anpassen

Verwende diese Version (ohne `build`, nur `image`):

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
      - johnnymonkey_material:/app/material:ro
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
  johnnymonkey_material:
    name: johnnymonkey_material
  johnnymonkey_logs:
    name: johnnymonkey_logs
```

### 3. In Portainer einfügen

1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"**
4. Füge die angepasste docker-compose.yml ein
5. **"Deploy the stack"**

## 🔧 Lösung C: Nur Portainer starten (ohne App)

Wenn du nur Portainer verwenden willst, ohne die App über Stacks zu starten:

1. **Stacks** → **"Add stack"**
2. **Name**: `portainer-only`
3. **Build method**: **"Web editor"**
4. Füge nur den Portainer-Service ein:

```yaml
version: '3.8'

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    ports:
      - "9000:9000"
    command: -H unix:///var/run/docker.sock

volumes:
  portainer_data:
```

5. **"Deploy the stack"**

Dann kannst du die App später manuell über **"Containers" → "Add container"** erstellen.

## ✅ Empfohlene Vorgehensweise

**Am einfachsten**: Verwende **Lösung A (Repository-Methode)**

1. Portainer → **Stacks** → **Add stack**
2. **Repository** wählen
3. GitHub-URL eingeben
4. Portainer macht den Rest automatisch!

## 🐛 Falls es immer noch nicht funktioniert

### Prüfe:
1. Bist du wirklich in **"Stacks"**? (NICHT "Images" oder "Containers")
2. Hast du **"Repository"** oder **"Web editor"** gewählt? (NICHT "Upload" oder "Build image")
3. Ist die docker-compose.yml korrekt formatiert? (YAML-Syntax)

### Debug:
- **Stacks** → Dein Stack → **"Logs"** Tab → Lies die Fehlermeldung
- Oder: **Containers** → Prüfe ob Container erstellt wurden

## 📝 Zusammenfassung

**Der Fehler passiert, weil:**
- Portainer die docker-compose.yml als Dockerfile interpretiert
- Du möglicherweise im falschen Bereich bist (Images statt Stacks)
- Der Build-Kontext nicht verfügbar ist

**Die Lösung:**
- Verwende **Stacks** → **Repository-Methode**
- Oder: Baue das Image vorher und verwende nur `image:` statt `build:`

Viel Erfolg! 🚀

