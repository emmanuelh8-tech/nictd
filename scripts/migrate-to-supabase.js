// migrate-to-supabase.js — one-shot migration: local SQLite -> Supabase Postgres (via PostgREST).
// Also generates the 50 platform user accounts and writes docs/USER-CREDENTIALS.md.
// Run: node scripts/migrate-to-supabase.js
'use strict';
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'supabase-config.json'), 'utf8'));
const sqlite = new DatabaseSync(path.join(ROOT, 'data', 'nictd.sqlite'), { readOnly: true });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function sb(method, pathq, body, headers = {}) {
  const res = await fetch(`${CFG.url}/rest/v1/${pathq}`, {
    method,
    headers: {
      apikey: CFG.key,
      Authorization: `Bearer ${CFG.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${pathq} -> ${res.status}: ${text.slice(0, 500)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const insert = (table, rows, ret) => sb('POST', table, rows, ret ? { Prefer: 'return=representation' } : {});
const del = (table, filter) => sb('DELETE', `${table}?${filter}`);

async function insertBatched(table, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    await insert(table, rows.slice(i, i + size));
    process.stdout.write(`  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ${table}: ${rows.length} rows        `);
}

// ---------- 50 user accounts ----------
const FIRST = ['Emmanuel', 'Fatu', 'Joseph', 'Musu', 'Samuel', 'Korto', 'Moses', 'Hawa', 'James', 'Bendu',
  'Daniel', 'Kormassa', 'Prince', 'Miatta', 'Varney', 'Kebbeh', 'Sekou', 'Yatta', 'Abraham', 'Massa',
  'Patrick', 'Tenneh', 'Alfred', 'Kou', 'Boakai', 'Garmai', 'Amos', 'Wokie', 'Isaac', 'Sando',
  'Titus', 'Comfort', 'Aaron', 'Decontee', 'Nathaniel', 'Kula', 'Oretha', 'Saah', 'Roland', 'Cecelia'];
const LAST = ['Johnson', 'Kollie', 'Doe', 'Freeman', 'Kamara', 'Weah', 'Gaye', 'Toe', 'Flomo', 'Barclay',
  'Cooper', 'Dennis', 'Gibson', 'Jallah', 'Karnga', 'Mulbah', 'Nagbe', 'Paye', 'Richards', 'Sackie',
  'Tarr', 'Washington', 'Wreh', 'Yancy', 'Zayzay', 'Brooks', 'Carter', 'Momo', 'Togba', 'Vah'];
const PWORDS = ['Nimba', 'Lofa', 'Bong', 'Sinoe', 'Bomi', 'Margibi', 'Maryland', 'Gbarpolu', 'Harper', 'Ganta',
  'Kakata', 'Zwedru', 'Voinjama', 'Buchanan', 'Gbarnga', 'Palava', 'Kpelle', 'Bassa', 'Mano', 'Vai'];
const STAKE_ORGS = [
  ['Liberia Telecommunications Authority', 'lta.gov.lr'],
  ['LISGIS', 'lisgis.gov.lr'],
  ['Ministry of Education', 'moe.gov.lr'],
  ['Central Bank of Liberia', 'cbl.org.lr'],
  ['World Bank Group (demo)', 'worldbank.example'],
  ['UNDP Liberia (demo)', 'undp.example'],
  ['Environmental Protection Agency', 'epa.gov.lr'],
];
const PUB_ORGS = ['University of Liberia', 'Cuttington University', 'Daily Observer (demo)', 'FrontPage Africa (demo)',
  'Independent researcher', 'BSC Monrovia (demo)', 'Liberia Media Center (demo)', 'Civil society (demo)'];

function genPassword(i) {
  const w = PWORDS[i % PWORDS.length];
  const n = 1000 + crypto.randomInt(9000);
  return `${w}#${n}`;
}

function buildUsers() {
  const users = [];
  const creds = [];
  const usedEmails = new Set();
  const add = (name, email, organization, role, password) => {
    if (usedEmails.has(email)) email = email.replace('@', `${users.length}@`);
    usedEmails.add(email);
    users.push({ email, name, organization, role, status: 'active', password_hash: hashPassword(password) });
    creds.push({ name, email, organization, role, password });
  };

  // 3 administrators — primary admin first
  add('Platform Administrator', 'admin@nictd.gov.lr', 'Harris & Associates LLC', 'admin', 'Admin!2026');
  add('Joseph Kollie', 'joseph.kollie@nictd.gov.lr', 'ICT Statistics & Policy Unit, MoPT', 'admin', genPassword(1));
  add('Fatu Kamara', 'fatu.kamara@nictd.gov.lr', 'ICT Statistics & Policy Unit, MoPT', 'admin', genPassword(2));

  // 8 stakeholders — keep legacy demo account
  add('Partner Analyst', 'stakeholder@partner.org', 'Development Partner (demo)', 'stakeholder', 'Stake!2026');
  for (let i = 0; i < 7; i++) {
    const fn = FIRST[(i * 3 + 4) % FIRST.length], ln = LAST[(i * 5 + 2) % LAST.length];
    const [org, dom] = STAKE_ORGS[i];
    add(`${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@${dom}`, org, 'stakeholder', genPassword(i + 3));
  }

  // 39 public users — keep legacy demo researcher
  add('Registered Researcher', 'researcher@example.com', 'University of Liberia (demo)', 'public', 'Research!2026');
  for (let i = 0; i < 38; i++) {
    const fn = FIRST[(i * 7 + 1) % FIRST.length], ln = LAST[(i * 11 + 3) % LAST.length];
    const org = PUB_ORGS[i % PUB_ORGS.length];
    add(`${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`, org, 'public', genPassword(i + 10));
  }
  return { users, creds };
}

// ---------- synthetic usage events (analytics demo data) ----------
function buildEvents() {
  const paths = [['page_view', '/', null], ['page_view', '/data', null], ['page_view', '/indicators', null],
    ['page_view', '/dashboards/connectivity', 'public'], ['page_view', '/dashboards/trust-governance', 'stakeholder'],
    ['download', '/api/v1/download/data.csv', null], ['api_call', '/api/v1/data', null],
    ['page_view', '/updates', null], ['download', '/api/v1/download/data.json', 'public'], ['page_view', '/query', null]];
  const rows = [];
  for (let d = 90; d >= 1; d--) {
    const n = 6 + Math.floor(Math.random() * 14) + Math.floor((90 - d) / 8);
    for (let i = 0; i < n; i++) {
      const p = paths[Math.floor(Math.random() * paths.length)];
      const ts = new Date(Date.now() - d * 86400000 + (8 + Math.random() * 12) * 3600000);
      rows.push({ kind: p[0], path: p[1], role: p[2], created_at: ts.toISOString() });
    }
  }
  return rows;
}

async function main() {
  console.log('Clearing existing Supabase data (fresh load)…');
  for (const [t, f] of [['events', 'id=gte.0'], ['messages', 'id=gte.0'], ['conversations', 'id=gte.0'],
    ['saved_queries', 'id=gte.0'], ['data_submissions', 'id=gte.0'], ['access_requests', 'id=gte.0'],
    ['sessions', 'token=neq.__none__'], ['media', 'id=gte.0'], ['updates', 'id=gte.0'], ['papers', 'id=gte.0'],
    ['data_points', 'id=gte.0'], ['users', 'id=gte.0'], ['role_permissions', 'role=neq.__none__'],
    ['settings', 'key=neq.__none__'], ['site_content', 'key=neq.__none__'], ['indicators', 'code=neq.__none__'],
    ['counties', 'id=gte.0']]) {
    await del(t, f);
  }

  console.log('Loading reference + fact data from local SQLite…');
  await insert('counties', sqlite.prepare('SELECT id,name,capital,population,area_km2,urban_share FROM counties').all());
  console.log('  counties: 15 rows');
  await insert('indicators', sqlite.prepare('SELECT code,name,domain,dashboard,unit,description,methodology,agency,periodicity,access_level,headline FROM indicators').all());
  console.log('  indicators: 30 rows');

  const dps = sqlite.prepare('SELECT indicator_code,county_id,year,value,source,updated_at FROM data_points').all()
    .map((r) => ({ ...r, updated_at: new Date(r.updated_at.replace(' ', 'T') + 'Z').toISOString() }));
  await insertBatched('data_points', dps);

  await insert('role_permissions', sqlite.prepare('SELECT role,permission FROM role_permissions').all());
  console.log('  role_permissions loaded');
  const settings = sqlite.prepare('SELECT key,value FROM settings').all()
    .map((s) => (s.key === 'last_etl_sync' ? { ...s, value: new Date().toISOString() } : s));
  await insert('settings', settings);
  console.log('  settings loaded');

  await insert('site_content', [
    { key: 'hero_title', value: 'The definitive source of ICT statistics and digital-development data for Liberia.' },
    { key: 'hero_sub', value: "NICTD tracks connectivity, affordability, market structure and digital governance across Liberia's 15 counties. Explore live indicators, compare counties, and download open data — all built on a continuously validated national statistics pipeline." },
    { key: 'about_mission', value: "The National ICT Database of Liberia (NICTD) is the country's official, continuously maintained source of ICT statistics — infrastructure, usage, affordability, market structure, digital trust and governance, and sustainability — disaggregated across all 15 counties. NICTD exists to give researchers, policymakers, donors and the public a single, trustworthy place to find and compare Liberia's digital-development data." },
    { key: 'key_numbers', value: 'mobile_subscriptions,internet_penetration,fixed_broadband_subs,mobile_money_accounts' },
  ]);
  console.log('  site_content loaded');

  await insert('papers', sqlite.prepare('SELECT title,authors,abstract,published_on,tag,body FROM papers ORDER BY id').all());
  await insert('updates', sqlite.prepare('SELECT title,category,body,published_on FROM updates ORDER BY id').all());
  await insert('media', sqlite.prepare('SELECT kind,title,description,file_path,video_provider,video_embed_id,access_level FROM media ORDER BY id').all());
  console.log('  papers/updates/media loaded');

  console.log('Creating 50 user accounts…');
  const { users, creds } = buildUsers();
  const created = await insert('users', users, true);
  const idByEmail = {};
  created.forEach((u) => { idByEmail[u.email] = u.id; });
  console.log(`  users: ${created.length} rows`);

  // seeded researcher conversation with the admin team
  const rid = idByEmail['researcher@example.com'];
  const aid = idByEmail['admin@nictd.gov.lr'];
  const [conv] = await insert('conversations', [{ user_id: rid, subject: 'Question about county-level CSV downloads', updated_at: '2026-07-01T15:40:00Z' }], true);
  await insert('messages', [
    { conversation_id: conv.id, sender_id: rid, from_admin_team: 0, body: 'Hello — does the county CSV download include the national aggregate row, or counties only? I need it for a regression and want to avoid double counting.', read_by_user: 1, read_by_admin: 1, created_at: '2026-07-01T09:14:00Z' },
    { conversation_id: conv.id, sender_id: aid, from_admin_team: 1, body: 'Good question. The per-county CSV contains counties only; national aggregates are a separate series (county field is empty in the combined download). The Data Query builder can generate both shapes. Let us know if anything is unclear.', read_by_user: 1, read_by_admin: 1, created_at: '2026-07-01T15:40:00Z' },
  ]);
  console.log('  seeded conversation loaded');

  await insert('data_submissions', sqlite.prepare("SELECT indicator_code,county_id,year,value,source,channel,status,validation_note FROM data_submissions WHERE status='pending'").all());
  console.log('  quality-review queue loaded');

  // two sample pending access requests so the admin portal section isn't empty
  await insert('access_requests', [
    { name: 'Angeline Toe', email: 'angeline.toe@press.example', organization: 'New Republic (demo)', phone: '+231 77 555 0101', role_requested: 'public', purpose: 'Requesting county-level connectivity data for a reporting series on rural internet access.' },
    { name: 'Marcus Flomo', email: 'marcus.flomo@afdb.example', organization: 'African Development Bank (demo)', phone: '+231 88 555 0202', role_requested: 'stakeholder', purpose: 'Programme appraisal — need affordability and market-structure series beyond the public tier.' },
  ]);
  console.log('  sample access requests loaded');

  console.log('Generating usage analytics events…');
  await insertBatched('events', buildEvents());

  // credentials document
  const roles = { admin: 'Administrator', stakeholder: 'Stakeholder', public: 'Public User' };
  let md = `# NICTD — User Accounts & Login Credentials\n\n**CONFIDENTIAL — demonstration accounts.** Generated ${new Date().toISOString().slice(0, 10)}. All accounts are active; passwords can be changed by re-provisioning from the Admin Panel.\n\n`;
  for (const role of ['admin', 'stakeholder', 'public']) {
    const list = creds.filter((c) => c.role === role);
    md += `## ${roles[role]}s (${list.length})\n\n| # | Name | Email | Organization | Password |\n|---|------|-------|--------------|----------|\n`;
    list.forEach((c, i) => { md += `| ${i + 1} | ${c.name} | ${c.email} | ${c.organization} | \`${c.password}\` |\n`; });
    md += '\n';
  }
  fs.writeFileSync(path.join(ROOT, 'docs', 'USER-CREDENTIALS.md'), md);
  console.log('Wrote docs/USER-CREDENTIALS.md');
  console.log('Migration complete.');
}

main().catch((e) => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
