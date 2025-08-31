# 🚀 JohnnyMonkey Deployment Guide - Render

## 📋 Übersicht

Diese Anleitung beschreibt, wie JohnnyMonkey auf Render erfolgreich deployed wird.

## ✅ Voraussetzungen

- GitHub Repository mit aktuellem Code
- Render Account (kostenlos verfügbar)
- Node.js 18+ Support

## 🔧 Deployment-Schritte

### 1. Render Service erstellen

1. **Render Dashboard öffnen**: https://dashboard.render.com
2. **"New +" klicken** → "Web Service" auswählen
3. **Repository verbinden**: GitHub Repository auswählen
4. **Branch**: `main` auswählen

### 2. Service-Konfiguration

**Name**: `johnnymonkey` (oder gewünschter Name)
**Environment**: `Node`
**Region**: `Frankfurt` (für bessere Performance in Deutschland)
**Branch**: `main`
**Root Directory**: leer lassen (Standard)

### 3. Build & Start Commands

**Build Command** (wird automatisch aus render.yaml geladen):
```bash
echo "🚀 Starting build process..."
npm install
echo "📦 Building server..."
cd server && npm install && npm run build
echo "📦 Building client..."
cd ../client && npm install && npm run build
echo "📁 Copying client build to server..."
cd ../server && rm -rf client-build && cp -r ../client/build ./client-build
echo "✅ Build completed successfully!"
```

**Start Command**:
```bash
cd server && npm start
```

### 4. Environment Variables

**NODE_ENV**: `production`
**PORT**: `10000`
**DATABASE_URL**: `file:./prisma/render.db`

### 5. Disk & Persistence

**Disk Name**: `johnnymonkey-data`
**Mount Path**: `/opt/render/project/src/server/prisma`
**Size**: `1 GB`

## 🔐 Authentifizierung

### Login-Codes für Tests:

**Lehrer**:
- `1` - Frau Christ (TEACHER)
- `TEACH002` - Herr Kowalski (TEACHER)

**Schüler**:
- `STUD001` - Jakob Ackermann (STUDENT)
- `STUD002` - Josefine Baierl (STUDENT)

### API-Authentifizierung:

Alle API-Endpoints erfordern den `x-login-code` Header:
```bash
curl -H "x-login-code: 1" https://your-app.onrender.com/api/users
```

## 🌐 Verfügbare Endpoints

- **Frontend**: `https://your-app.onrender.com/`
- **Health Check**: `https://your-app.onrender.com/health`
- **API**: `https://your-app.onrender.com/api/*`

## 🚨 Troubleshooting

### Build-Fehler

1. **Prisma Client nicht gefunden**:
   - Build Command überprüfen
   - `npm run prisma:generate` wird automatisch ausgeführt

2. **Client-Build fehlt**:
   - Build-Log überprüfen
   - `client-build` Ordner wird automatisch erstellt

3. **Port-Konflikte**:
   - Port 10000 ist korrekt konfiguriert
   - Health Check überprüfen

### Runtime-Fehler

1. **"Login-Code erforderlich"**:
   - Das ist korrekt - alle Endpoints sind authentifiziert
   - Client muss `x-login-code` Header senden

2. **Leere Seiten**:
   - `client-build` Ordner überprüfen
   - Server-Logs analysieren

## 📊 Monitoring

### Health Check
```bash
curl https://your-app.onrender.com/health
```

### Logs
- Render Dashboard → Service → Logs
- Real-time Logs verfügbar

## 🔄 Updates

### Automatisches Deployment
- Bei jedem Push zu `main` Branch
- Build wird automatisch gestartet
- Zero-downtime Deployment

### Manuelles Deployment
1. Render Dashboard → Service
2. "Manual Deploy" → "Deploy latest commit"

## 📱 Client-Integration

Der React-Client sendet automatisch Login-Codes bei allen API-Aufrufen:
- Login-Code wird im localStorage gespeichert
- Alle API-Aufrufe verwenden `x-login-code` Header
- Zentrale API-Utility in `client/src/lib/api.ts`

## 🎯 Erfolgsindikatoren

✅ **Build erfolgreich** - Alle Dependencies installiert
✅ **Server startet** - Port 10000 ist aktiv
✅ **Health Check** - `/health` antwortet
✅ **Frontend lädt** - React-App wird serviert
✅ **API funktioniert** - Endpoints mit Authentifizierung

## 🆘 Support

Bei Problemen:
1. Render Logs überprüfen
2. Health Check testen
3. API-Endpoints mit korrektem Header testen
4. GitHub Issues erstellen

---

**Deployment erfolgreich! 🎉**
