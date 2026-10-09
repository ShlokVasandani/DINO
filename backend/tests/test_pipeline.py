from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from dino.api import app
from dino.extract import extract
from dino.pipeline import process

SAMPLES = Path(__file__).parent.parent / "dino/data/samples"


def sample(name: str) -> str:
    return "\n".join((SAMPLES / name).read_text().splitlines()[1:])


def test_extract_clean_report():
    f = extract(sample("1_clean_shortfall.txt"))
    assert f["work_order"] == "WO-4417"
    assert f["part_number"] == "AX-2210-R"
    assert (f["line"], f["shift"], f["date"]) == (3, "B", "2026-09-10")
    assert (f["produced"], f["rejected"], f["downtime_min"]) == (1046, 38, 42)
    assert f["downtime_cause"] == "changeover"


def test_extract_fixes_ocr_confusions():
    assert extract("part no AX-22lO-R")["part_number"] == "AX-2210-R"


def test_extract_does_not_read_dates_as_shift_times_or_report_numbers_as_qty():
    f = extract("Production Report No. 1048\n06-09-2026\nLine 3")
    assert f["shift"] is None and f["produced"] is None and f["date"] == "2026-09-06"


def test_extract_reports_missing_fields_as_none():
    f = extract("nothing useful here")
    assert all(v is None for v in f.values())


def test_clean_report_matches_with_shortfall_and_downtime():
    r = process(sample("1_clean_shortfall.txt"))
    assert r["match"]["status"] == "matched"
    assert r["match"]["work_order"]["id"] == "WO-4417"
    a = r["assessment"]
    assert a["shortfall"] == 154 and a["downtime_min"] == 42
    assert {d["type"] for d in a["deviations"]} == {"shortfall", "downtime", "rejects"}  # 38/1046 = 3.6% > 3% allowance
    assert a["risk_level"] in {"medium", "high"}


def test_noisy_report_without_wo_still_resolves():
    r = process(sample("2_noisy_no_wo.txt"))
    assert r["match"]["work_order"]["id"] == "WO-4417"
    assert r["match"]["status"] in {"matched", "review"}


def test_ambiguous_report_is_flagged_not_forced():
    r = process(sample("3_ambiguous.txt"))
    assert r["match"]["status"] in {"review", "unmatched"}
    assert any("equally" in n for n in r["match"]["notes"]) or r["match"]["status"] == "unmatched"


def test_on_plan_report_is_low_risk():
    r = process(sample("4_on_plan.txt"))
    assert r["match"]["work_order"]["id"] == "WO-4435"
    assert r["assessment"]["risk_level"] == "low"


def test_conflicting_wo_and_part_goes_to_review():
    r = process(sample("5_conflicting.txt"))
    assert r["match"]["status"] == "review"
    assert any("differs" in n for n in r["match"]["notes"])


def test_unknown_work_order_is_called_out():
    r = process("WO-9999 AX-2210-R line 3 shift B 10/09/2026 produced 100")
    assert any("not in the production plan" in n for n in r["match"]["notes"])
    assert r["match"]["status"] != "matched"


def test_garbage_is_unmatched():
    r = process("lorem ipsum")
    assert r["match"]["status"] == "unmatched" and r["assessment"] is None


client = TestClient(app)


def test_api_process_text_and_file():
    assert client.post("/api/process", data={"text": sample("1_clean_shortfall.txt")}).json()["match"]["status"] == "matched"
    files = {"file": ("r.txt", sample("4_on_plan.txt").encode(), "text/plain")}
    assert client.post("/api/process", files=files).status_code == 200


def test_api_rejects_empty_and_bad_files():
    assert client.post("/api/process").status_code == 400
    assert client.post("/api/process", files={"file": ("x.exe", b"hi")}).status_code == 422


def test_api_samples_and_work_orders():
    assert len(client.get("/api/samples").json()) == 5
    assert len(client.get("/api/work-orders").json()) == 12


def test_spans_point_at_the_evidence():
    r = process(sample("1_clean_shortfall.txt"))
    text = r["text"]
    for field, needle in {"work_order": "WO-4417", "part_number": "AX-2210-R", "date": "10/09/2026"}.items():
        a, b = r["spans"][field]
        assert needle in text[a:b], field
    assert "spans" in process("nothing") and process("nothing")["spans"] == {}


def test_demo_snapshot_is_up_to_date():
    """If this fails, run `python scripts/export_demo.py` from backend/."""
    import json
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
    from export_demo import build
    snapshot = Path(__file__).parent.parent.parent / "src" / "demo-data.json"
    assert json.loads(snapshot.read_text()) == build()


def test_tied_candidates_lower_the_confidence():
    r = process(sample("3_ambiguous.txt"))
    assert r["match"]["confidence"] <= 0.5
    assert r["match"]["candidates"][0]["confidence"] == r["match"]["candidates"][1]["confidence"]


def test_cause_span_covers_the_whole_phrase():
    r = process(sample("1_clean_shortfall.txt"))
    a, b = r["spans"]["downtime_cause"]
    assert r["text"][a:b] == "tooling changeover"
