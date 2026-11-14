// ---------- ending cinematic (Three.js, same low-res look as the intro) ----------
// The Spire's tip has broken through the ground of the other world. Out of the last door (first person), a look up
// at the two moons, then a wide shot from behind the tip with SPIRE CONQUERED and the credit roll.
const END_LEN = 32, TR = 9, DOOR_Z = TR * 0.924, HERO_Z = DOOR_Z + 16;
const END_CAM = [
  { t: 0,    p: [0, 2.4, -7],            l: [0, 2.5, 40] },      // the dark passage behind the Titan's hall
  { t: 4.2,  p: [0, 2.4, DOOR_Z - 0.5],  l: [0, 2.8, 60] },      // the threshold
  { t: 6.2,  p: [0, 2.4, DOOR_Z + 8],    l: [0, 4, 80] },        // out onto the dust
  { t: 10,   p: [0, 2.5, HERO_Z],        l: [-3, 24, 80] },      // head back: the moons
  { t: 10.01, p: [-7, 3.4, DOOR_Z + 2],  l: [0, 7, 70] },        // cut: over the shoulder
  { t: 16,   p: [-36, 20, -26],          l: [0, 13, 60] },       // pull back behind the Spire's tip
  { t: 32,   p: [-48, 28, -40],          l: [0, 16, 60] }
];
const END_CAPS = [[0.4, 'The Spire Titan is dead.'], [2.4, 'One last door.'], [4.6, ''], [6.4, 'Red dust. Thin air. Two moons.'],
  [10.4, 'A hundred floors below, the crypt is quiet.'], [13.2, 'You climbed out of one world... and into another.'], [16, '']];
const END_CREDITS = k => `The climb is over<br>100 floors · ${k} slain
  <b>Creatures, weapons and sound</b>Freedoom · Blasphemer
  <b>Fist</b>Ragnar Random · OpenGameArt
  <b>3D scenes</b>three.js
  <b>The Spire</b>10 zones · 27 kinds of horror · 1 survivor
  <br><br>Thanks for playing<br><br>`;
let ending = null, endStartedAt = 0;
const canSkipEnding = () => endActive && performance.now() - endStartedAt > 2500;   // long guard: fire is usually still held when the Titan drops

