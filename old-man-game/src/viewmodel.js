// First-person hands and the Winchester. Leather work gloves, a coat cuff, a lever gun.
// Lives on the camera. Bob, breath, and a little sway when the rifle is shouldered.
import * as THREE from "three";

function canvasTex(draw, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const leatherTex = () => canvasTex((g, w, h) => {
  g.fillStyle = "#4a3424";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = Math.random() > 0.5 ? "rgba(20,12,8,0.35)" : "rgba(120,90,60,0.25)";
    g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 1);
  }
  g.strokeStyle = "rgba(18,10,6,0.55)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(8, h * 0.35); g.lineTo(w - 8, h * 0.38);
  g.moveTo(w * 0.2, 6); g.lineTo(w * 0.22, h - 6);
  g.stroke();
}, 128, 128);

const woodTex = () => canvasTex((g, w, h) => {
  g.fillStyle = "#7a4e2c";
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    g.strokeStyle = y % 2 ? "rgba(60,30,14,0.45)" : "rgba(140,90,50,0.35)";
    g.lineWidth = 1.2;
    g.beginPath();
    let x = 0;
    g.moveTo(0, y);
    while (x < w) {
      x += 8;
      g.lineTo(x, y + Math.sin(x * 0.08 + y) * 1.4);
    }
    g.stroke();
  }
}, 128, 64);

const leather = () => new THREE.MeshStandardMaterial({ map: leatherTex(), color: 0xffffff, roughness: 0.72, metalness: 0.04 });
const wool = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x3c342c, THREE.SRGBColorSpace), roughness: 0.94, metalness: 0 });
const wood = () => new THREE.MeshStandardMaterial({ map: woodTex(), color: 0xffffff, roughness: 0.45, metalness: 0.05 });
const steel = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0xa8adb4, THREE.SRGBColorSpace), roughness: 0.28, metalness: 0.85 });
const brass = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0xb08a48, THREE.SRGBColorSpace), roughness: 0.38, metalness: 0.72 });

function lathe(pairs, segs = 16) {
  return new THREE.LatheGeometry(pairs.map(([r, y]) => new THREE.Vector2(Math.max(0.0015, r), y)), segs);
}

function glove(side = 1, curl = 0.85) {
  const g = new THREE.Group();
  const m = leather(), cuffM = wool(), seam = leather();
  seam.color = new THREE.Color().setHex(0x2a1c12, THREE.SRGBColorSpace);
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.05, 6, 12), m);
  palm.rotation.z = Math.PI / 2;
  palm.scale.set(1.2, 0.78, 0.7);
  g.add(palm);
  // knuckle ridge — one rounded bar, then each finger stands clear of it
  const ridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.07, 4, 8), m);
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, 0.02, 0.02);
  g.add(ridge);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set(-0.034 + i * 0.022, 0.012, 0.028);
    const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.032, 4, 8), m);
    prox.rotation.x = 0.55 * curl;
    prox.position.set(0, -0.004, 0.02);
    f.add(prox);
    const tipP = new THREE.Group();
    tipP.position.set(0, -0.012 * curl, 0.034);
    tipP.rotation.x = 0.85 * curl;
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.022, 3, 8), m);
    tip.position.set(0, -0.006, 0.012);
    tipP.add(tip);
    f.add(tipP);
    const stitch = new THREE.Mesh(new THREE.CapsuleGeometry(0.0022, 0.03, 2, 5), seam);
    stitch.rotation.x = 0.5 * curl;
    stitch.position.set(0.01, 0.002, 0.018);
    f.add(stitch);
    g.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.036, 4, 8), m);
  th.position.set(side * 0.042, -0.004, 0.018);
  th.rotation.set(0.55 * curl, 0, side * 1.05);
  g.add(th);
  const wrist = new THREE.Mesh(lathe([[0.03, 0], [0.034, 0.03], [0.032, 0.07]], 14), m);
  wrist.position.set(0, -0.09, -0.008);
  g.add(wrist);
  // coat sleeve: wider than the wrist, flared hem
  const cuff = new THREE.Mesh(lathe([[0.04, 0], [0.046, 0.03], [0.054, 0.08], [0.058, 0.1]], 16), cuffM);
  cuff.position.set(0, -0.16, -0.012);
  g.add(cuff);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.006, 6, 14), cuffM);
  hem.rotation.x = Math.PI / 2;
  hem.position.set(0, -0.2, -0.012);
  g.add(hem);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return g;
}

