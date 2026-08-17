#!/usr/bin/env bash
# JohnnyMonkey lokal starten — mit Prüfung, warum 127.0.0.1:3000 sonst „Verbindung abgelehnt“ ist.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "JohnnyMonkey – lokaler Start"
echo "============================"

# Node?
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js fehlt. Bitte installieren: https://nodejs.org (LTS)"
  exit 1
fi
echo "Node $(node -v) · npm $(npm -v)"

echo ""
echo "→ Ports 3000 / 3003 freigeben …"
for port in 3000 3003; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
    echo "  Port $port beendet"
  fi
done

echo ""
echo "→ npm install (Projektroot — wichtig für „concurrently“!) …"
npm install --no-audit --no-fund
if [[ ! -x node_modules/.bin/concurrently ]]; then
  echo "❌ concurrently fehlt nach npm install — npm run dev kann nicht starten."
  exit 1
fi
echo "  ✓ concurrently OK"

echo "→ npm install (server + client) …"
npm install --prefix server --no-audit --no-fund
npm install --prefix client --no-audit --no-fund

if [[ -d .git ]]; then
  echo ""
  echo "→ Compile-Dateien von GitHub …"
  git fetch origin main 2>/dev/null || echo "  (offline — überspringe fetch)"
  bash scripts/fix-merge-conflicts.sh origin/main 2>/dev/null || true
fi

echo ""
echo "→ Datenbank …"
npm run fix:local-db 2>&1 | tail -6 || true

echo ""
echo "=========================================="
echo "  Website:  http://127.0.0.1:3000"
echo "  API:      http://127.0.0.1:3003/health"
echo "  Beenden:  Strg+C in DIESEM Terminal"
echo "=========================================="
echo ""
echo "Warte auf „webpack compiled“ — dann Browser öffnen."
echo ""

exec npm run dev
