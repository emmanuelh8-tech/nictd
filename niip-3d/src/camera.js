// Cinematic camera rig: shots are (target, distance, azimuth, elevation, fov).
// Distance is interpolated in log space so dives across 4+ orders of magnitude feel even,
// and the target pans in proportion to zoom so the subject never slides out of frame.
import * as THREE from 'three';
import { registry } from './scene.js';

export function resolveTarget(root, target, out = new THREE.Vector3()) {
  if (Array.isArray(target) && typeof target[0] === 'number') return out.set(target[0], target[1], target[2]);
  const [id, off] = typeof target === 'string' ? [target, [0, 0, 0]] : target;
  const obj = registry.get(id)?.group || root.getObjectByName(id);
  if (!obj) return out.set(0, 0, 0);
  // offsets are in the object's parent-aligned world units (ignore object scale)
  obj.getWorldPosition(out);
  return out.add(new THREE.Vector3(off[0], off[1], off[2]));
}

// non-uniform Catmull-Rom (Hermite) for scalar keys
function hermite(keys, t, get) {
  const n = keys.length;
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = Math.min(1, Math.max(0, (t - k1.t) / (k2.t - k1.t)));
  const v1 = get(k1), v2 = get(k2);
  const m1 = k1 === k0 ? 0 : ((v2 - get(k0)) / (k2.t - k0.t)) * (k2.t - k1.t);
  let m2 = k3 === k2 ? 0 : ((get(k3) - v1) / (k3.t - k1.t)) * (k2.t - k1.t);
  // monotone limiter: no overshoot past a key (keeps dives from bouncing)
  const dlt = v2 - v1;
  let mm1 = m1;
  if (dlt * mm1 <= 0) mm1 = 0; else if (Math.abs(mm1) > 3 * Math.abs(dlt)) mm1 = 3 * dlt;
  if (dlt * m2 <= 0) m2 = 0; else if (Math.abs(m2) > 3 * Math.abs(dlt)) m2 = 3 * dlt;
  return herm(u, v1, mm1, v2, m2);
}
function herm(u, v1, m1, v2, m2) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
}

function segment(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  return i;
}

const DEG = Math.PI / 180;
const tA = new THREE.Vector3(), tB = new THREE.Vector3();

export function shotAt(root, keys, t) {
  t = Math.min(keys[keys.length - 1].t, Math.max(0, t));
  const logD = hermite(keys, t, (k) => Math.log(k.dist));
  const dist = Math.exp(logD);
  const az = hermite(keys, t, (k) => k.az) * DEG;
  const el = hermite(keys, t, (k) => k.el) * DEG;
  const fov = hermite(keys, t, (k) => k.fov);

  const i = segment(keys, t);
  const a = keys[i], b = keys[i + 1];
  resolveTarget(root, a.target, tA);
  resolveTarget(root, b.target, tB);
  const ratio = Math.abs(Math.log(b.dist / a.dist));
  let w;
  if (ratio > 1.2) {
    // zoom-proportional pan: progress of the log-distance... in linear distance terms
    w = (dist - a.dist) / (b.dist - a.dist);
  } else {
    const u = (t - a.t) / (b.t - a.t);
    w = u * u * (3 - 2 * u);
  }
  w = Math.min(1, Math.max(0, w));
  const target = tA.clone().lerp(tB, w);
  return { target, dist, az, el, fov };
}

export function placeCamera(camera, shot) {
  const { target, dist, az, el, fov } = shot;
  camera.position.set(
    target.x + dist * Math.sin(az) * Math.cos(el),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(az) * Math.cos(el),
  );
  camera.fov = fov;
  camera.near = dist * 0.02;
  camera.far = dist * 400 + 60;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

/** Interactive helper: read the controls' current pose as a shot. */
export function shotFromCamera(camera, target) {
  const d = camera.position.clone().sub(target);
  const dist = d.length();
  return { target: target.clone(), dist, az: Math.atan2(d.x, d.z), el: Math.asin(d.y / dist), fov: camera.fov };
}
