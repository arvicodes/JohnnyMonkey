# Schnellstart & Tech-Stack

## Tech-Stack Übersicht

### Frontend (client)
- React 18
- React Router DOM
- Material UI (MUI)
- Tailwind CSS
- Radix UI
- Leaflet (Karten)
- TanStack React Query
- Diverse UI/UX Libraries (z.B. dnd-kit, embla-carousel, recharts)
- Build: react-scripts

### Backend (server)
- Node.js mit Express
- TypeScript
- Prisma ORM & Drizzle ORM
- PostgreSQL (Datenbank, via .env konfigurierbar)
- Nodemon (Entwicklung)

### GeoCodingQuest (Mono-Repo mit eigenem Server & Client)
- Express (API)
- React 18 (Client)
- Tailwind CSS
- Drizzle ORM
- Passport (Auth)
- Leaflet, recharts, Radix UI, uvm.
- Build: Vite, esbuild

---

## Startanleitung (immer aktuell)

### 1. Voraussetzungen
- Node.js & npm installiert
- `.env`-Dateien in `server/.env` und `GeoCodingQuest/server/.env` mit gültiger `DATABASE_URL` (PostgreSQL)

Beispiel `.env`:
```
DATABASE_URL=postgres://user:pass@host:port/dbname
```

### 2. Starten (empfohlen)

Im Hauptverzeichnis:
```sh
sudo pkill -f node && npm start
```
- Beendet alle laufenden Node-Prozesse (verhindert Port-Konflikte)
- Startet alle Services (GeoCodingQuest, client, server) parallel

### 3. Einzelne Services manuell starten (optional)

- **Frontend:**
  ```sh
  cd client && npm start
  ```
- **Backend:**
  ```sh
  cd server && npm run dev
  ```
- **GeoCodingQuest:**
  ```sh
  cd GeoCodingQuest && npm run dev
  ```

### 4. Troubleshooting
- Prüfe die Konsolenausgabe aller Server
- Kontrolliere die `.env`-Dateien und die Datenbank-URL
- Wiederhole ggf. den obigen Befehl

---

## Proxy-Konfiguration (Frontend)
In `client/package.json` ist das Proxy-Feld bereits korrekt gesetzt:
```
"proxy": "http://localhost:3005"
```

---

# ... bestehender Inhalt ... 