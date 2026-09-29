#!/usr/bin/env python3
"""
EPO-Daten aus Schul-DB in die gewählte Laptop-DB mergen (ohne andere Tabellen anzutasten).

Schule = Quelle für SuS-Einträge (Selbsteinschätzung, Noten, Ziele).
Laptop = Metadaten (groupMeta, variantId, Kurse, Freigabe-Stand), wenn neuer/vollständiger.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

EPO_PREFIX = "__epo_noten_"


def parse_iso(s: str | None) -> float:
    if not s:
        return 0.0
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def entry_richness(e: dict[str, Any]) -> int:
    score = 0
    for k in (
        "suggestedGrade",
        "teacherGrade",
        "goal",
        "goalAction",
        "justification",
        "selfGradeFromTable",
    ):
        if str(e.get(k) or "").strip():
            score += 2
    if e.get("selfScores"):
        score += 3
    if e.get("teacherScores"):
        score += 3
    if e.get("studentSubmittedAt"):
        score += 1
    if e.get("teacherReleasedAt"):
        score += 2
    if e.get("goalsSubmittedAt"):
        score += 2
    return score


def merge_entry(school: dict[str, Any], local: dict[str, Any] | None) -> dict[str, Any]:
    if not local:
        return deepcopy(school)
    if entry_richness(school) >= entry_richness(local):
        base = deepcopy(school)
        other = local
    else:
        base = deepcopy(local)
        other = school
    # Timestamps: neueres Feld übernehmen, wenn gesetzt
    for key in (
        "studentSubmittedAt",
        "teacherReleasedAt",
        "goalsSubmittedAt",
        "suggestedGrade",
        "teacherGrade",
        "goal",
        "goalAction",
        "justification",
        "selfScores",
        "teacherScores",
        "selfGradeFromTable",
        "suggestedGradeMode",
    ):
        s_val = school.get(key)
        l_val = local.get(key)
        if s_val is None or s_val == "" or s_val == []:
            if l_val not in (None, "", []):
                base[key] = deepcopy(l_val)
            continue
        if l_val is None or l_val == "" or l_val == []:
            base[key] = deepcopy(s_val)
            continue
        ts_keys = {
            "studentSubmittedAt": "studentSubmittedAt",
            "teacherReleasedAt": "teacherReleasedAt",
            "goalsSubmittedAt": "goalsSubmittedAt",
        }
        if key in ts_keys:
            if parse_iso(str(l_val)) > parse_iso(str(s_val)):
                base[key] = deepcopy(l_val)
            else:
                base[key] = deepcopy(s_val)
        elif entry_richness({"x": s_val}) == entry_richness({"x": l_val}):
            base[key] = deepcopy(s_val if entry_richness(school) >= entry_richness(local) else l_val)
        else:
            base[key] = deepcopy(s_val if entry_richness(school) >= entry_richness(local) else l_val)
    base["studentId"] = school.get("studentId") or local.get("studentId")
    base["studentName"] = school.get("studentName") or local.get("studentName")
    return base


def merge_round(school_raw: dict[str, Any], local_raw: dict[str, Any]) -> dict[str, Any]:
    out = deepcopy(school_raw)
    local = deepcopy(local_raw)

    school_ids = list(out.get("groupIds") or [])
    local_ids = list(local.get("groupIds") or [])
    out["groupIds"] = list(dict.fromkeys(school_ids + [g for g in local_ids if g not in school_ids]))

    if local.get("variantId") and not out.get("variantId"):
        out["variantId"] = local["variantId"]

    l_meta = local.get("groupMeta") if isinstance(local.get("groupMeta"), dict) else {}
    o_meta = out.get("groupMeta") if isinstance(out.get("groupMeta"), dict) else {}
    merged_meta: dict[str, Any] = {**o_meta}
    for gid, lm in l_meta.items():
        if not isinstance(lm, dict):
            continue
        om = merged_meta.get(gid) if isinstance(merged_meta.get(gid), dict) else {}
        merged_meta[gid] = {
            **om,
            **lm,
            "publishedAt": lm.get("publishedAt") or om.get("publishedAt"),
            "completedAt": lm.get("completedAt") or om.get("completedAt"),
        }
    out["groupMeta"] = merged_meta

    l_modes = local.get("assessmentModeByGroup") if isinstance(local.get("assessmentModeByGroup"), dict) else {}
    o_modes = out.get("assessmentModeByGroup") if isinstance(out.get("assessmentModeByGroup"), dict) else {}
    out["assessmentModeByGroup"] = {**o_modes, **l_modes}

    if parse_iso(local.get("publishedAt")) > parse_iso(out.get("publishedAt")):
        out["publishedAt"] = local.get("publishedAt")
    if parse_iso(local.get("updatedAt")) > parse_iso(out.get("updatedAt")):
        out["updatedAt"] = local.get("updatedAt")

    school_by_id = {e["studentId"]: e for e in out.get("entries") or [] if e.get("studentId")}
    local_by_id = {e["studentId"]: e for e in local.get("entries") or [] if e.get("studentId")}
    all_ids = list(dict.fromkeys(list(school_by_id) + list(local_by_id)))
    out["entries"] = [merge_entry(school_by_id.get(sid, {}), local_by_id.get(sid)) for sid in all_ids]
    out["entries"] = [e for e in out["entries"] if e.get("studentId")]
    return out


def merge_index(school_raw: dict[str, Any], local_raw: dict[str, Any]) -> dict[str, Any]:
    out = deepcopy(school_raw)
    local = deepcopy(local_raw)
    out["activeByGroup"] = {**(out.get("activeByGroup") or {}), **(local.get("activeByGroup") or {})}
    school_rounds = {r["id"]: r for r in out.get("rounds") or [] if r.get("id")}
    for lr in local.get("rounds") or []:
        rid = lr.get("id")
        if not rid:
            continue
        if rid not in school_rounds:
            out.setdefault("rounds", []).append(lr)
            continue
        sr = school_rounds[rid]
        if parse_iso(lr.get("updatedAt")) > parse_iso(sr.get("updatedAt")):
            sr.update({k: lr[k] for k in ("title", "date", "groupIds", "publishedAt", "updatedAt") if k in lr})
        # groupIds union
        gids = list(dict.fromkeys(list(sr.get("groupIds") or []) + list(lr.get("groupIds") or [])))
        sr["groupIds"] = gids
    out["rounds"] = sorted(out.get("rounds") or [], key=lambda r: r.get("updatedAt") or "", reverse=True)
    return out


def upsert_instruction(con: sqlite3.Connection, teacher_id: str, lesson_path: str, content: str) -> None:
    row = con.execute(
        "SELECT id FROM TeacherLessonInstruction WHERE teacherId=? AND lessonPath=?",
        (teacher_id, lesson_path),
    ).fetchone()
    if row:
        con.execute(
            "UPDATE TeacherLessonInstruction SET content=?, updatedAt=datetime('now') WHERE id=?",
            (content, row[0]),
        )
    else:
        con.execute(
            "INSERT INTO TeacherLessonInstruction (id, teacherId, lessonPath, content, updatedAt) VALUES (?,?,?,?,datetime('now'))",
            (str(uuid.uuid4()), teacher_id, lesson_path, content),
        )


def fetch_epo_rows(con: sqlite3.Connection) -> dict[str, tuple[str, str]]:
    """lessonPath -> (teacherId, content)"""
    rows = con.execute(
        "SELECT teacherId, lessonPath, content FROM TeacherLessonInstruction WHERE lessonPath LIKE ?",
        (EPO_PREFIX + "%",),
    ).fetchall()
    return {lp: (tid, content) for tid, lp, content in rows}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--school-db", type=Path, required=True)
    ap.add_argument("--local-db", type=Path, required=True)
    args = ap.parse_args()

    school_con = sqlite3.connect(args.school_db)
    local_con = sqlite3.connect(args.local_db)
    school_rows = fetch_epo_rows(school_con)
    local_rows = fetch_epo_rows(local_con)

    if not school_rows:
        print("Keine EPO-Zeilen in Schul-DB — nichts zu mergen.")
        return

    teacher_ids = {tid for tid, _ in school_rows.values()} | {tid for tid, _ in local_rows.values()}
    if len(teacher_ids) != 1:
        print("WARN: mehrere teacherIds bei EPO:", teacher_ids)

    updates = 0
    for path, (s_tid, s_content) in school_rows.items():
        if path.endswith("_index__"):
            l = local_rows.get(path)
            if not l:
                merged = json.loads(s_content)
            else:
                merged = merge_index(json.loads(s_content), json.loads(l[1]))
            content = json.dumps(merged, ensure_ascii=False)
        elif "/__epo_noten_e_" in path or path.startswith("__epo_noten_e_"):
            l = local_rows.get(path)
            if not l:
                content = s_content
            else:
                merged = merge_round(json.loads(s_content), json.loads(l[1]))
                content = json.dumps(merged, ensure_ascii=False)
        else:
            # group active refs: neueren Inhalt behalten
            l = local_rows.get(path)
            if l and parse_iso(json.loads(l[1]).get("publishedAt")) > parse_iso(
                json.loads(s_content).get("publishedAt")
            ):
                content = l[1]
                s_tid = l[0]
            else:
                content = s_content

        tid = s_tid
        upsert_instruction(local_con, tid, path, content)
        updates += 1

    # Laptop-only EPO paths (z. B. Klasse 5a active ref)
    for path, (tid, content) in local_rows.items():
        if path in school_rows:
            continue
        upsert_instruction(local_con, tid, path, content)
        updates += 1

    local_con.commit()

    # Stats
    row = local_con.execute(
        "SELECT content FROM TeacherLessonInstruction WHERE lessonPath LIKE '__epo_noten_e_%' LIMIT 1"
    ).fetchone()
    if row:
        d = json.loads(row[0])
        ents = d.get("entries") or []
        print(
            f"EPO merge OK: {updates} Zeilen, entries={len(ents)}, "
            f"goals={sum(1 for e in ents if e.get('goalsSubmittedAt'))}, "
            f"released={sum(1 for e in ents if e.get('teacherReleasedAt'))}"
        )
    else:
        print(f"EPO merge OK: {updates} Zeilen")


if __name__ == "__main__":
    main()
