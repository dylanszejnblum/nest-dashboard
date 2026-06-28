"""FastAPI app: serves the built frontend + data API."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from services import get_assets, get_news, get_weather, get_dolar, get_flights

ROOT = Path(__file__).resolve().parent
DIST = ROOT.parent / "frontend" / "dist"
DEVICE_HTML = ROOT / "device.html"

app = FastAPI(title="Nest Dashboard")


@app.get("/device")
async def device():
    """Round 240x240 LCD view (point the ESP32's headless Chrome here)."""
    return FileResponse(DEVICE_HTML)


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    return {"name": os.getenv("NAME", "Dylan")}


@app.get("/api/assets")
async def assets():
    return JSONResponse(await get_assets())


@app.get("/api/news")
async def news():
    return JSONResponse(await get_news())


@app.get("/api/weather")
async def weather():
    return JSONResponse(await get_weather())


@app.get("/api/dolar")
async def dolar():
    return JSONResponse(await get_dolar())


@app.get("/api/flights")
async def flights():
    return JSONResponse(await get_flights())


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/")
    async def index(device: int = 0):
        if device:
            return FileResponse(DEVICE_HTML)
        return FileResponse(DIST / "index.html")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        candidate = DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
