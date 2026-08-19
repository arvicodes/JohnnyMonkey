#!/usr/bin/env bash
# Installiert einen lokalen git post-push Hook: nach Push auf main → school-deploy
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/post-push"
mkdir -p "$ROOT/.git/hooks"
cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto school-deploy after push to main (VPN/LAN required)
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$ROOT/scripts/school-deploy.sh"
LOG="$ROOT/.school-deploy.log"

while read -r local_ref local_sha remote_ref remote_sha; do
  case "$remote_ref" in
    refs/heads/main)
      if [[ ! -x "$SCRIPT" ]]; then
        echo "school-deploy: script fehlt ($SCRIPT)" >&2
        exit 0
      fi
      if [[ ! -f "$ROOT/.env.school" ]]; then
        echo "school-deploy: .env.school fehlt — siehe .env.school.example" >&2
        exit 0
      fi
      echo "school-deploy: Push auf main → Schulserver aktualisieren (Log: .school-deploy.log)…"
      (
        date
        "$SCRIPT"
      ) >>"$LOG" 2>&1 &
      echo "school-deploy: läuft im Hintergrund (PID $!)"
      ;;
  esac
done
exit 0
EOF
chmod +x "$HOOK"
chmod +x "$ROOT/scripts/school-deploy.sh" "$ROOT/scripts/pack-school-materials.py" 2>/dev/null || true
echo "Installiert: $HOOK"
echo "Als Nächstes: cp .env.school.example .env.school  # und Passwort setzen"
