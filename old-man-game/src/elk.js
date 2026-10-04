// Rigged elk (CC0 Quaternius "Stag" for the bull, "Deer" for the cows, Ultimate Animated Animal Pack).
// Same pattern as Harlan: the procedural elk (creatures.js) is the fallback and keeps the invisible hit
// meshes; the skinned model rides on its root and plays the matching clip.
import * as THREE from "three";
import { GLTFLoader } from "three/addons";
import { buildElk as buildProcElk } from "./creatures.js";
import { track } from "./loadprog.js";

const bufs = {};
const getBuf = (url) => (bufs[url] ||= track(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); })));
// game mode -> clip
const CLIP = { stand: "Idle", graze: "Eating", walk: "Walk", run: "Gallop", alert: "Idle_2", bed: "Idle_Headlow", down: "Death" };
// low-poly source is flat shaded (split verts per face); average normals across coincident positions so
// the hide reads as smooth muscle instead of facets. Topology and skin weights are untouched.
function smoothNormals(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (!n) { geo.computeVertexNormals(); return; }
  const acc = new Map(), key = (i) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i); const a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
  n.needsUpdate = true;
}
const TV = new THREE.Vector3(), TQ = new THREE.Quaternion(), TQ2 = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
// rotate a bone about a world-space axis (works whatever the rig's local bone axes are)
function turnBone(bone, axisW, ang) {
  if (!bone || !ang) return;
  bone.parent.getWorldQuaternion(TQ).invert();
  TV.copy(axisW).applyQuaternion(TQ);
  bone.quaternion.premultiply(TQ2.setFromAxisAngle(TV, ang));
}
// metres per second each clip covers at our scale (feet planted)
const NATIVE = { Walk: 1.5, Gallop: 7.5 };
const lin = (hex) => new THREE.Color().setHex(hex, THREE.SRGBColorSpace);

export function buildElk({ bull = true } = {}) {
  const proc = buildProcElk({ bull });
  const st = { ready: false, mixer: null, acts: {}, cur: null, mode: null, model: null, bones: {}, last: null, speed: 0, look: null, lookYaw: 0 };
  const holder = new THREE.Group();
  proc.root.add(holder);
  const loader = new GLTFLoader();
  getBuf(new URL(`../assets/models/${bull ? "elk_bull" : "elk_cow"}.glb`, import.meta.url).href)
    .then((buf) => new Promise((res, rej) => loader.parse(buf.slice(0), "", res, rej)))
    .then((g) => {
      const m = g.scene;
      m.scale.setScalar(bull ? 0.5 : 0.56);
      m.rotation.y = Math.PI; // file faces +Z, the game's elk face -Z
      m.position.z = bull ? 0.25 : 0.2;
      m.traverse((o) => {
        if (/Horns/.test(o.name)) o.scale.multiplyScalar(1.3); // wapiti racks dwarf a deer's
        if (!o.isMesh) return;
        o.castShadow = true; o.frustumCulled = false;
        if (!o.geometry.userData.smoothed) { smoothNormals(o.geometry); o.geometry.userData.smoothed = true; }
        let horn = false; for (let q = o; q; q = q.parent) if (/Horns/.test(q.name)) horn = true;
        if (horn) { o.material = o.material.clone(); o.material.color.copy(lin(0xa89272)); o.material.roughness = 0.8; return; } // pale, polished tines
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mt of mats) {
          mt.roughness = 0.92; mt.metalness = 0;
          const c = mt.color, l = c.r + c.g + c.b;
          // elk palette: pale tan-grey body, dark chocolate neck/legs, cream rump; keep blacks black
          if (l > 0.3 && l < 0.6) c.copy(lin(bull ? 0x8f7352 : 0x977a58));
          else if (l >= 0.9) c.copy(lin(bull ? 0x4e3726 : 0xcdb894)); // a bull's dark mane / a cow's pale bib
          else if (l > 0.1 && l <= 0.3) c.copy(lin(0x3b2a1c));
        }
      });
      holder.add(m);
      st.mixer = new THREE.AnimationMixer(m);
      for (const clip of g.animations) {
        const a = st.mixer.clipAction(clip);
        if (clip.name === "Death") { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
        st.acts[clip.name] = a;
      }
      proc.root.traverse((o) => { if (o.isMesh && o.material?.visible !== false && !isIn(o, holder)) o.visible = false; });
      m.traverse((o) => { if (o.isBone) st.bones[o.name] = o; });
      st.model = m; st.ready = true;
      if (st.mode) play(st.mode, true);
    })
    .catch((e) => console.warn("elk model failed, using the procedural elk", e?.message || e));
  function isIn(o, p) { for (let q = o; q; q = q.parent) if (q === p) return true; return false; }
  function play(mode, snap) {
    const name = CLIP[mode] || "Idle", a = st.acts[name];
    if (!a || st.cur === a) return;
    a.reset().play();
    if (st.cur && !snap) st.cur.crossFadeTo(a, mode === "down" ? 0.15 : 0.35, false);
    else if (st.cur) st.cur.stop();
    st.cur = a;
  }
  return {
    root: proc.root, hitMeshes: proc.hitMeshes,
    get ready() { return st.ready; }, _st: st,
    /** world x/z of what the elk should watch when alert (Harlan), or null */
    look(x, z) { st.look = x == null ? null : { x, z }; },
    animate(mode, dt, t) {
      proc.animate(mode, dt, t); // keeps the procedural pose (and hit boxes) in step; hidden once loaded
      if (!st.ready) return;
      if (mode !== st.mode) { st.mode = mode; play(mode); }
      holder.position.y = mode === "bed" ? -0.75 : mode === "run" ? Math.pow(Math.max(0, Math.sin(t * 9)), 2) * 0.1 : 0;
      // gait matched to how fast the game actually moves him (measured from the root), so hooves plant
      const p = proc.root.position;
      if (st.last && dt > 0) { const v = Math.hypot(p.x - st.last.x, p.z - st.last.z) / dt; st.speed += (v - st.speed) * (1 - Math.exp(-6 * dt)); }
      st.last = { x: p.x, z: p.z };
      if (st.cur) st.cur.timeScale = mode === "run" ? Math.min(1.5, Math.max(0.55, st.speed / NATIVE.Gallop)) : mode === "walk" ? Math.min(1.6, Math.max(0.4, st.speed / NATIVE.Walk)) : 1;
      st.mixer.update(dt);
      // an alert elk turns its head and neck to stare at what it heard (Harlan)
      let want = 0;
      if (st.look && (mode === "alert" || mode === "stand")) {
        TV.set(st.look.x, p.y + 1.5, st.look.z); proc.root.worldToLocal(TV);
        want = Math.max(-1.3, Math.min(1.3, Math.atan2(-TV.x, -TV.z))); // elk faces -Z
        if (mode === "stand") want *= 0.4;
      }
      st.lookYaw += (want - st.lookYaw) * (1 - Math.exp(-3 * dt));
      const b = st.bones;
      turnBone(b.Neck1, UP, st.lookYaw * 0.3); turnBone(b.Neck2, UP, st.lookYaw * 0.3); turnBone(b.Head, UP, st.lookYaw * 0.4);
    },
  };
}
