# 🚀 JohnnyMonkey Development Scripts

Diese Scripts lösen automatisch Port-Konflikte und starten alle Services robust.

## 🎯 Schnellstart

### Alles auf einmal starten (Empfohlen)
```bash
./start-all.sh
```
Startet automatisch Server und Client und löst alle Port-Konflikte.

## 🔧 Einzelne Services starten

### Server starten
```bash
# Standard (kann Port-Konflikte haben)
cd server && npm run dev

# Intelligent (löst Port-Konflikte automatisch)
cd server && npm run dev:smart

# Mit Port-Bereinigung
cd server && npm run dev:clean
```

### Client starten
```bash
# Standard
cd client && npm start

# Intelligent (löst Port-Konflikte automatisch)
cd client && npm start:smart

# Mit Port-Bereinigung
cd client && npm start:clean
```

## 🧹 Port-Bereinigung manuell

### Alle relevanten Ports bereinigen
```bash
# Server-Ports
cd server && npm run cleanup

# Client-Ports
cd client && npm run cleanup

# Alle Ports (3000-3003)
pkill -f 'npm\|node'
```

## 🆕 Neue Features

### Automatische Port-Verwaltung
- **PortManager-Klasse** in `server/src/utils/portManager.ts`
- Findet automatisch freie Ports
- Verhindert Port-Konflikte
- Graceful Shutdown

### Intelligente Start-Scripts
- **`start-all.sh`** - Startet alles mit einem Befehl
- **`server/scripts/start-dev.sh`** - Server mit Port-Management
- **`client/scripts/start-dev.sh`** - Client mit Port-Management

### Verbesserte Fehlerbehandlung
- Automatische Port-Bereinigung
- Bessere Fehlermeldungen
- Graceful Fallbacks

## 📋 Verfügbare Scripts

### Server (`server/package.json`)
```json
{
  "dev": "nodemon src/index.ts",
  "dev:smart": "./scripts/start-dev.sh",
  "dev:clean": "npm run cleanup && npm run dev",
  "cleanup": "Port-Bereinigung für Port 3001",
  "start:smart": "Produktionsstart mit Port-Management"
}
```

### Client (`client/package.json`)
```json
{
  "start": "PORT=3003 react-scripts start",
  "start:smart": "./scripts/start-dev.sh",
  "start:clean": "npm run cleanup && npm start",
  "cleanup": "Port-Bereinigung für Ports 3000-3003"
}
```

## 🚨 Port-Konflikte vermeiden

### Was passiert automatisch:
1. **Port-Überprüfung** vor dem Start
2. **Automatische Bereinigung** blockierter Ports
3. **Fallback-Ports** wenn Standard-Ports belegt sind
4. **Graceful Shutdown** bei Beendigung

### Manuelle Lösung:
```bash
# Alle Node-Prozesse beenden
pkill -f 'npm\|node'

# Spezifischen Port freigeben
lsof -ti:3001 | xargs kill -9

# Port-Status prüfen
lsof -i :3001
```

## 🔍 Troubleshooting

### Server startet nicht
```bash
# Port-Status prüfen
lsof -i :3001

# Port bereinigen
cd server && npm run cleanup

# Intelligent starten
npm run dev:smart
```

### Client startet nicht
```bash
# Port-Status prüfen
lsof -i :3003

# Port bereinigen
cd client && npm run cleanup

# Intelligent starten
npm run start:smart
```

### Alle Services neu starten
```bash
# Alle stoppen
pkill -f 'npm\|node'

# Alles neu starten
./start-all.sh
```

## 💡 Tipps

1. **Verwenden Sie `./start-all.sh`** für den ersten Start
2. **Beenden Sie Services sauber** mit `Ctrl+C`
3. **Bei Problemen** verwenden Sie die `:smart` Scripts
4. **Port-Bereinigung** löst die meisten Probleme

## 🎉 Vorteile

- ✅ **Keine Port-Konflikte** mehr
- ✅ **Automatische Port-Findung**
- ✅ **Robuste Fehlerbehandlung**
- ✅ **Einfache Bedienung**
- ✅ **Professionelle Logs**
- ✅ **Graceful Shutdown**
