// Smooth capsule rigs. Environment stays faceted; people do not.
// Standby figures wear the same coat, sleeve, and prop meshes as the skinned cast.
import * as THREE from "three";
import { damp } from "./util.js";
import { dusterGeometry, collarGeometry, coatTailGeometry, sleeveGeometry, coverallGeometry, wrenchGroup, spyglassGroup, goggleRig } from "./costume.js?v=1";

const mats = new Map();
function M(hex, opts = {}) {
  const key = `${hex}|${opts.side || ""}|${opts.emissive || ""}`;
  if (!opts.unique && mats.has(key)) return mats.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: hex, roughness: 0.84, metalness: 0.03,
    emissive: opts.emissive || 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 0.12,
    side: opts.side || THREE.FrontSide,
  });
  if (!opts.unique) mats.set(key, m);
  return m;
}

function down(len, radius, mat) {
  const mid = Math.max(0.04, len - radius * 2);
  const g = new THREE.CapsuleGeometry(radius, mid, 5, 16);
  g.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true;
  return mesh;
}

function sphere(r, mat, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

export function createHuman(spec) {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const body = new THREE.Group();
  bob.add(body);

  const skin = M(spec.skin || 0xd2a07c);
  const cloth = M(spec.cloth);
  const cloth2 = M(spec.cloth2 || spec.cloth);
  const pantsM = M(spec.pants);
  const bootM = M(spec.boots);
  const hatM = M(spec.hat || 0x5a432c);
  const hairM = M(spec.hair || 0x3a2a22);
  const shoulder = spec.shoulder || 0.23;

  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.94, 0);
    hip.add(down(0.44, 0.072, pantsM));
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);
    knee.add(down(0.4, 0.055, pantsM));
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 2, 8), bootM);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.4, 0.05);
    foot.castShadow = true;
    knee.add(foot);
    body.add(hip);
    return { hip, knee };
  };
  const L = leg(-1);
  const R = leg(1);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.32, 6, 16), cloth);
  torso.position.y = 1.25;
  torso.scale.set(spec.chest || 1.05, 1, 0.82);
  torso.castShadow = true;
  body.add(torso);

  const vest = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 3, 8), cloth2);
  vest.position.set(0, 1.28, 0.06);
  vest.scale.set(1.05, 0.95, 0.7);
  vest.castShadow = true;
  body.add(vest);

  if (spec.coat) {
    const coatM = M(spec.coat, { side: THREE.DoubleSide, unique: true });
    const coat = new THREE.Mesh(dusterGeometry(), coatM);
    coat.castShadow = true;
    body.add(coat);
    const collar = new THREE.Mesh(collarGeometry(), coatM);
    collar.castShadow = true;
    body.add(collar);
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(coatTailGeometry(s), coatM);
      tail.castShadow = true;
      tail.userData.side = s;
      body.add(tail);
    }
  }
  if (spec.coverall) {
    const shell = new THREE.Mesh(coverallGeometry(), M(spec.cloth, { side: THREE.DoubleSide, unique: true }));
    shell.castShadow = true;
    body.add(shell);
  }

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.045, 10), M(0x2a2118));
  belt.position.y = 1.05;
  belt.scale.set(spec.chest || 1, 1, 0.82);
  body.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), brassMat());
  buckle.position.set(0, 1.05, 0.14 * (spec.chest || 1));
  body.add(buckle);

  if (spec.suspenders) {
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.38, 0.02), M(0x6a3a28));
      strap.position.set(s * 0.07, 1.32, 0.1);
      strap.rotation.z = s * -0.08;
      body.add(strap);
    }
  }
  if (spec.neckerchief) {
    const necker = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 6), M(spec.neckerchief));
    necker.position.set(0, 1.5, 0.08);
    necker.rotation.x = Math.PI;
    body.add(necker);
  }

  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * shoulder * (spec.chest || 1), 1.5, 0);
    sh.add(down(0.3, 0.05, spec.sleeves ? M(spec.sleeves) : cloth));
    const el = new THREE.Group();
    el.position.y = -0.28;
    sh.add(el);
    el.add(down(0.26, 0.042, spec.sleeves ? M(spec.sleeves) : cloth));
    if (spec.coat || spec.coverall) {
      const sleeveM = M(spec.coat || spec.sleeves || spec.cloth, { side: THREE.DoubleSide, unique: true });
      const upperSleeve = new THREE.Mesh(sleeveGeometry(0.28), sleeveM);
      upperSleeve.position.y = -0.16;
      sh.add(upperSleeve);
      const fore = new THREE.Mesh(sleeveGeometry(0.24), sleeveM);
      fore.position.y = -0.14;
      el.add(fore);
    }
    const hand = new THREE.Group();
    hand.position.y = -0.26;
    el.add(hand);
    hand.add(sphere(0.046, skin, 0.9, 1, 0.75));
    body.add(sh);
    return { sh, el, hand };
  };
  const LA = arm(-1);
  const RA = arm(1);

  const neck = new THREE.Group();
  neck.position.y = 1.58;
  body.add(neck);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.06, 0.12, 12), skin);
  neckMesh.position.y = 0.02;
  neckMesh.castShadow = true;
  neck.add(neckMesh);
  const head = sphere(0.112, skin, 0.96, 1.06, 1);
  head.position.y = 0.1;
  neck.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM);
  hair.position.y = 0.15;
  neck.add(hair);
  const eyeW = M(0xf4efe8);
  const eyeD = M(0x1b140f);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeW);
    w.position.set(s * 0.04, 0.12, 0.09);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 5), eyeD);
    p.position.set(s * 0.042, 0.118, 0.105);
    neck.add(w, p);
  }
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.02), hairM);
  brow.position.set(0, 0.15, 0.09);
  if (spec.sharp) brow.scale.y = 1.4;
  neck.add(brow);
  if (spec.mustache) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.03), hairM);
    m.position.set(0, 0.06, 0.1);
    neck.add(m);
  }
  if (spec.roundFace) {
    head.scale.set(1.08, 1.02, 1.05);
  }

  let hat = null;
  if (spec.hat !== null) {
    hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 16), hatM);
    brim.position.y = 0.2;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 12), hatM);
    crown.position.y = 0.26;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.025, 12), M(spec.hatBand || 0x3a2418));
    band.position.y = 0.21;
    hat.add(brim, crown, band);
    hat.position.y = 0.02;
    hat.rotation.z = spec.hatTilt || 0;
    hat.rotation.x = spec.hatPitch || 0.06;
    neck.add(hat);
  }

  let key = null;
  if (spec.goggles) {
    const brass = brassMat();
    const glass = new THREE.MeshStandardMaterial({ color: 0x9ec8d4, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72 });
    const g = goggleRig(brass, glass, M(0x3a2a22));
    g.position.set(0, 0.2, 0.02);
    g.rotation.x = -0.7;
    neck.add(g);
  }
  if (spec.wrench) {
    const wrench = wrenchGroup(brassMat());
    wrench.position.set(0, -0.08, 0.03);
    wrench.rotation.set(0.5, 0.2, 1.15);
    RA.hand.add(wrench);
  }
  if (spec.spyglass) {
    const glass = spyglassGroup(brassMat(), M(0x4a3428));
    glass.position.set(0.16, 1.02, 0.1);
    glass.rotation.set(0.2, 0, 1.2);
    body.add(glass);
  }
  if (spec.key) {
    key = trailKey();
    key.position.set(0.02, -0.02, 0.04);
    key.rotation.set(-0.5, 0.2, 0.15);
    RA.hand.add(key);
  }
  if (spec.club) {
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.55, 6), M(0x5a4030));
    club.position.set(0, -0.2, 0.02);
    club.rotation.x = 0.4;
    club.castShadow = true;
    RA.hand.add(club);
  }
  if (spec.bills) {
    const stack = handbillMesh();
    stack.scale.setScalar(0.7);
    stack.position.set(0, -0.04, 0.04);
    LA.hand.add(stack);
  }
  if (spec.bandana) {
    const ban = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), M(0x7a2e2a));
    ban.position.set(0, 0.08, 0.09);
    neck.add(ban);
  }
  if (spec.lantern) {
    const lamp = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), M(0x3a342c));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc56a }));
    glow.position.y = 0.01;
    lamp.add(cage, glow);
    lamp.position.set(-0.16, 1.08, 0.08);
    body.add(lamp);
    spec._glow = glow;
  }
  let fogDust = null;
  if (spec.wisp || spec.fog) {
    const wrap = new THREE.Group();
    const smear = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({
        color: 0x9a9a9a, emissive: 0x5a5a5a, emissiveIntensity: 0.22,
        transparent: true, opacity: 0.62, depthWrite: false,
      }),
    );
    smear.scale.set(1.35, 1.7, 1.05);
    smear.position.set(0, 1.05, 0.02);
    const collar = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xc4c4c4, emissive: 0x6e6e6e, emissiveIntensity: 0.15 }),
    );
    collar.scale.set(1.2, 0.45, 0.85);
    collar.position.set(0.04, 1.48, 0.08);
    fogDust = makeDust(20, 0xe4e4e4, 0.85);
    fogDust.position.y = 1.15;
    wrap.add(smear, collar, fogDust);
    body.add(wrap);
  }

  root.scale.set(spec.bulk || 1, spec.height || 1, spec.bulk || 1);

  const shadow = blobShadow();
  root.add(shadow);

  let phase = Math.random() * 6;
  let swing = 0;
  const tmp = new THREE.Vector3();

  function update(dt, a) {
    const moving = a.speed > 0.25 && !a.air;
    phase += dt * (moving ? Math.max(0.85, Math.min(2.6, a.speed / 0.9)) : 0) * Math.PI * 2;
    swing = damp(swing, moving ? Math.min(1, 0.45 + a.speed / 3) : 0, 8, dt);
    const s = Math.sin(phase);
    const c = Math.cos(phase);
    const hip = (0.48 + Math.min(0.22, a.speed * 0.05)) * swing;
    const k = a.action === "attack" || a.action === "dodge" ? 16 : 11;
    let lhx = -s * hip;
    let rhx = s * hip;
    let lkx = Math.max(0, s) * (0.9 + Math.min(0.4, a.speed * 0.08)) * swing;
    let rkx = Math.max(0, -s) * (0.9 + Math.min(0.4, a.speed * 0.08)) * swing;
    if (a.air) {
      lhx = -0.55; rhx = 0.25; lkx = 1.05; rkx = 0.7;
    }
    let lax = s * 0.5 * swing;
    let rax = -s * 0.5 * swing;
    let laz = -0.14;
    let raz = 0.14;
    let lex = -0.28 - swing * 0.15;
    let rex = -0.28 - swing * 0.15;
    let keyX = -0.5;

    if (a.action === "attack") {
      const p = Math.min(1, a.actionT);
      const swg = Math.sin(p * Math.PI);
      const dir = a.combo === 2 ? -1 : 1;
      if (a.combo === 3) {
        rax = -2.35 + swg * 2.5;
        raz = 0.2;
        rex = -0.35 - swg * 0.55;
        keyX = -1.35;
      } else {
        rax = -0.45 - swg * 0.9;
        raz = dir * (0.25 + swg * 1.35);
        rex = -0.45 - swg * 0.65;
        keyX = -0.55 - swg * 0.85;
      }
      lax = -0.9;
      laz = -0.35;
      lex = -0.4;
    } else if (a.action === "flash") {
      const p = Math.sin(Math.min(1, a.actionT) * Math.PI);
      lax = -2.5 * p - 0.2;
      rax = -2.5 * p - 0.2;
      laz = -0.45;
      raz = 0.45;
      keyX = -1.4;
    } else if (a.action === "shove") {
      const p = Math.sin(Math.min(1, a.actionT) * Math.PI);
      lax = -1.2 * p;
      rax = -1.2 * p;
      laz = -0.2;
      raz = 0.2;
      lex = -0.2;
      rex = -0.2;
    } else if (a.action === "throw") {
      const p = Math.min(1, a.actionT);
      lax = -0.4 - Math.sin(p * Math.PI) * 1.7;
      laz = -0.2;
      lex = -0.3;
    }

    if (spec.scratch && a.action === "idle" && a.speed < 0.35) {
      const sc = Math.sin(performance.now() / 1000 * 0.85);
      if (sc > 0.55) {
        lax = -2.15;
        laz = -0.85;
        lex = -1.55;
      }
    }

    const dodge = a.action === "dodge";
    if (dodge) {
      const spins = a.actionT * Math.PI * 2;
      if (Math.abs(a.dodgeSide || 0) > 0.45) {
        bob.rotation.z = -(a.dodgeSide) * spins;
        bob.rotation.x = 0;
      } else {
        bob.rotation.x = spins;
        bob.rotation.z = 0;
      }
      bob.position.y = -Math.sin(Math.min(1, a.actionT) * Math.PI) * 0.42;
      lhx = 0.4; rhx = -0.2; lkx = 1.2; rkx = 1.1;
    } else {
      bob.rotation.x = damp(bob.rotation.x, moving ? 0.08 + a.speed * 0.02 : 0, 10, dt);
      bob.rotation.z = damp(bob.rotation.z, s * 0.05 * swing, 10, dt);
      const breathe = Math.sin(performance.now() / 1000 * 1.7) * 0.012;
      bob.position.y = damp(bob.position.y, Math.abs(Math.sin(phase * 2)) * 0.035 * swing + breathe, 10, dt);
    }

    setRot(L.hip, lhx, 0, 0, k, dt);
    setRot(R.hip, rhx, 0, 0, k, dt);
    setRot(L.knee, lkx, 0, 0, k, dt);
    setRot(R.knee, rkx, 0, 0, k, dt);
    setRot(LA.sh, lax, 0, laz, k, dt);
    setRot(RA.sh, rax, 0, raz, k, dt);
    setRot(LA.el, lex, 0, 0, k, dt);
    setRot(RA.el, rex, 0, 0, k, dt);
    if (key) key.rotation.x = damp(key.rotation.x, keyX, 14, dt);

    const look = a.look || 0;
    neck.rotation.y = damp(neck.rotation.y, look, 8, dt);
    neck.rotation.x = damp(neck.rotation.x, a.air ? -0.2 : moving ? -0.08 : 0, 8, dt);
    body.rotation.y = damp(body.rotation.y, 0, 8, dt);

    if (a.hurt > 0) {
      body.rotation.x = damp(body.rotation.x, -0.25 * a.hurt, 14, dt);
    }
    if (fogDust) spinDust(fogDust, performance.now() / 1000 * 1.4);

    root.updateMatrixWorld(true);
    neck.getWorldPosition(tmp);
    shadow.position.y = 0.03 - bob.position.y;
    const sp = Math.min(1, a.speed / 4);
    shadow.material.opacity = 0.38 - sp * 0.08;
    return { head: tmp.clone(), step: moving && s * c < 0 && Math.sin(phase - dt * 4) * Math.cos(phase - dt * 4) > 0 };
  }

  return { root, update, hand: RA.hand, glow: spec._glow || null, neck, key };
}

