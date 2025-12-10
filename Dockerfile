# Multi-stage build for JohnnyMonkey
FROM node:20-alpine AS base

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder

# Copy source code
COPY . .

# Build server
WORKDIR /app/server
RUN npm ci
RUN npm run build

# Build client
WORKDIR /app/client
RUN npm ci
RUN npm run build

# Production stage
FROM base AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/docker-start.sh ./docker-start.sh

# Install production dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Make start script executable
RUN chmod +x /app/docker-start.sh

# Create production environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose ports
EXPOSE 3001

# Health check (using wget as fallback if curl fails)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
WORKDIR /app
CMD ["/app/docker-start.sh"]