function winchester() {
  const g = new THREE.Group();
  const w = wood(), s = steel(), b = brass();
  // barrel and magazine tube are separate rods, with daylight between them
  const barrel = new THREE.Mesh(lathe([[0.0092, 0], [0.0086, 0.22], [0.0076, 0.5]], 14), s);
  barrel.rotation.x = -Math.PI / 2;
  barrel.position.set(0, 0.034, -0.02);
  const tube = new THREE.Mesh(lathe([[0.0064, 0], [0.0064, 0.36], [0.0072, 0.4]], 12), s);
  tube.rotation.x = -Math.PI / 2;
  tube.position.set(0, 0.0, -0.02);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 12), b);
  band.rotation.y = Math.PI / 2;
  band.position.set(0, 0.018, -0.34);
  const fore = new THREE.Mesh(lathe([[0.01, 0], [0.02, 0.03], [0.022, 0.1], [0.018, 0.2], [0.012, 0.24]], 16), w);
  fore.rotation.x = -Math.PI / 2;
  fore.scale.set(0.85, 1, 1.15);
  fore.position.set(0, 0.004, -0.05);
  const recv = new THREE.Mesh(lathe([[0.012, 0], [0.024, 0.02], [0.026, 0.07], [0.022, 0.12], [0.014, 0.145]], 18), s);
  recv.rotation.x = Math.PI / 2;
  recv.scale.set(0.7, 1, 1.2);
  recv.position.set(0, 0.004, 0.0);
  // lever loop under the action — the whole loop, not a flat tab
  const lever = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0042, 8, 20, Math.PI * 1.65), b);
  lever.rotation.y = Math.PI / 2;
  lever.rotation.z = Math.PI * 0.92;
  lever.position.set(0, -0.02, 0.055);
  const trigger = new THREE.Mesh(new THREE.CapsuleGeometry(0.003, 0.02, 3, 6), s);
  trigger.position.set(0, -0.012, 0.04);
  trigger.rotation.x = 0.4;
  const hammer = new THREE.Mesh(lathe([[0.003, 0], [0.007, 0.012], [0.004, 0.03]], 8), s);
  hammer.position.set(0, 0.03, 0.09);
  hammer.rotation.x = -0.8;
  // pistol grip of the wrist, then a rounded stock with comb and butt
  const grip = new THREE.Mesh(lathe([[0.012, 0], [0.018, 0.02], [0.016, 0.055], [0.012, 0.08]], 12), w);
  grip.position.set(0, -0.02, 0.09);
  grip.rotation.x = 0.7;
  grip.scale.set(0.8, 1, 1);
  const stock = new THREE.Mesh(lathe([[0.012, 0], [0.018, 0.06], [0.026, 0.16], [0.034, 0.28], [0.03, 0.34]], 18), w);
  stock.rotation.x = Math.PI / 2;
  stock.scale.set(0.62, 1.25, 1);
  stock.position.set(0, -0.012, 0.12);
  stock.rotation.z = 0;
  const comb = new THREE.Mesh(lathe([[0.008, 0], [0.014, 0.04], [0.012, 0.12], [0.006, 0.16]], 12), w);
  comb.rotation.x = Math.PI / 2;
  comb.scale.set(0.7, 1, 1);
  comb.position.set(0, 0.028, 0.2);
  const plate = new THREE.Mesh(lathe([[0.004, 0], [0.03, 0.004], [0.028, 0.012], [0.004, 0.016]], 12), b);
  plate.rotation.x = Math.PI / 2;
  plate.scale.set(0.7, 1.15, 1);
  plate.position.set(0, -0.02, 0.46);
  const scope = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.16, 4, 10), s);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.058, -0.02);
  for (const z of [-0.07, 0.04]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 12), s);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, 0.046, z);
    g.add(ring);
  }
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), b);
  bead.position.set(0, 0.038, -0.52);
  const rear = new THREE.Mesh(new THREE.CapsuleGeometry(0.003, 0.012, 3, 6), s);
  rear.rotation.z = Math.PI / 2;
  rear.position.set(0, 0.04, 0.06);
  g.add(barrel, tube, band, fore, recv, lever, trigger, hammer, grip, stock, comb, plate, scope, bead, rear);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return g;
}

