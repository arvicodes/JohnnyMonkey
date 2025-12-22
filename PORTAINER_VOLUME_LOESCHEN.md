# 🗑️ Docker Volume löschen - Datenbank zurücksetzen

## ⚠️ Problem

Die Datenbank wird in einem **Docker Volume** gespeichert, nicht im Container. Wenn der Container neu startet, wird die alte (leere) Datenbank aus dem Volume geladen, nicht die `backup_latest.db` importiert.

## 📍 Wo ist die Datenbank?

**Docker Volume:** `johnnymonkey_database`
**Mount-Punkt im Container:** `/app/server/prisma`
**Datenbank-Datei:** `/app/server/prisma/dev.db` (im Volume)

## 🔧 Lösung 1: Volume in Portainer löschen

### Schritt 1: Container stoppen

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Stop**

### Schritt 2: Volume löschen

1. Portainer.io → **Volumes**
2. Suche nach: `johnnymonkey_database`
3. Klicke auf das Volume
4. **Remove** klicken
5. Bestätigen

### Schritt 3: Container neu starten

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Start**

**Beim Start wird automatisch:**
- `backup_latest.db` importiert
- Neue Datenbank im Volume erstellt
- 61 Benutzer und 6 LearningGroups wiederhergestellt

## 🔧 Lösung 2: Datenbank direkt im Volume ersetzen

### Schritt 1: Container-Console öffnen

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Console**

### Schritt 2: Datenbank ersetzen

```bash
# Alte Datenbank löschen
rm /app/server/prisma/dev.db

# backup_latest.db kopieren
cp /app/backup_latest.db /app/server/prisma/dev.db

# Prüfen
ls -lh /app/server/prisma/dev.db
```

### Schritt 3: Container neu starten

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Restart**

## 🔧 Lösung 3: Stack neu deployen (einfachste Methode)

### Schritt 1: Stack bearbeiten

1. Portainer.io → **Stacks**
2. `johnnymonkey` → **Editor**

### Schritt 2: Volume entfernen (temporär)

**In docker-compose.yml die Volume-Zeile auskommentieren:**

```yaml
volumes:
  # Persistente Datenbank (temporär auskommentiert)
  # - johnnymonkey_db:/app/server/prisma
```

### Schritt 3: Stack neu deployen

1. **Update the stack** klicken
2. Warte auf Build-Abschluss

**Beim Start wird automatisch:**
- `backup_latest.db` importiert
- Neue Datenbank erstellt

### Schritt 4: Volume wieder aktivieren

**Nach erfolgreichem Import:**

1. Stack → **Editor**
2. Volume-Zeile wieder aktivieren:
```yaml
volumes:
  - johnnymonkey_db:/app/server/prisma
```
3. **Update the stack** klicken

## ✅ Erwartetes Ergebnis

Nach dem Neustart in den Logs:
```
📥 Found backup_latest.db, importing...
✅ Database imported from backup_latest.db
📊 Database contains: 61 users, 6 groups
```

Dann sollte Login funktionieren! 🎉

## 💡 Empfehlung

**Lösung 1 (Volume löschen)** ist am einfachsten und sichersten.

