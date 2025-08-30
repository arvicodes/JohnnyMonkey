# JohnnyMonkey - Lernplattform

Eine moderne Lernplattform für Schüler und Lehrer mit Flashcard-System, Quiz-Funktionalität und Dateiverwaltung.

## 🚀 Schnellstart

### Voraussetzungen
- Node.js (Version 18 oder höher)
- npm oder yarn
- Git

### 1. Repository klonen
```bash
git clone https://github.com/arvicodes/JohnnyMonkey.git
cd JohnnyMonkey
```

### 2. Dependencies installieren
```bash
# Server-Dependencies
cd server
npm install

# Client-Dependencies
cd ../client
npm install
```

### 3. Datenbank einrichten
```bash
# Zurück zum Hauptverzeichnis
cd ..

# Datenbank wird automatisch beim ersten Start erstellt
# Falls manuell: SQLite3-Datenbank liegt in server/prisma/dev.db
```

### 4. Anwendung starten

#### Option A: Beide Services gleichzeitig starten
```bash
# Im Hauptverzeichnis
./start-all.sh
```

#### Option B: Services einzeln starten
```bash
# Terminal 1: Server starten
cd server
npm run dev

# Terminal 2: Client starten
cd client
npm start
```

### 5. Anwendung aufrufen
- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3001
- **Datenbank**: server/prisma/dev.db

## 📁 Projektstruktur

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
└── README.md
```

## 🗄️ Datenbank

### Schema
Die Anwendung verwendet Prisma ORM mit SQLite3. Das Schema definiert:

- **User**: Schüler und Lehrer
- **FlashcardDeck**: Karteikarten-Sammlungen
- **Flashcard**: Einzelne Karteikarten
- **FlashcardProgress**: Lernfortschritt der Schüler
- **Quiz**: Quiz-Definitionen
- **QuizParticipation**: Quiz-Teilnahmen

### Backup-System
```bash
# Automatische Backups bei jedem Commit
./scripts/backup-manager.sh

# Manuelles Backup
cp server/prisma/dev.db backup_$(date +%Y%m%d_%H%M%S).db
```

## 🔧 Entwicklung

### Scripts
```bash
# Entwicklung starten
npm run dev

# Build erstellen
npm run build

# Tests ausführen
npm test

# Linting
npm run lint
```

### Umgebungsvariablen
Erstelle eine `.env` Datei im server-Verzeichnis:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
```

## 📚 Features

### Flashcard-System
- **Spaced Repetition Algorithmus** (SM-2 Variante)
- **Fortschrittsverfolgung** für jeden Schüler
- **Qualitätsbewertung** (1-5 Skala)
- **Automatische Wiederholungsplanung**

### Quiz-System
- **Dokumentenbasierte Quiz-Erstellung**
- **Automatische Bewertung**
- **Fortschrittsverfolgung**

### Dateiverwaltung
- **Hierarchische Ordnerstruktur**
- **Unterstützte Formate**: PDF, DOCX, PPTX, Bilder
- **Drag & Drop Upload**

## 🐛 Troubleshooting

### Häufige Probleme

#### Server startet nicht
```bash
# Port-Konflikte prüfen
lsof -i :3001

# Node-Prozesse beenden
pkill -f "node dist/index.js"
```

#### Client startet nicht
```bash
# Port 3003 bereits belegt
# Lösung: Anderen Port wählen oder bestehenden Prozess beenden
lsof -i :3003
kill -9 <PID>
```

#### Datenbank-Probleme
```bash
# Datenbank zurücksetzen (VORSICHT: Alle Daten gehen verloren!)
cd server
rm prisma/dev.db
npx prisma db push
```

### Logs prüfen
```bash
# Server-Logs
cd server
npm run dev

# Client-Logs
cd client
npm start
```

## 📝 Changelog

### Version 1.0.0 (2025-08-30)
- ✅ Flashcard-System mit Spaced Repetition
- ✅ Quiz-System mit automatischer Bewertung
- ✅ Dateiverwaltung mit Ordnerstruktur
- ✅ Benutzerverwaltung (Schüler/Lehrer)
- ✅ Fortschrittsverfolgung
- ✅ Responsive UI

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 📞 Support

Bei Fragen oder Problemen:
- Erstelle ein Issue auf GitHub
- Kontaktiere das Entwicklungsteam

---

**Viel Erfolg beim Lernen mit JohnnyMonkey! 🐵📚** 