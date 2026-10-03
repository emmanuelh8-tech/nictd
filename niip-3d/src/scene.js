// NIIP scene graph. Every named component is its own THREE.Group, registered by ID,
// so position / rotation / scale / opacity / visibility can be driven independently.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, screenTexture, plateTexture, deckTexture, screenMaterial } from './materials.js';

export const registry = new Map(); // id -> { id, group, title, sub, parentId }

function comp(id, parent, title, sub = '') {
  const g = new THREE.Group();
  g.name = id;
  g.userData.componentId = id;
  parent.add(g);
  let p = parent;
  while (p && !p.userData.componentId) p = p.parent;
  registry.set(id, { id, group: g, title, sub, parentId: p ? p.userData.componentId : null });
  return g;
}

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// deterministic hash in [0,1)
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function instanced(geo, mat, matrices, parent, colors) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
  im.instanceMatrix.needsUpdate = true;
  parent.add(im);
  return im;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function mat4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}

// ============================================================================
export function buildNIIP(scene) {
  const parts = {};
  const root = comp('NIIP', scene, 'NIIP', 'National ICT Intelligence Program');
  buildWeb(root, parts);
  buildNIIS(root, parts);
  buildDatabases(root, parts);

  // freeze the assembled transforms as each component's base pose
  root.traverse((o) => {
    o.userData.base = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
  });
  return { root, parts };
}

// ============================================================================
// LAYER 1 — WEB APPLICATION
// ============================================================================
export const MODULES = [
  { id: 'HOME', label: 'Home', glyph: 'home', sub: 'landing · overview' },
  { id: 'DATA_EXPLORER', label: 'Data Explorer', glyph: 'search', sub: 'query · filter · chart' },
  { id: 'ICT_REPORTS', label: 'ICT Reports', glyph: 'chart', sub: 'publications · statistics' },
  { id: 'RESEARCH', label: 'Research', glyph: 'research', sub: 'papers · studies' },
  { id: 'USER_ACCOUNTS', label: 'User Accounts', glyph: 'users', sub: 'roles · access' },
];
export const ROLES = [
  { id: 'ADMIN', label: 'Admin', glyph: 'gear', sub: 'full system control' },
  { id: 'GOVERNMENTS', label: 'Governments', glyph: 'gov', sub: 'institutional users' },
  { id: 'STAKEHOLDERS', label: 'Stakeholders', glyph: 'stake', sub: 'clients · partners' },
  { id: 'STUDENTS', label: 'Students', glyph: 'cap', sub: 'learning · research' },
  { id: 'INDIVIDUALS', label: 'Individuals', glyph: 'person', sub: 'public access' },
];

