import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3001;

const BASE_URL = "https://api.climatetrace.org";
const DEFAULT_YEAR = 2022;

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

function isArgentinaCity(item) {
  if (!item || item.Gid0 !== "ARG") return false;
  const name = normalizeCityName(item.Name);
  const fullName = normalizeCityName(item.FullName);
  if (!name || !fullName) return false;
  return fullName.startsWith(`${name},`);
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

app.get("/api/ar/city-search", async (req, res) => {
  const q = normalizeCityName(req.query.q);
  if (q.length < 2) return res.json([]);

  try {
    const items = await fetchAdminSearch({ name: q, level: 2, limit: 20 });
    const suggestions = [];
    const seen = new Set();

    (Array.isArray(items) ? items : [])
      .filter(isArgentinaCity)
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
