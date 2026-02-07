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

const IPCC_SUBSECTORS = {
  "1A": "Stationary Energy",
  "1B": "Transport",
  "1C": "Fugitive Emissions",
  "2A": "Mineral Industry",
  "2B": "Chemical Industry",
  "2C": "Metal Industry",
  "2D": "Other Manufacturing",
  "3A": "Livestock",
  "3B": "Cropland",
  "3C": "Fires and Land Use Change",
  "3D": "Other AFOLU",
  "4A": "Solid Waste",
  "4B": "Wastewater"
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

  // 1A3 – Transport
  { match: "road-transportation", sector: "1", subsector: "1B" },
  { match: "rail", sector: "1", subsector: "1B" },
  { match: "domestic-aviation", sector: "1", subsector: "1B" },
  { match: "domestic-shipping", sector: "1", subsector: "1B" },

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

  // 2C – Metal Industry
  { match: "iron", sector: "2", subsector: "2C" },
  { match: "steel", sector: "2", subsector: "2C" },
  { match: "aluminum", sector: "2", subsector: "2C" },
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

  // 3C – Forest & fires
  { match: "forest-land", sector: "3", subsector: "3C" },
  { match: "cropland-fires", sector: "3", subsector: "3C" },
  { match: "shrubgrass-fires", sector: "3", subsector: "3C" },
  { match: "wetland-fires", sector: "3", subsector: "3C" },

  // 3D – Other AFOLU
  { match: "water-reservoirs", sector: "3", subsector: "3D" },

  // ======================
  // 4 – WASTE
  // ======================

  { match: "solid-waste-disposal", sector: "4", subsector: "4A" },
  { match: "wastewater", sector: "4", subsector: "4B" },
  { match: "incineration-and-open-burning-of-waste", sector: "4", subsector: "4C" }
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

async function fetchAdminSearch({ name, level, limit }) {
  const url = new URL(`${BASE_URL}/v6/admins/search`);
  url.search = new URLSearchParams({
    name,
    level: String(level),
    limit: String(limit)
  });
  return fetchJson(url);
}

function mapGasParam(gas) {
  if (!gas || gas === "co2e") return DEFAULT_GAS;
  return String(gas);
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


function aggregateIpcc(emissions) {
  const totals = new Map();
  let grandTotal = 0;

  emissions.forEach((item) => {
    const value = Number(item?.Emissions || 0);
    if (!Number.isFinite(value) || value <= 0) return;

    const { sectorCode, subsectorCode } = mapSectorToIpcc(item?.Sector);
    const sectorKey = sectorCode;
    const sectorName = IPCC_SECTORS[sectorCode] || "Other";

    if (!totals.has(sectorKey)) {
      totals.set(sectorKey, {
        ipcc_code: sectorCode,
        name: sectorName,
        total: 0,
        subsectors: new Map()
      });
    }

    const sector = totals.get(sectorKey);
    sector.total += value;

    if (subsectorCode) {
      if (!sector.subsectors.has(subsectorCode)) {
        sector.subsectors.set(subsectorCode, {
          ipcc_code: subsectorCode,
          name: IPCC_SUBSECTORS[subsectorCode] || "Other",
          total: 0
        });
      }
      sector.subsectors.get(subsectorCode).total += value;
    }

    grandTotal += value;
  });

  const sectors = Array.from(totals.values())
    .map((sector) => {
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
        share: grandTotal > 0 ? sector.total / grandTotal : 0
      };

      if (subsectors.length > 0) output.subsectors = subsectors;
      return output;
    })
    .sort((a, b) => b.total - a.total);

  return { total: grandTotal, sectors };
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
    country: "ARG"
  };
}

app.get("/api/ipcc/search", async (req, res) => {
  const q = normalizeCityName(req.query.q);
  const level = Number(req.query.level);

  if (q.length < 2) return res.json([]);
  if (![1, 2].includes(level)) return res.status(400).json({ error: "Invalid level" });

  try {
    const items = await fetchAdminSearch({ name: q, level, limit: 20 });
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

app.get("/api/ipcc/inventory", async (req, res) => {
  const level = String(req.query.level || "");
  const name = normalizeCityName(req.query.name);
  const year = Number(req.query.year);
  const gas = mapGasParam(req.query.gas);

  if (!name || !level) return res.status(400).json({ error: "Missing parameters" });
  if (!Number.isFinite(year)) return res.status(400).json({ error: "Invalid year" });
  if (!["province", "department"].includes(level)) {
    return res.status(400).json({ error: "Invalid level" });
  }

  try {
    const adminLevel = level === "province" ? 1 : 2;
    const admin = await searchAdmin(name, adminLevel, 10);
    const data = await fetchEmissions({ adminId: admin.id, years: String(year), gas });
    const emissions = (data && (data.all || data.All)) || [];
    const { total, sectors } = aggregateIpcc(emissions);

    res.json({
      admin: {
        id: admin.id,
        name: admin.name,
        level,
        country: admin.country
      },
      year,
      unit: "tCO2e",
      total,
      sectors,
      metadata: {
        source: "Climate TRACE v6",
        gwp: "AR6 100yr",
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
