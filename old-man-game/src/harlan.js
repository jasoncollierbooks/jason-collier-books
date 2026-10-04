// Harlan Wade: old hunter, long wool coat, felt hat, white beard, pack frame, Winchester.
// v3: a rigged, animated human (Quaternius Universal Animation Library mannequin, CC0) dressed in code:
// vertex-coloured clothing regions, a skinned long-coat skirt that follows the thighs, and a face, hat,
// pack, straps, buttons and rifle attached to the bones. The old primitive Harlan shows until the model
// has loaded, and stays as the fallback if it fails.
import * as THREE from "three";
import { GLTFLoader } from "three/addons";
import { buildProcHarlan } from "./harlan-proc.js";

const SRGB = (hex) => new THREE.Color().setHex(hex, THREE.SRGBColorSpace);
const lerp = (a, b, t) => a + (b - a) * t;
const TV = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// native ground speed of each loop (m/s), measured from foot travel in the clips (tools/harlan.html)
const NATIVE = { Walk_Loop: 1.15, Jog_Fwd_Loop: 2.55, Crouch_Fwd_Loop: 0.82, Sprint_Loop: 4.35 };

/** weld co-located verts, relax the bind pose, and share one smooth normal so the low-poly body reads as a person */
function soften(mesh, iters = 2, amount = 0.28) {
  const geo = mesh.geometry;
  const p = geo.attributes.position;
  const n = p.count;
  if (!n || n > 20000) return;
  const key = (i) => `${Math.round(p.getX(i) * 400)},${Math.round(p.getY(i) * 400)},${Math.round(p.getZ(i) * 400)}`;
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(i);
  }
  const uniq = [...groups.values()];
  const idOf = new Map();
  uniq.forEach((g, i) => g.forEach((vi) => idOf.set(vi, i)));
  const nbr = uniq.map(() => new Set());
  const tri = (i) => idOf.get(i);
  for (let i = 0; i + 2 < n; i += 3) {
    const a = tri(i), b = tri(i + 1), c = tri(i + 2);
    if (a == null || b == null || c == null) continue;
    nbr[a].add(b); nbr[a].add(c); nbr[b].add(a); nbr[b].add(c); nbr[c].add(a); nbr[c].add(b);
  }
  const pos = uniq.map((g) => new THREE.Vector3(p.getX(g[0]), p.getY(g[0]), p.getZ(g[0])));
  for (let it = 0; it < iters; it++) {
    const next = pos.map((v, i) => {
      if (!nbr[i].size) return v.clone();
      const a = new THREE.Vector3();
      for (const j of nbr[i]) a.add(pos[j]);
      a.multiplyScalar(1 / nbr[i].size);
      return v.clone().lerp(a, amount);
    });
    for (let i = 0; i < pos.length; i++) pos[i].copy(next[i]);
  }
  for (let i = 0; i < uniq.length; i++) for (const vi of uniq[i]) p.setXYZ(vi, pos[i].x, pos[i].y, pos[i].z);
  geo.computeVertexNormals();
  const nr = geo.attributes.normal;
  const acc = new THREE.Vector3();
  for (const g of uniq) {
    acc.set(0, 0, 0);
    for (const vi of g) acc.add(new THREE.Vector3(nr.getX(vi), nr.getY(vi), nr.getZ(vi)));
    if (acc.lengthSq() < 1e-8) continue;
    acc.normalize();
    for (const vi of g) nr.setXYZ(vi, acc.x, acc.y, acc.z);
  }
  p.needsUpdate = true;
  nr.needsUpdate = true;
}

