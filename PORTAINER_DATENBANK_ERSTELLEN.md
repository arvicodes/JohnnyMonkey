# 🔧 Datenbank-Datei existiert nicht - Import durchführen

## ⚠️ Problem

Die Datenbank-Datei `/app/server/prisma/dev.db` existiert nicht im Container.

## 🔍 Schritt 1: Prüfe ob backup_latest.db vorhanden ist

**In Container-Console:**

```bash
ls -lh /app/backup_latest.db
```

**Sollte zeigen:**
- Datei existiert
- Größe: ~1.6 MB

## 🔍 Schritt 2: Prüfe Verzeichnisstruktur

**In Container-Console:**

```bash
ls -la /app/server/prisma/
```

**Sollte zeigen:**
- Verzeichnis existiert
- Eventuell andere Dateien, aber keine `dev.db`

## 🔧 Lösung: Datenbank manuell importieren

**In Container-Console:**

```bash
# 1. Prüfe ob backup_latest.db vorhanden ist
ls -lh /app/backup_latest.db

# 2. Prüfe ob Verzeichnis existiert
ls -la /app/server/prisma/

# 3. Datenbank importieren
cp /app/backup_latest.db /app/server/prisma/dev.db

# 4. Prüfen
ls -lh /app/server/prisma/dev.db
```

## 🔧 Alternative: Container neu starten (automatischer Import)

**Wenn backup_latest.db vorhanden ist:**

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Restart**

**Beim Start sollte automatisch:**
- `backup_latest.db` importiert werden
- `dev.db` erstellt werden

**Prüfe Logs nach:**
```
📥 Found backup_latest.db, importing...
✅ Database imported from backup_latest.db
```

## ✅ Erwartetes Ergebnis

Nach dem Import:
- `dev.db` existiert (~1.6 MB)
- 61 Benutzer und 6 LearningGroups vorhanden
- Login sollte funktionieren


