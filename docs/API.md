# NICTD — Public API v1

Base URL: `http://<host>/api/v1` · Format: JSON · CORS: open (`Access-Control-Allow-Origin: *`)

No API key required for public series. An authenticated browser session automatically includes deeper series the account's role permits (`registered`, `stakeholder`).

## Endpoints

### `GET /api/v1/indicators`
Full catalogue metadata: code, name, domain, domainLabel, dashboard, unit, description, methodology, agency, periodicity, access_level, coverage, lastUpdated.

### `GET /api/v1/counties`
The 15 counties with capital, population and area.

### `GET /api/v1/data`
Time series. Filters: `indicator`, `county` (name), `year`. Rows with `county: null` are national aggregates. Errors: `403 access_restricted`, `404 unknown_indicator`.

### `GET /api/v1/explorer`
The payload behind the Data Explorer. Params: `indicator` (required), `year`, `focus` (county name), `compare` (county name).
```json
{ "indicator": {...}, "year": 2025, "years": [2018,...,2025],
  "table": [ { "county": "Bomi", "value": 27.4, "yoy": 2.1 } ],
  "trend": { "series": [...] }, "compareTrend": { "series": [...] } | null }
```

### `GET /api/v1/dashboards/:topic`
`:topic` is one of `connectivity`, `mobile-broadband`, `affordability`, `trust-governance`, `sustainability`, `education`. Optional `county`.
```json
{ "topic": "connectivity", "scope": "National", "last_etl_sync": "...", "last_data_update": "...",
  "heroStats": [...], "trend": {...}, "ranking": { "top": [...], "bottom": [...] } }
```

### `GET /api/v1/query/preview`
Params: `indicators` (comma-separated codes), `counties` (comma-separated names or `all`), `year_from`, `year_to`. Returns `{ count, rows }` (rows capped at 500; `count` is the true total).

### `POST /api/v1/query/save`
JSON body `{ name, indicators, counties, year_from, year_to, format }`. Requires login. Returns `{ ok: true }` or `401 { error }`.

### `GET /api/v1/query`
Runs a full Data Query builder extract and downloads it. Same params as `/query/preview` plus `format` (`csv`|`json`|`xlsx` — xlsx is served as an Excel-compatible CSV).

### `GET /api/v1/download/data.csv` · `GET /api/v1/download/data.json`
Full open dataset (filters: `indicator`, `county`, `year`). CSV columns: `indicator_code, indicator, domain, unit, county, year, value, source`.

## Methodology note
Series combine national survey waves, operator data-sharing feeds and administrative registers. Every submission passes automated validation and a human quality-review queue before publication. Current values are **demonstration data** pending production feeds.
