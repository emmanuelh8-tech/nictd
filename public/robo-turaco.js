// Robo Turaco: a Great Blue Turaco rebuilt as a small robot, with a real bone skeleton and
// procedural animation. Pass in THREE (so the page decides where three.js comes from).
//
//   const bird = createRoboTuraco(THREE);
//   scene.add(bird.object);           // origin = the point between the feet (the perch)
//   bird.perch() | bird.takeOff() | bird.fly({ glide }) | bird.flare() | bird.touchDown()
//   bird.lookAt(yaw, pitch, hold)     // turn the head (radians, + = toward the bird's left)
//   bird.express('chirp' | 'stretch' | 'preen' | 'bob' | 'hop' | 'shake' | 'peck' | 'grab' | 'excited' | 'confused')
//   bird.update(dt)                   // every frame
//
// Axes on the bird: +Z is forward (the beak), +Y up, +X the bird's left.
// Every moving part hangs off a THREE.Bone; meshes are rigidly attached to their bone, which is
// how a mechanical character is skinned. Pose = a set of smoothed parameters (wing spread,
// flap, crouch, tail lift, head look ...) turned into bone rotations each frame.

export const TURACO_PALETTE = {
  body: '#3B79BE', wing: '#2F64A6', flight: '#28558F', head: '#5E86C2', crest: '#11162E',
  tail: '#3568A8', tailBand: '#161C42', breast: '#B9B654', vent: '#5A2318', undertail: '#D7DAD6',
  leg: '#3E4560', beak: '#F5C928', beakTip: '#E64A35', joint: '#2A2F3B', steel: '#A9B2C0', core: '#151A26',
};

