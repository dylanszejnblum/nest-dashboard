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
