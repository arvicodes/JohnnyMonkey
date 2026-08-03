# Datenbank-Konfiguration

## Übersicht

Das JohnnyMonkey-Projekt unterstützt automatisch verschiedene Datenbanken je nach Umgebung:

- **Lokal (Development)**: SQLite (`dev.db`) - automatisch konfiguriert
- **Production**: PostgreSQL (über DATABASE_URL) - automatisch konfiguriert

## Lokale Entwicklung

### Automatische Konfiguration
```bash
# Server starten (verwendet automatisch SQLite)
cd server
npm run dev
```

### Manuelle Konfiguration
```bash
# Lokale SQLite-Konfiguration einrichten
cd server
npm run setup:local

# Server mit SQLite starten
npm run dev
```

## Production Deployment

### Automatische Konfiguration
```bash
# Production Setup
cd server
npm run setup:production
```

### Manuelle Konfiguration
```bash
# Umgebungsvariable setzen (PostgreSQL)
export DATABASE_URL="postgresql://user:password@host:port/database"

# Prisma Client für PostgreSQL generieren
npx prisma generate

# Build und Start
npm run build
npm start
```

## Datenbank-Dateien

- `dev.db` - Lokale SQLite-Datenbank
- `backup_latest.db` - Neueste Backup-Datei (Kopie von `dev.db`)
- `backup_commit_*.db` - Automatische Backups
- `DB_SNAPSHOT.md` / `DB_SNAPSHOT.json` - dokumentierter Stand (Rollen, Lerngruppen, SuS mit Login-Codes, Tabellenzahlen)

Aktueller Snapshot: siehe [`server/prisma/DB_SNAPSHOT.md`](server/prisma/DB_SNAPSHOT.md).

## Wichtige Hinweise

1. **Lokal**: Verwendet automatisch SQLite mit `dev.db`
2. **Production**: Benötigt PostgreSQL-DATABASE_URL
3. **Backups**: Werden automatisch erstellt und können mit `cp backup_latest.db dev.db` wiederhergestellt werden
4. **Schema**: Unterstützt beide Datenbanktypen ohne Änderungen

## Troubleshooting

### DATABASE_URL Fehler
```bash
# Lokal: SQLite verwenden
DATABASE_URL="file:./dev.db" npm run dev

# Production: PostgreSQL URL setzen
export DATABASE_URL="postgresql://..."
```

### Prisma Client neu generieren
```bash
# Für SQLite
DATABASE_URL="file:./dev.db" npx prisma generate

# Für PostgreSQL
npx prisma generate
```
