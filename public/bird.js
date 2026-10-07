// The home page's robot turaco (desktop for now). It starts on the "Featured Research Papers"
// heading and keeps the reader company down the page and back up again: each time they scroll it
// flies to another heading on screen, every flight by a different route. When the footer comes into
// view it lands there and rests until the reader scrolls back up.
//
// When the reader stops scrolling for ten seconds it does something of its own, never the same thing
// twice running: a pass across the whole screen and back, a visit to another heading, a hop along the
// letters, a loop, a dive toward the reader, a wing stretch, a song, a preen, a turn. It watches the
// mouse, and if the cursor comes too close it jumps away. If no heading is in view it flies past now
// and then, and comes back as soon as one appears, so it is never simply gone.
//
// Perches are marked in the page: data-perch="start" | data-perch | data-perch="final".
// The bird stands on a flat-topped capital on the heading's first line, so it never covers a line.
// It runs only on wide screens with a mouse, never under reduced motion, and only with WebGL.

const DESKTOP = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (DESKTOP.matches && !REDUCE.matches && webgl && document.querySelector('[data-perch]')) start().catch((e) => console.warn('robo turaco:', e));

async function start() {
  const THREE = await import('three');
  const { createRoboTuraco, studioEnvironment } = await import('./robo-turaco.js' + new URL(import.meta.url).search);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---- stage: one transparent canvas over the page, under the nav bar
  const canvas = document.createElement('canvas');
  canvas.className = 'robo-bird'; canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(THREE, renderer);
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x40362c, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(1.2, 2.2, 1.6); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ec4ff, 1.1); rim.position.set(-1.5, 1.2, -1.6); scene.add(rim);
  const FOV = 30, D = 10;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40); camera.position.set(0, 0, D);
  const bird = createRoboTuraco(THREE);
  const root = bird.object;
  scene.add(root);
  const BIRD_H = 0.5;                                   // the perched bird, feet to crest, in model units

  let W = 1, H = 1, s = 0.01, birdPx = 80;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    s = (2 * D * Math.tan((FOV * Math.PI) / 360)) / H;  // world units per pixel at the page plane
    birdPx = clamp(H * 0.095, 66, 92);
    root.scale.setScalar((birdPx * s) / BIRD_H);
    perches.forEach((p) => { p.letter = null; });
  }
  const toWorld = (x, y, z = 0) => new THREE.Vector3((x - W / 2) * s * (D - z) / D, (H / 2 - y) * s * (D - z) / D, z);
  const toScreen = (v) => ({ x: W / 2 + v.x / (s * (D - v.z) / D), y: H / 2 - v.y / (s * (D - v.z) / D), z: v.z });

  // ---- perches
  const FLAT = 'TEFHIDPBRLNMKZ';
  const meas = document.createElement('canvas').getContext('2d');
  const perches = [...document.querySelectorAll('[data-perch]')].map((el) => ({ el, role: el.dataset.perch || 'perch', aim: 0.66, flip: false }));
  // the flat-topped capital on the heading's first line nearest p.aim of the way along
  function chooseLetter(p) {
    const cs = getComputedStyle(p.el);
    const upper = cs.textTransform === 'uppercase';
    const chars = []; let firstTop = null;
    const walker = document.createTreeWalker(p.el, NodeFilter.SHOW_TEXT);
    outer: for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      for (let i = 0; i < n.length; i++) {
        if (!n.data[i].trim()) continue;
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
        const rect = r.getClientRects()[0]; if (!rect) continue;
        if (firstTop === null) firstTop = rect.top;
        if (Math.abs(rect.top - firstTop) > 3) break outer;
        const ch = upper ? n.data[i].toUpperCase() : n.data[i];
        chars.push({ node: n, i, ch, x: rect.left + rect.width / 2 });
      }
    }
    if (!chars.length) { p.letter = null; return; }
    const left = chars[0].x, right = chars[chars.length - 1].x, aim = left + (right - left) * p.aim;
    const flat = chars.filter((c) => FLAT.includes(c.ch));
    const c = (flat.length ? flat : chars).reduce((a, b) => (Math.abs(b.x - aim) < Math.abs(a.x - aim) ? b : a));
    meas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = meas.measureText(c.ch);
    p.letter = { node: c.node, i: c.i, ascent: m.fontBoundingBoxAscent, cap: m.actualBoundingBoxAscent };
    p.flatCount = flat.length;
  }
  // where the bird's feet go, in viewport pixels (null while the heading has no layout)
  function perchPoint(p) {
    if (!p.letter) chooseLetter(p);
    const L = p.letter; if (!L) return null;
    const r = document.createRange(); r.setStart(L.node, L.i); r.setEnd(L.node, L.i + 1);
    const rect = r.getClientRects()[0];
    if (!rect) { p.letter = null; return null; }
    return { x: rect.left + rect.width / 2, y: rect.top + L.ascent - L.cap + birdPx * 0.045, z: 0 };
  }
  const nav = document.querySelector('.gov-nav');
  const navBottom = () => (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0);
  // a heading the bird can land on: below the nav with room for the bird, and not at the very bottom
  const inZone = (pt) => !!pt && pt.y > navBottom() + birdPx * 1.15 && pt.y < H * 0.9 && pt.x > 30 && pt.x < W - 30;
  const onScreen = (pt) => !!pt && pt.y > navBottom() + birdPx * 0.6 && pt.y < H + birdPx && pt.x > -40 && pt.x < W + 40;

  // ---- flight paths: a Catmull-Rom spline through screen-space waypoints, each with a depth (z)
  function spline(pts) {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const seg = (i, t) => {
      const [a, b, c, d] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
      const f = (k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
      return { x: f('x'), y: f('y'), z: f('z') };
    };
    const n = pts.length - 1, lut = [{ d: 0, i: 0, t: 0 }];
    let d = 0, prev = seg(0, 0);
    for (let i = 0; i < n; i++) for (let k = 1; k <= 30; k++) {
      const q = seg(i, k / 30); d += Math.hypot(q.x - prev.x, q.y - prev.y); lut.push({ d, i, t: k / 30 }); prev = q;
    }
    return {
      len: d,
      at(dist) { // position at an arc length
        dist = clamp(dist, 0, d);
        let lo = 0, hi = lut.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lut[mid].d < dist) lo = mid; else hi = mid; }
        const A = lut[lo], B = lut[hi], f = B.d > A.d ? (dist - A.d) / (B.d - A.d) : 0;
        if (A.i === B.i) return seg(A.i, lerp(A.t, B.t, f));
        return seg(B.i, lerp(0, B.t, f));
      },
    };
  }
  const OFF = 110; // how far beyond the edge the bird goes to vanish
  const SIDES = ['left', 'right', 'topLeft', 'topRight'];
  const OPPOSITE = { left: 'right', right: 'left', topLeft: 'right', topRight: 'left' };
  function edgePoint(side) {
    const top = navBottom();
    if (side === 'left') return { x: -OFF, y: rnd(top + 60, H * 0.6), z: 0 };
    if (side === 'right') return { x: W + OFF, y: rnd(top + 60, H * 0.6), z: 0 };
    if (side === 'topLeft') return { x: rnd(-OFF, W * 0.2), y: -OFF, z: 0 };
    return { x: rnd(W * 0.8, W + OFF), y: -OFF, z: 0 };             // topRight
  }
  const topY = () => navBottom() + 130;
  // the routes: each returns the waypoints between the start (a) and the end (b)
  const ROUTES = {
    arc: (a, b) => [{ x: lerp(a.x, b.x, 0.5) + rnd(-80, 80), y: Math.max(topY(), Math.min(a.y, b.y) - rnd(110, 230)), z: rnd(0.2, 1.2) }],
    swoop: (a, b) => [{ x: lerp(a.x, b.x, 0.35), y: Math.min(H - 60, Math.max(a.y, b.y) + rnd(60, 150)), z: rnd(0.4, 1.4) }, { x: lerp(a.x, b.x, 0.8) + rnd(-60, 60), y: b.y - rnd(90, 150), z: 0.4 }],
    wide: (a, b) => { const far = (a.x + b.x) / 2 < W / 2 ? W * rnd(0.78, 0.9) : W * rnd(0.1, 0.22); return [{ x: far, y: rnd(H * 0.3, H * 0.65), z: rnd(0.3, 1.5) }, { x: lerp(far, b.x, 0.55), y: b.y - rnd(100, 170), z: 0.3 }]; },
    loop: (a, b) => {
      const c = { x: clamp(lerp(a.x, b.x, 0.5) + rnd(-120, 120), 160, W - 160), y: clamp(Math.min(a.y, b.y) - rnd(40, 120), topY() + 40, H - 170) };
      const r = rnd(80, 120), dir = Math.random() < 0.5 ? 1 : -1, a0 = Math.atan2(a.y - c.y, a.x - c.x);
      return [0.25, 0.5, 0.75, 1].map((f) => ({ x: c.x + Math.cos(a0 + dir * f * Math.PI * 2) * r, y: c.y + Math.sin(a0 + dir * f * Math.PI * 2) * r * 0.8, z: Math.sin(f * Math.PI) * 1.2 }))
        .concat([{ x: lerp(c.x, b.x, 0.6), y: b.y - 120, z: 0.2 }]);
    },
    dive: (a, b) => [{ x: lerp(a.x, b.x, 0.4) + rnd(-100, 100), y: Math.max(topY(), lerp(a.y, b.y, 0.4) - rnd(60, 140)), z: rnd(2.4, 3.4) }, { x: lerp(a.x, b.x, 0.85), y: b.y - rnd(80, 130), z: 0.5 }],
    // the long one: across the whole screen and back
    tour: (a, b) => {
      const goRight = a.x < W / 2;
      const far = goRight ? W * rnd(0.84, 0.92) : W * rnd(0.08, 0.16), near = goRight ? W * rnd(0.12, 0.25) : W * rnd(0.75, 0.88);
      return [{ x: lerp(a.x, far, 0.5), y: Math.max(topY(), a.y - rnd(140, 220)), z: 0.6 },
        { x: far, y: rnd(H * 0.35, H * 0.55), z: rnd(0.8, 1.8) },
        { x: lerp(far, near, 0.5), y: rnd(H * 0.62, H * 0.78), z: rnd(-0.4, 0.6) },
        { x: near, y: rnd(H * 0.35, H * 0.5), z: 1 },
        { x: lerp(near, b.x, 0.6), y: b.y - rnd(110, 160), z: 0.3 }];
    },
    // a short flutter along the same word
    hop: (a, b) => [{ x: lerp(a.x, b.x, 0.5), y: Math.min(a.y, b.y) - 40 - Math.abs(b.x - a.x) * 0.18, z: 0.15 }],
  };
  const RANDOM_ROUTES = ['arc', 'swoop', 'wide', 'loop', 'dive'];
  let lastRoute = '';
  function routeTo(from, to, name) {
    if (!name) { name = pick(RANDOM_ROUTES.filter((n) => n !== lastRoute)); lastRoute = name; }
    return { pts: [from, ...ROUTES[name](from, to), { x: to.x, y: to.y, z: 0 }], name };
  }

  // ---- state
  const S = { PERCHED: 'perched', TAKEOFF: 'takeoff', FLY: 'flying', AWAY: 'away' };
  let state = S.PERCHED, perch = perches.find((p) => p.role === 'start') || perches[0];
  let everSeen = false, seenFor = 0, scrolled = false, now = 0, lastScroll = 0, lastAct = 0, scrollDir = 1, lastY = scrollY;
  let flight = null, pending = null, awayT = 0, awayWait = 1, launchT = 0, roll = 0, modeHold = 0, busyT = 0, startleCool = 0;
  let lastBehaviour = '', behaviours = 0;
  const mouse = { x: -1e4, y: -1e4, t: -99 };
  let qFlight = new THREE.Quaternion(), qPerch = new THREE.Quaternion(), qLaunch = new THREE.Quaternion();
  // perched it turns three-quarters to the reader, so the long tail goes back behind it, not across the words
  const faceYaw = (x, p) => (x < W / 2 ? 1 : -1) * (p && p.flip ? -1 : 1) * 0.55;
  const facing = (x, p) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, faceYaw(x, p), 0));
  addEventListener('scroll', () => {
    scrolled = true; lastScroll = now; lastAct = now;
    const y = scrollY; if (Math.abs(y - lastY) > 2) scrollDir = y > lastY ? 1 : -1; lastY = y;
  }, { passive: true });
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now; }, { passive: true });
  addEventListener('resize', resize);
  const idleFor = () => now - lastScroll;

  // headings the bird could fly to; the footer wins while the reader is heading down to it
  function targets(exclude) {
    const list = perches.filter((p) => p !== exclude).map((p) => ({ p, pt: perchPoint(p) })).filter((o) => inZone(o.pt));
    const fin = list.find((o) => o.p.role === 'final');
    if (fin && scrollDir > 0) return [fin];
    return list.filter((o) => o.p.role !== 'final' || list.length === 1);
  }
  function takeOff(opts = {}) {
    state = S.TAKEOFF; bird.takeOff(); launchT = 0; qLaunch.copy(root.quaternion); pending = opts;
  }
  // a flight from a screen point: opts.target (a perch), opts.route, or anywhere in view, or out of sight
  function launchFrom(from, opts = {}, midAir = false) {
    from = { x: from.x, y: from.y, z: from.z || 0 };
    let target = opts.target || null, pt = target ? perchPoint(target) : null;
    if (!target) {
      const t = targets(state === S.PERCHED || state === S.TAKEOFF ? perch : null);
      if (t.length) { const o = pick(t); target = o.p; pt = o.pt; }
    }
    if (target && pt) {
      const r = routeTo(from, pt, opts.route);
      flight = { ...r, spl: spline(r.pts), dist: 0, target, t0: pt, landing: false, speed: opts.route === 'hop' ? 0.55 : 1 };
    } else {
      const side = pick(SIDES), end = edgePoint(side);
      const mid = { x: lerp(from.x, end.x, 0.5) + rnd(-120, 120), y: Math.max(topY(), lerp(from.y, end.y, 0.5) - rnd(40, 160)), z: rnd(0.4, 1.6) };
      flight = { pts: [from, mid, end], spl: spline([from, mid, end]), dist: 0, target: null, landing: false, exitSide: side, name: 'exit', speed: 1 };
    }
    state = S.FLY; bird.fly(); launchT = midAir ? 1 : 0; root.visible = true;
  }
  // back into view from an edge, to a heading
  function comeBack() {
    const t = targets(null); if (!t.length) return false;
    const o = pick(t);
    const side = flight && flight.exitSide ? pick(SIDES.filter((x) => x !== flight.exitSide)) : pick(['left', 'right']);
    const r = routeTo(edgePoint(side), o.pt);
    flight = { ...r, spl: spline(r.pts), dist: 0, target: o.p, t0: o.pt, landing: false, speed: 1 };
    state = S.FLY; bird.fly(); launchT = 1; root.visible = true;
    return true;
  }
  // nothing to land on: fly across the screen and out the other side, by one of the routes
  function passBy() {
    const a = pick(SIDES), A = edgePoint(a), B = edgePoint(OPPOSITE[a]);
    const r = routeTo(A, B);
    r.pts[r.pts.length - 1] = B;
    flight = { ...r, spl: spline(r.pts), dist: 0, target: null, landing: false, exitSide: OPPOSITE[a], speed: 0.9 };
    state = S.FLY; bird.fly(); launchT = 1; root.visible = true; lastAct = now;
  }

  // ---- the things it does on its own when the reader stays put
  const BEHAVIOURS = {
    tour: () => takeOff({ target: perch, route: 'tour' }),
    visit: () => { if (targets(perch).length) takeOff({}); else BEHAVIOURS.loop(); },
    hop: () => {
      if ((perch.flatCount || 0) < 2) return BEHAVIOURS.turn();
      perch.aim = pick([0.12, 0.35, 0.55, 0.85].filter((a) => Math.abs(a - perch.aim) > 0.15)); perch.letter = null;
      takeOff({ target: perch, route: 'hop' });
    },
    loop: () => takeOff({ target: perch, route: 'loop' }),
    dive: () => takeOff({ target: perch, route: 'dive' }),
    stretch: () => { bird.express('stretch'); busyT = 2.2; },
    sing: () => { bird.express('chirp'); bird.express('bob'); busyT = 1.8; },
    preen: () => { bird.express('preen'); busyT = 2; },
    turn: () => { perch.flip = !perch.flip; bird.express('hop'); busyT = 1.2; },
    shake: () => { bird.express('shake'); busyT = 1; },
  };
  function behave() {
    // the first time the reader stops, the bird makes a pass across the screen; after that, anything
    const name = behaviours === 0 ? 'tour' : pick(Object.keys(BEHAVIOURS).filter((n) => n !== lastBehaviour));
    behaviours++; lastBehaviour = name; lastAct = now;
    BEHAVIOURS[name]();
  }

  const v3 = new THREE.Vector3(), mtx = new THREE.Matrix4(), ORIGIN = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
  let prevHeading = 0;
  function orient(dx, dy, dz, dt) {
    const f = v3.set(dx * s, -dy * s, dz); if (f.lengthSq() < 1e-10) return;
    f.normalize(); f.y = clamp(f.y, -0.55, 0.55); f.normalize();
    mtx.lookAt(ORIGIN, f.clone().negate(), UP);
    qFlight.setFromRotationMatrix(mtx);
    // bank into the curve
    const heading = Math.atan2(dy, dx);
    let dh = heading - prevHeading; if (dh > Math.PI) dh -= Math.PI * 2; if (dh < -Math.PI) dh += Math.PI * 2;
    prevHeading = heading;
    roll += (clamp(-dh / Math.max(dt, 1e-3) * 0.12, -0.6, 0.6) - roll) * (1 - Math.exp(-4 * dt));
    qFlight.multiply(new THREE.Quaternion().setFromAxisAngle(FWD, roll));
  }

  let rendered = true, frameN = 0;
  function frame(dt) {
    now += dt;
    if (!DESKTOP.matches) { canvas.style.display = 'none'; scrolled = false; return; }
    canvas.style.display = '';
    let draw = true;
    busyT -= dt; startleCool -= dt;

    if (state === S.PERCHED) {
      const pt = perchPoint(perch);
      const vis = onScreen(pt);
      if (pt) { root.position.copy(toWorld(pt.x, pt.y)); qPerch = facing(pt.x, perch); root.quaternion.slerp(qPerch, 1 - Math.exp(-6 * dt)); }
      seenFor = vis ? seenFor + dt : 0;
      if (vis) everSeen = true;
      draw = vis;
      const resting = perch.role === 'final' && inZone(pt) && scrollDir > 0;  // the end of the page
      const footerAhead = scrollDir > 0 && perch.role !== 'final' && targets(perch).some((o) => o.p.role === 'final');
      if (vis && pt.y < navBottom() + birdPx * 0.9) takeOff();                                   // about to slide under the nav
      else if (vis && scrolled && !resting && (seenFor > 1.1 || footerAhead)) takeOff();
      else if (!vis && everSeen && now - lastScroll < 2) { state = S.AWAY; root.visible = false; awayT = 0; awayWait = rnd(0.5, 1.2); flight = null; }
      else if (vis) {
        // watch the mouse; jump away from it if it comes too close
        const head = { x: pt.x, y: pt.y - birdPx * 0.75 };
        const dx = mouse.x - head.x, dy = mouse.y - head.y, dist = Math.hypot(dx, dy);
        if (dist < birdPx * 0.8 && startleCool <= 0 && busyT <= 0 && now - mouse.t < 0.5) {
          startleCool = 5; lastAct = now;
          bird.express('hop');
          if (targets(perch).length && Math.random() < 0.6) takeOff({}); else takeOff({ target: perch, route: pick(['loop', 'arc', 'tour']) });
        } else if (dist < 520 && now - mouse.t < 4 && busyT <= 0) {
          bird.lookAt(clamp(dx / 260, -1.3, 1.3) - faceYaw(pt.x, perch), clamp(dy / 380, -0.35, 0.5), 0.3);
        }
        if (state === S.PERCHED && idleFor() > 10 && now - lastAct > 10 && busyT <= 0) behave();
      } else if (!everSeen && idleFor() > 10 && now - lastAct > 12) {
        passBy();                                                     // a glimpse while the reader is still up top
      }
    } else if (state === S.TAKEOFF) {
      const pt = perchPoint(perch);
      if (pt) root.position.copy(toWorld(pt.x, pt.y));
      launchT += dt;
      if (launchT >= bird.takeOffLaunch) launchFrom(pt || toScreen(root.position), pending || {});
    } else if (state === S.FLY) {
      const F = flight;
      launchT += dt;
      const speed = 560 * clamp(H / 900, 0.8, 1.3) * clamp(launchT * 3 + 0.3, 0, 1) * (F.speed || 1);
      // keep tracking a moving target (the page may scroll under the bird); change course if it goes
      let live = null, shift = { x: 0, y: 0 };
      if (F.target) {
        live = perchPoint(F.target);
        const lost = !live || (!inZone(live) && F.dist / F.spl.len < 0.85);
        const footer = F.target.role !== 'final' && scrollDir > 0 && targets(null).some((o) => o.p.role === 'final');
        if (lost || footer) { launchFrom(toScreen(root.position), {}, true); bird.update(dt); return void render(true); }
        shift = { x: live.x - F.t0.x, y: live.y - F.t0.y };
      }
      const left = F.spl.len - F.dist;
      const brake = F.target ? lerp(0.35, 1, clamp(left / 150, 0, 1)) : 1;
      const d0 = F.dist; F.dist = Math.min(F.spl.len, F.dist + dt * speed * brake);
      const u0 = F.spl.len ? d0 / F.spl.len : 1, u1 = F.spl.len ? F.dist / F.spl.len : 1;
      const w0 = smooth(clamp((u0 - 0.35) / 0.65, 0, 1)), w1 = smooth(clamp((u1 - 0.35) / 0.65, 0, 1));
      const a = F.spl.at(d0), b = F.spl.at(F.dist);
      const ax = a.x + shift.x * w0, ay = a.y + shift.y * w0, bx = b.x + shift.x * w1, by = b.y + shift.y * w1;
      root.position.copy(toWorld(bx, by, b.z));
      orient(bx - ax, by - ay, b.z - a.z, dt);
      // climbing beats hard, a long descent glides, landing flares
      modeHold -= dt;
      const landSpan = F.name === 'hop' ? 60 : 140;
      if (F.target && left < landSpan && !F.landing) { F.landing = true; bird.flare(); }
      if (!F.landing && modeHold <= 0) {
        const vy = (by - ay) / Math.max(dt, 1e-3);
        if (vy > 140 && bird.mode === 'flying' && u1 > 0.15) { bird.fly({ glide: true }); modeHold = 0.5; }
        else if (vy < 60 && bird.mode === 'glide') { bird.fly(); modeHold = 0.4; }
      }
      // orientation: out of the perch pose at the start, into it at the end
      if (launchT < 0.35) root.quaternion.slerpQuaternions(qLaunch, qFlight, smooth(launchT / 0.35));
      else if (F.landing) { qPerch = facing(live ? live.x : bx, F.target); root.quaternion.slerpQuaternions(qFlight, qPerch, smooth(1 - clamp(left / landSpan, 0, 1))); }
      else root.quaternion.copy(qFlight);
      if (F.dist >= F.spl.len - 0.5) {
        if (F.target) { perch = F.target; state = S.PERCHED; seenFor = 0; bird.touchDown(); lastAct = now; }
        else { state = S.AWAY; root.visible = false; awayT = 0; awayWait = rnd(0.6, 1.4); }
      }
    } else if (state === S.AWAY) {
      awayT += dt; draw = false;
      if (awayT > awayWait && now - lastScroll > 0.25) {
        if (!comeBack()) {
          awayWait = awayT + 0.5;
          if (idleFor() > 10 && now - lastAct > 12) passBy();          // nowhere to land: fly past now and then
        }
      }
    }

    scrolled = false;
    bird.update(dt);
    // perched and still, every other frame is enough
    frameN++;
    render(draw && (state !== S.PERCHED || frameN % 2 === 0 || bird.timeInMode < 1 || busyT > 0));
  }
  function render(draw) {
    if (draw) { renderer.render(scene, camera); rendered = true; }
    else if (rendered) { renderer.clear(); rendered = false; }
  }

  resize();
  let last = performance.now();
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
    try { frame(dt); } catch (e) { console.warn('robo turaco frame:', e); }
  }
  requestAnimationFrame(loop);
  // read-only status for testing in the console
  window.__roboTuraco = {
    get state() { return state; }, get perch() { return perch && perch.el.textContent.trim(); }, get route() { return flight && flight.name; },
    get behaviour() { return lastBehaviour; }, get behaviours() { return behaviours; }, root,
  };
}
