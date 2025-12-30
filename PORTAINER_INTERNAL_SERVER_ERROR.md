# 🔴 Internal Server Error - Troubleshooting

## ⚠️ Problem: Internal Server Error

Du erhältst:
```json
{"error":"Internal Server Error","timestamp":"2025-12-15T13:19:13.274Z","requestId":"25lpdkysx"}
```

**Das bedeutet:**
- ✅ Container läuft
- ✅ Port-Mapping funktioniert
- ✅ Server antwortet
- ❌ Aber es gibt einen internen Fehler

## 🔍 Schritt 1: Container-Logs prüfen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app**
2. Klicke auf **Logs** Tab
3. Scrolle nach unten zu den neuesten Einträgen
4. Suche nach **Fehlermeldungen** (rot oder ERROR)

**Was du suchen solltest:**
- `Error:` oder `ERROR`
- `Failed to`
- `Cannot`
- Stack Traces
- Datenbank-Fehler

## 🔍 Schritt 2: Häufige Ursachen

### Problem 1: Datenbank-Pfad falsch

**Symptom:** Fehler beim Zugriff auf Datenbank

**Lösung:**
1. Prüfe Logs auf Datenbank-Fehler
2. Prüfe Volume-Mapping:
   - **Volumes** → **johnnymonkey_database**
   - Pfad sollte sein: `/app/server/prisma`

### Problem 2: Client-Build fehlt

**Symptom:** Fehler beim Laden der Frontend-Dateien

**Lösung:**
1. Prüfe Logs auf "Cannot find" oder "ENOENT"
2. Prüfe ob Client-Build vorhanden ist:
   - Container → **Console** → `ls -la /app/server/client-build`
3. Falls fehlt: Stack neu bauen

### Problem 3: Prisma Client nicht generiert

**Symptom:** Prisma-Fehler in den Logs

**Lösung:**
1. Container → **Console**
2. Führe aus: `cd /app/server && npx prisma generate`
3. Oder: Container neu starten

### Problem 4: Berechtigungsprobleme

**Symptom:** Permission denied Fehler

**Lösung:**
1. Prüfe Volume-Berechtigungen
2. Prüfe Container-Logs auf Permission-Fehler

## 🔧 Schritt 3: Container-Logs analysieren

**Kopiere die letzten 50 Zeilen der Logs** und suche nach:

### Datenbank-Fehler:
```
Error: Can't reach database server
PrismaClientInitializationError
```

### Pfad-Fehler:
```
ENOENT: no such file or directory
Cannot find module
```

### Berechtigungs-Fehler:
```
EACCES: permission denied
```

## 🛠️ Schritt 4: Schnelllösungen

### Lösung A: Container neu starten

1. **Containers** → **johnnymonkey-app** → **Restart**
2. Warte 30-60 Sekunden
3. Prüfe Logs erneut
4. Teste: `http://192.168.8.1`

### Lösung B: Stack neu bauen

1. **Stacks** → **johnnymonkey** → **Editor**
2. Klicke auf **Rebuild**
3. Warte auf Build-Abschluss
4. Prüfe Logs
5. Teste: `http://192.168.8.1`

### Lösung C: Container-Console prüfen

1. **Containers** → **johnnymonkey-app** → **Console**
2. Prüfe wichtige Pfade:
   ```bash
   ls -la /app/server/client-build
   ls -la /app/server/prisma
   ls -la /app/server/dist
   ```

## 📋 Schritt 5: Detaillierte Diagnose

### Prüfe Container-Struktur

**In Container-Console:**

```bash
# Prüfe Client-Build
ls -la /app/server/client-build

# Prüfe Datenbank
ls -la /app/server/prisma

# Prüfe Server-Build
ls -la /app/server/dist

# Prüfe Environment-Variablen
env | grep -E "NODE_ENV|PORT|DATABASE"
```

### Prüfe Logs für spezifische Fehler

**Suche in Logs nach:**

1. **Datenbank:**
   ```
   Prisma
   database
   SQLite
   ```

2. **Frontend:**
   ```
   client-build
   static
   index.html
   ```

3. **Server:**
   ```
   listen
   port
   EADDRINUSE
   ```

## 🐛 Häufige Fehler und Lösungen

### Fehler 1: "Cannot find module"

**Lösung:**
1. Stack neu bauen
2. Prüfe ob alle Dependencies installiert sind

### Fehler 2: "Database file not found"

**Lösung:**
1. Prüfe Volume-Mapping
2. Prüfe ob Datenbank-Datei existiert
3. Container neu starten (erstellt Datenbank neu)

### Fehler 3: "Permission denied"

**Lösung:**
1. Prüfe Volume-Berechtigungen
2. Container mit richtigen Berechtigungen neu starten

### Fehler 4: "Client build not found"

**Lösung:**
1. Stack neu bauen
2. Prüfe Build-Prozess in Logs

## 🔍 Erweiterte Diagnose

### Health Check testen

```
http://192.168.8.1/health
```

**Wenn Health Check funktioniert:**
- Server läuft grundsätzlich
- Problem liegt wahrscheinlich im Frontend oder Routing

**Wenn Health Check auch fehlschlägt:**
- Problem liegt im Server selbst
- Prüfe Logs genauer

### API-Endpunkt testen

```
http://192.168.8.1/api/monitoring/stats
```

**Wenn API funktioniert:**
- Server läuft
- Problem liegt im Frontend-Routing

## 📝 Was ich brauche

Bitte kopiere die **letzten 50 Zeilen** aus den Container-Logs und teile sie mit mir. Dann kann ich das Problem genauer identifizieren.

**Wo finde ich die Logs:**
1. Portainer.io → Containers → johnnymonkey-app
2. Tab **Logs**
3. Scrolle nach unten
4. Kopiere die letzten Zeilen

## ✅ Checkliste

- [ ] Container-Logs geprüft
- [ ] Fehlermeldungen identifiziert
- [ ] Container neu gestartet?
- [ ] Stack neu gebaut?
- [ ] Health Check getestet?
- [ ] Volume-Mapping geprüft?

## 🚀 Nächste Schritte

1. **Logs prüfen** (wichtigste Schritt!)
2. **Fehlermeldung identifizieren**
3. **Entsprechende Lösung anwenden**
4. **App erneut testen**

---

**Wichtig:** Die Logs zeigen die genaue Ursache des Fehlers!


