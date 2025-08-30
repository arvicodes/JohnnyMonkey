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

#### Option A: One-Command Startup (Recommended)
```bash
# Start both server and client automatically
./start-all.sh
```

#### Option B: Manual Startup
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client
cd client
npm start
```

### 4. Access Application
- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3001
- **Database**: server/prisma/dev.db

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