# Portainer - macOS Port-Mapping Problem lösen

## ✅ Container läuft perfekt!

Die Container-Details zeigen:
- ✅ Status: Running
- ✅ Health: Healthy
- ✅ Port-Mapping: `0.0.0.0:3001  3001/tcp`

## ❌ Problem

Auf macOS/Docker Desktop wird `0.0.0.0` manchmal nicht richtig weitergeleitet. Der Port ist gemappt, aber nicht erreichbar.

## ✅ Lösung: Port-Mapping explizit auf localhost setzen

Die docker-compose.yml wurde aktualisiert:

```yaml
ports:
  - "127.0.0.1:3001:3001"  # Explizit localhost statt 0.0.0.0
```

## 📋 Schritt-für-Schritt

### Schritt 1: Stack aktualisieren

1. **Stacks** → `johnnymonkey` → **"Editor"**
2. **Suche** nach:
   ```yaml
   ports:
     - "3001:3001"
   ```
3. **Ändere** zu:
   ```yaml
   ports:
     - "127.0.0.1:3001:3001"
   ```
4. **"Update the stack"** klicken

### Schritt 2: Warten

- Container wird neu erstellt
- Warte 30-60 Sekunden

### Schritt 3: Testen

1. **Browser**: `http://localhost:3001`
2. Die App sollte jetzt laufen! 🎉

## 🔧 Alternative: Docker Desktop neu starten

Falls das nicht hilft:

1. **Docker Desktop** → **Quit** (komplett beenden)
2. **Warte** 10 Sekunden
3. **Docker Desktop** neu starten
4. **Warte** bis Docker läuft
5. **Versuche** erneut: `http://localhost:3001`

## 🔧 Alternative 2: Port ändern

Falls Port 3001 weiterhin Probleme macht:

1. **Stacks** → `johnnymonkey` → **"Editor"**
2. **Ändere** zu:
   ```yaml
   ports:
     - "127.0.0.1:3002:3001"  # Host-Port ändern
   ```
3. **"Update the stack"**
4. **Versuche**: `http://localhost:3002`

## 💡 Warum funktioniert das?

- `0.0.0.0` bedeutet "alle Interfaces"
- Auf macOS blockiert Docker Desktop manchmal `0.0.0.0`
- `127.0.0.1` ist explizit localhost
- Das funktioniert zuverlässiger auf macOS

## ✅ Zusammenfassung

1. **docker-compose.yml** wurde aktualisiert
2. **Stack** in Portainer aktualisieren
3. **Port-Mapping** explizit auf `127.0.0.1` setzen
4. **Testen**: `http://localhost:3001`

Viel Erfolg! 🚀

