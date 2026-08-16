#!/bin/bash
# Einmal lokal ausführen, wenn Wochenaufgaben-Freigabe mit „Interner Serverfehler“ scheitert.
set -e
cd "$(dirname "$0")/../server"

echo "🗄️  Lokale Datenbank: prisma/dev.db"
export DATABASE_URL="file:./prisma/dev.db"

bash ./scripts/setup-local.sh

echo ""
echo "✅ Fertig. Jetzt im Projektroot: npm run dev"
echo "   Browser: http://127.0.0.1:3000"
