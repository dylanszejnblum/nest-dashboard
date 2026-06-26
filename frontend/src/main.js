import { WorldMap } from "./map.js";
import { fetchAssets, fetchNews, fetchWeather, fetchDolar, fetchFlights } from "./data.js";
import {
  renderClock, renderAssets, renderMonthCalendar, renderWeather, renderDolar,
  renderMarketStatus, renderGreeting,
  setFeaturedPool, cycleFeatured, renderTicker,
} from "./panels.js";

const canvas = document.getElementById("map-canvas");
let map = null;
try {
  map = new WorldMap(canvas);
} catch (e) {
  console.warn("map unavailable", e);
}

let flightCount = 0;

renderClock();
renderGreeting();
renderMonthCalendar();
renderMarketStatus();
setInterval(renderClock, 1000 * 10);
setInterval(renderGreeting, 1000 * 60 * 5);
setInterval(renderMonthCalendar, 1000 * 60 * 30);
setInterval(renderMarketStatus, 1000 * 60);

async function refreshAssets() {
  const d = await fetchAssets();
  if (d) renderAssets(d);
}
async function refreshNews() {
  const d = await fetchNews();
  if (!d) return;
  if (map) map.setNews(d.points || []);
  setFeaturedPool(d.headlines || []);
  renderTicker(d.headlines || []);
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
  flightCount = (d.flights || []).length;
  const mc = document.getElementById("map-count");
  if (mc) mc.textContent = `${flightCount} flights · live`;
  if (map) map.setFlights(d.flights || []);
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
