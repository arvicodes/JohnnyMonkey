#!/usr/bin/env bash
# Bidirektionaler Sync Mac ↔ Schulserver mit Sicherungen.
#
# Bei JEDEM Sync:
#   sync-backups/local/<stamp>/   ← Kopie vom Mac-Stand
#   sync-backups/global/<stamp>/  ← Kopie vom Schul-Stand (auch auf dem Server unter /app/sync-backups/)
#
# Danach: Material mergen (neueres mtime gewinnt, bei Gleichstand Schule),
# DB: neueres mtime (bei Gleichstand Schule) plus passender Login-Pepper,
# dann denselben Stand auf beide Seiten. Pepper nie nach GitHub.
#
# Voraussetzung: VPN/LAN, .env.school mit Portainer-Passwort
# Usage:
#   ./scripts/school-sync.sh
#   ./scripts/school-sync.sh --check

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help)
      sed -n '1,25p' "$0"
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
KEEP_BACKUPS="${SCHOOL_SYNC_KEEP:-12}"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

portainer_up() {
  curl -sk -m 5 -o /dev/null -w '%{http_code}' "$PORTAINER_URL/" | grep -qE '200|301|302'
}

if ! portainer_up; then
  log "Schulserver/Portainer nicht erreichbar ($PORTAINER_URL) — Sync übersprungen (VPN?)."
  exit 0
fi

if [[ "$CHECK_ONLY" == 1 ]]; then
  log "Portainer erreichbar: $PORTAINER_URL"
  exit 0
fi

[[ -n "$PORTAINER_PASSWORD" ]] || die "SCHOOL_PORTAINER_PASSWORD fehlt (.env.school)."
[[ "$PORTAINER_PASSWORD" != "DEIN_PASSWORT_HIER" ]] || die "Portainer-Passwort in .env.school noch Platzhalter — bitte echtes Passwort setzen."

TOKEN="$(
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
    | awk -F= '/^password=/{print $2; exit}'
)"
[[ -n "$TOKEN" ]] || die "Kein GitHub-Token (git credential fill)."

STAMP="$(date +%Y-%m-%d_%H%M%S)"
LOCAL_BAK="$ROOT/sync-backups/local/$STAMP"
GLOBAL_BAK="$ROOT/sync-backups/global/$STAMP"
PULL_DIR="/tmp/jm-sync-pull-$STAMP"
MERGE_JM="/tmp/jm-sync-merged-$STAMP/J-M-Reihen"
mkdir -p "$LOCAL_BAK" "$GLOBAL_BAK" "$PULL_DIR"

