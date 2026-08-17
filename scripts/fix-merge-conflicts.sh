#!/usr/bin/env bash
# Stellt Dateien ohne Merge-Konflikt-Marker von origin/main wieder her.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REF="${1:-origin/main}"
echo "→ Hole $REF …"
git fetch origin main 2>/dev/null || true
git fetch origin Juli-2026 2>/dev/null || true

FILES=(
  client/src/components/TeacherDashboard.tsx
  client/src/components/StudentDashboard.tsx
  client/src/lib/wochenaufgabenFolder.ts
  client/src/lib/wochenaufgabenHydrate.ts
  client/src/lib/presentationSound.ts
  client/src/components/presentation/PresentationSoundControls.tsx
  client/src/App.tsx
)

found=0
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]] && grep -qE '^<<<<<<<|^=======|^>>>>>>>' "$f"; then
    echo "⚠️  Merge-Konflikt in $f"
    found=1
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "Keine Konflikt-Marker in den Standard-Dateien — stelle trotzdem saubere Versionen wieder her."
fi

git checkout "$REF" -- "${FILES[@]}"
echo "✅ Fertig. Bitte: npm run dev"
