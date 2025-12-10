# Portainer.io Setup & Verwendung

## Was ist Portainer?

Portainer ist eine Web-basierte Benutzeroberfläche für Docker, die das Management von Containern, Images, Volumes und Netzwerken vereinfacht.

## Installation

Portainer ist bereits in der `docker-compose.yml` konfiguriert und optimiert. Starte es mit:

```bash
# Nur Portainer starten
docker-compose up -d portainer

# Oder alle Services inklusive JohnnyMonkey App
docker-compose up -d
```

### Erste Schritte nach dem Start

1. **Portainer initialisieren**: `http://localhost:9000` öffnen
2. **Admin-Passwort erstellen**: Beim ersten Start
3. **Docker-Umgebung auswählen**: "Docker" wählen
4. **JohnnyMonkey App starten**: In Portainer → Containers → johnnymonkey-app → Start

### App neu bauen

```bash
# App neu bauen und starten
docker-compose build johnnymonkey
docker-compose up -d johnnymonkey

# Oder alles neu bauen
docker-compose build
docker-compose up -d
```

## Zugriff

1. Öffne deinen Browser und gehe zu: `http://localhost:9000`
2. Beim ersten Start wirst du aufgefordert, ein Admin-Passwort zu erstellen
3. Wähle "Docker" als Umgebung aus

## Wichtige Features

### Container Management
- **Container starten/stoppen**: Klicke auf einen Container → Actions → Start/Stop
- **Logs ansehen**: Container → Logs
- **Container neu starten**: Container → Actions → Restart
- **Container entfernen**: Container → Actions → Remove

### Images verwalten
- **Images anzeigen**: Images → Liste aller Images
- **Images entfernen**: Images → Actions → Remove
- **Images pullen**: Images → Pull image

### Volumes verwalten
- **Volumes anzeigen**: Volumes → Liste aller Volumes
- **Volumes entfernen**: Volumes → Actions → Remove
- **Volume-Inhalt ansehen**: Volumes → Inspect

### Netzwerke
- **Netzwerke anzeigen**: Networks → Liste aller Netzwerke
- **Netzwerke erstellen**: Networks → Add network

## Praktische Tipps

### 1. Container-Status überwachen
- Im Dashboard siehst du alle laufenden Container auf einen Blick
- Die Statusanzeige zeigt, ob Container laufen, gestoppt sind oder Fehler haben

### 2. Logs in Echtzeit
- Klicke auf einen Container → Logs
- Logs werden automatisch aktualisiert
- Nützlich für Debugging und Monitoring

### 3. Container-Konsole
- Container → Console → öffnet eine interaktive Shell im Container
- Nützlich für manuelle Befehle und Debugging

### 4. Environment Variables
- Container → Duplicate/Edit → Environment
- Hier kannst du Umgebungsvariablen ändern
- Wichtig: Nach Änderungen Container neu starten

### 5. Port-Mappings
- Container → Duplicate/Edit → Ports
- Hier kannst du Port-Mappings ändern
- Änderungen werden erst nach Neustart wirksam

### 6. Volume-Mappings
- Container → Duplicate/Edit → Volumes
- Hier siehst du alle gemappten Volumes
- Nützlich für Backup-Strategien

## Für dein JohnnyMonkey Projekt

### Container überwachen
- `johnnymonkey-app`: Deine Hauptanwendung (mit Labels für bessere Organisation)
- `portainer`: Das Portainer-Tool selbst

### Wichtige Ports
- `3001`: Server API + Frontend (johnnymonkey) - Frontend wird vom Server ausgeliefert
- `9000`: Portainer UI

### Volumes (optimiert für Portainer)
- `johnnymonkey_database`: Persistente Datenbank-Daten (automatisch verwaltet)
- `johnnymonkey_logs`: Anwendungs-Logs (optional)
- `portainer_data`: Portainer-Konfiguration und Daten
- `postgres_data`: PostgreSQL-Daten (falls aktiviert)
- `./material`: Material-Dateien (read-only mount)

### Netzwerk
- `johnnymonkey-network`: Bridge-Netzwerk für alle Container

### Optimierungen für Portainer
- **Labels**: Container sind mit Labels versehen für bessere Organisation
- **Health Checks**: Automatische Gesundheitsprüfung alle 30 Sekunden
- **Persistente Volumes**: Datenbank-Daten bleiben erhalten auch nach Container-Neustart
- **Netzwerk-Isolation**: Alle Container im gleichen Netzwerk für einfache Kommunikation

## Backup-Strategie mit Portainer

1. **Volumes sichern**: Volumes → Select → Backup
2. **Container-Images exportieren**: Images → Select → Export
3. **docker-compose.yml sichern**: Diese Datei enthält deine gesamte Konfiguration

## Sicherheitstipps

1. **Passwort ändern**: Settings → Users → Change Password
2. **HTTPS aktivieren**: Für Produktion HTTPS verwenden (Reverse Proxy)
3. **Zugriff beschränken**: Nur von vertrauenswürdigen IPs zugänglich machen
4. **Regelmäßige Updates**: Portainer-Image regelmäßig aktualisieren

## Updates

Portainer aktualisieren:

```bash
docker-compose pull portainer
docker-compose up -d portainer
```

## Troubleshooting

### Portainer startet nicht
- Prüfe Docker-Socket: `ls -la /var/run/docker.sock`
- Prüfe Logs: `docker-compose logs portainer`

### Container nicht sichtbar
- Prüfe, ob Container laufen: `docker ps`
- Prüfe Docker-Socket-Berechtigungen

### Port bereits belegt
- Ändere Port in docker-compose.yml: `9000:9000` → `9001:9000`
- Dann: `docker-compose up -d portainer`

## Nützliche Links

- [Portainer Dokumentation](https://docs.portainer.io/)
- [Portainer Community](https://www.portainer.io/community)
- [Docker Dokumentation](https://docs.docker.com/)

