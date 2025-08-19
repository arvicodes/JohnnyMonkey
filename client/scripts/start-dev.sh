#!/bin/bash

# JohnnyMonkey Client Start Script
# Automatically resolves port conflicts and starts the development client

echo "🚀 Starting JohnnyMonkey Client..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    
    # Find and kill process on port
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${BLUE}🔄 Killing process $pid on port $port${NC}"
        kill -9 $pid 2>/dev/null
        
        # Wait a moment for the port to be freed
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

# Check and free default ports if needed
DEFAULT_PORTS=(3000 3001 3002 3003)
for port in "${DEFAULT_PORTS[@]}"; do
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port is busy${NC}"
        kill_port $port
    fi
done

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Start the client
echo -e "${GREEN}🎯 Starting development client...${NC}"
echo -e "${BLUE}💡 The client will automatically find a free port${NC}"
echo -e "${BLUE}💡 Press Ctrl+C to stop the client${NC}"
echo ""

npm start
