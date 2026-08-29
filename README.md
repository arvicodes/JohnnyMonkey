# JohnnyMonkey - Fullstack Learning Platform

A comprehensive learning management system built with React, Node.js, and Prisma.

## 🚀 Quick Start

### Prerequisites
- Node.js (Version 18 or higher)
- npm or yarn
- Git

### 1. Clone Repository
```bash
git clone https://github.com/arvicodes/JohnnyMonkey.git
cd JohnnyMonkey
```

### 2. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install

# Back to root directory
cd ..
```

### 3. Start Application

**Ports:** Frontend **3000**, API **3003** (siehe `client/src/setupProxy.js`).

#### Option A: Ein Befehl (empfohlen)
```bash
# Im Projektroot – startet API + React gleichzeitig
npm install
npm run dev
```
Dann im Browser: **http://localhost:3000**

#### Option B: Shell-Skript
```bash
chmod +x start-all.sh
./start-all.sh
```

#### Option C: Zwei Terminals
```bash
# Terminal 1: API (Port 3003)
cd server
npm run dev

# Terminal 2: React (Port 3000)
cd client
npm start
```

### 4. Access Application
- **Frontend (Website):** http://127.0.0.1:3000 (oder `http://localhost:3000`)
- **Backend API:** http://127.0.0.1:3003
- **Database:** server/prisma/dev.db

### Problem: „Verbindung abgelehnt“ / Website nicht erreichbar

1. **Server wirklich gestartet?** Im Projektroot: `npm run dev` und **mindestens 30–60 Sekunden** warten (erster Start kompiliert lange).
2. **Richtige Adresse:** **`http://127.0.0.1:3000`** – nicht nur `http://localhost` (ohne Port) und nicht Port **3003** für die Website (das ist nur die API).
3. **Prüfen:** Im Projektroot `npm run check:local` – zeigt, ob Port 3000 und 3003 antworten.
4. **`localhost` vs IPv6:** Wenn `localhost` streikt, immer **`127.0.0.1:3000`** verwenden.
5. **Windows:** `server`-Skripte nutzen **Bash** (`setup-local.sh`). Am besten **Git Bash** oder **WSL** verwenden, im Projektroot `npm run dev` ausführen.

## 🚀 Production Deployment

### Portainer.io Deployment

Kurzcheck: siehe auch [`DEPLOY_PORTAINER_CHECKLIST.md`](./DEPLOY_PORTAINER_CHECKLIST.md).

#### Schüler- und Lehrerzugang (aktuell)

HTTPS terminiert die Sophos-Firewall. Die App selbst bleibt intern HTTP auf Port 80. Den Port **`:44443`** mit eintippen.

| Wer | URL |
|-----|-----|
| Unterricht / Schulnetz | `https://mnsplusdocker:44443/` |
| Von zu Hause / unterwegs | `https://rpl-50147-0.dn.mnsnet.de:44443/` |
| Portainer (nur Verwaltung) | `https://192.168.8.1:9443` |

Nicht ausgeben: `http://192.168.8.1` (Klartext; wird auf den HTTPS-Namen umgeleitet). Nicht verwenden: Cloudflare-`trycloudflare.com`-Tunnel (nur alter Workaround).

Chrome kann **Nicht sicher** zeigen, weil das Zertifikat von der Schul-CA (JoGy-Firewall) stammt, nicht von einer öffentlichen Stelle. Die Adresse ist trotzdem die richtige.

**Technik hinter der App:** `network_mode: host`, `PORT=80`, Healthcheck `http://127.0.0.1:80/health`. Container `webserver` (nginx) muss gestoppt bleiben.

**Redeploy nach Compose-Änderung:** Stacks → `johnnymonkey` → **Pull and redeploy** (Rebuild an, Re-pull image aus). Nicht über Containers → Recreate.

#### Sicherungsordner in Portainer ansehen

Die Kopien von Notizen, Folien und Tickets liegen **nicht** unter Volumes als eigener Ordnerbaum, sondern im App-Container auf dem Datenbank-Volume.

1. VPN / Schulnetz, dann Portainer: `https://192.168.8.1:9443`
2. Environment (Docker-Host) wählen.
3. **Containers** → **johnnymonkey-app**.
4. **Console** öffnen, Shell `/bin/sh`, **Connect**.
5. Ordner auflisten:

