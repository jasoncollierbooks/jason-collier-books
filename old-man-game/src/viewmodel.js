// First-person hands and the Winchester. Worn leather gloves, wool cuffs, a scoped lever gun.
// Lives on the camera. Bob, breath, and a little sway when the rifle is shouldered.
import * as THREE from "three";

const leather = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x3a2a1c, THREE.SRGBColorSpace), roughness: 0.72, metalness: 0.02 });
const wool = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x4e3d2c, THREE.SRGBColorSpace), roughness: 0.95 });
const wood = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x6b4428, THREE.SRGBColorSpace), roughness: 0.55 });
const steel = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x2c2e32, THREE.SRGBColorSpace), roughness: 0.32, metalness: 0.82 });
const brass = () => new THREE.MeshStandardMaterial({ color: new THREE.Color().setHex(0x8a7044, THREE.SRGBColorSpace), roughness: 0.4, metalness: 0.6 });

function glove(side = 1) {
  const g = new THREE.Group();
  const m = leather(), cuffM = wool();
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.05, 6, 10), m);
  palm.rotation.z = Math.PI / 2;
  palm.scale.set(1.15, 0.85, 0.72);
  g.add(palm);
  const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.028, 0.04), m);
  knuckle.position.set(0, 0.02, 0.012);
  g.add(knuckle);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set(-0.03 + i * 0.02, 0.012, 0.03);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.028, 4, 6), m);
    a.rotation.x = 0.9;
    a.position.z = 0.02;
    f.add(a);
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.02, 3, 6), m);
    b.rotation.x = 1.7;
    b.position.set(0, -0.012, 0.038);
    f.add(b);
    g.add(f);
    f.userData.curl = f;
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.034, 4, 6), m);
  th.position.set(side * 0.04, -0.005, 0.02);
  th.rotation.set(0.5, 0, side * 1.05);
  g.add(th);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.08, 12), m);
  wrist.position.set(0, -0.05, -0.01);
  g.add(wrist);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.09, 12), cuffM);
  cuff.position.set(0, -0.12, -0.015);
  g.add(cuff);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return g;
}

function winchester() {
  const g = new THREE.Group();
  const w = wood(), s = steel(), b = brass();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.52, 8), s);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.28);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8), s);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0.004, -0.22);
  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.28), w);
  fore.position.set(0, -0.004, -0.16);
  const recv = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.055, 0.16), s);
  recv.position.set(0, 0.01, 0.02);
  const lever = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 6, 14, Math.PI), b);
  lever.rotation.y = Math.PI / 2;
  lever.position.set(0, -0.03, 0.04);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.05), w);
  grip.position.set(0, -0.03, 0.06);
  grip.rotation.x = 0.4;
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.09, 0.34), w);
  stock.position.set(0, -0.02, 0.26);
  stock.rotation.x = 0.08;
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.03, 0.16), w);
  comb.position.set(0, 0.03, 0.22);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.1, 0.012), b);
  plate.position.set(0, -0.015, 0.43);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 10), s);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.055, -0.02);
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.04), s);
  mount.position.set(0, 0.038, -0.02);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 5), b);
  bead.position.set(0, 0.032, -0.53);
  g.add(barrel, tube, fore, recv, lever, grip, stock, comb, plate, scope, mount, bead);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return g;
}

export function buildViewmodel() {
  const root = new THREE.Group();
  root.visible = false;
  root.renderOrder = 20;
  root.scale.setScalar(1.65);
  const rifle = winchester();
  const right = glove(-1);
  const left = glove(1);
  root.add(rifle, right, left);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.renderOrder = 20;
    if (o.material) { o.material.fog = false; o.material.depthTest = true; }
  });
  // low ready, high enough in the view that the gloves and the Winchester sit in the lower third
  const ready = {
    rifle: { p: [0.1, -0.1, -0.52], r: [0.42, -0.22, 0.18] },
    right: { p: [0.2, -0.12, -0.34], r: [-0.55, 0.15, 0.5] },
    left: { p: [0.0, -0.09, -0.62], r: [-0.85, -0.35, 0.12] },
  };
  const aim = {
    rifle: { p: [0.02, -0.06, -0.46], r: [0.06, 0.02, 0.02] },
    right: { p: [0.1, -0.08, -0.3], r: [-1.05, 0.12, 0.3] },
    left: { p: [-0.02, -0.05, -0.52], r: [-1.25, -0.15, 0.1] },
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
