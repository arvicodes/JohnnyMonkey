#!/usr/bin/env bash
# Commit → Push main → Schul-Deploy (Portainer), so schnell wie möglich bei vollem Ablauf.
#
# Standard (ordentlich): Datenabgleich (school-sync), Build, App+DB+Pepper auf die Schule.
# Schneller nur Code:     --code-only  (kein Sync, keine Schul-DB — nur nach reinen Code-Fixes)
# Schneller mit DB:       --skip-sync  (Deploy ersetzt Schul-DB mit Laptop-DB, ohne vorherigen Sync)
#
# Usage:
#   ./scripts/schul-release.sh
#   ./scripts/schul-release.sh -m "Mathe: Längen-Übung"
#   ./scripts/schul-release.sh --no-commit          # nur push (falls schon committed) + deploy
#   ./scripts/schul-release.sh --code-only -m "fix"
#   ./scripts/schul-release.sh --dry-run
#
# Voraussetzung: Branch main, GitHub-Token (git credential), VPN + .env.school

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMMIT=1
PUSH=1
DRY=0
CODE_ONLY=0
SKIP_SYNC=0
MSG=""

usage() {
  sed -n '1,18p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -m|--message)
      [[ $# -ge 2 ]] || { echo "ERROR: -m braucht Text" >&2; exit 1; }
      MSG="$2"
      shift 2
      ;;
    --no-commit)
      COMMIT=0
      shift
      ;;
    --no-push)
      PUSH=0
      shift
      ;;
    --code-only)
      CODE_ONLY=1
      shift
      ;;
    --skip-sync)
      SKIP_SYNC=1
      shift
      ;;
    --dry-run)
      DRY=1
      shift
      ;;
    *)
      echo "ERROR: Unbekanntes Argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$CODE_ONLY" == 1 && "$SKIP_SYNC" == 1 ]]; then
  echo "Hinweis: --code-only ignoriert --skip-sync (kein DB-Deploy)." >&2
fi

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[[ "$branch" == "main" ]] || die "Nur auf Branch main (aktuell: ${branch:-?})."

if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
  die "Rebase/Merge aktiv — bitte zuerst abschließen."
fi

if [[ "$DRY" == 1 ]]; then
  log "=== dry-run ==="
  git status -sb | head -30
  log "commit=$COMMIT push=$PUSH code_only=$CODE_ONLY skip_sync=$SKIP_SYNC"
  log "message: ${MSG:-auto: Stand $(date '+%Y-%m-%d %H:%M')}"
  exit 0
fi

stage_and_commit() {
  git add -A -- \
    ':!.env' ':!.env.*' ':!.env.school' \
    ':!sync-backups' ':!*.b64' \
    ':!.school-deploy.log' ':!.school-sync.log' ':!.auto-git.log' \
    ':!mat_url.b64' ':!app_url.b64' \
    ':!**/._*' ':!**/.DS_Store' ':!**/Thumbs.db' ':!**/__MACOSX' \
    2>/dev/null || true
  git add -f -- server/prisma/dev.db 2>/dev/null || true
  git reset -q HEAD -- .env .env.school .env.local 2>/dev/null || true
  git reset -q HEAD -- '*.b64' sync-backups 2>/dev/null || true

  if git diff --cached --quiet; then
    log "Git: nichts zu committen."
    return 0
  fi

  local text="$MSG"
  if [[ -z "$text" ]]; then
    text="auto: Stand $(date '+%Y-%m-%d %H:%M')"
  fi
  git commit -m "$(cat <<EOF
$text

EOF
)"
  log "Git: commit ok — $text"
}

if [[ "$COMMIT" == 1 ]]; then
  log "==> 1/3 Git commit"
  stage_and_commit
else
  log "==> 1/3 Git commit übersprungen (--no-commit)"
fi

if [[ "$PUSH" == 1 ]]; then
  log "==> 2/3 Git push origin main"
  git push origin HEAD:main
  log "Git: push ok"
else
  log "==> 2/3 Push übersprungen (--no-push)"
fi

log "==> 3/3 Schul-Deploy"
if [[ "$CODE_ONLY" == 1 ]]; then
  log "Modus: nur App-Code (parallel build, keine DB, kein Material-Sync)"
  (
    cd server
    npx tsc --pretty false
  ) &
  pid_s=$!
  (
    cd client
    NODE_OPTIONS=--max_old_space_size=4096 CI=false GENERATE_SOURCEMAP=false npm run build
  ) &
  pid_c=$!
  wait "$pid_s" "$pid_c"
  "$ROOT/scripts/school-code-only.sh"
else
  if [[ "$SKIP_SYNC" == 1 ]]; then
    "$ROOT/scripts/school-deploy.sh" --skip-sync
  else
    "$ROOT/scripts/school-deploy.sh"
  fi
fi

log "==> Schul-Release fertig."