function buildWeb(root, parts) {
  const web = comp('WEB_APPLICATION', root, 'Web Application', 'User-facing interface layer');
  web.position.set(0, 1.85, 0);

  mesh(new RoundedBoxGeometry(10.4, 0.42, 6.6, 4, 0.12), M.graphite, web);
  mesh(new THREE.BoxGeometry(9.8, 0.2, 6.0), M.graphiteDark, web, 0, -0.29, 0);
  mesh(new THREE.BoxGeometry(9.9, 0.025, 6.1), M.accentDim, web, 0, -0.4, 0);
  const deckTex = deckTexture();
  mesh(new THREE.BoxGeometry(10.0, 0.03, 6.2), new THREE.MeshStandardMaterial({
    color: 0x050708, map: deckTex, emissiveMap: deckTex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.12, metalness: 0.4,
  }), web, 0, 0.215, 0);
  // corner fasteners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20), M.steel, web, sx * 4.95, 0.23, sz * 3.05);
  }
  // front fascia plate
  const fascia = mesh(new THREE.PlaneGeometry(3.6, 0.3), screenMaterial(plateTexture(['NIIP · WEB APPLICATION'], { w: 1024, h: 86, size: 46 })), web, 0, 0, 3.302);
  fascia.material.emissiveIntensity = 0.35;

  parts.modules = [];
  MODULES.forEach((d, i) => {
    const g = comp(d.id, web, d.label, d.sub);
    g.position.set(-3.96 + i * 1.98, 0.36, -1.15);
    mesh(new RoundedBoxGeometry(1.78, 0.26, 1.62, 3, 0.06), M.graphite, g);
    mesh(new THREE.BoxGeometry(1.64, 0.02, 1.46), M.graphiteDark, g, 0, 0.13, 0);
    const scr = mesh(new THREE.PlaneGeometry(1.52, 1.2), screenMaterial(screenTexture({ label: d.label, sub: d.sub, glyph: d.glyph, accent: i === 4 })), g, 0, 0.142, 0);
    scr.rotation.x = -Math.PI / 2;
    mesh(new THREE.BoxGeometry(1.5, 0.018, 0.018), M.accentDim, g, 0, -0.08, 0.815);
    for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), M.steelDark, g, sx * 0.72, -0.17, 0);
    parts.modules.push(g);
  });

  // role tray
  mesh(new THREE.BoxGeometry(9.8, 0.1, 1.78), M.graphiteDark, web, 0, 0.27, 1.62);
  for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(9.8, 0.06, 0.04), M.steelDark, web, 0, 0.32, 1.62 + sz * 0.87);
  const trayPlate = mesh(new THREE.PlaneGeometry(3.2, 0.26), screenMaterial(plateTexture(['USER ACCOUNTS — ROLES & ACCESS'], { w: 1024, h: 84, size: 40 })), web, -3.25, 0.236, 0.5);
  trayPlate.rotation.x = -Math.PI / 2;
  trayPlate.material.emissiveIntensity = 0.3;

  const ua = parts.modules[4];
  parts.roles = [];
  ROLES.forEach((d, i) => {
    const g = comp(d.id, ua, d.label, d.sub);
    // authored in web space, stored relative to USER_ACCOUNTS
    g.position.set(-3.9 + i * 1.95 - ua.position.x, 0.39 - ua.position.y, 1.62 - ua.position.z);
    mesh(new RoundedBoxGeometry(1.72, 0.12, 1.34, 3, 0.04), M.graphite, g);
    const scr = mesh(new THREE.PlaneGeometry(1.52, 1.14), screenMaterial(screenTexture({ label: d.label, sub: d.sub, glyph: d.glyph, w: 512, h: 384 })), g, 0, 0.062, 0);
    scr.rotation.x = -Math.PI / 2;
    mesh(new THREE.BoxGeometry(1.4, 0.014, 0.014), M.accentDim, g, 0, -0.03, 0.675);
    g.userData.webSpace = new THREE.Vector3(-3.9 + i * 1.95, 0.39, 1.62);
    parts.roles.push(g);
  });
  parts.web = web;
}

// ============================================================================
// LAYER 2 — NIIS (engine)
// ============================================================================
export const STAGES = [
  { id: 'DATA_INGESTION', label: 'Data Ingestion', sub: 'pull from databases, APIs, portals, web' },
  { id: 'DATA_VALIDATION', label: 'Data Validation', sub: 'schema · range · completeness checks' },
  { id: 'DATA_CLEANING', label: 'Data Cleaning', sub: 'dedupe · fix · standardise' },
  { id: 'DATA_INTEGRATION', label: 'Data Integration', sub: 'merge sources · resolve keys' },
  { id: 'DATA_TRANSFORMATION', label: 'Data Transformation', sub: 'transform · normalise' },
  { id: 'DATA_ANALYSIS', label: 'Data Analysis', sub: 'indicators · trends · analytics' },
  { id: 'DATA_ENRICHMENT', label: 'Data Enrichment', sub: 'context · metadata · linkage' },
  { id: 'INTELLIGENCE_OUTPUT', label: 'Intelligence Output', sub: 'structured ICT data → web app' },
];
export const SOURCES = [
  { id: 'SRC_DATABASES', label: 'Database Connections' },
  { id: 'SRC_APIS', label: 'APIs' },
  { id: 'SRC_GOV_PORTALS', label: 'Government Portals' },
  { id: 'SRC_OPEN_DATA', label: 'Open Data' },
  { id: 'SRC_WEB', label: 'External Web Sources' },
  { id: 'SRC_SCRAPING', label: 'Web Scraping' },
];
export const STAGE_SPACING = 0.27;
export const STAGE_Y0 = -0.95;

