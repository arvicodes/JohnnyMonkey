#!/usr/bin/env bash
# JohnnyMonkey lokal starten — Ports frei, Konflikte fixen, dev-Server hochfahren.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "JohnnyMonkey – lokaler Start"
echo "============================"

echo "→ Ports 3000 / 3003 freigeben …"
for port in 3000 3003; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
    echo "  Port $port beendet"
  fi
done

if [[ -d .git ]]; then
  echo "→ Git: fetch + Compile-Dateien prüfen …"
  git fetch origin main 2>/dev/null || echo "  (fetch übersprungen – offline?)"
  if bash scripts/fix-merge-conflicts.sh origin/main 2>/dev/null; then
    echo "  Compile-Dateien OK"
  else
    echo "  ⚠ fix-merge-conflicts fehlgeschlagen — ggf. manuell prüfen"
  fi
fi

echo "→ Abhängigkeiten …"
npm install --no-audit --no-fund 2>&1 | tail -3
(cd server && npm install --no-audit --no-fund) 2>&1 | tail -2
(cd client && npm install --no-audit --no-fund) 2>&1 | tail -2

echo "→ Datenbank …"
npm run fix:local-db 2>&1 | tail -5 || true

echo ""
echo "→ Starte Dev-Server (API :3003, Website :3000) …"
echo "  Browser: http://127.0.0.1:3000"
echo "  Beenden: Strg+C"
echo ""

exec npm run dev
