# 📁 Material-Verzeichnis im Container prüfen

## ⚠️ Problem

Im Lehrerdashboard für "Klasse 7" wird angezeigt: "Ordner ist leer (Debug: 0 Items geladen)"

## 🔍 Schritt 1: Prüfe ob Material-Verzeichnis im Container existiert

**In Container-Console:**

```bash
# Prüfe ob Verzeichnis existiert
ls -la /app/material

# Prüfe Inhalt
ls -la /app/material/
```

## 🔍 Schritt 2: Prüfe Material-Volume Mount

**In docker-compose.yml ist definiert:**
```yaml
volumes:
  - ./material:/app/material:ro
```

**Problem:** `./material` ist ein relativer Pfad vom Host-System. Im Portainer.io muss das ein absoluter Pfad sein oder ein Volume.

## 🔧 Lösung 1: Material-Verzeichnis als Volume mounten

**In Portainer.io Stack-Editor:**

Ändere das Volume-Mapping zu einem absoluten Pfad oder erstelle ein Volume:

```yaml
volumes:
  # Material-Dateien (absoluter Pfad auf dem Server)
  - /pfad/zum/material:/app/material:ro
```

## 🔧 Lösung 2: Material-Verzeichnis im Container prüfen

**In Container-Console:**

```bash
# Prüfe ob Verzeichnis existiert
ls -la /app/material

# Prüfe ob Dateien vorhanden sind
find /app/material -type f | head -10

# Prüfe StorageManager Konfiguration
echo $LOCAL_MATERIALS_PATH
```

## 🔧 Lösung 3: FileSystemPath in Datenbank prüfen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.fileSystemPath.findMany({
  where: { teacherId: '01ed6e10-397e-446c-9254-2ad7fd4ec777' }
}).then(paths => {
  console.log('📁 FileSystemPaths für Lehrer:');
  paths.forEach(p => console.log('  -', p.path));
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## ✅ Erwartetes Ergebnis

Nach dem Fix:
- Material-Verzeichnis ist im Container verfügbar
- Dateien werden angezeigt
- "Klasse 7" zeigt Inhalte


