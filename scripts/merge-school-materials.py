#!/usr/bin/env python3
"""Merge two J-M-Reihen trees: newer mtime wins; NFC path keys; portable JSON."""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from urllib.parse import quote, unquote_plus

ROOT = Path(__file__).resolve().parents[1]
MAC_ROOT = str(ROOT) + "/"
JM_PREFIX = "J-M-Reihen/"
SKIP_DIRS = {".presentation-backups", ".git", "__pycache__", "node_modules", "sync-backups"}
SKIP_FILES = {".DS_Store"}


def nfc(p: str) -> str:
  return "/".join(unicodedata.normalize("NFC", x) for x in p.replace("\\", "/").split("/"))


def portabilize_path(fp: str) -> str:
  fp = fp.replace("\\", "/")
  if fp.startswith(MAC_ROOT):
    rest = fp[len(MAC_ROOT) :]
    if rest.startswith(JM_PREFIX):
      return nfc("git-intern/" + rest[len(JM_PREFIX) :])
    return nfc(rest)
  if fp.startswith(JM_PREFIX):
    return nfc("git-intern/" + fp[len(JM_PREFIX) :])
  if fp.startswith("git-intern/"):
    return nfc(fp)
  return nfc(fp)


def portabilize(s: str) -> str:
  if not s:
    return s

  def repl(m: re.Match) -> str:
    fp = unquote_plus(m.group(1))
    return f"/api/file-system-paths/read-image?filePath={quote(portabilize_path(fp), safe='/')}&max=960"

  s2 = re.sub(
    r"(?:https?://127\.0\.0\.1:\d+)?/api/file-system-paths/read-image\?filePath=([^\"&\s]+)(?:&amp;|&)max=960",
    repl,
    s,
  )
  if s2.startswith(MAC_ROOT) or s2.startswith("/Users/"):
    return portabilize_path(s2)
  if MAC_ROOT in s2:
    s2 = s2.replace(MAC_ROOT + JM_PREFIX, "git-intern/").replace(MAC_ROOT, "")
  if s2.startswith("git-intern/") or s2.startswith(JM_PREFIX):
    return portabilize_path(s2)
  return s2


def walk_port(obj):
  if isinstance(obj, dict):
    return {k: walk_port(v) for k, v in obj.items()}
  if isinstance(obj, list):
    return [walk_port(x) for x in obj]
  if isinstance(obj, str):
    return portabilize(obj)
  return obj


def write_json_ported(src: Path, dest: Path) -> None:
  dest.parent.mkdir(parents=True, exist_ok=True)
  try:
    data = walk_port(json.loads(src.read_text(encoding="utf-8")))
    if isinstance(data, dict) and isinstance(data.get("lessonPath"), str):
      data["lessonPath"] = portabilize_path(data["lessonPath"])
    dest.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
  except Exception:
    shutil.copy2(src, dest)


def iter_files(root: Path):
  if not root.exists():
    return
  for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith("._")]
    for name in filenames:
      if name.startswith("._") or name in SKIP_FILES:
        continue
      p = Path(dirpath) / name
      if p.is_file():
        yield p


def rel_nfc(root: Path, file: Path) -> Path:
  rel = file.relative_to(root)
  return Path(*[unicodedata.normalize("NFC", x) for x in rel.parts])


def merge_trees(local_root: Path, school_root: Path, out_root: Path) -> dict:
  """Merge into out_root. Returns stats."""
  if out_root.exists():
    shutil.rmtree(out_root)
  out_root.mkdir(parents=True, exist_ok=True)

  # map rel -> (path, mtime, source)
  best: dict[str, tuple[Path, float, str]] = {}

  for src_root, label in ((local_root, "local"), (school_root, "school")):
    if not src_root.exists():
      continue
    for f in iter_files(src_root):
      key = str(rel_nfc(src_root, f))
      mtime = f.stat().st_mtime
      prev = best.get(key)
      if prev is None or mtime >= prev[1]:
        # tie → prefer school (online edits)
        if prev is not None and mtime == prev[1] and label != "school":
          continue
        best[key] = (f, mtime, label)

  stats = {"files": 0, "from_local": 0, "from_school": 0}
  for key, (src, _mt, label) in best.items():
    dest = out_root / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.suffix == ".json":
      write_json_ported(src, dest)
    else:
      shutil.copy2(src, dest)
    stats["files"] += 1
    stats["from_local" if label == "local" else "from_school"] += 1
  return stats


def main() -> int:
  if len(sys.argv) < 4:
    print("Usage: merge-school-materials.py <local_jm> <school_jm> <out_jm>", file=sys.stderr)
    return 2
  local, school, out = map(Path, sys.argv[1:4])
  stats = merge_trees(local, school, out)
  print(json.dumps(stats))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
