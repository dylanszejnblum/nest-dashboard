import { fetchAssets, fetchNews, fetchWeather, fetchDolar, fetchFlights } from "./data.js";
import {
  renderClock, renderAssets, renderMonthCalendar, renderWeather, renderDolar,
  renderMarketStatus,
  setFeaturedPool, cycleFeatured, renderTicker,
} from "./panels.js";

const canvas = document.getElementById("globe-canvas");
let globe = null;
let latestNews = null;
let latestFlights = null;

function applyGlobeData() {
  if (!globe) return;
  if (latestNews) globe.setNews(latestNews);
  if (latestFlights) globe.setFlights(latestFlights);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (globe) {
    globe.update(dt, now);
    globe.render();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

renderClock();
renderMonthCalendar();
renderMarketStatus();
setInterval(renderClock, 1000 * 10);
setInterval(renderMonthCalendar, 1000 * 60 * 30);
setInterval(renderMarketStatus, 1000 * 60);

async function refreshAssets() {
  const d = await fetchAssets();
  if (d) renderAssets(d);
}
async function refreshNews() {
  const d = await fetchNews();
  if (!d) return;
  latestNews = d.points || [];
  setFeaturedPool(d.headlines || []);
  renderTicker(d.headlines || []);
  if (globe) globe.setNews(latestNews);
}
async function refreshWeather() {
  const d = await fetchWeather();
  if (d) renderWeather(d);
}
async function refreshDolar() {
  const d = await fetchDolar();
  if (d) renderDolar(d);
}
async function refreshFlights() {
  const d = await fetchFlights();
  if (!d) return;
  latestFlights = d.flights || [];
  if (globe) globe.setFlights(latestFlights);
}

refreshAssets();
refreshNews();
refreshWeather();
refreshDolar();
refreshFlights();
setInterval(refreshAssets, 1000 * 60);
setInterval(refreshNews, 1000 * 60 * 5);
setInterval(refreshWeather, 1000 * 60 * 10);
setInterval(refreshDolar, 1000 * 60 * 5);
setInterval(refreshFlights, 1000 * 25);
setInterval(cycleFeatured, 1000 * 9);

// Lazy-load the heavy 3D globe as a separate chunk AFTER first paint,
// so the panels render instantly on constrained devices (e.g. Nest Hub).
window.addEventListener("load", () => {
  setTimeout(() => {
    import("./globe.js")
      .then((m) => {
        globe = new m.Globe(canvas);
        applyGlobeData();
      })
      .catch((e) => {
        console.warn("3D globe chunk failed — running panels only", e);
        canvas.style.display = "none";
      });
  }, 600);
});

window.addEventListener("resize", () => globe && globe.resize());
