/**
 * AFOLU-only diagnostic – Misiones
 * Climate TRACE v6
 *
 * Objetivo:
 * - Ver emisiones AFOLU brutas
 * - Ver net forest/grassland/wetland carbon stock change
 * - Calcular AFOLU neto
 */

import fetch from "node-fetch";
import fs from "fs";

const BASE = "https://api.climatetrace.org";
const YEAR = 2022;               // cambialo si querés
const GAS = "co2e_100yr";
const LIMIT = 500;

/* ===================== helpers geom ===================== */

function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
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

/* ===================== fetch ===================== */

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

/* ===================== AFOLU logic ===================== */

function isNetStockChange(sector) {
  const v = String(sector || "").toLowerCase();
  return v.includes("net") && v.includes("carbon stock");
}

function isAfolu(sector) {
  const v = String(sector || "").toLowerCase();
  return (
    v.includes("forest") ||
    v.includes("land") ||
    v.includes("fire") ||
    v.includes("wetland") ||
    v.includes("cropland") ||
    v.includes("shrubgrass") ||
    v.includes("reservoir")
  );
}

/* ===================== main ===================== */

async function run() {
  console.log("📍 Descargando geometría de Misiones…");
  const admins = await fetchJson(
    `${BASE}/v6/admins/search?name=Misiones&level=1`
  );
  const misiones = admins.find(a => a.Gid0 === "ARG");
  if (!misiones) throw new Error("Misiones no encontrada");

  const geo = await fetchJson(`${BASE}/v6/admins/${misiones.Id}/geojson`);
  const geometry = geo.features[0].geometry;

  let offset = 0;
  let afoluEmissions = 0;
  let afoluNetStock = 0;

  const breakdown = {};

  console.log("📦 Recorriendo assets…");

  while (true) {
    const url = `${BASE}/v6/assets?countries=ARG&year=${YEAR}&limit=${LIMIT}&offset=${offset}`;
    const data = await fetchJson(url);
    const assets = data.assets || [];
    if (assets.length === 0) break;

    for (const asset of assets) {
      const point = asset?.Centroid?.Geometry;
      if (!Array.isArray(point)) continue;
      if (!isPointInGeometry(point, geometry)) continue;

      const sector = asset?.Sector;
      if (!isAfolu(sector)) continue;

      const rec = asset?.EmissionsSummary?.find(e => e.Gas === GAS);
      const value = Number(rec?.EmissionsQuantity || 0);
      if (!Number.isFinite(value) || value === 0) continue;

      if (!breakdown[sector]) breakdown[sector] = 0;
      breakdown[sector] += value;

      if (isNetStockChange(sector)) {
        afoluNetStock += value; // puede ser negativo
      } else {
        afoluEmissions += value;
      }
    }

    offset += LIMIT;
    if (assets.length < LIMIT) break;
  }

  console.log("────────── RESULTADOS AFOLU ──────────");
  Object.entries(breakdown)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([k, v]) => {
      console.log(`${k.padEnd(45)} ${(v / 1e6).toFixed(2)} Mt`);
    });

  console.log("─────────────────────────────────────");
  console.log(`AFOLU emisiones brutas: ${(afoluEmissions / 1e6).toFixed(2)} Mt`);
  console.log(`AFOLU net stock change: ${(afoluNetStock / 1e6).toFixed(2)} Mt`);
  console.log(
    `AFOLU NETO: ${((afoluEmissions + afoluNetStock) / 1e6).toFixed(2)} Mt`
  );
  console.log("─────────────────────────────────────");
}

run().catch(err => console.error("❌", err.message));
