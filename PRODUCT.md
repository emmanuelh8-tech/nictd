# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Authorized public users**: researchers, students, journalists and citizens exploring and downloading open ICT indicators for Liberia.
- **Stakeholders**: partner organizations and institutional or government users with access to deeper data tiers, analytics and messaging.
- **Administrators**: the ICT Statistics & Policy Unit, who publish data and content, review quality, and manage access.

_Open decision: which of these groups is the primary audience has not been confirmed. Treat the site as a public data portal with secured tools for stakeholders and admins until the user decides._

## Product Purpose

**NIIS (National ICT Intelligence System)** is this project. It pulls data from databases, APIs, government portals, open data and web sources. It then validates, cleans, integrates, transforms, analyses and enriches that data, and serves structured ICT intelligence.

The NIIS web application is the user-facing layer. It tracks connectivity, affordability, market structure, digital trust & governance and sustainability across Liberia's 15 counties, built for the Ministry of Posts & Telecommunications. It was previously named NICTD (National ICT Database of Liberia); the name changed to NIIS and some internal identifiers still carry the old one (see README, "Naming").

**NIIP** is the 3D architecture animation (an interactive model and a rendered film) in `niip-3d/`. It belongs to this project but is not part of the web application.

Success means decision-makers and the public can find, compare, trust and download ICT indicators.

## Positioning

A national ICT intelligence system (NIIS) that turns many raw sources into consistent, county-level indicators, reports and research for Liberia. It is not just a static statistics site.

## Operating Context

- The three-layer architecture: Web Application → NIIS → ICT Databases (Indicators, Reports, Research).
- Public pages: Home, Data Explorer (county choropleth, trend, sortable table), Indicator Catalogue, Data Query builder (with REST API call), six topic dashboards, Reports, Research, About.
- Secured workspace: Overview, Media Library, Platform Analytics, Messages, Admin Panel and Content Studio.
- New users are onboarded through Request Access, approved by an administrator.

## Capabilities and Constraints

- Node.js server with zero npm dependencies. Data is in Supabase Postgres, reached server-side through REST.
- Three access tiers (public / registered / stakeholder). Permissions are stored as data.
- **All figures are demonstration data.** Live Ministry feeds are not yet public, so future work must not present the values as official statistics.
- Not yet production-ready: Supabase RLS is disabled, and CSRF protection, rate limiting, password reset and an audit log are pending.

## Brand Commitments

- Names: NIIS (the project, system and web application; formerly NICTD) and NIIP (the 3D animation only).
- The existing site identity: Liberian navy, blue and flag red, and the Liberian seal. Type: Besley for headings and day numerals, Public Sans for text and figures, chosen by the user from a specimen on 2026-10-02 (the "Public notice" pairing; it replaced Fraunces, Inter, Manrope, Chakra Petch and IBM Plex Mono).
- The NIIP 3D architecture film (`niip-3d/`) uses a dark graphite and cyan treatment. _Inferred: this is the dark variant of the NIIP brand, with navy and red as the official colours._
- It is an original build. No other organization's logos, wordmarks or copy.

## Evidence on Hand

- Real county geometry: `public/liberia-counties.js`, from geoBoundaries LBR ADM1 (CC BY 3.0 IGO).
- Architecture film and interactive 3D model: `niip-3d/`. Rendered video: `niip-3d/out/niip-1080x1920.mp4`.
- Deliverables: indicators, cost schedule, data-mining phase and pitch decks in `deliverables/`.
- There are no real testimonials, adoption numbers or official statistics. Do not invent any.

## Product Principles

1. Trust first: every number shows its source, method and period, and demonstration data is never passed off as official.
2. County-level clarity: comparisons across Liberia's 15 counties are the core lens.
3. One system, many outputs: NIIS feeds the explorer, dashboards, reports and research consistently.
4. Open by default and gated by tier: public data stays frictionless, and deeper tiers unlock in place.

## Accessibility & Inclusion

The site is a public government data portal, so aim for WCAG 2.1 AA. Charts and maps need readable tables or text alternatives.
