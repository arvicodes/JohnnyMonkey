#!/usr/bin/env bash
# Schnelltest: Warum ist 127.0.0.1:3000 nicht erreichbar?
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0

echo ""
echo "Diagnose – JohnnyMonkey lokal"
echo "=============================="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js nicht installiert"
  fail=1
else
  echo "✓ Node $(node -v)"
fi

if [[ -x node_modules/.bin/concurrently ]]; then
  echo "✓ concurrently (Projektroot npm install)"
else
  echo "❌ concurrently FEHLT → im Projektroot: npm install"
  echo "   (Ohne das bricht „npm run dev“ sofort ab → Verbindung abgelehnt)"
  fail=1
fi

if [[ -d client/node_modules/react-scripts ]]; then
  echo "✓ client/react-scripts"
else
  echo "❌ client nicht installiert → npm install --prefix client"
  fail=1
fi

if [[ -d server/node_modules/nodemon ]]; then
  echo "✓ server/nodemon"
else
  echo "❌ server nicht installiert → npm install --prefix server"
  fail=1
fi

for port in 3000 3003; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "✓ Port $port: Prozess läuft (PID $(lsof -ti:"$port" | head -1))"
  else
    echo "✗ Port $port: NICHTS läuft — npm run dev / npm run start:local starten"
    fail=1
  fi
done

if command -v curl >/dev/null 2>&1; then
  c=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:3000/ 2>/dev/null || echo "000")
  if [[ "$c" == "200" ]]; then
    echo "✓ http://127.0.0.1:3000 → HTTP 200"
  else
    echo "✗ http://127.0.0.1:3000 → nicht erreichbar (curl: $c)"
    fail=1
  fi
fi

echo ""
if [[ "$fail" -eq 0 ]]; then
  echo "Alles OK — Browser: http://127.0.0.1:3000"
else
  echo "Fix:  npm run start:local"
  echo "      (Terminal offen lassen bis „webpack compiled“ erscheint)"
fi
echo ""
exit "$fail"
