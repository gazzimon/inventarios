import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

const BASE_URL = "https://api.climatetrace.org";
const DEFAULT_YEAR = 2022;
const DEFAULT_GAS = "co2e_100yr";

const IPCC_SECTORS = {
  "1": "Energy",
  "2": "IPPU",
  "3": "AFOLU",
  "4": "Waste",
  "X": "Other"
};

const UNMAPPED_SECTORS = new Set();
const ARG_PROVINCES_CACHE = {
  ts: 0,
  items: []
};
const PROVINCE_ALIAS = {
  "cordoba": "Córdoba",
  "entre rios": "Entre Ríos",
  "rio negro": "Río Negro",
  "neuquen": "Neuquén",
  "tucuman": "Tucumán",
  "jujuy": "Jujuy",
  "misiones": "Misiones",
  "salta": "Salta",
  "chaco": "Chaco",
  "chubut": "Chubut",
  "corrientes": "Corrientes",
  "formosa": "Formosa",
  "la pampa": "La Pampa",
  "la rioja": "La Rioja",
  "mendoza": "Mendoza",
  "san juan": "San Juan",
  "san luis": "San Luis",
  "santa cruz": "Santa Cruz",
  "santa fe": "Santa Fe",
  "santiago del estero": "Santiago del Estero",
  "tierra del fuego": "Tierra del Fuego",
  "catamarca": "Catamarca",
  "buenos aires": "Buenos Aires"
};

const IPCC_METADATA = {
  "1": {
    name: "Energy",
    tier: "Tier 2",
    notes: "Fuel-based estimates using proxy activity data"
  },
  "2": {
    name: "IPPU",
    tier: "Tier 1–2",
    notes: "Process-based emissions, limited facility-level resolution"
  },
  "3": {
    name: "AFOLU",
    tier: "Tier 2–3",
    notes: "Remote sensing + land-use models"
  },
  "4": {
    name: "Waste",
    tier: "Tier 1",
    notes: "Population-based default factors"
  }
};

const IPCC_SUBSECTORS = {
  "1A": "Stationary Energy",
  "1B": "Transport",
  "1C": "Fugitive Emissions",
  "2A": "Mineral Industry",
  "2B": "Chemical Industry",
  "2C": "Metal Industry",
  "2D": "Other Manufacturing",
  "2F": "Ozone Depleting Substances",
  "3A": "Livestock",
  "3B": "Cropland",
  "3C": "Fires and Land Use Change",
  "3D": "Other AFOLU",
  "4A": "Solid Waste",
  "4B": "Wastewater",
  "4C": "Incineration and Open Burning of Waste"
};

const IPCC_HIERARCHY = {
  "road-transportation": {
    sector: "1",
    parent: "1A",
    group: "1A3",
    code: "1A3b",
    name: "Road Transportation"
  },
  "domestic-aviation": {
    sector: "1",
    parent: "1A",
    group: "1A3",
    code: "1A3a",
    name: "Domestic Aviation"
  },
  "domestic-shipping": {
    sector: "1",
    parent: "1A",
    group: "1A3",
    code: "1A3d",
    name: "Domestic Navigation"
  },
  "electricity-generation": {
    sector: "1",
    parent: "1A",
    group: "1A1",
    code: "1A1a",
    name: "Electricity Generation"
  },
  "enteric-fermentation": {
    sector: "3",
    parent: "3A",
    group: "3A1",
    code: "3A1",
    name: "Enteric Fermentation"
  },
  "forest-land-fires": {
    sector: "3",
    parent: "3B",
    group: "3B2",
    code: "3B2",
    name: "Forest Land Fires"
  }
};
/**
 * Climate TRACE → IPCC mapping
 * Basado en IPCC 2006 / AR6 – inventarios subnacionales
 */
