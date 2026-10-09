import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { buildNIIP, registry, hash } from './scene.js';
import { applyParams, overrides, setOpacity } from './animator.js';
import { createFlows, updateFlows } from './flow.js';
import { shotAt, placeCamera, resolveTarget, shotFromCamera } from './camera.js';
import { paramsAt, SHOTS, STATES, DURATION, CHAPTERS, smooth } from './timeline.js';
import { HUD } from './hud.js';

const q = new URLSearchParams(location.search);
const FILM = q.has('film');
const RENDER = q.has('render');
const OUT_W = +q.get('w') || 1080, OUT_H = +q.get('h') || 1920;
const SS = +q.get('ss') || 1; // supersample factor for the recorder

await document.fonts.load('600 40px "Saira Semi Condensed"');
await document.fonts.load('500 20px "JetBrains Mono"');
await document.fonts.ready;

// ---------------------------------------------------------------- renderer
const stage = document.getElementById('stage');
const glCanvas = document.getElementById('gl');
const hudCanvas = document.getElementById('hud');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);
scene.fog = new THREE.FogExp2(0x06070a, 0.01);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

const key = new THREE.DirectionalLight(0xfff3e6, 2.4); key.position.set(-6, 10, 7); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fe8ff, 1.3); rim.position.set(8, 3, -9); scene.add(rim);
const under = new THREE.DirectionalLight(0x3dffc8, 0.25); under.position.set(0, -10, 2); scene.add(under);
scene.add(new THREE.HemisphereLight(0x8090a0, 0x050608, 0.25));

const camera = new THREE.PerspectiveCamera(32, 9 / 16, 0.1, 2000);

const { root, parts } = buildNIIP(scene);
parts.root = root;
const flows = createFlows(parts);
scene.add(flows.points);

// atmosphere motes (deterministic)
const motes = (() => {
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hash(i) - 0.5) * 50; pos[i * 3 + 1] = (hash(i + 0.5) - 0.5) * 34 - 1; pos[i * 3 + 2] = (hash(i + 0.25) - 0.5) * 50; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb8b2, size: 0.035, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(p); return p;
})();

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 20, aperture: 0.00002, maxblur: 0.006 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.4, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.045 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*37.0) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.8)));
      c.rgb *= mix(0.45, 1.0, v);
      c.rgb += (h(vUv * 1000.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
});
composer.addPass(grade);

const hud = new HUD(hudCanvas);

