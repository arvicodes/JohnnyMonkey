#!/usr/bin/env python3
"""Stunden-Unterordner in den Kapitel-/Themenordner legen und Pfade in den Folien anpassen."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path("/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen")

SKIP_FILES = {
    "Praesentation.deck.json",
    "Praesentation.deck.original.json",
    "Praesentation.annotations.json",
    "Praesentation.play-variants.json",
    ".DS_Store",
}
PARENT_JSON = [
    "Praesentation.deck.json",
    "Praesentation.deck.original.json",
    "Praesentation.annotations.json",
    "Praesentation.play-variants.json",
]


def is_chapter(name: str) -> bool:
    return bool(re.match(r"^(Kap\.?\s*\d+|Kapitel\s*\d+)", name.strip(), re.I))


def is_series(name: str) -> bool:
    return bool(re.match(r"^\d{1,2}[-–\s]\d{2}(\b|\s|$)", name.strip()))


def is_topic(name: str) -> bool:
    t = name.strip()
    if re.match(r"^\d+\.\d+", t):
        return False
    return bool(re.match(r"^\d+\s+", t))


def is_hour(name: str) -> bool:
    t = name.strip()
    if not t or t.startswith("."):
        return False
    if t.lower() == "grafiken" or re.search(r"wochenaufgaben", t, re.I):
        return False
    if is_chapter(t) or is_series(t) or is_topic(t):
        return False
    if re.match(r"^Rohdat", t, re.I) or re.search(r"Sicherheitskopie|BACKUP", t, re.I):
        return False
    return True


def to_git_intern(path: Path) -> str:
    text = str(path).replace("\\", "/")
    marker = "/J-M-Reihen/"
    idx = text.find(marker)
    if idx >= 0:
        return "git-intern/" + text[idx + len(marker) :]
    return text


def unique_name(parent: Path, name: str) -> str:
    dest = parent / name
    if not dest.exists():
        return name
    stem = Path(name).stem
    suffix = Path(name).suffix
    n = 2
    while True:
        cand = f"{stem}-{n}{suffix}"
        if not (parent / cand).exists():
            return cand
        n += 1


def rewrite_strings(obj, replacements: list[tuple[str, str]]):
    if isinstance(obj, dict):
        return {k: rewrite_strings(v, replacements) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite_strings(v, replacements) for v in obj]
    if isinstance(obj, str):
        out = obj
        for old, new in replacements:
            if old and old in out:
                out = out.replace(old, new)
        return out
    return obj


def flatten_parent(parent: Path) -> tuple[int, int]:
    hours = sorted([p for p in parent.iterdir() if p.is_dir() and is_hour(p.name)], key=lambda p: p.name)
    if not hours:
        return 0, 0
    moved = 0
    replacements: list[tuple[str, str]] = []
    parent_git = to_git_intern(parent)

    for hour in hours:
        for src in hour.rglob("*"):
            if not src.is_file():
                continue
            if ".presentation-backups" in src.parts:
                continue
            if src.name in SKIP_FILES or src.name.startswith("~$"):
                continue
            name = unique_name(parent, src.name)
            dest = parent / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))
            moved += 1
            old_git = to_git_intern(src)
            new_git = to_git_intern(dest)
            replacements.append((old_git, new_git))
            replacements.append((str(src), str(dest)))
            replacements.append((f"J-M-Reihen/{src.relative_to(ROOT)}", f"J-M-Reihen/{dest.relative_to(ROOT)}"))
        replacements.append((to_git_intern(hour), parent_git))
        replacements.append((f"J-M-Reihen/{hour.relative_to(ROOT)}", f"J-M-Reihen/{parent.relative_to(ROOT)}"))
        shutil.rmtree(hour, ignore_errors=True)

    replacements.sort(key=lambda pair: len(pair[0]), reverse=True)
    for fname in PARENT_JSON:
        path = parent / fname
        if not path.is_file():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        data = rewrite_strings(data, replacements)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return moved, len(hours)


def main() -> None:
    parents = []
    for dirpath, dirnames, filenames in __import__("os").walk(ROOT):
        parent = Path(dirpath)
        if not (is_chapter(parent.name) or is_topic(parent.name)):
            continue
        if "Praesentation.deck.json" not in filenames:
            continue
        parents.append(parent)

    total_moved = 0
    total_hours = 0
    for parent in sorted(parents):
        moved, hours = flatten_parent(parent)
        if hours:
            print(f"{parent.relative_to(ROOT)}: {moved} files from {hours} hour folders")
            total_moved += moved
            total_hours += hours
    print(f"done: {total_moved} files, {total_hours} folders removed")


if __name__ == "__main__":
    main()
