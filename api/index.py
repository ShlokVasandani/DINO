"""Vercel entrypoint: serve the FastAPI app from backend/ under /api."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from dino.api import app  # noqa: E402,F401
