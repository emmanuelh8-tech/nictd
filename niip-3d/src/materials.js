// Shared materials + procedural canvas textures for the NIIP scene.
import * as THREE from 'three';

export const ACCENT = 0x3dffc8;
export const ACCENT_CSS = '#3dffc8';

export const M = {
  graphite: new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.6, roughness: 0.42 }),
  graphiteDark: new THREE.MeshStandardMaterial({ color: 0x16191c, metalness: 0.5, roughness: 0.55 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x777d85, metalness: 0.9, roughness: 0.3 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x4a4f56, metalness: 0.85, roughness: 0.36 }),
  matte: new THREE.MeshStandardMaterial({ color: 0x3b4046, metalness: 0.15, roughness: 0.75 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0x8c9198, metalness: 0.1, roughness: 0.55 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x1b2a2f, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false,
  }),
  glassTube: new THREE.MeshStandardMaterial({
    color: 0x9fd8cc, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
  }),
  accent: new THREE.MeshStandardMaterial({ color: 0x06140f, emissive: ACCENT, emissiveIntensity: 1.7, roughness: 0.4 }),
  accentDim: new THREE.MeshStandardMaterial({ color: 0x06140f, emissive: ACCENT, emissiveIntensity: 0.55, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: 0xeaf2f0, emissiveIntensity: 1.4 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x1a1204, emissive: 0xffc35a, emissiveIntensity: 1.1 }),
  led: new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x9bffe6, emissiveIntensity: 1.5 }),
};

const FONT = '"Saira Semi Condensed", "Segoe UI", sans-serif';
const MONO = '"JetBrains Mono", Consolas, monospace';

// ---------- line glyphs (drawn into a 100x100 box) ----------
const G = {
  home(c) { c.moveTo(15, 50); c.lineTo(50, 18); c.lineTo(85, 50); c.moveTo(25, 42); c.lineTo(25, 84); c.lineTo(75, 84); c.lineTo(75, 42); c.moveTo(43, 84); c.lineTo(43, 60); c.lineTo(57, 60); c.lineTo(57, 84); },
  search(c) { c.moveTo(66, 42); c.arc(42, 42, 24, 0, Math.PI * 2); c.moveTo(60, 60); c.lineTo(84, 84); },
  chart(c) { c.moveTo(14, 86); c.lineTo(88, 86); [[22, 62], [40, 48], [58, 56], [76, 30]].forEach(([x, y]) => { c.rect(x - 6, y, 12, 86 - y); }); c.moveTo(22, 52); c.lineTo(40, 38); c.lineTo(58, 46); c.lineTo(80, 18); },
  doc(c) { c.moveTo(26, 12); c.lineTo(62, 12); c.lineTo(78, 28); c.lineTo(78, 88); c.lineTo(26, 88); c.closePath(); c.moveTo(62, 12); c.lineTo(62, 28); c.lineTo(78, 28); [40, 52, 64, 76].forEach((y) => { c.moveTo(36, y); c.lineTo(68, y); }); },
  research(c) { G.doc(c); c.moveTo(70, 70); c.arc(62, 62, 11, 0, Math.PI * 2); c.moveTo(70, 70); c.lineTo(86, 88); },
  users(c) { c.moveTo(48, 34); c.arc(38, 34, 10, 0, Math.PI * 2); c.moveTo(18, 80); c.quadraticCurveTo(38, 46, 58, 80); c.moveTo(74, 38); c.arc(66, 38, 8, 0, Math.PI * 2); c.moveTo(62, 58); c.quadraticCurveTo(76, 52, 86, 78); },
  gear(c) { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.moveTo(50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26); c.lineTo(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36); } c.moveTo(76, 50); c.arc(50, 50, 26, 0, Math.PI * 2); c.moveTo(60, 50); c.arc(50, 50, 10, 0, Math.PI * 2); },
  gov(c) { c.moveTo(12, 36); c.lineTo(50, 14); c.lineTo(88, 36); c.closePath(); [24, 41, 59, 76].forEach((x) => { c.moveTo(x, 42); c.lineTo(x, 76); }); c.moveTo(14, 80); c.lineTo(86, 80); c.moveTo(10, 88); c.lineTo(90, 88); },
  stake(c) { G.users(c); c.moveTo(40, 92); c.lineTo(60, 92); },
  cap(c) { c.moveTo(10, 40); c.lineTo(50, 22); c.lineTo(90, 40); c.lineTo(50, 58); c.closePath(); c.moveTo(28, 48); c.lineTo(28, 70); c.quadraticCurveTo(50, 84, 72, 70); c.lineTo(72, 48); c.moveTo(86, 42); c.lineTo(86, 66); },
  person(c) { c.moveTo(62, 32); c.arc(50, 32, 12, 0, Math.PI * 2); c.moveTo(24, 86); c.quadraticCurveTo(50, 40, 76, 86); },
};

