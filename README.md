# Nest Dashboard

A Tron-style dashboard for a **Google Nest Hub (2nd Gen, 1024×600)** — built to live on a kitchen counter or desk. A glowing `three-globe` shows live news hotspots; glass panels show markets with sparkline charts, a rotating news feed, and a month calendar.

![layout](https://img.shields.io/badge/resolution-1024x600-blue) ![stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20Three.js-9cf)

## Features

- **Tron globe** (`three-globe`): cyan hex-polygon earth, glowing news hotspots with rippling rings, animated data arcs, bloom glow, slow auto-rotate (drag to spin).
- **Markets** — sparkline charts + live prices for: `SPY`, `GOLD` (GC=F), `BTC`, `NASDAQ` (^IXIC), `VIX`, `EWZ`, `YPF`. No API key (Yahoo Finance). Refreshes every 60s.
- **News** — Bloomberg, Infobae, La Nación, Clarín, Econojournal via Google News RSS; rotating featured headline + scrolling ticker. Globe points sized by per-city article volume.
- **Calendar** — month grid with today highlighted. Big clock + date.

## Project structure

```
dashboard-nest/
├─ backend/            FastAPI app (data API + serves the built frontend)
│  ├─ main.py
│  ├─ services.py      asset + news fetching
│  └─ requirements.txt
├─ frontend/           Vite + Three.js + three-globe
│  ├─ index.html
│  ├─ vite.config.js
│  └─ src/             globe.js, panels.js, data.js, util.js, style.css
│  └─ public/geo/      countries.geojson (hex polygons)
├─ Dockerfile          multi-stage: node builds frontend, python serves
└─ .dockerignore
```

## Run locally

**Backend** (serves API + the built frontend):
```sh
cd backend
python -m venv ../.venv && ../.venv/bin/pip install -r requirements.txt
../.venv/bin/uvicorn main:app --reload --port 8000
```

**Frontend dev** (hot reload, proxies `/api` → `127.0.0.1:8000`):
```sh
cd frontend
npm install
npm run dev        # http://localhost:5173
```

For a production-style build served by the backend:
```sh
cd frontend && npm run build      # outputs frontend/dist
cd ../backend && ../.venv/bin/uvicorn main:app --port 8000   # http://localhost:8000
```

## Configuration

The app needs no API keys or env vars to run. The container port is configurable:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `4337`  | Port uvicorn listens on (avoid collisions with the host) |

## Docker

```sh
docker build -t nest-dashboard .
docker run -p 4337:4337 nest-dashboard
# open http://localhost:4337
```

## Deploy on Coolify

1. New Resource → **Public Repository** → your repo.
2. Build pack: **Dockerfile** (auto-detected).
3. **Base Directory**: `/` (repo root — leave empty).
4. **Port**: `4337` (must match the container's `PORT`).
5. Assign a domain — Coolify provisions HTTPS automatically (required for Cast). Example: `https://nest.example.com`.

That HTTPS URL is your **Cast receiver URL**.

## Cast it to the Nest Hub

The Nest Hub can't render arbitrary HTML as media; it runs a registered **Custom Receiver** app that loads your dashboard URL.

1. Register as a Cast developer ($5 one-time): https://cast.google.com/publish
2. **Add Application → Custom Receiver**. Name it, set **Receiver Application URL** = your Coolify HTTPS URL.
3. Copy the **Application ID** (12-char hex).
4. **Register the Nest Hub as a test device** (required for unpublished receivers): Console → *Add test device* → enter the Hub's serial (on its base / Google Home app). Restart the Hub and wait ~15 min.
5. Launch it on the Hub (LAN Cast) — e.g. with `cast_stream.py app <APP_ID> -d <HUB_IP>`, with a keep-alive loop so it survives the Hub's ~10-min idle timeout.

## Data sources

- **Markets**: Yahoo Finance chart API (no key) — intraday candles for the sparkline.
- **News**: Google News RSS (`site:` queries) for the five outlets above.
- **Globe**: world country polygons from Natural Earth (bundled in `public/geo`).
