# 🔍 Safari kann Verbindung zum Server nicht aufbauen - Troubleshooting

## Schnelle Diagnose-Schritte

### Schritt 1: Container-Status prüfen

**In Portainer.io:**

1. Öffne Portainer.io: `https://<server-ip>:9443`
2. Navigiere zu **Containers**
3. Suche nach **johnnymonkey-app**
4. Prüfe den **Status**:
   - ✅ **Running** (grün) = Container läuft
   - ❌ **Stopped** (rot) = Container ist gestoppt
   - ⚠️ **Restarting** = Container startet neu (Problem!)

**Wenn Container nicht läuft:**
- Klicke auf den Container
- Gehe zu **Logs**
- Prüfe die Fehlermeldungen

### Schritt 2: Port-Konflikt prüfen

**Problem:** Port 80 ist noch belegt vom nginx-Container!

**Lösung:**

1. In Portainer.io zu **Containers** navigieren
2. Suche nach **webserver** (nginx-Container)
3. Prüfe den Status:
   - Wenn **Running** → **STOPPEN!**
   - Klicke auf **Stop**
4. Prüfe die Ports:
   - Der nginx-Container sollte **keine** Ports auf 80 haben
   - Oder der Container sollte komplett gestoppt sein

### Schritt 3: Port-Mapping prüfen

**In Portainer.io:**

1. Klicke auf **johnnymonkey-app**
2. Gehe zu **Details** oder **Inspect**
3. Prüfe **Published Ports**:
   - ✅ Sollte sein: `80:3000` oder `0.0.0.0:80->3000/tcp`
   - ❌ Falsch: `3000:3000` oder kein Port-Mapping

**Wenn Port-Mapping falsch:**

1. Gehe zu **Stacks**
2. Klicke auf **johnnymonkey**
3. Klicke auf **Editor**
4. Prüfe die `docker-compose.yml`:
   ```yaml
   ports:
     - "80:3000"  # Muss genau so sein!
   ```
5. Wenn falsch, korrigiere und klicke auf **Update the stack**

### Schritt 4: Container-Logs prüfen

**In Portainer.io:**

1. Klicke auf **johnnymonkey-app**
2. Gehe zu **Logs**
3. Suche nach:
   ```
   🎯 Server is running on port 3000
   ```
4. Prüfe auf Fehler:
   - `EADDRINUSE` = Port bereits belegt
   - `Cannot bind to port` = Port-Problem
   - `Error: listen` = Netzwerk-Problem

### Schritt 5: Netzwerk-Test auf dem Server

**Falls du SSH-Zugriff hast:**

```bash
# Prüfe, ob Port 80 belegt ist
sudo lsof -i :80

# Prüfe, ob Container läuft
docker ps | grep johnnymonkey

# Teste Verbindung lokal
curl http://localhost
curl http://localhost/health

# Prüfe Container-Logs
docker logs johnnymonkey-app
```

### Schritt 6: IP-Adresse prüfen

**Mögliche Probleme:**

1. **Falsche IP-Adresse:**
   - Verwende die richtige Server-IP
   - Nicht `localhost` oder `127.0.0.1` von außen
   - Verwende die tatsächliche Server-IP-Adresse

2. **Firewall blockiert:**
   - Prüfe, ob Port 80 von außen erreichbar ist
   - Teste von einem anderen Computer im Netzwerk

### Schritt 7: Browser-Test

**In Safari:**

1. Versuche verschiedene URLs:
   ```
   http://<server-ip>
   http://<server-ip>:80
   http://<server-ip>/health
   ```

2. Prüfe die Fehlermeldung:
   - **"Safari kann die Verbindung nicht aufbauen"** = Verbindungsproblem
   - **"Seite nicht gefunden"** = Container läuft, aber falsche Route
   - **"Server nicht erreichbar"** = Netzwerk-Problem

## Häufige Probleme und Lösungen

### Problem 1: Port 80 noch belegt

**Symptom:** Container startet nicht oder läuft nicht

**Lösung:**
1. Stoppe den nginx-Container ("webserver")
2. Warte 10 Sekunden
3. Starte den johnnymonkey-app Container neu

### Problem 2: Container läuft, aber Port-Mapping falsch

**Symptom:** Container läuft, aber nicht erreichbar

**Lösung:**
1. Gehe zu **Stacks** → **johnnymonkey** → **Editor**
2. Prüfe `ports: - "80:3000"`
3. Klicke auf **Update the stack**

### Problem 3: Container startet nicht

**Symptom:** Container bleibt im Status "Restarting"

