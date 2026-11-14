// ---------- intro cinematic (Three.js, low-res PS1-style) ----------
const PMAX = 520, PR = 6;
const INTRO_CAM = [
  { t: 0,    p: [-18, 3, 24],   l: [0, 6, 0] },
  { t: 2.5,  p: [-18, 3, 24],   l: [0, 8, 0] },
  { t: 4.5,  p: [-18, 4, 24],   l: [0, 40, 0] },
  { t: 8,    p: [-50, 45, 85],  l: [0, 130, 0] },
  { t: 12,   p: [-70, 120, 130], l: [0, 300, 0] },
  { t: 14.5, p: [0, 2.4, 22],   l: [0, 3.5, 6.2] },
  { t: 16,   p: [0, 2.4, 15],   l: [0, 3.5, 6.2] }
];
const CAPS = [[0.3, 'A: Did you hear that?'], [1.5, 'B: Hear what?'], [2.0, 'A: Something stirred beneath the crypt...'], [2.6, 'The Spire rose from the earth.'],
  [6, 'Something rose from the dirt.'], [9, 'It did not stop climbing.'], [12.4, 'The sky went dark.'], [14.2, 'The entrance awaits.']];
let intro = null;
// one WebGL renderer on the cutscene canvas, shared by the intro and the ending
let r3 = null;
function getRenderer3() {
  if (!r3) { r3 = new THREE.WebGLRenderer({ canvas: introCanvas, antialias: false }); r3.setPixelRatio(1); r3.setSize(320, 180, false); }
  return r3;
}

