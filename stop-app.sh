#!/bin/bash

# JohnnyMonkey - Lernplattform Stop-Skript
# Version 1.0.0

echo "🛑 JohnnyMonkey Lernplattform wird beendet..."
echo "=============================================="

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktion zum Beenden aller JohnnyMonkey-Prozesse
stop_processes() {
    echo -e "${YELLOW}🧹 Beende alle JohnnyMonkey-Prozesse...${NC}"
    
    # Beende Server-Prozess
    if [ -f "server.pid" ]; then
        SERVER_PID=$(cat server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            echo -e "${BLUE}🛑 Beende Server (PID: $SERVER_PID)...${NC}"
            kill $SERVER_PID
            sleep 2
            if kill -0 $SERVER_PID 2>/dev/null; then
                echo -e "${RED}⚠️  Server reagiert nicht, erzwinge Beendigung...${NC}"
                kill -9 $SERVER_PID
            fi
        fi
        rm -f server.pid
    fi
    
    # Beende Client-Prozess
    if [ -f "client.pid" ]; then
        CLIENT_PID=$(cat client.pid)
        if kill -0 $CLIENT_PID 2>/dev/null; then
            echo -e "${BLUE}🛑 Beende Client (PID: $CLIENT_PID)...${NC}"
            kill $CLIENT_PID
            sleep 2
            if kill -0 $CLIENT_PID 2>/dev/null; then
                echo -e "${RED}⚠️  Client reagiert nicht, erzwinge Beendigung...${NC}"
                kill -9 $CLIENT_PID
            fi
        fi
        rm -f client.pid
    fi
    
    # Beende alle verbleibenden Node-Prozesse
    echo -e "${YELLOW}🧹 Bereinige verbleibende Node-Prozesse...${NC}"
    pkill -f "node.*dist/index.js" 2>/dev/null
    pkill -f "react-scripts" 2>/dev/null
    pkill -f "npm.*start" 2>/dev/null
    
    echo -e "${GREEN}✅ Alle Prozesse beendet${NC}"
}

# Funktion zum Prüfen der Ports
check_ports() {
    echo -e "${BLUE}🔍 Prüfe Port-Status...${NC}"
    
    if lsof -i :3001 >/dev/null 2>&1; then
        echo -e "${RED}❌ Port 3001 (Server) ist noch belegt${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port 3001 (Server) ist frei${NC}"
    fi
    
    if lsof -i :3003 >/dev/null 2>&1; then
        echo -e "${RED}❌ Port 3003 (Client) ist noch belegt${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port 3003 (Client) ist frei${NC}"
    fi
    
    return 0
}

# Funktion zum Aufräumen der Log-Dateien
cleanup_logs() {
    echo -e "${YELLOW}🧹 Räume Log-Dateien auf...${NC}"
    
    if [ -f "server.log" ]; then
        echo -e "${BLUE}📋 Server-Log:${NC}"
        tail -5 server.log
        echo ""
    fi
    
    if [ -f "client.log" ]; then
        echo -e "${BLUE}📋 Client-Log:${NC}"
        tail -5 client.log
        echo ""
    fi
    
    # Optional: Log-Dateien löschen
    read -p "🗑️  Log-Dateien löschen? (j/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Jj]$ ]]; then
        rm -f server.log client.log
        echo -e "${GREEN}✅ Log-Dateien gelöscht${NC}"
    else
        echo -e "${YELLOW}ℹ️  Log-Dateien bleiben erhalten${NC}"
    fi
}

# Hauptfunktion
main() {
    # Prüfe ob wir im richtigen Verzeichnis sind
    if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
        echo -e "${RED}❌ Bitte führe dieses Skript im JohnnyMonkey-Hauptverzeichnis aus${NC}"
        exit 1
    fi
    
    # Beende alle Prozesse
    stop_processes
    
    # Warte kurz
    sleep 2
    
    # Prüfe Ports
    if check_ports; then
        echo -e "${GREEN}🎉 Alle Ports sind erfolgreich freigegeben${NC}"
    else
        echo -e "${YELLOW}⚠️  Einige Ports sind möglicherweise noch belegt${NC}"
    fi
    
    # Räume Logs auf
    cleanup_logs
    
    echo ""
    echo -e "${GREEN}✅ JohnnyMonkey wurde erfolgreich beendet!${NC}"
    echo -e "${BLUE}🚀 Zum Neustarten: ./start-app.sh${NC}"
}

# Skript ausführen
main "$@"
