// Data streams: glowing packets that physically travel through the system.
// Positions are recomputed every frame from live component positions, purely from t.
import * as THREE from 'three';
import { hash } from './scene.js';

const TRAIL = 3; // sub-points per packet (head + fading tail)

export function createFlows(parts) {
  const streams = [];
  const add = (kind, n, meta) => streams.push({ kind, n, meta });
  parts.repos.forEach((_, i) => add('db', 300, { i }));
  parts.sources.forEach((_, i) => add('src', 110, { i }));
  add('spiral', 1300, {});
  parts.modules.forEach((_, i) => add('web', 200, { i }));
  parts.roles.forEach((_, i) => add('users', 90, { i }));

  let total = 0;
  streams.forEach((s) => { s.start = total; total += s.n; });
  const N = total * TRAIL;
  const pos = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('psize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 800 }, uColor: { value: new THREE.Color(0x3dffc8) } },
    vertexShader: `
      attribute float alpha; attribute float psize; varying float vA; uniform float uScale;
      void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = clamp(psize * uScale / -mv.z, 0.0, 9.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      varying float vA; uniform vec3 uColor;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
        float k = smoothstep(0.5, 0.0, d); vec3 col = mix(uColor, vec3(1.0), k*k*0.7);
        gl_FragColor = vec4(col * vA * k * 1.15, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, streams, pos, alpha, size, geo, mat };
}

const A = new THREE.Vector3(), B = new THREE.Vector3(), C1 = new THREE.Vector3(), C2 = new THREE.Vector3(), T = new THREE.Vector3();
function bez(p0, p1, p2, p3, u, out) {
  const v = 1 - u;
  return out.set(
    v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
    v * v * v * p0.z + 3 * v * v * u * p1.z + 3 * v * u * u * p2.z + u * u * u * p3.z,
  );
}
const wp = (o, out, x = 0, y = 0, z = 0) => out.set(x, y, z).applyMatrix4(o.matrixWorld);

export function updateFlows(F, parts, P, t, pixelScale) {
  F.mat.uniforms.uScale.value = pixelScale;
  const { pos, alpha, size } = F;
  const boost = 1 + 1.2 * P.flowBoost;
  const ing = parts.stages[0], out = parts.stages[7];
  const ingP = wp(ing, new THREE.Vector3()), outP = wp(out, new THREE.Vector3());

  for (const s of F.streams) {
    let inten = 0;
    if (s.kind === 'db') inten = P.flowDB; else if (s.kind === 'src') inten = P.flowSrc;
    else if (s.kind === 'spiral') inten = P.flowCore; else if (s.kind === 'web') inten = P.flowWeb;
    else inten = P.flowUsers;
    inten *= boost;

    // stream endpoints (world space)
    let p0, p3, lift = 1;
    if (s.kind === 'db') {
      const repo = parts.repos[s.meta.i];
      p0 = wp(parts.caps[s.meta.i], A, 0, 0.1, 0);
      p3 = ingP.clone().add(new THREE.Vector3((s.meta.i - 1) * 0.9, -0.12, 0.3));
      lift = (p3.y - p0.y) * 0.45;
      void repo;
    } else if (s.kind === 'src') {
      const src = parts.sources[s.meta.i];
      p0 = wp(src, A, 0, 0, -0.7);
      const a = src.userData.angle;
      p3 = ingP.clone().add(new THREE.Vector3(Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2));
      lift = 0;
    } else if (s.kind === 'web') {
      p0 = outP.clone().add(new THREE.Vector3(0, 0.25, 0));
      p3 = wp(parts.modules[s.meta.i], A, 0, -0.15, 0);
      lift = (p3.y - p0.y) * 0.5;
    } else if (s.kind === 'users') {
      p0 = wp(parts.modules[4], A, 0, 0.15, 0.4);
      p3 = wp(parts.roles[s.meta.i], B, 0, 0.05, 0);
      lift = 0.6;
    }
    if (p0) { C1.copy(p0); C1.y += lift; C2.copy(p3); C2.y -= lift; }

    for (let j = 0; j < s.n; j++) {
      const id = s.start + j;
      const h1 = hash(id * 1.37), h2 = hash(id * 2.71), h3 = hash(id * 5.13);
      const speed = s.kind === 'spiral' ? 0.16 + 0.08 * h2 : 0.22 + 0.16 * h2;
      for (let k = 0; k < TRAIL; k++) {
        const u = ((t * speed + h1 - k * 0.012) % 1 + 1) % 1;
        if (s.kind === 'spiral') {
          const turns = 3 + Math.floor(h3 * 2);
          const ang = u * turns * Math.PI * 2 + h1 * Math.PI * 2;
          const rad = 0.42 + 1.25 * h3 * (0.4 + 0.6 * Math.sin(u * Math.PI));
          T.set(Math.sin(ang) * rad, ingP.y + (outP.y - ingP.y) * u, Math.cos(ang) * rad);
        } else {
          bez(p0, C1, C2, p3, u, T);
          const jit = 0.12 * Math.sin(u * Math.PI);
          T.x += (h2 - 0.5) * jit * 2; T.z += (h3 - 0.5) * jit * 2;
        }
        const i3 = (id * TRAIL + k) * 3;
        pos[i3] = T.x; pos[i3 + 1] = T.y; pos[i3 + 2] = T.z;
        const fade = Math.min(1, u * 8, (1 - u) * 8);
        alpha[id * TRAIL + k] = inten * fade * (1 - k * 0.32) * (0.55 + 0.45 * h3);
        size[id * TRAIL + k] = (0.04 + 0.035 * h2) * (1 - k * 0.22);
      }
    }
  }
  F.geo.attributes.position.needsUpdate = true;
  F.geo.attributes.alpha.needsUpdate = true;
  F.geo.attributes.psize.needsUpdate = true;
}
