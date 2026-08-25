#!/usr/bin/env bash
# JohnnyMonkey → Schulserver (Portainer) Hot-Deploy
# Baut App, lädt App+DB(+Material) nach GitHub Release deploy-prebuilt,
# spielt sie per Portainer API in johnnymonkey-app ein.
#
# Voraussetzung: VPN/LAN → https://192.168.8.1:9443 erreichbar
# Credentials: .env.school im Repo-Root (siehe .env.school.example)
#
# Usage:
#   ./scripts/school-deploy.sh              # app + db + materials
#   ./scripts/school-deploy.sh --skip-mat    # nur app + db
#   ./scripts/school-deploy.sh --check       # nur Erreichbarkeit

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_MAT=0
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --skip-mat) SKIP_MAT=1 ;;
    --check) CHECK_ONLY=1 ;;
    -h|--help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
  esac
done

# shellcheck disable=SC1091
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
IMAGE="${SCHOOL_HELPER_IMAGE:-johnnymonkey-johnnymonkey:latest}"
DB_VOLUME="${SCHOOL_DB_VOLUME:-johnnymonkey_database}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

portainer_up() {
  curl -sk -m 5 -o /dev/null -w '%{http_code}' "$PORTAINER_URL/" | grep -qE '200|301|302'
}

if ! portainer_up; then
  log "Schulserver/Portainer nicht erreichbar ($PORTAINER_URL) — Deploy übersprungen (VPN?)."
  exit 0
fi

if [[ "$CHECK_ONLY" == 1 ]]; then
  log "Portainer erreichbar: $PORTAINER_URL"
  exit 0
fi

[[ -n "$PORTAINER_PASSWORD" ]] || die "SCHOOL_PORTAINER_PASSWORD fehlt (Datei .env.school anlegen)."

TOKEN="$(
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
    | awk -F= '/^password=/{print $2; exit}'
)"
[[ -n "$TOKEN" ]] || die "Kein GitHub-Token (git credential fill)."

log "==> Build Server + Client"
(cd server && npx tsc --pretty false)
(cd client && NODE_OPTIONS=--max_old_space_size=4096 CI=false GENERATE_SOURCEMAP=false npm run build)

[[ -f server/prisma/dev.db ]] || die "server/prisma/dev.db fehlt"
cp server/prisma/dev.db backup_latest.db
DBSHA="$(shasum -a 256 backup_latest.db | awk '{print $1}')"
BUNDLE="$(ls client/build/static/js/main.*.js 2>/dev/null | head -1 | xargs -n1 basename)"
[[ -n "$BUNDLE" ]] || die "Client-Build ohne main.*.js"
log "Bundle=$BUNDLE DBSHA=$DBSHA"

