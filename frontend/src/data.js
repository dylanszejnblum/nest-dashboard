async function getJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} -> ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn("fetch failed", url, e);
    return null;
  }
}

export const fetchAssets = () => getJSON("/api/assets");
export const fetchNews = () => getJSON("/api/news");
export const fetchWeather = () => getJSON("/api/weather");
