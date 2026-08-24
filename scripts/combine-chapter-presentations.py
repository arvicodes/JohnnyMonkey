#!/usr/bin/env python3
"""Stunden-Präsentationen in den Oberordner (Kap / 01 Basiswissen) zusammenführen."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen")
DECK = "Praesentation.deck.json"
ORIGINAL = "Praesentation.deck.original.json"
ANNOTATIONS = "Praesentation.annotations.json"
VARIANTS = "Praesentation.play-variants.json"

SKIP_PARENT = re.compile(r"wochenaufgaben", re.I)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def to_git_intern(path: Path) -> str:
    text = str(path).replace("\\", "/")
    marker = "/J-M-Reihen/"
    idx = text.find(marker)
    if idx >= 0:
        return "git-intern/" + text[idx + len(marker) :]
    return text


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
    if t.lower() == "grafiken" or SKIP_PARENT.search(t):
        return False
    if is_chapter(t) or is_series(t) or is_topic(t):
        return False
    if re.match(r"^Rohdat", t, re.I) or re.search(r"Sicherheitskopie|BACKUP", t, re.I):
        return False
    return True


def is_start_slide(slide: dict) -> bool:
    els = slide.get("elements") or []
    html = " ".join(str(el.get("html") or "") for el in els)
    if "entry-ticket" in html or "jm=lesson-entry" in html or "start-entry-ticket" in str(slide.get("id") or ""):
        return True
    title = f"{slide.get('title') or ''} {slide.get('titleHtml') or ''}".lower()
    if slide.get("layout") == "title-slide" and "guten morgen" in title:
        return True
    return False


def is_end_slide(slide: dict) -> bool:
    title = f"{slide.get('title') or ''} {slide.get('titleHtml') or ''}".lower()
    if "bis zur nächsten stunde" in title or "bis zur naechsten stunde" in title:
        return True
    for el in slide.get("elements") or []:
        if el.get("type") != "image":
            continue
        src = str(el.get("src") or "").replace("\\", "/")
        if re.search(r"(?:^|/)HA\.png$", src, re.I) or re.search(r"(?:^|/)Endroboter\.png$", src, re.I):
            return True
    return False


def sort_slides(slides: list[dict]) -> list[dict]:
    return sorted(slides or [], key=lambda s: s.get("order", 0))


def hour_slides(slides: list[dict], hour_index: int) -> list[dict]:
    ordered = sort_slides(slides)
    if hour_index > 0 and ordered and is_start_slide(ordered[0]):
        return ordered[1:]
    return ordered


def is_play_photo(el: dict) -> bool:
    name = str(el.get("src") or "").replace("\\", "/").split("/")[-1]
    return el.get("type") == "image" and bool(re.match(r"^play-foto-", name, re.I))


def strip_play(slide: dict) -> dict:
    out = json.loads(json.dumps(slide))
    els = [el for el in (out.get("elements") or []) if not is_play_photo(el)]
    out["elements"] = els
    out.pop("inkStrokes", None)
    return out


def load_json(path: Path):
    if not path.is_file():
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def remap_id(slide_id: str, hour_key: str, used: set[str]) -> str:
    if slide_id not in used:
        used.add(slide_id)
        return slide_id
    nxt = f"{hour_key}__{slide_id}"
    n = 2
    while nxt in used:
        nxt = f"{hour_key}__{slide_id}__{n}"
        n += 1
    used.add(nxt)
    return nxt


def combine_parent(parent: Path, hour_dirs: list[Path]) -> int:
    used: set[str] = set()
    slides: list[dict] = []
    original_slides: list[dict] = []
    by_slide: dict = {}
    variants_by: dict = {}
    combined_from = []
    first_deck = None

    for hour_index, hour_dir in enumerate(hour_dirs):
        deck = load_json(hour_dir / DECK)
        if not deck or not deck.get("slides"):
            continue
        if first_deck is None:
            first_deck = deck
        original = load_json(hour_dir / ORIGINAL) or deck
        annotations = load_json(hour_dir / ANNOTATIONS) or {}
        variants = load_json(hour_dir / VARIANTS) or {}
        hour_path = to_git_intern(hour_dir)
        hour_name = hour_dir.name
        combined_from.append(
            {
                "lessonPath": hour_path,
                "lessonName": hour_name,
                "updatedAt": deck.get("updatedAt"),
            }
        )
        id_map: dict[str, str] = {}
        working = hour_slides(deck.get("slides") or [], hour_index)
        orig_list = hour_slides(original.get("slides") or [], hour_index)
        orig_by_id = {s.get("id"): s for s in orig_list}

        for slide in working:
            old = slide.get("id") or f"slide-{hour_index}-{len(slides)}"
            new_id = remap_id(old, f"h{hour_index}", used)
            id_map[old] = new_id
            tagged = strip_play(slide)
            tagged["id"] = new_id
            tagged["order"] = len(slides)
            tagged["sourceLessonName"] = hour_name
            tagged["sourceLessonPath"] = hour_path
            slides.append(tagged)
            orig = orig_by_id.get(old, slide)
            ot = strip_play(orig)
            ot["id"] = new_id
            ot["order"] = len(original_slides)
            ot["sourceLessonName"] = hour_name
            ot["sourceLessonPath"] = hour_path
            original_slides.append(ot)

        for orig in orig_list:
            old = orig.get("id")
            if not old or old in id_map:
                continue
            new_id = remap_id(old, f"h{hour_index}", used)
            id_map[old] = new_id
            ot = strip_play(orig)
            ot["id"] = new_id
            ot["order"] = len(original_slides)
            ot["sourceLessonName"] = hour_name
            ot["sourceLessonPath"] = hour_path
            original_slides.append(ot)

        for old, strokes in (annotations.get("bySlideId") or {}).items():
            if not strokes:
                continue
            new_id = id_map.get(old) or remap_id(old, f"h{hour_index}", used)
            by_slide[new_id] = strokes

        for old, variant in (variants.get("bySlideId") or {}).items():
            if not variant or not variant.get("slide"):
                continue
            new_id = id_map.get(old) or remap_id(old, f"h{hour_index}", used)
            v = json.loads(json.dumps(variant))
            v["slide"]["id"] = new_id
            v["slide"]["sourceLessonName"] = hour_name
            v["slide"]["sourceLessonPath"] = hour_path
            variants_by[new_id] = v

    if not slides:
        return 0

    folder = to_git_intern(parent)
    stamp = now_iso()
    deck_out = {
        "version": 1,
        "title": parent.name,
        "lessonPath": folder,
        "updatedAt": stamp,
        "slides": slides,
        "defaultTransition": (first_deck or {}).get("defaultTransition") or "fade",
        "showSlideNumbers": (first_deck or {}).get("showSlideNumbers", True),
        "showSlideFooter": (first_deck or {}).get("showSlideFooter", True),
        "slideFooter": (first_deck or {}).get("slideFooter"),
        "combinedFrom": combined_from,
    }
    original_out = json.loads(json.dumps(deck_out))
    original_out["slides"] = original_slides
    original_out.pop("johnnyOriginalFrozenAt", None)
    ann_out = {
        "version": 1,
        "lessonPath": folder,
        "updatedAt": stamp,
        "bySlideId": by_slide,
    }
    var_out = {
        "version": 1,
        "lessonPath": folder,
        "updatedAt": stamp,
        "bySlideId": variants_by,
    }
    save_json(parent / DECK, deck_out)
    save_json(parent / ORIGINAL, original_out)
    save_json(parent / ANNOTATIONS, ann_out)
    save_json(parent / VARIANTS, var_out)
    return len(slides)


def main() -> None:
    written = []
    for dirpath, dirnames, _filenames in __import__("os").walk(ROOT):
        parent = Path(dirpath)
        if SKIP_PARENT.search(parent.name) or parent.name.lower() == "grafiken":
            dirnames[:] = [d for d in dirnames if not SKIP_PARENT.search(d)]
            continue
        hour_dirs = sorted(
            [parent / d for d in dirnames if is_hour(d) and (parent / d / DECK).is_file()],
            key=lambda p: p.name,
        )
        if len(hour_dirs) < 1:
            continue
        if not (is_chapter(parent.name) or is_topic(parent.name)):
            continue
        n = combine_parent(parent, hour_dirs)
        if n:
            rel = parent.relative_to(ROOT)
            written.append((str(rel), n, [p.name for p in hour_dirs]))

    print(f"combined {len(written)} parent folders")
    for rel, n, hours in written:
        print(f"  {rel}: {n} slides from {len(hours)} hours")


if __name__ == "__main__":
    main()
