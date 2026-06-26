"""Dashboard data: asset prices + sparklines (Yahoo) and news (Google News RSS)."""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from xml.etree import ElementTree as ET

import httpx

_cache: dict[str, tuple[float, Any]] = {}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) dashboard-nest/1.0"


def _get(key: str, ttl: int = 60):
    entry = _cache.get(key)
    if entry and time.time() - entry[0] < ttl:
        return entry[1]
    return None


def _set(key: str, value: Any):
    _cache[key] = (time.time(), value)


ASSETS = [
    ("SPY", "S&P 500"),
    ("GC=F", "Gold"),
    ("BTC-USD", "Bitcoin"),
    ("^IXIC", "Nasdaq"),
    ("^VIX", "VIX"),
    ("EWZ", "Brazil"),
    ("YPF", "YPF"),
    ("ARS=X", "USD/ARS"),
]


async def _yahoo_chart(client: httpx.AsyncClient, symbol: str, name: str) -> dict | None:
    try:
        r = await client.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"range": "1d", "interval": "5m"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()["chart"]["result"][0]
        meta = data["meta"]
        price = meta.get("regularMarketPrice")
        if price is None:
            return None
        q = (data.get("indicators", {}).get("quote") or [{}])[0]
        series = q.get("close") or q.get("open") or q.get("adjclose") or []
        closes = [c for c in series if c is not None]
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        if not prev and closes:
            prev = closes[0]
        change = round((price - prev) / prev * 100, 2) if prev else None
        spark = closes[:: max(1, len(closes) // 40)] if closes else [price]
        return {
            "symbol": symbol.replace("^", ""), "name": name,
            "price": price, "change": change, "spark": spark,
        }
    except Exception:
        return None


async def get_assets() -> list[dict]:
    cached = _get("assets", 60)
    if cached is not None:
        return cached
    out: list[dict] = []
    async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True) as client:
        for sym, name in ASSETS:  # sequential to avoid Yahoo rate-limiting
            r = await _yahoo_chart(client, sym, name)
            if r:
                out.append(r)
    _set("assets", out)
    return out


NEWS_FEEDS = {
    "infobae.com": {"outlet": "Infobae", "city": "Buenos Aires", "lat": -34.60, "lon": -58.38, "lang": "es-419"},
    "bloomberg.com": {"outlet": "Bloomberg", "city": "New York", "lat": 40.71, "lon": -74.01, "lang": "en-US"},
    "clarin.com": {"outlet": "Clarín", "city": "Buenos Aires", "lat": -34.60, "lon": -58.38, "lang": "es-419"},
    "lanacion.com.ar": {"outlet": "La Nación", "city": "Buenos Aires", "lat": -34.60, "lon": -58.38, "lang": "es-419"},
    "econojournal.com.ar": {"outlet": "Econojournal", "city": "Buenos Aires", "lat": -34.60, "lon": -58.38, "lang": "es-419"},
}


async def _fetch_feed(client: httpx.AsyncClient, domain: str) -> list[dict]:
    meta = NEWS_FEEDS[domain]
    url = "https://news.google.com/rss/search"
    params = {"q": f"site:{domain}", "hl": meta["lang"], "gl": "AR", "ceid": "AR:es_419"}
    try:
        r = await client.get(url, params=params, timeout=12)
        r.raise_for_status()
    except Exception:
        return []
    items = []
    try:
        root = ET.fromstring(r.content)
    except ET.ParseError:
        return []
    for el in root.iter("item"):
        title_el = el.find("title")
        link_el = el.find("link")
        date_el = el.find("pubDate")
        src_el = el.find("source")
        title = (title_el.text or "").strip() if title_el is not None and title_el.text else ""
        if not title:
            continue
        title = title.rsplit(" - ", 1)[0]
        link = (link_el.text or "").strip() if link_el is not None and link_el.text else ""
        pub = ""
        if date_el is not None and date_el.text:
            try:
                pub = parsedate_to_datetime(date_el.text).astimezone(timezone.utc).isoformat()
            except Exception:
                pub = ""
        items.append({
            "title": title,
            "url": link,
            "outlet": meta["outlet"],
            "domain": domain,
            "city": meta["city"],
            "lat": meta["lat"],
            "lon": meta["lon"],
            "seendate": pub,
        })
    return items


async def get_news() -> dict:
    cached = _get("news", 180)
    if cached is not None:
        return cached
    async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True) as client:
        groups = await asyncio.gather(
            *[_fetch_feed(client, d) for d in NEWS_FEEDS]
        )
    headlines = sorted(
        (it for g in groups for it in g[:12]),
        key=lambda x: x["seendate"] or "",
        reverse=True,
    )[:60]

    agg: dict[str, dict] = {}
    for h in headlines:
        city = h["city"]
        e = agg.setdefault(city, {
            "lat": h["lat"], "lon": h["lon"], "name": city, "count": 0, "outlets": set(),
        })
        e["count"] += 1
        e["outlets"].add(h["outlet"])
    points = [{**{k: v for k, v in p.items() if k != "outlets"},
               "outlets": ", ".join(sorted(p["outlets"]))}
              for p in agg.values()]
    points.sort(key=lambda x: x["count"], reverse=True)

    result = {"points": points, "headlines": headlines,
              "updated": datetime.now(timezone.utc).isoformat()}
    _set("news", result)
    return result