function setRot(obj, x, y, z, lambda, dt) {
  obj.rotation.x = damp(obj.rotation.x, x, lambda, dt);
  obj.rotation.y = damp(obj.rotation.y, y, lambda, dt);
  obj.rotation.z = damp(obj.rotation.z, z, lambda, dt);
}

let brass = null;
function brassMat() {
  if (!brass) {
    brass = new THREE.MeshStandardMaterial({ color: 0xe0bf78, metalness: 0.72, roughness: 0.32 });
  }
  return brass;
}

export function trailKey() {
  const g = new THREE.Group();
  const metal = brassMat();
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 14), metal);
  bow.position.y = 0.06;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 8), metal);
  shaft.position.y = -0.05;
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.02), metal);
  tooth.position.set(0.028, -0.1, 0);
  const tooth2 = tooth.clone();
  tooth2.position.y = -0.13;
  tooth2.scale.x = 0.7;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.42, 0.07), metal);
  blade.position.y = -0.3;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.36, 0.016), new THREE.MeshStandardMaterial({ color: 0xfff1c4, metalness: 0.4, roughness: 0.2, emissive: 0x6a4a20, emissiveIntensity: 0.4 }));
  edge.position.set(0, -0.28, 0.04);
  g.add(bow, shaft, tooth, tooth2, blade, edge);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

