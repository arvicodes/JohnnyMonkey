# OneDrive Integration

## Übersicht

Das JohnnyMonkey-Projekt unterstützt jetzt automatisch OneDrive-Integration für Production-Deployments, während lokale Entwicklung weiterhin mit lokalen Pfaden funktioniert.

## Funktionsweise

### Automatischer Wechsel
- **Lokal (Development)**: Verwendet lokale Pfade (`/Users/verachrist/Documents/Monkey/J-M-Reihen`)
- **Production**: Verwendet OneDrive-URLs für Materialien

### StorageManager
Der neue `StorageManager` erkennt automatisch die Umgebung und wählt die entsprechende Speichermethode:

```typescript
// Automatische Erkennung
type: process.env.NODE_ENV === 'production' ? 'onedrive' : 'local'
```

## Setup

### 1. OneDrive-URL konfigurieren
```bash
# Mit Setup-Script
./server/scripts/setup-onedrive.sh "https://your-onedrive-url"

# Oder manuell
export ONEDRIVE_URL="https://your-onedrive-url"
export NODE_ENV="production"
```

### 2. Lokale Entwicklung
```bash
# Funktioniert automatisch mit lokalen Pfaden
npm run dev
```

### 3. Production Deployment
```bash
# Automatisch mit OneDrive
npm run setup:production
```

## Konfiguration

### Umgebungsvariablen
- `NODE_ENV`: `development` (lokal) oder `production` (OneDrive)
- `LOCAL_MATERIALS_PATH`: Lokaler Pfad für Entwicklung
- `ONEDRIVE_URL`: OneDrive-URL für Production

### StorageManager API
```typescript
// Pfad abrufen
StorageManager.getPath(relativePath)

// Verzeichnis lesen
StorageManager.readDirectory(path, recursive)

// Datei lesen
StorageManager.readFile(filePath)

// Konfiguration aktualisieren
StorageManager.updateConfig({ onedriveUrl: 'new-url' })
```

## Migration

### Bestehende Pfade
- Lokale Pfade bleiben in der Datenbank
- System erkennt automatisch die Umgebung
- Keine manuelle Migration erforderlich

### Neue Materialien
- Werden automatisch in der richtigen Umgebung gespeichert
- Lokal: Lokale Pfade
- Production: OneDrive-URLs

## Vorteile

✅ **Nahtlose Entwicklung**: Lokale Pfade funktionieren weiterhin  
✅ **Production-Ready**: OneDrive-Integration für Deployment  
✅ **Automatisch**: Kein manueller Wechsel erforderlich  
✅ **Skalierbar**: Unbegrenzter OneDrive-Speicher  
✅ **Backup**: Automatische Synchronisation  

## Testing

### Lokal testen
```bash
# Mit lokalen Pfaden (Standard)
npm run dev

# Mit OneDrive (zum Testen)
export ONEDRIVE_URL="your-url"
export NODE_ENV="production"
npm run dev
```

### Production testen
```bash
# Setup für Production
./server/scripts/setup-onedrive.sh "your-onedrive-url"
npm run setup:production
```

## Troubleshooting

### OneDrive-URL nicht erkannt
- Überprüfe `ONEDRIVE_URL` Umgebungsvariable
- Stelle sicher, dass die URL öffentlich zugänglich ist

### Lokale Pfade funktionieren nicht
- Überprüfe `LOCAL_MATERIALS_PATH`
- Stelle sicher, dass der Pfad existiert und lesbar ist

### Automatischer Wechsel funktioniert nicht
- Überprüfe `NODE_ENV` Variable
- `development` = lokal, `production` = OneDrive
