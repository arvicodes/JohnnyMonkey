# Docker & Portainer Quick Start

## 🚀 Schnellstart

### 1. Alles starten (inkl. Portainer)

```bash
docker-compose up -d
```

### 2. Portainer öffnen

1. Browser: `http://localhost:9000`
2. Admin-Passwort erstellen
3. "Docker" als Umgebung wählen

### 3. App verwenden

- **Frontend + API**: `http://localhost:3001`
- **Portainer**: `http://localhost:9000`

## 📋 Wichtige Befehle

### Container-Management

```bash
# Alle Container starten
docker-compose up -d

# Nur Portainer starten
docker-compose up -d portainer

# Nur App starten
docker-compose up -d johnnymonkey

# Container stoppen
docker-compose stop

# Container entfernen (Daten bleiben erhalten)
docker-compose down

# Alles entfernen inkl. Volumes (⚠️ Daten gehen verloren!)
docker-compose down -v
```

### Logs ansehen

```bash
# Alle Logs
docker-compose logs -f

# Nur App-Logs
docker-compose logs -f johnnymonkey

# Nur Portainer-Logs
docker-compose logs -f portainer
```

### App neu bauen

```bash
# App neu bauen
docker-compose build johnnymonkey

# App neu bauen und starten
docker-compose up -d --build johnnymonkey
```

## 🔧 Portainer-Features nutzen

### Container überwachen
- **Dashboard**: Übersicht aller Container
- **Logs**: Echtzeit-Logs ansehen
- **Console**: Shell-Zugriff auf Container
- **Stats**: CPU, RAM, Netzwerk-Nutzung

### Volumes verwalten
- **Backup**: Volumes → Select → Backup
- **Inspect**: Volume-Inhalt ansehen
- **Remove**: Volumes löschen (⚠️ Vorsicht!)

### Images verwalten
- **Pull**: Neue Images herunterladen
- **Remove**: Alte Images aufräumen
- **Build**: Images neu bauen

## 🗄️ Datenbank-Backup

### Über Portainer
1. Volumes → `johnnymonkey_database` → Inspect
2. Backup-Datei herunterladen

### Über Kommandozeile
```bash
# Backup erstellen
docker run --rm -v johnnymonkey_database:/data -v $(pwd):/backup alpine tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz /data

# Backup wiederherstellen
docker run --rm -v johnnymonkey_database:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/db-backup-YYYYMMDD.tar.gz"
```

## 🐛 Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker-compose logs johnnymonkey

# Container neu bauen
docker-compose build --no-cache johnnymonkey
docker-compose up -d johnnymonkey
```

### Port bereits belegt
```bash
# Port prüfen
lsof -i :3001
lsof -i :9000

# Port in docker-compose.yml ändern
# Dann: docker-compose up -d
```

### Datenbank-Probleme
```bash
# Container-Shell öffnen
docker-compose exec johnnymonkey sh

# Im Container: Datenbank prüfen
cd /app/server
npx prisma studio
```

## 📊 Monitoring

### Health Check
- Automatisch alle 30 Sekunden
- Endpoint: `http://localhost:3001/health`
- In Portainer sichtbar als Container-Status

### Stats
- Portainer → Containers → johnnymonkey-app → Stats
- Zeigt CPU, RAM, Netzwerk in Echtzeit

## 🔐 Sicherheit

### Portainer absichern
1. Starke Passwörter verwenden
2. HTTPS aktivieren (Reverse Proxy)
3. Zugriff auf vertrauenswürdige IPs beschränken
4. Regelmäßig updaten: `docker-compose pull portainer`

### App absichern
- Environment-Variablen nicht in docker-compose.yml committen
- Secrets über `.env` Datei verwalten
- Regelmäßige Backups der Volumes

## 📚 Weitere Informationen

- [Portainer Setup Guide](./PORTAINER_SETUP.md)
- [Docker Dokumentation](https://docs.docker.com/)
- [Portainer Dokumentation](https://docs.portainer.io/)