function ringBody(parent, R = 2.05, rIn = 0.55, h = 0.16) {
  const pts = [
    [rIn, -h / 2], [R - 0.1, -h / 2], [R, -h / 4], [R, h / 4], [R - 0.1, h / 2], [rIn, h / 2], [rIn, -h / 2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(new THREE.LatheGeometry(pts, 112), M.graphite, parent);
  const edge = mesh(new THREE.TorusGeometry(R - 0.06, 0.011, 6, 160), M.accentDim, parent, 0, h / 2 + 0.002, 0);
  edge.rotation.x = Math.PI / 2;
  const bearing = mesh(new THREE.TorusGeometry(rIn + 0.05, 0.03, 8, 64), M.steel, parent, 0, h / 2, 0);
  bearing.rotation.x = Math.PI / 2;
}

function buildNIIS(root, parts) {
  const niis = comp('NIIS', root, 'NIIS', 'National ICT Intelligence System');

  // base + cap plates
  const base = new THREE.Group(); niis.add(base); base.position.y = -1.3;
  const oct = (r1, r2, h) => { const g = new THREE.CylinderGeometry(r1, r2, h, 8); g.rotateY(Math.PI / 8); return g; };
  mesh(oct(4.3, 4.4, 0.3), M.graphite, base);
  mesh(oct(3.9, 3.9, 0.16), M.graphiteDark, base, 0, -0.22, 0);
  const band = new THREE.CylinderGeometry(4.42, 4.42, 0.03, 8, 1, true); band.rotateY(Math.PI / 8);
  mesh(band, M.accentDim, base, 0, -0.06, 0);
  parts.niisBase = base;

  const cap = new THREE.Group(); niis.add(cap); cap.position.y = 1.32;
  mesh(oct(4.3, 4.3, 0.26), M.graphite, cap);
  mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.27, 48), M.glass, cap);
  const capRing = mesh(new THREE.TorusGeometry(1.27, 0.03, 8, 64), M.accent, cap, 0, 0.135, 0);
  capRing.rotation.x = Math.PI / 2;
  const capPlate = mesh(new THREE.PlaneGeometry(2.6, 0.8), screenMaterial(plateTexture(['NIIS', 'National ICT Intelligence System'], { w: 640, h: 196, size: 78 })), cap, 0, 0.133, 2.55);
  capPlate.rotation.x = -Math.PI / 2;
  parts.niisCap = cap;

  // housing panels
  parts.panels = [];
  for (let k = 0; k < 8; k++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = k * Math.PI / 4;
    niis.add(pivot);
    // hinge on the base edge: the housing opens like petals and stays with the base plate
    const hinge = new THREE.Group();
    hinge.position.set(0, -1.15, 3.86);
    pivot.add(hinge);
    const panel = new THREE.Group();
    panel.position.y = 1.15;
    hinge.add(panel);
    mesh(new RoundedBoxGeometry(3.12, 2.3, 0.14, 2, 0.03), M.graphite, panel);
    for (let v = 0; v < 7; v++) mesh(new THREE.BoxGeometry(2.3, 0.05, 0.05), M.graphiteDark, panel, -0.2, -0.75 + v * 0.25, 0.09);
    mesh(new THREE.BoxGeometry(0.04, 1.9, 0.03), M.accentDim, panel, 1.2, 0, 0.085);
    mesh(new THREE.BoxGeometry(0.3, 0.12, 0.04), M.steel, panel, 1.2, 1.0, 0.09);
    parts.panels.push(hinge);
  }

  // central spine
  parts.spine = mesh(new THREE.CylinderGeometry(0.34, 0.34, 1, 32, 1, true), M.glassTube, niis);
  parts.spineCore = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), M.accentDim, niis);

  // the eight processing stages
  parts.stages = [];
  parts.rotors = [];
  STAGES.forEach((d, i) => {
    const g = comp(d.id, niis, d.label, d.sub);
    g.position.y = STAGE_Y0 + i * STAGE_SPACING;
    const rotor = new THREE.Group();
    g.add(rotor);
    ringBody(rotor);
    stageDetail(i, rotor, g, parts);
    parts.stages.push(g);
    parts.rotors.push(rotor);
  });

  // data sources dock on the ingestion stage and extend outward
  const ing = parts.stages[0];
  parts.sources = [];
  SOURCES.forEach((d, k) => {
    const g = comp(d.id, ing, d.label, 'external data source');
    const a = k * Math.PI / 3 + Math.PI / 6;
    g.userData.angle = a;
    g.position.set(Math.sin(a) * 2.75, 0, Math.cos(a) * 2.75);
    g.rotation.y = a;
    const body = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 6);
    mesh(body, M.graphite, g);
    mesh(new THREE.CylinderGeometry(0.432, 0.432, 0.05, 6, 1, true), M.accent, g, 0, 0.12, 0);
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 6), M.steelDark, g, 0, 0.28, 0);
    const nozzle = mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.4, 16), M.steel, g, 0, 0, -0.5);
    nozzle.rotation.x = Math.PI / 2;
    const tip = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), M.accent, g, 0, 0, -0.71);
    tip.rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), M.steel, g, 0, 0.5, 0.15);
    parts.sources.push(g);
  });
  parts.niis = niis;
}

