#!/usr/bin/env bash
# Installiert lokalen git post-push Hook: nach Push auf main → school-sync
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/post-push"
mkdir -p "$ROOT/.git/hooks"
cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto school-sync after push to main (VPN/LAN required)
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$ROOT/scripts/school-sync.sh"
LOG="$ROOT/.school-sync.log"

while read -r local_ref local_sha remote_ref remote_sha; do
  case "$remote_ref" in
    refs/heads/main)
      if [[ ! -x "$SCRIPT" ]]; then
        echo "school-sync: script fehlt ($SCRIPT)" >&2
        exit 0
      fi
      if [[ ! -f "$ROOT/.env.school" ]]; then
        echo "school-sync: .env.school fehlt — siehe .env.school.example" >&2
        exit 0
      fi
      echo "school-sync: Push auf main → Sync inkl. Backups (Log: .school-sync.log)…"
      (
        date
        "$SCRIPT"
      ) >>"$LOG" 2>&1 &
      echo "school-sync: läuft im Hintergrund (PID $!)"
      ;;
  esac
done
exit 0
EOF
chmod +x "$HOOK"
chmod +x "$ROOT/scripts/school-sync.sh" "$ROOT/scripts/merge-school-materials.py" \
  "$ROOT/scripts/pack-school-materials.py" 2>/dev/null || true
echo "Installiert: $HOOK"
echo "Als Nächstes: echtes Portainer-Passwort in .env.school setzen"
echo "Manuell: ./scripts/school-sync.sh"
