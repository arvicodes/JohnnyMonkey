# Portainer - App läuft nicht (Safari kann Seite nicht öffnen)

## ❌ Problem

Port ist veröffentlicht (`0.0.0.0:3001`), aber Safari kann die Seite nicht öffnen.

## 🔍 Schritt 1: Logs prüfen

Das ist das Wichtigste! Die Logs zeigen dir, was das Problem ist.

### In Portainer:
1. **Containers** → `johnnymonkey-app` → **"Logs"** Tab
2. **Scrolle nach unten** (neueste Logs sind unten)
3. **Suche nach Fehlermeldungen** (rot markiert)

### Was du sehen solltest:
- ✅ `Server is running on port 3001`
- ✅ `Prisma client generated`
- ✅ `Health check: http://localhost:3001/health`

### Was du NICHT sehen solltest:
- ❌ `Error: ...`
- ❌ `Failed to start...`
- ❌ `Port already in use`
- ❌ `Cannot connect to database`

## 🔍 Schritt 2: Container-Status prüfen

1. **Containers** → `johnnymonkey-app`
2. **Prüfe**:
   - **Status**: Sollte "Running" sein (grüner Punkt)
   - **Health**: Sollte "Healthy" sein (falls Health Check aktiviert)
   - **Uptime**: Wie lange läuft der Container?

## 🔧 Lösung 1: Container neu starten

Manchmal hilft ein Neustart:

1. **Containers** → `johnnymonkey-app` → **"Restart"**
2. **Warte** 30-60 Sekunden
3. **Prüfe** Logs erneut
4. **Versuche** http://localhost:3001 erneut

## 🔧 Lösung 2: Port prüfen

### Prüfe, ob Port wirklich frei ist:
1. **Containers** → Prüfe, ob ein anderer Container Port 3001 nutzt
2. **Oder im Terminal**:
   ```bash
   lsof -i :3001
   ```

### Falls Port belegt:
- Anderen Container stoppen
- Oder Port in docker-compose.yml ändern

## 🔧 Lösung 3: Health Check prüfen

1. **Containers** → `johnnymonkey-app` → **"Console"**
2. **Wähle** "sh" oder "bash"
3. **"Connect"** klicken
4. **Im Container**:
   ```bash
   curl http://localhost:3001/health
   ```

Falls das funktioniert, läuft die App, aber der Port-Mapping ist falsch.

## 🔧 Lösung 4: Container-Logs genau lesen

### Häufige Probleme:

#### Problem: "Cannot find module"
- **Lösung**: Image neu bauen
  ```bash
  docker build -t johnnymonkey:latest .
  ```
- Dann Container neu erstellen

#### Problem: "Port already in use"
- **Lösung**: Anderen Container stoppen
- Oder Port ändern

#### Problem: "Database error"
- **Lösung**: Prisma Client generieren
- Console → `cd /app/server && npx prisma generate`

#### Problem: "Cannot connect to database"
- **Lösung**: Volume prüfen
- Volumes → `johnnymonkey_database` → Inspect

## 🔧 Lösung 5: Container komplett neu erstellen

Falls nichts hilft:

1. **Containers** → `johnnymonkey-app` → **"Remove"**
2. **Stacks** → `johnnymonkey` → **"Editor"**
3. **"Update the stack"** (mit Rebuild aktiviert)

## 🔧 Lösung 6: Direkt im Container testen

1. **Containers** → `johnnymonkey-app` → **"Console"**
2. **Shell öffnen**
3. **Teste**:
   ```bash
   curl http://localhost:3001/health
   ```
4. Falls das funktioniert: Port-Mapping ist das Problem
5. Falls nicht: App startet nicht richtig

## 📋 Checkliste

- [ ] Logs geprüft
- [ ] Container-Status geprüft (Running?)
- [ ] Health Check geprüft
- [ ] Port 3001 frei?
- [ ] Container neu gestartet?
- [ ] Im Container getestet (curl)?

## 🎯 Nächste Schritte

**WICHTIG**: Teile mir mit, was in den **Logs** steht! Das hilft am meisten.

Die häufigsten Probleme:
1. **App startet nicht** → Logs zeigen Fehler
2. **Port-Mapping falsch** → Container läuft, aber Port nicht erreichbar
3. **Datenbank-Problem** → Prisma-Fehler in Logs

## 💡 Tipp

**Kopiere die letzten 20-30 Zeilen aus den Logs** und teile sie mir mit. Dann kann ich dir genau sagen, was das Problem ist!

Viel Erfolg! 🚀