```bash
ls /app/server/data/jm-files
```

Darunter dieselben Namen wie auf dem Laptop:

| Auf der Schule | Inhalt |
|----------------|--------|
| `/app/server/data/jm-files/Notizen-Sicherheitskopien` | gelbes N, `latest.json` + `pad-…` |
| `/app/server/data/jm-files/Presentation-Sicherheitskopien` | Folien-Stände |
| `/app/server/data/jm-files/J-M-Reihen/Backup - Tickets` | Ticket-Kopien nach ⌘S |
| `/app/server/data/jm-files/J-M-Reihen/Backup - Folien` | Folien-Kopien nach ⌘S |
| `/app/server/data/jm-files/J-M-Reihen/Backup - Notizen` | Notizen-Kopien nach ⌘S |
| `/app/server/data/jm-files/J-M-Reihen/Lehrer-Schnellnotizen` | aktueller Notizen-Stand |
| `/app/server/data/jm-files/J-M-Reihen/Folien - ALLE - BACKUP` | Sammelkopien der Folien |

Im Container sind `/app/J-M-Reihen`, `/app/Notizen-Sicherheitskopien` und `/app/Presentation-Sicherheitskopien` Verweise auf genau diese Volume-Ordner. Ticket-Beispiel:

```bash
ls "/app/J-M-Reihen/Backup - Tickets"
```

Unter **Volumes** heißt das Volume **johnnymonkey_database** (eingehängt als `/app/server/data`). Dort siehst du nur das Volume, nicht den Ordnerbaum — der Inhalt ist der Pfad oben.

Auf dem Laptop (und in Git): `Notizen-Sicherheitskopien/`, `J-M-Reihen/Backup - Tickets` usw.

#### Stand nach GitHub

Am **Laptop** und auf der **Schule**: Profilfoto antippen → **Stand nach GitHub** (schicken) oder **Stand von GitHub holen** (einspielen). Es öffnet sich ein Fenster, das die Änderungen auflistet und den Lauf zeigt.

- Laptop: ganzer Git-Stand (Folien, Notizen, Tickets, Code). Keine Passwörter.
- Schule: dieser Schul-Stand (Folien, Notizen, Tickets) — braucht einmal `scripts/install-school-github-token.sh`.

Manuell am Laptop: `npm run git:sicherungen`

#### Datenbank-Update in Portainer

Wenn du die lokale Datenbank nach Portainer bringen möchtest:

**Schritt 1: Lokale Datenbank als Backup speichern**
```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
cp server/prisma/dev.db backup_latest.db
git add backup_latest.db
git commit -m "Update: Datenbank-Backup für Portainer"
git push
```

**Schritt 2: Stack in Portainer aktualisieren**
1. Portainer → **Stacks** → `johnnymonkey`
2. **Editor** → **Pull and redeploy** (oder Git repository → **Pull latest changes**)
3. Warten bis Build abgeschlossen ist

**Schritt 3: Datenbank im Container ersetzen**
1. Portainer → **Containers** → `johnnymonkey-app` → **Console**
2. Im Container ausführen:
   ```bash
   # Prüfe ob neue backup_latest.db vorhanden ist
   ls -lh /app/backup_latest.db
   
   # Alte Datenbank löschen
   rm /app/server/prisma/dev.db
   
   # Neue Datenbank kopieren
   cp /app/backup_latest.db /app/server/prisma/dev.db
   
   # Prüfen
   ls -lh /app/server/prisma/dev.db
   ```
3. Container neu starten: **Containers** → `johnnymonkey-app` → **Restart**

**Automatischer Import:** Das `docker-start.sh` Script importiert automatisch `backup_latest.db`, wenn:
- `dev.db` nicht existiert, ODER
- `backup_latest.db` neuer ist als `dev.db`, ODER
- Umgebungsvariable `FORCE_DB_IMPORT=true` gesetzt ist

**Hinweis:** Das Volume `johnnymonkey_database` kann nicht gelöscht werden, solange der Container läuft. Verwende die Console-Methode, um die Datenbank zu ersetzen.

### Render.com Deployment

This project is configured for deployment on Render.com with automatic builds and deployments.

#### Critical Configuration Requirements

