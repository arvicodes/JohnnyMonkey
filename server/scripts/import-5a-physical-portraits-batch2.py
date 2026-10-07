#!/usr/bin/env python3
"""Zweites Foto (Schulporträt) für Klasse 5a — Gesichtszuschnitt → User.avatarUrlAlt.

Zuordnung Scan-Zelle → Schüler per Gesichtsabgleich mit Klassenfoto (nicht Listenreihenfolge).
"""

from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AVATAR_DIR = ROOT / "uploads" / "avatars"
DB = ROOT / "prisma" / "dev.db"
GROUP_ID = "4376ebf7-84ac-4ed1-aaa7-5aa8abff645d"
URL_PREFIX = "/api/avatars"

ASSETS = Path(
    "/Users/verachrist/.cursor/projects/Users-verachrist-Documents-MEINE-APP-JohnnyMonkey/assets"
)

SHEETS = [
    (ASSETS / "IMG_3761-39edfbe7-4657-48ab-9f36-c1bc4d99465f.jpg", 2, 6, 12),
    (ASSETS / "IMG_3763-22d539b5-e990-48f4-95e6-a5d727cf335c.jpg", 2, 5, 9),
    (ASSETS / "IMG_3762-a0ce9d59-0dd6-4365-bfed-96b3fcc162fa.jpg", 2, 5, 10),
]

# Globaler Zellindex 0…30 (spaltenweise je Bogen), Facenet-Zuordnung + manuelle Anker
CELL_INDEX: dict[str, int] = {
    "Adrian Busch": 29,
    "Aurelia Hamm": 13,
    "Charlotta Maier": 23,
    "Clara Groß": 8,
    "Damian Baumeister": 24,
    "Elli Wöll": 12,
    "Eva Geis": 28,
    "Eva Rünz": 27,
    "Felix Schüler": 26,
    "Filip Glura": 18,
    "Franz Peres": 14,
    "Henriette Müller": 9,
    "Ida Schell": 30,
    "Ida Weyrich": 1,
    "Isabel Chartier": 2,
    "Jonathan Schwarz": 22,
    "Katharina Brandt": 21,
    "Laura Huke": 25,
    "Levin Dormann": 3,
    "Louisa Mitscherling": 17,
    "Luca Boshoven": 11,
    "Mats Kuhn": 20,
    "Mats Wirges": 10,
    "Matteo De Donatis": 7,
    "Maxima Diehl": 5,
    "Mila Šašić": 19,
    "Samuel Klepzig": 16,
    "Sebastian Zander": 4,
    "Skadi Unkelbach": 15,
    "Theo Winkels": 0,
    "Yutatsu Long": 6,
}

CELL_ROTATION: dict[str, int] = {
    "Adrian Busch": 0,
    "Aurelia Hamm": 180,
    "Charlotta Maier": 180,
    "Clara Groß": 180,
    "Damian Baumeister": 180,
    "Elli Wöll": 180,
    "Eva Geis": 0,
    "Eva Rünz": 180,
    "Felix Schüler": 180,
    "Filip Glura": 180,
    "Franz Peres": 90,
    "Henriette Müller": 180,
    "Ida Schell": 180,
    "Ida Weyrich": 180,
    "Isabel Chartier": 180,
    "Jonathan Schwarz": 180,
    "Katharina Brandt": 90,
    "Laura Huke": 180,
    "Levin Dormann": 180,
    "Louisa Mitscherling": 180,
    "Luca Boshoven": 90,
    "Mats Kuhn": 180,
    "Mats Wirges": 0,
    "Matteo De Donatis": 180,
    "Maxima Diehl": 180,
    "Mila Šašić": 180,
    "Samuel Klepzig": 180,
    "Sebastian Zander": 180,
    "Skadi Unkelbach": 180,
    "Theo Winkels": 180,
    "Yutatsu Long": 180,
}


def is_bg(r: int, g: int, b: int) -> bool:
    if r > 235 and g > 235 and b > 235:
        return True
    if abs(r - g) < 14 and abs(g - b) < 14 and r > 168:
        return True
    return False


def content_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if not is_bg(r, g, b):
                found = True
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if not found:
        return 0, 0, w - 1, h - 1
    return minx, miny, maxx, maxy