log "==> Pack App"
rm -rf /tmp/jm-prebuilt-stage
mkdir -p /tmp/jm-prebuilt-stage/server/client-build
cp -R server/dist /tmp/jm-prebuilt-stage/server/
cp -R client/build/* /tmp/jm-prebuilt-stage/server/client-build/
# SuS-Fotos (DB hat nur URLs; Dateien liegen unter uploads/avatars)
if [[ -d server/uploads/avatars ]]; then
  mkdir -p /tmp/jm-prebuilt-stage/server/uploads/avatars
  find server/uploads/avatars -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' \) ! -name '._*' \
    -exec cp -a {} /tmp/jm-prebuilt-stage/server/uploads/avatars/ \;
  log "Avatars: $(find /tmp/jm-prebuilt-stage/server/uploads/avatars -type f | wc -l | tr -d ' ') Dateien"
fi
rm -f /tmp/jm-app-prebuilt.tar.gz
tar -czf /tmp/jm-app-prebuilt.tar.gz -C /tmp/jm-prebuilt-stage .

MAT_TAR=""
if [[ "$SKIP_MAT" != 1 ]]; then
  log "==> Pack Material (Mathe + Lehrer-Schnellnotizen, --full)"
  # Always pack full Mathe tree: git-dirty-only missed committed Reihen/Notizen on main.
  python3 "$ROOT/scripts/pack-school-materials.py" --full /tmp/jm-mat-update.tar.gz || true
  if [[ -f /tmp/jm-mat-update.tar.gz ]] && [[ -s /tmp/jm-mat-update.tar.gz ]]; then
    MAT_TAR=/tmp/jm-mat-update.tar.gz
    log "Material-Tar: $(ls -lh "$MAT_TAR" | awk '{print $5}')"
  else
    log "Kein Material-Update."
  fi
fi

gh_api() {
  curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"
}

log "==> Upload Release assets ($REPO / deploy-prebuilt)"
HAS_MAT=0
[[ -n "$MAT_TAR" ]] && HAS_MAT=1
export HAS_MAT
# delete old
gh_api "https://api.github.com/repos/$REPO/releases/tags/deploy-prebuilt" \
  | python3 -c '
import sys,json,os
r=json.load(sys.stdin)
names={"jm-app-prebuilt.tar.gz","backup_latest.db"}
if os.environ.get("HAS_MAT")=="1":
  names.add("jm-mat-update.tar.gz")
for a in r.get("assets",[]):
  if a["name"] in names:
    print(a["id"])
' > /tmp/jm_del_assets.txt
while read -r id; do
  [[ -n "$id" ]] || continue
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/releases/assets/$id" -o /dev/null -w "delete $id:%{http_code}\n"
done < /tmp/jm_del_assets.txt

upload_asset() {
  local file=$1 name=$2
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/octet-stream" \
    -H "Accept: application/vnd.github+json" \
    --data-binary @"$file" \
    "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=$name" \
    | python3 -c 'import sys,json; r=json.load(sys.stdin); print(r.get("id"), r.get("name"), r.get("size"), r.get("message",""))'
}

APP_ASSET_ID="$(upload_asset /tmp/jm-app-prebuilt.tar.gz jm-app-prebuilt.tar.gz | awk '{print $1}')"
DB_ASSET_ID="$(upload_asset "$ROOT/backup_latest.db" backup_latest.db | awk '{print $1}')"
MAT_ASSET_ID=""
if [[ -n "$MAT_TAR" ]]; then
  MAT_ASSET_ID="$(upload_asset "$MAT_TAR" jm-mat-update.tar.gz | awk '{print $1}')"
fi
[[ "$APP_ASSET_ID" =~ ^[0-9]+$ ]] || die "App-Upload fehlgeschlagen"
[[ "$DB_ASSET_ID" =~ ^[0-9]+$ ]] || die "DB-Upload fehlgeschlagen"

signed_url() {
  local asset_id=$1
  curl -sSIL -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
    "https://api.github.com/repos/$REPO/releases/assets/$asset_id" \
    | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r' | tail -1
}

APP_URL="$(signed_url "$APP_ASSET_ID")"
MAT_URL=""
[[ -n "$MAT_ASSET_ID" ]] && MAT_URL="$(signed_url "$MAT_ASSET_ID")"
DB_PUBLIC="https://github.com/$REPO/releases/download/deploy-prebuilt/backup_latest.db"
[[ "$APP_URL" == https://* ]] || die "Keine signed URL für App"

log "==> Portainer Login"
JWT="$(
  curl -sk -X POST "$PORTAINER_URL/api/auth" \
    -H 'Content-Type: application/json' \
    -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jwt",""))'
)"
[[ -n "$JWT" ]] || die "Portainer-Login fehlgeschlagen (Passwort in .env.school prüfen)."

# CSRF + helpers via python for reliability
export PORTAINER_URL ENDPOINT_ID JWT APP_NAME TUNNEL_NAME IMAGE DB_VOLUME APP_URL MAT_URL DB_PUBLIC DBSHA BUNDLE
python3 <<'PY'
import json, os, sys, time, urllib.request, ssl, base64

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
  with urllib.request.urlopen(r, context=ctx, timeout=120) as resp:
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

# bootstrap CSRF
_, csrf, _ = req("GET", f"/api/stacks/15")
H = {"X-CSRF-Token": csrf} if csrf else {}

def docker(method, path, data=None, raw=False):
  return req(method, f"/api/endpoints/{ep}/docker{path}", data=data, headers=H, raw=raw)

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
  u8 = buf
  out = bytearray()
  i = 0
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
  ex, _, _ = docker(
    "POST",
    f"/containers/{container_id}/exec",
    {
      "AttachStdout": True,
      "AttachStderr": True,
      "Cmd": ["/bin/sh", "-c", shell],
    },
  )
  if not ex or not ex.get("Id"):
    return f"NO_EXEC {ex}"
  rawb, _, _ = docker(
    "POST",
    f"/exec/{ex['Id']}/start",
    {"Detach": False, "Tty": False},
    raw=True,
  )
  return decode_mux(rawb or b"")

app = find(os.environ["APP_NAME"])
tunnel = find(os.environ["TUNNEL_NAME"])
if not app:
  print("no app container", file=sys.stderr)
  sys.exit(1)

app_url = os.environ["APP_URL"]
mat_url = os.environ.get("MAT_URL") or ""
parts = [
  "set -e",
  "cd /tmp",
  "rm -f jm-app-prebuilt.tar.gz jm-mat-update.tar.gz",
  f"curl -fsSL -o jm-app-prebuilt.tar.gz {json.dumps(app_url)}",
  "ls -lh jm-app-prebuilt.tar.gz",
  "tar -xzf jm-app-prebuilt.tar.gz -C /app",
  "rm -f /app/server/client-build/static/js/main.*.js.map || true",
  # keep only newest main if multiple: leave all; index.html points to correct one
  "ls /app/server/client-build/static/js/main.*.js",
  f"grep -oE 'main\\\\.[a-z0-9]+\\\\.js' /app/server/client-build/index.html | head -2",
]
if mat_url:
  parts += [
    f"curl -fsSL -o jm-mat-update.tar.gz {json.dumps(mat_url)}",
    "mkdir -p /app/J-M-Reihen /tmp/jm-mat-extract",
    "rm -rf /tmp/jm-mat-extract/*",
    "tar -xzf jm-mat-update.tar.gz -C /tmp/jm-mat-extract",
    # copy tree
    "cp -a /tmp/jm-mat-extract/J-M-Reihen/. /app/J-M-Reihen/ 2>/dev/null || tar -xzf jm-mat-update.tar.gz -C /app/J-M-Reihen",
    # sync lesson folders named identically under Klasse 5 (NFC/NFD)
    'find /tmp/jm-mat-extract -type d -name "1.2 Große Zahlen - Stellenwerttafel" -print0 2>/dev/null | while IFS= read -r -d "" SRC; do find "/app/J-M-Reihen/Mathe/Klasse 5" -type d -name "1.2 Große Zahlen - Stellenwerttafel" -print0 2>/dev/null | while IFS= read -r -d "" d; do cp -a "$SRC"/. "$d"/; done; done || true',
    "rm -rf /tmp/jm-mat-extract jm-mat-update.tar.gz",
    "echo MAT_OK",
  ]
parts += ["rm -f jm-app-prebuilt.tar.gz", "echo INSTALL_DONE"]
print("Installing into app…")
print(run(app["Id"], " && ".join(parts))[:3000])

# stop for DB
print("Stopping app/tunnel…")
docker("POST", f"/containers/{app['Id']}/stop?t=15")
if tunnel:
  docker("POST", f"/containers/{tunnel['Id']}/stop?t=10")
time.sleep(2)

db_url = os.environ["DB_PUBLIC"]
create_body = {
  "Image": os.environ["IMAGE"],
  "Entrypoint": ["/bin/sh", "-c"],
  "Cmd": [
    " && ".join(
      [
        "set -e",
        f"wget -q -O /data/dev.db {json.dumps(db_url)} || curl -fsSL -L -o /data/dev.db {json.dumps(db_url)}",
        "ls -lh /data/dev.db",
        "sha256sum /data/dev.db",
        "echo DB_DONE",
      ]
    )
  ],
  "HostConfig": {"Binds": [f"{os.environ['DB_VOLUME']}:/data"], "AutoRemove": True},
}
# remove leftover helper name
try:
  docker("DELETE", "/containers/jm-db-helper?force=1")
except Exception:
  pass
created, _, st = docker("POST", "/containers/create?name=jm-db-helper", create_body)
if not created or not created.get("Id"):
  print("create helper failed", created, file=sys.stderr)
  sys.exit(1)
docker("POST", f"/containers/{created['Id']}/start")
for _ in range(45):
  time.sleep(1)
  try:
    docker("GET", f"/containers/{created['Id']}/json")
  except Exception:
    break

# start again
app = find(os.environ["APP_NAME"])
tunnel = find(os.environ["TUNNEL_NAME"])
if app:
  docker("POST", f"/containers/{app['Id']}/start")
if tunnel:
  docker("POST", f"/containers/{tunnel['Id']}/start")
time.sleep(7)

app = find(os.environ["APP_NAME"])
tunnel = find(os.environ["TUNNEL_NAME"])
verify = ""
if app and app.get("State") == "running":
  # Prisma liest ggf. noch prisma/dev.db — Volume-DB dorthin spiegeln
  run(
    app["Id"],
    "cp -a /app/server/data/dev.db /app/server/prisma/dev.db && echo DB_SYNCED",
  )
  verify = run(
    app["Id"],
    "ls /app/server/client-build/static/js/main.*.js; sha256sum /app/server/data/dev.db /app/server/prisma/dev.db; echo VERIFY_OK",
  )
tunnel_url = ""
if tunnel:
  rawb, _, _ = docker(
    "GET",
    f"/containers/{tunnel['Id']}/logs?stdout=true&stderr=true&timestamps=false&tail=80",
    raw=True,
  )
  text = decode_mux(rawb or b"")
  import re

  m = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", text)
  tunnel_url = m[-1] if m else ""

print("VERIFY:\n", verify[:1500])
want = os.environ.get("DBSHA", "")
if want and want not in verify:
  print("WARNING: DB SHA mismatch — expected", want, file=sys.stderr)
print("BUNDLE_EXPECT", os.environ.get("BUNDLE"))
print("TUNNEL", tunnel_url or "(none)")
print("DEPLOY_OK")
PY

log "==> Fertig. Hard-Reload auf dem Gerät."
log "Erwartetes Bundle: $BUNDLE"
log "Erwartete DB: $DBSHA"
