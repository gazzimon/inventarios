/**
 * Climate TRACE – Web-compatible provincial total
 * Replica el cálculo de la web (assets visibles)
 *
 * Provincia: Misiones
 * Año: 2024
 * Gas: co2e_100yr
 */

import fetch from "node-fetch";
import fs from "fs";

const BASE = "https://api.climatetrace.org";
const PROVINCE = "Misiones";
const YEAR = 2024;
const GAS = "co2e_100yr";

const LIMIT = 500;

/* ------------------ helpers geométricos ------------------ */

function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInPolygon(point, polygon) {
  if (!isPointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (isPointInRing(point, polygon[i])) return false;
  }
  return true;
}

function isPointInGeometry(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some(p => isPointInPolygon(point, p));
  }
  return false;
}

/* ------------------ fetch helpers ------------------ */

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

/* ------------------ main ------------------ */

async function run() {
  console.log("🔎 Buscando adminId de provincia…");

  const admins = await fetchJson(
    `${BASE}/v6/admins/search?name=${encodeURIComponent(PROVINCE)}&level=1`
  );

  const admin = admins.find(a => a.Gid0 === "ARG");
  if (!admin) throw new Error("Provincia no encontrada");

  const adminId = admin.Id;
  console.log(`✔ Provincia: ${admin.Name} (${adminId})`);

  console.log("🗺️ Descargando geometría oficial…");
  const geo = await fetchJson(`${BASE}/v6/admins/${adminId}/geojson`);
  const geometry = geo.features[0].geometry;

  console.log("📦 Descargando assets y filtrando…");

  let offset = 0;
  let total = 0;
  let assetsCount = 0;

  while (true) {
    const url =
      `${BASE}/v6/assets?countries=ARG&year=${YEAR}&limit=${LIMIT}&offset=${offset}`;

    const data = await fetchJson(url);
    const assets = data.assets || [];
    if (assets.length === 0) break;

    for (const asset of assets) {
      const point = asset?.Centroid?.Geometry;
      if (!Array.isArray(point)) continue;

      if (!isPointInGeometry(point, geometry)) continue;

      const rec = asset.EmissionsSummary?.find(e => e.Gas === GAS);
      const value = Number(rec?.EmissionsQuantity || 0);
      if (!Number.isFinite(value) || value <= 0) continue;

      total += value;
      assetsCount++;
    }

    offset += LIMIT;
    if (assets.length < LIMIT) break;
  }

  console.log("──────────── RESULTADO ────────────");
  console.log(`Provincia: ${PROVINCE}`);
  console.log(`Año: ${YEAR}`);
  console.log(`Gas: ${GAS}`);
  console.log(`Assets contados: ${assetsCount}`);
  console.log(`TOTAL: ${(total / 1e6).toFixed(2)} Mt CO₂e`);
  console.log("───────────────────────────────────");
}

run().catch(err => {
  console.error("❌ Error:", err.message);
});