const IPCC_MAPPING = [
  // ======================
  // 1 – ENERGY
  // ======================

  // 1A – Fuel Combustion (Stationary)
  { match: "electricity-generation", sector: "1", subsector: "1A" },
  { match: "residential-onsite-fuel-usage", sector: "1", subsector: "1A" },
  { match: "non-residential-onsite-fuel-usage", sector: "1", subsector: "1A" },
  { match: "manufacturing", sector: "1", subsector: "1A" },
  { match: "oil-and-gas-refining", sector: "1", subsector: "1A" },

  // 1A3 – Transport
  { match: "road-transportation", sector: "1", subsector: "1B" },
  { match: "rail", sector: "1", subsector: "1B" },
  { match: "domestic-aviation", sector: "1", subsector: "1B" },
  { match: "domestic-shipping", sector: "1", subsector: "1B" },
  { match: "international-aviation", sector: "1", subsector: "1B" },
  { match: "international-shipping", sector: "1", subsector: "1B" },
  { match: "other-energy-use", sector: "1", subsector: "1A" },

  // 1B – Fugitive emissions
  { match: "oil-and-gas-production", sector: "1", subsector: "1C" },
  { match: "oil-and-gas-transport", sector: "1", subsector: "1C" },
  { match: "coal-mining", sector: "1", subsector: "1C" },

  // ======================
  // 2 – IPPU
  // ======================

  // 2A – Mineral Industry
  { match: "cement", sector: "2", subsector: "2A" },
  { match: "lime", sector: "2", subsector: "2A" },
  { match: "glass", sector: "2", subsector: "2A" },

  // 2B – Chemical Industry
  { match: "chemical", sector: "2", subsector: "2B" },
  { match: "petrochemical", sector: "2", subsector: "2B" },
  { match: "fluorinated-gases", sector: "2", subsector: "2F" },

  // 2C – Metal Industry
  { match: "iron", sector: "2", subsector: "2C" },
  { match: "steel", sector: "2", subsector: "2C" },
  { match: "aluminum", sector: "2", subsector: "2C" },
  { match: "bauxite-mining", sector: "2", subsector: "2C" },
  { match: "copper-mining", sector: "2", subsector: "2C" },
  { match: "other-metals", sector: "2", subsector: "2C" },

  // 2D – Other Manufacturing
  { match: "pulp-and-paper", sector: "2", subsector: "2D" },
  { match: "textiles", sector: "2", subsector: "2D" },
  { match: "food-beverage-tobacco", sector: "2", subsector: "2D" },
  { match: "other-manufacturing", sector: "2", subsector: "2D" },

  // ======================
  // 3 – AFOLU
  // ======================

  // 3A – Livestock
  { match: "enteric-fermentation", sector: "3", subsector: "3A" },
  { match: "manure-management", sector: "3", subsector: "3A" },
  { match: "manure-left-on-pasture", sector: "3", subsector: "3A" },

  // 3B – Cropland / Land
  { match: "rice-cultivation", sector: "3", subsector: "3B" },
  { match: "synthetic-fertilizer", sector: "3", subsector: "3B" },
  { match: "crop-residues", sector: "3", subsector: "3B" },
  { match: "manure-applied-to-soils", sector: "3", subsector: "3B" },
  { match: "other-agricultural-soil-emissions", sector: "3", subsector: "3D" },

  // 3C – Forest & fires
  { match: "forest-land", sector: "3", subsector: "3C" },
  { match: "cropland-fires", sector: "3", subsector: "3C" },
  { match: "shrubgrass-fires", sector: "3", subsector: "3C" },
  { match: "wetland-fires", sector: "3", subsector: "3C" },
  { match: "forest-land-clearing", sector: "3", subsector: "3B" },
  { match: "forest-land-degradation", sector: "3", subsector: "3B" },

  // 3D – Other AFOLU
  { match: "water-reservoirs", sector: "3", subsector: "3D" },

  // ======================
  // 4 – WASTE
  // ======================

  { match: "solid-waste-disposal", sector: "4", subsector: "4A" },
  { match: "wastewater", sector: "4", subsector: "4B" },
  { match: "incineration-and-open-burning-of-waste", sector: "4", subsector: "4C" },
  { match: "industrial-wastewater", sector: "4", subsector: "4B" }
];


