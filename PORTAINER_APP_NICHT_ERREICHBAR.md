# App nicht erreichbar - Diagnose und Lösung

## 🚨 Problem

Safari kann die Seite `192.168.8.1` nicht öffnen - keine Verbindung zum Server.

## 🔍 Schritt-für-Schritt Diagnose

### Schritt 1: Container-Status prüfen

1. **Portainer** → **Containers** → `johnnymonkey-app`
2. **Status prüfen**:
   - 🟢 **Grüner Punkt** = Container läuft ✅
   - 🔴 **Roter Punkt** = Container gestoppt ❌
   - 🟡 **Gelber Punkt** = Container startet gerade

**Falls Container gestoppt ist:**
- Klicke auf **"Start"** Button
- Warte 30-60 Sekunden
- Prüfe erneut

### Schritt 2: Container-Logs prüfen

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Klicke auf **"Logs"** Tab
3. **Suche nach**:
   - ✅ `🎯 Server is running on port 80` = Server läuft
   - ✅ `✅ Monitoring system initialized` = Alles OK
   - ❌ Fehlermeldungen = Problem gefunden

**Häufige Fehler in Logs:**

#### Fehler: "Port 80 already in use"
- **Lösung**: Anderen Container stoppen, der Port 80 nutzt

#### Fehler: "Cannot find module" oder "Prisma"
- **Lösung**: Stack neu bauen (siehe unten)

#### Fehler: "Database" oder "Prisma"
- **Lösung**: Prisma Client generieren (siehe unten)

#### Container startet, aber sofort wieder gestoppt
- **Lösung**: Logs genau lesen - oft fehlt eine Dependency

### Schritt 3: Port-Mapping prüfen

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Scrolle zu **"Published ports"**
3. **Sollte zeigen**: `80:80` oder `0.0.0.0:80->80/tcp`
4. **Falls nicht vorhanden**: Port-Mapping fehlt!

**Falls Port-Mapping fehlt:**
- **Stacks** → `johnnymonkey` → **"Editor"**
- Prüfe, ob `ports: - "80:80"` in der docker-compose.yml ist
- **"Update the stack"**

### Schritt 4: Netzwerk prüfen

1. **Containers** → `johnnymonkey-app` → **"Inspect"** oder Details
2. Scrolle zu **"Network"**
3. Prüfe, ob Container im Netzwerk `johnnymonkey-network` ist

### Schritt 5: Health-Check prüfen

1. **Containers** → `johnnymonkey-app`
2. Schaue auf **"Health"** Status
3. **Sollte zeigen**: `healthy` (grün)
4. **Falls `unhealthy`**: Server antwortet nicht

## 🔧 Lösungen

### Lösung 1: Container neu starten

1. **Containers** → `johnnymonkey-app`
2. Drei Punkte (⋮) → **"Restart"**
3. Warte 30-60 Sekunden
4. Prüfe Logs erneut

### Lösung 2: Stack neu bauen

1. **Stacks** → `johnnymonkey` → Klicke darauf
2. Klicke auf **"Editor"** Tab
3. Aktiviere **"Rebuild"** (Checkbox)
4. Klicke auf **"Update the stack"**
5. Warte, bis Build fertig ist (5-10 Minuten)
6. Prüfe Logs

### Lösung 3: Prisma Client generieren (falls Datenbank-Fehler)

Falls in den Logs Prisma-Fehler stehen:

1. **Containers** → `johnnymonkey-app` → **"Console"** oder **"Exec"**
2. Führe aus:
   ```bash
   cd /app/server
   npx prisma generate
   ```
3. Container neu starten

### Lösung 4: Port direkt testen

Falls du SSH-Zugriff auf den Server hast:

```bash
# Prüfe, ob Port 80 offen ist
curl http://localhost/health

# Oder von außen
curl http://192.168.8.1/health
```

### Lösung 5: Firewall prüfen

Falls Port 80 blockiert ist:

1. Prüfe Server-Firewall (nicht Sophos, sondern Server-Firewall)
2. Port 80 muss offen sein
3. Falls nginx läuft: Prüfe, ob nginx Port 80 blockiert

## 🐛 Häufige Probleme und Lösungen

### Problem: Container läuft, aber keine Antwort

**Mögliche Ursachen:**
1. Server startet nicht richtig → Logs prüfen
2. Port-Mapping falsch → docker-compose.yml prüfen
3. Firewall blockiert → Server-Firewall prüfen

**Lösung:**
- Logs genau lesen
- Port-Mapping in Portainer prüfen
- Container neu starten

### Problem: "Connection refused"

**Ursache**: Server läuft nicht oder auf falschem Port

**Lösung:**
- Logs prüfen: `🎯 Server is running on port 80`
- Falls nicht: Server startet nicht → Logs prüfen
- Port-Mapping prüfen

### Problem: Container startet sofort wieder

**Ursache**: Fehler beim Start → Container crasht

**Lösung:**
- Logs prüfen (wichtig!)
- Häufig: Fehlende Dependencies oder Datenbank-Fehler
- Stack neu bauen

### Problem: Port 80 bereits belegt

**Ursache**: Anderer Container nutzt Port 80

**Lösung:**
- Anderen Container stoppen
- Oder: Anderen Port verwenden (8080, aber dann Sophos Firewall anpassen)

## ✅ Checkliste

- [ ] Container läuft (grüner Punkt)
- [ ] Logs zeigen: `🎯 Server is running on port 80`
- [ ] Port-Mapping vorhanden: `80:80`
- [ ] Health-Check: `healthy`
- [ ] Keine Fehler in Logs
- [ ] Server-Firewall erlaubt Port 80
- [ ] App erreichbar: `http://192.168.8.1`

## 🎯 Schnelle Diagnose

**Führe diese Schritte in dieser Reihenfolge aus:**

1. ✅ Container-Status prüfen (läuft?)
2. ✅ Logs prüfen (Server läuft?)
3. ✅ Port-Mapping prüfen (80:80 vorhanden?)
4. ✅ Health-Check prüfen (healthy?)
5. ✅ Container neu starten (falls nötig)
6. ✅ Stack neu bauen (falls nötig)

## 📞 Was du mir sagen solltest

Falls es immer noch nicht funktioniert, teile mir mit:

1. **Container-Status**: Läuft er? (grün/rot/gelb)
2. **Logs**: Was steht in den letzten 20 Zeilen?
3. **Port-Mapping**: Siehst du `80:80`?
4. **Health-Check**: `healthy` oder `unhealthy`?

Dann kann ich dir gezielt helfen! 🚀

