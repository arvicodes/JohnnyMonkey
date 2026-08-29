#!/usr/bin/env bash
# Einmal: GitHub-Zugang der Schule auf das DB-Volume legen,
# damit „Stand nach GitHub“ auch global funktioniert.
# Voraussetzung: VPN, .env.school. Token kommt von git credential fill.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env.school" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.school"
  set +a
fi

PORTAINER_URL="${SCHOOL_PORTAINER_URL:-https://192.168.8.1:9443}"
PORTAINER_USER="${SCHOOL_PORTAINER_USER:-christvera}"
PORTAINER_PASSWORD="${SCHOOL_PORTAINER_PASSWORD:-}"
ENDPOINT_ID="${SCHOOL_PORTAINER_ENDPOINT_ID:-4}"
APP_NAME="${SCHOOL_APP_CONTAINER:-johnnymonkey-app}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

curl -sk -m 5 -o /dev/null "$PORTAINER_URL/" || die "Portainer nicht erreichbar (VPN?)."
[[ -n "$PORTAINER_PASSWORD" ]] || die "SCHOOL_PORTAINER_PASSWORD fehlt (.env.school)."

TOKEN="$(
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
    | awk -F= '/^password=/{print $2; exit}'
)"
[[ -n "$TOKEN" ]] || die "Kein GitHub-Token (git credential fill)."

JWT="$(
  curl -sk -X POST "$PORTAINER_URL/api/auth" \
    -H 'Content-Type: application/json' \
    -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jwt") or "")'
)"
[[ -n "$JWT" ]] || die "Portainer-Login fehlgeschlagen."

export PORTAINER_URL ENDPOINT_ID JWT APP_NAME TOKEN

python3 <<'PY'
import json, os, sys, urllib.request, ssl, base64

ctx = ssl._create_unverified_context()
base = os.environ["PORTAINER_URL"].rstrip("/")
ep = os.environ["ENDPOINT_ID"]
jwt = os.environ["JWT"]
token = os.environ["TOKEN"]
name = os.environ["APP_NAME"]

def req(method, path, data=None, headers=None, raw=False):
  h = {"Authorization": f"Bearer {jwt}"}
  if headers:
    h.update(headers)
  body = None
  if data is not None:
    body = json.dumps(data).encode()
    h["Content-Type"] = "application/json"
  r = urllib.request.Request(base + path, data=body, headers=h, method=method)
  with urllib.request.urlopen(r, context=ctx, timeout=60) as resp:
    rawb = resp.read()
    csrf = resp.headers.get("X-CSRF-Token")
    if raw:
      return rawb, csrf
    return (json.loads(rawb) if rawb else None), csrf

_, csrf = req("GET", "/api/stacks/15")
H = {"X-CSRF-Token": csrf} if csrf else {}

def docker(method, path, data=None, raw=False):
  return req(method, f"/api/endpoints/{ep}/docker{path}", data=data, headers=H, raw=raw)

cons, _ = docker("GET", "/containers/json?all=true")
app = None
for c in cons or []:
  for n in c.get("Names") or []:
    if name in str(n):
      app = c
      break
if not app:
  print("kein Container", file=sys.stderr)
  sys.exit(1)

def run(shell):
  ex, _ = docker(
    "POST",
    f"/containers/{app['Id']}/exec",
    {"AttachStdout": True, "AttachStderr": True, "Cmd": ["/bin/sh", "-c", shell]},
  )
  docker("POST", f"/exec/{ex['Id']}/start", {"Detach": False, "Tty": False}, raw=True)

tok_b64 = base64.b64encode(token.encode()).decode()
run(
  f"printf %s {json.dumps(tok_b64)} | base64 -d > /app/server/data/.jm-github-token "
  f"&& chmod 600 /app/server/data/.jm-github-token "
  f"&& test -s /app/server/data/.jm-github-token && echo OK"
)
print("Token liegt auf dem Schul-Volume.")
PY
