import { Globe } from "./globe.js";
import { fetchAssets, fetchNews, fetchWeather } from "./data.js";
import {
  renderClock, renderAssets, renderMonthCalendar, renderWeather,
  setFeaturedPool, cycleFeatured, renderTicker,
} from "./panels.js";

const canvas = document.getElementById("globe-canvas");
let globe = null;
try {
  globe = new Globe(canvas);
} catch (e) {
  console.warn("WebGL globe unavailable on this device — running panels only", e);
  canvas.style.display = "none";
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
setInterval(renderClock, 1000 * 10);
setInterval(renderMonthCalendar, 1000 * 60 * 30);

async function refreshAssets() {
  const d = await fetchAssets();
  if (d) renderAssets(d);
}
async function refreshNews() {
  const d = await fetchNews();
  if (!d) return;
  if (globe) globe.setPoints(d.points || []);
  setFeaturedPool(d.headlines || []);
  renderTicker(d.headlines || []);
}
async function refreshWeather() {
  const d = await fetchWeather();
  if (d) renderWeather(d);
}

refreshAssets();
refreshNews();
refreshWeather();
setInterval(refreshAssets, 1000 * 60);
setInterval(refreshNews, 1000 * 60 * 5);
setInterval(refreshWeather, 1000 * 60 * 10);
setInterval(cycleFeatured, 1000 * 9);

window.addEventListener("resize", () => globe && globe.resize());
