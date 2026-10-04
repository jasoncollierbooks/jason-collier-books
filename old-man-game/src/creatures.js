// The bull, the cows, and the thing that paces you. Procedural low-poly, animated by hand.
import * as THREE from "three";

const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
function seg(len, r0, r1, mat, sides = 6) {
  const g = new THREE.CylinderGeometry(r1, r0, len, sides);
  g.translate(0, -len / 2, 0);
  return new THREE.Mesh(g, mat);
}

/* ---------------- elk ---------------- */
export function buildElk({ bull = true } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hide = M(bull ? 0x9a7a52 : 0xa48660), mane = M(0x4a3524), rump = M(0xd9c7a2), leg = M(0x3a2a1e), antler = M(0xd8cdb6), nose = M(0x221a14);
  // barrel
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.2, 4, 8), hide);
  torso.rotation.z = Math.PI / 2;
  torso.rotation.y = Math.PI / 2;
  torso.position.set(0, 1.45, 0);
  body.add(torso);
  const r = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), rump);
  r.position.set(0, 1.5, 0.72);
  r.scale.set(0.95, 0.95, 0.6);
  body.add(r);
  // neck + head
  const neck = new THREE.Group();
  neck.position.set(0, 1.62, -0.7);
  body.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(bull ? 0.26 : 0.18, bull ? 0.36 : 0.26, 0.85, 7), mane);
  nk.rotation.x = -0.75;
  nk.position.set(0, 0.28, -0.25);
  neck.add(nk);
  const head = new THREE.Group();
  head.position.set(0, 0.62, -0.55);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.42), hide);
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.3), hide);
  snout.position.set(0, -0.07, -0.3);
  head.add(snout);
  const ns = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), nose);
  ns.position.set(0, -0.08, -0.46);
  head.add(ns);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), hide);
    ear.position.set(s * 0.15, 0.14, 0.1);
    ear.rotation.z = -s * 0.9;
    head.add(ear);
  }
  if (bull) {
    // six-point rack
    for (const s of [-1, 1]) {
      const beam = new THREE.Group();
      beam.position.set(s * 0.1, 0.14, 0.05);
      head.add(beam);
      let px = 0, py = 0, pz = 0;
      const pts = [[0.18, 0.28, 0.12], [0.1, 0.3, 0.2], [0.06, 0.3, 0.15], [0.02, 0.26, 0.1], [-0.02, 0.2, 0.06]];
      pts.forEach(([dx, dy, dz], k) => {
        const a = new THREE.Vector3(px, py, pz);
        const b = new THREE.Vector3(px + s * dx, py + dy, pz + dz);
        const len = a.distanceTo(b);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03 - k * 0.003, len, 5), antler);
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.lookAt(b);
        m.rotateX(Math.PI / 2);
        beam.add(m);
        // tine forward
        if (k < 4) {
          const tl = 0.22 - k * 0.03;
          const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, tl, 4), antler);
          t.position.set(b.x, b.y + 0.02, b.z - tl * 0.45);
          t.rotation.x = -1.1;
          beam.add(t);
        }
        px = b.x; py = b.y; pz = b.z;
      });
    }
  }
  // legs
  const legs = [];
  for (const [x, z] of [[-0.24, -0.55], [0.24, -0.55], [-0.24, 0.62], [0.24, 0.62]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 1.3, z);
    const up = seg(0.6, 0.11, 0.08, hide);
    hip.add(up);
    const kn = new THREE.Group();
    kn.position.y = -0.6;
    hip.add(kn);
    const lo = seg(0.62, 0.06, 0.05, leg);
    kn.add(lo);
    body.add(hip);
    legs.push({ hip, kn, front: z < 0 });
  }
  // vitals marker for hit testing (invisible)
  const vitals = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  vitals.position.set(0, 1.4, -0.45);
  vitals.userData.part = "vitals";
  body.add(vitals);
  const bodyHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.1), new THREE.MeshBasicMaterial({ visible: false }));
  bodyHit.position.set(0, 1.45, 0.05);
  bodyHit.userData.part = "body";
  body.add(bodyHit);
  root.userData.hit = [vitals, bodyHit];
  let phase = Math.random() * 10;
  const api = {
    root, hitMeshes: [vitals, bodyHit],
    /** mode: stand | graze | walk | run | bed | down | alert */
    animate(mode, dt, t) {
      const run = mode === "run", walk = mode === "walk";
      phase += dt * (run ? 9 : walk ? 4 : 0);
      body.rotation.set(0, 0, 0);
      body.position.y = 0;
      if (mode === "down") {
        body.rotation.z = Math.PI / 2 * 0.92;
        body.position.set(0.9, -0.35, 0);
        legs.forEach((l, i) => { l.hip.rotation.x = 0.4 * (i % 2 ? 1 : -1); l.kn.rotation.x = 0.3; });
        neck.rotation.x = 0.6;
        return;
      }
      body.position.x = 0;
      if (mode === "bed") {
        body.position.y = -0.95;
        legs.forEach((l) => { l.hip.rotation.x = l.front ? -1.4 : 1.4; l.kn.rotation.x = l.front ? 2.6 : -2.6; });
        neck.rotation.x = -0.1 + Math.sin(t * 0.4) * 0.05;
        head.rotation.y = Math.sin(t * 0.3) * 0.5;
        return;
      }
      const graze = mode === "graze", alert = mode === "alert";
      legs.forEach((l, i) => {
        const off = i === 0 || i === 3 ? 0 : Math.PI;
        const a = Math.sin(phase + off) * (run ? 0.95 : walk ? 0.42 : 0);
        l.hip.rotation.x = a + (run && l.front ? -0.15 : 0);
        // bound: the lifted leg folds, the planted leg stays long
        l.kn.rotation.x = Math.max(0, -Math.cos(phase + off)) * (run ? 1.35 : walk ? 0.55 : 0) * (l.front ? -1 : 1);
      });
      if (run) {
        // a bound: gather, then a higher push off the hind legs
        const hop = Math.max(0, Math.sin(phase));
        body.position.y = hop * hop * 0.34;
        body.rotation.x = -0.22 + hop * 0.18;
        neck.rotation.x = 0.35;
        head.rotation.y = 0;
        head.rotation.x = -0.15;
      } else if (graze) {
        // peck at the snow, then a small chew
        const peck = Math.max(0, Math.sin(t * 1.6));
        neck.rotation.x = 0.55 + peck * 0.85;
        head.rotation.x = peck * 0.35;
        head.rotation.y = Math.sin(t * 0.35) * 0.2;
        body.position.y = 0;
      } else if (alert) {
        body.position.y = 0.02;
        neck.rotation.x = -0.55;
        head.rotation.x = -0.15;
        head.rotation.y = Math.sin(t * 1.4) * 0.35;
        // ears up
        head.children.forEach((ch) => { if (ch.geometry?.type === "ConeGeometry") ch.rotation.z = Math.sign(ch.position.x || 1) * -0.35; });
      } else {
        body.position.y = walk ? Math.abs(Math.sin(phase * 2)) * 0.03 : 0;
        body.rotation.x = 0;
        neck.rotation.x = walk ? 0.05 : -0.08 + Math.sin(t * 0.45) * 0.06;
        head.rotation.x = 0;
        head.rotation.y = walk ? Math.sin(t * 0.6) * 0.08 : Math.sin(t * 0.3) * 0.35;
      }
    },
  };
  return api;
}

/* the beast lives in walker.js */
