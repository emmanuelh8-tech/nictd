// 2D HUD drawn into its own canvas (so the recorder can composite it into every frame):
// chapter titles, technical callouts, amber target frames, LOD ruler, timecode.
import * as THREE from 'three';
import { registry, SECTORS, RECORD_FIELDS, REPOS } from './scene.js';
import { CHAPTERS, CENTER_TITLES, CALLOUTS, FRAMES, LEVELS, DURATION, smooth } from './timeline.js';

const FONT = '"Saira Semi Condensed", "Segoe UI", sans-serif';
const MONO = '"JetBrains Mono", Consolas, monospace';
const ACC = '#3dffc8';
const AMBER = '#ffc35a';

// NIIP mark, dark variant (same geometry as brand/niip-mark-dark.svg, 120-unit box)
const OCT = [[111.74, 38.57], [111.74, 81.43], [81.43, 111.74], [38.57, 111.74], [8.26, 81.43], [8.26, 38.57], [38.57, 8.26], [81.43, 8.26]];
function drawMark(c, x, y, size, reveal = 1) {
  const k = size / 120;
  c.save();
  c.translate(x, y); c.scale(k, k);
  const oct = new Path2D();
  OCT.forEach(([px, py], i) => (i ? oct.lineTo(px, py) : oct.moveTo(px, py)));
  oct.closePath();
  c.fillStyle = '#14181B'; c.fill(oct);
  c.lineWidth = 2.5; c.lineJoin = 'round'; c.strokeStyle = '#3A4147'; c.stroke(oct);
  c.save(); c.clip(oct);
  // the three layer bands slide in from their exploded offsets
  const bands = [[6, 31, '#6B737C'], [21, 52, '#3DFFC8'], [36, 73, '#6B737C']];
  bands.forEach(([bx, by, col], i) => {
    const off = (1 - reveal) * (i - 1) * 26;
    c.fillStyle = col;
    c.beginPath(); c.roundRect(bx + off, by, 80, 16, 8); c.fill();
  });
  c.restore();
  c.fillStyle = '#FFC35A'; c.globalAlpha *= reveal;
  c.beginPath(); c.arc(106, 20, 6, 0, Math.PI * 2); c.fill();
  c.restore();
}

const vis = (t, t0, t1, fin = 0.5, fout = 0.4) => smooth((t - t0) / fin) * (1 - smooth((t - (t1 - fout)) / fout));

export class HUD {
  constructor(canvas) {
    this.cv = canvas;
    this.c = canvas.getContext('2d');
    this.v = new THREE.Vector3();
    this.inset = 0; // canvas px kept clear at the bottom (e.g. for the player bar)
  }

  // u = 1 at 1080 px on the short side, in portrait or landscape
  resize(w, h, scale = 1) { this.cv.width = w; this.cv.height = h; this.w = w; this.h = h; this.u = (Math.min(w, h) / 1080) * scale; }

  project(p, camera) {
    const v = this.v.copy(p).project(camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, behind: v.z > 1 };
  }

  /** film = full cinematic HUD; interactive passes its own callouts/frames */
  draw({ t, camera, root, dist, film = true, callouts = null, frames = null, showRuler = true }) {
    const { c, w, h, u } = this;
    c.clearRect(0, 0, w, h);
    const pad = 64 * u;
    // edge vignette lines (subtle letterbox)
    if (film) this.topBar(t, pad);
    if (showRuler) this.ruler(dist, pad);

    const fr = frames || (film ? FRAMES.filter((f) => t > f.t0 && t < f.t1).map((f) => ({ id: f.id, a: vis(t, f.t0, f.t1, 0.35, 0.35) })) : []);
    fr.forEach((f) => this.frame(f.id, f.a, camera, root));

    const co = callouts || (film ? CALLOUTS.filter((l) => t > l.t0 && t < l.t1).map((l) => ({ ...l, a: vis(t, l.t0, l.t1, 0.45, 0.35) })) : []);
    const boxes = co.map((l) => this.layoutCallout(l, camera, root)).filter(Boolean);
    this.separate(boxes);
    boxes.forEach((b) => this.drawCallout(b));

    if (film) {
      CHAPTERS.forEach((ch) => { if (t > ch.t0 && t < ch.t1) this.chapter(ch, vis(t, ch.t0, ch.t1, 0.6, 0.45), pad); });
      CENTER_TITLES.forEach((ct) => { if (t > ct.t0 && t < ct.t1) this.center(ct, vis(t, ct.t0, ct.t1, 1.0, 0.8)); });
    }
  }

