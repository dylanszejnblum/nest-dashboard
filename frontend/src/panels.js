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

export function renderAssets(assets) {
  const list = $("market-list");
  list.innerHTML = (assets || [])
    .map((a) => {
      const c = fmtChange(a.change);
      const cls = c.cls || "up";
      const path = sparklinePath(a.spark, 80, 26);
      const stroke = cls === "down" ? "var(--down)" : "var(--up)";
      return `
      <div class="asset-row">
        <div class="a-label">
          <span class="a-name">${a.name}</span>
          <span class="a-sym">${a.symbol}</span>
        </div>
        <svg class="spark" viewBox="0 0 80 26" preserveAspectRatio="none">
          <path d="${path}" fill="none" stroke="${stroke}" stroke-width="1.6"
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
  const card = $("weather-card");
  if (!data || data.error || !data.current) {
    card.style.display = "none";
    return;
  }
  const c = data.current;
  $("w-temp").innerHTML = `${c.temp}° <span class="w-icon">${c.icon}</span>`;
  $("w-meta").textContent = `${c.label} · ${c.wind} km/h · ${c.humidity}%`;
  const today = new Date().getDay();
  const dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  $("weather-week").innerHTML = (data.daily || [])
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
  const card = $("dolar-card");
  if (!data || data.error || !data.rates || !data.rates.length) {
    card.style.display = "none";
    return;
  }
  $("dolar-grid").innerHTML = data.rates.map((r) => `
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

export function renderMonthCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const grid = $("cal-grid");
  const title = $("cal-title");
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  title.textContent = monthName;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const head = ["S", "M", "T", "W", "T", "F", "S"];
  let cells = head.map((d) => `<span class="cal-dow">${d}</span>`).join("");
  for (let i = 0; i < firstDay; i++) cells += `<span class="cal-cell empty"></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const today = d === now.getDate() ? " today" : "";
    cells += `<span class="cal-cell${today}">${d}</span>`;
  }
  grid.innerHTML = cells;
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

export function renderTicker(headlines) {
  const items = headlines.slice(0, 20).map(
    (h) => `<span class="t-item"><b>${(h.outlet || "•").toUpperCase()}</b>${escapeHtml(h.title)}</span>`
  );
  $("ticker").innerHTML = items.join("");
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
