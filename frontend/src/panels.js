import { fmtPrice, fmtChange, sparklinePath } from "./util.js";

const $ = (id) => document.getElementById(id);

export function renderClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  $("date").textContent = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

let _name = "Dylan";
export async function renderGreeting() {
  try {
    const r = await fetch("/api/config");
    if (r.ok) _name = (await r.json()).name || _name;
  } catch (e) { /* keep default */ }
  const h = new Date().getHours();
  const part = h < 6 ? "Buenas noches" : h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
  $("greeting").textContent = `${part}, ${_name}`;
}

export function renderAssets(assets) {
  const list = $("market-list");
  list.innerHTML = (assets || [])
    .slice(0, 5)
    .map((a) => {
      const c = fmtChange(a.change);
      const cls = c.cls || "up";
      const path = sparklinePath(a.spark, 60, 12);
      const stroke = cls === "down" ? "var(--down)" : "var(--up)";
      return `
      <div class="asset-row">
        <div class="a-label">
          <span class="a-name">${a.name}</span>
          <span class="a-sym">${a.symbol}</span>
        </div>
        <svg class="spark" viewBox="0 0 60 12" preserveAspectRatio="none">
          <path d="${path}" fill="none" stroke="${stroke}" stroke-width="1.2"
            stroke-linejoin="round" stroke-linecap="round" />
        </svg>
        <div class="a-right">
          <div class="m-price">${fmtPrice(a.price)}</div>
          <div class="m-chg ${cls}">${c.txt}</div>
        </div>
      </div>`;
    })
    .join("");
}

export function renderWeather(data) {
  if (!data || data.error || !data.current) return;
  const c = data.current;
  $("w-temp").innerHTML = `${c.temp}° <span class="w-icon">${c.icon}</span>`;
  $("w-meta").textContent = `${c.label} · ${c.wind} km/h · ${c.humidity}%`;
  const dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  $("weather-week").innerHTML = (data.daily || [])
    .slice(0, 5)
    .map((d) => {
      const dt = new Date(d.date + "T12:00:00");
      const label = isNaN(dt) ? "" : dow[dt.getDay()];
      return `
      <div class="w-day">
        <span class="w-dow">${label}</span>
        <span class="w-di">${d.icon}</span>
        <span class="w-hi">${d.max}°</span>
        <span class="w-lo">${d.min}°</span>
      </div>`;
    })
    .join("");
}

export function renderDolar(data) {
  const grid = $("dolar-grid");
  if (!data || data.error || !data.rates || !data.rates.length) return;
  grid.innerHTML = data.rates.map((r) => `
    <div class="d-row">
      <span class="d-label">${r.label}</span>
      <span class="d-val">$${r.venta ? r.venta.toFixed(0) : "—"}</span>
    </div>`).join("");
}

export function renderMarketStatus() {
  const el = $("mkstatus");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const wd = parts.weekday;
  const mins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
  const weekend = wd === "Sat" || wd === "Sun";
  const inSession = mins >= 570 && mins < 960; // 9:30–16:00 ET
  const open = !weekend && inSession;
  el.className = "mkstatus " + (open ? "open" : "closed");
  el.innerHTML = `<span class="mkdot"></span>NYSE ${open ? "OPEN" : "CLOSED"}`;
}

let featuredIdx = 0;
let featuredPool = [];
export function setFeaturedPool(headlines) {
  featuredPool = headlines.slice(0, 12);
  featuredIdx = 0;
  cycleFeatured();
}
export function cycleFeatured() {
  if (!featuredPool.length) return;
  const h = featuredPool[featuredIdx % featuredPool.length];
  $("featured-title").textContent = h.title;
  $("featured-domain").textContent =
    (h.outlet ? h.outlet.toUpperCase() + " · " : "") + timeAgo(h.seendate);
  featuredIdx++;
}

function timeAgo(seendate) {
  if (!seendate) return "";
  const d = new Date(seendate);
  if (isNaN(d)) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
