# 🔒 HTTP vs HTTPS - Wichtiger Unterschied

## ⚠️ Problem: HTTPS funktioniert nicht direkt

Du versuchst: `https://192.168.8.1/health` ❌

**Das Problem:** Die App läuft nur auf **HTTP Port 80**, nicht auf HTTPS Port 443!

## ✅ Lösung: Verwende HTTP

**Richtige URL:**
```
http://192.168.8.1/health
```

**Oder für die App:**
```
http://192.168.8.1
```

## 🔍 Warum funktioniert HTTPS nicht?

1. **Die App läuft nur auf HTTP Port 80**
   - Kein SSL-Zertifikat im Container
   - Kein HTTPS-Server konfiguriert

2. **Sophos Firewall übernimmt HTTPS-Terminierung**
   - Die Firewall macht TLS-Termination
   - Externe Anfragen kommen per HTTPS an Sophos
   - Sophos leitet HTTP an Port 80 weiter

3. **Direkter Zugriff auf Port 443 funktioniert nicht**
   - Port 443 ist nicht gemappt
   - Kein HTTPS-Server läuft

## 📋 Schritt-für-Schritt Test

### Schritt 1: HTTP testen

**In Safari:**

1. Öffne: `http://192.168.8.1/health`
2. Du solltest sehen:
   ```json
   {"status":"ok","timestamp":"..."}
   ```

**Wenn das funktioniert:**
- ✅ Container läuft korrekt
- ✅ Port-Mapping ist richtig
- ✅ App ist erreichbar

**Wenn das nicht funktioniert:**
- ❌ Port-Mapping Problem
- ❌ Container läuft nicht
- ❌ Netzwerk-Problem

### Schritt 2: App testen

**In Safari:**

1. Öffne: `http://192.168.8.1`
2. Die JohnnyMonkey App sollte geladen werden

### Schritt 3: HTTPS über Sophos Firewall

**Nach der Firewall-Konfiguration:**

1. Die Schulserververwaltung konfiguriert Sophos Firewall
2. Externe Anfragen kommen per HTTPS an Sophos
3. Sophos leitet HTTP an Port 80 weiter
4. Dann funktioniert: `https://<externe-url>`

**Aber:** Direkter Zugriff auf `https://192.168.8.1` funktioniert **nicht**, weil:
- Port 443 nicht gemappt ist
- Kein HTTPS-Server im Container läuft
- Sophos Firewall macht die HTTPS-Terminierung

## 🔧 Port-Mapping prüfen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app** → **Details**
2. Prüfe **Published Ports**:
   - ✅ Sollte sein: `80/tcp -> 0.0.0.0:80`
   - ❌ NICHT: `443/tcp` (Port 443 ist nicht gemappt!)

## 🌐 URLs zum Testen

### ✅ Funktioniert (HTTP):

```
http://192.168.8.1
http://192.168.8.1/health
http://192.168.8.1/api/monitoring/stats
```

### ❌ Funktioniert NICHT (HTTPS direkt):

```
https://192.168.8.1          ❌ Port 443 nicht gemappt
https://192.168.8.1/health    ❌ Kein HTTPS-Server
https://192.168.8.1:443       ❌ Port nicht verfügbar
```

### ✅ Wird funktionieren (nach Firewall-Konfiguration):

```
https://<externe-url>         ✅ Über Sophos Firewall
https://<externe-url>/health   ✅ Über Sophos Firewall
```

## 🎯 Zusammenfassung

| Zugriff | URL | Status |
|---------|-----|--------|
| **Direkt HTTP** | `http://192.168.8.1` | ✅ Funktioniert |
| **Direkt HTTPS** | `https://192.168.8.1` | ❌ Funktioniert NICHT |
| **Über Firewall HTTPS** | `https://<externe-url>` | ⏳ Nach Konfiguration |

## 🚀 Nächste Schritte

1. **Teste HTTP:** `http://192.168.8.1/health`
2. **Wenn funktioniert:** App ist korrekt deployed
3. **HTTPS:** Wird über Sophos Firewall konfiguriert (Schulserververwaltung)
4. **Nach Firewall-Konfiguration:** Externe HTTPS-URL verwenden

---

**Wichtig:** Verwende immer **HTTP** (`http://`) für direkten Zugriff auf Port 80!

