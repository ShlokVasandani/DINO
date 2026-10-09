# Dino

[![CI](https://github.com/ShlokVasandani/DINO/actions/workflows/ci.yml/badge.svg)](https://github.com/ShlokVasandani/DINO/actions/workflows/ci.yml)

Shop-floor reports, matched to the right work order.

Operators write production reports in free text: handwritten notes, scans, shift logs. Dino reads them, pulls out the structured fields (work order, part number, line, shift, date, quantities, downtime), matches the report to the correct open work order with a confidence score, and scores it against the production plan so deviations surface immediately.

Built for **Smart India Hackathon 2026**, PS 26122 (Production Report to Production Plan Matching). It was not selected, so I finished it as a standalone project.

![Dino analysing a shift report](docs/demo.jpg)

## How it works

1. **Extract** (`backend/dino/extract.py`): rule-based parsing that tolerates OCR confusions (`AX-22lO-R` → `AX-2210-R`), day-first dates, shift inferred from time ranges, and downtime in minutes or hours. A field it cannot find is `None`, never guessed.
2. **Match** (`backend/dino/match.py`): scores every open work order on the fields the report actually contains (work order ID 5, part number 3, line 1.5, date 1, shift 1), with a one-character part-number mismatch scoring only half credit so `AX-2210-R` is not confused with `AX-2210-L`. Little evidence caps confidence. Results are `matched`, `review` (low confidence, near-tie, or the report's work order and part disagree) or `unmatched`.
3. **Assess** (`backend/dino/assess.py`): compares output, reject rate and downtime against each work order's allowances, lists deviations with severity, suggests actions and gives a 0-100 risk score.

## Run it

```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn dino.api:app --port 8000

# frontend (new terminal, repo root)
npm install
npm run dev
```

Open the app and try the sample reports, or upload a `.txt`, text-layer `.pdf`, or image. The frontend talks to `http://localhost:8000`; set `VITE_API_URL` to point elsewhere.

```bash
cd backend && pytest        # 14 tests: extraction, matching, scoring, API
```

## Limits

- **Image OCR** needs the Tesseract binary installed (`brew install tesseract`). Scanned PDFs must be uploaded as images; only PDFs with a text layer are read directly.
- **Handwriting:** OCR quality on real handwriting will vary. Extraction is tuned for typed or neatly written reports.
- **Data is synthetic.** The 12 work orders in `backend/dino/data/work_orders.json` and the sample reports are made up; there is no ERP integration.
- Extraction is rule-based, not an LLM. It is predictable and testable, but it will miss phrasings the patterns do not cover. Extending `extract.py` (or adding an LLM fallback behind the same interface) is the obvious next step.
- The hosted GitHub Pages build is the UI only; the backend is not deployed.

## Stack

React + Vite, Tailwind, shadcn/ui, Framer Motion · Python, FastAPI, pypdf, Tesseract (optional) · pytest, GitHub Actions
