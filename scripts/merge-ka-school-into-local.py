#!/usr/bin/env python3
"""
Prüfungs-Abgaben (KASubmission + KACorrection) aus der Schul-DB in die Ziel-DB mergen.
Schule gewinnt bei Konflikt nur wenn der Schul-Eintrag neuer oder inhaltlich reicher ist.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime
from pathlib import Path


def parse_iso(s: str | None) -> float:
    if not s:
        return 0.0
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def norm_path(p: str) -> str:
    return (p or "").replace("\\", "/").strip().lower()


def submission_score(row: sqlite3.Row) -> tuple[float, int]:
    ts = parse_iso(row["updatedAt"] or row["submittedAt"])
    try:
        ans_len = len(json.dumps(json.loads(row["answers"] or "{}")))
    except Exception:
        ans_len = len(str(row["answers"] or ""))
    pts = float(row["totalPoints"] or 0)
    return (ts, ans_len + int(pts * 10))


def pick_better(a: sqlite3.Row, b: sqlite3.Row) -> sqlite3.Row:
    return a if submission_score(a) >= submission_score(b) else b


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--school-db", type=Path, required=True)
    ap.add_argument("--local-db", type=Path, required=True)
    args = ap.parse_args()

    school = sqlite3.connect(str(args.school_db))
    school.row_factory = sqlite3.Row
    target = sqlite3.connect(str(args.local_db))
    target.row_factory = sqlite3.Row

    school_subs = school.execute("SELECT * FROM KASubmission").fetchall()
    inserted = updated = 0
    id_map: dict[str, str] = {}

    for srow in school_subs:
        key_path = norm_path(srow["kaFilePath"])
        student_id = srow["studentId"]
        local_row = target.execute(
            """
            SELECT * FROM KASubmission
            WHERE studentId = ? AND lower(replace(kaFilePath, '\\', '/')) = ?
            """,
            (student_id, key_path),
        ).fetchone()
        if not local_row:
            # auch exakter Pfad-Vergleich
            local_row = target.execute(
                "SELECT * FROM KASubmission WHERE studentId = ? AND kaFilePath = ?",
                (student_id, srow["kaFilePath"]),
            ).fetchone()

        if not local_row:
            cols = [c for c in srow.keys()]
            vals = [srow[c] for c in cols]
            placeholders = ",".join("?" * len(cols))
            target.execute(
                f"INSERT INTO KASubmission ({','.join(cols)}) VALUES ({placeholders})",
                vals,
            )
            id_map[srow["id"]] = srow["id"]
            inserted += 1
            continue

        winner = pick_better(srow, local_row)
        if winner["id"] == local_row["id"]:
            id_map[srow["id"]] = local_row["id"]
            continue

        target.execute(
            """
            UPDATE KASubmission SET
              kaFilePath = ?, submittedAt = ?, expiredAt = ?, status = ?,
              answers = ?, autoPoints = ?, totalPoints = ?, isReleased = ?,
              markedSick = ?, updatedAt = ?, createdAt = ?
            WHERE id = ?
            """,
            (
                srow["kaFilePath"],
                srow["submittedAt"],
                srow["expiredAt"],
                srow["status"],
                srow["answers"],
                srow["autoPoints"],
                srow["totalPoints"],
                srow["isReleased"],
                srow["markedSick"],
                srow["updatedAt"],
                srow["createdAt"],
                local_row["id"],
            ),
        )
        id_map[srow["id"]] = local_row["id"]
        updated += 1

    target.commit()

    corr_ins = 0
    for srow in school_subs:
        local_sub_id = id_map.get(srow["id"])
        if not local_sub_id:
            local_sub_id = target.execute(
                "SELECT id FROM KASubmission WHERE studentId = ? AND kaFilePath = ?",
                (srow["studentId"], srow["kaFilePath"]),
            ).fetchone()
            if not local_sub_id:
                continue
            local_sub_id = local_sub_id["id"]
        for crow in school.execute(
            "SELECT * FROM KACorrection WHERE submissionId = ?", (srow["id"],)
        ).fetchall():
            exists = target.execute(
                "SELECT id FROM KACorrection WHERE submissionId = ? AND taskNumber = ?",
                (local_sub_id, crow["taskNumber"]),
            ).fetchone()
            if exists:
                continue
            cols = [c for c in crow.keys() if c != "id"]
            vals = [local_sub_id if c == "submissionId" else crow[c] for c in cols]
            placeholders = ",".join("?" * len(cols))
            target.execute(
                f"INSERT INTO KACorrection ({','.join(cols)}) VALUES ({placeholders})",
                vals,
            )
            corr_ins += 1

    target.commit()
    school.close()
    target.close()
    print(
        f"KA merge: +{inserted} submissions, ~{updated} updated from school, +{corr_ins} corrections"
    )


if __name__ == "__main__":
    main()
