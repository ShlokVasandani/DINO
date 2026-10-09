"""Rank open work orders against an extracted report and say how sure we are."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

DATA = Path(__file__).parent / "data"
WEIGHTS = {"work_order": 5.0, "part_number": 3.0, "line": 1.5, "date": 1.0, "shift": 1.0}
MATCH_THRESHOLD = 0.75
REVIEW_THRESHOLD = 0.5
AMBIGUITY_MARGIN = 0.10


def load_work_orders(path: Path = DATA / "work_orders.json") -> list[dict]:
    return json.loads(path.read_text())


def _edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _part_score(reported: str, planned: str) -> float:
    d = _edit_distance(reported, planned)
    return 1.0 if d == 0 else 0.5 if d == 1 else 0.0


def _date_score(reported: str, planned: str) -> float:
    gap = abs((date.fromisoformat(reported) - date.fromisoformat(planned)).days)
    return 1.0 if gap == 0 else 0.3 if gap == 1 else 0.0


def _field_scores(fields: dict, wo: dict) -> dict[str, float]:
    s: dict[str, float] = {}
    if fields.get("work_order"):
        s["work_order"] = 1.0 if fields["work_order"] == wo["id"] else 0.0
    if fields.get("part_number"):
        s["part_number"] = _part_score(fields["part_number"], wo["part_number"])
    if fields.get("line") is not None:
        s["line"] = 1.0 if fields["line"] == wo["line"] else 0.0
    if fields.get("date"):
        s["date"] = _date_score(fields["date"], wo["date"])
    if fields.get("shift"):
        s["shift"] = 1.0 if fields["shift"] == wo["shift"] else 0.0
    return s


def match(fields: dict, work_orders: list[dict]) -> dict:
    ranked = []
    for wo in work_orders:
        scores = _field_scores(fields, wo)
        weight = sum(WEIGHTS[k] for k in scores)
        raw = sum(WEIGHTS[k] * v for k, v in scores.items()) / weight if weight else 0.0
        # Little evidence caps confidence: a report that only says "line 3" can't be a 95% match.
        confidence = raw * min(1.0, weight / 4.0)
        ranked.append({"work_order": wo, "confidence": round(confidence, 3), "field_scores": scores})
    ranked.sort(key=lambda r: r["confidence"], reverse=True)

    best = ranked[0] if ranked else None
    margin = best["confidence"] - ranked[1]["confidence"] if len(ranked) > 1 else 1.0
    notes: list[str] = []

    ref = fields.get("work_order")
    ref_wo = next((w for w in work_orders if w["id"] == ref), None) if ref else None
    if ref and not ref_wo:
        notes.append(f"{ref} is not in the production plan.")
    if ref_wo and fields.get("part_number") and _part_score(fields["part_number"], ref_wo["part_number"]) < 1.0:
        notes.append(f"Report cites {ref} but part {fields['part_number']} differs from the plan ({ref_wo['part_number']}).")

    if not best or best["confidence"] < REVIEW_THRESHOLD:
        status = "unmatched"
    elif best["confidence"] < MATCH_THRESHOLD or margin < AMBIGUITY_MARGIN or notes:
        status = "review"
        if margin < AMBIGUITY_MARGIN:
            notes.append("Two or more work orders fit about equally well.")
    else:
        status = "matched"

    return {
        "status": status,
        "confidence": best["confidence"] if best else 0.0,
        "work_order": best["work_order"] if status != "unmatched" else None,
        "candidates": ranked[:3],
        "notes": notes,
    }