function buildIntro() {
  const renderer = getRenderer3();
  const scene = new THREE.Scene();
  const SKY = 0x8f9fc4;            // dusk blue, darkens to storm as the Spire rises
  // photo tiles from assets.js on the intro models (pixel-crisp, repeating); plain colours if assets.js is missing
  const tileTex = (name, rx, ry) => {
    if (!window.TILES || !TILES[name]) return null;
    const tx = new THREE.TextureLoader().load(TILES[name]);
    tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter;
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry);
    return tx;
  };
  const texMat = (name, rx, ry, col, fb) => { const map = tileTex(name, rx, ry); return new THREE.MeshLambertMaterial(map ? { map, color: col } : { color: fb, flatShading: true }); };
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 150, 480);
  const cam = new THREE.PerspectiveCamera(55, 320 / 180, 0.5, 1200);
  const ambient = new THREE.AmbientLight(0xb8c0e0, 0.6);
  scene.add(ambient);
  scene.add(new THREE.HemisphereLight(0x9fb0ff, 0x3a2a18, 0.35));           // cool sky above, earthy bounce below
  const sun = new THREE.DirectionalLight(0xffb070, 1.0);                       // low, warm sunset light raking the tower
  sun.position.set(-90, 45, 70); scene.add(sun);
  const torches = [-3.6, 3.6].map(x => {                                       // flickering torches either side of the door
    const l = new THREE.PointLight(0xff8a2a, 2.2, 22, 2); l.position.set(x, 6.2, 1.6);   // added to the door group below, so they rise with it
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
    flame.position.copy(l.position); l.userData.flame = flame; return l;
  });

  // rolling low-poly ground, flat near the tower
  const gGeo = new THREE.PlaneGeometry(900, 900, 70, 70);
  gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const amp = Math.min(1, Math.max(0, (Math.hypot(x, z) - 14) / 25));
    gp.setY(i, (Math.sin(x * 0.05) * 2.2 + Math.cos(z * 0.06) * 2.6 + Math.sin((x + z) * 0.13) * 1.4) * amp);
  }
  gGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(gGeo, texMat('cobbles', 160, 160, 0xa8bc84, 0x607f40)));   // mossy tinted cobbles

  // the Spire
  const pillar = new THREE.Group(); scene.add(pillar);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 1, 8, 1, true),
    texMat('stone_blocks', 8, 1, 0xd8cbb0, 0xc2b48f));    // repeat.y follows the height as it rises (see the scale.y update)
  shaft.position.y = 0.5; shaft.visible = false; pillar.add(shaft);
  const bandMat = texMat('stone_arches', 8, 0.4, 0x9a8a70, 0x6e5a40);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffa040 });     // lit windows glow in the dusk
  const winGeo = new THREE.BoxGeometry(1.6, 3, 0.5);
  const bands = [];
  for (let y = 24; y < PMAX; y += 24) {
    const g = new THREE.Group(); g.position.y = y; g.userData.y = y;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(PR + 0.3, PR + 0.3, 1.6, 8), bandMat));
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      const w = new THREE.Mesh(winGeo, winMat);
      w.position.set(Math.cos(a) * (PR + 0.35), 0, Math.sin(a) * (PR + 0.35));
      w.rotation.y = -a;
      g.add(w);
    }
    pillar.add(g); bands.push(g);
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0, PR * 1.2, 44, 8),
    texMat('rust', 4, 6, 0xb08060, 0x8a6a3a));
  spire.visible = false; scene.add(spire);

  // entrance door on the +z face
  const door = new THREE.Group(); door.position.set(0, 0, PR); scene.add(door);
  for (const l of torches) door.add(l, l.userData.flame);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 8.4, 0.3), texMat('stone_blocks', 1.4, 2, 0xb0a080, 0xc9a227));
  frame.position.set(0, 4.2, 0.1); door.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 7.5, 0.5), texMat('wood_door', 1, 1, 0xffffff, 0x3a2412));
  panel.position.set(0, 3.75, 0.45); door.add(panel);
  const step = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 4), texMat('flagstone', 2.5, 1, 0xc0b8a8, 0x9a9080));
  step.position.set(0, 0.4, 2.5); door.add(step);

  // clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(rnd(20, 40), rnd(6, 10), rnd(14, 26)), cloudMat);
      b.position.set(rnd(-14, 14), rnd(-3, 3), rnd(-10, 10));
      g.add(b);
    }
    g.position.set(rnd(-200, 200), rnd(110, 230), rnd(-200, 200));
    scene.add(g);
  }

  // rubble pool
  const debGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const debMat = texMat('stone_blocks', 0.5, 0.5, 0xc8b898, 0xb3a27f);
  const debris = [];
  for (let i = 0; i < 140; i++) {
    const m = new THREE.Mesh(debGeo, debMat); m.visible = false; scene.add(m);
    debris.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), alive: false });
  }

  // ---- NPCs: blocky placeholder figures (swap for real models later) ----
  const cloth = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const makeHuman = (clothColor, x, z) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.7), cloth(clothColor)); body.position.y = 2.3; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), cloth(0xd9b38c)); head.position.y = 3.6; g.add(head);
    const legMat = cloth(0x3a3a4a);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), legMat); legL.position.set(-0.3, 0.65, 0); g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), legMat); legR.position.set(0.3, 0.65, 0); g.add(legR);
    const mkArm = sx => {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.8, 2.9, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), cloth(clothColor));
      arm.position.y = -0.65; pivot.add(arm); g.add(pivot); return pivot;
    };
    const armL = mkArm(-1), armR = mkArm(1);
    scene.add(g);
    return { g, head, armL, armR };
  };
  const npcA = makeHuman(0x7a4a2a, -8, 8);   // talks, then gets flung
  const npcB = makeHuman(0x2f5a7a, 6, 6);    // listens, then gets flung
  npcA.vel = new THREE.Vector3(); npcA.landed = false; npcA.launched = false; npcA.spin = 0;
  npcB.vel = new THREE.Vector3(); npcB.landed = false; npcB.launched = false; npcB.spin = 0;

  // ---- skeletons rising from the dirt ----
  const boneMat = cloth(0xd8d2bd), ribMat = cloth(0x9a947e), darkMat = cloth(0x1a1a1a);
  const makeSkeleton = (x, z, startT) => {
    const g = new THREE.Group();
    g.position.set(x, -4, z); g.scale.setScalar(1.3);
    const part = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); g.add(m); };
    part(new THREE.BoxGeometry(0.7, 0.7, 0.7), boneMat, 0, 4.2, 0);
    part(new THREE.BoxGeometry(0.16, 0.16, 0.05), darkMat, -0.17, 4.25, 0.37);
    part(new THREE.BoxGeometry(0.16, 0.16, 0.05), darkMat, 0.17, 4.25, 0.37);
    part(new THREE.BoxGeometry(1.0, 1.4, 0.5), ribMat, 0, 2.9, 0);
    part(new THREE.BoxGeometry(0.8, 0.5, 0.4), boneMat, 0, 1.9, 0);
    part(new THREE.BoxGeometry(0.22, 1.5, 0.22), boneMat, -0.25, 0.75, 0);
    part(new THREE.BoxGeometry(0.22, 1.5, 0.22), boneMat, 0.25, 0.75, 0);
    part(new THREE.BoxGeometry(0.2, 1.4, 0.2), boneMat, -0.7, 2.9, 0);
    part(new THREE.BoxGeometry(0.2, 1.4, 0.2), boneMat, 0.7, 2.9, 0);
    scene.add(g);
    return { g, x, z, startT, dirt: false };
  };
  const skeletons = [makeSkeleton(-22, 16, 6.0), makeSkeleton(-13, 24, 6.5), makeSkeleton(14, 22, 7.0),
    makeSkeleton(24, 10, 7.4), makeSkeleton(-3, 30, 7.9)];

  // ---- a bird wheeling through the clouds ----
  const birdMat = cloth(0x1d1a18);
  const bird = new THREE.Group(); bird.scale.setScalar(1.6); bird.rotation.y = Math.PI / 2; scene.add(bird);
  bird.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 1.6), birdMat));
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  const wlMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.0), birdMat); wlMesh.position.x = -1.6; wingL.add(wlMesh);
  const wrMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.0), birdMat); wrMesh.position.x = 1.6; wingR.add(wrMesh);
  bird.add(wingL); bird.add(wingR);

  // ---- lightning: one jagged bolt line, reshaped for each strike ----
  const bolt = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe8eeff }));
  bolt.visible = false; scene.add(bolt);

  intro = { renderer, scene, cam, t: 0, shaft, bands, spire, debris, nextDebris: 0, door,
    ambient, sun, torches, npcA, npcB, skeletons, bird, wingL, wingR, bolt,
    strikes: [9.6, 12.4, 13.1], strikeIdx: 0, boltT: 0, flashT: 0,
    SKY_COL: new THREE.Color(SKY), DARK_COL: new THREE.Color(0x202233), FLASH_COL: new THREE.Color(0xdfe7ff) };
  return intro;
}

