// supadb.js — minimal PostgREST client for the NICTD server (zero npm dependencies, Node >= 18 fetch).
// The key stays server-side: supabase-config.json is at the project root, outside the /public static dir.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'supabase-config.json'), 'utf8'));

// Server credential. With RLS enabled the server must use a secret key (it bypasses RLS);
// the publishable key only works while RLS is off. Prefer the environment so the secret
// never sits in a file: SUPABASE_SECRET_KEY, else "secretKey" in supabase-config.json.
const KEY = process.env.SUPABASE_SECRET_KEY || CFG.secretKey || CFG.key;
const KEY_KIND = KEY.startsWith('sb_secret_') ? 'secret'
  : KEY.startsWith('sb_publishable_') ? 'publishable' : 'legacy-jwt';
if (KEY_KIND === 'publishable') {
  console.warn('[supadb] Using the publishable key. Set SUPABASE_SECRET_KEY before enabling RLS '
    + '(docs/sql/rls-lockdown.sql), or every query will return nothing.');
}
// New sb_ keys go on the apikey header only; the gateway derives Authorization from it.
// Legacy JWT keys are also sent as a Bearer token.
const AUTH_HEADERS = KEY_KIND === 'legacy-jwt'
  ? { apikey: KEY, Authorization: `Bearer ${KEY}` }
  : { apikey: KEY };

// A dropped connection should not take a page down with it. Connect timeouts and resets are
// common on a metered or mobile link, and they are transient: the same call succeeds moments
// later. Read requests are safe to repeat, so they are retried with a short backoff. Writes are
// only retried when the connection failed before the request could be sent, so a row is never
// inserted twice.
const TRANSIENT = new Set([
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ECONNRESET', 'ETIMEDOUT',
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'UND_ERR_HEADERS_TIMEOUT',
]);
const isTransient = (e) => {
  const code = (e && (e.code || (e.cause && e.cause.code))) || '';
  return TRANSIENT.has(code) || /fetch failed/i.test(e && e.message || '');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, pathq, body, extraHeaders = {}, attempt = 0) {
  const RETRIES = 3;
  let res;
  try {
    res = await fetch(`${CFG.url}/rest/v1/${pathq}`, {
      method,
      headers: {
        ...AUTH_HEADERS,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    // The request never reached the server, so repeating it cannot duplicate anything.
    if (attempt < RETRIES && isTransient(e)) {
      await sleep(250 * Math.pow(2, attempt));
      return request(method, pathq, body, extraHeaders, attempt + 1);
    }
    const err = new Error(`supabase ${method} ${pathq.split('?')[0]} unreachable after `
      + `${attempt + 1} attempt(s): ${e.message}`);
    err.code = (e.cause && e.cause.code) || e.code || 'NETWORK';
    err.transient = true;
    throw err;
  }
  if (!res.ok) {
    // 5xx from PostgREST or the gateway is worth one more try on a read.
    if (attempt < RETRIES && res.status >= 500 && method === 'GET') {
      await sleep(250 * Math.pow(2, attempt));
      return request(method, pathq, body, extraHeaders, attempt + 1);
    }
    const text = await res.text().catch(() => '');
    const err = new Error(`supabase ${method} ${pathq.split('?')[0]} -> ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// GET rows: sel('data_points?select=year,value&indicator_code=eq.x&order=year')
const sel = (q) => request('GET', q, undefined, { Prefer: 'count=none' });
// INSERT rows; pass ret=true to get inserted rows back
const ins = (table, rows, ret) => request('POST', table, rows, { Prefer: ret ? 'return=representation' : 'return=minimal' });
// UPSERT on primary key / unique constraint
const ups = (table, rows) => request('POST', table, rows, { Prefer: 'resolution=merge-duplicates,return=minimal' });
// UPDATE with a PostgREST filter string, e.g. upd('users', 'id=eq.4', { status: 'active' })
const upd = (table, filter, patch) => request('PATCH', `${table}?${filter}`, patch, { Prefer: 'return=minimal' });
// DELETE with a filter string
const del = (table, filter) => request('DELETE', `${table}?${filter}`, undefined, { Prefer: 'return=minimal' });
// Call a Postgres function: rpc('explorer_table', { p_indicator: 'x', p_year: 2025 })
const rpc = (name, args) => request('POST', `rpc/${name}`, args || {});

// value encoder for filter strings (handles spaces, commas, quotes in county names etc.)
const enc = (v) => encodeURIComponent(String(v));
// quoted in-list: inList(['Grand Bassa','Bomi']) -> in.("Grand Bassa","Bomi") url-encoded
const inList = (values) => 'in.' + encodeURIComponent('(' + values.map((v) => `"${String(v).replace(/"/g, '')}"`).join(',') + ')');

module.exports = { sel, ins, ups, upd, del, rpc, enc, inList, CFG };