// ---------------------------------------------------------------- sizing
let W = 0, H = 0;
function resize() {
  if (RENDER) { W = OUT_W; H = OUT_H; }
  else if (FILM && q.has('portrait')) {
    const vw = innerWidth, vh = innerHeight;
    H = Math.min(vh, (vw * 16) / 9); W = Math.round((H * 9) / 16); H = Math.round(H);
  } else { W = innerWidth; H = innerHeight; } // film plays full-window (landscape on a normal screen)
  const dpr = RENDER ? SS : Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  composer.setPixelRatio(dpr);
  composer.setSize(W, H);
  glCanvas.style.width = hudCanvas.style.width = W + 'px';
  glCanvas.style.height = hudCanvas.style.height = H + 'px';
  stage.style.width = W + 'px'; stage.style.height = H + 'px';
  hud.resize(Math.round(W * (RENDER ? 1 : dpr)), Math.round(H * (RENDER ? 1 : dpr)), FILM || RENDER ? 1 : 0.72);
  hud.inset = FILM && !RENDER ? 84 * dpr : 0;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- frame
function renderScene(t, P, shotOrFn, hudOpts) {
  applyParams(parts, P, t);
  // targets must be resolved after posing, or the camera aims at last frame's layout
  const shot = typeof shotOrFn === 'function' ? shotOrFn() : shotOrFn;
  placeCamera(camera, shot);
  // scale-aware atmosphere + focus
  scene.fog.density = 0.32 / shot.dist;
  motes.visible = shot.dist > 2;
  motes.rotation.y = t * 0.01;
  bokeh.uniforms.focus.value = shot.dist;
  bokeh.uniforms.aperture.value = (dofOn ? 0.006 : 0) / shot.dist;
  bokeh.uniforms.nearClip.value = camera.near;
  bokeh.uniforms.farClip.value = camera.far;
  bokeh.uniforms.aspect.value = camera.aspect;
  const pxScale = (H * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  updateFlows(flows, parts, P, t, pxScale);
  grade.uniforms.uTime.value = t;
  composer.render();
  hud.draw({ t, camera, root, dist: shot.dist, ...hudOpts });
}

let dofOn = FILM || RENDER;

// ---------------------------------------------------------------- film mode
function filmFrame(t) {
  renderScene(t, paramsAt(t), () => shotAt(root, SHOTS, t), { film: true });
}

// compose GL + HUD into one image (recorder)
const cap = document.createElement('canvas');
function captureFrame(t, type = 'image/png', quality = 0.95) {
  filmFrame(t);
  cap.width = OUT_W; cap.height = OUT_H;
  const c = cap.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(glCanvas, 0, 0, OUT_W, OUT_H);
  c.drawImage(hudCanvas, 0, 0, OUT_W, OUT_H);
  return cap.toDataURL(type, quality);
}

// ---------------------------------------------------------------- interactive mode
let controls = null, current = null, selected = null, transition = null;
const params = { ...STATES[0].params };
const ui = {};

// Orbit controls: left-drag rotate · double-click + drag (or right-drag) move · wheel zoom
function makeControls() {
  const c = new OrbitControls(camera, glCanvas);
  c.enableDamping = true;
  c.dampingFactor = 0.08;
  c.minDistance = 0.0005;
  c.maxDistance = 80;
  c.screenSpacePanning = true;
  c.zoomToCursor = true;
  // Double-click-and-drag pans. This capture listener runs before OrbitControls' own
  // pointerdown, so swapping the LEFT mapping here decides what this drag does.
  let lastUp = { t: -1e9, x: 0, y: 0 };
  glCanvas.addEventListener('pointerdown', (e) => {
    const quick = performance.now() - lastUp.t < 380 && Math.hypot(e.clientX - lastUp.x, e.clientY - lastUp.y) < 24;
    c.mouseButtons.LEFT = e.button === 0 && quick ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    glCanvas.style.cursor = c.mouseButtons.LEFT === THREE.MOUSE.PAN ? 'move' : 'grabbing';
  }, { capture: true });
  addEventListener('pointerup', (e) => {
    lastUp = { t: performance.now(), x: e.clientX, y: e.clientY };
    glCanvas.style.cursor = '';
  });
  return c;
}

function startInteractive() {
  controls = makeControls();
  const s0 = STATES[0].shot;
  current = { ...s0, target: resolveTarget(root, s0.target), az: s0.az * Math.PI / 180, el: s0.el * Math.PI / 180 };
  placeCamera(camera, current);
  controls.target.copy(current.target);
  buildUI();
  requestAnimationFrame(loop);
}

function goState(i) {
  const S = STATES[i];
  applyParams(parts, S.params, clock.getElapsedTime());
  const to = { ...S.shot, target: resolveTarget(root, S.shot.target), az: S.shot.az * Math.PI / 180, el: S.shot.el * Math.PI / 180 };
  applyParams(parts, params, clock.getElapsedTime());
  const from = shotFromCamera(camera, controls.target);
  // shortest way round
  while (to.az - from.az > Math.PI) to.az -= Math.PI * 2;
  while (from.az - to.az > Math.PI) to.az += Math.PI * 2;
  transition = { from, to, p0: { ...params }, p1: { ...S.params }, t0: performance.now(), dur: 2600 };
  ui.states.forEach((b, j) => b.classList.toggle('on', j === i));
}

function focusComponent(id) {
  const g = registry.get(id)?.group;
  if (!g) return;
  const box = new THREE.Box3().setFromObject(g, true);
  const size = box.getSize(new THREE.Vector3()).length();
  const to = shotFromCamera(camera, controls.target);
  to.target = box.getCenter(new THREE.Vector3());
  to.dist = Math.max(size * 1.6, 0.002);
  transition = { from: shotFromCamera(camera, controls.target), to, p0: { ...params }, p1: { ...params }, t0: performance.now(), dur: 1600 };
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime();
  if (transition) {
    const k = Math.min(1, (performance.now() - transition.t0) / transition.dur);
    const e = smooth(k);
    for (const key in transition.p1) params[key] = transition.p0[key] + (transition.p1[key] - transition.p0[key]) * e;
    const { from, to } = transition;
    const shot = {
      target: from.target.clone().lerp(to.target, e),
      dist: Math.exp(Math.log(from.dist) + (Math.log(to.dist) - Math.log(from.dist)) * e),
      az: from.az + (to.az - from.az) * e, el: from.el + (to.el - from.el) * e, fov: from.fov + (to.fov - from.fov) * e,
    };
    placeCamera(camera, shot);
    controls.target.copy(shot.target);
    if (k >= 1) transition = null;
  } else {
    controls.update();
  }
  const shot = shotFromCamera(camera, controls.target);
  camera.near = shot.dist * 0.02; camera.far = shot.dist * 400 + 60; camera.updateProjectionMatrix();
  // rendering (renderScene re-places camera from shot; same pose)
  const callouts = selected ? [{ id: selected, side: 'R', a: 1 }] : [];
  const frames = selected ? [{ id: selected, a: 1 }] : [];
  renderScene(t, params, shot, { film: false, callouts, frames, showRuler: true });
  if (ui.info && selected) ui.info.textContent = describe(selected);
}

function describe(id) {
  const r = registry.get(id);
  const path = [];
  for (let x = r; x; x = registry.get(x.parentId)) path.unshift(x.id);
  return `${path.join(' › ')}\n${r.title} — ${r.sub}`;
}

const ray = new THREE.Raycaster();
function pick(ev) {
  const rect = glCanvas.getBoundingClientRect();
  const m = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(m, camera);
  const hit = ray.intersectObject(root, true).find((h) => h.object.visible);
  if (!hit) { select(null); return; }
  let o = hit.object;
  while (o && !o.userData.componentId) o = o.parent;
  // pick the most specific component, but skip the root
  select(o && o.userData.componentId !== 'NIIP' ? o.userData.componentId : null);
}
function select(id) {
  selected = id;
  ui.tree?.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  if (!id && ui.info) ui.info.textContent = 'Click any component to inspect it.';
}

function buildUI() {
  const panel = document.getElementById('panel');
  panel.hidden = false;
  ui.states = [];
  const st = panel.querySelector('#states');
  STATES.forEach((S, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${S.n}</span>${S.name}`;
    b.onclick = () => goState(i);
    st.appendChild(b); ui.states.push(b);
  });
  ui.states[0].classList.add('on');
  const tree = panel.querySelector('#tree');
  ui.tree = tree;
  const kids = (pid) => [...registry.values()].filter((r) => r.parentId === pid);
  const walk = (pid, depth) => kids(pid).forEach((r) => {
    if (r.id.startsWith('SRC_') && depth > 3) return;
    const b = document.createElement('button');
    b.dataset.id = r.id;
    b.style.paddingLeft = 10 + depth * 12 + 'px';
    b.textContent = r.id;
    b.onclick = () => { select(r.id); focusComponent(r.id); };
    tree.appendChild(b);
    walk(r.id, depth + 1);
  });
  walk(null, 0);
  ui.info = panel.querySelector('#info');
  const ex = panel.querySelector('#explode');
  ex.oninput = () => { transition = null; params.explode = +ex.value; };
  panel.querySelector('#dof').onchange = (e) => { dofOn = e.target.checked; };
  panel.querySelector('#film').onclick = () => { location.search = '?film'; };
  panel.querySelector('#recentre').onclick = () => goState(Math.max(0, ui.states.findIndex((b) => b.classList.contains('on'))));
  panel.querySelector('#fullscreen').onclick = toggleFullscreen;
  // collapsible sidebar (remembered per browser)
  const toggle = document.getElementById('paneltoggle');
  toggle.hidden = false;
  const setOpen = (open) => {
    document.body.classList.toggle('panel-closed', !open);
    toggle.textContent = open ? '‹' : '☰';
    toggle.title = open ? 'Hide panel (H)' : 'Show panel (H)';
    try { localStorage.setItem('niip.panel', open ? '1' : '0'); } catch {}
  };
  let saved = '1';
  try { saved = localStorage.getItem('niip.panel') ?? '1'; } catch {}
  setOpen(saved !== '0');
  toggle.onclick = () => setOpen(document.body.classList.contains('panel-closed'));
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (e.key === 'h' || e.key === 'H') toggle.click();
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  let down = null;
  glCanvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  glCanvas.addEventListener('pointerup', (e) => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 4) pick(e); });
}

// ---------------------------------------------------------------- public API
window.NIIP = {
  registry, root, camera, scene, parts,
  get: (id) => registry.get(id)?.group,
  ids: () => [...registry.keys()],
  /** per-component control: { dx,dy,dz, rx,ry,rz, scale, opacity, visible } */
  set: (id, ov) => { overrides.set(id, { ...(overrides.get(id) || {}), ...ov }); },
  clear: (id) => {
    const ids = id ? [id] : [...overrides.keys()];
    ids.forEach((k) => { if (overrides.get(k)?.opacity != null) setOpacity(registry.get(k).group, 1); overrides.delete(k); });
  },
  setOpacity,
  state: (i) => goState(i),
  params,
  renderFrame: filmFrame,
  captureFrame,
  duration: DURATION,
};

// ---------------------------------------------------------------- cinematic player
// Play / pause / scrub / chapter jumps. While paused the frame freezes and you can
// orbit, zoom and move around it to explain; pressing play returns to the film camera.
function startPlayer() {
  const bar = document.getElementById('player');
  bar.hidden = false;
  const $ = (s) => bar.querySelector(s);
  const playBtn = $('#pp'), scrub = $('#scrub'), time = $('#time'), resetBtn = $('#resetview'), speedBtn = $('#speed');
  const marks = [0, ...CHAPTERS.map((c) => c.t0), 54.9];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  marks.forEach((m) => { const d = document.createElement('i'); d.style.left = (m / DURATION) * 100 + '%'; $('#ticks').appendChild(d); });

  let t = Math.min(DURATION, +q.get('t') || 0), playing = !q.has('paused'), speed = 1, last = performance.now();
  let free = false; // paused and the viewer has moved the camera
  const fc = makeControls();
  fc.enabled = false;
  fc.addEventListener('start', () => { free = true; resetBtn.hidden = false; });

  // hand the current film camera pose to the orbit controls
  const syncFree = () => {
    applyParams(parts, paramsAt(t), t);
    const s = shotAt(root, SHOTS, t);
    placeCamera(camera, s);
    fc.target.copy(s.target);
    fc.update();
  };
  const setPlaying = (p) => {
    if (p && t >= DURATION) t = 0;
    playing = p; free = false; resetBtn.hidden = true;
    fc.enabled = !p;
    if (!p) syncFree();
    playBtn.textContent = p ? '❚❚' : '▶';
    playBtn.title = p ? 'Pause (Space)' : 'Play (Space)';
    bar.classList.toggle('paused', !p);
    last = performance.now();
  };
  const seek = (nt) => { t = Math.min(DURATION, Math.max(0, nt)); free = false; resetBtn.hidden = true; if (!playing) syncFree(); };
  const chapter = (dir) => {
    const i = dir > 0 ? marks.findIndex((m) => m > t + 0.05) : marks.findLastIndex((m) => m < t - 0.6);
    seek(i < 0 ? (dir > 0 ? DURATION : 0) : marks[i]);
  };

  playBtn.onclick = () => setPlaying(!playing);
  $('#prev').onclick = () => chapter(-1);
  $('#next').onclick = () => chapter(1);
  scrub.oninput = () => seek((+scrub.value / 1000) * DURATION);
  resetBtn.onclick = () => { free = false; resetBtn.hidden = true; syncFree(); };
  const speeds = [0.5, 1, 1.5, 2];
  speedBtn.onclick = () => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; speedBtn.textContent = speed + '×'; };
  $('#fs').onclick = toggleFullscreen;
  $('#exit').onclick = () => { location.search = ''; };
  // a single click on the picture pauses (so you can start explaining immediately)
  glCanvas.addEventListener('click', (e) => { if (playing && e.detail === 1) setPlaying(false); });

  addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === ' ' || k === 'k' || k === 'K') { e.preventDefault(); setPlaying(!playing); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? chapter(1) : seek(t + 5); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? chapter(-1) : seek(t - 5); }
    else if (k === 'l' || k === 'L') chapter(1);
    else if (k === 'j' || k === 'J') chapter(-1);
    else if (k === '.') { if (playing) setPlaying(false); seek(t + 1 / 30); }
    else if (k === ',') { if (playing) setPlaying(false); seek(t - 1 / 30); }
    else if (k === 'f' || k === 'F') toggleFullscreen();
    else if (k === 'r' || k === 'R') resetBtn.click();
  });

  // auto-hide the bar while playing and the mouse is idle
  let idle;
  const wake = () => {
    bar.classList.remove('idle'); document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => { if (playing) { bar.classList.add('idle'); document.body.classList.add('idle'); } }, 2600);
  };
  addEventListener('pointermove', wake); addEventListener('keydown', wake); wake();

  const tick = () => {
    requestAnimationFrame(tick);
    const now = performance.now();
    if (playing) {
      t += ((now - last) / 1000) * speed;
      if (t >= DURATION) { t = DURATION; if (q.has('loop')) t = 0; else setPlaying(false); }
    }
    last = now;
    if (!playing && free) {
      fc.update();
      renderScene(t, paramsAt(t), shotFromCamera(camera, fc.target), { film: true });
    } else {
      filmFrame(t);
    }
    scrub.value = Math.round((t / DURATION) * 1000);
    time.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
  };
  setPlaying(playing);
  filmFrame(t);
  scrub.value = Math.round((t / DURATION) * 1000);
  time.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
  requestAnimationFrame(tick);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

if (FILM || RENDER) {
  document.body.classList.add('film');
  if (RENDER) filmFrame(0);
  else startPlayer();
} else {
  startInteractive();
}
window.NIIP_READY = true;
