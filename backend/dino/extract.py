"""Pull structured fields out of free-text production reports.

Rule-based on purpose: every field is traceable to a pattern, tolerant of common OCR
confusions (O/0, I/1, S/5), and reports "not found" instead of guessing.
"""
from __future__ import annotations

import re
from datetime import date

MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}

CAUSES = [
    ("changeover", r"change\s*-?over|tool(?:ing)?\s*change|die\s*change|setup|set-up"),
    ("breakdown", r"break\s*-?down|machine\s*(?:fault|failure|stopped)|motor|jam(?:med)?"),
    ("material shortage", r"material\s*(?:shortage|not\s*available|delay)|no\s*material|waiting\s*(?:for\s*)?material"),
    ("power cut", r"power\s*(?:cut|failure|outage)|electricity"),
    ("quality hold", r"quality\s*(?:hold|issue|check)|inspection\s*hold"),
    ("maintenance", r"maintenance|lubrication|servicing"),
]

_DIGIT_FIX = str.maketrans({"O": "0", "I": "1", "L": "1", "S": "5", "B": "8"})


def _int(s: str) -> int:
    return int(s.replace(",", ""))


def _find_part(text: str) -> str | None:
    for m in re.finditer(r"\b([A-Z]{2,3})[-\s]?([0-9OILSB]{3,5})[-\s]?([A-Z]{1,2})\b", text.upper()):
        prefix, mid, suffix = m.groups()
        mid = mid.translate(_DIGIT_FIX)
        if mid.isdigit() and sum(c.isdigit() for c in m.group(2)) >= 2:
            return f"{prefix}-{mid}-{suffix}"
    return None


def _find_date(text: str) -> str | None:
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if m:
        y, mo, d = map(int, m.groups())
    elif m := re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b", text):
        d, mo, y = map(int, m.groups())  # Indian day-first convention
        y += 2000 if y < 100 else 0
    elif m := re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{2,4})\b", text):
        d, y = int(m.group(1)), int(m.group(3))
        mo = MONTHS.get(m.group(2).lower(), 0)
        y += 2000 if y < 100 else 0
    else:
        return None
    try:
        return date(y, mo, d).isoformat()
    except ValueError:
        return None


def _find_shift(text: str) -> str | None:
    if m := re.search(r"\bshift\s*[:\-]?\s*([ABC])\b", text, re.I):
        return m.group(1).upper()
    if m := re.search(r"\b(\d{1,2}):\d{2}\s*(?:-|to|–)\s*\d{1,2}:\d{2}\b", text):
        start = int(m.group(1))
        return {6: "A", 14: "B", 22: "C"}.get(start)
    return None


def _find_downtime(text: str) -> int | None:
    pats = [
        r"(?:down\s*time|stoppage|stopped|stop|breakdown|idle)\D{0,20}?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b",
        r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\s*(?:of\s*)?(?:down\s*time|stoppage|lost|idle|breakdown)",
    ]
    for p in pats:
        if m := re.search(p, text, re.I):
            val, unit = float(m.group(1)), m.group(2).lower()
            return round(val * 60) if unit.startswith("h") else round(val)
    return None


def _find_qty(text: str, words: str) -> int | None:
    after = re.search(rf"(?:{words})\D{{0,15}}?(\d[\d,]*)", text, re.I)
    before = re.search(rf"(\d[\d,]*)\s*(?:units?|pcs|nos|pieces)?\s*(?:{words})", text, re.I)
    m = after or before
    return _int(m.group(1)) if m else None


def extract(text: str) -> dict:
    """Return the fields found in `text`; missing fields are None."""
    wo = re.search(r"\b(?:WO|W/O|work\s*order)\s*[:#-]?\s*(\d{3,6})\b", text, re.I)
    line = re.search(r"\b(?:line|ln)\s*[:#-]?\s*(\d{1,2})\b", text, re.I)
    cause = next((name for name, pat in CAUSES if re.search(pat, text, re.I)), None)
    return {
        "work_order": f"WO-{wo.group(1)}" if wo else None,
        "part_number": _find_part(text),
        "line": int(line.group(1)) if line else None,
        "date": _find_date(text),
        "shift": _find_shift(text),
        "produced": _find_qty(text, r"produced|output|made|completed|actual\s*(?:qty|quantity)?"),
        "rejected": _find_qty(text, r"rejected|rejects?|rejection|scrap(?:ped)?|defects?|defective|\bNG\b"),
        "downtime_min": _find_downtime(text),
        "downtime_cause": cause,
    }