export function buildViewmodel() {
  const root = new THREE.Group();
  root.visible = false;
  root.renderOrder = 20;
  root.scale.setScalar(1.65);
  const rifle = winchester();
  const right = glove(-1, 1.05);
  const left = glove(1, 0.95);
  root.add(rifle, right, left);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.renderOrder = 20;
    if (o.material) { o.material.fog = false; o.material.depthTest = true; }
  });
  // low ready: stock in the right hand, forend in the left, both in the lower third
  const ready = {
    rifle: { p: [0.08, -0.08, -0.5], r: [0.36, -0.2, 0.14] },
    right: { p: [0.16, -0.1, -0.32], r: [-0.7, 0.25, 0.45] },
    left: { p: [-0.02, -0.06, -0.58], r: [-1.05, -0.25, 0.15] },
  };
  const aim = {
    rifle: { p: [0.02, -0.05, -0.44], r: [0.05, 0.02, 0.02] },
    right: { p: [0.08, -0.07, -0.28], r: [-1.1, 0.15, 0.28] },
    left: { p: [-0.01, -0.04, -0.5], r: [-1.3, -0.12, 0.08] },
  };
  const nodes = { rifle, right, left };
  let pose = "off";
  let bob = 0;
  function apply(def, k) {
    for (const n of ["rifle", "right", "left"]) {
      const d = def[n];
      const o = nodes[n];
      o.position.x += (d.p[0] - o.position.x) * k;
      o.position.y += (d.p[1] - o.position.y) * k;
      o.position.z += (d.p[2] - o.position.z) * k;
      o.rotation.x += (d.r[0] - o.rotation.x) * k;
      o.rotation.y += (d.r[1] - o.rotation.y) * k;
      o.rotation.z += (d.r[2] - o.rotation.z) * k;
    }
  }
  apply(ready, 1);
  return {
    root,
    /** o: { show, aim, phase, speed, afraid, sway } */
    update(dt, o = {}) {
      const want = o.show ? (o.aim ? "aim" : "ready") : "off";
      root.visible = !!o.show;
      if (!o.show) { pose = "off"; return; }
      pose = want;
      const k = 1 - Math.exp(-8 * dt);
      apply(want === "aim" ? aim : ready, k);
      const moving = (o.speed || 0) > 0.2;
      bob += dt * (moving ? 7.2 : 1.3);
      const breathe = Math.sin(performance.now() / 1000 * (o.afraid ? 2.6 : 1.25));
      const step = moving ? Math.sin(o.phase != null ? o.phase * 2 : bob) : 0;
      const amp = o.aim ? 0.004 : moving ? 0.014 : 0.005;
      root.position.set(
        step * amp * 0.65 + (o.aim ? Math.sin(bob * 0.35) * 0.004 : 0) + (o.sway || 0) * 0.02,
        step * amp + breathe * (o.aim ? 0.004 : 0.008),
        moving ? Math.abs(step) * 0.006 : 0,
      );
      root.rotation.z = (o.aim ? Math.sin(bob * 0.45) * 0.012 : step * 0.02) + (o.sway || 0) * 0.04;
      root.rotation.x = breathe * (o.aim ? 0.006 : 0.01);
    },
  };
}