function stageDetail(i, rotor, container, parts) {
  const top = 0.08;
  if (i === 0) { // INGESTION: radial intake sockets (static rotor)
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + Math.PI / 6;
      const s = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.42, 20), M.steel, rotor, Math.sin(a) * 2.18, 0, Math.cos(a) * 2.18);
      s.rotation.set(Math.PI / 2, 0, 0); s.rotation.y = 0; s.lookAt(0, 0, 0); s.rotateX(Math.PI / 2);
      const glow = mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 24), M.accent, rotor, Math.sin(a) * 2.4, 0, Math.cos(a) * 2.4);
      glow.lookAt(0, 0, 0);
    }
    const mats = [];
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; mats.push(mat4(Math.sin(a) * 1.45, top + 0.02, Math.cos(a) * 1.45, 0, a, 0)); }
    instanced(new THREE.BoxGeometry(0.06, 0.04, 0.42), M.graphiteDark, mats, rotor);
  } else if (i === 1) { // VALIDATION: check cells, some lit
    const off = [], on = [];
    [[1.62, 44], [1.2, 30]].forEach(([r, n], ri) => {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        (hash(k * 3 + ri * 101) > 0.72 ? on : off).push(mat4(Math.sin(a) * r, top + 0.035, Math.cos(a) * r, 0, a, 0));
      }
    });
    instanced(new THREE.BoxGeometry(0.17, 0.07, 0.17), M.steelDark, off, rotor);
    instanced(new THREE.BoxGeometry(0.17, 0.07, 0.17), M.accent, on, rotor);
  } else if (i === 2) { // CLEANING: turbine/filter fins
    const mats = [];
    for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; mats.push(mat4(Math.sin(a) * 1.4, top + 0.06, Math.cos(a) * 1.4, 0, a + Math.PI / 2 + 0.5, 0)); }
    instanced(new THREE.BoxGeometry(0.8, 0.12, 0.03), M.steel, mats, rotor);
    const mesh2 = mesh(new THREE.TorusGeometry(1.0, 0.015, 6, 96), M.accentDim, rotor, 0, top + 0.12, 0); mesh2.rotation.x = Math.PI / 2;
  } else if (i === 3) { // INTEGRATION: interlocking gear rings
    const outer = [], inner = [];
    for (let k = 0; k < 52; k++) { const a = (k / 52) * Math.PI * 2; outer.push(mat4(Math.sin(a) * 1.9, top + 0.05, Math.cos(a) * 1.9, 0, a, 0)); }
    instanced(new THREE.BoxGeometry(0.12, 0.1, 0.16), M.steel, outer, rotor);
    const innerRotor = new THREE.Group(); container.add(innerRotor);
    for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; inner.push(mat4(Math.sin(a) * 1.3, top + 0.05, Math.cos(a) * 1.3, 0, a, 0)); }
    instanced(new THREE.BoxGeometry(0.1, 0.1, 0.18), M.steelDark, inner, innerRotor);
    const r2 = mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 80), M.graphiteDark, innerRotor, 0, top, 0); r2.rotation.x = Math.PI / 2;
    const r3 = mesh(new THREE.TorusGeometry(1.6, 0.012, 6, 96), M.accent, innerRotor, 0, top + 0.06, 0); r3.rotation.x = Math.PI / 2;
    parts.integrationInner = innerRotor;
  } else if (i === 4) { // TRANSFORMATION: hex transformers + slotted disc
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 6), M.steelDark, rotor, Math.sin(a) * 1.45, top + 0.08, Math.cos(a) * 1.45);
      mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.17, 6), M.accentDim, rotor, Math.sin(a) * 1.45, top + 0.09, Math.cos(a) * 1.45);
    }
    const mats = [];
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; mats.push(mat4(Math.sin(a) * 0.85, top + 0.02, Math.cos(a) * 0.85, 0, a, 0)); }
    instanced(new THREE.BoxGeometry(0.03, 0.03, 0.4), M.accent, mats, rotor);
  } else if (i === 5) { // ANALYSIS: radial histogram
    const mats = [], hot = [];
    for (let k = 0; k < 84; k++) {
      const a = (k / 84) * Math.PI * 2;
      const h = 0.06 + 0.42 * (0.5 + 0.5 * Math.sin(k * 0.37) * Math.cos(k * 0.13));
      (k % 7 === 0 ? hot : mats).push(mat4(Math.sin(a) * 1.65, top + h / 2, Math.cos(a) * 1.65, 0, a, 0, 1, h, 1));
    }
    instanced(new THREE.BoxGeometry(0.07, 1, 0.12), M.steel, mats, rotor);
    instanced(new THREE.BoxGeometry(0.07, 1, 0.12), M.accent, hot, rotor);
    const inner = [];
    for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; const h = 0.04 + 0.16 * hash(k + 9); inner.push(mat4(Math.sin(a) * 1.15, top + h / 2, Math.cos(a) * 1.15, 0, a, 0, 1, h, 1)); }
    instanced(new THREE.BoxGeometry(0.05, 1, 0.08), M.steelDark, inner, rotor);
  } else if (i === 6) { // ENRICHMENT: linked knowledge graph
    const nodes = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + hash(k) * 0.3;
      const r = 0.95 + hash(k + 40) * 0.9;
      nodes.push(new THREE.Vector3(Math.sin(a) * r, top + 0.08 + hash(k + 7) * 0.1, Math.cos(a) * r));
    }
    nodes.forEach((p) => mesh(new THREE.SphereGeometry(0.07, 16, 12), M.led, rotor, p.x, p.y, p.z));
    const seg = [];
    nodes.forEach((p, k) => { [1, 3].forEach((j) => { const q = nodes[(k + j) % nodes.length]; seg.push(p.x, p.y, p.z, q.x, q.y, q.z); }); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    rotor.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3dffc8, transparent: true, opacity: 0.45 })));
  } else if (i === 7) { // OUTPUT: lens + emitter fins
    mesh(new THREE.SphereGeometry(0.95, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), M.glass, rotor, 0, top - 0.02, 0);
    mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 48), M.accent, rotor, 0, top + 0.01, 0);
    const mats = [];
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; mats.push(mat4(Math.sin(a) * 1.65, top + 0.15, Math.cos(a) * 1.65, 0, a, 0)); }
    instanced(new THREE.BoxGeometry(0.06, 0.3, 0.34), M.steel, mats, rotor);
    const r = mesh(new THREE.TorusGeometry(1.25, 0.02, 6, 96), M.accent, rotor, 0, top + 0.02, 0); r.rotation.x = Math.PI / 2;
  }
}

