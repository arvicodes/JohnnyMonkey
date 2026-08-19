#!/usr/bin/env bash
# Cursor stop-Hook: nach Agent-Ende Auto-Commit + Push (main).
set -euo pipefail
# stdin JSON verbrauchen
cat >/dev/null || true

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SCRIPT="$ROOT/scripts/auto-commit-push.sh"
LOG="$ROOT/.auto-git.log"

if [[ ! -x "$SCRIPT" ]]; then
  python3 -c 'import json; print(json.dumps({"additional_context":"auto-git: scripts/auto-commit-push.sh fehlt."}))'
  exit 0
fi

if [[ "${JM_AUTO_GIT:-1}" == "0" ]] || [[ -f "$ROOT/.disable-auto-git" ]]; then
  echo '{}'
  exit 0
fi

(
  date
  "$SCRIPT"
) >>"$LOG" 2>&1 &

python3 -c 'import json; print(json.dumps({"additional_context":"auto-git: Commit/Push im Hintergrund gestartet (Log: .auto-git.log). Push auf main triggert Schul-Sync."}))'
exit 0