export function buildHarlan() {
  const proc = buildProcHarlan();
  const root = proc.root; // keep the same root so engine/main code is untouched
  const PAL = {
    coat: SRGB(0x7b6440), coatDark: SRGB(0x4f3f26), collar: SRGB(0x5a4830), cuff: SRGB(0x5f4c30),
    trouser: SRGB(0x4a463c), boot: SRGB(0x33261b), sole: SRGB(0x1c1611), skin: SRGB(0xc99a7c), hair: SRGB(0xbdb8b0),
    glove: SRGB(0x4a3424), belt: SRGB(0x2a1e15),
  };
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0, ...o });

  const st = { ready: false, model: null, mixer: null, acts: {}, w: {}, phase: 0, bones: {}, rifle: null, meat: null, roll: null, lampLens: null };
  let lastRifle = true, lastMeat = false;

  const URL_ = (f) => new URL("../assets/models/" + f, import.meta.url).href;

  function dress(body, anims, head, beardG) {
    const model = body.scene; // faces +Z in the file
    const meshes = [];
    model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); if (o.isBone) st.bones[o.name] = o; });
    if (!meshes.length) throw new Error("no skinned mesh");
    const skeleton = meshes[0].skeleton;
    skeleton.pose();
    model.updateMatrixWorld(true);
    const B = (n) => st.bones[n];
    for (const m of meshes) {
      if (/Peasant|Regular_Male/.test(m.material?.name || "") || /Peasant|Regular/.test(m.name || "")) soften(m, 2, 0.22);
      const mat = m.material;
      mat.roughness = 0.9; mat.metalness = 0; mat.flatShading = false;
      // weather the peasant clothes toward the book's palette: dull wool, frozen leather
      if (/Peasant/.test(mat.name)) mat.color.setRGB(0.44, 0.36, 0.27);
      m.castShadow = true; m.frustumCulled = false;
    }
    const v = new THREE.Vector3();
    // winter sleeves: the base outfit has bare forearms; tint the forearm skin to wool, keep the hands
    // (vertex colour = target / average skin texel, so map * colour lands near the wool colour)
    const sleeve = SRGB(0x56442d), skinAvg = new THREE.Color(0.62, 0.36, 0.27);
    for (const m of meshes) {
      if (!/Regular_Male/.test(m.material.name)) continue;
      // bind-pose projection along each forearm: everything up to the wrist is sleeve (cuff near the end),
      // past the wrist is a leather glove. No bare skin below the collar in January.
      const g = m.geometry, n = g.attributes.position.count, col = new Float32Array(n * 3);
      const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, bones = m.skeleton.bones;
      const bpos = (re) => { const i = bones.findIndex((bb) => re.test(bb.name)); if (i < 0) return null; return new THREE.Vector3().setFromMatrixPosition(m.skeleton.boneInverses[i].clone().invert()); };
      const sides = ["l", "r"].map((sd) => ({ sd, L: bpos(new RegExp("^lowerarm_" + sd + "$")), H: bpos(new RegExp("^hand_" + sd + "$")) })).filter((q) => q.L && q.H);
      const glove = SRGB(0x3e2c1e), cuff = SRGB(0x3a2e20), pv = new THREE.Vector3(), ax = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        let arm = 0, side = null;
        for (let k = 0; k < 4; k++) { const nm = bones[SI.getComponent(i, k)]?.name || ""; const mm = /(lowerarm|upperarm|clavicle|hand|thumb|index|middle|ring|pinky)\w*_([lr])/.exec(nm); if (mm) { arm += SW.getComponent(i, k); side = mm[2]; } }
        let c = null;
        if (arm > 0.3 && side) {
          const q = sides.find((qq) => qq.sd === side);
          pv.fromBufferAttribute(g.attributes.position, i);
          let t = 0;
          if (q) { ax.subVectors(q.H, q.L); t = pv.clone().sub(q.L).dot(ax) / ax.lengthSq(); }
          c = t > 1.02 ? glove : t > 0.88 ? cuff : sleeve;
        }
        if (c) { col[i * 3] = c.r / skinAvg.r; col[i * 3 + 1] = c.g / skinAvg.g; col[i * 3 + 2] = c.b / skinAvg.b; }
        else { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 1; }
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      m.material.vertexColors = true; m.material.needsUpdate = true;
    }
    let chestZ = 0.1, backZ = -0.1;
    for (const m of meshes) {
      const n = m.geometry.attributes.position.count;
      for (let i = 0; i < n; i += 3) {
        m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld);
        if (Math.abs(v.x) < 0.06 && v.y > 1.15 && v.y < 1.35) { chestZ = Math.max(chestZ, v.z); backZ = Math.min(backZ, v.z); }
      }
    }
    const put = (bone, obj, x, y, z, rx = 0, ry = 0, rz = 0) => {
      obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz);
      model.add(obj); obj.updateMatrixWorld(true);
      bone.attach(obj);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.frustumCulled = false; } });
      return obj;
    };

    // ---- head (from the CC0 base character), white beard + grey hair from the hair kit ----
    const hb = B("Head");
    for (const c of [...head.scene.children]) {
      c.traverse((o) => { if (o.isMesh) { o.material.roughness = o.name === "eyes" ? 0.25 : 0.75; o.material.metalness = 0; if (o.name === "head" || o.parent?.name === "head") o.material.color.setRGB(1.0, 0.93, 0.88); } });
      put(hb, c, 0, 0, 0);
    }
    const hairM = M(SRGB(0xe6e2da), { roughness: 1 });
    const greyM = M(SRGB(0xb9b4ab), { roughness: 1 });
    for (const [g, mat, sc] of [[beardG, hairM, 1.0], [st.hairG, greyM, 1.0]]) {
      if (!g) continue;
      const o = g.scene;
      o.traverse((m) => { if (m.isMesh) m.material = mat; });
      o.scale.setScalar(sc);
      put(hb, o, 0, sc === 1 ? 0 : -0.1 * (sc - 1), sc === 1 ? 0 : 0.004);
    }
    // a heavier moustache + chin tuft so the beard reads at game distance
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), hairM);
    put(hb, tuft, 0, 1.585, 0.085, Math.PI + 0.25, 0, 0);

    // hat: pinched crown, band, wide brim tilted down at the front, headlamp on the band
    const hatM = M(SRGB(0x4f3b2a), { roughness: 0.95 }), bandM = M(PAL.belt);
    const hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.205, 0.012, 28), hatM);
    brim.scale.z = 1.12;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.12, 0.135, 18), hatM);
    crown.position.y = 0.07; crown.scale.z = 1.14;
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.18), hatM);
    dent.position.y = 0.135;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.121, 0.122, 0.026, 18), bandM);
    band.position.y = 0.017; band.scale.z = 1.14;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.034, 0.03), M(SRGB(0x26282a), { roughness: 0.5, metalness: 0.3 }));
    lamp.position.set(0, 0.032, 0.14);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    lens.position.set(0, 0.032, 0.156);
    st.lampLens = lens;
    hat.add(brim, crown, dent, band, lamp, lens);
    put(hb, hat, 0, 1.765, 0.005, 0.14, 0, 0);

    // ---- long wool coat skirt, skinned to pelvis + thighs so the hem swings with the stride ----
    const sp3 = B("spine_03"), sp2 = B("spine_02");
    {
      const N = 24, R = 6, yTop = 1.02, yBot = 0.5;
      const pos = [], idx = [], si = [], sw = [], uv = [];
      const iH = skeleton.bones.indexOf(B("pelvis")), iL = skeleton.bones.indexOf(B("thigh_l")), iR = skeleton.bones.indexOf(B("thigh_r"));
      for (let j = 0; j <= R; j++) {
        const t = j / R, y = lerp(yTop, yBot, t);
        const gap = 0.04 + 0.3 * t * t;
        const rx = lerp(0.19, 0.29, t), rz = lerp(0.15, 0.235, t);
        for (let i = 0; i <= N; i++) {
          // th = 0 at the back (-z), the open front at +z
          const th = lerp(-(Math.PI - gap), Math.PI - gap, i / N);
          const x = Math.sin(th) * rx, z = -Math.cos(th) * rz - 0.03;
          pos.push(x, y, z); uv.push(i / N, t);
          const lat = clamp(Math.abs(Math.sin(th)) * 1.4, 0, 1);
          const wT = Math.pow(t, 1.3) * (0.3 + 0.6 * lat);
          const sL = x > 0 ? 0.5 + 0.5 * lat : 0.5 - 0.5 * lat;
          si.push(iH, iL, iR, 0); sw.push(1 - wT, wT * sL, wT * (1 - sL), 0);
        }
      }
      for (let j = 0; j < R; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
      g.setIndex(idx); g.computeVertexNormals();
      const skirt = new THREE.SkinnedMesh(g, M(SRGB(0x5e4a30), { side: THREE.DoubleSide }));
      model.add(skirt);
      skirt.updateMatrixWorld(true);
      skirt.bind(skeleton, skirt.matrixWorld.clone());
      skirt.castShadow = true; skirt.frustumCulled = false;
    }
    // coat shoulders/collar: a turned-up collar and a yoke over the shirt
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.125, 0.09, 16, 1, true), M(PAL.collar, { side: THREE.DoubleSide }));
    put(sp3, collar, 0, 1.5, -0.03, -0.1, 0, 0);

    // ---- coat front: notched lapels folding back from the collar, a placket with horn buttons ----
    const lapM = M(SRGB(0x35281b), { roughness: 0.95, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) {
      const lap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.27, 0.014), lapM);
      put(sp3, lap, sd * 0.055, 1.3, chestZ + 0.014, -0.16, sd * 0.2, sd * 0.36);
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), lapM); // collar notch
      put(sp3, notch, sd * 0.085, 1.41, chestZ - 0.012, -0.3, sd * 0.4, sd * -0.5);
    }

    const btnM = M(SRGB(0xc9b48a), { roughness: 0.4 }), btnG = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 10); // pale horn
    for (let k = 0; k < 3; k++) {
      const bt = new THREE.Mesh(btnG, btnM);
      put(sp2, bt, -0.028, 1.2 - k * 0.065, chestZ + 0.016 - k * 0.004, Math.PI / 2, 0, 0);
    }

    // ---- chest: pack straps + rifle sling cross the front, buttons down the placket ----
    const strapM = M(SRGB(0x2b2016), { roughness: 0.7 });
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.38, 0.014), strapM);
      put(sp3, strap, s * 0.095, 1.27, chestZ + 0.012, -0.12, 0, s * -0.06);
    }
    const sling = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.012), M(SRGB(0x3a2a1a)));
    put(sp2, sling, 0.01, 1.2, chestZ + 0.026, -0.1, 0, 0.75);
    st.sling = sling;

    // ---- back: pack, bedroll / meat load, slung rifle ----
    const packM = M(SRGB(0x56462f)), rollM = M(SRGB(0x6b2f22)), meatM = M(SRGB(0x7a2e24), { roughness: 0.6 });
    const pack = new THREE.Group();
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.15), packM);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.16), M(SRGB(0x4a3c28)));
    flap.position.set(0, 0.14, -0.005);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.42, 12), rollM);
    roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.27, 0.01);
    const meat = new THREE.Group();
    const q1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.22), meatM); q1.position.set(0, -0.05, -0.12);
    const q2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.2), M(SRGB(0xd8d0c4))); q2.position.set(0, 0.3, -0.08);
    meat.add(q1, q2); meat.visible = false;
    pack.add(bag, flap, roll, meat);
    put(sp2, pack, 0, 1.25, backZ - 0.085);
    st.roll = roll; st.meat = meat;
    const steel = M(SRGB(0x2a2b2e), { roughness: 0.35, metalness: 0.8 }), wood = M(SRGB(0x5a3a22), { roughness: 0.6 });
    const rifle = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.62, 8), steel);
    barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.36;
    const recv = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.2), steel); recv.position.z = -0.02;
    const stk = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.085, 0.36), wood); stk.position.set(0, -0.02, 0.24);
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.04, 0.26), wood); fore.position.set(0, -0.02, -0.22);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 10), steel);
    scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.055, -0.04);
    rifle.add(barrel, recv, stk, fore, scope);
    const slung = new THREE.Group();
    slung.add(rifle);
    put(sp2, slung, -0.03, 1.22, backZ - 0.2, -1.3, Math.PI, -0.62);
    st.rifle = slung;

    // the model faces +Z; Harlan's root faces -Z
    const wrap = new THREE.Group();
    wrap.rotation.y = Math.PI;
    wrap.scale.set(1.04, 1.0, 1.06);
    wrap.add(model);
    const mixer = new THREE.AnimationMixer(model);
    for (const clip of anims.animations) {
      // keep the pelvis in place horizontally; the game moves Harlan
      for (const t of clip.tracks) if (/pelvis\.position$/.test(t.name)) {
        const vals = t.values; const x0 = vals[0], z0 = vals[2];
        for (let i = 0; i < vals.length; i += 3) { vals[i] = x0; vals[i + 2] = z0; }
      }
      const a = mixer.clipAction(clip);
      a.enabled = true; a.setEffectiveWeight(0); a.play();
      st.acts[clip.name] = a; st.w[clip.name] = 0;
    }
    st.w.Idle_Loop = 1; st.acts.Idle_Loop?.setEffectiveWeight(1);
    st.mixer = mixer; st.model = wrap;
    // a round of firewood to sit on at the watch (only shown while sitting)
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 9), new THREE.MeshStandardMaterial({ color: SRGB(0x4a3a2a), roughness: 1 }));
    seat.rotation.z = Math.PI / 2; seat.castShadow = true; seat.visible = false; st.seat = seat; root.add(seat);
    for (const c of [...root.children]) c.visible = !!(c.isMesh && c.material?.map === proc.shadowTex);
    root.add(wrap);
    st.ready = true;
    api.setRifle(lastRifle); api.setMeat(lastMeat);
  }

  {
    const L = new GLTFLoader();
    const get = (f) => new Promise((res, rej) => L.load(URL_(f), res, undefined, rej));
    Promise.all([get("harlan_body.glb"), get("harlan_anims.glb"), get("harlan_head.glb"), get("Hair_Beard.glb"), get("Hair_SimpleParted.glb")])
      .then(([body, anims, head, beard, hair]) => { st.hairG = hair; dress(body, anims, head, beard); })
      .catch((e) => console.warn("harlan model failed, keeping procedural", e));
  }

  const qa = new THREE.Quaternion(), ea = new THREE.Euler();
  function addRot(bone, x, y = 0, z = 0) {
    if (!bone) return;
    qa.setFromEuler(ea.set(x, y, z));
    bone.quaternion.multiply(qa);
  }

  const api = {
    root,
    get neck() { return proc.neck; },
    shadowTex: proc.shadowTex,
    hasRifle: true,
    get ready() { return st.ready; },
    setRifle(on) {
      lastRifle = on; proc.setRifle(on); api.hasRifle = on;
      if (st.rifle) { st.rifle.visible = on; st.sling.visible = on; }
    },
    setMeat(on) {
      lastMeat = on; proc.setMeat(on);
      if (st.meat) { st.meat.visible = on; st.roll.visible = !on; }
    },
    setLamp(on) { if (st.lampLens) st.lampLens.material.color.setHex(on ? 0xfff4dd : 0x333333); },
    /** speed m/s, dt seconds, opts {sneak, afraid, aiming, sitting, lookYaw, lookPitch, pose} */
    animate(speed, dt, o = {}) {
      if (!st.ready) return proc.animate(speed, dt, o);
      const moving = speed > 0.15;
      const tgt = {};
      let loco = null;
      if (o.pose && st.acts[o.pose]) tgt[o.pose] = 1;
      else if (o.sitting) tgt.Sitting_Idle_Loop = 1;
      else if (o.sneak) { if (moving) { tgt.Crouch_Fwd_Loop = 1; loco = "Crouch_Fwd_Loop"; } else tgt.Crouch_Idle_Loop = 1; }
      else if (!moving) tgt.Idle_Loop = 1;
      else {
        // walk → jog → a leaning run. Weights crossfade; playback rate keeps the feet with the ground.
        const jog = smooth(1.55, 3.05, speed);
        const sprint = smooth(3.35, 4.7, speed);
        tgt.Walk_Loop = (1 - jog) * (1 - sprint);
        tgt.Jog_Fwd_Loop = jog * (1 - sprint);
        tgt.Sprint_Loop = sprint;
        loco = sprint > 0.55 ? "Sprint_Loop" : jog > 0.5 ? "Jog_Fwd_Loop" : "Walk_Loop";
      }
      const rate = 1 - Math.exp(-3.4 * dt);
      let sum = 0;
      for (const n in st.acts) { st.w[n] += ((tgt[n] || 0) - st.w[n]) * rate; if (st.w[n] < 0.002) st.w[n] = 0; sum += st.w[n]; }
      for (const n in st.acts) st.acts[n].setEffectiveWeight(sum > 0 ? st.w[n] / sum : 0);
      // speed-matched playback, walk and jog phase-locked so the blend never scissors
      const walk = st.acts.Walk_Loop, jog = st.acts.Jog_Fwd_Loop, sprint = st.acts.Sprint_Loop, cr = st.acts.Crouch_Fwd_Loop;
      const ts = (n) => clamp(speed / NATIVE[n], 0.55, 1.75);
      const locoNames = ["Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop"].filter((n) => st.acts[n] && st.w[n] > 0.02);
      if (locoNames.length && moving && !o.sneak && !o.pose && !o.sitting) {
        let stride = 0, wsum = 0;
        for (const n of locoNames) {
          const w = st.w[n];
          stride += w * NATIVE[n] * st.acts[n].getClip().duration;
          wsum += w;
        }
        stride = Math.max(0.45, stride / wsum);
        const cps = clamp(speed / stride, 0.32, 1.7);
        for (const n of locoNames) st.acts[n].timeScale = cps * st.acts[n].getClip().duration;
        let lead = locoNames[0];
        for (const n of locoNames) if (st.w[n] > st.w[lead]) lead = n;
        const lt = (st.acts[lead].time % st.acts[lead].getClip().duration) / st.acts[lead].getClip().duration;
        for (const n of locoNames) if (n !== lead) st.acts[n].time = lt * st.acts[n].getClip().duration;
      } else {
        if (walk) walk.timeScale = moving ? ts("Walk_Loop") : 1;
        if (jog) jog.timeScale = moving ? ts("Jog_Fwd_Loop") : 1;
        if (sprint) sprint.timeScale = moving ? ts("Sprint_Loop") : 1;
      }
      if (cr) cr.timeScale = moving ? ts("Crouch_Fwd_Loop") : 1;
      if (o.afraid) st.mixer.timeScale = 1.05; else st.mixer.timeScale = 1;
      st.mixer.update(dt);
      if (loco) st.phase += dt * st.acts[loco].timeScale / st.acts[loco].getClip().duration * Math.PI * 2;
      // an old man's posture: a little stoop, head forward; fear draws the shoulders up
      const b = st.bones;
      const stoop = o.sneak ? 0 : 0.08;
      const runK = o.sneak || o.pose || o.sitting ? 0 : smooth(2.3, 4.6, speed);
      const sway = Math.sin(st.phase) * (moving ? 0.055 + runK * 0.025 : 0.012);
      const breath = Math.sin(performance.now() / 1000 * (o.afraid ? 2.8 : 1.35)) * (o.afraid ? 0.02 : 0.012);
      const aimSway = o.aiming ? Math.sin(performance.now() / 1000 * 0.7) * 0.02 : 0;
      addRot(b.pelvis, breath * 0.4, 0, sway);
      addRot(b.spine_01, runK * 0.16 + breath, 0, -sway * 0.45);
      addRot(b.spine_02, runK * 0.1 + breath * 0.6, aimSway, 0);
      addRot(b.spine_03, stoop * 0.6 + runK * 0.06 + breath * 0.4, aimSway * 0.6, 0);
      addRot(b.neck_01, stoop * 0.3 - runK * 0.08 - (o.lookPitch || 0) * 0.4, (o.lookYaw || 0) * 0.4);
      addRot(b.Head, -stoop * 0.55 - (o.lookPitch || 0) * 0.6, (o.lookYaw || 0) * 0.6);
      // ground contact: kneel/sit clips carry their own hip height, so snap the lowest foot/knee to the snow
      const low = (n, pad) => { if (!b[n]) return 1e9; b[n].getWorldPosition(TV); root.worldToLocal(TV); return TV.y - pad; };
      let tgtY = 0;
      if (o.pose || o.sitting) {
        st.model.position.y = st.groundY || 0; root.updateMatrixWorld(true);
        const m = Math.min(low("foot_l", 0.07), low("foot_r", 0.07), low("ball_l", 0.03), low("ball_r", 0.03), low("calf_l", 0.07), low("calf_r", 0.07), low("pelvis", o.sitting ? 0.12 : 0.1));
        tgtY = (st.groundY || 0) - m;
      }
      st.groundY = (st.groundY || 0) + (tgtY - (st.groundY || 0)) * (1 - Math.exp(-10 * dt));
      st.model.position.y = st.groundY;
      if (st.seat) {
        st.seat.visible = !!o.sitting && !o.pose;
        if (st.seat.visible) { b.pelvis.getWorldPosition(TV); root.worldToLocal(TV); st.seat.position.set(TV.x, Math.max(0.12, TV.y - 0.22), TV.z + 0.04); }
      }
      // footfalls at the real plants: a foot that was coming down stops near the floor
      let plant = false;
      if (loco && moving) {
        for (const sd of ["l", "r"]) {
          const y = low("foot_" + sd, 0), k = "fy_" + sd, v = (y - (st[k] ?? y)) / Math.max(dt, 1e-3);
          if ((st["fv_" + sd] ?? 0) < -0.05 && v >= -0.05 && y < (st.floorY ?? y) + 0.06) plant = sd;
          st["fv_" + sd] = v; st[k] = y; st.floorY = Math.min(y, (st.floorY ?? y) + dt * 0.05);
        }
      }
      return { step: !!plant, plant };
      
      
    },
    phase: () => (st.ready ? st.phase : proc.phase()),
    _st: st,
  };
  return api;
}
