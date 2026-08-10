# Runtime-Image: Build läuft lokal (Schulserver hat nur ~2 GB RAM).
# Erwartet: server/dist und client/build bereits gebaut und im Git.
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache curl

COPY server/package*.json ./server/
COPY server/prisma ./server/prisma
COPY server/dist ./server/dist
COPY client/build ./server/client-build
COPY docker-start.sh ./docker-start.sh
COPY backup_latest.db ./backup_latest.db

WORKDIR /app/server
RUN npm ci --omit=dev
# Prisma Client für Production
RUN npx prisma generate --schema=prisma/schema.prisma || echo "Prisma generate skipped"

RUN chmod +x /app/docker-start.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

WORKDIR /app
CMD ["/app/docker-start.sh"]