// ============================================================================
// LAYER 3 — ICT DATA DATABASES
// ============================================================================
export const REPOS = [
  { id: 'ICT_INDICATORS_DATABASE', label: 'ICT Indicators', sub: 'structured indicators & measurements', platters: ['Categories', 'Indicators', 'Records', 'Values', 'Metadata'] },
  { id: 'ICT_REPORTS_DATABASE', label: 'ICT Reports', sub: 'reports · documents · statistical publications', platters: ['Documents', 'Tables', 'Statistics', 'Publications', 'Metadata'] },
  { id: 'ICT_RESEARCH_DATABASE', label: 'ICT Research', sub: 'papers · studies · knowledge products', platters: ['Papers', 'Datasets', 'Findings', 'References', 'Metadata'] },
];
export const PLATTER_PITCH = 0.3;
export const SECTORS = ['Connectivity', 'Infrastructure', 'Usage', 'Skills', 'Affordability', 'Governance'];

function buildDatabases(root, parts) {
  const db = comp('DATABASES', root, 'ICT Data Databases', 'three core repositories');
  db.position.set(0, -2.75, 0);

  const platform = new THREE.Group(); db.add(platform);
  mesh(new RoundedBoxGeometry(11.4, 0.36, 6.6, 4, 0.12), M.graphite, platform, 0, -1.05, 0);
  mesh(new THREE.BoxGeometry(10.8, 0.2, 6.0), M.graphiteDark, platform, 0, -1.32, 0);
  mesh(new THREE.BoxGeometry(10.9, 0.025, 6.1), M.accentDim, platform, 0, -1.44, 0);
  const plate = mesh(new THREE.PlaneGeometry(4.6, 0.3), screenMaterial(plateTexture(['SECURE · SCALABLE · INTEROPERABLE'], { w: 1024, h: 68, size: 38 })), platform, 0, -1.05, 3.302);
  plate.material.emissiveIntensity = 0.35;
  // storage nodes with LED rows
  for (const x of [-5.1, -1.75, 1.75, 5.1]) {
    const n = new THREE.Group(); n.position.set(x, -0.6, 1.9); platform.add(n);
    mesh(new RoundedBoxGeometry(0.8, 0.55, 1.1, 2, 0.04), M.graphiteDark, n);
    for (let r = 0; r < 3; r++) {
      mesh(new THREE.BoxGeometry(0.62, 0.06, 0.02), M.steelDark, n, 0, -0.15 + r * 0.15, 0.56);
      for (let l = 0; l < 4; l++) if (hash(x * 10 + r * 4 + l) > 0.35) mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), M.led, n, -0.22 + l * 0.06, -0.15 + r * 0.15, 0.575);
    }
  }
  parts.dbPlatform = platform;

  parts.repos = [];
  parts.platters = [];
  parts.caps = [];
  REPOS.forEach((d, ri) => {
    const g = comp(d.id, db, d.label + ' Database', d.sub);
    g.position.set(-3.5 + ri * 3.5, -0.87, 0);
    mesh(new THREE.CylinderGeometry(1.38, 1.46, 0.18, 72), M.steelDark, g, 0, 0.09, 0);
    const spine = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 24), M.steel, g, 0, 0.9, 0);
    g.userData.spine = spine;
    const platters = [];
    d.platters.forEach((name, k) => {
      const pg = comp(`${d.id}.${name.toUpperCase()}`, g, name, `${d.label} · data structure`);
      pg.position.y = 0.33 + (4 - k) * PLATTER_PITCH;
      mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.24, 96), M.graphite, pg);
      mesh(new THREE.CylinderGeometry(1.296, 1.296, 0.05, 96, 1, true), k === 0 ? M.accent : M.accentDim, pg);
      const inset = mesh(new THREE.TorusGeometry(0.4, 0.012, 6, 64), M.steel, pg, 0, 0.121, 0); inset.rotation.x = Math.PI / 2;
      platters.push(pg);
    });
    const cap = new THREE.Group(); g.add(cap); cap.position.y = 1.75;
    mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.16, 96), M.steel, cap);
    const cp = mesh(new THREE.PlaneGeometry(1.9, 0.6), screenMaterial(plateTexture([d.label, 'Database'], { w: 640, h: 200, size: 70 })), cap, 0, 0.082, 0.25);
    cp.rotation.x = -Math.PI / 2;
    parts.repos.push(g); parts.platters.push(platters); parts.caps.push(cap);
  });

  buildMicro(parts.platters[0][0], parts);
  parts.db = db;
}

