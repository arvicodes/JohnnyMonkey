# JohnnyMonkey - Fullstack Learning Platform

A comprehensive learning management system built with React, Node.js, and Prisma.

## Tech Stack

- **Frontend**: React, Material-UI, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with Prisma ORM
- **Development**: Nodemon, Concurrently

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   npm install --prefix client
   npm install --prefix server
   ```

2. Start the application:
   ```bash
   npm start
   ```

## Database Management

**⚠️ Wichtig: Keine Seed-Datei mehr erforderlich!**

Die Anwendung verwendet echte Daten aus der Datenbank. Für eine saubere Installation:

1. **Datenbank wiederherstellen:**
   ```bash
   cp server/prisma/basis2_backup_20250805_112847.db server/prisma/dev.db
   ```

2. **Oder neuestes Backup verwenden:**
   ```bash
   cp server/prisma/backup_ohne_seed_20250805_121702.db server/prisma/dev.db
   ```

**Warum kein Seed-Script:**
- Komplexe Beziehungen zwischen Tabellen
- TypeScript-Kompatibilitätsprobleme
- Backups sind einfacher und zuverlässiger
- Echte Daten sind bereits vorhanden

## Available Scripts

- `npm start` - Start both client and server
- `npm run dev` - Start in development mode
- `npm run build` - Build for production

## Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
│   ├── prisma/      # Database schema and backups
│   └── src/         # Server source code
└── README.md
``` 