DOLAR_KEYS = [
    ("oficial", "Oficial"), ("blue", "Blue"), ("bolsa", "MEP"),
    ("contadoconliqui", "CCL"), ("tarjeta", "Tarjeta"),
]


async def get_dolar() -> dict:
    cached = _get("dolar", 300)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True) as client:
            data = (await client.get("https://dolarapi.com/v1/dolares", timeout=12)).json()
        by_casa = {x["casa"]: x for x in data}
        rates = []
        for casa, label in DOLAR_KEYS:
            x = by_casa.get(casa)
            if x:
                rates.append({
                    "key": casa, "label": label,
                    "compra": x.get("compra"), "venta": x.get("venta"),
                })
        result = {"rates": rates, "updated": datetime.now(timezone.utc).isoformat()}
    except Exception:
        result = {"rates": [], "error": True}
    _set("dolar", result)
    return result


async def get_flights() -> dict:
    cached = _get("flights", 30)
    if cached is not None:
        return cached
    try:
        async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True) as client:
            r = await client.get(
                "https://opensky-network.org/api/states/all",
                params={"lamin": -60, "lomin": -130, "lamax": 60, "lomax": -30},
                timeout=15,
            )
            d = r.json()
        flights = []
        for s in d.get("states") or []:
            lat, lon = s[6], s[5]
            if lat is None or lon is None:
                continue
            flights.append({
                "icao": s[0],
                "callsign": (s[1] or "").strip(),
                "lat": round(lat, 3), "lon": round(lon, 3),
                "alt": round(s[13] or s[7] or 0),
                "vel": round(s[9] or 0), "heading": round(s[10] or 0),
            })
        flights.sort(key=lambda f: f["icao"])
        result = {"flights": flights[:120],
                  "updated": datetime.now(timezone.utc).isoformat()}
    except Exception:
        result = {"flights": [], "error": True}
    _set("flights", result)
    return result


WMO = {
    0: ("Clear", "☀️"), 1: ("Mainly clear", "🌤️"), 2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"), 45: ("Fog", "🌫️"), 48: ("Rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"), 53: ("Drizzle", "🌦️"), 55: ("Heavy drizzle", "🌦️"),
    56: ("Freezing drizzle", "🌧️"), 57: ("Freezing drizzle", "🌧️"),
    61: ("Light rain", "🌧️"), 63: ("Rain", "🌧️"), 65: ("Heavy rain", "🌧️"),
    66: ("Freezing rain", "🌧️"), 67: ("Freezing rain", "🌧️"),
    71: ("Light snow", "🌨️"), 73: ("Snow", "🌨️"), 75: ("Heavy snow", "❄️"),
    77: ("Snow grains", "🌨️"), 80: ("Rain showers", "🌦️"), 81: ("Rain showers", "🌧️"),
    82: ("Violent showers", "⛈️"), 85: ("Snow showers", "🌨️"), 86: ("Snow showers", "❄️"),
    95: ("Thunderstorm", "⛈️"), 96: ("Thunderstorm", "⛈️"), 99: ("Thunderstorm", "⛈️"),
}


def _wmo(code):
    label, icon = WMO.get(int(code), ("—", "🌡️"))
    return {"label": label, "icon": icon}


async def get_weather() -> dict:
    cached = _get("weather", 600)
    if cached is not None:
        return cached
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": -34.6037, "longitude": -58.3816,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,"
                   "weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                 "precipitation_probability_max",
        "timezone": "America/Argentina/Buenos_Aires", "forecast_days": 7,
    }
    try:
        async with httpx.AsyncClient(headers={"User-Agent": UA}, follow_redirects=True) as client:
            data = (await client.get(url, params=params, timeout=12)).json()
        cur = data["current"]
        daily = data["daily"]
        w = _wmo(cur["weather_code"])
        days = []
        for i, d in enumerate(daily["time"]):
            dw = _wmo(daily["weather_code"][i])
            days.append({
                "date": d, "max": round(daily["temperature_2m_max"][i]),
                "min": round(daily["temperature_2m_min"][i]),
                "precip": daily["precipitation_probability_max"][i] or 0,
                "label": dw["label"], "icon": dw["icon"],
            })
        result = {
            "city": "Buenos Aires",
            "current": {
                "temp": round(cur["temperature_2m"]),
                "feels": round(cur["apparent_temperature"]),
                "humidity": cur["relative_humidity_2m"],
                "wind": round(cur["wind_speed_10m"]),
                "label": w["label"], "icon": w["icon"],
            },
            "daily": days,
            "updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception:
        result = {"city": "Buenos Aires", "current": None, "daily": [], "error": True}
    _set("weather", result)
    return result
