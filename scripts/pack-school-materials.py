#!/usr/bin/env python3
"""Pack J-M-Reihen lessons for school deploy (NFC paths + portable deck URLs).

Modes:
  (default)  only lesson folders with git dirty/untracked files
  --full     entire Mathe tree + Lehrer-Schnellnotizen (recommended for school sync)
  --all      entire J-M-Reihen (large; use only when needed)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unicodedata
from pathlib import Path
from urllib.parse import quote, unquote_plus

ROOT = Path(__file__).resolve().parents[1]
JM = ROOT / "J-M-Reihen"
MAC_ROOT = str(ROOT) + "/"
JM_PREFIX = "J-M-Reihen/"

SKIP_DIR_NAMES = {".presentation-backups", ".git", "__pycache__", "node_modules"}
SKIP_FILE_NAMES = {".DS_Store"}


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
    fp2 = portabilize_path(fp)
    return f"/api/file-system-paths/read-image?filePath={quote(fp2, safe='/')}&max=960"

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


def changed_lesson_dirs() -> set[Path]:
  """Lesson folders that contain modified/untracked files under J-M-Reihen."""
  out = subprocess.check_output(
    ["git", "status", "--porcelain", "-u", "--", "J-M-Reihen"],
    cwd=ROOT,
    text=True,
  )
  lessons: set[Path] = set()
  for line in out.splitlines():
    if len(line) < 4:
      continue
    path = line[3:].strip().strip('"')
    if " -> " in path:
      path = path.split(" -> ", 1)[1]
    if path.startswith("J-M-Reihen/J-M-Reihen/"):
      continue
    if not path.startswith("J-M-Reihen/"):
      continue
    p = ROOT / path
    cur = p if p.is_dir() else p.parent
    for _ in range(6):
      if (cur / "Praesentation.deck.json").exists() or list(cur.glob("Praesentation*.pdf")):
        lessons.add(cur)
        break
      if cur == JM or cur == ROOT:
        break
      cur = cur.parent
  return lessons


def should_skip_file(name: str) -> bool:
  return name.startswith("._") or name in SKIP_FILE_NAMES


def copy_file_ported(src: Path, target: Path) -> None:
  target.parent.mkdir(parents=True, exist_ok=True)
  if src.suffix == ".json":
    try:
      data = walk_port(json.loads(src.read_text(encoding="utf-8")))
    except Exception:
      shutil.copy2(src, target)
      return
    if isinstance(data, dict) and "lessonPath" in data and isinstance(data["lessonPath"], str):
      data["lessonPath"] = portabilize_path(data["lessonPath"])
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
  else:
    shutil.copy2(src, target)


def copy_tree(src: Path, dst: Path) -> int:
  """Recursive copy with NFC names + JSON portabilize. Returns file count."""
  n = 0
  if not src.exists():
    return 0
  for dirpath, dirnames, filenames in os.walk(src):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES and not d.startswith("._")]
    rel = Path(dirpath).relative_to(src)
    out_dir = dst / Path(*[unicodedata.normalize("NFC", x) for x in rel.parts]) if rel.parts else dst
    out_dir.mkdir(parents=True, exist_ok=True)
    for name in filenames:
      if should_skip_file(name):
        continue
      src_f = Path(dirpath) / name
      if not src_f.is_file():
        continue
      dst_f = out_dir / unicodedata.normalize("NFC", name)
      copy_file_ported(src_f, dst_f)
      n += 1
  return n


def copy_lesson(src: Path, dst: Path) -> int:
  """Flat lesson copy (legacy). Prefer copy_tree for full sync."""
  return copy_tree(src, dst)


def stage_paths(mode: str) -> list[tuple[Path, Path]]:
  """Return list of (src, relative-to-JM) to pack."""
  if mode == "all":
    return [(JM, Path("."))]
  if mode == "full":
    # Unterrichtsordner (ohne die sehr großen Archive Erasmus/Wall-of-fame/Zwischenspeicher)
    items: list[tuple[Path, Path]] = []
    for name in (
      "Mathe",
      "Informatik",
      "Lehrer-Schnellnotizen",
      "Mini-Projekte",
      "Grafiken",
      "Ankündigungen & Briefe",
      "Folien - ALLE - BACKUP",
    ):
      src = JM / name
      if src.exists():
        items.append((src, Path(name)))
    return items
  # default: dirty lessons only
  return [(lesson, lesson.relative_to(JM)) for lesson in sorted(changed_lesson_dirs())]


def main() -> int:
  args = [a for a in sys.argv[1:] if a]
  mode = "dirty"
  out = Path("/tmp/jm-mat-update.tar.gz")
  for a in args:
    if a in ("--full", "--all", "--dirty"):
      mode = a.lstrip("-")
    elif not a.startswith("-"):
      out = Path(a)

  pairs = stage_paths(mode)
  if not pairs:
    print("no lesson changes" if mode == "dirty" else "nothing to pack")
    if out.exists():
      out.unlink()
    return 0

  with tempfile.TemporaryDirectory() as td:
    stage = Path(td) / "J-M-Reihen"
    total = 0
    for src, rel in pairs:
      try:
        if rel == Path("."):
          rel_nfc = Path(".")
          dest = stage
        else:
          rel_nfc = Path(*[unicodedata.normalize("NFC", x) for x in rel.parts])
          dest = stage / rel_nfc
        print("pack", rel_nfc if rel != Path(".") else "J-M-Reihen")
        total += copy_tree(src, dest)
      except ValueError:
        continue
    if total == 0:
      print("empty stage")
      return 0
    out.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(out, "w:gz", format=tarfile.PAX_FORMAT) as tar:
      tar.add(stage, arcname="J-M-Reihen")
  print("files", total)
  print("wrote", out, out.stat().st_size)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
