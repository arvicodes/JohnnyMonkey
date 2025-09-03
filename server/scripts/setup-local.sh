#!/bin/bash

# Local Development Setup Script
echo "🏠 Setting up for local development..."

# Set local environment variables
export NODE_ENV=development
export DATABASE_URL="file:./dev.db"

# Create a temporary schema for SQLite
echo "📝 Creating temporary SQLite schema..."
cat > prisma/schema.sqlite.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// Copy all models from main schema
EOF

# Append all models from the main schema (excluding datasource)
tail -n +10 prisma/schema.prisma >> prisma/schema.sqlite.prisma

# Generate Prisma client for SQLite
echo "📦 Generating Prisma client for SQLite..."
npx prisma generate --schema=prisma/schema.sqlite.prisma

echo "✅ Local development setup complete!"
echo "🗄️ Using SQLite database: dev.db"
echo "🚀 Ready to run: npm run dev"