  topBar(t, pad) {
    const { c, w, u } = this;
    c.save();
    c.fillStyle = 'rgba(232,238,236,0.92)';
    c.font = `700 ${30 * u}px ${FONT}`;
    c.textBaseline = 'top';
    drawMark(c, pad, pad - 1 * u, 32 * u);
    c.fillText('NIIP', pad + 42 * u, pad);
    c.fillStyle = 'rgba(200,212,210,0.55)';
    c.font = `500 ${15 * u}px ${MONO}`;
    this.tracked('NATIONAL ICT INTELLIGENCE PROGRAM', pad + 124 * u, pad + 9 * u, 2.2 * u);
    c.textAlign = 'right';
    c.fillStyle = 'rgba(232,238,236,0.85)';
    c.font = `500 ${28 * u}px ${MONO}`;
    const rem = Math.max(0, DURATION - t);
    c.fillText(`${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}`, w - pad, pad - 2 * u);
    c.restore();
  }

  tracked(text, x, y, sp) {
    const { c } = this;
    let cx = x;
    for (const ch of text) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
    return cx - x;
  }
  trackedWidth(text, sp) { let wdt = 0; for (const ch of text) wdt += this.c.measureText(ch).width + sp; return wdt; }

  ruler(dist, pad) {
    const { c, w, h, u } = this;
    const x = w - pad - 6 * u, y0 = h * 0.2, y1 = h * 0.62;
    const lg = (d) => Math.log(d);
    const a = lg(LEVELS[0].d), b = lg(LEVELS[LEVELS.length - 1].d);
    const yOf = (d) => y0 + ((lg(d) - a) / (b - a)) * (y1 - y0);
    c.save();
    c.strokeStyle = 'rgba(210,220,218,0.35)';
    c.lineWidth = Math.max(1, 1.2 * u);
    c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
    c.font = `500 ${12 * u}px ${MONO}`;
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(210,220,218,0.5)';
    this.trackedRight('LEVEL OF DETAIL', x + 4 * u, y0 - 26 * u, 1.6 * u);
    for (let i = 0; i <= 30; i++) {
      const yy = y0 + (i / 30) * (y1 - y0);
      c.beginPath(); c.moveTo(x, yy); c.lineTo(x - (i % 6 === 0 ? 10 : 5) * u, yy); c.stroke();
    }
    const cur = Math.min(Math.max(dist, LEVELS[LEVELS.length - 1].d), LEVELS[0].d);
    LEVELS.forEach((L) => {
      const yy = yOf(L.d);
      const near = Math.abs(lg(cur) - lg(L.d)) < 0.9;
      c.fillStyle = near ? 'rgba(240,246,244,0.95)' : 'rgba(200,212,210,0.45)';
      c.font = `${near ? 600 : 500} ${13 * u}px ${MONO}`;
      this.trackedRight(L.name.toUpperCase(), x - 18 * u, yy, 1.4 * u);
    });
    const ym = yOf(cur);
    c.fillStyle = AMBER;
    c.fillRect(x - 3 * u, ym - 1.5 * u, 22 * u, 3 * u);
    c.textBaseline = 'middle';
    c.font = `500 ${14 * u}px ${MONO}`;
    c.fillStyle = 'rgba(240,246,244,0.9)';
    const mag = LEVELS[0].d / dist;
    const magTxt = mag >= 100 ? Math.round(mag).toLocaleString('en-US') : mag.toFixed(1);
    this.trackedRight(`×${magTxt}`, x - 112 * u, ym, 1 * u);
    c.restore();
  }
  trackedRight(text, x, y, sp) { const wd = this.trackedWidth(text, sp); this.tracked(text, x - wd, y, sp); }

  anchorFor(l, root) {
    if (l.sector != null) {
      const micro = registry.get('MICRO').group;
      const a = (l.sector + 0.5) * Math.PI / 3;
      return new THREE.Vector3(Math.sin(a) * 0.72, 0.05, Math.cos(a) * 0.72).applyMatrix4(micro.matrixWorld);
    }
    if (l.field != null) {
      const f = root.getObjectByName(`FIELD_${RECORD_FIELDS[l.field].k.toUpperCase()}`);
      return new THREE.Vector3(0, 0.0013, 0).applyMatrix4(f.matrixWorld);
    }
    if (l.bits) {
      const f = root.getObjectByName('FIELD_VALUE');
      const row = l.bits === 'sign' ? 0 : l.bits === 'exp' ? 1.5 : 9;
      const col = l.bits === 'sign' ? -1.5 : 0;
      return new THREE.Vector3(col * 0.0003, 0.0026, (row - 7.5) * 0.00037).applyMatrix4(f.matrixWorld);
    }
    const obj = registry.get(l.id)?.group || root.getObjectByName(l.id);
    if (!obj) return null;
    const p = new THREE.Vector3();
    obj.getWorldPosition(p);
    if (l.off) p.add(new THREE.Vector3(...l.off));
    return p;
  }

