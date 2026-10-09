"""Turn an uploaded file into text."""
from __future__ import annotations

import io


class UnsupportedFile(Exception):
    pass


def to_text(filename: str, data: bytes) -> tuple[str, str]:
    """Return (text, source) where source is 'text', 'pdf' or 'ocr'."""
    name = filename.lower()
    if name.endswith((".txt", ".md", ".csv")):
        return data.decode("utf-8", errors="replace"), "text"
    if name.endswith(".pdf"):
        from pypdf import PdfReader
        text = "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(data)).pages)
        if not text.strip():
            raise UnsupportedFile("This PDF has no text layer (it looks scanned). Upload it as a PNG/JPG so it can be OCR'd.")
        return text, "pdf"
    if name.endswith((".png", ".jpg", ".jpeg")):
        try:
            import pytesseract
            from PIL import Image
            return pytesseract.image_to_string(Image.open(io.BytesIO(data))), "ocr"
        except Exception as exc:  # missing binary or unreadable image
            raise UnsupportedFile(
                "Image OCR needs the Tesseract binary (brew install tesseract / apt install tesseract-ocr). "
                f"Details: {exc}") from exc
    raise UnsupportedFile("Unsupported file type. Use .txt, .pdf, .png or .jpg.")
