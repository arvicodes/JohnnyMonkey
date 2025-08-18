# Database Backup System

Dieses System integriert automatische Datenbank-Backups in Git-Commits und Git-Push-Operationen.

## Features

- ✅ **Automatische Backups** vor jedem Git-Commit
- ✅ **Git-Integration** mit pre-commit und pre-push Hooks
- ✅ **Backup-Management** mit automatischer Bereinigung
- ✅ **Einfache Bedienung** über npm-Skripte
- ✅ **Sichere Wiederherstellung** mit Bestätigungsaufforderung

## Schnellstart

### 1. Backup erstellen
```bash
npm run backup
```

### 2. Alle Backups anzeigen
```bash
npm run backup:list
```

### 3. Alte Backups bereinigen
```bash
npm run backup:cleanup
```

### 4. Backup wiederherstellen
```bash
npm run backup:restore <backup-datei>
```

### 5. Git-Commit mit automatischem Backup
```bash
npm run git:commit
```

### 6. Git-Push
```bash
npm run git:push
```

## Funktionsweise

### Pre-Commit Hook
- Wird automatisch vor jedem `git commit` ausgeführt
- Erstellt ein neues Backup mit Zeitstempel und Commit-Hash
- Aktualisiert den "latest" Backup
- Fügt Backup-Dateien zum Git-Staging-Bereich hinzu

### Pre-Push Hook
- Wird automatisch vor jedem `git push` ausgeführt
- Überprüft, ob Backup-Dateien im Staging-Bereich vorhanden sind
- Warnt, falls keine Backups gefunden werden

### Backup-Manager
- Verwaltet alle Backup-Operationen
- Behält maximal 10 Backups (konfigurierbar)
- Löscht automatisch alte Backups
- Unterstützt Wiederherstellung mit Sicherheitsabfrage

## Backup-Dateinamen

Backups werden mit folgendem Format benannt:
```
backup_commit_<commit-hash>_<timestamp>.db
```

Beispiel:
```
backup_commit_480a88a_20250818_150549.db
```

## Konfiguration

### Maximale Anzahl Backups
Ändern Sie die Variable `MAX_BACKUPS` in `scripts/backup-manager.sh`:

```bash
MAX_BACKUPS=10  # Standard: 10 Backups
```

### Datenbank-Pfad
Standardmäßig wird die Datenbank unter `server/prisma/basis.db` gesucht.
Falls sich die Datenbank an einem anderen Ort befindet, ändern Sie die Variable `DB_PATH`:

```bash
DB_PATH="server/prisma/basis.db"  # Standard-Pfad
```

## Dateistruktur

```
JohnnyMonkey/
├── .git/hooks/
│   ├── pre-commit          # Erstellt Backup vor Commit
│   └── pre-push            # Überprüft Backup vor Push
├── scripts/
│   └── backup-manager.sh   # Hauptskript für Backup-Management
├── backup_latest.db        # Aktuellster Backup (wird verfolgt)
├── backup_*.db             # Alle anderen Backups (werden ignoriert)
└── package.json            # NPM-Skripte für einfache Bedienung
```

## Sicherheitshinweise

⚠️ **Wichtig**: 
- Backups werden automatisch in Git eingecheckt
- Stellen Sie sicher, dass keine sensiblen Daten in der Datenbank gespeichert sind
- Überprüfen Sie regelmäßig, welche Backups in Git verfolgt werden

## Troubleshooting

### Hook funktioniert nicht
```bash
# Hooks ausführbar machen
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x scripts/backup-manager.sh
```

### Backup fehlgeschlagen
```bash
# Überprüfen Sie den Datenbank-Pfad
ls -la server/prisma/basis.db

# Überprüfen Sie die Berechtigungen
ls -la scripts/backup-manager.sh
```

### Zu viele Backups
```bash
# Manuelle Bereinigung
npm run backup:cleanup

# Oder alle Backups anzeigen
npm run backup:list
```

## Beispiele

### Vollständiger Workflow
```bash
# 1. Backup erstellen
npm run backup

# 2. Änderungen committen
git add .
git commit -m "Feature hinzugefügt"

# 3. Push mit Backup-Überprüfung
git push
```

### Backup wiederherstellen
```bash
# 1. Verfügbare Backups anzeigen
npm run backup:list

# 2. Backup wiederherstellen
npm run backup:restore backup_commit_480a88a_20250818_150549.db
```

## Support

Bei Problemen oder Fragen:
1. Überprüfen Sie die Git-Hooks: `ls -la .git/hooks/`
2. Testen Sie das Backup-Skript: `bash scripts/backup-manager.sh help`
3. Überprüfen Sie die Berechtigungen: `ls -la scripts/backup-manager.sh`
