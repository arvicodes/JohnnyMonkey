#!/bin/bash

# JohnnyMonkey Render Deployment Script
# This script prepares the application for Render deployment

set -e

echo "🚀 Preparing JohnnyMonkey for Render deployment..."
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ] || [ ! -d "client" ]; then
    echo -e "${RED}❌ Please run this script from the JohnnyMonkey root directory${NC}"
    exit 1
fi

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf server/dist client/build

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build server
echo -e "${BLUE}🔨 Building server...${NC}"
cd server
npm run build
cd ..

# Build client
echo -e "${BLUE}🎨 Building client...${NC}"
cd client
npm run build
cd ..

# Generate Prisma client
echo -e "${BLUE}🗄️ Generating Prisma client...${NC}"
cd server
npx prisma generate
cd ..

# Create production database
echo -e "${BLUE}💾 Preparing production database...${NC}"
cd server/prisma
if [ -f "dev.db" ]; then
    cp dev.db render.db
    echo -e "${GREEN}✅ Production database prepared${NC}"
else
    echo -e "${YELLOW}⚠️ No dev.db found, creating empty render.db${NC}"
    touch render.db
fi
cd ../..

# Create .env.production for Render
echo -e "${BLUE}⚙️ Creating production environment file...${NC}"
cat > server/.env.production << EOF
NODE_ENV=production
PORT=10000
DATABASE_URL=file:./prisma/render.db
EOF

echo -e "${GREEN}✅ Render deployment preparation complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Push this code to GitHub"
echo "2. Connect your repository to Render"
echo "3. Render will automatically deploy"
echo ""
echo -e "${BLUE}🔗 Render will use:${NC}"
echo "- Build Command: npm install && cd server && npm run build && cd ../client && npm run build"
echo "- Start Command: cd server && npm start"
echo "- Environment: NODE_ENV=production, PORT=10000"
echo ""
echo -e "${GREEN}🚀 Ready for Render deployment!${NC}"