  textFor(l) {
    if (l.title) return [l.title, l.sub || ''];
    if (l.sector != null) return [SECTORS[l.sector], l.sector === 0 ? 'selected category' : 'indicator category'];
    if (l.field != null) { const f = RECORD_FIELDS[l.field]; return [f.k, f.v]; }
    if (l.bits === 'sign') return ['Sign', '1 bit · 0 = positive'];
    if (l.bits === 'exp') return ['Exponent', '11 bits'];
    if (l.bits === 'mant') return ['Mantissa', '52 bits'];
    const r = registry.get(l.id);
    if (!r) return [l.id, ''];
    const repo = REPOS.find((x) => l.id.startsWith(x.id + '.'));
    if (repo) return [r.title, `${repo.label} · data structure`];
    return [r.title, r.sub];
  }

  layoutCallout(l, camera, root) {
    const p = this.anchorFor(l, root);
    if (!p) return null;
    const s = this.project(p, camera);
    if (s.behind) return null;
    const { c, u } = this;
    const a = l.a ?? 1;
    const [title, sub] = this.textFor(l);
    c.font = `600 ${17 * u}px ${FONT}`;
    const tw = this.trackedWidth(title.toUpperCase(), 1.2 * u);
    c.font = `400 ${12 * u}px ${MONO}`;
    const sw = sub ? c.measureText(sub.toUpperCase()).width : 0;
    const bw = Math.max(tw, sw) + 22 * u, bh = (sub ? 50 : 32) * u;
    const dir = l.side === 'L' ? -1 : 1;
    const lead = (70 + (1 - a) * 18) * u;
    let bx = s.x + dir * lead + (dir < 0 ? -bw : 0);
    let by = s.y - bh / 2 + (l.dy || 0) * u;
    bx = Math.min(this.w - bw - 70 * u, Math.max(24 * u, bx));
    by = this.clampY(by, bh);
    return { s, bx, by, bw, bh, dir, a, title, sub };
  }

  clampY(by, bh) {
    const u = this.u;
    return Math.min(this.h - bh - 330 * u - this.inset, Math.max(110 * u, by));
  }