// ----------------------------------------------------------------------------
// MICRO — inside ICT Indicators › Categories platter
//   L1 indicator blocks (6 category sectors) → L2 records → L3 fields → L4 bits
// ----------------------------------------------------------------------------
export const RECORD_FIELDS = [
  { k: 'Indicator', v: 'MBB-SUBS-100' },
  { k: 'Country', v: 'LBR' },
  { k: 'Year', v: '2024' },
  { k: 'Value', v: '41.7' },
  { k: 'Unit', v: 'per 100 inh.' },
  { k: 'Source', v: 'national regulator' },
];
export const SAMPLE_VALUE = 41.7;

function buildMicro(platter, parts) {
  const micro = comp('MICRO', platter, 'Micro data structure', 'categories → indicators → records → values');
  micro.position.y = 0.121;
  mesh(new THREE.CylinderGeometry(1.12, 1.12, 0.004, 96), M.graphiteDark, micro, 0, 0.002, 0);
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * Math.PI * 2;
    const d = mesh(new THREE.BoxGeometry(0.008, 0.012, 1.0), M.accentDim, micro, Math.sin(a) * 0.55, 0.006, Math.cos(a) * 0.55);
    d.rotation.y = a;
  }

  const pitch = 0.085, size = 0.066;
  const designated = { ix: 4, iz: 2 }; // inside sector 0
  const mats = [], cols = [];
  const shades = [0x5d636b, 0x50565d, 0x676d75, 0x575d64, 0x61676f, 0x4b5157];
  for (let ix = -12; ix <= 12; ix++) for (let iz = -12; iz <= 12; iz++) {
    const x = ix * pitch, z = iz * pitch;
    const r = Math.hypot(x, z);
    if (r > 1.03 || r < 0.16) continue;
    let a = Math.atan2(x, z); if (a < 0) a += Math.PI * 2;
    const sector = Math.floor(a / (Math.PI / 3));
    const local = a - sector * Math.PI / 3;
    if (local * r < 0.045 || (Math.PI / 3 - local) * r < 0.045) continue;
    if (ix === designated.ix && iz === designated.iz) continue;
    const h = 0.022 + 0.022 * hash(ix * 31 + iz * 7);
    mats.push(mat4(x, h / 2 + 0.004, z, 0, 0, 0, 1, h / 0.03, 1));
    const c = new THREE.Color(shades[sector]);
    if (sector === 0) c.lerp(new THREE.Color(0x3dffc8), 0.07 + 0.06 * hash(ix + iz * 13));
    cols.push(c);
  }
  instanced(new THREE.BoxGeometry(size, 0.03, size), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.55, roughness: 0.38 }), mats, micro, cols);

  // L1 designated indicator block: open tray + lid
  const block = comp('MICRO_INDICATOR', micro, 'One indicator', 'mobile broadband subscriptions · illustrative');
  block.position.set(designated.ix * pitch, 0.004, designated.iz * pitch);
  const wall = 0.003, bh = 0.034;
  mesh(new THREE.BoxGeometry(size, wall, size), M.steelDark, block, 0, wall / 2, 0);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(size, bh, wall), M.steelDark, block, 0, bh / 2, s * (size / 2 - wall / 2));
    mesh(new THREE.BoxGeometry(wall, bh, size), M.steelDark, block, s * (size / 2 - wall / 2), bh / 2, 0);
  }
  const lid = new THREE.Group(); block.add(lid); lid.position.y = bh + 0.0015;
  mesh(new THREE.BoxGeometry(size, 0.003, size), M.steel, lid);
  mesh(new THREE.BoxGeometry(size * 0.7, 0.0032, 0.002), M.accent, lid, 0, 0.0002, size * 0.3);
  parts.microLid = lid;

  // L2 records (3 layers × 6 × 8)
  const rw = 0.0086, rh = 0.0026, rd = 0.0062, px = 0.0095, pz = 0.0071;
  const recMats = [], recCols = [];
  const pick = { layer: 2, cx: 3, cz: 4 };
  for (let L = 0; L < 3; L++) for (let cx = 0; cx < 6; cx++) for (let cz = 0; cz < 8; cz++) {
    if (L === pick.layer && cx === pick.cx && cz === pick.cz) continue;
    recMats.push(mat4((cx - 2.5) * px, wall + 0.003 + L * 0.0062, (cz - 3.5) * pz));
    recCols.push(new THREE.Color().setScalar(0.1 + 0.1 * hash(L * 100 + cx * 10 + cz)));
  }
  instanced(new THREE.BoxGeometry(rw, rh, rd), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.42 }), recMats, block, recCols);

  // L3 the record: six fields
  const rec = comp('MICRO_RECORD', block, 'One record', 'one row · country × year');
  rec.position.set((pick.cx - 2.5) * px, wall + 0.003 + pick.layer * 0.0062, (pick.cz - 3.5) * pz);
  parts.recordFields = [];
  const fw = rw / 6;
  RECORD_FIELDS.forEach((f, i) => {
    const fg = new THREE.Group(); rec.add(fg);
    fg.name = `FIELD_${f.k.toUpperCase()}`;
    fg.position.x = -rw / 2 + fw * (i + 0.5);
    const mat = i === 3
      ? new THREE.MeshStandardMaterial({ color: 0x0e1a17, emissive: 0x3dffc8, emissiveIntensity: 0.06, metalness: 0.3, roughness: 0.4 })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color().setScalar(0.16 + 0.04 * (i % 2)), metalness: 0.5, roughness: 0.45 });
    mesh(new THREE.BoxGeometry(fw * 0.9, rh, rd), mat, fg);
    fg.userData.base = { p: fg.position.clone() };
    parts.recordFields.push(fg);
  });
  const meta = new THREE.Group(); rec.add(meta); meta.name = 'FIELD_METADATA';
  mesh(new THREE.BoxGeometry(rw * 0.55, 0.0004, rd * 0.4), M.steelDark, meta);
  mesh(new THREE.BoxGeometry(rw * 0.55, 0.00045, 0.00012), M.amber, meta, 0, 0, rd * 0.2);
  parts.recordMeta = meta;

  // L4 bits of the VALUE field (IEEE-754 float64 of the sample value)
  const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, SAMPLE_VALUE);
  const bits = [];
  for (let b = 0; b < 64; b++) bits.push((dv.getUint8(b >> 3) >> (7 - (b & 7))) & 1);
  parts.bits = bits;
  const bitGroup = new THREE.Group(); parts.recordFields[3].add(bitGroup);
  bitGroup.name = 'BITS';
  const bs = 0.00022;
  const geo = new THREE.BoxGeometry(bs, bs, bs);
  const bitOn = new THREE.MeshStandardMaterial({ color: 0x0b1c17, emissive: 0x3dffc8, emissiveIntensity: 0.9, roughness: 0.4 });
  const on = new THREE.InstancedMesh(geo, bitOn, 64), off = new THREE.InstancedMesh(geo, M.steelDark, 64);
  on.count = off.count = 64;
  bitGroup.add(on, off);
  parts.bitMeshes = { on, off, bs };
  parts.bitGroup = bitGroup;

  // dust of data particles around the bit lattice
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hash(i * 3.1) - 0.5) * 0.004;
    pos[i * 3 + 1] = hash(i * 7.3) * 0.0025;
    pos[i * 3 + 2] = (hash(i * 11.7) - 0.5) * 0.008;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x3dffc8, size: 0.000035, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  parts.recordFields[3].add(dust);
  parts.microDust = dust;
}

// ============================================================================
// Pose helpers
// ============================================================================
export function resetToBase(o) {
  const b = o.userData.base;
  if (!b) return;
  o.position.copy(b.p);
  if (b.r) o.rotation.copy(b.r);
  if (b.s) o.scale.copy(b.s);
}