let billTex = null;
function billTexture() {
  if (billTex) return billTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 80;
  const g = c.getContext("2d");
  g.fillStyle = "#f3e6c4";
  g.fillRect(0, 0, 128, 80);
  g.strokeStyle = "#6a4320";
  g.strokeRect(3, 3, 122, 74);
  g.fillStyle = "#3a2414";
  g.font = "700 11px Georgia";
  g.textAlign = "center";
  g.fillText("SAFE PASSAGE", 64, 28);
  g.font = "10px Georgia";
  g.fillText("Reasonable rates", 64, 46);
  g.fillText("— J & T —", 64, 62);
  billTex = new THREE.CanvasTexture(c);
  billTex.colorSpace = THREE.SRGBColorSpace;
  return billTex;
}

export function handbillMesh() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.22),
    new THREE.MeshStandardMaterial({ map: billTexture(), roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
  );
  m.castShadow = true;
  return m;
}

const fogShader = {
  uniforms: { uTime: { value: 0 }, uHit: { value: 0 }, uFade: { value: 1 } },
  vertexShader: `
    varying vec3 vN;
    varying vec3 vLocal;
    void main() {
      vLocal = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uHit;
    uniform float uFade;
    varying vec3 vN;
    varying vec3 vLocal;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash(i);
      float n100 = hash(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash(i + vec3(1.0, 1.0, 1.0));
      return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
                 mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
    }
    void main() {
      float fres = pow(1.0 - abs(dot(vN, vec3(0.0, 0.0, 1.0))), 1.35);
      float n = noise(vLocal * 2.1 + vec3(0.0, uTime * 0.32, uTime * 0.1));
      float n2 = noise(vLocal * 4.8 - vec3(uTime * 0.4, uTime * 0.15, 0.0));
      float n3 = noise(vLocal * 1.1 + vec3(uTime * 0.08, 0.0, uTime * 0.05));
      float core = smoothstep(0.95, 0.15, length(vLocal));
      float alpha = (0.08 + n * 0.34 + n2 * 0.2 + n3 * 0.16) * (0.22 + fres * 0.9) * uFade;
      alpha = mix(alpha * 0.45, alpha * 1.35, core);
      vec3 col = mix(vec3(0.32, 0.33, 0.36), vec3(0.86, 0.87, 0.88), n);
      col = mix(col, vec3(0.62, 0.64, 0.68), fres * 0.55);
      col += vec3(0.55) * uHit;
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.72));
    }
  `,
};

function fogMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHit: { value: 0 },
      uFade: { value: 1 },
    },
    vertexShader: fogShader.vertexShader,
    fragmentShader: fogShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createFog(opts = {}) {
  const tall = !!opts.tall;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shells = [];
  const volumes = [
    { p: [0, tall ? 1.05 : 0.78, 0], s: [0.42, tall ? 0.72 : 0.5, 0.34] },
    { p: [0.05, tall ? 1.55 : 1.15, 0.02], s: [0.28, tall ? 0.42 : 0.3, 0.24] },
    { p: [0, tall ? 0.45 : 0.32, 0], s: [0.5, 0.22, 0.36] },
  ];
  for (let shell = 0; shell < 4; shell++) {
    for (const v of volumes) {
      const mat = fogMat();
      mat.uniforms.uFade.value = 0.55 + shell * 0.18;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), mat);
      mesh.position.set(v.p[0], v.p[1], v.p[2]);
      const k = 1 + shell * 0.16;
      mesh.scale.set(v.s[0] * k, v.s[1] * k, v.s[2] * k);
      mesh.frustumCulled = false;
      body.add(mesh);
      shells.push(mesh);
    }
  }
  const faceMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.9, depthWrite: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(tall ? 0.16 : 0.11, 18), faceMat);
  face.position.set(0, tall ? 1.62 : 1.22, tall ? 0.22 : 0.18);
  body.add(face);
  const dust = makeDust(tall ? 70 : 42, 0xdcdcdc, tall ? 1.8 : 1.15);
  dust.position.y = tall ? 1.2 : 0.85;
  root.add(dust);
  const shadow = blobShadow();
  shadow.scale.setScalar(tall ? 1.55 : 1.05);
  root.add(shadow);
  if (opts.scale) root.scale.setScalar(opts.scale);
  let phase = Math.random() * 6;
  return {
    root,
    skinned: false,
    update(dt, a) {
      phase += dt * (a.speed > 0.2 ? 2.6 : 1.15);
      const dead = a.action === "death" ? Math.min(1, a.actionT || 0) : 0;
      const bob = Math.sin(phase) * (tall ? 0.08 : 0.05) * (1 - dead);
      body.position.y = bob + (a.tele ? 0.12 : 0);
      body.rotation.y = Math.sin(phase * 0.4) * 0.2;
      const hit = a.hit || 0;
      for (const mesh of shells) {
        mesh.material.uniforms.uTime.value = phase;
        mesh.material.uniforms.uHit.value = hit;
        mesh.material.uniforms.uFade.value = (1 - dead) * (0.45 + (mesh.scale.x % 0.2));
      }
      face.position.y = (tall ? 1.62 : 1.22) + bob * 0.4;
      face.material.opacity = 0.92 * (1 - dead);
      spinDust(dust, phase);
      dust.material.opacity = 0.7 * (1 - dead);
      return { step: false };
    },
  };
}

