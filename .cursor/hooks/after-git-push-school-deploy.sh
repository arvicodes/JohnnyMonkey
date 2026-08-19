#!/usr/bin/env bash
# After a successful `git push` to main → school-sync (bidirektional + Backups).
set -euo pipefail

input="$(cat)"
command="$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("command") or "")' 2>/dev/null || true)"
status="$(printf '%s' "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("status") or d.get("exitCode") or d.get("exit_code") or "")' 2>/dev/null || true)"

if [[ -n "$status" && "$status" != "0" && "$status" != "success" && "$status" != "ok" ]]; then
  echo '{}'
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"

if ! printf '%s' "$command" | grep -Eq 'git[[:space:]]+push'; then
  echo '{}'
  exit 0
fi

targets_main=0
[[ "$BRANCH" == "main" ]] && targets_main=1
printf '%s' "$command" | grep -Eq '[[:space:]]main([[:space:]]|$)' && targets_main=1

if [[ "$targets_main" != 1 ]]; then
  echo '{}'
  exit 0
fi

SCRIPT="$ROOT/scripts/school-sync.sh"
LOG="$ROOT/.school-sync.log"

if [[ ! -x "$SCRIPT" ]]; then
  python3 -c 'import json; print(json.dumps({"additional_context":"school-sync: Script fehlt (scripts/school-sync.sh)."}))'
  exit 0
fi

if [[ ! -f "$ROOT/.env.school" ]]; then
  python3 -c 'import json; print(json.dumps({"additional_context":"school-sync: .env.school fehlt — Passwort setzen (siehe .env.school.example)."}))'
  exit 0
fi

if ! curl -sk -m 4 -o /dev/null "https://192.168.8.1:9443/"; then
  python3 -c 'import json; print(json.dumps({"additional_context":"school-sync: Portainer nicht erreichbar (VPN?) — Sync übersprungen."}))'
  exit 0
fi

(
  date
  echo "Triggered by Cursor hook after: $command"
  "$SCRIPT"
) >>"$LOG" 2>&1 &

python3 -c 'import json; print(json.dumps({"additional_context":"school-sync: Push auf main — Sync inkl. Backups läuft im Hintergrund (Log: .school-sync.log)."}))'
exit 0
