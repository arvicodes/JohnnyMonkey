#!/usr/bin/env bash
# Stand von GitHub auf diesen Laptop holen (Folien, Notizen, Tickets, DB).
# Entspricht „Stand von GitHub holen“ in der App.
# Usage: ./scripts/git-pull-sicherungen.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

status() {
  echo "JM_STATUS=$1"
}

if [[ ! -d "$ROOT/.git" ]]; then
  status error
  echo "Kein Git-Ordner."
  exit 2
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [[ "$branch" != "main" ]]; then
  status error
  echo "Nur auf main (aktuell: ${branch:-unbekannt})."
  exit 2
fi

PATHS=(
  J-M-Reihen
  Notizen-Sicherheitskopien
  Presentation-Sicherheitskopien
  server/prisma/dev.db
)

echo "Hole neuesten Stand von GitHub…"
git fetch origin main

if git diff --quiet HEAD origin/main -- "${PATHS[@]}"; then
  status nothing
  echo "Nichts Neues — dieser Laptop hat schon den GitHub-Stand."
  exit 0
fi

git checkout origin/main -- "${PATHS[@]}"

for extra in -wal -shm -journal; do
  rm -f "$ROOT/server/prisma/dev.db${extra}" 2>/dev/null || true
done

status ok
echo "Von GitHub geholt. App neu laden, falls sie läuft."