export function makeDust(n, color, spread) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.08, map: softDot(), transparent: true, depthWrite: false, opacity: 0.7, sizeAttenuation: true,
  }));
  pts.userData.base = pos.slice(0);
  pts.frustumCulled = false;
  return pts;
}

export function spinDust(pts, phase) {
  const base = pts.userData.base;
  const arr = pts.geometry.attributes.position.array;
  for (let i = 0; i < base.length; i += 3) {
    const a = phase * 0.6 + i;
    arr[i] = base[i] * Math.cos(a) - base[i + 2] * Math.sin(a * 0.3);
    arr[i + 1] = base[i + 1] + Math.sin(phase + i) * 0.05;
    arr[i + 2] = base[i + 2] * Math.cos(a * 0.3) + base[i] * Math.sin(a);
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

let dotTex = null;
export function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,0.95)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

function blobShadow() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, depthWrite: false, opacity: 0.35, color: 0x000000 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  mesh.renderOrder = 1;
  return mesh;
}

export function createCritter(kind) {
  const root = new THREE.Group();
  const hide = M(kind === "ox" ? 0x8a623c : 0xd8d0c2);
  const dark = M(kind === "ox" ? 0x4a3024 : 0x6a5a48);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(kind === "ox" ? 0.38 : 0.16, kind === "ox" ? 0.9 : 0.34, 3, 8), hide);
  body.rotation.z = Math.PI / 2;
  body.position.y = kind === "ox" ? 0.85 : 0.42;
  body.castShadow = true;
  root.add(body);
  const head = new THREE.Group();
  const skull = sphere(kind === "ox" ? 0.22 : 0.1, hide);
  head.add(skull);
  if (kind === "ox") {
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.28, 5), M(0xe6dcc8));
      horn.position.set(s * 0.12, 0.16, 0);
      horn.rotation.z = s * -0.8;
      head.add(horn);
    }
  } else {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), dark);
      ear.position.set(s * 0.06, 0.08, 0);
      head.add(ear);
    }
  }
  head.position.set(kind === "ox" ? 0.7 : 0.28, kind === "ox" ? 0.95 : 0.48, 0);
  root.add(head);
  const legs = [];
  const offs = kind === "ox" ? [[-0.35, -0.18], [-0.35, 0.18], [0.35, -0.18], [0.35, 0.18]] : [[-0.12, -0.07], [-0.12, 0.07], [0.12, -0.07], [0.12, 0.07]];
  for (const [x, z] of offs) {
    const hip = new THREE.Group();
    hip.position.set(x, kind === "ox" ? 0.7 : 0.36, z);
    hip.add(down(kind === "ox" ? 0.48 : 0.22, kind === "ox" ? 0.06 : 0.03, dark));
    root.add(hip);
    legs.push(hip);
  }
  root.add(blobShadow());
  let phase = Math.random() * 4;
  return {
    root,
    update(dt, speed) {
      phase += dt * (speed > 0.1 ? speed * 7 : 1.4);
      const s = Math.sin(phase);
      legs.forEach((hip, i) => { hip.rotation.x = Math.sin(phase + (i % 2) * Math.PI) * (speed > 0.1 ? 0.4 : 0.05); });
      head.rotation.x = Math.sin(phase * 0.5) * 0.08;
      head.position.y = (kind === "ox" ? 0.95 : 0.48) + Math.abs(s) * 0.01;
      body.position.y = (kind === "ox" ? 0.85 : 0.42) + Math.abs(s) * 0.015 * (speed > 0.1 ? 1 : 0.3);
    },
  };
}
