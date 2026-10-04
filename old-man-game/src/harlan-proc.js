// Harlan Wade: old hunter, wool coat, felt hat, white beard, pack frame, Winchester.
// Built from primitives so it lights, fogs and animates with the world.
import * as THREE from "three";

const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, metalness: 0, flatShading: false });

function limb(len, r0, r1, mat) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 14, 1);
  g.translate(0, -len / 2, 0);
  return new THREE.Mesh(g, mat);
}

export function buildProcHarlan() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs and leans
  root.add(body);
  const coat = M(0x8a7148), coatDark = M(0x5e4c2c), pants = M(0x4d4a40), boot = M(0x3a2a1e), skin = M(0xd0a585),
    beard = M(0xe7e3dc), hat = M(0x5e4632), band = M(0x2a1e15), pack = M(0x5a4a33), steel = M(0x2a2b2e), stock = M(0x5a3a22), meat = M(0x7a2e24);

  // legs (pivot at hip)
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0.92, 0);
    const thigh = limb(0.46, 0.085, 0.075, pants);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    hip.add(knee);
    const shin = limb(0.42, 0.07, 0.06, pants);
    knee.add(shin);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), boot);
    b.scale.set(0.85, 0.7, 1.7);
    b.position.set(0, -0.46, 0.05);
    knee.add(b);
    body.add(hip);
    return { hip, knee };
  };
  const L = mkLeg(-1), R = mkLeg(1);

  // coat: flared skirt + torso
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 16, 1, true), coat);
  skirt.position.y = 0.88;
  skirt.material.side = THREE.DoubleSide;
  body.add(skirt);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.52, 16), coat);
  torso.position.y = 1.35;
  torso.scale.z = 0.78;
  body.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 5, 10), coatDark);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.6;
  body.add(collar);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.06, 9), band);
  belt.position.y = 1.1;
  belt.scale.z = 0.8;
  body.add(belt);

  // head
  const neck = new THREE.Group();
  neck.position.y = 1.63;
  body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), skin);
  head.position.y = 0.11;
  neck.add(head);
  const brd = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), beard);
  brd.rotation.x = Math.PI;
  brd.position.set(0, 0.02, -0.06);
  neck.add(brd);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 10, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.3), M(0xa9a39a));
  hair.position.y = 0.11;
  neck.add(hair);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 14), hat);
  brim.position.y = 0.2;
  neck.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.13, 10), hat);
  crown.position.y = 0.27;
  neck.add(crown);
  const hband = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.03, 10), band);
  hband.position.y = 0.225;
  neck.add(hband);
  const lampLens = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  lampLens.position.set(0, 0.225, -0.135);
  neck.add(lampLens);

  // arms (pivot at shoulder)
  const mkArm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.27, 1.55, 0);
    const up = limb(0.32, 0.07, 0.06, coat);
    sh.add(up);
    const el = new THREE.Group();
    el.position.y = -0.32;
    sh.add(el);
    const fo = limb(0.3, 0.06, 0.05, coat);
    el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), M(0x3a2c22));
    hand.position.y = -0.32;
    el.add(hand);
    body.add(sh);
    return { sh, el };
  };
  const LA = mkArm(-1), RA = mkArm(1);

  // pack frame + bedroll
  const packG = new THREE.Group();
  packG.position.set(0, 1.3, 0.2);
  body.add(packG);
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.16), pack);
  packG.add(bag);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8), M(0x6b2f22));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.29, 0);
  packG.add(roll);
  const meatLoad = new THREE.Group();
  const q1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.22), meat);
  q1.position.set(0, -0.05, 0.16);
  const q2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.2), M(0xd8d0c4));
  q2.position.set(0, 0.32, 0.12);
  meatLoad.add(q1, q2);
  meatLoad.visible = false;
  packG.add(meatLoad);

  // rifle slung across the back, muzzle up over the right shoulder
  const rifle = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.75), steel);
  barrel.position.z = -0.35;
  const stk = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.42), stock);
  stk.position.z = 0.2;
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 6), steel);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.05, -0.1);
  rifle.add(barrel, stk, scope);
  const slung = new THREE.Group();
  slung.position.set(0.04, 1.3, 0.31);
  slung.rotation.set(-1.3, 0, 0.62);
  slung.add(rifle);
  body.add(slung);

  // soft blob shadow
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, "rgba(0,0,0,0.55)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.renderOrder = 1;
  root.add(shadow);

  let phase = 0;
  const api = {
    root,
    neck,
    shadowTex,
    hasRifle: true,
    setRifle(on) { slung.visible = on; api.hasRifle = on; },
    setMeat(on) { meatLoad.visible = on; roll.visible = !on; },
    /** speed m/s, dt seconds, opts {sneak, afraid, aiming, sitting, breath} */
    animate(speed, dt, o = {}) {
      const moving = speed > 0.15;
      const runK = moving ? Math.max(0, Math.min(1, (speed - 2.4) / 2.2)) : 0;
      // stride grows from a short walk to a longer run so the feet match ground speed
      const stride = 0.62 + runK * 0.55;
      const cps = moving ? Math.max(0.4, Math.min(2.4, speed / stride)) : 0;
      phase += dt * cps * Math.PI * 2;
      const sw = moving ? 0.35 + 0.65 * Math.min(1, speed / 2.2) : 0;
      const s = Math.sin(phase), c = Math.cos(phase);
      const hipA = (0.42 + runK * 0.22) * sw;
      const crouch = o.sneak ? 0.12 : 0;
      L.hip.rotation.x = s * hipA - crouch * 2;
      R.hip.rotation.x = -s * hipA - crouch * 2;
      // knee bends on the back half of the stride (the foot that's lifting)
      L.knee.rotation.x = Math.max(0, -c) * (0.7 + runK * 0.35) * sw + crouch * 3;
      R.knee.rotation.x = Math.max(0, c) * (0.7 + runK * 0.35) * sw + crouch * 3;
      const t = performance.now() / 1000;
      const breathe = Math.sin(t * (o.afraid ? 4.2 : 1.6)) * 0.012;
      body.position.y = Math.abs(Math.sin(phase * 2)) * (0.025 + runK * 0.02) * sw - crouch * 0.9 + breathe;
      body.position.x = s * 0.025 * sw;
      body.rotation.x = -(0.04 * sw + runK * 0.14 + crouch * 0.6);
      body.rotation.z = s * 0.04 * sw;
      if (o.aiming) {
        RA.sh.rotation.set(-1.45, 0, 0.1);
        RA.el.rotation.set(-0.3, 0, 0);
        LA.sh.rotation.set(-1.4, 0, -0.35);
        LA.el.rotation.set(-0.1, 0, 0);
      } else {
        // arms opposite the legs, elbows softer at a walk
        LA.sh.rotation.set(-s * (0.4 + runK * 0.25) * sw + (o.afraid ? -0.15 : 0), 0, -0.08);
        RA.sh.rotation.set(s * (0.4 + runK * 0.25) * sw, 0, 0.08);
        LA.el.rotation.x = -0.22 - sw * (0.2 + runK * 0.15);
        RA.el.rotation.x = -0.22 - sw * (0.2 + runK * 0.15);
      }
      neck.rotation.y = o.lookYaw ?? 0;
      neck.rotation.x = (o.lookPitch ?? 0) - runK * 0.08;
      return { step: moving && Math.sin(phase) * Math.sin(phase - dt * cps * Math.PI * 2) < 0 };
    },
    phase: () => phase,
  };
  root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
  return api;
}