**Lösung:**
1. Prüfe die Logs
2. Suche nach Fehlermeldungen
3. Häufige Ursachen:
   - Port bereits belegt
   - Datenbank-Problem
   - Fehlende Dependencies

### Problem 4: Falsche IP-Adresse

**Symptom:** Verbindung funktioniert nicht

**Lösung:**
1. Finde die richtige Server-IP:
   - In Portainer.io: **Home** → Siehst du die Server-IP
   - Oder frage die Schulserververwaltung
2. Verwende diese IP in Safari

### Problem 5: Firewall blockiert

**Symptom:** Verbindung funktioniert lokal, aber nicht von außen

**Lösung:**
1. Prüfe Server-Firewall-Regeln
2. Stelle sicher, dass Port 80 offen ist
3. Kontaktiere Schulserververwaltung

## Schritt-für-Schritt Reparatur

### Option A: Container neu starten

1. **Stoppe nginx-Container:**
   - Containers → webserver → Stop

2. **Stoppe johnnymonkey-app:**
   - Containers → johnnymonkey-app → Stop

3. **Starte johnnymonkey-app:**
   - Containers → johnnymonkey-app → Start

4. **Warte 30 Sekunden**

5. **Teste erneut:**
   - Safari → `http://<server-ip>`

### Option B: Stack neu deployen

1. **Stoppe nginx-Container:**
   - Containers → webserver → Stop

2. **Gehe zu Stacks:**
   - Stacks → johnnymonkey

3. **Lösche den Stack:**
   - Klicke auf **Delete** (⚠️ Achtung: Volumes bleiben erhalten)

4. **Erstelle Stack neu:**
   - Add Stack → Repository
   - URL: `https://github.com/arvicodes/JohnnyMonkey.git`
   - Branch: `main`
   - Compose path: `docker-compose.yml`
   - Deploy

5. **Warte auf Build-Abschluss**

6. **Teste erneut**

### Option C: Port-Mapping korrigieren

1. **Gehe zu Stacks:**
   - Stacks → johnnymonkey → Editor

2. **Prüfe docker-compose.yml:**
   ```yaml
   ports:
     - "80:3000"  # Muss genau so sein!
   ```

3. **Wenn falsch, korrigiere:**
   ```yaml
   services:
     johnnymonkey:
       ports:
         - "80:3000"
   ```

4. **Update the stack**

5. **Warte auf Neustart**

## Diagnose-Checkliste

Führe diese Schritte der Reihe nach durch:

- [ ] Container-Status: **Running**?
- [ ] nginx-Container gestoppt?
- [ ] Port-Mapping: `80:3000`?
- [ ] Logs zeigen: "Server is running on port 3000"?
- [ ] Keine Fehler in den Logs?
- [ ] Richtige Server-IP verwendet?
- [ ] Port 80 nicht von anderem Service belegt?
- [ ] Firewall erlaubt Port 80?
- [ ] Test von lokalem Server funktioniert?

## Erweiterte Diagnose

### Container-Logs exportieren

1. In Portainer.io: **Containers** → **johnnymonkey-app** → **Logs**
2. Kopiere die letzten 50 Zeilen
3. Suche nach Fehlermeldungen

### Netzwerk-Verbindung testen

**Von einem anderen Computer:**

```bash
# Test HTTP-Verbindung
curl -v http://<server-ip>

# Test Health Endpoint
curl http://<server-ip>/health

# Prüfe Port-Erreichbarkeit
telnet <server-ip> 80
```

### Container-Inspect

**In Portainer.io:**

1. Containers → johnnymonkey-app → **Inspect**
2. Prüfe:
   - **State**: `running`
   - **Ports**: `80/tcp` sollte gemappt sein
   - **Network**: `johnnymonkey-network`

## Kontakt zur Schulserververwaltung

Wenn nichts hilft, kontaktiere die Schulserververwaltung mit folgenden Informationen:

1. **Container-Status:** Running/Stopped/Restarting
2. **Port-Mapping:** `80:3000`
3. **Fehlermeldung:** "Safari kann die Verbindung nicht aufbauen"
4. **Logs:** Letzte 20 Zeilen aus Container-Logs
5. **IP-Adresse:** Die verwendete Server-IP

## Nächste Schritte nach erfolgreicher Verbindung

Sobald die Verbindung funktioniert:

1. ✅ Teste die App: `http://<server-ip>`
2. ✅ Teste Health Check: `http://<server-ip>/health`
3. ✅ Konfiguriere Sophos Firewall für HTTPS
4. ✅ Teste HTTPS-Verbindung

---

**Stand:** November 2024  
**Bei weiteren Problemen:** Prüfe die Logs und Container-Details in Portainer.io

