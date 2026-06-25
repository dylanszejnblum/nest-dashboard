export function latLonToVec3(lat, lon, radius) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const x = radius * Math.cos(latR) * Math.cos(lonR);
  const y = radius * Math.sin(latR);
  const z = -radius * Math.cos(latR) * Math.sin(lonR);
  return { x, y, z };
}

export function sparklinePath(values, width, height, pad = 1) {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const dx = (width - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * dx;
      const y = pad + (height - pad * 2) * (1 - (v - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function fmtPrice(v) {
  if (v == null || isNaN(v)) return "—";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function fmtChange(v) {
  if (v == null || isNaN(v)) return { txt: "—", cls: "" };
  const sign = v >= 0 ? "+" : "";
  return { txt: `${sign}${v.toFixed(2)}%`, cls: v >= 0 ? "up" : "down" };
}

export function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

export function lerp(a, b, t) { return a + (b - a) * t; }
