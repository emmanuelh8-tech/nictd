# NICTD — National ICT Database of Liberia

A government statistics / data-hub portal for Liberia's ICT sector, developed for the Ministry of Posts &amp; Telecommunications (platform built by **Harris & Associates LLC**). Original design and build — not a copy of any real organization's site, branding, or content. Tracks connectivity, affordability, market structure, digital trust & governance, and sustainability across all 15 counties, with a Data Explorer (choropleth map + trend + sortable table), an Indicator Catalogue, a Data Query builder, six curated topic Dashboards, role-based access, analytics and built-in messaging.

## Run it

Requires Node.js ≥ 18 (**zero npm dependencies** — data lives in Supabase Postgres, accessed via its REST API with the built-in `fetch`).

```
node server.js
```

Open http://localhost:4310. The server connects to the Supabase project configured in `supabase-config.json` (URL + publishable key; the key never leaves the server). `data/nictd.sqlite` is only the historical seed source — `scripts/migrate-to-supabase.js` re-loads Supabase from it (wipes and reseeds everything, including the 50 user accounts).

## Accounts (50 total)

3 administrators, 8 stakeholders, 39 public users — full list with passwords in **[docs/USER-CREDENTIALS.md](docs/USER-CREDENTIALS.md)**. Quick-start:

| Role | Email | Password |
|---|---|---|
| Administrator | admin@nictd.gov.lr | Admin!2026 |
| Stakeholder | stakeholder@partner.org | Stake!2026 |
| Public (researcher) | researcher@example.com | Research!2026 |

New users are onboarded through **Request Access** (under the login form): the applicant submits name/email/organization/role/purpose, the request appears in the Admin Panel's Access Requests section, and an administrator sets a temporary password and creates the account.

## Admin Content Studio

Administrators control all front-end data from `/admin`: homepage hero text, the key-numbers strip (any 4 indicators), the About mission, bulk CSV data upload (publishes straight into the live dataset), plus create/delete for research papers, updates and media. Changes are live immediately for all visitors and users.

## Site map

- **Home** (`/`) — hero, global indicator/county selector, six dashboard tiles, key numbers strip, recent publications, latest updates.
- **Data Explorer** (`/data`) — sticky selector row, collapsible indicator tree (6 categories), a real SVG choropleth of Liberia's 15 counties (click a county to set it as Focus), trend chart with year slider and comparison-county overlay, sortable county table with year-over-year arrows, and a CSV/PNG/Embed/Share toolbar.
- **Indicator Catalogue** (`/indicators`) — searchable/filterable metadata table; click a row for a slide-over drawer with definition, methodology, source agency, periodicity and coverage.
- **Data Query** (`/query`) — step-based builder (indicators → counties → year range → format) with a live preview table, a generated REST API call, and save/download.
- **Dashboards** (`/dashboards`, `/dashboards/:topic`) — Connectivity, Mobile & Broadband Markets, Affordability, Digital Trust & Governance, Sustainability/E-Waste, ICT in Education. Each has a live sync status header, county filter, hero stat row, trend chart and top/bottom-5 county ranking.
- **About** (`/about`) — mission, methodology & data-governance pipeline, contributing agencies, contact, FAQ.
- **Secured workspace** (behind login) — Overview, the same Data Explorer/Catalogue/Query/Dashboards inside a sidebar shell, Media Library, Platform Analytics (stakeholders/admins), Messages (per-user inbox to the ICT Statistics & Policy Unit), and an Admin Panel (user verification, quality review queue, content publishing, access-policy settings).

## Roles

Three roles — **authorized public users**, **stakeholders**, **administrators** — gate indicator access at three tiers (`public` / `registered` / `stakeholder`), configurable from the admin panel along with registration mode and stakeholder provisioning policy.

## Docs

- [docs/SCHEMA.md](docs/SCHEMA.md) — relational data schema
- [docs/API.md](docs/API.md) — public API v1 reference
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) — assumptions & decisions to review

## Project layout

```
server.js                HTTP server, routing, auth, role checks, API
db.js                     SQLite schema + deterministic demonstration seed (30 indicators, 15 counties)
views.js                  HTML templates (design system: navy / teal / clay / gold, Fraunces + Inter + IBM Plex Mono)
public/                   styles.css, app.js (choropleth + charts + dropdowns + query builder), liberia-counties.js (real county geometry), media/*.svg
data/                     nictd.sqlite (created on first run)
docs/                     schema, API, assumptions
```

## Map data

`public/liberia-counties.js` holds simplified SVG path geometry for all 15 counties, generated from geoBoundaries' open LBR ADM1 dataset (CC BY 3.0 IGO) — a real county outline, not a placeholder.
