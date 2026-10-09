// Deterministic frame-by-frame renderer → 1080×1920 MP4 (H.264).
//
//   node render/render.mjs                         full film, 30 fps, 1080×1920
//   node render/render.mjs --scale 0.5             quick half-res preview
//   node render/render.mjs --from 20 --to 32       render a section
//   node render/render.mjs --ss 1.5                supersample (sharper, slower)
//   node render/render.mjs --stills 9.8,26,47.5    write PNG stills instead of video
//
// Each frame is produced by NIIP.captureFrame(t): the scene is posed for exact time t,
// rendered, composited with the HUD and piped to FFmpeg. No real-time clock is involved,
// so frame timing is perfect regardless of how slow the GPU is.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from '../serve.mjs';

// Puppeteer deletes its temp Chrome profile in the background; on Windows that can throw
// EBUSY after the work is done. Ignore only that case; anything else still crashes loudly.
process.on('uncaughtException', (e) => {
  if (e && e.code === 'EBUSY' && /puppeteer_dev_chrome_profile/.test(e.path || '')) return;
  console.error(e);
  process.exit(1);
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const scale = +args.scale || 1;
const W = Math.round((+args.w || 1080) * scale / 2) * 2;
const H = Math.round((+args.h || 1920) * scale / 2) * 2;
const FPS = +args.fps || 30;
const SS = +args.ss || 1.5;
const out = path.resolve(ROOT, args.out || 'out/niip-1080x1920.mp4');

function findBrowser() {
  const c = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const hit = c.find((p) => fs.existsSync(p));
  if (!hit) throw new Error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.');
  return hit;
}

async function findFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return (await import('ffmpeg-static')).default; } catch { return 'ffmpeg'; }
}

const server = await serve(0);
const port = server.address().port;
const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  protocolTimeout: 600000,
});

try {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?film&render&w=${W}&h=${H}&ss=${SS}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.NIIP_READY === true', { timeout: 120000 });
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`renderer: ${gpu}`);
  const duration = await page.evaluate('NIIP.duration');

  const grab = async (t, type) => {
    const url = await page.evaluate((tt, ty) => window.NIIP.captureFrame(tt, ty, 0.95), t, type);
    return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  };

  if (args.stills) {
    const dir = path.resolve(ROOT, args.dir || 'out/stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of String(args.stills).split(',').map(Number)) {
      const f = path.join(dir, `niip_${t.toFixed(1).padStart(5, '0')}s.png`);
      fs.writeFileSync(f, await grab(t, 'image/png'));
      console.log('still', f);
    }
  } else {
    const from = +args.from || 0, to = Math.min(+args.to || duration, duration);
    const frames = Math.round((to - from) * FPS);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // Encode to a side file; the finished video replaces `out` only on success,
    // so a crash mid-render never destroys the last good copy.
    const partial = out.replace(/\.mp4$/i, '') + '.partial.mp4';
    const ff = spawn(await findFfmpeg(), [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart', '-r', String(FPS), partial,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
    const t0 = Date.now();
    for (let i = 0; i < frames; i++) {
      const buf = await grab(from + i / FPS, 'image/png');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 15 === 0 || i === frames - 1) {
        const el = (Date.now() - t0) / 1000, eta = (el / (i + 1)) * (frames - i - 1);
        process.stdout.write(`\rframe ${i + 1}/${frames}  ${(((i + 1) / frames) * 100).toFixed(1)}%  eta ${Math.round(eta)}s   `);
      }
    }
    ff.stdin.end();
    await done;
    fs.renameSync(partial, out);
    console.log(`\nwrote ${out}  (${W}×${H}, ${FPS} fps, ${(to - from).toFixed(1)} s)`);
  }
} finally {
  // Chrome can hold its temp profile open on Windows (EBUSY); that must not fail a finished render.
  await browser.close().catch((e) => console.warn('browser close:', e.message));
  server.close();
}
