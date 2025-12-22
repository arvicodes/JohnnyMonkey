# 🔧 Volume ist in Verwendung - Datenbank ersetzen

## ⚠️ Problem

Das Volume `johnnymonkey_database` kann nicht gelöscht werden, weil es noch vom Container verwendet wird.

## 🔧 Lösung 1: Container stoppen, dann Volume löschen

### Schritt 1: Container stoppen

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Stop**

### Schritt 2: Volume löschen

1. Portainer.io → **Volumes**
2. `johnnymonkey_database` → **Remove**
3. Bestätigen

### Schritt 3: Container neu starten

1. Portainer.io → **Containers**
2. `johnnymonkey-app` → **Start**

**Beim Start wird automatisch:**
- `backup_latest.db` importiert
- Neue Datenbank im Volume erstellt

## 🔧 Lösung 2: Datenbank direkt im laufenden Container ersetzen (EINFACHER!)

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

**Nach dem Neustart:**
- Datenbank ist importiert
- Login sollte funktionieren

## ✅ Erwartetes Ergebnis

Nach dem Neustart in den Logs:
```
✅ Database file exists
📊 Database contains: 61 users, 6 groups
```

Dann sollte Login funktionieren! 🎉

## 💡 Empfehlung

**Lösung 2** ist einfacher - Container muss nicht gestoppt werden, nur neu gestartet.

