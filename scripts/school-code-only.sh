#!/usr/bin/env bash
# Nur App-Code auf die Schule (kein DB-Tausch, kein Material-Merge).
# Voraussetzung: server/dist und client/build sind gebaut; VPN; .env.school

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
RELEASE_ID="${SCHOOL_GITHUB_RELEASE_ID:-367889372}"
REPO="${SCHOOL_GITHUB_REPO:-arvicodes/JohnnyMonkey}"
APP_NAME="${SCHOOL_APP_CONTAINER:-johnnymonkey-app}"
TUNNEL_NAME="${SCHOOL_TUNNEL_CONTAINER:-johnnymonkey-tunnel}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[[ -d server/dist ]] || die "server/dist fehlt — zuerst tsc."
[[ -d client/build ]] || die "client/build fehlt — zuerst npm run build im client."
curl -sk -m 5 -o /dev/null "$PORTAINER_URL/" || die "Portainer nicht erreichbar (VPN?)."
[[ -n "$PORTAINER_PASSWORD" ]] || die "SCHOOL_PORTAINER_PASSWORD fehlt."

TOKEN="$(
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
    | awk -F= '/^password=/{print $2; exit}'
)"
[[ -n "$TOKEN" ]] || die "Kein GitHub-Token."

log "==> Pack App (ohne DB)"
rm -rf /tmp/jm-prebuilt-stage
mkdir -p /tmp/jm-prebuilt-stage/server/client-build /tmp/jm-prebuilt-stage/server/prisma
cp -R server/dist /tmp/jm-prebuilt-stage/server/
cp -R client/build/* /tmp/jm-prebuilt-stage/server/client-build/
cp server/prisma/schema.prisma /tmp/jm-prebuilt-stage/server/prisma/
[[ -f server/prisma/schema.sqlite.prisma ]] && cp server/prisma/schema.sqlite.prisma /tmp/jm-prebuilt-stage/server/prisma/
cp "$ROOT/docker-start.sh" /tmp/jm-prebuilt-stage/docker-start.sh
rm -f /tmp/jm-app-prebuilt.tar.gz
tar -czf /tmp/jm-app-prebuilt.tar.gz -C /tmp/jm-prebuilt-stage .
log "Tar: $(ls -lh /tmp/jm-app-prebuilt.tar.gz | awk '{print $5}')"

gh_api() {
  curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"
}

log "==> Upload nur jm-app-prebuilt.tar.gz"
gh_api "https://api.github.com/repos/$REPO/releases/tags/deploy-prebuilt" \
  | python3 -c '
import sys,json
r=json.load(sys.stdin)
for a in r.get("assets",[]):
  if a["name"]=="jm-app-prebuilt.tar.gz":
    print(a["id"])
' > /tmp/jm_del_app.txt
while read -r id; do
  [[ -n "$id" ]] || continue
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/releases/assets/$id" -o /dev/null
done < /tmp/jm_del_app.txt

APP_ASSET_ID="$(
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/octet-stream" \
    -H "Accept: application/vnd.github+json" \
    --data-binary @/tmp/jm-app-prebuilt.tar.gz \
    "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=jm-app-prebuilt.tar.gz" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("id",""))'
)"
[[ "$APP_ASSET_ID" =~ ^[0-9]+$ ]] || die "App-Upload fehlgeschlagen"

APP_URL="$(
  curl -sSIL -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
    "https://api.github.com/repos/$REPO/releases/assets/$APP_ASSET_ID" \
    | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r' | tail -1
)"
[[ "$APP_URL" == https://* ]] || die "Keine signed URL"

JWT="$(
  curl -sk -X POST "$PORTAINER_URL/api/auth" \
    -H 'Content-Type: application/json' \
    -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jwt",""))'
)"
[[ -n "$JWT" ]] || die "Portainer-Login fehlgeschlagen."

export PORTAINER_URL ENDPOINT_ID JWT APP_NAME TUNNEL_NAME APP_URL
python3 <<'PY'
import json, os, sys, time, urllib.request, urllib.error, ssl

ctx = ssl._create_unverified_context()
base = os.environ["PORTAINER_URL"].rstrip("/")
ep = os.environ["ENDPOINT_ID"]
jwt = os.environ["JWT"]

def req(method, path, data=None, headers=None, raw=False):
  h = {"Authorization": f"Bearer {jwt}"}
  if headers:
    h.update(headers)
  body = None
  if data is not None:
    body = json.dumps(data).encode()
    h["Content-Type"] = "application/json"
  r = urllib.request.Request(base + path, data=body, headers=h, method=method)
  with urllib.request.urlopen(r, context=ctx, timeout=300) as resp:
    rawb = resp.read()
    csrf = resp.headers.get("X-CSRF-Token")
    if raw:
      return rawb, csrf, resp.status
    if not rawb:
      return None, csrf, resp.status
    try:
      return json.loads(rawb), csrf, resp.status
    except Exception:
      return rawb, csrf, resp.status

_, csrf, _ = req("GET", "/api/stacks/15")
H = {"X-CSRF-Token": csrf} if csrf else {}

def docker(method, path, data=None, raw=False, ignore_http=()):
  try:
    return req(method, f"/api/endpoints/{ep}/docker{path}", data=data, headers=H, raw=raw)
  except urllib.error.HTTPError as e:
    if e.code in ignore_http:
      return None, None, e.code
    raise

def docker_stop(container_id, timeout=15):
  docker("POST", f"/containers/{container_id}/stop", {"t": timeout}, ignore_http=(304, 400, 404, 409))

def docker_start(container_id):
  docker("POST", f"/containers/{container_id}/start", {}, ignore_http=(304, 400, 404, 409))

def containers():
  data, _, _ = docker("GET", "/containers/json?all=true")
  return data or []

def find(name_part):
  for c in containers():
    for n in c.get("Names") or []:
      if name_part in str(n):
        return c
  return None

def decode_mux(buf: bytes) -> str:
  out = bytearray()
  i = 0
  u8 = buf
  while i < len(u8):
    if i + 8 <= len(u8) and u8[i] in (1, 2) and u8[i + 1] == 0:
      size = (u8[i + 4] << 24) | (u8[i + 5] << 16) | (u8[i + 6] << 8) | u8[i + 7]
      i += 8
      out += u8[i : i + size]
      i += size
    else:
      out += u8[i:]
      break
  return out.decode("utf-8", errors="replace")

def run(container_id, shell):
  docker_start(container_id)
  last_err = None
  for attempt in range(5):
    try:
      ex, _, _ = docker(
        "POST",
        f"/containers/{container_id}/exec",
        {"AttachStdout": True, "AttachStderr": True, "Cmd": ["/bin/sh", "-c", shell]},
      )
      if not ex or not ex.get("Id"):
        last_err = f"NO_EXEC {ex}"
        time.sleep(2)
        docker_start(container_id)
        continue
      rawb, _, _ = docker("POST", f"/exec/{ex['Id']}/start", {"Detach": False, "Tty": False}, raw=True)
      return decode_mux(rawb or b"")
    except urllib.error.HTTPError as e:
      last_err = e
      if e.code not in (409, 404, 500) or attempt == 4:
        raise
      time.sleep(2)
      docker_start(container_id)
  return f"NO_EXEC {last_err}"

app = find(os.environ["APP_NAME"])
if not app:
  print("kein Container", file=sys.stderr)
  sys.exit(1)

app_url = os.environ["APP_URL"]
print("Installing code…")
print(run(app["Id"], " && ".join([
  "set -e",
  "cd /tmp",
  "rm -f jm-app-prebuilt.tar.gz",
  f"curl -fsSL -o jm-app-prebuilt.tar.gz {json.dumps(app_url)}",
  "tar -xzf jm-app-prebuilt.tar.gz -C /app",
  "rm -f /app/server/client-build/static/js/main.*.js.map || true",
  "chmod +x /app/docker-start.sh 2>/dev/null || true",
  "grep -q LessonExamBeacon /app/server/prisma/schema.prisma",
  "rm -f jm-app-prebuilt.tar.gz",
  "echo INSTALL_DONE",
]))[:2000])

tunnel = find(os.environ.get("TUNNEL_NAME") or "")
print("Restart app (DB bleibt)…")
docker_stop(app["Id"], 15)
if tunnel:
  docker_stop(tunnel["Id"], 10)
time.sleep(2)
app = find(os.environ["APP_NAME"])
tunnel = find(os.environ.get("TUNNEL_NAME") or "")
if app:
  docker_start(app["Id"])
if tunnel:
  docker_start(tunnel["Id"])
time.sleep(8)
app = find(os.environ["APP_NAME"])
if app:
  print(run(app["Id"], " && ".join([
    "ls /app/server/client-build/static/js/main.*.js",
    "grep -q LessonExamBeacon /app/server/prisma/schema.prisma && echo SCHEMA_HAS_EXAM_BEACON",
    "cd /app/server && node -e \"const {PrismaClient}=require('@prisma/client'); console.log('PRISMA_EXAM', typeof new PrismaClient().lessonExamBeacon)\"",
    "echo CODE_OK",
  ]))[:2000])
print("CODE_ONLY_OK")
PY
