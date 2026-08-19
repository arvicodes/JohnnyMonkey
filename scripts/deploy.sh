#!/bin/bash

# JohnnyMonkey Deployment Script
# Deploys the application from Git to a production server

set -e

# Configuration
REMOTE_HOST="your-server.com"
REMOTE_USER="deploy"
REMOTE_PATH="/var/www/johnnymonkey"
GIT_BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 JohnnyMonkey Deployment Script${NC}"
echo "=================================="

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$GIT_BRANCH" ]; then
    echo -e "${RED}❌ You must be on the $GIT_BRANCH branch to deploy${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ You have uncommitted changes. Please commit or stash them first.${NC}"
    git status --short
    exit 1
fi

# Get latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin $GIT_BRANCH

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
cd server && npm run build && cd ..
cd client && npm run build && cd ..

# Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r server/dist $DEPLOY_DIR/server/
cp -r client/build $DEPLOY_DIR/client/
cp -r server/prisma $DEPLOY_DIR/server/
cp server/package.json $DEPLOY_DIR/server/
cp -r scripts $DEPLOY_DIR/
cp start-all.sh $DEPLOY_DIR/
cp stop-app.sh $DEPLOY_DIR/
cp restart-app.sh $DEPLOY_DIR/

# Create production configuration
cat > $DEPLOY_DIR/server/.env << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=file:./prisma/prod.db
EOF

# Create deployment script
cat > $DEPLOY_DIR/deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying JohnnyMonkey..."

# Install production dependencies
cd server
npm install --production
cd ..

# Setup database
cd server
cp prisma/dev.db prisma/prod.db
npx prisma generate
cd ..

# Start application
chmod +x start-all.sh
./start-all.sh

echo "✅ Deployment complete!"
EOF

chmod +x $DEPLOY_DIR/deploy.sh

# Deploy to remote server
echo -e "${BLUE}🚀 Deploying to $REMOTE_HOST...${NC}"
rsync -avz --delete $DEPLOY_DIR/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# Execute deployment on remote server
echo -e "${BLUE}🔧 Executing deployment on remote server...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_PATH && chmod +x deploy.sh && ./deploy.sh"

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"
rm -rf $DEPLOY_DIR

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Application should be available at: http://$REMOTE_HOST:3003${NC}"
echo -e "${BLUE}🔧 API available at: http://$REMOTE_HOST:3001${NC}"
