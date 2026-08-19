#!/usr/bin/env python3
"""Pack changed J-M-Reihen lessons for school deploy (NFC paths + portable deck URLs)."""
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
    # climb to a folder that looks like a lesson (has Praesentation.deck.json nearby or is deep enough)
    cur = p if p.is_dir() else p.parent
    for _ in range(6):
      if (cur / "Praesentation.deck.json").exists() or list(cur.glob("Praesentation*.pdf")):
        lessons.add(cur)
        break
      if cur == JM or cur == ROOT:
        break
      cur = cur.parent
  return lessons


def copy_lesson(src: Path, dst: Path) -> None:
  dst.mkdir(parents=True, exist_ok=True)
  for item in src.iterdir():
    name = item.name
    if name.startswith("._") or name in (".DS_Store", ".presentation-backups"):
      continue
    if item.is_dir():
      continue  # only flat lesson files; nested handled separately if needed
    target = dst / unicodedata.normalize("NFC", name)
    if item.suffix == ".json":
      try:
        data = walk_port(json.loads(item.read_text(encoding="utf-8")))
      except Exception:
        shutil.copy2(item, target)
        continue
      if isinstance(data, dict) and "lessonPath" in data and isinstance(data["lessonPath"], str):
        data["lessonPath"] = portabilize_path(data["lessonPath"])
      target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
      shutil.copy2(item, target)


def main() -> int:
  out = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/jm-mat-update.tar.gz")
  lessons = changed_lesson_dirs()
  if not lessons:
    print("no lesson changes")
    if out.exists():
      out.unlink()
    return 0

  with tempfile.TemporaryDirectory() as td:
    stage = Path(td) / "J-M-Reihen"
    for lesson in sorted(lessons):
      try:
        rel = lesson.relative_to(JM)
      except ValueError:
        continue
      rel_nfc = Path(*[unicodedata.normalize("NFC", x) for x in rel.parts])
      print("pack", rel_nfc)
      copy_lesson(lesson, stage / rel_nfc)
    if not any(stage.rglob("*")):
      print("empty stage")
      return 0
    out.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(out, "w:gz", format=tarfile.PAX_FORMAT) as tar:
      tar.add(stage, arcname="J-M-Reihen")
  print("wrote", out, out.stat().st_size)
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
