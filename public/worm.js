// The worm: a pink, ringed earthworm on a chain of bones, that comes up out of a small hole and goes
// back down. Only the part above the ground line is drawn (a clipping plane), so it really does
// appear to come out of the hole. Pass in THREE.
//
//   const worm = createWorm(THREE);
//   scene.add(worm.object);          // origin = the hole; the ground is the object's y
//   worm.setGround(worldY)           // each frame, after moving worm.object
//   worm.emerge(h) | worm.peek() | worm.duck() | worm.hide()   h = how much shows (model units)
//   worm.update(dt)
//
// Axes: +Y up out of the hole; the worm sways in the X-Y plane (toward the reader is +Z).

export function createWorm(THREE) {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const L = 0.44, R0 = 0.026, R1 = 0.019, BONES = 9, RINGS = 34;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // ---- body: a tapered tube with a ring every so often, coloured like the photo (pink, darker creases,
  // the pale saddle a third of the way down from the head)
  const geo = new THREE.CylinderGeometry(R1, R0, L, 14, RINGS * 3, true);
  geo.translate(0, L / 2, 0);
  const pos = geo.attributes.position, col = [], idx = [], wts = [];
  const pink = new THREE.Color('#D9727F'), crease = new THREE.Color('#A44A58'), saddle = new THREE.Color('#E9A3A8'), tip = new THREE.Color('#B4586A');
  const seg = L / (BONES - 1);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), u = y / L;                     // 0 at the hole end, 1 at the head
    const ring = Math.cos((u * RINGS) * Math.PI * 2);    // 1 mid-ring, -1 in a crease
    const inSaddle = u > 0.6 && u < 0.72;
    const swell = 1 + 0.07 * Math.max(0, ring) + (inSaddle ? 0.12 : 0);
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setXYZ(i, x * swell, y, z * swell);
    const c = (inSaddle ? saddle : pink).clone().lerp(crease, Math.max(0, -ring) * 0.55);
    if (u > 0.9) c.lerp(tip, (u - 0.9) * 6);
    col.push(c.r, c.g, c.b);
    const f = clamp(y / seg, 0, BONES - 1.0001), b0 = Math.floor(f), w = f - b0;
    idx.push(b0, Math.min(b0 + 1, BONES - 1), 0, 0); wts.push(1 - w, w, 0, 0);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.04, clippingPlanes: [plane] });
  const bones = [];
  for (let i = 0; i < BONES; i++) {
    const b = new THREE.Bone(); b.name = 'worm' + i; b.position.y = i === 0 ? 0 : seg;
    if (i) bones[i - 1].add(b); bones.push(b);
  }
  const body = new THREE.SkinnedMesh(geo, mat);
  body.add(bones[0]); body.bind(new THREE.Skeleton(bones));
  body.frustumCulled = false;
  // a rounded head on the last bone
  const headMat = new THREE.MeshStandardMaterial({ color: '#C8616F', roughness: 0.3, metalness: 0.04, clippingPlanes: [plane] });
  const head = new THREE.Mesh(new THREE.SphereGeometry(R1 * 1.02, 14, 10), headMat);
  head.scale.set(1, 1.25, 1); bones[BONES - 1].add(head);

  // ---- the hole: a dark oval seen at an angle, with a few crumbs of soil that appear with it
  const holeTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 32, 4, 64, 32, 62); gr.addColorStop(0, 'rgba(28,16,10,.95)'); gr.addColorStop(0.55, 'rgba(48,30,18,.85)'); gr.addColorStop(1, 'rgba(60,40,24,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(64, 32, 62, 30, 0, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, opacity: 0 }));
  hole.renderOrder = -1;
  const soilMat = new THREE.MeshStandardMaterial({ color: '#5A3B27', roughness: 0.9, transparent: true, opacity: 0 });
  const crumbs = [[-0.07, 0.006, 0.012], [0.068, 0.005, 0.016], [-0.045, 0.012, 0.02], [0.05, 0.011, 0.024], [0.0, 0.004, 0.03]].map(([x, y, r]) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.6, 0), soilMat); m.position.set(x, y, 0.02); return m;
  });

  const object = new THREE.Group(); object.name = 'Worm';
  const lift = new THREE.Group();               // moves the worm up and down through the hole
  lift.add(body);
  object.add(hole, ...crumbs, lift);
  lift.position.z = 0.02;

  // ---- motion
  let shown = 0, want = 0, speed = 3, t = Math.random() * 10, mood = 0.4, lookT = 0, look = 0, lookTo = 0, holeOn = 0;
  let squash = 0;
  const api = {
    object, length: L,
    get out() { return shown > 0.03; },
    get shown() { return shown; },
    setGround(worldY) { plane.constant = -worldY; },
    emerge(h = 0.18) { want = h; speed = 2.4; mood = 0.35; holeOn = 1; },
    peek() { want = 0.07; speed = 3; mood = 0.2; holeOn = 1; },
    wiggle() { mood = 0.9; },
    calm() { mood = 0.3; },
    duck() { want = -0.03; speed = 16; squash = 1; },
    hide() { want = -0.03; speed = 16; shown = -0.03; holeOn = 0; },
    closeHole() { holeOn = 0; },
    update(dt) {
      t += dt;
      shown += (want - shown) * (1 - Math.exp(-speed * dt));
      squash *= Math.exp(-6 * dt);
      lift.position.y = -L + Math.max(-0.03, shown);
      // the hole and its crumbs fade in with the worm and out a little after
      const h = hole.material.opacity + ((holeOn ? 1 : 0) - hole.material.opacity) * (1 - Math.exp(-4 * dt));
      hole.material.opacity = h; soilMat.opacity = h;
      // it looks about: the head end turns to one side, holds, turns to the other
      lookT -= dt; if (lookT <= 0) { lookTo = (Math.random() * 2 - 1) * 0.9; lookT = 0.6 + Math.random() * 1.4; }
      look += (lookTo - look) * (1 - Math.exp(-5 * dt));
      // only the part out of the ground moves much; deeper bones stay nearly straight
      const outFrom = clamp((L - Math.max(0, shown)) / seg, 0, BONES - 1);
      bones.forEach((b, i) => {
        const free = clamp(i - outFrom + 1.5, 0, 3) / 3;
        b.rotation.z = (Math.sin(t * (2.2 + mood * 5) + i * 0.85) * (0.07 + mood * 0.22) + look * 0.12) * free;
        b.rotation.x = Math.sin(t * 1.6 + i * 0.6) * 0.06 * free;
      });
      body.scale.set(1 + squash * 0.15, 1 - squash * 0.12, 1 + squash * 0.15);
    },
  };
  api.update(0);
  return api;
}
