// db.js — NICTD (National ICT Database of Liberia): schema + seed (SQLite via node:sqlite, zero dependencies)
'use strict';
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'data', 'nictd.sqlite');
require('node:fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// ---------- password hashing ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('public','stakeholder','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
-- Role permissions are data, not code: editable by administrators.
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS counties (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  capital TEXT,
  population INTEGER,
  area_km2 INTEGER,
  urban_share REAL
);
-- Indicator catalogue: domain = left-panel/catalogue category, dashboard = topic-dashboard slug.
CREATE TABLE IF NOT EXISTS indicators (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('connectivity','access','affordability','market','trust','sustainability')),
  dashboard TEXT NOT NULL CHECK (dashboard IN ('connectivity','mobile-broadband','affordability','trust-governance','sustainability','education')),
  unit TEXT NOT NULL,
  description TEXT,
  methodology TEXT,
  agency TEXT,
  periodicity TEXT,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public','registered','stakeholder')),
  headline INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS data_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_code TEXT NOT NULL REFERENCES indicators(code),
  county_id INTEGER REFERENCES counties(id), -- NULL = national aggregate
  year INTEGER NOT NULL,
  value REAL NOT NULL,
  source TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (indicator_code, county_id, year)
);
-- Quality review queue: submissions are validated, then approved into data_points.
CREATE TABLE IF NOT EXISTS data_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  indicator_code TEXT NOT NULL REFERENCES indicators(code),
  county_id INTEGER REFERENCES counties(id),
  year INTEGER NOT NULL,
  value REAL NOT NULL,
  source TEXT,
  submitted_by INTEGER REFERENCES users(id),
  channel TEXT NOT NULL DEFAULT 'manual' CHECK (channel IN ('survey','operator_feed','manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  validation_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS saved_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  indicators TEXT NOT NULL,  -- comma-separated indicator codes
  counties TEXT NOT NULL,    -- comma-separated county ids, or 'all'
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv','json','xlsx')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  abstract TEXT NOT NULL,
  published_on TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Report',
  body TEXT
);
CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'news' CHECK (category IN ('news','data_refresh','announcement')),
  body TEXT NOT NULL,
  published_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('image','paper','video')),
  title TEXT NOT NULL,
  description TEXT,
  -- images/papers: local file path; videos: external hosting service embed
  file_path TEXT,
  video_provider TEXT,
  video_embed_id TEXT,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('public','registered','stakeholder')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Messaging: one conversation per user with the admin team (collective inbox).
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  subject TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id INTEGER NOT NULL REFERENCES users(id),
  from_admin_team INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_by_user INTEGER NOT NULL DEFAULT 0,
  read_by_admin INTEGER NOT NULL DEFAULT 0
);
-- Platform usage analytics (page views, downloads, API calls).
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,           -- page_view | download | api_call
  path TEXT NOT NULL,
  role TEXT,                    -- NULL = anonymous visitor
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_data_points_lookup ON data_points (indicator_code, year);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events (kind, created_at);
`);

// ---------- seed (idempotent) ----------
const seeded = db.prepare('SELECT COUNT(*) AS n FROM counties').get().n > 0;

if (!seeded) {
  // Deterministic PRNG so demonstration data is stable across rebuilds.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260713);

  const counties = [
    // name, capital, population, area_km2, urban_share
    ['Bomi', 'Tubmanburg', 110000, 1932, 0.30],
    ['Bong', 'Gbarnga', 470000, 8754, 0.28],
    ['Gbarpolu', 'Bopolu', 100000, 9689, 0.12],
    ['Grand Bassa', 'Buchanan', 288000, 7936, 0.32],
    ['Grand Cape Mount', 'Robertsport', 165000, 5162, 0.18],
    ['Grand Gedeh', 'Zwedru', 156000, 10484, 0.25],
    ['Grand Kru', 'Barclayville', 78000, 3895, 0.10],
    ['Lofa', 'Voinjama', 397000, 9982, 0.20],
    ['Margibi', 'Kakata', 280000, 2616, 0.45],
    ['Maryland', 'Harper', 173000, 2297, 0.28],
    ['Montserrado', 'Bensonville', 1761000, 1909, 0.85],
    ['Nimba', 'Sanniquellie', 621000, 11551, 0.24],
    ['River Cess', 'Cestos City', 96000, 5594, 0.08],
    ['River Gee', 'Fish Town', 89000, 5113, 0.10],
    ['Sinoe', 'Greenville', 125000, 10137, 0.14],
  ];
  const insCounty = db.prepare('INSERT INTO counties (id,name,capital,population,area_km2,urban_share) VALUES (?,?,?,?,?,?)');
  counties.forEach((c, i) => insCounty.run(i + 1, ...c));

  // ---------- indicator catalogue ----------
  const METHODOLOGY = {
    connectivity: 'Estimated from national survey waves and operator subscriber records, cross-checked against the regulator’s licensing registry. County figures are modelled from survey enumeration areas.',
    access: 'Derived from network-coverage engineering data supplied by licensed operators and site-registry records maintained by the regulator, combined with the national infrastructure census.',
    affordability: 'Priced using the standard basket methodology (entry-level data-and-voice allowance) against county-level income data from the household survey, expressed relative to GNI per capita.',
    market: 'Compiled from the national business registry, sector employment returns and disclosed investment filings, reconciled annually with the regulator’s market report.',
    trust: 'Scored against a structured governance framework (legal instruments in force, institutional capacity, service availability) reviewed annually by the ICT Statistics & Policy Unit.',
    sustainability: 'Modelled from import/take-back registry data and utility-reported renewable share, following the regional e-waste monitoring framework.',
  };
  const AGENCY = {
    connectivity: 'Liberia Telecommunications Authority (LTA)',
    access: 'Liberia Telecommunications Authority (LTA)',
    affordability: 'LISGIS / ICT Statistics & Policy Unit',
    market: 'Ministry of Posts & Telecommunications',
    trust: 'ICT Statistics & Policy Unit, MoPT',
    sustainability: 'Environmental Protection Agency / MoPT',
  };
  const DOMAIN_LABEL = { connectivity: 'Connectivity', access: 'Access & Infrastructure', affordability: 'Affordability', market: 'Market Structure', trust: 'Trust & Governance', sustainability: 'Sustainability' };
  const DASHBOARD_LABEL = { connectivity: 'Connectivity', 'mobile-broadband': 'Mobile & Broadband Markets', affordability: 'Affordability', 'trust-governance': 'Digital Trust & Governance', sustainability: 'Sustainability / E-Waste', education: 'ICT in Education' };

  // code, name, domain, dashboard, unit, description, access_level, headline, base2018, base2025, kind
  // kind: 'pct' (rate/percentage-like, county-scaled by urbanisation), 'count' (absolute total, population-weighted split across counties)
  const indicators = [
    // ---- Connectivity ----
    ['internet_penetration', 'Internet penetration', 'connectivity', 'connectivity', '% of population', 'Individuals using the internet at least once in the last 3 months.', 'public', 1, 12.1, 33.6, 'pct'],
    ['mobile_subscriptions', 'Mobile-cellular subscriptions', 'connectivity', 'connectivity', 'per 100 people', 'Active mobile-cellular subscriptions per 100 inhabitants.', 'public', 1, 56.4, 84.2, 'pct'],
    ['mobile_broadband_subs', 'Active mobile-broadband subscriptions', 'connectivity', 'mobile-broadband', 'per 100 people', 'Active mobile-broadband subscriptions (3G and above) per 100 inhabitants.', 'public', 0, 9.0, 41.5, 'pct'],
    ['fixed_broadband_subs', 'Fixed broadband subscriptions', 'connectivity', 'mobile-broadband', 'per 100 people', 'Fixed (wired) broadband subscriptions per 100 inhabitants.', 'public', 1, 0.3, 2.1, 'pct'],
    ['urban_connectivity', 'Urban connectivity', 'connectivity', 'connectivity', '% of urban population', 'Urban residents with regular internet access.', 'public', 0, 34.0, 61.0, 'pct'],
    ['rural_connectivity', 'Rural connectivity', 'connectivity', 'connectivity', '% of rural population', 'Rural residents with regular internet access.', 'public', 0, 5.0, 17.5, 'pct'],
    ['gender_access_gap', 'Gender access gap', 'connectivity', 'connectivity', 'percentage points', 'Male minus female internet-use rate (lower is better).', 'public', 0, 14.0, 8.5, 'pct'],
    ['youth_access', 'Youth access (15–24)', 'connectivity', 'connectivity', '% of age group', 'Internet use among residents aged 15–24.', 'registered', 0, 21.0, 52.0, 'pct'],

    // ---- Access & Infrastructure ----
    ['cell_towers', 'Cell tower density', 'access', 'connectivity', 'towers per 1,000 km²', 'Active macro cell sites normalized by land area.', 'public', 0, 4.2, 11.8, 'pct'],
    ['mobile_network_coverage', 'Population covered by 4G', 'access', 'mobile-broadband', '% of population', 'Share of the population within range of a 4G mobile-broadband signal.', 'public', 0, 22.0, 68.0, 'pct'],
    ['fiber_coverage', 'Fiber backbone coverage', 'access', 'mobile-broadband', '% of districts', 'Share of administrative districts within 10 km of the fiber backbone.', 'public', 0, 8, 34, 'pct'],
    ['broadband_points', 'Fixed broadband access points', 'access', 'mobile-broadband', 'access points', 'Registered fixed broadband access points (ISP POPs, public access sites).', 'public', 0, 210, 980, 'count'],
    ['school_connectivity', 'Schools connected to the internet', 'access', 'education', '% of schools', 'Primary and secondary schools with a working internet connection.', 'registered', 0, 9.0, 38.0, 'pct'],
    ['student_device_ratio', 'Students per learning device', 'access', 'education', 'students per device', 'Students per shared internet-capable learning device, in connected schools.', 'registered', 0, 46, 19, 'pct'],

    // ---- Affordability ----
    ['mobile_basket_price', 'Mobile data-and-voice basket', 'affordability', 'affordability', '% of GNI per capita', 'Entry-level mobile data-and-voice basket price relative to GNI per capita.', 'public', 0, 9.8, 3.1, 'pct'],
    ['broadband_basket_price', 'Fixed-broadband basket', 'affordability', 'affordability', '% of GNI per capita', 'Entry-level fixed-broadband basket price relative to GNI per capita.', 'public', 0, 22.4, 7.6, 'pct'],
    ['smartphone_ownership', 'Smartphone ownership', 'affordability', 'affordability', '% of adults', 'Adults owning an internet-capable smartphone.', 'public', 0, 18.5, 46.0, 'pct'],
    ['low_income_access', 'Access — lowest income band', 'affordability', 'affordability', '% of band', 'Internet use in the lowest household-income quintile.', 'stakeholder', 0, 2.5, 9.8, 'pct'],
    ['data_consumption', 'Average data consumption', 'affordability', 'affordability', 'GB / user / month', 'Mean monthly mobile data usage per active data subscriber.', 'registered', 0, 0.6, 3.4, 'pct'],

    // ---- Market Structure ----
    ['ict_businesses', 'Registered ICT businesses', 'market', 'mobile-broadband', 'businesses', 'ICT-sector businesses on the national business registry.', 'public', 1, 340, 1240, 'count'],
    ['ict_employment', 'ICT sector employment', 'market', 'mobile-broadband', 'jobs', 'Formal employment in registered ICT businesses.', 'registered', 0, 2100, 7800, 'count'],
    ['sector_investment', 'ICT sector investment', 'market', 'mobile-broadband', 'US$ millions / yr', 'Annual disclosed private + public investment in the ICT sector.', 'stakeholder', 0, 12, 58, 'count'],
    ['mobile_money_accounts', 'Registered mobile money accounts', 'market', 'mobile-broadband', 'per 100 adults', 'Registered mobile money accounts per 100 adults.', 'public', 1, 6.0, 52.0, 'pct'],

    // ---- Trust & Governance ----
    ['data_protection_index', 'Data protection framework score', 'trust', 'trust-governance', 'index (0–100)', 'Composite score for the legal and institutional data-protection framework in force.', 'public', 0, 18, 54, 'pct'],
    ['digital_id_coverage', 'Digital ID coverage', 'trust', 'trust-governance', '% of adults', 'Adults with a registered digital or national ID usable for online services.', 'public', 0, 21.0, 57.0, 'pct'],
    ['egov_services_index', 'E-government services score', 'trust', 'trust-governance', 'index (0–100)', 'Composite score for the availability of government services online.', 'registered', 0, 12, 46, 'pct'],
    ['cyber_incidents_reported', 'Cybersecurity incidents reported', 'trust', 'trust-governance', 'incidents / yr', 'Cybersecurity incidents formally reported to the national CERT.', 'stakeholder', 0, 4, 37, 'count'],

    // ---- Sustainability ----
    ['ewaste_generated', 'E-waste generated', 'sustainability', 'sustainability', 'kg per capita', 'Electronic waste generated per capita per year.', 'public', 0, 1.1, 2.6, 'pct'],
    ['ewaste_collection_rate', 'E-waste formally collected', 'sustainability', 'sustainability', '% of e-waste generated', 'Share of generated e-waste formally collected or recycled.', 'public', 0, 2.0, 14.5, 'pct'],
    ['ict_renewable_energy', 'ICT sector renewable electricity', 'sustainability', 'sustainability', '% of ICT electricity use', 'Share of ICT-sector electricity consumption sourced from renewables.', 'registered', 0, 6.0, 27.0, 'pct'],
  ];
  const insInd = db.prepare('INSERT INTO indicators (code,name,domain,dashboard,unit,description,methodology,agency,periodicity,access_level,headline) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const ind of indicators) {
    const [code, name, domain, dashboard, unit, description, access_level, headline] = ind;
    insInd.run(code, name, domain, dashboard, unit, description, METHODOLOGY[domain], AGENCY[domain], (rand() > 0.7 ? 'Biennial' : 'Annual'), access_level, headline);
  }

  // County-level multiplier: urbanization drives most ICT indicators.
  function countyFactor(c, code) {
    const urban = c[4]; // urban_share is the 5th element of the county row
    if (code === 'rural_connectivity') return 0.7 + urban * 0.9 + rand() * 0.2;
    if (code === 'gender_access_gap' || code === 'mobile_basket_price' || code === 'broadband_basket_price' || code === 'student_device_ratio') return 1.35 - urban * 0.55 + rand() * 0.1; // wider/costlier in rural counties
    return 0.45 + urban * 1.15 + rand() * 0.15;
  }
  const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const insDP = db.prepare('INSERT INTO data_points (indicator_code,county_id,year,value,source,updated_at) VALUES (?,?,?,?,?,?)');
  const SRC = 'NICTD survey / operator data-sharing feeds (demonstration data)';
  const countTotalCodes = new Set(['broadband_points', 'ict_businesses', 'ict_employment', 'sector_investment', 'cyber_incidents_reported']);
  const wholeNumberCodes = new Set(['broadband_points', 'ict_businesses', 'ict_employment', 'cyber_incidents_reported', 'mobile_operators']);

  db.exec('BEGIN');
  for (const ind of indicators) {
    const code = ind[0];
    const base18 = ind[8], base25 = ind[9];
    const factors = counties.map((c) => countyFactor(c, code));
    const weights = counties.map((c, i) => c[2] * factors[i]);
    const wSum = weights.reduce((a, b) => a + b, 0);

    for (const year of YEARS) {
      const t = (year - 2018) / 7;
      const natl = base18 + (base25 - base18) * (t * t * (3 - 2 * t)) * (0.97 + rand() * 0.06);
      const countyVals = [];
      for (let i = 0; i < counties.length; i++) {
        let v;
        if (countTotalCodes.has(code)) {
          v = natl * (weights[i] / wSum);
          v = wholeNumberCodes.has(code) ? Math.round(v) : Math.round(v * 10) / 10;
        } else {
          v = natl * factors[i] * (0.95 + rand() * 0.1);
          if (ind[4].startsWith('%') || ind[4].includes('index')) v = Math.min(97, Math.max(0.2, v));
          v = Math.round(v * 10) / 10;
        }
        countyVals.push(v);
        insDP.run(code, i + 1, year, v, SRC, `${year}-12-31 00:00:00`);
      }
      let natVal;
      if (countTotalCodes.has(code)) {
        const sum = countyVals.reduce((a, b) => a + b, 0);
        natVal = wholeNumberCodes.has(code) ? Math.round(sum) : Math.round(sum * 10) / 10;
      } else {
        const pops = counties.map((c) => c[2]);
        const pSum = pops.reduce((a, b) => a + b, 0);
        natVal = Math.round((countyVals.reduce((a, v, i) => a + v * pops[i], 0) / pSum) * 10) / 10;
      }
      insDP.run(code, null, year, natVal, SRC, `${year}-12-31 00:00:00`);
    }
  }
  db.exec('COMMIT');

  // ----- permissions (configurable via admin settings) -----
  const perms = {
    public: ['view_public', 'view_registered_data', 'messaging', 'download_open_data'],
    stakeholder: ['view_public', 'view_registered_data', 'view_stakeholder_data', 'analytics', 'messaging', 'download_open_data'],
    admin: ['view_public', 'view_registered_data', 'view_stakeholder_data', 'analytics', 'messaging', 'download_open_data',
      'manage_content', 'manage_datasets', 'manage_users', 'admin_inbox', 'manage_settings'],
  };
  const insPerm = db.prepare('INSERT INTO role_permissions (role, permission) VALUES (?,?)');
  for (const [role, list] of Object.entries(perms)) for (const p of list) insPerm.run(role, p);

  // ----- settings -----
  const insSet = db.prepare('INSERT INTO settings (key,value) VALUES (?,?)');
  insSet.run('registration_mode', 'verified');       // verified | open | closed
  insSet.run('stakeholder_provisioning', 'admin_only'); // admin_only | request
  insSet.run('messaging_model', 'inbox');            // inbox | realtime (informational)
  insSet.run('last_etl_sync', new Date().toISOString());

  // ----- users -----
  const insUser = db.prepare('INSERT INTO users (email,name,organization,password_hash,role,status) VALUES (?,?,?,?,?,?)');
  insUser.run('admin@nictd.gov.lr', 'Platform Administrator', 'Harris & Associates LLC', hashPassword('Admin!2026'), 'admin', 'active');
  insUser.run('stakeholder@partner.org', 'Partner Analyst', 'Development Partner (demo)', hashPassword('Stake!2026'), 'stakeholder', 'active');
  insUser.run('researcher@example.com', 'Registered Researcher', 'University of Liberia (demo)', hashPassword('Research!2026'), 'public', 'active');
  insUser.run('pending@example.com', 'Pending Applicant', 'Independent journalist (demo)', hashPassword('Pending!2026'), 'public', 'pending');

  // ----- papers -----
  const insPaper = db.prepare('INSERT INTO papers (title,authors,abstract,published_on,tag,body) VALUES (?,?,?,?,?,?)');
  insPaper.run(
    'State of Connectivity in Liberia 2025',
    'ICT Statistics & Policy Unit',
    'An annual assessment of internet penetration, mobile subscriptions and infrastructure rollout across all 15 counties, with county-level disaggregation and trend analysis from 2018 to 2025.',
    '2026-03-15', 'Flagship Report',
    'This flagship report draws on NICTD to track connectivity across Liberia. Internet penetration reached an estimated 33.6% nationally in 2025, up from 12.1% in 2018, but the urban–rural divide remains wide: urban connectivity stands near 61% while rural connectivity is 17.5%. Montserrado accounts for the largest share of subscriptions; Gbarpolu, River Cess and Grand Kru remain the least served counties.'
  );
  insPaper.run(
    'The Urban–Rural Connectivity Gap: County Evidence',
    'K. Doe, M. Johnson',
    'Using county-disaggregated data points from NICTD, this paper quantifies the urban–rural connectivity gap and models the infrastructure investment needed to halve it by 2030.',
    '2025-11-02', 'Working Paper',
    'The gap between urban and rural connectivity has narrowed only slightly since 2018. Counties with urban shares below 15% (Gbarpolu, River Cess, Grand Kru, River Gee) show rural connectivity under 10%.'
  );
  insPaper.run(
    'Mobile Money and Financial Inclusion in Liberia',
    'A. Freeman, T. Kollie',
    'An analysis of the growth in registered mobile money accounts and its relationship to ICT market structure indicators tracked in NICTD.',
    '2025-06-20', 'Brief',
    'Registered mobile money accounts rose from 6 per 100 adults in 2018 to an estimated 52 in 2025, outpacing fixed-broadband growth and reshaping the market-structure indicator set.'
  );
  insPaper.run(
    'Digital Trust and Governance: A Baseline',
    'ICT Statistics & Policy Unit',
    'The first structured baseline of Liberia’s data-protection framework, digital ID coverage and e-government service availability.',
    '2025-02-10', 'Report',
    'The data-protection framework score rose from 18 to 54 (of 100) as legal instruments and institutional capacity were put in place between 2018 and 2025.'
  );

  // ----- updates -----
  const insUpd = db.prepare('INSERT INTO updates (title,category,body,published_on) VALUES (?,?,?,?)');
  insUpd.run('2025 annual indicator refresh published', 'data_refresh',
    'All 30 indicators across six categories have been refreshed with 2025 year-end values for all 15 counties. The refresh passed automated validation and quality review; the Data Explorer, Indicator Catalogue and public API now serve the updated series.', '2026-06-30');
  insUpd.run('Internet penetration passes one third of the population', 'news',
    'New data in NICTD show internet penetration reached 33.6% of the population in 2025 — nearly tripling since 2018. Growth was fastest in Margibi and Grand Bassa.', '2026-05-18');
  insUpd.run('Digital Trust & Governance dashboard launched', 'announcement',
    'A new dashboard tracks the data-protection framework score, digital ID coverage, e-government service availability and reported cybersecurity incidents.', '2026-04-02');
  insUpd.run('Operator data-sharing feeds onboarded', 'announcement',
    'Two national mobile operators now share anonymized, aggregated statistics directly into the collection pipeline, improving the timeliness of market-structure indicators.', '2026-02-12');
  insUpd.run('Data Query builder and public API v1 released', 'news',
    'Researchers can now build a custom extract across indicators, counties and years in the Data Query builder, download it as CSV/JSON/XLSX, or generate the equivalent REST API call.', '2026-01-20');

  // ----- media -----
  const insMedia = db.prepare('INSERT INTO media (kind,title,description,file_path,video_provider,video_embed_id,access_level) VALUES (?,?,?,?,?,?,?)');
  insMedia.run('image', 'Fiber backbone route map (schematic)', 'Schematic of the national fiber backbone and planned county extensions.', '/media/backbone-map.svg', null, null, 'public');
  insMedia.run('image', 'County connectivity heat map, 2025', 'Relative internet penetration by county, 2025 year-end.', '/media/county-heatmap.svg', null, null, 'public');
  insMedia.run('image', 'Survey enumeration coverage', 'Enumeration areas covered in the 2025 national ICT survey wave.', '/media/survey-coverage.svg', null, null, 'registered');
  insMedia.run('paper', 'State of Connectivity in Liberia 2025 (report)', 'Full report — also listed under Research Papers.', '/papers/1/download', null, null, 'public');
  insMedia.run('video', 'Project launch briefing', 'Recorded launch briefing for NICTD. Hosted on a dedicated video service and embedded here (not stored in the primary database).', null, 'YouTube', 'CONFIGURE_EMBED_ID', 'public');
  insMedia.run('video', 'Methodology walkthrough for enumerators', 'Training video for county survey enumerators. Hosted externally; embed configured by administrators.', null, 'YouTube', 'CONFIGURE_EMBED_ID', 'registered');

  // ----- pending submissions (quality review queue) -----
  const insSub = db.prepare('INSERT INTO data_submissions (indicator_code,county_id,year,value,source,channel,status,validation_note) VALUES (?,?,?,?,?,?,?,?)');
  insSub.run('cell_towers', 11, 2026, 13.1, 'Operator feed Q2-2026', 'operator_feed', 'pending', 'Automated validation passed (within expected range).');
  insSub.run('internet_penetration', 8, 2026, 21.4, '2026 survey wave 1 (Lofa)', 'survey', 'pending', 'Automated validation passed (within expected range).');
  insSub.run('mobile_subscriptions', 2, 2026, 188.0, 'Manual upload template', 'manual', 'pending', 'FLAG: value exceeds plausible range for per-100 indicator — held for review.');

  // ----- seeded conversation -----
  const researcherId = db.prepare("SELECT id FROM users WHERE email='researcher@example.com'").get().id;
  const adminId = db.prepare("SELECT id FROM users WHERE email='admin@nictd.gov.lr'").get().id;
  db.prepare('INSERT INTO conversations (user_id, subject) VALUES (?,?)').run(researcherId, 'Question about county-level CSV downloads');
  const convId = db.prepare('SELECT id FROM conversations WHERE user_id=?').get(researcherId).id;
  const insMsg = db.prepare('INSERT INTO messages (conversation_id,sender_id,from_admin_team,body,read_by_user,read_by_admin,created_at) VALUES (?,?,?,?,?,?,?)');
  insMsg.run(convId, researcherId, 0, 'Hello — does the county CSV download include the national aggregate row, or counties only? I need it for a regression and want to avoid double counting.', 1, 1, '2026-07-01 09:14:00');
  insMsg.run(convId, adminId, 1, 'Good question. The per-county CSV contains counties only; national aggregates are a separate series (county field is empty in the combined download). The Data Query builder can generate both shapes. Let us know if anything is unclear.', 1, 1, '2026-07-01 15:40:00');

  // ----- historical usage events for analytics -----
  const insEvt = db.prepare('INSERT INTO events (kind,path,role,created_at) VALUES (?,?,?,?)');
  const paths = [['page_view', '/', null], ['page_view', '/data', null], ['page_view', '/indicators', null],
    ['page_view', '/dashboards/connectivity', 'public'], ['page_view', '/dashboards/trust-governance', 'stakeholder'], ['download', '/api/v1/download/data.csv', null],
    ['api_call', '/api/v1/data', null], ['page_view', '/updates', null], ['download', '/api/v1/download/data.json', 'public'], ['page_view', '/query', null]];
  db.exec('BEGIN');
  for (let d = 90; d >= 1; d--) {
    const day = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    const n = 6 + Math.floor(rand() * 14) + Math.floor((90 - d) / 8); // gently growing traffic
    for (let i = 0; i < n; i++) {
      const p = paths[Math.floor(rand() * paths.length)];
      insEvt.run(p[0], p[1], p[2], `${day} ${String(8 + Math.floor(rand() * 12)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`);
    }
  }
  db.exec('COMMIT');
}

module.exports = { db, hashPassword, verifyPassword };
