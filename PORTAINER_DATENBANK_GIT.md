# 📥 Datenbank über Git importieren

## 🎯 Lösung: Datenbank als Backup-Datei committen

Die einfachste Methode: Deine lokale Datenbank als `backup_latest.db` committen und beim Container-Start automatisch importieren.

## 📋 Schritt-für-Schritt

### Schritt 1: Lokale Datenbank als Backup kopieren

**Auf deinem Mac:**

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey

# Kopiere deine aktuelle Datenbank als backup_latest.db
cp server/prisma/dev.db backup_latest.db
```

### Schritt 2: Backup-Datei committen und pushen

```bash
# Backup-Datei zu Git hinzufügen
git add backup_latest.db

# Committen
git commit -m "Datenbank-Backup für Portainer.io Deployment"

# Pushen
git push
```

### Schritt 3: docker-start.sh wurde angepasst ✅

Die `docker-start.sh` wurde bereits angepasst und prüft beim Start automatisch:
- Wenn `dev.db` nicht existiert → Suche nach `backup_latest.db`
- Wenn `backup_latest.db` gefunden → Kopiere sie als `dev.db`
- Wenn keine Backup gefunden → Erstelle neue Datenbank

**Das Script ist bereits aktualisiert!**

