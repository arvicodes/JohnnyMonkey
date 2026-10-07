#!/usr/bin/env python3
"""EPO 1: Klasse 5a/5c auf „Nur Note“ (manuell) + Noten aus Excel."""
from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "prisma" / "dev.db"
TEACHER_ID = "01ed6e10-397e-446c-9254-2ad7fd4ec777"
ROUND_ID = "bff36e8e-333e-4b54-88c8-ee9a765028f8"
GROUP_5A = "4376ebf7-84ac-4ed1-aaa7-5aa8abff645d"
GROUP_5C = "e487a375-bc31-49bd-a986-36a0d91b6785"
ROUND_PATH = f"__epo_noten_e_{ROUND_ID}__"

EXCEL_BY_GROUP = {
    GROUP_5A: Path("/Users/verachrist/Downloads/5a EPO.xlsx"),
    GROUP_5C: Path("/Users/verachrist/Downloads/5c EPO.xlsx"),
}

# Tippfehler in Excel → exakter DB-Name
EXCEL_ALIASES: dict[str, str] = {
    "sebastian zabnder": "Sebastian Zander",
    "maximma diehl": "Maxima Diehl",
    "theodor peres": "Franz Peres",
    "theo winkens": "Theo Winkels",
    "isabel chartier": "Isabel Chartier",
    "isabel charter": "Isabel Chartier",
    "jonathan schqwarz": "Jonathan Schwarz",
    "ida weyerich": "Ida Weyrich",
    "melissa geisen": "Melissa Fandiño Geisen",
    "luthen thome": "Luthien Thomé",
    "julius": "Julius Weyer",
    "david schmitte": "David Schulte",
    "elisabethg eming": "Elisabeth Eming",
    "marie spechert": "Marie Sprechert",
    "elli croonenberg": "Elisabeth Croonenberg",
    "levin demivi": "Levin Demirci",
    "maleen hannes": "Marleen Hannes",
    "mila sasic": "Mila Šašić",
    "leon fernandez de la pena": "León Fernández de la Peña",
}


def norm(s: str | None) -> str:
    if not s:
        return ""
    s = str(s).strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def grade_to_str(raw) -> str | None:
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return None
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        if float(raw).is_integer():
            return str(int(raw))
        return str(raw).strip()
    return str(raw).strip()


def load_excel_grades(path: Path) -> dict[str, str | None]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    out: dict[str, str | None] = {}
    for row in ws.iter_rows(values_only=True):
        if not row or not row[0]:
            continue
        label = str(row[0]).strip()
        key = norm(label)
        db_name = EXCEL_ALIASES.get(key, label)
        out[db_name] = grade_to_str(row[1])
    wb.close()
    return out


def load_students(conn: sqlite3.Connection, group_id: str) -> list[tuple[str, str]]:
    return conn.execute(
        """
        SELECT u.id, u.name FROM User u
        JOIN _StudentGroups sg ON sg.B = u.id
        WHERE sg.A = ? AND u.role = 'STUDENT'
        ORDER BY u.name
        """,
        (group_id,),
    ).fetchall()


def find_entry(entries: list[dict], student_id: str, group_id: str, student_gids: list[str]) -> dict | None:
    for e in entries:
        if e.get("studentId") == student_id and e.get("groupId") == group_id:
            return e
    legacy = next((e for e in entries if e.get("studentId") == student_id and not e.get("groupId")), None)
    if legacy and len(student_gids) == 1 and student_gids[0] == group_id:
        return legacy
    return None


def upsert_entry(entries: list[dict], entry: dict) -> None:
    sid = entry["studentId"]
    gid = entry.get("groupId")
    kept = []
    for e in entries:
        if e.get("studentId") != sid:
            kept.append(e)
            continue
        if gid:
            if e.get("groupId") == gid:
                continue
            if not e.get("groupId"):
                continue
            kept.append(e)
        else:
            if not e.get("groupId"):
                continue
            kept.append(e)
    kept.append(entry)
    entries[:] = kept


def main() -> None:
    conn = sqlite3.connect(DB)
    row = conn.execute(
        "SELECT content FROM TeacherLessonInstruction WHERE teacherId=? AND lessonPath=?",
        (TEACHER_ID, ROUND_PATH),
    ).fetchone()
    if not row:
        raise SystemExit(f"Round not found: {ROUND_PATH}")
    payload = json.loads(row[0])
    entries: list[dict] = payload.get("entries") or []
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    summary: list[str] = []

    for group_id, excel_path in EXCEL_BY_GROUP.items():
        grades = load_excel_grades(excel_path)
        students = load_students(conn, group_id)
        gids_in_round = [group_id]  # 5a/5c only one group each per student here

        for student_id, name in students:
            grade = grades.get(name)
            if name not in grades:
                # try norm match
                for k, v in grades.items():
                    if norm(k) == norm(name):
                        grade = v
                        break

            existing = find_entry(entries, student_id, group_id, gids_in_round)
            entry = deepcopy(existing) if existing else {
                "studentId": student_id,
                "studentName": name,
            }
            entry["studentId"] = student_id
            entry["studentName"] = name
            entry["groupId"] = group_id
            entry["teacherGradeOnly"] = True
            entry["withoutSelfAssessment"] = False
            if grade:
                entry["teacherGrade"] = grade
                entry["teacherReleasedAt"] = entry.get("teacherReleasedAt") or now
            summary.append(
                f"  {name}: Note={grade or '—'} (manuell)"
                + (" [kein Excel-Treffer]" if name not in grades and grade is None else "")
            )
            upsert_entry(entries, entry)

    payload["entries"] = entries
    payload["updatedAt"] = now
    conn.execute(
        """
        UPDATE TeacherLessonInstruction SET content=?, updatedAt=datetime('now')
        WHERE teacherId=? AND lessonPath=?
        """,
        (json.dumps(payload, ensure_ascii=False), TEACHER_ID, ROUND_PATH),
    )
    conn.commit()
    conn.close()

    print(f"EPO-Runde {ROUND_ID} aktualisiert ({len(summary)} SuS).")
    for line in summary:
        print(line)


if __name__ == "__main__":
    main()