function resolveYears(query) {
  if (query.years) return String(query.years);
  if (query.year) return String(query.year);
  return String(DEFAULT_YEAR);
}

function pickAdminCandidate(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const byArgentina = items.find((item) => {
    const fullName = typeof item?.FullName === "string" ? item.FullName : "";
    const gid0 = typeof item?.Gid0 === "string" ? item.Gid0 : "";
    return gid0.toUpperCase() === "ARG" || fullName.includes(", ARG");
  });
  return byArgentina || items[0];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    const error = new Error(
      `Climate TRACE API error (${response.status})${detail ? `: ${detail}` : ""}`
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function searchAdminId(name, level) {
  const url = new URL(`${BASE_URL}/v6/admins/search`);
  url.search = new URLSearchParams({
    name,
    level: String(level),
    limit: "10"
  });

  const items = await fetchJson(url);
  const candidate = pickAdminCandidate(items);

  const adminId = candidate?.Id || candidate?.id;
  if (!adminId) {
    const error = new Error("Administrative area not found");
    error.status = 404;
    throw error;
  }

  return adminId;
}

async function fetchEmissions({ adminId, years, gas }) {
  const url = new URL(`${BASE_URL}/v6/assets/emissions`);
  const params = new URLSearchParams({
    adminId: String(adminId),
    years: String(years)
  });
  if (gas) params.set("gas", String(gas));
  url.search = params;

  return fetchJson(url);
}

function normalizeCityName(name) {
  return String(name || "").trim();
}

function normalizeNameForMatch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeProvinceName(value) {
  return normalizeNameForMatch(value)
    .replace(/\s+province$/i, "")
    .replace(/\s+provincia$/i, "")
    .trim();
}

function resolveProvinceAlias(value) {
  const key = normalizeProvinceName(value);
  return PROVINCE_ALIAS[key] || null;
}

function isArgentinaProvince(item) {
  return item?.Gid0 === "ARG" && Number(item?.Level) === 1;
}

function isArgentinaDepartment(item) {
  return item?.Gid0 === "ARG" && Number(item?.Level) === 2;
}

function isArgentinaAdminLevel2(item) {
  if (!item || item.Gid0 !== "ARG") return false;
  const name = normalizeCityName(item.Name);
  const fullName = normalizeCityName(item.FullName);
  if (!name || !fullName) return false;
  return (
    fullName.startsWith(`${name} Department,`) ||
    fullName.startsWith(`${name},`)
  );
}

async function fetchAdminSearch({ name, level, limit, bbox, offset }) {
  const url = new URL(`${BASE_URL}/v6/admins/search`);
  const params = new URLSearchParams({ limit: String(limit) });
  if (name) {
    params.set("name", name);
  }
  if (level !== undefined && level !== null) {
    params.set("level", String(level));
  }
  if (offset !== undefined && offset !== null) {
    params.set("offset", String(offset));
  }
  if (Array.isArray(bbox) && bbox.length === 4) {
    params.set("bbox", bbox.join(","));
  }
  url.search = params;
  return fetchJson(url);
}

async function fetchAdminById(adminId) {
  const url = new URL(`${BASE_URL}/v6/admins/${adminId}/geojson`);
  const data = await fetchJson(url);
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  const props = feature?.properties || {};
  const geometry = feature?.geometry || null;
  return {
    id: props.gadm_id || adminId,
    name: props.name || adminId,
    fullName: props.full_name || null,
    country: props.gid0 || "ARG",
    level: props.level ?? null,
    gid1: props.gid1 || null,
    bbox: geometry ? computeBboxFromGeometry(geometry) : null
  };
}

async function listArgentinaProvinces() {
  const now = Date.now();
  if (ARG_PROVINCES_CACHE.items.length > 0 && now - ARG_PROVINCES_CACHE.ts < 6 * 60 * 60 * 1000) {
    return ARG_PROVINCES_CACHE.items;
  }

  const argentina = await fetchAdminById("ARG");
  if (!argentina?.bbox) return [];

  const provinces = [];
  const seen = new Set();
  const limit = 200;

  for (let offset = 0; offset < 2000; offset += limit) {
    const items = await fetchAdminSearch({
      name: "",
      level: 1,
      limit,
      offset,
      bbox: argentina.bbox
    });
    if (!Array.isArray(items) || items.length === 0) break;
    items.forEach((item) => {
      if (item?.Gid0 !== "ARG" || Number(item?.Level) !== 1) return;
      const id = item.Id || item.id;
      if (!id || seen.has(id)) return;
      seen.add(id);
      provinces.push(item);
    });
    if (items.length < limit) break;
  }

  if (provinces.length > 0) {
    ARG_PROVINCES_CACHE.items = provinces;
    ARG_PROVINCES_CACHE.ts = now;
  }
  return provinces;
}

async function listDepartmentsByProvince(province) {
  const provinceItems = await fetchAdminSearch({ name: province, level: 1, limit: 20 });
  let provinceCandidate = (Array.isArray(provinceItems) ? provinceItems : []).find(
    isArgentinaProvince
  ) || null;

  if (!provinceCandidate && province.length >= 2) {
    const target = normalizeProvinceName(province);
    const provinces = await listArgentinaProvinces();
    provinceCandidate = provinces.find((item) => {
      const candidate = normalizeProvinceName(item?.Name);
      return candidate === target || candidate.includes(target);
    });
  }

  if (!provinceCandidate) {
    const alias = resolveProvinceAlias(province);
    if (alias) {
      const aliased = await fetchAdminSearch({ name: alias, level: 1, limit: 20 });
      provinceCandidate = (Array.isArray(aliased) ? aliased : []).find(
        isArgentinaProvince
      ) || null;
    }
  }

  if (!provinceCandidate) return [];
  const provinceId = provinceCandidate.Id || provinceCandidate.id;
  if (!provinceId) return [];

  const provinceDetails = await fetchAdminById(provinceId);
  if (!provinceDetails?.bbox || !provinceDetails?.gid1) return [];

  const items = await fetchAdminSearch({
    name: "",
    level: 2,
    limit: 300,
    bbox: provinceDetails.bbox
  });

  return (Array.isArray(items) ? items : []).filter(
    (item) =>
      item?.Gid0 === "ARG" &&
      item?.Gid1 === provinceDetails.gid1 &&
      Number(item?.Level) === 2
  );
}

function computeBboxFromGeometry(geometry) {
  const coords = geometry?.coordinates;
  if (!coords) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (value) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      const [x, y] = value;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      return;
    }
    value.forEach(walk);
  };

  walk(coords);
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

function mapGasParam(gas) {
  if (!gas || gas === "co2e") return DEFAULT_GAS;
  return String(gas);
}

function logUnmappedSectors() {
  if (UNMAPPED_SECTORS.size > 0) {
    console.warn("⚠️ Unmapped Climate TRACE sectors:", [...UNMAPPED_SECTORS]);
  }
}

function resolveIpccFlags(sectorRaw, isResidualCategory = false) {
  const value = String(sectorRaw || "").toLowerCase();
  const isInternationalBunker =
    value.includes("international-aviation") ||
    value.includes("international-shipping");

  return {
    included_in_total: !isInternationalBunker,
    is_international_bunker: isInternationalBunker,
    is_residual_category: Boolean(isResidualCategory)
  };
}

function mapSectorToIpcc(sectorRaw) {
  const value = String(sectorRaw || "").toLowerCase();

  for (const rule of IPCC_MAPPING) {
    if (value.includes(rule.match)) {
      return {
        sectorCode: rule.sector,
        subsectorCode: rule.subsector
      };
    }
  }

  // Fallback explícito
  return {
    sectorCode: "X",
    subsectorCode: null
  };
}

function mapSectorToIpccHierarchical(sectorRaw) {
  const value = String(sectorRaw || "").toLowerCase();

  for (const key in IPCC_HIERARCHY) {
    if (value.includes(key)) {
      return IPCC_HIERARCHY[key];
    }
  }

  // fallback al mapping plano actual
  const basic = mapSectorToIpcc(sectorRaw);
  if (!basic.subsectorCode) {
    UNMAPPED_SECTORS.add(value);
  }

  return {
    sector: basic.sectorCode,
    parent: basic.subsectorCode,
    group: null,
    code: basic.subsectorCode,
    name: IPCC_SUBSECTORS[basic.subsectorCode] || "Other"
  };
}


function aggregateIpcc(emissions) {
  const totals = new Map();
  let totalIpcc = 0;
  let totalExtended = 0;

  emissions.forEach((item) => {
    const value = Number(item?.Emissions || 0);
    if (!Number.isFinite(value) || value <= 0) return;

    const ipcc = mapSectorToIpccHierarchical(item?.Sector);
    const isResidualCategory = !ipcc.code;
    const ipccFlags = resolveIpccFlags(item?.Sector, isResidualCategory);
    const sectorKey = ipcc.sector;
    const sectorName = IPCC_SECTORS[ipcc.sector] || "Other";

    if (!totals.has(sectorKey)) {
      totals.set(sectorKey, {
        ipcc_code: ipcc.sector,
        name: sectorName,
        total: 0,
        subsectors: new Map()
      });
    }

    const sector = totals.get(sectorKey);
    totalExtended += value;
    if (ipccFlags.included_in_total) {
      sector.total += value;
      totalIpcc += value;
    }

    const subsectorKey = ipcc.code || "X";
    if (!sector.subsectors.has(subsectorKey)) {
      sector.subsectors.set(subsectorKey, {
        sector_ipcc: ipcc.sector,
        parent_ipcc: ipcc.parent || null,
        group_ipcc: ipcc.group || null,
        ipcc_code: subsectorKey,
        name: ipcc.name || IPCC_SUBSECTORS[ipcc.code] || "Other",
        total: 0,
        ipcc_flags: ipccFlags
      });
    }
    sector.subsectors.get(subsectorKey).total += value;

  });

  const sectors = Array.from(totals.values())
    .map((sector) => {
      const meta = IPCC_METADATA[sector.ipcc_code] || {};
      const subsectors = Array.from(sector.subsectors.values())
        .map((sub) => ({
          ...sub,
          share: sector.total > 0 ? sub.total / sector.total : 0
        }))
        .sort((a, b) => b.total - a.total);

      const output = {
        ipcc_code: sector.ipcc_code,
        name: sector.name,
        total: sector.total,
        share: totalIpcc > 0 ? sector.total / totalIpcc : 0,
        tier: meta.tier || "NA",
        notes: meta.notes || null
      };

      if (subsectors.length > 0) output.subsectors = subsectors;
      return output;
    })
    .sort((a, b) => b.total - a.total);

  return {
    total_ipcc: totalIpcc,
    total_extended: totalExtended,
    sectors
  };
}

async function searchAdmin(name, level, limit) {
  const items = await fetchAdminSearch({ name, level, limit });
  const candidate = pickAdminCandidate(items);

  const adminId = candidate?.Id || candidate?.id;
  const adminName = candidate?.Name || candidate?.name || name;
  if (!adminId) {
    const error = new Error("Administrative area not found");
    error.status = 404;
    throw error;
  }

  return {
    id: adminId,
    name: adminName,
    level,
    country: "ARG",
    full_name: candidate?.FullName || null
  };
}

app.get("/api/ipcc/search", async (req, res) => {
  const q = normalizeCityName(req.query.q);
  const level = Number(req.query.level);
  const province = normalizeCityName(req.query.province);

  if (q.length < 2) return res.json([]);
  if (![1, 2].includes(level)) return res.status(400).json({ error: "Invalid level" });

  try {
    let items = await fetchAdminSearch({ name: q, level, limit: 20 });
    if (level === 1 && Array.isArray(items) && items.length > 0) {
      const filtered = items.filter(isArgentinaProvince);
      items = filtered;
    }
    if (level === 1 && Array.isArray(items) && items.length === 0) {
      const fallback = await fetchAdminSearch({ name: q, level: null, limit: 200 });
      items = (Array.isArray(fallback) ? fallback : []).filter(isArgentinaProvince);
    }
    if (level === 1 && Array.isArray(items) && items.length === 0 && q.length >= 2) {
      const target = normalizeNameForMatch(q);
      const provinces = await listArgentinaProvinces();
      items = provinces.filter((item) =>
        normalizeNameForMatch(item?.Name).includes(target)
      );
    }
    if (level === 1 && Array.isArray(items) && items.length === 0) {
      const alias = resolveProvinceAlias(q);
      if (alias) {
        const aliased = await fetchAdminSearch({ name: alias, level: 1, limit: 20 });
        items = (Array.isArray(aliased) ? aliased : []).filter(isArgentinaProvince);
      }
    }

    if (level === 2 && Array.isArray(items) && items.length === 0 && province) {
      const departments = await listDepartmentsByProvince(province);
      const target = normalizeNameForMatch(q);
      items = departments.filter((item) =>
        normalizeNameForMatch(item?.Name).includes(target)
      );
    }
    const suggestions = [];
    const seen = new Set();

    (Array.isArray(items) ? items : [])
      .filter(level === 2 ? isArgentinaAdminLevel2 : (item) => item?.Gid0 === "ARG")
      .forEach((item) => {
        const id = item.Id || item.id;
        const name = normalizeCityName(item.Name);
        const fullName = normalizeCityName(item.FullName);
        if (!id || !name || !fullName) return;
        if (seen.has(id)) return;
        seen.add(id);
        suggestions.push({ id, name, fullName });
      });

    res.json(suggestions);
  } catch (err) {
    res.status(502).json({ error: "Climate TRACE API unavailable" });
  }
});

app.get("/api/ipcc/departments", async (req, res) => {
  const province = normalizeCityName(req.query.province);
  if (province.length < 2) return res.json([]);

  try {
    const items = await listDepartmentsByProvince(province);
    const suggestions = [];
    const seen = new Set();
    (Array.isArray(items) ? items : [])
      .forEach((item) => {
        const id = item.Id || item.id;
        const name = normalizeCityName(item.Name);
        const fullName = normalizeCityName(item.FullName);
        if (!id || !name || !fullName) return;
        if (seen.has(id)) return;
        seen.add(id);
        suggestions.push({ id, name, fullName });
      });

    res.json(suggestions);
  } catch (err) {
    res.status(502).json({ error: "Climate TRACE API unavailable" });
  }
});

app.get("/api/ipcc/provinces", async (req, res) => {
  try {
    const provinces = await listArgentinaProvinces();
    const suggestions = [];
    const seen = new Set();
    (Array.isArray(provinces) ? provinces : [])
      .filter((item) => isArgentinaProvince(item) && normalizeCityName(item.Name) !== "Unknown")
      .forEach((item) => {
        const id = item.Id || item.id;
        const name = normalizeCityName(item.Name);
        const fullName = normalizeCityName(item.FullName);
        if (!id || !name || !fullName) return;
        if (seen.has(id)) return;
        seen.add(id);
        suggestions.push({ id, name, fullName });
      });

    suggestions.sort((a, b) => a.name.localeCompare(b.name, "es-AR"));
    res.json(suggestions);
  } catch (err) {
    res.status(502).json({ error: "Climate TRACE API unavailable" });
  }
});

app.get("/api/ipcc/inventory", async (req, res) => {
  const level = String(req.query.level || "");
  const name = normalizeCityName(req.query.name);
  const year = Number(req.query.year);
  const gas = mapGasParam(req.query.gas);
  const inventoryMode = String(req.query.inventory_mode || "extended").toLowerCase();
  const adminIdParam = normalizeCityName(req.query.admin_id);

  if ((!name && !adminIdParam) || !level) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  if (!Number.isFinite(year)) return res.status(400).json({ error: "Invalid year" });
  if (!["province", "department"].includes(level)) {
    return res.status(400).json({ error: "Invalid level" });
  }
  if (!["ipcc", "extended"].includes(inventoryMode)) {
    return res.status(400).json({ error: "Invalid inventory_mode" });
  }

  try {
    const adminLevel = level === "province" ? 1 : 2;
    let admin = null;

    if (adminIdParam) {
      try {
        const adminDetails = await fetchAdminById(adminIdParam);
        admin = {
          id: adminDetails.id,
          name: name || adminDetails.name || adminIdParam,
          level,
          country: adminDetails.country || "ARG",
          full_name: adminDetails.fullName || null
        };
      } catch {
        admin = {
          id: adminIdParam,
          name: name || adminIdParam,
          level,
          country: "ARG",
          full_name: null
        };
      }
    } else {
      admin = await searchAdmin(name, adminLevel, 10);
    }

    const data = await fetchEmissions({ adminId: admin.id, years: String(year), gas });
    const emissions = (data && (data.all || data.All)) || [];
    const { total_ipcc, total_extended, sectors } = aggregateIpcc(emissions);
    const activeTotal = inventoryMode === "extended" ? total_extended : total_ipcc;

    const outputSectors = sectors.map((sector) => {
      const nextSector = {
        ...sector,
        share: activeTotal > 0 ? sector.total / activeTotal : 0
      };

      if (sector.subsectors) {
        nextSector.subsectors = sector.subsectors.map((sub) => ({
          ...sub,
          share: sector.total > 0 ? sub.total / sector.total : 0
        }));
      }

      return nextSector;
    });

    logUnmappedSectors();

    res.json({
      admin: {
        id: admin.id,
        name: admin.name,
        level,
        country: admin.country,
        full_name: admin.full_name || null
      },
      year,
      unit: "tCO2e",
      total: activeTotal,
      total_ipcc,
      total_extended,
      sectors: outputSectors,
      metadata: {
        source: "Climate TRACE v6",
        gwp: "AR6 100yr",
        inventory_mode: inventoryMode,
        totals_available: ["ipcc", "extended"],
        totals_definition: {
          ipcc: "Excludes international aviation and shipping",
          extended: "Includes all observed emissions"
        },
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Climate TRACE API unavailable" });
  }
});

const handleAdminLevel2Search = async (req, res) => {
  const q = normalizeCityName(req.query.q);
  if (q.length < 2) return res.json([]);

  try {
    const items = await fetchAdminSearch({ name: q, level: 2, limit: 20 });
    const suggestions = [];
    const seen = new Set();

    (Array.isArray(items) ? items : [])
      .filter(isArgentinaAdminLevel2)
      .forEach((item) => {
        const id = item.Id || item.id;
        const name = normalizeCityName(item.Name);
        const fullName = normalizeCityName(item.FullName);
        if (!id || !name || !fullName) return;
        if (seen.has(id)) return;
        seen.add(id);
        suggestions.push({ id, name, fullName });
      });

    res.json(suggestions);
  } catch (err) {
    res.status(502).json({ error: "Climate TRACE API unavailable" });
  }
};

app.get("/api/ar/department-search", handleAdminLevel2Search);
app.get("/api/ar/city-search", handleAdminLevel2Search);

app.get("/api/ar/province-inventory", async (req, res) => {
  const name = req.query.name ? String(req.query.name) : "Misiones";
  const years = resolveYears(req.query);
  const gas = req.query.gas ? String(req.query.gas) : undefined;

  try {
    const adminId = await searchAdminId(name, 1);
    const data = await fetchEmissions({ adminId, years, gas });

    res.json({
      name,
      level: 1,
      adminId,
      years,
      gas: gas || null,
      data
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/ar/city-inventory", async (req, res) => {
  const name = req.query.name ? String(req.query.name) : "Posadas";
  const years = resolveYears(req.query);
  const gas = req.query.gas ? String(req.query.gas) : undefined;

  try {
    const adminId = await searchAdminId(name, 2);
    const data = await fetchEmissions({ adminId, years, gas });

    res.json({
      name,
      level: 2,
      adminId,
      years,
      gas: gas || null,
      data
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