  /** push overlapping callout boxes apart vertically */
  separate(boxes) {
    const gap = 8 * this.u;
    boxes.sort((a, b) => a.by - b.by);
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < boxes.length; i++) {
        for (let j = 0; j < i; j++) {
          const A = boxes[j], B = boxes[i];
          const xo = A.bx < B.bx + B.bw && B.bx < A.bx + A.bw;
          const yo = A.by < B.by + B.bh + gap && B.by < A.by + A.bh + gap;
          if (xo && yo) B.by = A.by + A.bh + gap;
        }
      }
      // if pushed past the bottom limit, shift the whole stack up
      const limit = this.h - 330 * this.u - this.inset;
      const over = Math.max(0, ...boxes.map((b) => b.by + b.bh - limit));
      if (over > 0) boxes.forEach((b) => { b.by = Math.max(110 * this.u, b.by - over); });
    }
  }

  drawCallout({ s, bx, by, bw, bh, dir, a, title, sub }) {
    const { c, u } = this;
    c.save();
    c.globalAlpha = a;
    const ex = dir < 0 ? bx + bw : bx, ey = by + bh / 2;
    // leader
    c.strokeStyle = 'rgba(230,238,236,0.7)'; c.lineWidth = Math.max(1, 1.1 * u);
    c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + (ex - s.x) * 0.45, ey); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = ACC;
    c.beginPath(); c.arc(s.x, s.y, 3.6 * u, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(61,255,200,0.4)'; c.beginPath(); c.arc(s.x, s.y, 8 * u, 0, Math.PI * 2); c.stroke();
    // box
    c.fillStyle = 'rgba(10,13,15,0.82)';
    c.fillRect(bx, by, bw, bh);
    c.strokeStyle = 'rgba(220,230,228,0.42)'; c.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    c.fillStyle = ACC; c.fillRect(bx, by, 3 * u, bh);
    c.textBaseline = 'top';
    c.fillStyle = 'rgba(244,248,247,0.96)';
    c.font = `600 ${17 * u}px ${FONT}`;
    this.tracked(title.toUpperCase(), bx + 12 * u, by + 7 * u, 1.2 * u);
    if (sub) {
      c.fillStyle = 'rgba(190,204,201,0.75)';
      c.font = `400 ${12 * u}px ${MONO}`;
      c.fillText(sub.toUpperCase(), bx + 12 * u, by + 30 * u);
    }
    c.restore();
  }

  frame(id, a, camera, root) {
    const obj = registry.get(id)?.group || root.getObjectByName(id);
    if (!obj) return;
    const box = new THREE.Box3().setFromObject(obj, true);
    if (box.isEmpty()) return;
    const y = box.max.y;
    const corners = [[box.min.x, box.min.z], [box.max.x, box.min.z], [box.max.x, box.max.z], [box.min.x, box.max.z]]
      .map(([x, z]) => this.project(new THREE.Vector3(x, y, z), camera));
    if (corners.some((p) => p.behind)) return;
    const { c, u } = this;
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = AMBER;
    c.lineWidth = 2.2 * u;
    c.shadowColor = 'rgba(255,195,90,0.6)'; c.shadowBlur = 12 * u;
    c.beginPath();
    corners.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath(); c.stroke();
    c.restore();
  }

  chapter(ch, a, pad) {
    const { c, h, u } = this;
    c.save();
    c.globalAlpha = a;
    const x = pad, y = h - pad - 150 * u - this.inset + (1 - a) * 14 * u;
    // soft backing gradient for legibility
    const gh = 420 * u + this.inset;
    const g = c.createLinearGradient(0, h - gh, 0, h);
    g.addColorStop(0, 'rgba(5,6,8,0)'); g.addColorStop(1, 'rgba(5,6,8,0.6)');
    c.fillStyle = g; c.fillRect(0, h - gh, this.w, gh);
    c.fillStyle = 'rgba(244,248,247,0.97)';
    c.font = `600 ${54 * u}px ${FONT}`;
    c.textBaseline = 'alphabetic';
    this.tracked(ch.title.toUpperCase(), x, y, 2.4 * u);
    c.fillStyle = AMBER; c.fillRect(x, y + 16 * u, 56 * u, 3 * u);
    c.fillStyle = 'rgba(196,208,205,0.78)';
    c.font = `500 ${17 * u}px ${MONO}`;
    ch.sub.forEach((ln, i) => this.tracked(ln.toUpperCase(), x, y + 54 * u + i * 30 * u, 2.6 * u));
    c.restore();
  }

  center(ct, a) {
    const { c, w, h, u } = this;
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'left';
    c.fillStyle = 'rgba(246,250,249,0.98)';
    c.font = `700 ${150 * u}px ${FONT}`;
    const bw = this.trackedWidth(ct.big, 14 * u);
    const cy = h * 0.43;
    const ms = 150 * u;
    // soft backing so the titles stay legible over bright geometry
    const rg = c.createRadialGradient(w / 2, cy - 40 * u, 0, w / 2, cy - 40 * u, 520 * u);
    rg.addColorStop(0, 'rgba(5,6,8,0.62)'); rg.addColorStop(1, 'rgba(5,6,8,0)');
    c.fillStyle = rg; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(246,250,249,0.98)';
    drawMark(c, (w - ms) / 2, cy - 150 * u - ms, ms, smooth(Math.min(1, a * 1.25)));
    this.tracked(ct.big, (w - bw) / 2, cy, 14 * u);
    c.font = `500 ${34 * u}px ${FONT}`;
    const lw = this.trackedWidth(ct.line.toUpperCase(), 3 * u);
    this.tracked(ct.line.toUpperCase(), (w - lw) / 2, cy + 64 * u, 3 * u);
    c.fillStyle = ACC;
    c.fillRect(w / 2 - 40 * u, cy + 96 * u, 80 * u, 2.5 * u);
    c.fillStyle = 'rgba(196,208,205,0.8)';
    c.font = `500 ${17 * u}px ${MONO}`;
    const sw = this.trackedWidth(ct.small.toUpperCase(), 4 * u);
    this.tracked(ct.small.toUpperCase(), (w - sw) / 2, cy + 140 * u, 4 * u);
    c.restore();
  }
}
