# Portainer.io Deployment - Schulserver

Diese Anleitung beschreibt, wie die JohnnyMonkey App auf Portainer.io auf dem Schulserver deployed wird.

## Voraussetzungen

- Portainer.io läuft auf dem Server
- Git-Repository ist verfügbar
- Sophos Firewall übernimmt HTTPS-Terminierung

## ⚠️ Wichtiger Hinweis: Port-Konflikt mit bestehendem nginx-Container

**Es läuft bereits ein nginx-Container ("webserver") auf Port 80!**

Du hast zwei Optionen:

### Option 1: Node.js direkt auf Port 80 (Empfohlen gemäß Anweisung)

**Schritt 1:** Bestehenden nginx-Container stoppen:
1. In Portainer.io zu **Containers** navigieren
2. Den Container **webserver** (nginx) auswählen
3. **Stop** klicken
4. Optional: Container löschen, wenn er nicht mehr benötigt wird

**Schritt 2:** JohnnyMonkey Stack deployen (verwendet Port 80 direkt)

### Option 2: Bestehenden nginx als Reverse Proxy nutzen

Wenn der bestehende nginx-Container weiterhin benötigt wird:
1. Konfiguriere den nginx-Container so, dass er auf `johnnymonkey-app:3000` weiterleitet
2. Deploye den JohnnyMonkey Stack **ohne** Port-Mapping (nur expose 3000)
3. Der nginx leitet dann Anfragen an den Node.js Container weiter

**Für Option 2:** Ändere in `docker-compose.yml`:
```yaml
ports:
  - "80:3000"  # ENTFERNEN - nur expose verwenden
expose:
  - "3000"     # Nur intern verfügbar
```

## Konfiguration

### Port-Mapping

- **Host-Port 80** → **Container-Port 3000** (Node.js Server)
- Die Sophos Firewall übernimmt die HTTPS-Terminierung
- Kein nginx-Container erforderlich

### Docker Compose Konfiguration

Die `docker-compose.yml` ist bereits für Portainer.io konfiguriert:

```yaml
ports:
  - "80:3000"  # Host Port 80 → Container Port 3000
```

## Deployment in Portainer.io

### Option 1: Stack aus Git-Repository erstellen (Empfohlen)

1. **Portainer.io öffnen** und zu **Stacks** navigieren
2. **Add Stack** klicken
3. **Build method**: "Repository" auswählen
4. **Repository URL** eingeben (z.B. Git-Repository URL)
5. **Compose path**: `docker-compose.yml` (Standard)
6. **Branch**: `main` (oder entsprechender Branch)
7. **Deploy the stack** klicken

### Option 2: Stack aus Editor erstellen

1. **Portainer.io öffnen** und zu **Stacks** navigieren
2. **Add Stack** klicken
3. **Build method**: "Web editor" auswählen
4. Inhalt der `docker-compose.yml` einfügen
5. **Deploy the stack** klicken

### Option 3: Container direkt erstellen

1. **Portainer.io öffnen** und zu **Containers** navigieren
2. **Add container** klicken
3. **Image**: `johnnymonkey:latest` (wird gebaut)
4. **Port mapping**: `80:3000`
5. **Environment variables**:
   - `NODE_ENV=production`
   - `PORT=3000`
6. **Volumes** konfigurieren:
   - `johnnymonkey_db:/app/server/prisma`
   - `johnnymonkey_material:/app/material:ro`
   - `johnnymonkey_logs:/app/logs`
7. **Deploy the container** klicken

## Netzwerk-Konfiguration

Die App verwendet ein eigenes Docker-Netzwerk:
- **Network name**: `johnnymonkey-network`
- **Driver**: `bridge`

## Volumes

Folgende Volumes werden verwendet:

1. **johnnymonkey_database**: Persistente Datenbank
   - Pfad: `/app/server/prisma`

2. **johnnymonkey_material**: Material-Dateien (read-only)
   - Pfad: `/app/material`

3. **johnnymonkey_logs**: Log-Dateien
   - Pfad: `/app/logs`

## Health Check

Der Container hat einen Health Check konfiguriert:
- **Endpoint**: `http://localhost:3000/health`
- **Interval**: 30 Sekunden
- **Timeout**: 10 Sekunden
- **Retries**: 3
- **Start period**: 40 Sekunden

## Zugriff

Nach dem Deployment ist die App erreichbar über:
- **HTTP**: `http://<server-ip>` (Port 80)
- **HTTPS**: Die Sophos Firewall übernimmt die HTTPS-Terminierung

## Konflikt mit bestehendem nginx-Container

Wenn der bestehende **webserver** (nginx) Container noch läuft, gibt es einen Port-Konflikt!

**Lösung:**
1. Stoppe den nginx-Container in Portainer.io
2. Oder ändere den Port des nginx-Containers auf einen anderen Port (z.B. 8080)
3. Deploye dann den JohnnyMonkey Stack

## Updates

### Stack aktualisieren (Git-basiert)

1. Änderungen in Git committen und pushen
2. In Portainer.io zu **Stacks** navigieren
3. Stack auswählen
4. **Editor** öffnen
5. **Pull and redeploy** klicken

### Container neu bauen

1. In Portainer.io zu **Stacks** navigieren
2. Stack auswählen
3. **Editor** öffnen
4. **Rebuild** klicken

## Troubleshooting

### Container startet nicht

- Prüfe die Logs in Portainer.io: **Containers** → Container auswählen → **Logs**
- Prüfe, ob Port 80 bereits belegt ist
- Prüfe die Health Check Logs

### App nicht erreichbar

- Prüfe, ob der Container läuft
- Prüfe die Port-Mappings (80:3000)
- Prüfe die Sophos Firewall Konfiguration

### Datenbank-Probleme

- Prüfe das Volume `johnnymonkey_database`
- Prüfe die Logs für Datenbank-Fehler
- Stelle sicher, dass das Volume persistent ist

## Wichtige Hinweise

1. **Port 80**: Muss für den Node.js Container verfügbar sein
2. **HTTPS**: Wird von der Sophos Firewall übernommen
3. **Volumes**: Werden automatisch erstellt, wenn sie nicht existieren
4. **Netzwerk**: Wird automatisch erstellt, wenn es nicht existiert
5. **Health Check**: Überwacht den Container-Status automatisch

## Nächste Schritte

Nach erfolgreichem Deployment:
1. Prüfe die Logs auf Fehler
2. Teste die App über HTTP (Port 80)
3. Konfiguriere die Sophos Firewall für HTTPS-Weiterleitung
4. Teste die HTTPS-Verbindung
