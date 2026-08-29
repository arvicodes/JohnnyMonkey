#!/usr/bin/env bash
# Auto-Commit + Push auf main (ohne Secrets/Backups).
# Danach greift post-push → school-sync (VPN/LAN + .env.school).
#
# Abschalten:  export JM_AUTO_GIT=0   oder  touch .disable-auto-git
# Usage:       ./scripts/auto-commit-push.sh
#              ./scripts/auto-commit-push.sh --dry-run

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

if [[ "${JM_AUTO_GIT:-1}" == "0" ]] || [[ -f "$ROOT/.disable-auto-git" ]]; then
  echo "auto-git: deaktiviert"
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [[ "$branch" != "main" ]]; then
  echo "auto-git: nur auf main (aktuell: ${branch:-?})"
  exit 0
fi

# Keine Auto-Commits mitten in einer Rebase/Merge-Situation
if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
  echo "auto-git: rebase/merge aktiv — übersprungen"
  exit 0
fi

if [[ "$DRY" == 1 ]]; then
  echo "auto-git: dry-run — Status:"
  git status -sb | head -40
  echo "message would be: auto: Stand $(date '+%Y-%m-%d %H:%M')"
  exit 0
fi

# Untracked/geändert, aber keine Secrets / großen Sync-Backups
git add -A -- \
  ':!.env' ':!.env.*' ':!.env.school' \
  ':!sync-backups' ':!*.b64' \
  ':!.school-deploy.log' ':!.school-sync.log' ':!.auto-git.log' \
  ':!mat_url.b64' ':!app_url.b64' \
  ':!**/._*' ':!**/.DS_Store' ':!**/Thumbs.db' ':!**/__MACOSX' \
  2>/dev/null || true
git add -f -- server/prisma/dev.db 2>/dev/null || true

# Sicherheitsnetz: gestagte Secrets wieder raus
git reset -q HEAD -- .env .env.school .env.local 2>/dev/null || true
git reset -q HEAD -- '*.b64' sync-backups 2>/dev/null || true

if git diff --cached --quiet; then
  echo "auto-git: nichts zu committen"
  exit 0
fi

stamp="$(date '+%Y-%m-%d %H:%M')"
msg="auto: Stand ${stamp}"

git commit -m "$(cat <<EOF
$msg

EOF
)"

echo "auto-git: commit ok — push main…"
git push origin HEAD:main
echo "auto-git: push ok"