export function createRoboTuraco(THREE, options = {}) {
  const C = { ...TURACO_PALETTE, ...(options.palette || {}) };
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const bump = (x, c, w) => { const d = Math.abs(x - c) / w; return d >= 1 ? 0 : smooth(1 - d); };

  // ---------------------------------------------------------------- materials
  const mats = {};
  const mat = (key, color, o = {}) => (mats[key] = new THREE.MeshStandardMaterial({
    color, metalness: o.metal ?? 0.35, roughness: o.rough ?? 0.42, flatShading: o.flat ?? true,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide,
  }));
  mat('body', C.body); mat('wing', C.wing); mat('flight', C.flight, { side: THREE.DoubleSide });
  mat('wingPlate', C.wing, { side: THREE.DoubleSide });
  mat('head', C.head); mat('crest', C.crest, { metal: 0.55, rough: 0.3, side: THREE.DoubleSide });
  mat('tail', C.tail, { side: THREE.DoubleSide }); mat('tailBand', C.tailBand, { metal: 0.5, rough: 0.32, side: THREE.DoubleSide });
  mat('breast', C.breast, { metal: 0.2, rough: 0.5 }); mat('vent', C.vent, { metal: 0.25, rough: 0.5 });
  mat('undertail', C.undertail, { metal: 0.15, rough: 0.55, side: THREE.DoubleSide });
  mat('leg', C.leg, { metal: 0.6, rough: 0.35 }); mat('joint', C.joint, { metal: 0.7, rough: 0.3 });
  mat('steel', C.steel, { metal: 0.9, rough: 0.22, flat: false });
  mat('core', C.core, { metal: 0.4, rough: 0.6 });
  mat('strut', '#1E4682', { metal: 0.6, rough: 0.32 });
  mat('beak', C.beak, { metal: 0.25, rough: 0.35 }); mat('beakTip', C.beakTip, { metal: 0.25, rough: 0.35 });
  mat('eye', '#07080B', { metal: 0.2, rough: 0.08, flat: false });
  mat('led', '#FF9A4A', { metal: 0, rough: 0.4, flat: false, emissive: '#FF7A2A', ei: 1.6 });
  mat('ring', '#6E2630', { metal: 0.5, rough: 0.35, flat: false });

  // ---------------------------------------------------------------- geometry helpers
  const geoms = [];
  const keep = (g) => { geoms.push(g); return g; };
  // a hull of revolution laid along +Z: prof = [[radius, z], ...] from tail to chest
  function hull(prof, segs = 9, phiStart = 0, phiLen = TAU) {
    const pts = prof.map(([r, z]) => new THREE.Vector2(r, z));
    const g = new THREE.LatheGeometry(pts, segs, phiStart, phiLen);
    g.rotateX(Math.PI / 2); // lathe Y -> bird Z; phi = 0 points down (-Y), phi = PI up
    return keep(g);
  }
  // a flat feather/fin plate lying in XZ, base at the origin, pointing -Z
  function plate(len, w, opts = {}) {
    const tipW = opts.tipW ?? w * 0.55, baseW = opts.baseW ?? w * 0.7, round = opts.round ?? 0.5;
    const s = new THREE.Shape();
    s.moveTo(-baseW / 2, 0);
    s.lineTo(-w / 2, -len * 0.3);
    s.lineTo(-tipW / 2, -len * (1 - 0.12 * round));
    s.quadraticCurveTo(0, -len * (1 + 0.04 * round), tipW / 2, -len * (1 - 0.12 * round));
    s.lineTo(w / 2, -len * 0.3);
    s.lineTo(baseW / 2, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: opts.thick ?? 0.006, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 3 });
    g.translate(0, 0, -(opts.thick ?? 0.006) / 2);
    g.rotateX(Math.PI / 2); // shape Y (-len) -> -Z ; extrusion -> -Y
    return keep(g);
  }
  // a fin standing up (crest): base on the origin, rising along +Y
  function fin(h, w, thick = 0.005) {
    const s = new THREE.Shape();
    s.moveTo(-w * 0.32, 0);
    s.lineTo(-w * 0.5, h * 0.62);
    s.quadraticCurveTo(-w * 0.45, h * 1.02, 0, h);
    s.quadraticCurveTo(w * 0.45, h * 1.02, w * 0.5, h * 0.62);
    s.lineTo(w * 0.32, 0);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0012, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -thick / 2);
    g.rotateY(Math.PI / 2); // face sideways: the fin's flat side looks along X
    return keep(g);
  }
  const cyl = (rt, rb, h, seg = 8) => keep(new THREE.CylinderGeometry(rt, rb, h, seg));
  const ball = (r, d = 1) => keep(new THREE.IcosahedronGeometry(r, d));
  const mesh = (g, m, parent, pos, rot, scl) => {
    const o = new THREE.Mesh(g, mats[m]);
    if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (scl) o.scale.set(...scl);
    o.castShadow = true; parent.add(o); return o;
  };
  const bones = {};
  const bone = (name, parent, pos = [0, 0, 0], order) => {
    const b = new THREE.Bone(); b.name = name; b.position.set(...pos);
    if (order) b.rotation.order = order; parent.add(b); bones[name] = b; return b;
  };

  // ---------------------------------------------------------------- the rig
  const object = new THREE.Group(); object.name = 'RoboTuraco';
  const root = bone('root', object);                 // at the feet; takes the crouch
  const body = bone('body', root, [0, 0.2, 0]);      // centre of the torso; takes posture

  // torso: a dark core, the blue shell over the back and sides, the yellow-green breast
  // plate and the chestnut vent plate underneath; the gaps between them read as panel seams
  const TORSO = [[0, -0.205], [0.03, -0.19], [0.058, -0.155], [0.082, -0.095], [0.096, -0.025], [0.099, 0.035], [0.093, 0.09], [0.077, 0.135], [0.05, 0.168], [0.02, 0.183], [0, 0.186]];
  const torso = new THREE.Group(); torso.scale.set(0.86, 1, 1); body.add(torso);
  mesh(hull(TORSO.map(([r, z]) => [r * 0.95, z]), 12), 'core', torso);
  mesh(hull(TORSO, 12, 0.95, TAU - 1.9), 'body', torso);
  mesh(hull(TORSO.filter(([, z]) => z > -0.07).map(([r, z]) => [r * 1.008, z]), 12, -0.86, 1.72), 'breast', torso);
  mesh(hull(TORSO.filter(([, z]) => z <= -0.05).map(([r, z]) => [r * 1.008, z]), 12, -0.86, 1.72), 'vent', torso);
  // a raised spine ridge: a hard-surface cue down the back
  mesh(keep(new THREE.BoxGeometry(0.012, 0.01, 0.2)), 'joint', body, [0, 0.096, -0.03]);

  // ---- neck: four ringed vertebrae
  const neckBase = [0, 0.068, 0.112];
  let prev = body;
  const NECK = 3;
  for (let i = 0; i < NECK; i++) {
    const b = bone('neck' + i, prev, i === 0 ? neckBase : [0, 0.027, 0], 'YXZ');
    const r = 0.047 - i * 0.0035;
    mesh(cyl(r * 0.93, r, 0.031, 12), i < 1 ? 'body' : 'head', b, [0, 0.016, 0]);
    mesh(cyl(r * 0.88, r * 0.88, 0.03, 12), 'joint', b, [0, 0.03, 0]);
    prev = b;
  }
  const head = bone('head', prev, [0, 0.034, 0], 'YXZ');
  // head shell, the face, the eyes
  mesh(ball(0.058, 1), 'head', head, [0, 0.03, 0.006], null, [0.9, 0.92, 1.05]);
  mesh(ball(0.042, 1), 'body', head, [0, 0.012, -0.03], null, [1.05, 1, 1]); // nape, darker
  const eyes = [];
  for (const s of [1, -1]) {
    const socket = new THREE.Group(); socket.position.set(s * 0.049, 0.04, 0.026);
    socket.rotation.set(0, s * 1.15, 0); head.add(socket);
    mesh(keep(new THREE.TorusGeometry(0.0102, 0.0022, 6, 16)), 'ring', socket);
    mesh(keep(new THREE.SphereGeometry(0.0096, 14, 10, 0, TAU, 0, Math.PI / 2)), 'eye', socket, [0, 0, 0], [Math.PI / 2, 0, 0]);
    mesh(keep(new THREE.SphereGeometry(0.0022, 8, 6)), 'led', socket, [0.0018, 0.0026, 0.0078]);
    eyes.push(socket);
  }
  // beak: a stout yellow bill with a red tip, the lower mandible on its own jaw bone
  const beak = new THREE.Group(); beak.position.set(0, 0.022, 0.062); head.add(beak);
  mesh(cyl(0.013, 0.022, 0.022, 4), 'beak', beak, [0, 0, 0.008], [Math.PI / 2, Math.PI / 4, 0], [0.85, 1, 1.3]);
  mesh(cyl(0.0, 0.013, 0.017, 4), 'beakTip', beak, [0, -0.003, 0.026], [Math.PI / 2 + 0.38, Math.PI / 4, 0], [0.85, 1, 1.3]);
  const jaw = bone('jaw', head, [0, 0.008, 0.056]);
  mesh(cyl(0.005, 0.014, 0.022, 4), 'beak', jaw, [0, 0, 0.011], [Math.PI / 2, Math.PI / 4, 0], [0.8, 1, 0.6]);
  // crest: a fan of blue-black fins on its own bones, from the forehead over to the nape
  const crest = bone('crest', head, [0, 0.07, 0.0]);
  const crestFins = [];
  const FINS = 9;
  for (let i = 0; i < FINS; i++) {
    const u = i / (FINS - 1);                  // 0 front .. 1 back
    const a = lerp(-0.95, 1.0, u);              // angle round the head, about X
    const h = 0.05 + 0.04 * Math.sin(Math.PI * clamp(lerp(0.15, 0.95, u), 0, 1));
    for (const side of [1, -1]) {
      const b = bone('crestFin' + i + (side > 0 ? 'L' : 'R'), crest, [side * 0.0035, Math.cos(a) * 0.012 - 0.012, Math.sin(-a) * 0.04 + 0.004], 'XZY');
      mesh(fin(h * (side > 0 ? 1 : 0.96), 0.034, 0.008), 'crest', b);
      crestFins.push({ bone: b, a, u, side });
    }
  }

  // ---- wings (built for both sides; s = +1 left, -1 right)
  const wings = [];
  function buildWing(s) {
    const shoulder = bone((s > 0 ? 'L' : 'R') + '_shoulder', body, [s * 0.078, 0.07, 0.07], 'YZX');
    const humerus = bone((s > 0 ? 'L' : 'R') + '_humerus', shoulder, [0, 0, 0], 'YXZ');
    mesh(ball(0.013, 0), 'joint', shoulder);
    mesh(keep(new THREE.BoxGeometry(0.12, 0.009, 0.013)), 'strut', humerus, [s * 0.06, 0, 0]);
    const covH = bone((s > 0 ? 'L' : 'R') + '_covH', humerus, [s * 0.06, 0.007, 0.012], 'YXZ');
    mesh(plate(0.09, 0.09, { tipW: 0.07, baseW: 0.085, thick: 0.008 }), 'wingPlate', covH, [s * 0.012, 0, 0]);
    const elbow = bone((s > 0 ? 'L' : 'R') + '_elbow', humerus, [s * 0.12, 0, 0], 'YXZ');
    mesh(ball(0.01, 0), 'joint', elbow);
    mesh(keep(new THREE.BoxGeometry(0.14, 0.008, 0.011)), 'strut', elbow, [s * 0.07, 0, 0]);
    const covF = bone((s > 0 ? 'L' : 'R') + '_covF', elbow, [s * 0.07, 0.008, 0.01], 'YXZ');
    mesh(plate(0.075, 0.12, { tipW: 0.09, baseW: 0.11, thick: 0.008 }), 'wingPlate', covF, [s * 0.01, 0, 0]);
    const wrist = bone((s > 0 ? 'L' : 'R') + '_wrist', elbow, [s * 0.14, 0, 0], 'YXZ');
    mesh(ball(0.009, 0), 'joint', wrist);
    mesh(keep(new THREE.BoxGeometry(0.1, 0.007, 0.01)), 'strut', wrist, [s * 0.05, 0, 0]);
    const secondaries = [], primaries = [];
    for (let i = 0; i < 6; i++) {
      const b = bone((s > 0 ? 'L' : 'R') + '_sec' + i, elbow, [s * (0.01 + i * 0.024), 0.003 - i * 0.0006, 0], 'YXZ');
      mesh(plate(0.15 + i * 0.006, 0.054), 'flight', b);
      secondaries.push({ bone: b, i, spread: s * (0.08 - i * 0.04) });
    }
    for (let i = 0; i < 5; i++) {
      const b = bone((s > 0 ? 'L' : 'R') + '_pri' + i, wrist, [s * (0.012 + i * 0.022), 0.002 - i * 0.0006, 0.002], 'YXZ');
      mesh(plate(0.17 + i * 0.012, 0.048, { tipW: 0.03 }), 'flight', b);
      primaries.push({ bone: b, i, spread: s * -(0.16 + i * 0.17) });
    }
    wings.push({ s, shoulder, humerus, elbow, wrist, secondaries, primaries, covH, covF });
  }
  buildWing(1); buildWing(-1);

  // ---- tail: long, a dark band near the tip, pale undertail coverts at the base
  const tailBase = bone('tailBase', body, [0, 0.022, -0.17], 'XYZ');
  mesh(ball(0.02, 0), 'joint', tailBase);
  const tailPlates = [];
  const TAILN = 8;
  for (let i = 0; i < TAILN; i++) {
    const c = (i - (TAILN - 1) / 2) / ((TAILN - 1) / 2);   // -1 .. 1
    const b = bone('tail' + i, tailBase, [c * 0.012, 0.004 - Math.abs(c) * 0.003, 0], 'YXZ');
    const len = 0.4 - Math.abs(c) * 0.035;
    mesh(plate(len * 0.68, 0.05, { tipW: 0.05, baseW: 0.034, thick: 0.006 }), 'tail', b);
    mesh(plate(len * 0.34, 0.05, { tipW: 0.038, baseW: 0.05, thick: 0.0065 }), 'tailBand', b, [0, 0.0004, -len * 0.66]);
    tailPlates.push({ bone: b, c });
  }
  mesh(plate(0.1, 0.07, { tipW: 0.05, baseW: 0.06, thick: 0.01 }), 'undertail', tailBase, [0, -0.012, 0.01]);

  // ---- legs: chestnut thigh armour, a gunmetal piston shank, four toes (two front, two back)
  const legs = [];
  const THIGH = 0.07, SHANK = 0.076;
  for (const s of [1, -1]) {
    const hip = bone((s > 0 ? 'L' : 'R') + '_hip', body, [s * 0.04, -0.07, -0.02], 'XYZ');
    mesh(ball(0.026, 1), 'vent', hip, [0, -0.012, 0], null, [1, 1.25, 1.05]);
    mesh(cyl(0.012, 0.015, THIGH, 7), 'vent', hip, [0, -THIGH / 2, 0]);
    const knee = bone((s > 0 ? 'L' : 'R') + '_knee', hip, [0, -THIGH, 0], 'XYZ');
    mesh(ball(0.012, 0), 'joint', knee);
    mesh(cyl(0.008, 0.008, SHANK * 0.55, 7), 'leg', knee, [0, -SHANK * 0.3, 0]);
    mesh(cyl(0.0045, 0.0045, SHANK * 0.6, 6), 'steel', knee, [0, -SHANK * 0.7, 0]);
    const ankle = bone((s > 0 ? 'L' : 'R') + '_ankle', knee, [0, -SHANK, 0], 'XYZ');
    mesh(ball(0.009, 0), 'joint', ankle);
    const toes = [];
    const TOES = [[0.32, 0.044], [-0.32, 0.044], [0.55, -0.034], [-0.15, -0.03]]; // [yaw, length(+fwd/-back)]
    TOES.forEach(([yaw, len], k) => {
      const t = bone((s > 0 ? 'L' : 'R') + '_toe' + k, ankle, [0, -0.004, 0], 'YXZ');
      t.rotation.y = len > 0 ? yaw * 0.6 * s : Math.PI + yaw * s;
      const L = Math.abs(len);
      mesh(keep(new THREE.BoxGeometry(0.0075, 0.007, L)), 'leg', t, [0, 0, L / 2]);
      mesh(keep(new THREE.ConeGeometry(0.003, 0.009, 5)), 'steel', t, [0, -0.002, L + 0.003], [Math.PI / 2 + 0.5, 0, 0]);
      toes.push({ bone: t, front: len > 0 });
    });
    legs.push({ s, hip, knee, ankle, toes });
  }

  // ---------------------------------------------------------------- pose parameters
  // P = current, T = target. Each eases toward its target at its own rate (per second).
  const P = {
    spread: 0, flapAmp: 0, sweep: 0, twist: 0, legTuck: 0, crouch: 0, legForward: 0, grip: 1,
    pitch: -0.45, tailLift: 0, tailFan: 0, crest: 1, yaw: 0, look: 0, tilt: 0, jaw: 0, blink: 0, flapRate: 3.4, shuffle: 0,
  };
  const T = { ...P };
  const K = {
    spread: 8, flapAmp: 6, sweep: 6, twist: 6, legTuck: 7, crouch: 14, legForward: 6, grip: 10,
    pitch: 5, tailLift: 9, tailFan: 6, crest: 7, yaw: 9, look: 9, tilt: 7, jaw: 22, blink: 40, flapRate: 5, shuffle: 10,
  };
  let phase = 0;            // flap cycle 0..1
  let breath = 0;
  let mode = 'perched';
  let timeInMode = 0;
  let idleClock = { look: 1, blink: 2.2, crest: 5, tail: 3.5, shuffle: 7, chirp: 9 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  let pulses = [];          // short timed curves added on top (tail pump, crouch kick ...)
  const pulse = (key, amount, dur, shape = 'kick', delay = 0) => pulses.push({ key, amount, dur, t: -delay, shape });
  const pulseValue = (key) => pulses.reduce((s, p) => {
    if (p.key !== key || p.t < 0) return s;
    const x = p.t / p.dur;
    const v = p.shape === 'kick' ? Math.sin(Math.PI * Math.min(1, x)) * Math.exp(-2.2 * x) * 1.6 : Math.sin(Math.PI * Math.min(1, x));
    return s + v * p.amount;
  }, 0);

  function setMode(m) { mode = m; timeInMode = 0; }

  // ---------------------------------------------------------------- actions
  function perch() {
    setMode('perched');
    Object.assign(T, { spread: 0, flapAmp: 0, sweep: 0, twist: 0, legTuck: 0, crouch: 0, legForward: 0, grip: 1, pitch: -0.45, tailLift: 0, tailFan: 0.05, crest: 1, jaw: 0 });
  }
  function takeOff() {
    setMode('takeoff');
    Object.assign(T, { crouch: 1, spread: 0.35, tailLift: -0.25, look: -0.15, yaw: 0, grip: 1, crest: 0.85 });
  }
  function fly({ glide = false, intensity = 1 } = {}) {
    setMode(glide ? 'glide' : 'flying');
    Object.assign(T, {
      spread: 1, flapAmp: glide ? 0.06 : 0.85 * intensity, flapRate: glide ? 2 : lerp(3.0, 4.6, intensity), sweep: glide ? 0.12 : 0,
      twist: 0, legTuck: 1, crouch: 0, legForward: 0, grip: 0, pitch: glide ? -0.05 : 0.02, tailLift: 0.1, tailFan: glide ? 0.55 : 0.25,
      crest: 0.75, look: 0, yaw: 0, jaw: 0,
    });
  }
  function flare() {
    setMode('landing');
    Object.assign(T, { spread: 1, flapAmp: 0.55, flapRate: 5.4, sweep: -0.32, twist: -0.25, legTuck: 0, legForward: 1, grip: 0.1, pitch: -0.95, tailLift: -0.5, tailFan: 0.9, crest: 1, look: 0.25 });
  }
  function touchDown() {
    pulse('crouch', 0.55, 0.45); pulse('tailLift', 0.45, 0.7, 'hump');
    perch();
    timeInMode = 0;
    idleClock = { look: 0.6, blink: 1.2, crest: 0.9, tail: 2.6, shuffle: 1.4, chirp: 6 };
  }
  // for the director: the moment the takeoff crouch has loaded and the bird should leave
  const takeOffLaunch = 0.16;

  // ---------------------------------------------------------------- per-frame
  function update(dtIn) {
    const dt = clamp(dtIn || 0, 0, 1 / 20);
    timeInMode += dt;
    pulses.forEach((p) => (p.t += dt)); pulses = pulses.filter((p) => p.t < p.dur);

    // behaviour inside modes
    if (mode === 'perched') idle(dt); else if (lookHold <= 0) { T.tilt = 0; }
    if (mode === 'takeoff' && timeInMode > takeOffLaunch) {
      // launch: legs push, wings beat down hard
      Object.assign(T, { crouch: -0.25, spread: 1, flapAmp: 1, flapRate: 4.8, legTuck: 1, pitch: -0.25, tailLift: 0.1, tailFan: 0.5, look: 0, grip: 0 });
      if (timeInMode > takeOffLaunch + 0.18) T.crouch = 0;
    }

    for (const k in T) P[k] += (T[k] - P[k]) * (1 - Math.exp(-K[k] * dt));
    phase = (phase + P.flapRate * dt) % 1;
    breath += dt * (mode === 'perched' ? 1.6 : 0);

    pose();
  }

  let lookHold = 0;
  function lookAt(yaw, look = 0, hold = 1.2, tilt = 0) { T.yaw = clamp(yaw, -1.8, 1.8); T.look = clamp(look, -0.4, 0.7); T.tilt = tilt; lookHold = hold; }
  // small set pieces the page can call for: each is a few timed pulses on top of the pose
  function express(kind) {
    if (kind === 'chirp') { [0, 0.3, 0.62].forEach((d) => pulse('jaw', 0.3, 0.22, 'hump', d)); pulse('crest', 0.28, 1.1, 'hump'); pulse('look', -0.18, 0.9, 'hump'); }
    if (kind === 'bob') { [0, 0.32, 0.64].forEach((d) => pulse('look', 0.28, 0.26, 'hump', d)); pulse('crouch', 0.18, 0.9, 'hump'); }
    if (kind === 'stretch') { pulse('stretch', 1, 1.9, 'hump'); pulse('crest', 0.22, 1.4, 'hump'); pulse('tailFan', 0.9, 1.7, 'hump'); pulse('tailLift', 0.25, 1.6, 'hump'); }
    if (kind === 'preen') { lookAt((Math.random() < 0.5 ? 1 : -1) * 1.7, 0.55, 1.4); pulse('shuffle', 1, 1.2, 'hump', 0.35); pulse('jaw', 0.18, 0.5, 'hump', 0.5); }
    if (kind === 'hop') { pulse('crouch', 0.6, 0.42); pulse('shuffle', 0.8, 0.5, 'hump'); }
    if (kind === 'shake') { pulse('shake', 1, 0.6, 'hump'); pulse('crest', -0.3, 0.6, 'hump'); }
    if (kind === 'peck') { pulse('peck', 1, 0.34, 'hump'); pulse('jaw', 0.42, 0.3, 'hump', 0.05); pulse('crouch', 0.3, 0.34, 'hump'); }
    if (kind === 'grab') { pulse('grab', 1, 0.55, 'hump'); pulse('tailFan', 0.8, 0.6, 'hump'); }
    if (kind === 'excited') { pulse('crest', 0.35, 1.2, 'hump'); pulse('crouch', 0.32, 0.8, 'hump'); pulse('shuffle', 0.7, 0.6, 'hump', 0.2); }
    if (kind === 'confused') {
      pulse('crest', -0.35, 1.4, 'hump'); pulse('shake', 0.7, 0.5, 'hump', 0.1);
      lookAt(rnd(-1, 1), 0.45, 0.9, rnd(-0.4, 0.4));
    }
  }
  function idle(dt) {
    const c = idleClock;
    for (const k in c) c[k] -= dt;
    if (lookHold > 0) { lookHold -= dt; c.look = Math.max(c.look, 0.4); }
    else if (c.look <= 0 && mode === 'perched') {
      const r = Math.random();
      T.yaw = r < 0.2 ? 0 : rnd(-1.05, 1.05); T.look = rnd(-0.2, 0.28);
      T.tilt = Math.random() < 0.35 ? rnd(0.22, 0.4) * (Math.random() < 0.5 ? -1 : 1) : 0;
      c.look = rnd(1.1, 2.8);
    }
    else if (false) { T.yaw = Math.random() < 0.25 ? 0 : rnd(-0.95, 0.95); T.look = rnd(-0.25, 0.3); c.look = rnd(0.7, 2.6); }
    if (c.blink <= 0) { pulse('blink', 1, 0.16, 'hump'); c.blink = rnd(1.8, 4.5); }
    if (c.crest <= 0) { pulse('crest', -0.45, 0.6, 'hump'); c.crest = rnd(4, 9); }
    if (c.tail <= 0) { pulse('tailLift', 0.32, 0.9, 'hump'); c.tail = rnd(2.8, 6.5); }
    if (c.shuffle <= 0) { pulse('shuffle', 1, 0.7, 'hump'); c.shuffle = rnd(6, 12); }
    if (c.chirp <= 0) { pulse('jaw', 0.28, 0.28, 'hump'); c.chirp = rnd(7, 15); }
  }

  function pose() {
    const crouch = P.crouch + pulseValue('crouch');
    // ---- posture: the body sinks into the crouch; legs solve to keep the feet planted
    const bodyH = 0.19 - crouch * 0.05;
    body.position.set(0, lerp(bodyH, 0.13, P.legTuck), lerp(-0.012, 0, P.legTuck) + crouch * 0.01);
    body.position.y += Math.sin(breath * TAU * 0.35) * 0.0016;
    body.rotation.set(P.pitch + crouch * 0.18, 0, 0);

    // ---- neck + head: posture compensates body pitch so the head stays level (birds do this)
    // perched the neck stands nearly upright; in flight it reaches forward
    const tuck = smooth(clamp(P.legTuck, 0, 1));
    let neckSum = 0;
    for (let i = 0; i < NECK; i++) {
      const b = bones['neck' + i];
      b.rotation.x = (i === 0 ? lerp(0.32, 0.66, tuck) : lerp(0.14, 0.17, tuck)) + P.look * 0.1 + pulseValue('peck') * (i === 0 ? 0.75 : 0.3);
      b.rotation.y = P.yaw * 0.2;
      neckSum += b.rotation.x;
    }
    head.rotation.x = -body.rotation.x - neckSum - 0.08 + (P.look + pulseValue('look')) * 0.55 + pulseValue('peck') * 0.5;
    head.rotation.y = P.yaw * 0.4 + Math.sin(breath * 42) * 0.28 * pulseValue('shake');
    head.rotation.z = P.yaw * -0.08 + P.tilt;
    const blink = clamp(pulseValue('blink'), 0, 1);
    eyes.forEach((e) => e.scale.set(1, 1 - blink * 0.85, 1));
    jaw.rotation.x = clamp(P.jaw + pulseValue('jaw'), 0, 0.5);

    // crest fan: raised = fins radiate; lowered = they lie back
    const cr = clamp(P.crest + pulseValue('crest'), 0, 1.2);
    crestFins.forEach(({ bone: b, a, u, side }) => {
      const flat = (1 - cr) * (0.9 + u * 0.5);
      b.rotation.x = -a * lerp(0.55, 1.0, cr) - flat;
      b.rotation.z = -side * lerp(0.03, 0.075, cr);
    });

    // ---- wings
    const ph = phase * TAU;
    const amp = P.flapAmp;
    const up = amp * bump(phase, 0.75, 0.32);                // upstroke: the wing half folds
    const shuffle = pulseValue('shuffle');
    for (const w of wings) {
      const s = w.s;
      const stretch = pulseValue('stretch');
      const sp = smooth(clamp(P.spread + shuffle * 0.18 + stretch * 0.98, 0, 1));
      // flight angles (in the wing plane) and folded angles, blended by spread
      const elevF = amp * Math.cos(ph) * 1.0 + 0.1 - up * 0.2 + stretch * 0.75;
      const twistF = P.twist + amp * 0.32 * Math.sin(ph);
      const humF = 0.22 + P.sweep + amp * 0.15 * Math.sin(ph) + up * 0.55;
      const elbF = -0.32 - up * 1.05;
      const wriF = 0.2 + up * 0.85;
      w.shoulder.rotation.z = s * lerp(-1.42, elevF, sp);
      w.shoulder.rotation.x = lerp(0.1, twistF, sp);
      w.shoulder.rotation.y = s * lerp(0.13, 0, sp);
      w.humerus.rotation.y = s * lerp(1.25, humF, sp);
      w.elbow.rotation.y = s * lerp(-2.32, elbF, sp);
      w.wrist.rotation.y = s * lerp(2.45, wriF, sp);
      w.wrist.rotation.x = lerp(0, P.twist * 0.8 + amp * 0.25 * Math.sin(ph - 0.4), sp);
      const forearmAbs = w.humerus.rotation.y + w.elbow.rotation.y;
      w.covH.rotation.y = lerp(-w.humerus.rotation.y + s * 0.05, 0, sp);
      w.covF.rotation.y = lerp(-forearmAbs + s * 0.03, 0, sp);
      w.covH.position.y = lerp(0.012, 0.007, sp);
      w.covF.position.y = lerp(0.016, 0.008, sp);
      const handAbs = forearmAbs + w.wrist.rotation.y;
      // feathers: spread they rake out along the wing; folded they lie back along the body
      w.secondaries.forEach((f) => {
        const folded = -forearmAbs + s * (0.02 + f.i * 0.025);
        f.bone.rotation.y = lerp(folded, f.spread, sp);
        f.bone.rotation.x = lerp(0.02, 0.01 * f.i, sp);
      });
      w.primaries.forEach((f) => {
        const folded = -handAbs + s * (-0.04 + f.i * 0.02);
        const slot = up * 0.25 * f.i * s * -1;
        f.bone.rotation.y = lerp(folded, f.spread + slot, sp);
        f.bone.rotation.x = lerp(0.02 - f.i * 0.004, 0.015 * f.i + amp * 0.08 * Math.sin(ph - 0.6), sp);
        f.bone.position.y = lerp(0.006 + f.i * 0.0018, 0.002 - f.i * 0.0006, sp); // stack when folded
      });
    }

    // ---- tail
    const tl = P.tailLift + pulseValue('tailLift');
    tailBase.rotation.x = lerp(-0.08, -0.05, smooth(P.legTuck)) + tl + (mode === 'flying' ? Math.sin(ph + 1) * amp * 0.05 : 0);
    const fan = lerp(0.03, 0.17, clamp(P.tailFan + pulseValue('tailFan'), 0, 1));
    tailPlates.forEach(({ bone: b, c }) => { b.rotation.y = c * fan * 3.5; b.rotation.x = -Math.abs(c) * 0.03; });

    // ---- legs: two-bone IK to the perch, blended with the tucked flight pose
    legs.forEach((L) => {
      // foot target in root space -> body space
      const target = new THREE.Vector3(L.s * 0.038, 0, lerp(0, 0.06, P.legForward));
      const grab = pulseValue('grab');
      body.updateMatrix();
      const inv = body.matrix.clone().invert();
      target.applyMatrix4(inv);
      const d = target.clone().sub(L.hip.position);
      const dist = clamp(Math.hypot(d.y, d.z), Math.abs(THIGH - SHANK) + 0.005, THIGH + SHANK - 0.002);
      const theta = Math.atan2(-d.z, -d.y);
      const beta = Math.acos(clamp((THIGH * THIGH + dist * dist - SHANK * SHANK) / (2 * THIGH * dist), -1, 1));
      const gamma = Math.acos(clamp((THIGH * THIGH + SHANK * SHANK - dist * dist) / (2 * THIGH * SHANK), -1, 1));
      const ikHip = theta + beta, ikKnee = -(Math.PI - gamma);
      L.hip.rotation.x = lerp(ikHip, 1.35, tuck) - grab * 1.6;
      L.knee.rotation.x = lerp(ikKnee, 0.6, tuck) - grab * 0.5;
      L.hip.rotation.z = L.s * lerp(0.0, 0.12, tuck);
      // keep the foot flat on the perch while standing
      const footLevel = -(body.rotation.x + L.hip.rotation.x + L.knee.rotation.x);
      L.ankle.rotation.x = lerp(footLevel, 0.9, tuck);
      const curl = lerp(clamp(P.grip, 0, 1) * 0.12, 1.25, tuck) * (1 - grab * 0.9);
      L.toes.forEach((t) => { t.bone.rotation.x = t.front ? curl : curl * 0.8; });
    });
  }

  perch();
  pose();

  // count what we built (the lab shows it)
  let triangles = 0; let meshes = 0;
  object.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; triangles += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  const boneList = []; object.traverse((o) => o.isBone && boneList.push(o));

  return {
    object, bones, boneList, params: P, targets: T,
    get mode() { return mode; },
    get timeInMode() { return timeInMode; },
    takeOffLaunch,
    stats: { bones: boneList.length, meshes, triangles: Math.round(triangles) },
    perch, takeOff, fly, flare, touchDown, update, lookAt, express,
    snap() { Object.assign(P, T); pulses = []; pose(); },
    setPhase(v) { phase = ((v % 1) + 1) % 1; pose(); },
    dispose() { geoms.forEach((g) => g.dispose()); Object.values(mats).forEach((m) => m.dispose()); },
  };
}

// A small studio environment for metal reflections, without loading any file:
// a sky-to-ground gradient dome and a few soft light panels, prefiltered by PMREM.
export function studioEnvironment(THREE, renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const col = [];
  const top = new THREE.Color('#dfe9f7'), mid = new THREE.Color('#9fb2cc'), bot = new THREE.Color('#3a4252');
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    const c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bot, -y);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, p, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) }));
    m.position.set(...p); m.lookAt(0, 0, 0); scene.add(m);
  };
  panel(6, 3, [4, 6, 5], 3.2); panel(4, 4, [-6, 2, 3], 1.4); panel(8, 1.5, [0, 5, -6], 2.2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.04).texture;
  pm.dispose();
  return tex;
}