function spawnDebris(ox = 0, oz = 0) {
  const I = intro;
  const d = I.debris[I.nextDebris++ % I.debris.length];
  const a = rnd(0, Math.PI * 2), r = rnd(0, PR * 0.9);
  d.m.position.set(Math.cos(a) * r + ox, 1, Math.sin(a) * r + oz);
  d.v.set(rnd(-14, 14), rnd(18, 38), rnd(-14, 14));
  d.spin.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8));
  d.m.visible = true; d.alive = true;
}
function sampleCam(t, CAM = INTRO_CAM) {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1].t) i++;
  const a = CAM[i], b = CAM[i + 1];
  let u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  u = u * u * (3 - 2 * u);
  return { p: a.p.map((v, k) => v + (b.p[k] - v) * u), l: a.l.map((v, k) => v + (b.l[k] - v) * u) };
}
let capIdx = 0;
function stepIntro(dt) {
  const I = intro, t = (I.t += dt);
  let h = 0;
  if (t > 2.5) h = (1 - Math.pow(1 - Math.min(1, (t - 2.5) / 2.2), 3)) * 60 + Math.max(0, t - 4.7) * 42;
  h = Math.min(h, PMAX);
  // the whole tower (door included) starts 10 units underground and rises out of the dirt
  const rise = Math.min(1, Math.max(0, (t - 2.5) / 2.2));
  const base = -10 * Math.pow(1 - rise, 3);
  I.door.position.y = base;
  I.shaft.visible = h - base > 0.1;
  I.shaft.position.y = (h + base) / 2;
  I.shaft.scale.y = Math.max(h - base, 0.01);
  if (I.shaft.material.map) I.shaft.material.map.repeat.y = I.shaft.scale.y / 4.7;   // keep the blocks square as it grows
  for (const b of I.bands) { b.position.y = base + b.userData.y; b.visible = base + b.userData.y < h; }
  I.spire.visible = h > 1;
  I.spire.position.set(0, h + 22, 0);

  if (t > 2.5 && t < 4.6) for (let k = 0; k < 3; k++) spawnDebris();
  for (const d of I.debris) {
    if (!d.alive) continue;
    d.v.y -= 38 * dt;
    d.m.position.addScaledVector(d.v, dt);
    d.m.rotation.x += d.spin.x * dt; d.m.rotation.z += d.spin.z * dt;
    if (d.m.position.y < 0.6) {
      d.m.position.y = 0.6; d.v.y *= -0.35; d.v.x *= 0.6; d.v.z *= 0.6;
      if (Math.abs(d.v.y) < 1.5) { d.v.set(0, 0, 0); d.alive = false; d.m.rotation.set(rnd(0, 6), rnd(0, 6), 0); }
    }
  }

  const easeOutN = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  // the two NPCs: talking at the door, then the eruption flings them away
  const A = I.npcA, B = I.npcB;
  const LAUNCH = 2.6;
  if (t < LAUNCH) {
    A.armR.rotation.x = -0.9 + Math.sin(t * 5) * 0.4;     // A gestures while talking
    A.head.rotation.y = Math.sin(t * 1.3) * 0.2;
    B.head.rotation.y = Math.sin(t * 2.1) * 0.25;         // B listens and shakes its head
    A.g.position.y = 0.05 * Math.max(0, Math.sin(t * 5));
  }
  // both throw their arms up as the ground breaks
  const raise = t > 2.0 ? (t < 3.0 ? easeOutN((t - 2.0) / 0.25) : 1 - easeOutN((t - 3.0) / 0.5)) : 0;
  A.armL.rotation.x = -2.6 * raise;
  A.armR.rotation.x = -2.6 * raise;
  B.armL.rotation.x = -2.6 * raise;
  B.armR.rotation.x = -2.6 * raise;

  for (const N of [A, B]) {
    if (t < LAUNCH || N.landed) continue;
    if (!N.launched) {
      N.launched = true;
      const ox = N.g.position.x, oz = N.g.position.z, dd = Math.hypot(ox, oz) || 1;
      N.vel.set(ox / dd * 16 + rnd(-2, 2), 22, oz / dd * 16);   // thrown outward from the tower
      N.spin = rnd(4, 7) * (Math.random() < 0.5 ? -1 : 1);
    }
    N.vel.y -= 32 * dt;
    N.g.position.addScaledVector(N.vel, dt);
    N.g.rotation.z += N.spin * dt;
    if (N.g.position.y <= 0 && N.vel.y < 0) {
      N.landed = true; N.vel.set(0, 0, 0);
      N.g.position.y = 0.4;
      N.g.rotation.z = N.spin > 0 ? Math.PI / 2 : -Math.PI / 2;   // lies where it fell
    }
  }

  // skeletons burst out of the ground
  for (const s of I.skeletons) {
    if (t >= s.startT && !s.dirt) { s.dirt = true; for (let k = 0; k < 8; k++) spawnDebris(s.x, s.z); }
    s.g.position.y = -4 + 4 * easeOutN((t - s.startT) / 1.4);
  }

  // bird gliding past with a steady flap
  I.bird.position.set(-100 + t * 12, 62 + Math.sin(t * 0.7) * 2, -8);
  const flap = Math.sin(t * 9) * 0.6;
  I.wingL.rotation.z = flap;
  I.wingR.rotation.z = -flap;

  // lightning strikes behind the spire
  while (I.strikeIdx < I.strikes.length && t >= I.strikes[I.strikeIdx]) {
    I.strikeIdx++;
    const pts = [];
    let x = rnd(-40, 40), z = rnd(-70, -30);
    for (let k = 0; k <= 14; k++) { pts.push(x, 190 - k * 13.5, z); x += rnd(-6, 6); z += rnd(-4, 4); }
    I.bolt.geometry.dispose();
    I.bolt.geometry = new THREE.BufferGeometry();
    I.bolt.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    I.bolt.visible = true; I.boltT = 0.14; I.flashT = 0.12;
  }
  I.boltT -= dt; if (I.boltT <= 0) I.bolt.visible = false;
  I.flashT -= dt;

  // the sky darkens over time; lightning briefly floods it
  const dk = Math.min(1, Math.max(0, (t - 5) / 7));
  I.ambient.intensity = 0.6 - 0.4 * dk + (I.flashT > 0 ? 1.2 : 0);
  I.sun.intensity = 1.0 - 0.75 * dk;                                   // the sunset fades under the storm
  for (const l of I.torches) {                                         // torches flicker and matter more as it darkens
    const f = 0.8 + 0.2 * Math.sin(t * 23 + l.position.x) + rnd(-0.12, 0.12);
    l.intensity = (2.0 + 1.6 * dk) * f; l.userData.flame.scale.y = 0.7 + 0.5 * f;
  }
  const skyNow = I.flashT > 0 ? I.FLASH_COL : I.SKY_COL.clone().lerp(I.DARK_COL, dk);
  I.scene.background.copy(skyNow);
  I.scene.fog.color.copy(skyNow);

  const c = sampleCam(t);
  // the ground shakes just before the eruption
  const shake = t > 2.0 && t < 3.0 ? (3.0 - t) * 0.6 : 0;
  I.cam.position.set(c.p[0] + rnd(-shake, shake), c.p[1] + rnd(-shake, shake), c.p[2] + rnd(-shake, shake));
  I.cam.lookAt(c.l[0], c.l[1], c.l[2]);

  while (capIdx < CAPS.length && t >= CAPS[capIdx][0]) { capEl.textContent = CAPS[capIdx][1]; capIdx++; }
  flashEl.style.opacity = Math.min(1, Math.max(0, (t - 15.2) / 0.8));
  I.renderer.render(I.scene, I.cam);
  if (t >= 16) endIntro();
}
function startIntro() {
  overlay.style.display = 'none';
  if (typeof THREE === 'undefined') { resetGame(); return; }
  if (!intro) buildIntro();
  intro.t = 0; capIdx = 0;
  introActive = true; introStartedAt = performance.now(); document.body.classList.add('intro');
  canvas.style.visibility = 'hidden';
  introCanvas.classList.add('on');
  capEl.style.display = 'block'; capEl.textContent = '';
  flashEl.style.transition = 'none'; flashEl.style.opacity = 0;
}
function endIntro() {
  if (!introActive) return;
  introActive = false; document.body.classList.remove('intro');
  introCanvas.classList.remove('on');
  capEl.style.display = 'none';
  canvas.style.visibility = 'visible';
  flashEl.style.transition = 'opacity .7s';
  flashEl.style.opacity = 1;
  setTimeout(() => { flashEl.style.opacity = 0; }, 60);
  resetGame();
}

