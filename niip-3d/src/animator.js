// Applies a parameter set (from the timeline or an interactive state) to the scene graph.
// Nothing ever pops in or out: everything slides, lifts, rotates, separates.
import * as THREE from 'three';
import { registry, resetToBase, STAGE_SPACING, STAGE_Y0, PLATTER_PITCH } from './scene.js';
import { smooth } from './timeline.js';

const stagger = (p, i, n, spread = 0.45) => smooth((p - (i / n) * spread) / (1 - spread));
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();

// Per-component manual overrides (public API): { dx,dy,dz, rx,ry,rz, scale, opacity, visible }
export const overrides = new Map();

export function applyParams(parts, P, t) {
  const { root } = parts;
  root.traverse(resetToBase);

  // ---- layer explode
  const ex = P.explode;
  parts.web.position.y += 5.2 * ex;
  parts.db.position.y -= 5.6 * ex;
  parts.web.rotation.y += 0.04 * ex;
  parts.db.rotation.y -= 0.04 * ex;

  // ---- web modules lift and spread
  parts.modules.forEach((m, i) => {
    const s = stagger(P.webSplit, i, 5);
    // fan into a rising diagonal deck that fits a vertical frame
    const bx = m.position.x;
    m.position.x = bx + ((i - 2) * 1.12 - bx) * s;
    m.position.y += (0.9 + i * 0.62) * s;
    m.position.z += (0.2 + i * 0.32) * s;
    m.rotation.x += 0.42 * s;
    m.rotation.y += (i - 2) * -0.06 * s;
  });

  // ---- role chips rise out of the tray and fan into an arc (authored in web space)
  const ua = parts.modules[4];
  parts.web.updateMatrixWorld(true);
  parts.roles.forEach((r, i) => {
    const s = stagger(P.usersSplit, i, 5, 0.4);
    const ws = r.userData.webSpace;
    // roles stack into a vertical column in front of the deck
    const fx = (i - 2) * 0.32, fy = 1.6 + (4 - i) * 1.02, fz = 3.0 + i * 0.12;
    _v.set(ws.x + (fx - ws.x) * s, ws.y + (fy - ws.y) * s + Math.sin(s * Math.PI) * 0.35, ws.z + (fz - ws.z) * s);
    // web space -> USER_ACCOUNTS local
    _v.sub(ua.position).applyQuaternion(_q.copy(ua.quaternion).invert());
    r.position.copy(_v);
    _q2.setFromEuler(_e.set(1.15 * s, -0.18 * s, 0));
    r.quaternion.copy(_q).multiply(_q2);
  });

  // ---- NIIS housing opens
  const o = P.niisOpen;
  const panelStagger = parts.panels.map((_, k) => stagger(o, k, 8, 0.35));
  const r = P.ringSplit;
  const pitch = STAGE_SPACING + 0.98 * r;
  const mid = STAGE_Y0 + 3.5 * STAGE_SPACING;
  parts.stages.forEach((g, i) => { g.position.y = mid + (i - 3.5) * pitch; });
  const topY = parts.stages[7].position.y, botY = parts.stages[0].position.y;
  parts.niisCap.position.y = Math.max(1.32, topY + 0.37 + 0.9 * r);
  parts.niisBase.position.y = Math.min(-1.3, botY - 0.35 - 0.6 * r);
  parts.panels.forEach((h, k) => {
    const s = panelStagger[k];
    h.rotation.x = (Math.PI / 2 - 0.06) * s;
    h.position.z += 0.35 * s;
    h.position.y = parts.niisBase.position.y + 0.15;
  });
  const spH = (topY - botY) + 0.6;
  parts.spine.scale.y = spH; parts.spine.position.y = (topY + botY) / 2;
  parts.spineCore.scale.y = spH; parts.spineCore.position.y = (topY + botY) / 2;

  // rotors spin (deterministic in t)
  const speeds = [0, 0.22, -0.55, 0.3, 0.28, -0.18, 0.12, 0.09];
  parts.rotors.forEach((ro, i) => { ro.rotation.y = speeds[i] * t; });
  parts.integrationInner.rotation.y = -0.5 * t;

  // sources extend out on their rails
  parts.sources.forEach((g, k) => {
    const s = stagger(P.srcExtend, k, 6, 0.4);
    const a = g.userData.angle, rad = 2.75 + 4.0 * s;
    g.position.set(Math.sin(a) * rad, -0.15 * s + Math.sin(t * 0.8 + k) * 0.05 * s, Math.cos(a) * rad);
  });

  // ---- databases separate
  const d = P.dbSplit;
  parts.repos.forEach((g, i) => {
    g.position.x *= 1 + 0.3 * d;
    g.position.y += 0.55 * d;
    g.rotation.y += (i - 1) * 0.12 * d;
  });
  parts.dbPlatform.position.y -= 0.7 * d;
  const p = P.platterSplit;
  parts.platters.forEach((list, ri) => {
    list.forEach((pg, k) => {
      const s = stagger(p, 4 - k, 5, 0.3);
      pg.position.y += (4 - k) * 0.66 * s;
      pg.rotation.y += (k % 2 ? 0.25 : -0.25) * s;
    });
    const top = list[0].position.y;
    parts.caps[ri].position.y = Math.max(1.75, top + 0.22 + 0.9 * p);
    const spine = parts.repos[ri].userData.spine;
    const h = parts.caps[ri].position.y - 0.18;
    spine.scale.y = h; spine.position.y = 0.18 + h / 2;
  });

  // ---- micro chain
  const lid = parts.microLid;
  lid.position.y += 0.04 * P.microLid;
  lid.position.x += 0.075 * P.microLid;
  lid.rotation.z -= 0.5 * P.microLid;
  const rec = registry.get('MICRO_RECORD').group;
  rec.position.y += 0.034 * P.microLift;
  rec.rotation.y += 0.25 * P.microLift;
  parts.recordFields.forEach((f, i) => {
    f.position.copy(f.userData.base.p);
    f.position.x += (i - 2.5) * 0.0011 * P.microFields;
    f.position.y += (i === 3 ? 0.0006 : (i % 2 ? 0.0002 : -0.0002)) * P.microFields;
  });
  parts.recordMeta.position.set(0, 0.0013 + 0.0032 * P.microFields, -0.0002);
  parts.recordMeta.scale.setScalar(Math.max(0.001, P.microFields));

  const { on, off, bs } = parts.bitMeshes;
  const m4 = new THREE.Matrix4();
  let ni = 0, fi = 0;
  for (let b = 0; b < 64; b++) {
    const col = b % 4, row = Math.floor(b / 4);
    const s = stagger(P.microBits, b, 64, 0.5);
    const y = 0.0013 * 0.5 + bs * 0.5 + 0.0009 * s + (parts.bits[b] ? 0.00018 * s : 0);
    m4.compose(_v.set((col - 1.5) * 0.0003, y, (row - 7.5) * 0.00037), _q.identity(), new THREE.Vector3(1, 1, 1).multiplyScalar(0.35 + 0.65 * s));
    if (parts.bits[b]) on.setMatrixAt(ni++, m4); else off.setMatrixAt(fi++, m4);
  }
  on.count = ni; off.count = fi;
  on.instanceMatrix.needsUpdate = off.instanceMatrix.needsUpdate = true;
  parts.microDust.material.opacity = 0.8 * P.microBits;

  // ---- manual overrides last
  overrides.forEach((ov, id) => {
    const c = registry.get(id);
    if (!c) return;
    const g = c.group;
    g.position.x += ov.dx || 0; g.position.y += ov.dy || 0; g.position.z += ov.dz || 0;
    g.rotation.x += ov.rx || 0; g.rotation.y += ov.ry || 0; g.rotation.z += ov.rz || 0;
    if (ov.scale != null) g.scale.multiplyScalar(ov.scale);
    if (ov.visible != null) g.visible = ov.visible;
    if (ov.opacity != null) setOpacity(g, ov.opacity);
  });
  root.updateMatrixWorld(true);
}

// opacity needs per-component materials, so clone lazily on first use
export function setOpacity(group, a) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.ownMat) {
      o.material = o.material.clone();
      o.userData.ownMat = true;
      o.userData.baseOpacity = o.material.opacity;
      o.userData.baseTransparent = o.material.transparent;
    }
    o.material.transparent = a < 1 || o.userData.baseTransparent;
    o.material.opacity = o.userData.baseOpacity * a;
    o.material.depthWrite = a >= 1 && !o.userData.baseTransparent;
  });
}
