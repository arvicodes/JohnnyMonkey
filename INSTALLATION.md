# 🚀 JohnnyMonkey - Installationsanleitung

## 📋 Systemanforderungen

### Mindestanforderungen
- **Betriebssystem**: macOS 10.15+, Ubuntu 18.04+, Windows 10+
- **Node.js**: Version 18.0.0 oder höher
- **npm**: Version 8.0.0 oder höher
- **RAM**: 4 GB verfügbar
- **Festplatte**: 2 GB freier Speicherplatz

### Empfohlene Anforderungen
- **Betriebssystem**: macOS 12+, Ubuntu 20.04+, Windows 11+
- **Node.js**: Version 20.0.0 oder höher
- **npm**: Version 9.0.0 oder höher
- **RAM**: 8 GB verfügbar
- **Festplatte**: 5 GB freier Speicherplatz

## 🔧 Installation

### 1. Node.js installieren

#### macOS (mit Homebrew)
```bash
# Homebrew installieren (falls nicht vorhanden)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js installieren
brew install node

# Version prüfen
node --version
npm --version
```

#### Ubuntu/Debian
```bash
# NodeSource Repository hinzufügen
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js installieren
sudo apt-get install -y nodejs

# Version prüfen
node --version
npm --version
```

#### Windows
1. Lade den Node.js-Installer von [nodejs.org](https://nodejs.org/) herunter
2. Führe den Installer aus
3. Starte die Kommandozeile neu
4. Prüfe die Version: `node --version`

### 2. Repository klonen
```bash
# Repository klonen
git clone https://github.com/arvicodes/JohnnyMonkey.git

# Ins Verzeichnis wechseln
cd JohnnyMonkey
```

### 3. Dependencies installieren
```bash
# Server-Dependencies installieren
cd server
npm install

# Client-Dependencies installieren
cd ../client
npm install

# Zurück zum Hauptverzeichnis
cd ..
```

### 4. Datenbank einrichten
```bash
# Datenbank wird automatisch beim ersten Start erstellt
# Falls manuell: SQLite3-Datenbank liegt in server/prisma/dev.db

# Optional: Datenbankschema prüfen
cd server
npx prisma db push
cd ..
```

## 🚀 Erste Schritte

### Schnellstart (Empfohlen)
```bash
# Im JohnnyMonkey-Hauptverzeichnis
./start-app.sh
```

### Manueller Start
```bash
# Terminal 1: Server starten
cd server
npm run dev

# Terminal 2: Client starten
cd client
npm start
```

### Anwendung aufrufen
- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3001
- **Datenbank**: server/prisma/dev.db

## 📚 Erste Schritte nach dem Start

### 1. Lehrer-Account erstellen
1. Öffne http://localhost:3003
2. Klicke auf "Registrieren"
3. Wähle "Lehrer" als Rolle
4. Fülle die Registrierungsdaten aus

### 2. Schüler-Accounts erstellen
1. Melde dich als Lehrer an
2. Gehe zu "Schüler verwalten"
3. Erstelle neue Schüler-Accounts
4. Teile die Zugangscodes mit den Schülern

### 3. Flashcard-Deck erstellen
1. Gehe zu "Karteikarten"
2. Klicke auf "Neues Deck erstellen"
3. Lade eine DOCX-Datei hoch
4. Das System erstellt automatisch Karteikarten

### 4. Quiz erstellen
1. Gehe zu "Quiz"
2. Klicke auf "Neues Quiz erstellen"
3. Lade eine DOCX-Datei hoch
4. Das System erstellt automatisch Fragen

## 🛠️ Entwicklung

### Entwicklungsumgebung starten
```bash
# Alle Services im Entwicklungsmodus starten
./start-app.sh

# Logs anzeigen
tail -f server.log    # Server-Logs
tail -f client.log    # Client-Logs
```

### Build erstellen
```bash
# Server bauen
cd server
npm run build

# Client bauen
cd ../client
npm run build
```

### Tests ausführen
```bash
# Server-Tests
cd server
npm test

# Client-Tests
cd ../client
npm test
```

## 🐛 Troubleshooting

### Häufige Probleme

#### Port bereits belegt
```bash
# Ports prüfen
lsof -i :3001  # Server
lsof -i :3003  # Client

# Prozesse beenden
kill -9 <PID>
```

#### Dependencies-Problem
```bash
# Node-Module löschen und neu installieren
rm -rf node_modules package-lock.json
npm install
```

#### Datenbank-Probleme
```bash
# Datenbank zurücksetzen (VORSICHT: Alle Daten gehen verloren!)
cd server
rm prisma/dev.db
npx prisma db push
cd ..
```

#### Berechtigungsprobleme
```bash
# Skripte ausführbar machen
chmod +x start-app.sh stop-app.sh

# Node-Prozesse beenden
pkill -f node
```

### Logs analysieren
```bash
# Server-Logs
tail -f server.log

# Client-Logs
tail -f client.log

# Fehler filtern
grep -i error server.log
grep -i error client.log
```

## 📁 Projektstruktur verstehen

```
JohnnyMonkey/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React Komponenten
│   │   ├── pages/         # Seitenkomponenten
│   │   └── hooks/         # Custom React Hooks
│   └── package.json
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/   # API Controller
│   │   ├── routes/        # API Routen
│   │   └── services/      # Business Logic
│   ├── prisma/            # Datenbankschema & Migrationen
│   └── package.json
├── scripts/                # Hilfsskripte
├── start-app.sh           # Start-Skript
├── stop-app.sh            # Stop-Skript
└── README.md              # Hauptdokumentation
```

## 🔒 Sicherheit

### Umgebungsvariablen
Erstelle eine `.env` Datei im server-Verzeichnis:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
JWT_SECRET="dein-geheimer-schlüssel"
```

### Firewall-Einstellungen
- **Entwicklung**: Ports 3001 und 3003 nur lokal verfügbar
- **Produktion**: Konfiguriere Firewall für externe Zugriffe

## 📞 Support

### Hilfe bekommen
1. **GitHub Issues**: Erstelle ein Issue für Bugs oder Feature-Requests
2. **Dokumentation**: Prüfe README.md und INSTALLATION.md
3. **Logs**: Analysiere server.log und client.log
4. **Community**: Diskutiere im GitHub Discussions

### Nützliche Befehle
```bash
# Status prüfen
./stop-app.sh && ./start-app.sh

# Logs löschen
rm -f server.log client.log

# Dependencies aktualisieren
npm update

# Node-Version prüfen
node --version
npm --version
```

---

**Viel Erfolg bei der Installation und dem ersten Start von JohnnyMonkey! 🐵📚**

Bei Problemen: Erstelle ein GitHub Issue oder kontaktiere das Entwicklungsteam.