function buildEnding() {
  const renderer = getRenderer3();
  const scene = new THREE.Scene();
  let seed = 11; const rr = (a, b) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a);   // fixed layout every time
  const tex = (name, rx, ry) => {
    if (typeof TILES === 'undefined' || !TILES[name]) return null;
    const tx = new THREE.TextureLoader().load(TILES[name]);
    tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry);
    return tx;
  };
  const lit = (name, rx, ry, col, fb) => { const map = tex(name, rx, ry); return new THREE.MeshLambertMaterial(map ? { map, color: col } : { color: fb }); };
  const flat = (name, rx, ry, col, fb, side) => { const map = tex(name, rx, ry); return new THREE.MeshBasicMaterial(map ? { map, color: col, side } : { color: fb, side }); };
  const HAZE = 0xc8683c;
  scene.fog = new THREE.Fog(HAZE, 90, 620);
  const cam = new THREE.PerspectiveCamera(55, 320 / 180, 0.3, 2400);
  scene.add(new THREE.AmbientLight(0xff9a88, 0.5));
  scene.add(new THREE.HemisphereLight(0xff8060, 0x401810, 0.35));
  const sun = new THREE.DirectionalLight(0xffd0a0, 1.0); sun.position.set(90, 50, 120); scene.add(sun);   // low sun ahead-right: the tip is a silhouette in the wide shot

  // sky dome: maroon zenith down to a dusty orange horizon, with stars
  const sc = mk(512, 256), g = sc.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  [[0, '#12030c'], [0.22, '#3a0a14'], [0.4, '#8a2a20'], [0.5, '#c8683c'], [1, '#c8683c']].forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 420; i++) { const y = rr(0, 100); g.fillStyle = `rgba(255,240,225,${rr(0.3, 1) * (1 - y / 110)})`; g.fillRect(rr(0, 512) | 0, y | 0, 1, 1); }
  const skyTx = new THREE.CanvasTexture(sc); skyTx.magFilter = THREE.NearestFilter;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 24, 16), new THREE.MeshBasicMaterial({ map: skyTx, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);
  // two moons (lit by the sun, so they show a phase) and a ringed giant low on the horizon
  const body = (r, col, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshLambertMaterial({ color: col, emissive: new THREE.Color(col).multiplyScalar(0.45), fog: false })); m.position.set(x, y, z); scene.add(m); return m; };
  const moonA = body(120, 0xf2dcc0, 60, 520, 1500), moonB = body(42, 0xc0dcf8, -330, 360, 1500);
  const giant = body(330, 0xd09060, -980, 150, 1400);
  const ring = new THREE.Mesh(new THREE.RingGeometry(430, 620, 28), new THREE.MeshBasicMaterial({ color: 0xf0c890, side: THREE.DoubleSide, fog: false, transparent: true, opacity: 0.55 }));
  ring.position.copy(giant.position); ring.rotation.set(1.35, 0.25, 0); scene.add(ring);

  // red dunes, flat round the Spire
  const gGeo = new THREE.PlaneGeometry(1600, 1600, 80, 80); gGeo.rotateX(-Math.PI / 2);
  const gp = gGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), d = Math.hypot(x, z), k = Math.min(1, Math.max(0, (d - 45) / 120));
    gp.setY(i, k * (Math.sin(x * 0.021 + 1) * 9 + Math.cos(z * 0.017) * 11 + Math.sin((x + z) * 0.05) * 3 + rr(-1, 1)));
  }
  gGeo.computeVertexNormals();
  const groundM = lit('red_ground', 130, 130, 0xffc8b0, 0x8a3a22); groundM.emissive = new THREE.Color(0x3a140c);
  if (groundM.map) groundM.map.minFilter = THREE.NearestMipmapLinearFilter;   // far dunes would sparkle without mipmaps
  scene.add(new THREE.Mesh(gGeo, groundM));
  // rock needles
  const rockMat = lit('red_rock', 2, 3, 0xd8b0a0, 0x7a2a1a);
  for (let i = 0; i < 46; i++) {
    const a = rr(0, 6.283), d = rr(50, 520), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) < 26 && z > 0 && z < 220) continue;                 // keep the walk out of the door clear
    const h = rr(8, 40) * (0.6 + d / 400), m = new THREE.Mesh(new THREE.CylinderGeometry(rr(0, 1), rr(2.5, 7), h, 5), rockMat);
    m.position.set(x, h / 2 - 3, z); m.rotation.set(rr(-0.15, 0.15), rr(0, 3), rr(-0.15, 0.15)); scene.add(m);
  }

  // the Spire's tip: an 8-sided drum turned so one flat face (the door) looks down +z, a crown and a point
  const tip = new THREE.Group(); tip.rotation.y = Math.PI / 8; scene.add(tip);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR * 1.08, 16, 8, 1, true), lit('red_relief', 8, 2.5, 0xc8a898, 0x6a2a20)); drum.position.y = 8; tip.add(drum);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(TR + 1.2, TR + 0.4, 2, 8), lit('red_rock', 8, 0.5, 0x9a7a70, 0x4a1a14)); crown.position.y = 16.6; tip.add(crown);
  const point = new THREE.Mesh(new THREE.CylinderGeometry(0, TR * 1.05, 26, 8), lit('red_rock', 6, 4, 0xb89080, 0x5a2018)); point.position.y = 30.5; tip.add(point);
  // rubble thrown up where it broke through
  for (let i = 0; i < 26; i++) {
    const a = rr(0, 6.283), d = TR + rr(0.5, 7), sz = rr(0.6, 2.6), x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (Math.abs(x) < 3.6 && z > 0) continue;
    const m = new THREE.Mesh(new THREE.BoxGeometry(sz, sz * rr(0.5, 1), sz), rockMat); m.position.set(x, sz * 0.2, z); m.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3)); scene.add(m);
  }
  // the passage out: a box seen from inside, its far end open on the doorway
  const wallM = flat('red_rock', 5, 2, 0x5a3a36, 0x2a1210, THREE.BackSide), floorM = flat('red_ground', 2, 8, 0x5a4038, 0x2a1210, THREE.BackSide);
  const none = new THREE.MeshBasicMaterial({ visible: false });
  const PL = DOOR_Z + 10;
  const pass = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6.6, PL), [wallM, wallM, flat('red_rock', 1.5, 5, 0x3a2422, 0x1a0a08, THREE.BackSide), floorM, none, flat('red_relief', 1, 1.5, 0x4a302c, 0x1a0a08, THREE.BackSide)]);
  pass.position.set(0, 3.3, DOOR_Z - PL / 2); scene.add(pass);
  // door frame and the two leaves thrown open
  const frameM = lit('red_rock', 1, 2, 0x8a6a60, 0x3a1612), leafM = lit('iron_door', 0.5, 1, 0xd0c0b8, 0x30282a);
  for (const sx of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.6, 0.9), frameM); jamb.position.set(sx * 2.55, 3.8, DOOR_Z + 0.2); scene.add(jamb);
    const hinge = new THREE.Group(); hinge.position.set(sx * 2.1, 0, DOOR_Z + 0.6); hinge.rotation.y = sx * 1.9; scene.add(hinge);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.1, 6.6, 0.25), leafM); leaf.position.set(-sx * 1.05, 3.3, 0); hinge.add(leaf);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.0, 0.9), frameM); lintel.position.set(0, 7.1, DOOR_Z + 0.2); scene.add(lintel);

  // the climber (only in the wide shot)
  const cloth = c => new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(0.4) });
  const hero = new THREE.Group(); hero.position.set(0, 0, HERO_Z);  scene.add(hero);
  const part = (w, h, d, c, x, y, z, to) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cloth(c)); m.position.set(x, y, z); (to || hero).add(m); return m; };
  part(1.2, 1.8, 0.7, 0x7a8a9a, 0, 2.3, 0); part(0.9, 0.9, 0.9, 0xc8a080, 0, 3.6, 0); part(0.95, 0.35, 0.95, 0x2a2018, 0, 4.0, 0);
  part(0.42, 1.4, 0.42, 0x2a2630, -0.3, 0.7, 0); part(0.42, 1.4, 0.42, 0x2a2630, 0.3, 0.7, 0);
  part(0.35, 1.4, 0.35, 0x7a8a9a, -0.8, 2.4, 0);
  const armR = new THREE.Group(); armR.position.set(0.8, 3.0, 0); hero.add(armR);
  part(0.35, 1.3, 0.35, 0x7a8a9a, 0, -0.6, 0, armR); part(0.4, 0.4, 0.4, 0xc8a080, 0, -1.35, 0, armR);

  // dust on the wind
  const dustGeo = new THREE.BufferGeometry(), dn = 140, dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) { dp[i * 3] = rr(-90, 90); dp[i * 3 + 1] = rr(0.3, 26); dp[i * 3 + 2] = rr(-60, 140); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffc8a0, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
  scene.add(dust);

  ending = { renderer, scene, cam, t: 0, hero, armR, dust, moonA, moonB, sky, capIdx: 0 };
  return ending;
}
function startEnding() {
  setMusic('win');
  if (!ending) buildEnding();
  const E = ending; E.t = 0; E.capIdx = 0;
  running = false; endActive = true; endStartedAt = performance.now(); document.body.classList.add('intro');
  overlay.style.display = 'none'; canvas.style.visibility = 'hidden'; introCanvas.classList.add('on');
  capEl.style.display = 'block'; capEl.textContent = '';
  $('endin').innerHTML = END_CREDITS(kills);
  $('endtitle').style.display = $('endroll').style.display = 'block'; $('endtitle').style.opacity = 0;
  flashEl.style.transition = 'none'; flashEl.style.opacity = 1;      // fade in from the white of the Titan's death
  stepEnding(0);
}
function stepEnding(dt) {
  const E = ending, t = (E.t += dt);
  const c = sampleCam(t, END_CAM), bob = t < 9 ? Math.abs(Math.sin(t * 4.2)) * 0.09 * Math.min(1, (9 - t) / 2) : 0;   // footsteps while walking
  E.cam.position.set(c.p[0], c.p[1] + bob, c.p[2]);
  E.cam.lookAt(c.l[0], c.l[1], c.l[2]);
  E.sky.position.copy(E.cam.position);
  E.hero.visible = t > 10;
  E.armR.rotation.x = -2.9 * Math.min(1, Math.max(0, (t - 13.4) / 0.6));           // fist in the air
  const dp = E.dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) { let x = dp.getX(i) + dt * (5 + (i % 5)); if (x > 90) x -= 180; dp.setX(i, x); }
  dp.needsUpdate = true;
  while (E.capIdx < END_CAPS.length && t >= END_CAPS[E.capIdx][0]) capEl.textContent = END_CAPS[E.capIdx++][1];
  // white: in from the kill, a glare crossing the threshold, out to the menu
  const glare = Math.max(0, 1 - Math.abs(t - 4.5) / 0.7) * 0.85;
  flashEl.style.opacity = Math.max(1 - t / 1.2, glare, (t - (END_LEN - 1)) / 1);
  $('endtitle').style.opacity = t > 15.5 ? 1 : 0;
  const roll = $('endroll'), inner = $('endin'), u = Math.min(1, Math.max(0, (t - 17) / (END_LEN - 18)));
  inner.style.transform = `translateY(${roll.clientHeight - u * (roll.clientHeight + inner.offsetHeight)}px)`;
  E.renderer.render(E.scene, E.cam);
  if (t >= END_LEN) finishEnding();
}
function finishEnding() {
  if (!endActive) return;
  endActive = false; document.body.classList.remove('intro');
  introCanvas.classList.remove('on'); capEl.style.display = 'none';
  $('endtitle').style.display = $('endroll').style.display = 'none';
  canvas.style.visibility = 'visible';
  flashEl.style.transition = 'opacity .7s'; flashEl.style.opacity = 0;
  victoryMenu();
}

