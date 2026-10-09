# Assumptions & Decisions — NIIS Rebuild

For review. Everything below is changeable.

## Design origin
This is an **original build** in the style of a modern intergovernmental data-hub pattern (indicator catalogue, country/county comparison, choropleth maps, downloadable data). No real organization's logos, wordmarks, or copy were used — palette, typography and iconography are original, and the "network node" mark is a bespoke signature element, not a copy of any real seal or logo.

## Structural decisions
- **Nav taxonomy matches the brief exactly**: Data Explorer, Indicator Catalogue, Data Query, Dashboards, About. Research Papers and Updates remain fully functional (content, downloads, RSS-style listing) but are reachable from the footer and homepage rather than the primary nav, since the brief's nav spec didn't list them — this preserves the original platform's publishing feature without cluttering the new nav bar.
- **The Data Explorer is public** (no login required), matching the brief's "global selector row appears under hero on homepage and pinned atop Data Explorer" — it respects the existing three-tier access system (public/registered/stakeholder) so anonymous visitors only see public-tier indicators in the tree, dropdown and map; logging in transparently unlocks deeper tiers on the *same* page and URL.
- **The prior "Live Dashboard" mechanic is preserved but generalized**: instead of one dashboard, the live-sync status header + county filter now drives six topic dashboards (`/dashboards/:topic`), each with its own hero stat row, trend, and top/bottom-5 county ranking, per the brief's dashboard-page spec.
- **Indicator taxonomy remapped** from the original four domains (infrastructure/usage/demographics/sector) to the brief's six: Connectivity, Access & Infrastructure, Affordability, Market Structure, Trust & Governance, Sustainability — plus a separate `dashboard` tag per indicator (six topic dashboards, since "ICT in Education" and "Mobile & Broadband Markets" are dashboard groupings that don't map 1:1 to catalogue categories). 30 indicators total (up from 15), adding mobile money, e-waste, digital ID, data-protection framework score, e-government services, cybersecurity incidents, and school connectivity to cover every dashboard tile named in the brief.

## Map
- County boundaries are **real geometry**, not a placeholder rectangle: sourced from geoBoundaries' open Liberia ADM1 dataset (CC BY 3.0 IGO, `data.humdata.org`), simplified with Douglas-Peucker and reprojected to a compact inline SVG path set (`public/liberia-counties.js`, ~21 KB). All 15 counties are present and named to match the existing county table (`Rivercess` in the source was mapped to `River Cess`).
- The choropleth color scale is a fixed navy → teal → gold sequential ramp (not red/green), consistent across the map, chart lines and the sortable-table YoY arrows.

## Data Query builder
- "XLSX" output is served as an Excel-compatible CSV (`application/vnd.ms-excel`, `.xls` extension) rather than a true binary XLSX — avoids adding a spreadsheet-writing dependency while still opening correctly in Excel/Sheets. Swap for a real XLSX writer if a byte-identical `.xlsx` is required.
- Saved queries require login (`saved_queries` table, one row per save); anonymous visitors can still preview, download and copy the generated API call without an account.

## Access-policy & messaging assumptions carried over from the original build
- Public registration defaults to **verified** (admin approves each account); stakeholder accounts are **admin-provisioned only**; messaging is **inbox model** (checked & answered, not real-time), visible to the whole admin team collectively. All three remain configurable from the admin panel's Settings section, unchanged from the original build.
- Permissions are data (`role_permissions` table), not hard-coded.

## Data decisions
- All figures are **demonstration data** — deterministic and reproducible, not sourced from live Ministry feeds (not yet public). Production feeds replace values, not structure.
- National aggregates are stored as rows with `county = null`, kept separate from the Data Query builder's per-county extracts (which never include the national row, to avoid double-counting in a downloaded file).
- The quality review queue (automated validation → human approve/reject → publication) is unchanged from the original build.

## Technical decisions (unchanged from the original build)
- Zero-dependency Node.js (`node:http` + `node:sqlite`). Passwords: salted scrypt. Sessions: HttpOnly/SameSite cookies, 12 h expiry.
- Not yet included (recommended before production): CSRF tokens, rate limiting, password reset flow, email notifications, audit log of admin actions, HTTPS termination, a true XLSX writer.

## Supabase migration (July 2026)
- The data layer moved from local SQLite to **Supabase Postgres** (project `oevhlfgitajhzgqajzua`), accessed server-side through the PostgREST API (`supadb.js`) with the publishable key stored in `supabase-config.json` — never shipped to the browser.
- **Security posture (demo)**: tables have RLS disabled and the publishable key acts as the server credential. Before production: enable RLS, move to a `service_role` key in an environment variable, and add per-role policies. The Supabase security advisors will currently flag the RLS-disabled tables — this is a known, documented trade-off.
- Reference data (counties, indicators, settings, permissions, site content) is cached in server memory and refreshed on admin writes; sessions are cached for 60 s with hard expiry enforced in SQL.
- Self-service registration was replaced by the **access-request workflow**: applicants never set their own password; an administrator issues a temporary one when approving. The old `registration_mode` setting remains but only `closed` has an effect (hides the request form) — kept for future re-use.
- 50 demonstration accounts were generated with per-account passwords (docs/USER-CREDENTIALS.md). Passwords are scrypt-hashed in the users table; the plain-text doc exists for demo handover only and should be deleted after real credentials are distributed.
