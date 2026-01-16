# 🔧 Volume kann nicht gelöscht werden - Lösung

## ❌ Problem

```
unable to remove this volume, is in use
```

Das Volume `johnnymonkey_database` kann nicht gelöscht werden, weil es noch vom Container verwendet wird.

## ✅ Lösung: Container stoppen, dann Volume löschen

### Schritt 1: Container stoppen

1. **Portainer.io** → **Containers**
2. `johnnymonkey-app` → **Stop**
3. Warte, bis der Container gestoppt ist (Status: "Stopped")

### Schritt 2: Volume löschen

1. **Portainer.io** → **Volumes**
2. `johnnymonkey_database` → **Remove**
3. Bestätigen
4. ✅ Volume sollte jetzt gelöscht werden können

### Schritt 3: Stack neu deployen

1. **Portainer.io** → **Stacks** → `johnnymonkey`
2. **Editor** → **Pull and redeploy**
   - Oder: **Git repository** → **Pull latest changes**
3. Warte, bis der Build fertig ist

### Schritt 4: Container starten

1. **Portainer.io** → **Containers**
2. `johnnymonkey-app` → **Start**

### Schritt 5: Logs prüfen

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Logs**
2. Suche nach:
   ```
   📥 Found backup_latest.db, importing...
   ✅ Database imported from backup_latest.db
   📊 Database contains: X users, Y groups
   ```

## 🔧 Alternative: Datenbank direkt im Container ersetzen (OHNE Volume zu löschen)

Wenn du das Volume nicht löschen kannst oder willst:

### Schritt 1: Container-Console öffnen

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Console**

### Schritt 2: Datenbank ersetzen

```bash
# Alte Datenbank löschen
rm -f /app/server/prisma/dev.db

# Backup kopieren (aus Git)
cp /app/backup_latest.db /app/server/prisma/dev.db

# Prüfen
ls -lh /app/server/prisma/dev.db
```

**Sollte zeigen:**
- Datei existiert
- Größe: ~1.6 MB

### Schritt 3: Container neu starten

1. **Portainer.io** → **Containers** → `johnnymonkey-app` → **Restart**

### Schritt 4: Login testen

1. App öffnen
2. Mit `AckJak13` einloggen
3. Sollte jetzt funktionieren ✅

## 🔍 Prüfen ob Container gestoppt ist

**Portainer.io** → **Containers** → `johnnymonkey-app`

**Status sollte sein:**
- ❌ "Stopped" (rot) = Container ist gestoppt → Volume kann gelöscht werden
- ✅ "Running" (grün) = Container läuft → Volume kann NICHT gelöscht werden

## ⚠️ Wichtige Hinweise

1. **Container muss gestoppt sein**
   - Volume kann nur gelöscht werden, wenn kein Container es verwendet
   - Prüfe, ob der Container wirklich gestoppt ist

2. **Alternative Methode**
   - Wenn Volume nicht gelöscht werden kann, verwende die Alternative (Datenbank direkt ersetzen)
   - Funktioniert auch, wenn Container läuft

3. **Nach dem Neustart**
   - Neue Datenbank wird aus `backup_latest.db` importiert
   - Alle Login-Codes sollten funktionieren

## 🆘 Wenn Container nicht stoppt

1. **Force Stop:**
   - Portainer → Containers → `johnnymonkey-app` → **Stop** (warten)
   - Falls nicht: **Kill** (falls verfügbar)

2. **Stack stoppen:**
   - Portainer → Stacks → `johnnymonkey` → **Stop stack**
   - Dann Volume löschen

3. **Manuell über Terminal (falls Zugriff):**
   ```bash
   docker stop johnnymonkey-app
   docker volume rm johnnymonkey_database
   ```

## ✅ Erwartetes Ergebnis

Nach dem Neustart:
- ✅ Datenbank enthält alle aktuellen Login-Codes
- ✅ `AckJak13` funktioniert
- ✅ Logs zeigen: `📊 Database contains: X users, Y groups`
