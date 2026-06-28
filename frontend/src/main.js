import { fetchAssets, fetchNews, fetchWeather, fetchDolar } from "./data.js";
import {
  renderClock, renderAssets, renderWeather, renderDolar,
  renderMarketStatus, renderGreeting,
  setFeaturedPool, cycleFeatured,
} from "./panels.js";

const SCREENS = Array.from(document.querySelectorAll(".screen"));
const DOTS = Array.from(document.querySelectorAll(".pager .pd"));
let idx = 0;

function show(i) {
  idx = i;
  SCREENS.forEach((s, n) => s.classList.toggle("active", n === i));
  DOTS.forEach((d, n) => d.classList.toggle("on", n === i));
}

renderClock();
renderGreeting();
renderMarketStatus();
setInterval(renderClock, 1000 * 10);
setInterval(renderGreeting, 1000 * 60 * 5);
setInterval(renderMarketStatus, 1000 * 60);

async function refreshAssets() {
  const d = await fetchAssets();
  if (d) renderAssets(d);
}
async function refreshNews() {
  const d = await fetchNews();
  if (!d) return;
  setFeaturedPool(d.headlines || []);
}
async function refreshWeather() {
  const d = await fetchWeather();
  if (d) renderWeather(d);
}
async function refreshDolar() {
  const d = await fetchDolar();
  if (d) renderDolar(d);
}

refreshAssets();
refreshNews();
refreshWeather();
refreshDolar();
setInterval(refreshAssets, 1000 * 60);
setInterval(refreshNews, 1000 * 60 * 5);
setInterval(refreshWeather, 1000 * 60 * 10);
setInterval(refreshDolar, 1000 * 60 * 5);
setInterval(cycleFeatured, 1000 * 9);

show(0);
setInterval(() => show((idx + 1) % SCREENS.length), 1000 * 10);
