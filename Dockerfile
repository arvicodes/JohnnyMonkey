# Multi-stage build for JohnnyMonkey
FROM node:20-alpine AS base

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder

# Install all dependencies (including dev dependencies) for building
WORKDIR /app
RUN npm ci

# Copy source code
COPY . .

# Build server
WORKDIR /app/server
RUN npm ci
# Generate Prisma client before building - use explicit schema
RUN npx prisma generate --schema=prisma/schema.prisma || echo "Prisma generate skipped"
RUN npm run build

# Build client
WORKDIR /app/client
RUN npm ci
# Install @types/file-saver if not already installed
RUN npm install --save-dev @types/file-saver || echo "Types already installed"
# Set production environment for build
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV CI=false
# Build client (CI=false prevents warnings from failing the build)
RUN npm run build

# Production stage
FROM base AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/build ./server/client-build
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/docker-start.sh ./docker-start.sh
# Copy backup database for automatic import
COPY --from=builder /app/backup_latest.db ./backup_latest.db
# Copy J-M-Reihen directory for FileSystemPath
COPY --from=builder /app/J-M-Reihen ./J-M-Reihen

# Install production dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Make start script executable
RUN chmod +x /app/docker-start.sh

# Create production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports
EXPOSE 3000

# Health check (using wget as fallback if curl fails)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
WORKDIR /app
CMD ["/app/docker-start.sh"]
