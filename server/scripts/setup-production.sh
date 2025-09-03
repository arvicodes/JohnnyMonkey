#!/bin/bash

# Production Setup Script
echo "🚀 Setting up for production deployment..."

# Set production environment variables
export NODE_ENV=production

# Generate Prisma client for production (PostgreSQL)
echo "📦 Generating Prisma client for production..."
npx prisma generate

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Production setup complete!"
echo "🌐 Ready for deployment with PostgreSQL database"
