#!/bin/bash

# JohnnyMonkey Master Start Script
# Starts both server and client with automatic port conflict resolution

echo "🚀 Starting JohnnyMonkey - Complete Development Environment"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0 # Port is in use
    else
        return 1 # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}⚠️  Port $port is busy, attempting to free it...${NC}"
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${BLUE}🔄 Killing process $pid on port $port${NC}"
        kill -9 $pid 2>/dev/null
        sleep 2
        
        if check_port $port; then
            echo -e "${RED}❌ Failed to free port $port${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Port $port is now free${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}ℹ️  No process found on port $port${NC}"
        return 0
    fi
}

# Clean up all relevant ports (React=3000, API=3003)
echo -e "${PURPLE}🧹 Cleaning up ports...${NC}"
PORTS=(3000 3001 3002 3003)
for port in "${PORTS[@]}"; do
    if check_port $port; then
        kill_port $port
    fi
done

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    echo -e "${RED}❌ Please run this script from the JohnnyMonkey root directory${NC}"
    exit 1
fi

# Start server in background
echo -e "${BLUE}🎯 Starting server...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
    npm install
fi

# API läuft fest auf Port 3003 (server/package.json: dev)
npm run dev &
SERVER_PID=$!
cd ..

# Kurz warten bis nodemon die API hochgefahren hat
sleep 6

# Prüfen ob API auf 3003 lauscht
if check_port 3003; then
    echo -e "${GREEN}✅ API läuft auf Port 3003${NC}"
else
    echo -e "${YELLOW}⚠️  Port 3003 noch nicht aktiv – evtl. länger warten oder Terminal prüfen${NC}"
fi

# Start client in background
echo -e "${BLUE}🎯 Starting client...${NC}"
cd client
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
    npm install
fi

# Start client
npm start &
CLIENT_PID=$!
cd ..

echo ""
echo -e "${GREEN}🎉 All services started!${NC}"
echo -e "${BLUE}💡 Website (React): http://localhost:3000${NC}"
echo -e "${BLUE}💡 API (Backend):  http://localhost:3003${NC}"
echo -e "${BLUE}💡 Health:         http://localhost:3003/health (falls vorhanden)${NC}"
echo ""
echo -e "${YELLOW}📝 To stop all services, press Ctrl+C${NC}"
echo -e "${YELLOW}📝 Or run: pkill -f 'npm\|node'${NC}"
echo ""

# Wait for user interrupt
trap 'echo -e "\n${RED}🛑 Shutting down...${NC}"; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit 0' INT

# Keep script running
wait
