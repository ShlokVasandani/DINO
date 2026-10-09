from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .match import DATA, load_work_orders
from .ocr import UnsupportedFile, to_text
from .pipeline import process

MAX_BYTES = 10 * 1024 * 1024
app = FastAPI(title="Dino", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/work-orders")
def work_orders():
    return load_work_orders()


@app.get("/api/samples")
def samples():
    return [{"id": p.stem, "title": p.read_text().splitlines()[0].lstrip("# ").strip(), "text": "\n".join(p.read_text().splitlines()[1:]).strip()}
            for p in sorted((DATA / "samples").glob("*.txt"))]


@app.post("/api/process")
async def process_report(file: UploadFile | None = File(None), text: str | None = Form(None)):
    if file is not None:
        data = await file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "File is larger than 10 MB.")
        try:
            body, source = to_text(file.filename or "", data)
        except UnsupportedFile as exc:
            raise HTTPException(422, str(exc)) from exc
    elif text and text.strip():
        body, source = text, "text"
    else:
        raise HTTPException(400, "Send a file or a text field.")
    return process(body, source)