/** A dark instrument "screen": glyph + label + faint UI rules. */
export function screenTexture({ label, sub = '', glyph, w = 512, h = 400, accent = false }) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const grd = c.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#11171a'); grd.addColorStop(1, '#0a0d0f');
  c.fillStyle = grd; c.fillRect(0, 0, w, h);
  // fine grid
  c.strokeStyle = 'rgba(160,190,185,0.06)'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
  for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); }
  // frame + corner ticks
  c.strokeStyle = 'rgba(200,215,212,0.35)'; c.lineWidth = 2;
  c.strokeRect(10, 10, w - 20, h - 20);
  c.fillStyle = accent ? ACCENT_CSS : 'rgba(200,215,212,0.55)';
  c.fillRect(10, 10, 46, 5);
  // glyph
  if (glyph && G[glyph]) {
    c.save(); c.translate(w / 2 - 70, h * 0.13); c.scale(1.4, 1.4);
    c.beginPath(); G[glyph](c);
    c.strokeStyle = '#d6dedc'; c.lineWidth = 4.2; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    c.restore();
  }
  c.fillStyle = '#e8eeec';
  c.font = `600 ${label.length > 14 ? 40 : 48}px ${FONT}`;
  c.textAlign = 'center';
  c.fillText(label.toUpperCase(), w / 2, h * 0.79);
  if (sub) {
    c.fillStyle = 'rgba(190,205,202,0.6)';
    c.font = `400 22px ${MONO}`;
    c.fillText(sub.toUpperCase(), w / 2, h * 0.9);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Engraved-plate text, for repository caps and engine labels. */
export function plateTexture(lines, { w = 512, h = 160, size = 54 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = '#0d1012'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(200,215,212,0.3)'; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, h - 12);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    c.fillStyle = i === 0 ? '#e8eeec' : 'rgba(190,205,202,0.65)';
    c.font = i === 0 ? `600 ${size}px ${FONT}` : `400 ${Math.round(size * 0.42)}px ${MONO}`;
    c.fillText(ln.toUpperCase(), w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 0.95);
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Brushed-metal grain used as a roughness/bump detail on large plates. */
export function brushedTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const c = cv.getContext('2d');
  c.fillStyle = '#808080'; c.fillRect(0, 0, 512, 512);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    const y = rnd() * 512, v = 100 + rnd() * 60;
    c.strokeStyle = `rgba(${v},${v},${v},0.25)`;
    c.beginPath(); c.moveTo(0, y); c.lineTo(512, y + (rnd() - 0.5) * 3); c.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Grid texture for the floor of the web layer's glass deck. */
export function deckTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 640;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 640);
  c.strokeStyle = 'rgba(61,255,200,0.16)'; c.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 32) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, 640); c.stroke(); }
  for (let y = 0; y <= 640; y += 32) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(1024, y + 0.5); c.stroke(); }
  c.strokeStyle = 'rgba(61,255,200,0.45)'; c.lineWidth = 2;
  c.strokeRect(12, 12, 1000, 616);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function screenMaterial(tex) {
  return new THREE.MeshStandardMaterial({
    map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1,
  });
}