**⚠️ IMPORTANT: Express.js Static File Configuration**

The most common issue causing blank pages in production is **incorrect Express.js configuration for static files and React Router**.

**Correct Configuration (server/src/index.ts):**
```typescript
import express from 'express';
import path from 'path';

const app = express();

// 1. API Routes FIRST (before static middleware)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// ... other API routes

// 2. Static files from client build
const clientBuildPath = path.join(__dirname, '..', 'client-build');
app.use(express.static(clientBuildPath));

// 3. React Router Fallback LAST (always last!)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});
```

**❌ Common Mistakes to Avoid:**
- Don't put static middleware before API routes
- Don't use multiple conflicting static middleware configurations
- Don't forget the React Router fallback route
- Don't use incorrect paths to client-build folder

#### Build Configuration (render.yaml)

The `render.yaml` file ensures:
1. **Client build** is created correctly
2. **Client build** is copied to server's `client-build` folder
3. **Server build** includes the client build
4. **Static files** are served correctly

#### Troubleshooting Blank Pages

If you see blank pages in production:

1. **Check Express configuration** - Ensure static middleware and React Router fallback are correct
2. **Verify client-build path** - Should be `../client-build` from compiled server
3. **Check build logs** - Ensure client build is copied successfully
4. **Verify API routes** - Ensure they're defined before static middleware

## 🗄️ Database

### Current Setup
- **Provider**: SQLite (file-based database)
- **ORM**: Prisma Client
- **Schema**: `server/prisma/schema.prisma`
- **Database File**: `server/prisma/dev.db`
- **Generated Client**: `server/src/generated/prisma/`

### Database Management
```bash
# Push schema changes (development)
cd server && npx prisma db push

# Generate Prisma client
cd server && npx prisma generate

# Inspect database
cd server && sqlite3 prisma/dev.db ".tables"
```

### Backup System
- Automatic backups on each commit
- Manual backups: `./scripts/backup-manager.sh`
- Backup location: `server/prisma/backups/`

## 📁 Project Structure

```
JohnnyMonkey/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React Components
│   │   ├── pages/         # Page Components
│   │   └── hooks/         # Custom React Hooks
│   └── package.json
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── controllers/   # API Controllers
│   │   ├── routes/        # API Routes
│   │   └── services/      # Business Logic
│   ├── prisma/            # Database Schema & Backups
│   └── package.json
├── scripts/                # Utility Scripts
├── material/               # Learning Materials
└── README.md
```

## 🛠️ Available Scripts

### Startup Scripts
- `./start-all.sh` - Start both client and server (recommended)
- `./start-app.sh` - Alternative startup script
- `./stop-app.sh` - Stop all services
- `./restart-app.sh` - Restart all services

### Development Scripts
- `npm start` - Start both client and server
- `npm run dev` - Start in development mode
- `npm run build` - Build for production

## 🔧 Features

- **Flashcard System** - Spaced repetition learning
- **Quiz Management** - Interactive quizzes with grading
- **File Management** - Organized learning materials
- **User Management** - Students and teachers
- **Grading System** - Comprehensive assessment tools
- **Progress Tracking** - Learning analytics

## 📚 Documentation

- `INSTALLATION.md` - Detailed setup instructions
- `FLASHCARD_SYSTEM_FIX.md` - Flashcard system documentation
- `GRADING_FEATURE.md` - Grading system guide
- `BACKUP_SYSTEM.md` - Database backup procedures
- `DEVELOPMENT_SCRIPTS.md` - Development workflow

## 🚨 Important Notes

- **No seed files required** - Database uses real data
- **Automatic port management** - Ports 3001 (server) and 3003 (client)
- **Database backups** - Automatic on commits, manual available
- **Production ready** - Complete with startup scripts and documentation

## 🆘 Troubleshooting

### Port Conflicts
```bash
# Check port usage
lsof -i :3001 -i :3003

# Kill conflicting processes
./stop-app.sh
```

### Database Issues
```bash
# Restore from backup
cp server/prisma/backup_latest.db server/prisma/dev.db

# Regenerate Prisma client
cd server && npx prisma generate
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
cd client && npm install
cd ../server && npm install
```

## 📞 Support

For issues or questions, check the documentation files or create an issue in the repository. 