#!/bin/bash

# JohnnyMonkey - Lernplattform Start-Skript
# Version 1.0.0

echo "🐵 JohnnyMonkey Lernplattform wird gestartet..."
echo "================================================"

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion zum Beenden aller Node-Prozesse
cleanup_nodes() {
    echo -e "${YELLOW}🧹 Beende alle laufenden Node-Prozesse...${NC}"
    pkill -f "node.*dist/index.js" 2>/dev/null
    pkill -f "react-scripts" 2>/dev/null
    pkill -f "npm.*start" 2>/dev/null
    sleep 2
    echo -e "${GREEN}✅ Node-Prozesse bereinigt${NC}"
}

# Funktion zum Prüfen der Ports
check_ports() {
    echo -e "${BLUE}🔍 Prüfe Port-Verfügbarkeit...${NC}"
    
    if lsof -i :3001 >/dev/null 2>&1; then
        echo -e "${RED}❌ Port 3001 (Server) ist bereits belegt${NC}"
        return 1
    fi
    
    if lsof -i :3003 >/dev/null 2>&1; then
        echo -e "${RED}❌ Port 3003 (Client) ist bereits belegt${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Alle Ports sind verfügbar${NC}"
    return 0
}

# Funktion zum Starten des Servers
start_server() {
    echo -e "${BLUE}🚀 Starte Server...${NC}"
    cd server
    
    # Prüfe ob Dependencies installiert sind
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installiere Server-Dependencies...${NC}"
        npm install
    fi
    
    # Baue den Server
    echo -e "${YELLOW}🔨 Baue Server...${NC}"
    npm run build
    
    # Starte den Server im Hintergrund
    echo -e "${GREEN}✅ Server wird gestartet...${NC}"
    nohup npm run dev > ../server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > ../server.pid
    
    cd ..
    
    # Warte kurz und prüfe ob Server läuft
    sleep 3
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Server läuft erfolgreich auf Port 3001${NC}"
    else
        echo -e "${RED}❌ Server konnte nicht gestartet werden${NC}"
        return 1
    fi
}

# Funktion zum Starten des Clients
start_client() {
    echo -e "${BLUE}🌐 Starte Client...${NC}"
    cd client
    
    # Prüfe ob Dependencies installiert sind
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installiere Client-Dependencies...${NC}"
        npm install
    fi
    
    # Starte den Client im Hintergrund
    echo -e "${GREEN}✅ Client wird gestartet...${NC}"
    nohup npm start > ../client.log 2>&1 &
    CLIENT_PID=$!
    echo $CLIENT_PID > ../client.pid
    
    cd ..
    
    # Warte kurz und prüfe ob Client läuft
    sleep 5
    if curl -s http://localhost:3003 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Client läuft erfolgreich auf Port 3003${NC}"
    else
        echo -e "${YELLOW}⚠️  Client startet noch... (kann bis zu 30 Sekunden dauern)${NC}"
    fi
}

# Funktion zum Anzeigen der URLs
show_urls() {
    echo ""
    echo -e "${GREEN}🎉 JohnnyMonkey ist erfolgreich gestartet!${NC}"
    echo "================================================"
    echo -e "${BLUE}🌐 Frontend (Client):${NC} http://localhost:3003"
    echo -e "${BLUE}🔧 Backend (Server):${NC} http://localhost:3001"
    echo -e "${BLUE}🗄️  Datenbank:${NC} server/prisma/dev.db"
    echo ""
    echo -e "${YELLOW}📋 Logs anzeigen:${NC}"
    echo "  Server: tail -f server.log"
    echo "  Client: tail -f client.log"
    echo ""
    echo -e "${YELLOW}🛑 Anwendung beenden:${NC} ./stop-app.sh"
    echo ""
}

# Hauptfunktion
main() {
    # Prüfe ob wir im richtigen Verzeichnis sind
    if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
        echo -e "${RED}❌ Bitte führe dieses Skript im JohnnyMonkey-Hauptverzeichnis aus${NC}"
        exit 1
    fi
    
    # Bereinige alte Prozesse
    cleanup_nodes
    
    # Prüfe Ports
    if ! check_ports; then
        echo -e "${RED}❌ Ports sind belegt. Beende die blockierenden Prozesse manuell.${NC}"
        exit 1
    fi
    
    # Starte Server
    if ! start_server; then
        echo -e "${RED}❌ Server konnte nicht gestartet werden${NC}"
        exit 1
    fi
    
    # Starte Client
    start_client
    
    # Zeige URLs
    show_urls
}

# Skript ausführen
main "$@"
