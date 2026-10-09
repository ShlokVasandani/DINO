from __future__ import annotations

from .assess import assess
from .extract import extract
from .match import load_work_orders, match


def process(text: str, source: str = "text", work_orders: list[dict] | None = None) -> dict:
    wos = work_orders if work_orders is not None else load_work_orders()
    fields = extract(text)
    result = match(fields, wos)
    assessment = assess(fields, result["work_order"]) if result["work_order"] else None
    return {"source": source, "text": text, "extracted": fields, "match": result, "assessment": assessment}
