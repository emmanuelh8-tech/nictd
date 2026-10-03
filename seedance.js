// seedance.js — server-side client for the Seedance 3 public API (video + image generation).
// The API key is read from seedance-key.txt (gitignored) and NEVER sent to the browser.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASE = 'https://www.seedances3.com/api/v1';
const KEY_FILE = path.join(__dirname, 'seedance-key.txt');

function apiKey() {
  try {
    const raw = fs.readFileSync(KEY_FILE, 'utf8').trim();
    if (!raw || raw.startsWith('PASTE-')) return null;
    return raw;
  } catch { return null; }
}
const isConfigured = () => !!apiKey();

async function call(method, endpoint, body, idempotencyKey) {
  const key = apiKey();
  if (!key) { const e = new Error('Seedance API key not configured'); e.code = 'not_configured'; throw e; }
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${BASE}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || `Seedance ${res.status}`);
    err.code = (data.error && data.error.code) || 'http_' + res.status;
    err.status = res.status;
    throw err;
  }
  return data;
}

// Submit a Seedance 2 video job. opts: {mode, quality_tier, channel, prompt, aspect_ratio, duration, resolution, image_url, generate_audio}
async function submitVideo2(opts) {
  const body = { mode: opts.mode || 'text-to-video', quality_tier: opts.quality_tier || 'mini', prompt: opts.prompt,
    aspect_ratio: opts.aspect_ratio || '16:9', duration: String(opts.duration || '5'), resolution: opts.resolution || '720p' };
  if (opts.channel) body.channel = opts.channel;
  if (opts.image_url) body.image_url = opts.image_url;
  if (opts.generate_audio != null) body.generate_audio = !!opts.generate_audio;
  return call('POST', '/video/seedance2', body, 'nictd-' + crypto.randomUUID());
}

// Submit a Seedance 2.5 video job (no quality_tier/seed). opts: {mode, channel, prompt, aspect_ratio, duration, resolution, image_url, generate_audio}
async function submitVideo25(opts) {
  const body = { mode: opts.mode || 'text-to-video', prompt: opts.prompt,
    aspect_ratio: opts.aspect_ratio || '16:9', duration: String(opts.duration || '5'), resolution: opts.resolution || '720p' };
  if (opts.channel) body.channel = opts.channel;
  if (opts.image_url) body.image_url = opts.image_url;
  if (opts.generate_audio != null) body.generate_audio = !!opts.generate_audio;
  return call('POST', '/video/seedance25', body, 'nictd-' + crypto.randomUUID());
}

const getTask = (id) => call('GET', `/tasks/${encodeURIComponent(id)}`);

// Download a finished video URL to public/media/generated/<name>.mp4; returns the public path.
async function downloadVideo(url, name) {
  const dir = path.join(__dirname, 'public', 'media', 'generated');
  fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed: ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = `${name}.mp4`;
  fs.writeFileSync(path.join(dir, file), buf);
  return `/media/generated/${file}`;
}

// Friendly message for known API error codes.
function friendlyError(err) {
  const map = {
    not_configured: 'Video generation is not configured (missing API key).',
    unauthorized: 'The Seedance API key is invalid or revoked.',
    purchase_required: 'This tier needs a paid Seedance account. Use the “mini” tier, or top up credits on seedances3.com.',
    insufficient_credits: 'Not enough Seedance credits on the account. Top up to continue.',
    credits_frozen: 'Seedance credit spending is temporarily unavailable for this account.',
    rate_limited: 'Too many generation requests — please wait a minute and try again.',
    invalid_request: 'The generation request was rejected: ' + (err.message || 'invalid input') + '.',
    service_busy: 'Seedance is temporarily busy — please retry shortly.',
  };
  return map[err.code] || (err.message || 'Video generation failed.');
}

module.exports = { isConfigured, submitVideo2, submitVideo25, getTask, downloadVideo, friendlyError };
