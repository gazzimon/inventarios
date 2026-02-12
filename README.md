# ClimateTrace - Subnational Inventory API (Argentina)

Node.js + React project to generate subnational inventories (provinces and departments) from Climate TRACE data, with IPCC-oriented aggregation and audit metadata.

## Objective

- Query administrative units in Argentina.
- Compute territory-level inventories from Climate TRACE assets.
- Provide results in `ipcc` and `extended` modes.
- Expose metadata for traceability and auditing.

## Repository Structure

- `server.js`: Express backend with `/api/ipcc/*`, `/api/ar/*`, `/api/debug/*` endpoints.
- `api-1.yaml` and `api-1.json`: Climate TRACE public API references (v6).
- `frontend/`: React + Vite frontend.
- `afolu_misiones_climatetrace.js`, `ct_province_assets_total.js`: auxiliary scripts.

## Requirements

- Node.js 18+
- npm 9+

## Getting Started

### Backend

This repository currently has no root `package.json`, so backend dependencies must be installed explicitly:

```bash
npm install express node-fetch
node server.js
```

Backend URL:

- `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Environment Variables (Backend)

- `CT_BASE_URL` (default: `https://api.climatetrace.org`)
- `CT_INVENTORY_VERSION` (example: `v5.3.0 (Jan 2026)`)
- `GADM_VERSION` (example: `v4.1`)
- `CT_MAX_PAGES` (default `0` = no cap)
- `CT_MAX_ASSETS` (default `0` = no cap)
- `CT_MAX_MS` (default `0` = no timeout cap)

PowerShell example:

```powershell
$env:CT_BASE_URL="https://api.climatetrace.org"
$env:CT_INVENTORY_VERSION="v5.3.0 (Jan 2026)"
$env:GADM_VERSION="v4.1"
node .\server.js
```

## Main Inventory Parameters

Primary endpoint:

- `GET /api/ipcc/inventory`

Parameters:

- `level`: `province` or `department` (required)
- `name` or `admin_id`: at least one is required
- `year`: optional, default `2022`
- `gas`: optional, default `co2e_100yr`
- `inventory_mode`: `ipcc` or `extended` (default `extended`)

Allowed gases:

- `co2`
- `ch4`
- `n2o`
- `co2e_100yr`
- `co2e_20yr`

Current validation rules:

- Rejects invalid `gas` (`400`).
- Rejects multi-year query format in this endpoint (`years=2021,2022`) with `400`.

## Project Endpoints

### IPCC API

- `GET /api/ipcc/search?level=1&q=Misiones`
- `GET /api/ipcc/search?level=2&q=Capital&province=Misiones`
- `GET /api/ipcc/departments?province=Misiones`
- `GET /api/ipcc/provinces`
- `GET /api/ipcc/inventory?level=province&name=Misiones`

### Legacy AR API

- `GET /api/ar/department-search?q=Posadas`
- `GET /api/ar/city-search?q=Posadas`
- `GET /api/ar/province-inventory?name=Misiones&year=2022&gas=co2e_100yr`
- `GET /api/ar/city-inventory?name=Posadas&year=2022&gas=co2e_100yr`

### Debug

- `GET /api/debug/sector-coverage?year=2024`

## Audit Metadata in Output

`/api/ipcc/inventory` returns:

- `admin`, `year`, `unit`, `total`, `total_ipcc`, `total_extended`, `total_stock_change`
- `sectors[]` with subsectors and shares
- `metadata` including:
  - `source`
  - `inventory_version`
  - `gadm_version`
  - `gas`
  - `gwp`
  - `inventory_mode`
  - `unmapped_sectors`
  - `aggregation` (`truncated`, `stopped_by`, `pages_fetched`, etc.)
  - `generated_at`

## Quick cURL Validation Suite

```bash
curl "http://localhost:3001/api/ipcc/provinces"
curl "http://localhost:3001/api/ipcc/search?level=1&q=Misiones"
curl "http://localhost:3001/api/ipcc/departments?province=Misiones"
curl "http://localhost:3001/api/ipcc/inventory?level=province&name=Misiones"
curl "http://localhost:3001/api/ipcc/inventory?level=province&admin_id=ARG.14_1&year=2022&gas=co2e_20yr&inventory_mode=ipcc"
curl "http://localhost:3001/api/ipcc/inventory?level=province&name=Misiones&year=2022&gas=invalid_gas"
curl "http://localhost:3001/api/ipcc/inventory?level=province&name=Misiones&years=2021,2022"
```

Expected checks:

- Valid requests: `200`
- Invalid gas: `400`
- Multi-year in `/api/ipcc/inventory`: `400`

## Technical Notes

- The backend currently uses Climate TRACE `/v6/*` routes.
- For strict inventory-version compliance, pin to the official versioning mechanism and declare it via `CT_INVENTORY_VERSION`.
- Some string literals in `server.js` still show mojibake and should be cleaned up for fully consistent output.

## Project Status

Functional for analysis and institutional prototyping. Recommended before formal external delivery: finalize version pinning and encoding cleanup.
