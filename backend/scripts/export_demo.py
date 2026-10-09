"""Regenerate src/demo-data.json, the static snapshot the hosted UI uses when no backend is reachable.

Run from backend/:  python scripts/export_demo.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dino.match import DATA, load_work_orders
from dino.pipeline import process


def build() -> dict:
    samples = []
    for p in sorted((DATA / "samples").glob("*.txt")):
        lines = p.read_text().splitlines()
        samples.append({"id": p.stem, "title": lines[0].lstrip("# ").strip(), "text": "\n".join(lines[1:]).strip()})
    return {
        "samples": samples,
        "results": {s["id"]: process(s["text"]) for s in samples},
        "workOrders": load_work_orders(),
    }


if __name__ == "__main__":
    out = Path(__file__).resolve().parents[2] / "src" / "demo-data.json"
    out.write_text(json.dumps(build(), indent=1) + "\n")
    print(f"wrote {out}")
