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

# Copy built application
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/start-all.sh ./
COPY --from=builder /app/stop-app.sh ./
COPY --from=builder /app/restart-app.sh ./

# Install production dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Create production environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose ports
EXPOSE 3001 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["./start-all.sh"]
