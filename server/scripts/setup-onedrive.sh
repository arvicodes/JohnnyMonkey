#!/bin/bash

# OneDrive Setup Script
echo "☁️ Setting up OneDrive integration..."

# Check if OneDrive URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your OneDrive URL as an argument"
    echo "Usage: ./setup-onedrive.sh 'https://your-onedrive-url'"
    exit 1
fi

ONEDRIVE_URL="$1"

# Set environment variables for production
echo "🔧 Setting up environment variables..."
export ONEDRIVE_URL="$ONEDRIVE_URL"
export NODE_ENV="production"

# Update the storage manager configuration
echo "📝 Updating storage configuration..."
cat > server/src/utils/storageConfig.ts << EOF
export const STORAGE_CONFIG = {
  type: process.env.NODE_ENV === 'production' ? 'onedrive' : 'local',
  basePath: process.env.LOCAL_MATERIALS_PATH || '/Users/verachrist/Documents/Monkey/J-M-Reihen',
  onedriveUrl: process.env.ONEDRIVE_URL || '$ONEDRIVE_URL'
};
EOF

echo "✅ OneDrive setup complete!"
echo "🌐 OneDrive URL: $ONEDRIVE_URL"
echo "🚀 Ready for production deployment with OneDrive integration"
echo ""
echo "To test locally with OneDrive:"
echo "  export ONEDRIVE_URL='$ONEDRIVE_URL'"
echo "  export NODE_ENV='production'"
echo "  npm run dev"
