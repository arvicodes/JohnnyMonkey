#!/usr/bin/env bash
# Ganzer App-Stand nach GitHub — keine Secrets.
# Usage: ./scripts/git-push-sicherungen.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

status() {
  echo "JM_STATUS=$1"
}

if [[ ! -d "$ROOT/.git" ]]; then
  status error
  echo "Kein Git-Ordner. Auf der Schule übernimmt die App den Push selbst."
  exit 2
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [[ "$branch" != "main" ]]; then
  status error
  echo "Nur auf main (aktuell: ${branch:-unbekannt})."
  exit 2
fi

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
  status error
  echo "Git ist mitten in einem Merge — jetzt nicht schieben."
  exit 2
fi

git add -A -- \
  ':!.env' ':!.env.*' ':!.env.school' ':!.env.local' \
  ':!.jm-github-token' ':!**/.jm-github-token' \
  ':!.login-code-pepper' ':!**/.login-code-pepper' \
  ':!LOGIN-CODES-ALLE.txt' \
  ':!sync-backups' ':!*.b64' \
  ':!.school-deploy.log' ':!.school-sync.log' ':!.auto-git.log' \
  ':!mat_url.b64' ':!app_url.b64' \
  ':!**/._*' ':!**/.DS_Store' ':!**/Thumbs.db' ':!**/__MACOSX' \
  2>/dev/null || true

git reset -q HEAD -- \
  .env .env.school .env.local \
  .jm-github-token \
  .login-code-pepper \
  LOGIN-CODES-ALLE.txt \
  '*.b64' sync-backups \
  2>/dev/null || true

if git diff --cached --quiet; then
  status nothing
  echo "Nichts Neues — GitHub hat schon den aktuellen Stand."
  exit 0
fi

stamp="$(TZ=Europe/Berlin date '+%-d.%-m. %H:%M')"
msg="Stand Laptop ${stamp}"

git commit -m "$(cat <<EOF
$msg

EOF
)"

echo "Commit ok — schiebe nach GitHub…"
git push origin HEAD:main

status ok
echo "Auf GitHub: ${msg}"