def crop_to_face(im: Image.Image) -> Image.Image:
    """Aus Scan-Zelle: quadratischer Ausschnitt um Kopf/Gesicht."""
    im = im.convert("RGB")
    minx, miny, maxx, maxy = content_bbox(im)
    cw = maxx - minx + 1
    ch = maxy - miny + 1
    if cw < 8 or ch < 8:
        return im.resize((512, 512), Image.Resampling.LANCZOS)

    face_cy = miny + int(ch * 0.36)
    face_cx = minx + cw // 2
    side = int(max(cw * 0.72, ch * 0.52))
    side = max(side, int(min(cw, ch) * 0.55))

    left = face_cx - side // 2
    top = face_cy - int(side * 0.42)
    right = left + side
    bottom = top + side

    if left < 0:
        right -= left
        left = 0
    if top < 0:
        bottom -= top
        top = 0
    if right > im.width:
        shift = right - im.width
        left = max(0, left - shift)
        right = im.width
    if bottom > im.height:
        shift = bottom - im.height
        top = max(0, top - shift)
        bottom = im.height

    crop = im.crop((left, top, right, bottom))
    return crop.resize((512, 512), Image.Resampling.LANCZOS)


def extract_raw_cells() -> list[Image.Image]:
    cells: list[Image.Image] = []
    for path, cols, rows, max_c in SHEETS:
        if not path.is_file():
            raise SystemExit(f"Fehlt: {path}")
        im = Image.open(path).convert("RGB")
        w, h = im.size
        cw, ch = w / cols, h / rows
        sheet_count = 0
        for c in range(cols):
            for r in range(rows):
                if sheet_count >= max_c:
                    break
                x0, y0 = int(c * cw), int(r * ch)
                x1, y1 = int((c + 1) * cw), int((r + 1) * ch)
                cells.append(im.crop((x0, y0, x1, y1)))
                sheet_count += 1
            if sheet_count >= max_c:
                break
    return cells


def portrait_for_name(name: str, raw_cells: list[Image.Image]) -> Image.Image:
    idx = CELL_INDEX.get(name)
    if idx is None:
        raise KeyError(f"Kein Zellindex für {name}")
    rot = CELL_ROTATION.get(name, 0)
    cell = raw_cells[idx].rotate(rot, expand=True)
    return crop_to_face(cell)


def main() -> None:
    if set(CELL_INDEX) != set(CELL_ROTATION):
        raise SystemExit("CELL_INDEX und CELL_ROTATION müssen dieselben Namen haben")
    if len(CELL_INDEX) != 31:
        raise SystemExit(f"Erwartet 31 Zuordnungen, erhalten {len(CELL_INDEX)}")
    if len(set(CELL_INDEX.values())) != 31:
        raise SystemExit("Doppelte Zellindizes in CELL_INDEX")

    raw = extract_raw_cells()
    if len(raw) != 31:
        raise SystemExit(f"Erwartet 31 Scan-Zellen, erhalten {len(raw)}")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(DB)
    name_to_id = {
        row[0]: row[1]
        for row in con.execute(
            """
            SELECT u.name, u.id FROM User u
            JOIN _StudentGroups sg ON sg.B = u.id
            WHERE sg.A = ?
            """,
            (GROUP_ID,),
        )
    }

    updated = 0
    for name in sorted(CELL_INDEX):
        uid = name_to_id.get(name)
        if not uid:
            print("SKIP (nicht in Gruppe):", name)
            continue
        cell = portrait_for_name(name, raw)
        old = con.execute("SELECT avatarUrlAlt FROM User WHERE id=?", (uid,)).fetchone()
        if old and old[0]:
            old_name = str(old[0]).split("/")[-1]
            old_path = AVATAR_DIR / old_name
            if old_path.is_file():
                try:
                    old_path.unlink()
                except OSError:
                    pass
        fname = f"{uuid.uuid4()}.jpg"
        cell.save(AVATAR_DIR / fname, quality=90)
        url = f"{URL_PREFIX}/{fname}"
        row = con.execute("SELECT avatarUrl FROM User WHERE id=?", (uid,)).fetchone()
        slot = "primary" if row and row[0] else "alt"
        con.execute(
            "UPDATE User SET avatarUrlAlt = ?, avatarPhotoSlot = ? WHERE id = ?",
            (url, slot, uid),
        )
        updated += 1
        print("OK", name, f"(Zelle {CELL_INDEX[name]})", "→", fname)

    con.commit()
    con.close()
    print(f"Fertig: {updated} Schüler — Zuordnung per Gesichtsabgleich.")


if __name__ == "__main__":
    main()