prune_backups() {
  local kind=$1
  local dir="$ROOT/sync-backups/$kind"
  [[ -d "$dir" ]] || return 0
  # shellcheck disable=SC2012
  ls -1d "$dir"/*/ 2>/dev/null | sort -r | tail -n +"$((KEEP_BACKUPS + 1))" | while read -r old; do
    rm -rf "$old"
  done
}

log "==> [$STAMP] Lokale Kopie (Mac)"
mkdir -p "$LOCAL_BAK"
[[ -f server/prisma/dev.db ]] || die "server/prisma/dev.db fehlt"
cp -a server/prisma/dev.db "$LOCAL_BAK/dev.db"
if [[ -f server/prisma/.login-code-pepper ]]; then
  cp -a server/prisma/.login-code-pepper "$LOCAL_BAK/.login-code-pepper"
elif [[ -f server/data/.login-code-pepper ]]; then
  cp -a server/data/.login-code-pepper "$LOCAL_BAK/.login-code-pepper"
fi
printf '%s\n' "$STAMP" >"$LOCAL_BAK/STAMP.txt"
echo "local_db $(shasum -a 256 "$LOCAL_BAK/dev.db" | awk '{print $1}')" >"$LOCAL_BAK/META.txt"
log "Lokal gesichert: $LOCAL_BAK (DB+Pepper; Folien bleiben in J-M-Reihen)"

log "==> Portainer Login"
JWT="$(
  curl -sk -X POST "$PORTAINER_URL/api/auth" \
    -H 'Content-Type: application/json' \
    -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jwt",""))'
)"
[[ -n "$JWT" ]] || die "Portainer-Login fehlgeschlagen."

export PORTAINER_URL ENDPOINT_ID JWT APP_NAME TUNNEL_NAME IMAGE DB_VOLUME \
  REPO RELEASE_ID TOKEN STAMP LOCAL_BAK GLOBAL_BAK PULL_DIR MERGE_JM ROOT

python3 <<'PY'
import json, os, sys, time, urllib.request, ssl, base64, shutil, subprocess, hashlib, sqlite3
from pathlib import Path

ctx = ssl._create_unverified_context()
base = os.environ["PORTAINER_URL"].rstrip("/")
ep = os.environ["ENDPOINT_ID"]
jwt = os.environ["JWT"]
stamp = os.environ["STAMP"]
token = os.environ["TOKEN"]
repo = os.environ["REPO"]
release_id = os.environ["RELEASE_ID"]
root = Path(os.environ["ROOT"])
global_bak = Path(os.environ["GLOBAL_BAK"])
pull_dir = Path(os.environ["PULL_DIR"])
merge_jm = Path(os.environ["MERGE_JM"])

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
  ex, _, _ = docker(
    "POST",
    f"/containers/{container_id}/exec",
    {"AttachStdout": True, "AttachStderr": True, "Cmd": ["/bin/sh", "-c", shell]},
  )
  if not ex or not ex.get("Id"):
    return f"NO_EXEC {ex}"
  rawb, _, _ = docker("POST", f"/exec/{ex['Id']}/start", {"Detach": False, "Tty": False}, raw=True)
  return decode_mux(rawb or b"")

app = find(os.environ["APP_NAME"])
if not app:
  print("no app container", file=sys.stderr)
  sys.exit(1)

print("==> Globale Kopie auf Schulserver + Pull-Paket")
# Write GH token into container (base64) for upload
tok_b64 = base64.b64encode(token.encode()).decode()
run(app["Id"], f"printf %s {json.dumps(tok_b64)} | base64 -d > /tmp/jm-gh.token && chmod 600 /tmp/jm-gh.token")

school_script = f"""
set -e
STAMP={stamp}
BAK=/app/sync-backups/$STAMP
mkdir -p "$BAK"
cp -a /app/server/data/dev.db "$BAK/dev.db" 2>/dev/null || cp -a /app/server/prisma/dev.db "$BAK/dev.db" || true
if [ -f /app/server/data/.login-code-pepper ]; then cp -a /app/server/data/.login-code-pepper "$BAK/.login-code-pepper"; fi
if [ -f /app/server/prisma/.login-code-pepper ] && [ ! -f "$BAK/.login-code-pepper" ]; then cp -a /app/server/prisma/.login-code-pepper "$BAK/.login-code-pepper"; fi
sha256sum "$BAK/dev.db" > "$BAK/META.txt" || true
ls -lh "$BAK"
# pull package for Mac
rm -rf /tmp/jm-sync-stage
mkdir -p /tmp/jm-sync-stage/J-M-Reihen
cp -a "$BAK/dev.db" /tmp/jm-sync-stage/dev.db
for p in Mathe Lehrer-Schnellnotizen Informatik; do
  if [ -d "/app/J-M-Reihen/$p" ]; then cp -a "/app/J-M-Reihen/$p" /tmp/jm-sync-stage/J-M-Reihen/; fi
done
tar -czf /tmp/jm-sync-pull.tar.gz -C /tmp/jm-sync-stage .
ls -lh /tmp/jm-sync-pull.tar.gz
# upload to GitHub release (replace old pull asset)
TOK=$(cat /tmp/jm-gh.token)
API=https://api.github.com/repos/{repo}
# delete existing jm-sync-pull.tar.gz
IDS=$(wget -qO- --header="Authorization: Bearer $TOK" --header="Accept: application/vnd.github+json" \\
  "$API/releases/tags/deploy-prebuilt" | sed -n 's/.*"id": *\\([0-9]*\\).*\\"name\": \\"jm-sync-pull.tar.gz\\".*/\\1/p')
# fallback with node if available
if command -v node >/dev/null 2>&1; then
  node -e "
  const https=require('https'); const fs=require('fs');
  const tok=fs.readFileSync('/tmp/jm-gh.token','utf8').trim();
  function req(method,url,body,ct){{
    return new Promise((resolve,reject)=>{{
      const u=new URL(url);
      const opts={{method,hostname:u.hostname,path:u.pathname+u.search,headers:{{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json','User-Agent':'jm-sync'}}}};
      if(body){{opts.headers['Content-Type']=ct||'application/octet-stream';opts.headers['Content-Length']=Buffer.byteLength(body);}}
      const r=https.request(opts,res=>{{let d=[];res.on('data',c=>d.push(c));res.on('end',()=>resolve({{status:res.statusCode,body:Buffer.concat(d)}}));}});
      r.on('error',reject); if(body)r.write(body); r.end();
    }});
  }}
  (async()=>{{
    const rel=JSON.parse((await req('GET','https://api.github.com/repos/{repo}/releases/tags/deploy-prebuilt')).body.toString());
    for (const a of (rel.assets||[])) {{
      if (a.name==='jm-sync-pull.tar.gz') {{
        await req('DELETE','https://api.github.com/repos/{repo}/releases/assets/'+a.id);
      }}
    }}
    const buf=fs.readFileSync('/tmp/jm-sync-pull.tar.gz');
    const up=await req('POST','https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name=jm-sync-pull.tar.gz',buf);
    console.log('upload', up.status, up.body.toString().slice(0,200));
  }})().catch(e=>{{console.error(e); process.exit(1);}});
  "
else
  echo "node missing — cannot upload pull asset" >&2
  exit 1
fi
echo SCHOOL_BACKUP_OK
"""
print(run(app["Id"], school_script)[:4000])

def normalize_pepper(raw: str) -> str:
  hexv = "".join((raw or "").split())
  if len(hexv) == 64 and all(c in "0123456789abcdefABCDEF" for c in hexv):
    return hexv.lower()
  return ""

def read_local_pepper() -> str:
  for p in (root / "server/prisma/.login-code-pepper", root / "server/data/.login-code-pepper"):
    if p.is_file():
      return normalize_pepper(p.read_text(encoding="utf-8"))
  return ""

def db_is_hashed(path: Path) -> bool:
  try:
    con = sqlite3.connect(str(path))
    row = con.execute("SELECT 1 FROM User WHERE loginCode LIKE 'hm1:%' LIMIT 1").fetchone()
    con.close()
    return bool(row)
  except Exception:
    return False

def write_pepper_file(path: Path, pepper: str) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(pepper + "\n", encoding="utf-8")
  try:
    os.chmod(path, 0o600)
  except Exception:
    pass

school_pepper = normalize_pepper(
  run(
    app["Id"],
    "cat /app/server/data/.login-code-pepper 2>/dev/null || cat /app/server/prisma/.login-code-pepper 2>/dev/null || true",
  )
)
print("Pepper Schule:", "vorhanden" if school_pepper else "fehlt")

print("==> Pull-Asset von GitHub laden")
# get asset id + signed URL
import urllib.request as ur

def gh(url, accept="application/vnd.github+json"):
  r = ur.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": accept, "User-Agent": "jm-sync"})
  with ur.urlopen(r, timeout=120, context=ctx) as resp:
    return resp.read(), dict(resp.headers)

raw, _ = gh(f"https://api.github.com/repos/{repo}/releases/tags/deploy-prebuilt")
rel = json.loads(raw)
asset = next((a for a in rel.get("assets", []) if a["name"] == "jm-sync-pull.tar.gz"), None)
if not asset:
  print("jm-sync-pull.tar.gz fehlt auf Release", file=sys.stderr)
  sys.exit(1)

# signed URL via redirect
req2 = ur.Request(
  f"https://api.github.com/repos/{repo}/releases/assets/{asset['id']}",
  headers={"Authorization": f"Bearer {token}", "Accept": "application/octet-stream", "User-Agent": "jm-sync"},
)
# don't follow? urllib follows
class NoRedirect(ur.HTTPRedirectHandler):
  def redirect_request(self, req, fp, code, msg, headers, newurl):
    return None

opener = ur.build_opener(ur.HTTPSHandler(context=ctx))
# manual head
import http.client
u = f"https://api.github.com/repos/{repo}/releases/assets/{asset['id']}"
# use curl via subprocess for reliability
pull_tar = pull_dir / "jm-sync-pull.tar.gz"
subprocess.check_call(
  [
    "curl", "-fsSL", "-H", f"Authorization: Bearer {token}",
    "-H", "Accept: application/octet-stream",
    "-L", "-o", str(pull_tar),
    f"https://api.github.com/repos/{repo}/releases/assets/{asset['id']}",
  ]
)
print("pull size", pull_tar.stat().st_size)
subprocess.check_call(["tar", "-xzf", str(pull_tar), "-C", str(pull_dir)])
try:
  pull_tar.unlink()
except Exception:
  pass

# global backup on Mac = school snapshot (DB + Pepper; Folien liegen auf dem Schulserver)
shutil.copy2(pull_dir / "dev.db", global_bak / "dev.db")
(global_bak / "STAMP.txt").write_text(stamp + "\n")
school_sha = hashlib.sha256((global_bak / "dev.db").read_bytes()).hexdigest()
(global_bak / "META.txt").write_text(f"school_db {school_sha}\n")
if school_pepper:
  write_pepper_file(global_bak / ".login-code-pepper", school_pepper)
print("Globale Kopie (Mac):", global_bak)

print("==> Merge Material (neueres gewinnt)")
local_jm = root / "J-M-Reihen"
school_jm = pull_dir / "J-M-Reihen"
merge_jm.parent.mkdir(parents=True, exist_ok=True)
if merge_jm.exists():
  shutil.rmtree(merge_jm)
merge_jm.mkdir(parents=True)
for part in ("Mathe", "Lehrer-Schnellnotizen", "Informatik"):
  subprocess.check_call(
    [
      sys.executable,
      str(root / "scripts/merge-school-materials.py"),
      str(local_jm / part),
      str(school_jm / part),
      str(merge_jm / part),
    ]
  )

print("==> DB wählen (neueres mtime, Gleichstand → Schule) + passender Pepper")
local_db = root / "server/prisma/dev.db"
school_db = pull_dir / "dev.db"
local_mt = local_db.stat().st_mtime
school_mt = school_db.stat().st_mtime
chosen = school_db if school_mt >= local_mt else local_db
from_school = chosen == school_db
print(f"DB pick: {'school' if from_school else 'local'} (local_mt={local_mt}, school_mt={school_mt})")
merged_db = Path(f"/tmp/jm-sync-merged-db-{stamp}.db")
shutil.copy2(chosen, merged_db)

local_pepper = read_local_pepper()
print("Pepper Laptop:", "vorhanden" if local_pepper else "fehlt")
hashed = db_is_hashed(chosen)
if from_school:
  if hashed and not school_pepper:
    print("ERROR: Schul-DB hat gehashte Login-Codes, aber keinen Pepper.", file=sys.stderr)
    sys.exit(1)
  pepper = school_pepper or local_pepper or os.urandom(32).hex()
else:
  if hashed and not local_pepper:
    print("ERROR: Laptop-DB hat gehashte Login-Codes, aber keinen Pepper.", file=sys.stderr)
    sys.exit(1)
  pepper = local_pepper or school_pepper or os.urandom(32).hex()
write_pepper_file(root / "server/prisma/.login-code-pepper", pepper)
print("Pepper für beide Seiten:", "gesetzt")

print("==> Merged Material → lokal schreiben")
for part in ("Mathe", "Lehrer-Schnellnotizen", "Informatik"):
  src = merge_jm / part
  dst = local_jm / part
  if not src.exists():
    continue
  if dst.exists():
    shutil.rmtree(dst)
  shutil.copytree(src, dst)
if chosen.resolve() != local_db.resolve():
  shutil.copy2(chosen, local_db)
shutil.copy2(merged_db, root / "backup_latest.db")
print("Lokal aktualisiert.")
shutil.rmtree(pull_dir, ignore_errors=True)
shutil.rmtree(merge_jm.parent, ignore_errors=True)

# Save chosen paths for bash push phase
Path("/tmp/jm-sync-env.sh").write_text(
  f"export JM_SYNC_MERGED_DB={merged_db}\nexport JM_SYNC_STAMP={stamp}\nexport LOGIN_PEPPER_HEX={pepper}\n"
)
print("PY_OK")
PY

# shellcheck disable=SC1091
source /tmp/jm-sync-env.sh
[[ -n "${LOGIN_PEPPER_HEX:-}" ]] || die "Login-Pepper fehlt nach dem Abgleich."

prune_backups local
prune_backups global

log "==> Merged Stand zurück auf Schule (DB + Material)"
# Pack materials from merged local
python3 "$ROOT/scripts/pack-school-materials.py" --full /tmp/jm-mat-update.tar.gz
[[ -f /tmp/jm-mat-update.tar.gz ]] || die "Material-Pack fehlgeschlagen"
cp -a server/prisma/dev.db backup_latest.db

# Upload mat + db (reuse deploy upload pattern)
gh_api() {
  curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"
}
gh_api "https://api.github.com/repos/$REPO/releases/tags/deploy-prebuilt" \
  | python3 -c '
import sys,json
r=json.load(sys.stdin)
for a in r.get("assets",[]):
  if a["name"] in ("backup_latest.db","jm-mat-update.tar.gz"):
    print(a["id"])
' > /tmp/jm_del_assets.txt
while read -r id; do
  [[ -n "$id" ]] || continue
  curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/releases/assets/$id" -o /dev/null
done < /tmp/jm_del_assets.txt

upload_asset() {
  curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/octet-stream" \
    -H "Accept: application/vnd.github+json" \
    --data-binary @"$1" \
    "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=$2" \
    | python3 -c 'import sys,json; r=json.load(sys.stdin); print(r.get("id"), r.get("name"), r.get("size"))'
}
DB_ASSET_ID="$(upload_asset "$ROOT/backup_latest.db" backup_latest.db | awk '{print $1}')"
MAT_ASSET_ID="$(upload_asset /tmp/jm-mat-update.tar.gz jm-mat-update.tar.gz | awk '{print $1}')"
[[ "$DB_ASSET_ID" =~ ^[0-9]+$ ]] || die "DB-Upload fehlgeschlagen"
[[ "$MAT_ASSET_ID" =~ ^[0-9]+$ ]] || die "Mat-Upload fehlgeschlagen"

MAT_URL="$(
  curl -sSIL -H "Authorization: Bearer $TOKEN" -H "Accept: application/octet-stream" \
    "https://api.github.com/repos/$REPO/releases/assets/$MAT_ASSET_ID" \
    | awk 'tolower($1)=="location:"{print $2}' | tr -d '\r' | tail -1
)"
DB_PUBLIC="https://github.com/$REPO/releases/download/deploy-prebuilt/backup_latest.db"
DBSHA="$(shasum -a 256 backup_latest.db | awk '{print $1}')"

export JWT MAT_URL DB_PUBLIC DBSHA STAMP LOGIN_PEPPER_HEX
# re-login JWT may still be valid; refresh
JWT="$(
  curl -sk -X POST "$PORTAINER_URL/api/auth" \
    -H 'Content-Type: application/json' \
    -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("jwt",""))'
)"
export JWT

python3 <<'PY'
import json, os, sys, time, urllib.request, urllib.error, ssl, base64

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
  ex, _, _ = docker(
    "POST",
    f"/containers/{container_id}/exec",
    {"AttachStdout": True, "AttachStderr": True, "Cmd": ["/bin/sh", "-c", shell]},
  )
  rawb, _, _ = docker("POST", f"/exec/{ex['Id']}/start", {"Detach": False, "Tty": False}, raw=True)
  return decode_mux(rawb or b"")

app = find(os.environ["APP_NAME"])
tunnel = find(os.environ["TUNNEL_NAME"])
mat_url = os.environ["MAT_URL"]
mat_b64 = base64.b64encode(mat_url.encode()).decode()
run(app["Id"], f"printf %s {json.dumps(mat_b64)} | base64 -d > /tmp/jm-mat.url")
print(run(app["Id"], " && ".join([
  "set -e",
  "cd /tmp",
  "curl -fsSL -o jm-mat-update.tar.gz \"$(cat /tmp/jm-mat.url)\"",
  "mkdir -p /app/J-M-Reihen /tmp/jm-mat-extract",
  "rm -rf /tmp/jm-mat-extract",
  "mkdir -p /tmp/jm-mat-extract",
  "tar -xzf jm-mat-update.tar.gz -C /tmp/jm-mat-extract",
  "cp -a /tmp/jm-mat-extract/J-M-Reihen/. /app/J-M-Reihen/",
  "rm -rf /tmp/jm-mat-extract jm-mat-update.tar.gz /tmp/jm-mat.url",
  "echo MAT_PUSH_OK",
])))

# DB via helper
docker_stop(app["Id"], 15)
if tunnel:
  docker_stop(tunnel["Id"], 10)
time.sleep(2)
db_url = os.environ["DB_PUBLIC"]
pepper = (os.environ.get("LOGIN_PEPPER_HEX") or "").strip()
helper_cmd = [
  "set -e",
  f"wget -q -O /data/dev.db {json.dumps(db_url)} || curl -fsSL -L -o /data/dev.db {json.dumps(db_url)}",
  "sha256sum /data/dev.db",
]
if pepper:
  helper_cmd.append(
    'if [ -n "$LOGIN_PEPPER_HEX" ]; then printf "%s" "$LOGIN_PEPPER_HEX" > /data/.login-code-pepper; chmod 600 /data/.login-code-pepper; echo PEPPER_OK; fi'
  )
helper_cmd.append("echo DB_DONE")
try:
  docker("DELETE", "/containers/jm-db-helper?force=1")
except Exception:
  pass
created, _, _ = docker("POST", "/containers/create?name=jm-db-helper", {
  "Image": os.environ["IMAGE"],
  "Entrypoint": ["/bin/sh", "-c"],
  "Env": [f"LOGIN_PEPPER_HEX={pepper}"] if pepper else [],
  "Cmd": [" && ".join(helper_cmd)],
  "HostConfig": {"Binds": [f"{os.environ['DB_VOLUME']}:/data"], "AutoRemove": True},
})
if not created or not created.get("Id"):
  print("create helper failed", created, file=sys.stderr)
  sys.exit(1)
print("Starting DB helper…")
docker("POST", f"/containers/{created['Id']}/start", {})
for _ in range(60):
  time.sleep(1)
  try:
    docker("GET", f"/containers/{created['Id']}/json", ignore_http=(404,))
  except Exception:
    break
app = find(os.environ["APP_NAME"])
tunnel = find(os.environ["TUNNEL_NAME"])
if app:
  docker_start(app["Id"])
if tunnel:
  docker_start(tunnel["Id"])
time.sleep(6)
app = find(os.environ["APP_NAME"])
verify = ""
if app:
  run(
    app["Id"],
    "cp -a /app/server/data/dev.db /app/server/prisma/dev.db && if [ -f /app/server/data/.login-code-pepper ]; then cp -a /app/server/data/.login-code-pepper /app/server/prisma/.login-code-pepper; fi && echo DB_SYNCED",
  )
  verify = run(app["Id"], "sha256sum /app/server/data/dev.db; echo SYNC_VERIFY")
print(verify)
want = os.environ.get("DBSHA", "")
if want and want not in verify:
  print("WARNING: DB SHA mismatch", want, file=sys.stderr)
print("SYNC_PUSH_OK")
PY

log "==> Sync fertig [$STAMP]"
log "Laptop und Schule haben denselben Stand (DB + Folien + Login-Pepper)."
log "Lokale Kopie:  sync-backups/local/$STAMP"
log "Globale Kopie: sync-backups/global/$STAMP  (+ auf Server /app/sync-backups/$STAMP)"
log "Hard-Reload im Schulnetz: http://192.168.8.1/"
