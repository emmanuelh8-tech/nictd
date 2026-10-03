// gen-collection-template.js — generate data-collection templates from the LIVE Supabase catalogue.
// Produces (in templates/):
//   1. nictd-collection-template-<year>.csv  — fillable, bulk-upload-ready (indicator_code,county,year,value,source)
//   2. nictd-indicator-dictionary.csv         — human reference (metadata + channel + how-to-collect)
// Run: node scripts/gen-collection-template.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sdb = require('../supadb');

const OUT = path.join(__dirname, '..', 'templates');
fs.mkdirSync(OUT, { recursive: true });

// per-indicator collection guidance (domain knowledge; keyed by indicator code)
// channel: survey | operator_feed | manual  ·  matches the platform's three ingestion channels
const GUIDE = {
  internet_penetration:    { channel: 'survey',        source_agency: 'LISGIS / LTA',                 how: 'National household ICT survey — individuals using the internet in the last 3 months, per county.' },
  mobile_subscriptions:    { channel: 'operator_feed', source_agency: 'LTA (operator returns)',        how: 'Active mobile-cellular SIM counts from operators, normalized per 100 inhabitants.' },
  mobile_broadband_subs:   { channel: 'operator_feed', source_agency: 'LTA (operator returns)',        how: 'Active 3G+ data subscriptions from operators, per 100 inhabitants.' },
  fixed_broadband_subs:    { channel: 'operator_feed', source_agency: 'LTA / ISPs',                    how: 'Fixed (wired) broadband subscriber counts filed by ISPs, per 100 inhabitants.' },
  urban_connectivity:      { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey, urban enumeration areas — share with regular internet access.' },
  rural_connectivity:      { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey, rural enumeration areas — share with regular internet access.' },
  gender_access_gap:       { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey — male minus female internet-use rate (percentage points).' },
  youth_access:            { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey, ages 15–24 — internet use in the age group.' },
  cell_towers:             { channel: 'operator_feed', source_agency: 'LTA site registry',             how: 'Active macro cell sites from the site registry, divided by county land area (per 1,000 km²).' },
  mobile_network_coverage: { channel: 'operator_feed', source_agency: 'LTA / operators',              how: 'Operator 4G coverage-engineering polygons overlaid on the population grid; share of population covered.' },
  fiber_coverage:          { channel: 'manual',        source_agency: 'LTA / MoPT backbone unit',      how: 'Backbone route survey — share of administrative districts within 10 km of the fiber backbone.' },
  broadband_points:        { channel: 'operator_feed', source_agency: 'LTA / ISPs',                    how: 'Registered fixed broadband access points (ISP POPs, public access sites) — absolute count per county.' },
  school_connectivity:     { channel: 'manual',        source_agency: 'Ministry of Education (EMIS)',  how: 'EMIS school census — share of primary/secondary schools with a working internet connection.' },
  student_device_ratio:    { channel: 'manual',        source_agency: 'Ministry of Education (EMIS)',  how: 'School census — enrolment divided by internet-capable learning devices, in connected schools.' },
  mobile_basket_price:     { channel: 'manual',        source_agency: 'LTA tariffs + LISGIS income',   how: 'Priced entry-level mobile data-and-voice basket as a % of GNI per capita (county income from survey).' },
  broadband_basket_price:  { channel: 'manual',        source_agency: 'LTA tariffs + LISGIS income',   how: 'Priced entry-level fixed-broadband basket as a % of GNI per capita.' },
  smartphone_ownership:    { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey device-ownership module — adults owning an internet-capable smartphone.' },
  data_consumption:        { channel: 'operator_feed', source_agency: 'LTA / operators',              how: 'Aggregate mobile data traffic divided by active data subscribers (GB per user per month).' },
  low_income_access:       { channel: 'survey',        source_agency: 'LISGIS',                        how: 'Household survey — internet use within the lowest household-income quintile.' },
  ict_businesses:          { channel: 'manual',        source_agency: 'MoPT / business registry',      how: 'National business registry filtered to ICT-sector businesses — absolute count per county.' },
  ict_employment:          { channel: 'manual',        source_agency: 'MoPT / sector returns',         how: 'Formal employment reported by registered ICT businesses — job counts per county.' },
  sector_investment:       { channel: 'manual',        source_agency: 'MoPT',                          how: 'Disclosed annual public + private ICT investment (US$ millions).' },
  mobile_money_accounts:   { channel: 'manual',        source_agency: 'Central Bank of Liberia',       how: 'Registered mobile-money accounts from CBL reporting, per 100 adults.' },
  data_protection_index:   { channel: 'manual',        source_agency: 'ICT Statistics & Policy Unit',  how: 'Annual expert scoring (0–100) of data-protection laws and institutional capacity in force. National figure applied to counties.' },
  digital_id_coverage:     { channel: 'manual',        source_agency: 'National ID authority',         how: 'Registered digital/national IDs usable online, divided by adult population.' },
  egov_services_index:     { channel: 'manual',        source_agency: 'ICT Statistics & Policy Unit',  how: 'Structured audit (0–100) of government services available online. National figure applied to counties.' },
  cyber_incidents_reported:{ channel: 'manual',        source_agency: 'National CERT',                 how: 'Cybersecurity incidents formally reported to the national CERT (count per year).' },
  ewaste_generated:        { channel: 'manual',        source_agency: 'EPA / MoPT',                    how: 'Device import/take-back registry modelled to kg of e-waste generated per capita.' },
  ewaste_collection_rate:  { channel: 'manual',        source_agency: 'EPA / registered recyclers',    how: 'Formally collected/recycled e-waste tonnage divided by e-waste generated (%).' },
  ict_renewable_energy:    { channel: 'manual',        source_agency: 'EPA + operators',               how: 'Share of ICT-sector electricity consumption sourced from renewables (%).' },
};

const CHANNEL_LABEL = { survey: 'Survey', operator_feed: 'Operator feed', manual: 'Manual upload' };

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(cells) { return cells.map(csvCell).join(','); }

async function main() {
  const [indicators, counties, years] = await Promise.all([
    sdb.sel('indicators?select=code,name,domain,unit,access_level,periodicity&order=domain,name'),
    sdb.sel('counties?select=id,name&order=id'),
    sdb.rpc('all_years'),
  ]);
  const nextYear = (Math.max(...years) || new Date().getFullYear() - 1) + 1;

  const DOMAIN_LABEL = { connectivity: 'Connectivity', access: 'Access & Infrastructure', affordability: 'Affordability', market: 'Market Structure', trust: 'Trust & Governance', sustainability: 'Sustainability' };
  const domainRank = { connectivity: 1, access: 2, affordability: 3, market: 4, trust: 5, sustainability: 6 };
  indicators.sort((a, b) => (domainRank[a.domain] - domainRank[b.domain]) || a.name.localeCompare(b.name));

  // ---- 1. fillable upload-ready template (value blank, ready to bulk-upload once filled) ----
  const tmplLines = [csvRow(['indicator_code', 'county', 'year', 'value', 'source'])];
  for (const ind of indicators) {
    for (const c of counties) {
      tmplLines.push(csvRow([ind.code, c.name, nextYear, '', '']));
    }
  }
  const tmplFile = path.join(OUT, `nictd-collection-template-${nextYear}.csv`);
  fs.writeFileSync(tmplFile, tmplLines.join('\n') + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), tmplFile)} — ${indicators.length} indicators × ${counties.length} counties = ${indicators.length * counties.length} blank rows for ${nextYear}`);

  // ---- 2. human reference dictionary ----
  const dictLines = [csvRow(['domain', 'indicator_code', 'indicator_name', 'unit', 'access_tier', 'collection_channel', 'source_agency', 'reporting_frequency', 'how_to_collect'])];
  for (const ind of indicators) {
    const g = GUIDE[ind.code] || {};
    dictLines.push(csvRow([
      DOMAIN_LABEL[ind.domain] || ind.domain, ind.code, ind.name, ind.unit, ind.access_level,
      CHANNEL_LABEL[g.channel] || 'Manual upload', g.source_agency || '', ind.periodicity || 'Annual', g.how || '',
    ]));
  }
  const dictFile = path.join(OUT, 'nictd-indicator-dictionary.csv');
  fs.writeFileSync(dictFile, dictLines.join('\n') + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), dictFile)} — ${indicators.length} indicators with collection guidance`);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
