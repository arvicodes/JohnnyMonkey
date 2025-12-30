# Portainer Branch-Problem lösen

## ❌ Problem

Fehler: `Unable to fetch git repository id: could not find ref "main" in the repository`

**Ursache**: Portainer findet den Branch nicht, obwohl er existiert. Mögliche Gründe:
- Portainer-Cache-Problem
- Repository-Zugriff-Problem
- Branch-Name wird nicht richtig erkannt

## ✅ Lösung 1: Anderen Branch verwenden

Der Branch `epo-noten-und-advent` existiert auch und hat den gleichen Code:

1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Repository"**
4. **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
5. **Branch**: `epo-noten-und-advent` ← **HIER ÄNDERN!**
6. **Compose path**: `docker-compose.yml`
7. **"Deploy the stack"**

## ✅ Lösung 2: Web Editor verwenden (Empfohlen)

Wenn die Repository-Methode Probleme macht:

1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"** ← **HIER ÄNDERN!**
4. **Im Editor**: Füge die docker-compose.yml ein (siehe unten)
5. **"Deploy the stack"**

⚠️ **ABER**: Bei Web Editor muss Portainer Zugriff auf den Build-Kontext haben. Das funktioniert nur, wenn:
- Du die Repository-Methode verwendest, ODER
- Du das Image vorher baust

## ✅ Lösung 3: Repository-URL prüfen

Stelle sicher, dass die URL korrekt ist:
- ✅ `https://github.com/arvicodes/JohnnyMonkey.git`
- ❌ NICHT: `git@github.com:arvicodes/JohnnyMonkey.git` (SSH funktioniert nicht)

## ✅ Lösung 4: Image vorher bauen (Sicherste Methode)

### Schritt 1: Image lokal bauen
```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker build -t johnnymonkey:latest .
```

### Schritt 2: Vereinfachte docker-compose.yml verwenden
1. **Stacks** → **"Add stack"**
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"**
4. **Füge** diese docker-compose.yml ein:

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

## 🎯 Empfohlene Vorgehensweise

**Am einfachsten**: Lösung 1 - Branch `epo-noten-und-advent` verwenden

**Am sichersten**: Lösung 4 - Image vorher bauen

## 💡 Warum funktioniert main nicht?

Mögliche Gründe:
- Portainer-Cache muss geleert werden
- GitHub API-Limit erreicht
- Repository ist privat (dann braucht man Authentifizierung)

## ✅ Schnelllösung

**Verwende einfach den Branch `epo-noten-und-advent`** - er hat den gleichen Code!

Viel Erfolg! 🚀


