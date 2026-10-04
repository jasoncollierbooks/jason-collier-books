// Skinned humans on the Quaternius CC0 rig (see CREDITS.md).
// One body is loaded, cloned per person, dyed, and dressed. Locomotion clips crossfade;
// jumps, swings, and rolls layer on that skeleton.
import * as THREE from "three";
import { GLTFLoader } from "three/addons";
import { createHuman as createCapsule, trailKey, handbillMesh, softDot } from "./rigs.js?v=5";
import { createTrail, swingWeapon } from "./swing.js?v=5";
import {
  dusterGeometry, collarGeometry, coatTailGeometry, sleeveGeometry,
  coverallGeometry, lapelGeometry, wrenchGroup, spyglassGroup, goggleRig,
} from "./costume.js?v=1";

const NATIVE = { Walk_Loop: 1.15, Jog_Fwd_Loop: 2.55, Sprint_Loop: 4.35, Crouch_Fwd_Loop: 0.82 };
const LOCO = ["Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop"];
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

let assetsReady = null;
let loading = null;
const queue = [];

function modelUrl(file) {
  return new URL("../assets/models/" + file, import.meta.url).href;
}

function loadGLB(file) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => loader.load(modelUrl(file), resolve, undefined, reject));
}

function ensure() {
  if (!loading) {
    loading = Promise.all([loadGLB("body.glb"), loadGLB("anims.glb"), loadGLB("head.glb"), loadGLB("hair.glb")])
      .then(([body, anims, head, hair]) => {
        for (const clip of anims.animations) {
          for (const track of clip.tracks) {
            if (!/pelvis\.position$/.test(track.name)) continue;
            const v = track.values;
            const x0 = v[0];
            const z0 = v[2];
            for (let i = 0; i < v.length; i += 3) {
              v[i] = x0;
              v[i + 2] = z0;
            }
          }
        }
        assetsReady = { body: body.scene, clips: anims.animations, head: head.scene, hair: hair.scene };
        for (const api of queue) dress(api, assetsReady);
        queue.length = 0;
        return assetsReady;
      })
      .catch((err) => {
        console.warn("Book Worlds rig failed; using the standby figure.", err);
        for (const api of queue) api._fail();
        queue.length = 0;
        throw err;
      });
  }
  return loading;
}

export function whenCastReady() {
  return ensure().catch(() => null);
}

function cloneSkinned(source) {
  const clone = source.clone(true);
  const srcOf = new Map();
  const cloneOf = new Map();
  const walk = (a, b) => {
    srcOf.set(b, a);
    cloneOf.set(a, b);
    for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]);
  };
  walk(source, clone);
  clone.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const src = srcOf.get(node);
    node.skeleton = src.skeleton.clone();
    node.bindMatrix.copy(src.bindMatrix);
    node.skeleton.bones = src.skeleton.bones.map((bone) => cloneOf.get(bone));
    node.bind(node.skeleton, node.bindMatrix);
    const mats = Array.isArray(src.material) ? src.material : [src.material];
    const cloned = mats.map((m) => m.clone());
    node.material = Array.isArray(src.material) ? cloned : cloned[0];
    node.castShadow = true;
    node.frustumCulled = false;
  });
  return clone;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function addEuler(bone, x, y, z) {
  if (!bone) return;
  _q.setFromEuler(_e.set(x, y, z, "XYZ"));
  bone.quaternion.multiply(_q);
}

function gradeMesh(root, test, hex, rough = 0.86, kind = "cloth") {
  const pack = surfLib()[kind] || surfLib().cloth;
  root.traverse((o) => {
    if (!o.isMesh || !test(o.name || "")) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m || !m.color) continue;
      m.color.setHex(hex);
      if (m.roughness != null) m.roughness = rough;
      if (m.metalness != null) m.metalness = kind === "leather" ? 0.12 : 0.03;
      m.map = pack.map;
      m.normalMap = pack.nrm;
      m.normalScale = new THREE.Vector2(0.5, 0.5);
      m.flatShading = false;
      m.needsUpdate = true;
    }
  });
}

const _bladeBasis = new THREE.Matrix4();
const _bladeX = new THREE.Vector3(0, 0, -1);
const _bladeY = new THREE.Vector3(0, -1, 0);
const _bladeZ = new THREE.Vector3(1, 0, 0);

// Grip the weapon so its striking axis leaves the fist along the fingers.
// flip: the Trail Key's edge is authored along local -Y.
function holdBlade(bone, obj, tip, flip) {
  obj.position.set(0, 0.1, 0.04);
  if (flip) obj.quaternion.setFromRotationMatrix(_bladeBasis.makeBasis(_bladeX, _bladeY, _bladeZ));
  else obj.quaternion.identity();
  obj.userData.bladeTip = tip;
  bone.add(obj);
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !(o.material && o.material.transparent);
      o.frustumCulled = false;
    }
  });
  return obj;
}

function put(model, bone, obj, x, y, z, rx = 0, ry = 0, rz = 0) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  model.add(obj);
  model.updateMatrixWorld(true);
  bone.attach(obj);
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !(o.material && o.material.transparent);
      o.frustumCulled = false;
    }
  });
  return obj;
}

// Head and hair glbs are authored in character space. Bake them into the head bone
// so they sit on the skull and follow the neck.
function weldToBone(model, bone, source) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
  source.updateMatrixWorld(true);
  const added = [];
  source.traverse((o) => {
    if (!o.isMesh) return;
    const mesh = new THREE.Mesh(o.geometry.clone(), o.material.clone());
    mesh.name = o.name || "";
    mesh.geometry.applyMatrix4(o.matrixWorld);
    mesh.geometry.applyMatrix4(inv);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    bone.add(mesh);
    added.push(mesh);
  });
  return added;
}

function paintTex(size, draw, srgb) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function heightNormal(size, draw, strength) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const src = c.getContext("2d").getImageData(0, 0, size, size).data;
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = src[i * 4] / 255;
  const out = c.getContext("2d").createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)];
      const r = h[y * size + ((x + 1) % size)];
      const u = h[((y - 1 + size) % size) * size + x];
      const d = h[((y + 1) % size) * size + x];
      const dx = (l - r) * strength;
      const dy = (u - d) * strength;
      const i = (y * size + x) * 4;
      out.data[i] = (dx * 0.5 + 0.5) * 255;
      out.data[i + 1] = (dy * 0.5 + 0.5) * 255;
      out.data[i + 2] = 255;
      out.data[i + 3] = 255;
    }
  }
  c.getContext("2d").putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function surfLib() {
  if (surfLib.cache) return surfLib.cache;
  const skinDraw = (g, n) => {
    g.fillStyle = "#d7d0c8";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(90,70,60,${0.04 + (i % 5) * 0.015})`;
      g.fillRect((i * 37) % n, (i * 19) % n, 1, 1);
    }
  };
  const clothDraw = (g, n) => {
    g.fillStyle = "#e4e0d8";
    g.fillRect(0, 0, n, n);
    g.strokeStyle = "rgba(70,60,50,0.18)";
    for (let y = 0; y < n; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(n, y);
      g.stroke();
    }
    for (let x = 0; x < n; x += 4) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, n);
      g.stroke();
    }
  };
  const leatherDraw = (g, n) => {
    g.fillStyle = "#c8b49a";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 80; i++) {
      g.strokeStyle = `rgba(70,48,30,${0.08 + (i % 4) * 0.03})`;
      g.beginPath();
      g.moveTo((i * 13) % n, 0);
      g.bezierCurveTo(n * 0.3, (i * 17) % n, n * 0.7, (i * 29) % n, n, (i * 11) % n);
      g.stroke();
    }
  };
  const pack = (draw, rough) => ({
    map: paintTex(256, draw, true),
    nrm: heightNormal(256, draw, rough),
  });
  surfLib.cache = { skin: pack(skinDraw, 2.2), cloth: pack(clothDraw, 3.4), leather: pack(leatherDraw, 2.8) };
  return surfLib.cache;
}

function clothMat(hex, rough = 0.88, kind = "cloth") {
  const pack = surfLib()[kind] || surfLib().cloth;
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: rough,
    metalness: kind === "leather" ? 0.12 : 0.02,
    map: pack.map,
    normalMap: pack.nrm,
    normalScale: new THREE.Vector2(kind === "skin" ? 0.35 : 0.55, kind === "skin" ? 0.35 : 0.55),
  });
}

let leatherPromise = null;
function leatherTextures() {
  if (leatherPromise) return leatherPromise;
  const low = Math.min(window.innerWidth || 800, window.innerHeight || 800) < 520;
  const folder = low ? "512" : "1k";
  const load = (file, srgb) => new Promise((resolve) => {
    const url = new URL(`../assets/tex/${folder}/${file}`, import.meta.url).href;
    const tex = new THREE.TextureLoader().load(url, () => resolve(tex), undefined, () => resolve(null));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  });
  leatherPromise = Promise.all([
    load("leather_col.jpg", true),
    load("leather_nrm.jpg", false),
    load("leather_rgh.jpg", false),
  ]).then(([col, nrm, rgh]) => {
    let grain = null;
    if (col && col.image) {
      const img = col.image;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const g = canvas.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = px[i] * 0.3 + px[i + 1] * 0.52 + px[i + 2] * 0.18;
        const v = 148 + l * 0.42;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      g.putImageData(data, 0, 0);
      grain = new THREE.CanvasTexture(canvas);
      grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
      grain.colorSpace = THREE.SRGBColorSpace;
      grain.anisotropy = 8;
      grain.needsUpdate = true;
    }
    for (const tex of [col, grain, nrm, rgh]) {
      if (tex) tex.repeat.set(2, 2);
    }
    return { col, grain, nrm, rgh };
  });
  return leatherPromise;
}

function bindLeather(mat) {
  leatherTextures().then((pack) => {
    if (!mat || !pack) return;
    if (pack.nrm) mat.normalMap = pack.nrm;
    if (pack.rgh) mat.roughnessMap = pack.rgh;
    mat.normalScale = new THREE.Vector2(1.15, 1.15);
    if (pack.grain) mat.map = pack.grain;
    mat.needsUpdate = true;
  }).catch(() => {});
}

function droopBrim(radius, droop) {
  const geo = new THREE.CylinderGeometry(radius, radius + 0.01, 0.016, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const edge = Math.max(0, (d - radius * 0.4) / Math.max(0.001, radius));
    pos.setY(i, y - edge * edge * droop);
  }
  geo.computeVertexNormals();
  return geo;
}

function creasedCrown(radius, height) {
  const geo = new THREE.CylinderGeometry(radius * 0.92, radius + 0.02, height, 16, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const top = y / height + 0.5;
    const pinch = 1 - top * 0.28;
    pos.setX(i, x * pinch);
    pos.setZ(i, z * (1 - top * 0.08));
    if (top > 0.82) pos.setY(i, y - (top - 0.82) * height * 0.35);
  }
  geo.computeVertexNormals();
  return geo;
}

function metalMat(hex, rough = 0.34) {
  const mat = clothMat(hex, rough, "leather");
  mat.metalness = 0.72;
  mat.roughness = rough;
  return mat;
}

// Extra costume pieces for the airship crew. Trail outfits never set these flags.
function dressAirship(model, B, spec, crown, faceZ) {
  const air = spec.goggles || spec.cigar || spec.newsboy || spec.stubble || spec.messy
    || spec.crossBelts || spec.gloves || spec.soot || spec.toolbelt || spec.wrench;
  if (!air) return;

  if (spec.newsboy) {
    const hat = new THREE.Group();
    const hatM = clothMat(spec.hat || 0x3d4a32, 0.7, "leather");
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.18), hatM);
    brim.position.set(0, 0, 0.05);
    const crownMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.16), hatM);
    crownMesh.position.y = 0.04;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.168, 0.016, 0.168), clothMat(0x2a2418, 0.5, "leather"));
    band.position.y = 0.014;
    hat.add(brim, crownMesh, band);
    put(model, B("Head"), hat, 0, crown + 0.01, 0.02, spec.hatPitch || 0.1, 0, spec.hatTilt || -0.05);
  }

  if (spec.goggles) {
    const brass = metalMat(0xc6a15a, 0.3);
    const glass = new THREE.MeshStandardMaterial({
      color: 0x9ec8d4, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.72,
    });
    const g = goggleRig(brass, glass, clothMat(0x3a2a22, 0.7, "leather"));
    put(model, B("Head"), g, 0, crown + 0.02, faceZ * 0.15, -0.62, 0, 0);
  }

  if (spec.stubble) {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.012), clothMat(0x3a2c22, 0.95));
    put(model, B("Head"), patch, 0, crown - 0.195, faceZ + 0.004);
  }

  if (spec.cigar) {
    const group = new THREE.Group();
    const cigar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.09, 6), clothMat(0x6a4030, 0.72, "leather"));
    cigar.rotation.z = Math.PI / 2;
    const ash = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), clothMat(0x9a9088, 0.92));
    ash.position.x = 0.046;
    group.add(cigar, ash);
    put(model, B("Head"), group, 0.028, crown - 0.175, faceZ + 0.028, 0.15, 0.35, 1.15);
  }

  if (spec.ownHair && spec.messy) {
    const hairM = clothMat(spec.hair || 0x3a2416, 1);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM);
    cap.scale.set(1.08, 0.72, 1.12);
    put(model, B("Head"), cap, 0, crown - 0.01, -0.01);
    for (let i = 0; i < 11; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 5), hairM);
      const a = (i / 11) * Math.PI * 2;
      const lift = i % 2 === 0 ? 0.06 : 0.02;
      put(model, B("Head"), tuft, Math.sin(a) * 0.07, crown + lift, Math.cos(a) * 0.05 - 0.02, 0.5, a, 0.2);
    }
    const sideburn = clothMat(spec.hair || 0x3a2416, 1);
    for (const s of [-1, 1]) {
      const burn = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.02), sideburn);
      put(model, B("Head"), burn, s * 0.09, crown - 0.12, faceZ * 0.25);
    }
  }

  if (spec.ownHair && spec.newsboy) {
    const bobM = clothMat(spec.hair || 0x14110e, 0.95);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.78), bobM);
    bob.scale.set(1.02, 1.2, 1.05);
    put(model, B("Head"), bob, 0, crown - 0.1, -0.01);
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.04), bobM);
    put(model, B("Head"), bangs, 0, crown - 0.07, faceZ * 0.72);
    for (const s of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), bobM);
      put(model, B("Head"), lock, s * 0.1, crown - 0.16, faceZ * 0.35);
    }
  }

  if (spec.coverall) {
    const bibM = clothMat(spec.cloth || 0x4e6438, 0.82, "cloth");
    bibM.side = THREE.DoubleSide;
    const shell = new THREE.Mesh(coverallGeometry(), bibM);
    put(model, B("pelvis"), shell, 0, 0, 0);
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.04), bibM);
    put(model, B("spine_02"), bib, 0, 1.22, 0.15);
    const strapM = clothMat(0x2a2418, 0.55, "leather");
    bindLeather(strapM);
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.32, 0.016), strapM);
      put(model, B("spine_02"), strap, s * 0.08, 1.34, 0.12, 0.12, 0, s * 0.18);
    }
  }

  if (spec.soot) {
    const soot = clothMat(0x2a2420, 0.96);
    for (const s of [-1, 1]) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), soot);
      put(model, B("Head"), spot, s * 0.048, crown - 0.11, faceZ * 0.85);
    }
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), soot);
    put(model, B("Head"), cheek, 0.038, crown - 0.15, faceZ * 0.9);
  }

  if (spec.crossBelts) {
    const belt = clothMat(0x4a3424, 0.62, "leather");
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.52, 0.018), belt);
      put(model, B("spine_02"), strap, s * 0.01, 1.16, 0.11, 0.12, 0, s * 0.72);
    }
    const buck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.016), metalMat(0xc6a15a, 0.32));
    put(model, B("spine_02"), buck, 0, 1.02, 0.16);
  }

  if (spec.toolbelt) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.12), clothMat(0x3a3028, 0.6, "leather"));
    put(model, B("spine_01"), strap, 0, 0.95, 0.06);
    const pouchM = clothMat(0x5a4030, 0.75, "leather");
    for (const s of [-1, 1]) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.04), pouchM);
      put(model, B("spine_01"), pouch, s * 0.1, 0.9, 0.12);
    }
  }

  model.updateMatrixWorld(true);
  const grip = new THREE.Vector3();
  if (spec.gloves) {
    const glove = clothMat(0x2a2420, 0.7, "leather");
    for (const name of ["hand_r", "hand_l"]) {
      const bone = B(name);
      if (!bone) continue;
      bone.getWorldPosition(grip);
      const mitt = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.065), glove);
      put(model, bone, mitt, grip.x, grip.y, grip.z);
    }
  }
  if (spec.wrench) {
    const bone = B("hand_r");
    if (bone) {
      const wrench = wrenchGroup(metalMat(0xd4b46a, 0.28));
      holdBlade(bone, wrench, new THREE.Vector3(0, 0.16, 0), false);
      wrench.position.y = 0.08;
    }
  }
  if (spec.spyglass) {
    const glass = spyglassGroup(metalMat(0xc6a15a, 0.32), clothMat(0x4a3428, 0.6, "leather"));
    put(model, B("spine_01"), glass, 0.2, 0.98, 0.1, 0.15, 0, 1.25);
  }
}

export function createHuman(spec) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, depthWrite: false, opacity: 0.4, color: 0x140e0a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.scale.setScalar(1.15);
  shadow.renderOrder = 1;
  root.add(shadow);

  const api = {
    root,
    hand: null,
    glow: null,
    neck: null,
    skinned: false,
    update() { return { step: false }; },
    _fail() {
      const cap = createCapsule({ ...spec, key: api._keyOn !== false });
      spin.add(cap.root);
      api.keyMesh = cap.key || null;
      if (api.keyMesh) api.keyMesh.visible = api._keyOn !== false;
      api.hand = cap.hand;
      api.glow = cap.glow;
      api.neck = cap.neck;
      api.update = (dt, a) => cap.update(dt, a);
    },
    _spec: spec,
    _spin: spin,
    _keyOn: true,
    keyMesh: null,
    setKey(on) {
      api._keyOn = !!on;
      if (api.keyMesh) api.keyMesh.visible = api._keyOn;
    },
    _sidearm: "rifle",
    setSidearm(which) { api._sidearm = which === "revolver" ? "revolver" : "rifle"; },
  };
  if (assetsReady) dress(api, assetsReady);
  else {
    queue.push(api);
    ensure();
  }
  return api;
}

function winchester() {
  const g = new THREE.Group();
  const wood = clothMat(0x6a4328, 0.62, "leather");
  const steel = metalMat(0x9aa0a6, 0.28);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.055), wood);
  stock.position.y = -0.22;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.62, 6), steel);
  barrel.position.y = 0.22;
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.03), steel);
  lever.position.set(0, -0.02, 0.03);
  g.add(stock, barrel, lever);
  return g;
}

function colt() {
  const g = new THREE.Group();
  const wood = clothMat(0x5a3824, 0.55, "leather");
  const steel = metalMat(0x8e949c, 0.32);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.04), wood);
  grip.position.y = -0.04;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, 0.08);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), steel);
  cyl.rotation.z = Math.PI / 2;
  cyl.position.y = 0.03;
  g.add(grip, barrel, cyl);
  return g;
}

function dress(api, assets) {
  const spec = api._spec;
  const model = cloneSkinned(assets.body);
  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const B = (n) => bones[n];

  gradeMesh(model, (n) => /Arms/.test(n), spec.sleeves || spec.coat || spec.cloth || 0xc4a574, 0.84, "cloth");
  gradeMesh(model, (n) => /Body/.test(n), spec.cloth || 0xc4a574, 0.88, "cloth");
  gradeMesh(model, (n) => /Legs/.test(n), spec.pants || 0x4a453c, 0.9, "cloth");
  gradeMesh(model, (n) => /Feet/.test(n), spec.boots || 0x2c2118, 0.62, "leather");

  const headMeshes = weldToBone(model, B("Head"), assets.head.clone(true));
  for (const mesh of headMeshes) {
    if (!mesh.material) continue;
    if (mesh.material.color && /head|brows/i.test(mesh.name)) {
      const skin = surfLib().skin;
      mesh.material.color.setHex(spec.skin || 0xd2a07c);
      mesh.material.map = skin.map;
      mesh.material.normalMap = skin.nrm;
      mesh.material.normalScale = new THREE.Vector2(0.28, 0.28);
      mesh.material.roughness = 0.62;
      mesh.material.needsUpdate = true;
    }
    if (/eyes/i.test(mesh.name)) {
      mesh.material.roughness = 0.25;
      mesh.material.metalness = 0.04;
      if (spec.eyes) {
        mesh.material.color.setHex(spec.eyes);
        if (mesh.material.emissive) mesh.material.emissive.setHex(spec.eyes);
      }
    }
  }
  const headBox = new THREE.Box3();
  for (const mesh of headMeshes) {
    if (/^head$/i.test(mesh.name)) headBox.expandByObject(mesh);
  }
  if (headBox.isEmpty()) headBox.setFromObject(B("Head"));
  const crown = headBox.max.y;
  const faceZ = headBox.max.z;

  if (!spec.bandana && !spec.ownHair) {
    const hairMeshes = weldToBone(model, B("Head"), assets.hair.clone(true));
    for (const mesh of hairMeshes) mesh.material = clothMat(spec.hair || 0x3a2a22, 1);
  }

  const hatHex = spec.hat == null ? null : spec.hat;
  if (hatHex != null && !spec.newsboy) {
    const hat = new THREE.Group();
    const hatM = clothMat(hatHex, 0.72, "leather");
    const bandM = clothMat(spec.hatBand || 0x3a2418, 0.55, "leather");
    const bowler = !!spec.bowler;
    const brimR = bowler ? 0.16 : (spec.wideHat ? 0.26 : 0.2);
    const brim = new THREE.Mesh(droopBrim(brimR, bowler ? 0.012 : spec.wideHat ? 0.055 : 0.034), hatM);
    brim.scale.z = bowler ? 1 : spec.wideHat ? 1.22 : 1.12;
    bindLeather(hatM, "grain");
    hat.add(brim);
    const stitch = new THREE.Mesh(new THREE.TorusGeometry(brimR * 0.92, 0.004, 4, 18), bandM);
    stitch.rotation.x = Math.PI / 2;
    stitch.position.y = 0.01;
    hat.add(stitch);
    if (bowler) {
      const crownMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hatM);
      crownMesh.position.y = 0.03;
      const bowBand = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.108, 0.02, 14), bandM);
      bowBand.position.y = 0.012;
      hat.add(crownMesh, bowBand);
    } else {
      const crownMesh = new THREE.Mesh(creasedCrown(spec.wideHat ? 0.13 : 0.11, spec.wideHat ? 0.15 : 0.16), hatM);
      crownMesh.position.y = 0.07;
      crownMesh.scale.z = 1.12;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.13, 0.026, 16), bandM);
      band.position.y = 0.02;
      band.scale.z = 1.12;
      hat.add(crownMesh, band);
    }
    put(model, B("Head"), hat, 0, crown + 0.01, 0.01, spec.hatPitch || 0.06, 0, spec.hatTilt || 0);
  }

  if (!spec.bandana) {
    const browM = clothMat(spec.hair || 0x3a2a22, 0.9);
    for (const s of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.01, 0.012), browM);
      put(model, B("Head"), brow, s * 0.038, crown - 0.09, faceZ + 0.012, 0, 0, s * -0.18);
    }
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), clothMat(0xb56a62, 0.55, "skin"));
    put(model, B("Head"), lip, 0, crown - 0.2, faceZ + 0.012);
  }
  if (spec.mustache) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.028), clothMat(spec.hair || 0x1c1612, 1));
    put(model, B("Head"), m, 0, crown - 0.16, faceZ + 0.02);
  }
  if (spec.beard) {
    const beardM = clothMat(spec.beard, 0.95);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 0.045), beardM);
    put(model, B("Head"), jaw, 0, crown - 0.2, faceZ - 0.005);
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.04), beardM);
    put(model, B("Head"), chin, 0, crown - 0.245, faceZ + 0.008);
  }
  if (spec.scar) {
    const scarM = new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.42 });
    const scar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), scarM);
    put(model, B("Head"), scar, -0.046, crown - 0.17, faceZ + 0.018, 0.2, 0, 0.62);
  }
  if (spec.bandana) {
    const ban = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.04), clothMat(0x6a2420, 0.8));
    put(model, B("Head"), ban, 0, crown - 0.14, faceZ + 0.01);
  }
  dressAirship(model, B, spec, crown, faceZ);
  if (spec.coat) {
    const coatMat = clothMat(spec.coat, 0.62, "leather");
    coatMat.side = THREE.DoubleSide;
    bindLeather(coatMat);
    const coat = new THREE.Mesh(dusterGeometry(), coatMat);
    coat.castShadow = true;
    put(model, B("pelvis"), coat, 0, 0, 0.02);
    const collar = new THREE.Mesh(collarGeometry(), coatMat);
    collar.castShadow = true;
    put(model, B("spine_03"), collar, 0, 0, 0);
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(lapelGeometry(s), coatMat);
      put(model, B("pelvis"), lapel, 0, 0, 0);
      const tail = new THREE.Mesh(coatTailGeometry(s), coatMat);
      tail.userData.side = s;
      put(model, B("pelvis"), tail, 0, 0, 0);
    }
    api._tails = [];
    model.traverse((o) => { if (o.userData && o.userData.side) api._tails.push(o); });
    const beltMat = clothMat(0x3a2418, 0.48, "leather");
    bindLeather(beltMat);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.045, 16), beltMat);
    put(model, B("spine_01"), belt, 0, 1.0, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.018), metalMat(0xd7c08a, 0.32));
    put(model, B("spine_01"), buckle, 0, 1.0, 0.2);
    const button = metalMat(0xd7c08a, 0.3);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), button);
      put(model, B("spine_02"), b, 0.09, 1.32 - i * 0.1, 0.16);
    }
    model.updateMatrixWorld(true);
    for (const side of ["r", "l"]) {
      const upper = B("upperarm_" + side);
      const lower = B("lowerarm_" + side);
      if (!upper || !lower) continue;
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      upper.getWorldPosition(a);
      lower.getWorldPosition(b);
      const hand = B("hand_" + side);
      if (hand) hand.getWorldPosition(c);
      const len = Math.max(0.16, a.distanceTo(b));
      const foreLen = hand ? Math.max(0.14, b.distanceTo(c)) : len * 0.85;
      const upperSleeve = new THREE.Mesh(sleeveGeometry(len * 0.92), coatMat);
      upperSleeve.position.y = len * 0.46;
      upper.add(upperSleeve);
      const fore = new THREE.Mesh(sleeveGeometry(foreLen * 0.88), coatMat);
      fore.position.y = foreLen * 0.4;
      lower.add(fore);
      for (const mesh of [upperSleeve, fore]) {
        mesh.castShadow = true;
        mesh.frustumCulled = false;
      }
    }
  }
  if (B("foot_l") && B("foot_r") && spec.boots != null) {
    const bootM = clothMat(spec.boots || 0x2c2118, 0.5, "leather");
    bindLeather(bootM, "grain");
    for (const name of ["foot_l", "foot_r"]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.064, 0.18, 10, 2), bootM);
      shaft.position.set(0, 0.1, 0.02);
      shaft.castShadow = true;
      shaft.frustumCulled = false;
      B(name).add(shaft);
    }
  }
  if (spec.waistcoat) {
    const vestMat = clothMat(spec.cloth2 || 0x2c3338, 0.7, "cloth");
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.4, 14, 3, true, 0.55, Math.PI * 1.45),
      vestMat,
    );
    put(model, B("spine_02"), vest, 0, 1.22, 0.08);
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.016), clothMat(spec.cloth || 0xe6d8c4, 0.75));
      put(model, B("spine_03"), lapel, s * 0.06, 1.4, 0.14, 0.2, s * -0.4, s * 0.4);
    }
  }
  if (spec.suspenders) {
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.02), clothMat(0x6a3a28, 0.8));
      put(model, B("spine_02"), strap, s * 0.08, 1.28, 0.13, -0.08, 0, s * -0.06);
    }
  }
  if (spec.neckerchief) {
    const necker = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 6), clothMat(spec.neckerchief, 0.75));
    put(model, B("spine_03"), necker, 0, 1.52, 0.12, Math.PI, 0, 0);
  }
  let glow = null;
  if (spec.lantern) {
    const lamp = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 8), clothMat(0x3a342c, 0.45));
    cage.material.metalness = 0.55;
    glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc56a }),
    );
    glow.position.y = 0.01;
    lamp.add(cage, glow);
    put(model, B("spine_01"), lamp, -0.18, 1.05, 0.16);
  }
  if (spec.rifle && B("spine_03")) {
    const rifle = winchester();
    put(model, B("spine_03"), rifle, -0.14, 0.22, -0.16, 1.05, 0.2, 0.62);
    const revolver = colt();
    put(model, B("pelvis") || B("spine_01"), revolver, 0.2, 0.92, 0.1, 0.5, 0.3, 1.15);
    const apply = (which) => {
      api._sidearm = which === "revolver" ? "revolver" : "rifle";
      rifle.visible = api._sidearm !== "revolver";
      revolver.visible = api._sidearm === "revolver";
    };
    api.setSidearm = apply;
    apply(api._sidearm || "rifle");
  }
  model.updateMatrixWorld(true);
  const grip = new THREE.Vector3();
  if (spec.key) {
    const key = trailKey();
    key.scale.setScalar(1.5);
    holdBlade(B("hand_r"), key, new THREE.Vector3(0, -0.95, 0.1), true);
    api.keyMesh = key;
    key.visible = api._keyOn !== false;
    api.hand = B("hand_r");
  }
  if (spec.club) {
    const club = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.62, 7), clothMat(0x5a4030, 0.85));
    holdBlade(B("hand_r"), club, new THREE.Vector3(0, 0.31, 0), false);
    club.position.y = 0.34;
  }
  if (spec.bills) {
    B("hand_l").getWorldPosition(grip);
    const stack = handbillMesh();
    stack.scale.setScalar(0.85);
    put(model, B("hand_l"), stack, grip.x, grip.y, grip.z + 0.06, -0.6, 0.3, 0.2);
  }

  model.scale.set(spec.bulk || 1, spec.height || 1, spec.bulk || 1);
  api._spin.add(model);
  api._trail = createTrail(api.root);

  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  const weight = {};
  for (const clip of assets.clips) {
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.setEffectiveWeight(0);
    action.play();
    if (clip.name === "Death01" || clip.name === "Hit_Chest") {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    acts[clip.name] = action;
    weight[clip.name] = 0;
  }
  weight.Idle_Loop = 1;
  acts.Idle_Loop?.setEffectiveWeight(1);

  let phase = 0;
  let hitT = 0;
  let prevHurt = 0;
  api.glow = glow;
  api.neck = B("neck_01");
  api.skinned = true;

  api.update = (dt, a) => {
    const speed = a.speed || 0;
    if ((a.hurt || 0) > prevHurt + 0.15) hitT = 0.42;
    prevHurt = a.hurt || 0;
    hitT = Math.max(0, hitT - dt);
    const moving = speed > 0.35 && !a.air && a.action !== "dodge" && a.action !== "death";
    const tgt = {};
    const set = (n, w) => { if (acts[n]) tgt[n] = (tgt[n] || 0) + w; };
    if (a.action === "death") set("Death01", 1);
    else if (hitT > 0.05 && a.action !== "attack") set("Hit_Chest", 1);
    else if (a.action === "guard") set("Crouch_Idle_Loop", 1);
    else if (a.action === "dodge") set("Crouch_Fwd_Loop", 1);
    else if (a.air) {
      set("Crouch_Idle_Loop", 0.72);
      set("Idle_Loop", 0.28);
    } else if (!moving) set("Idle_Loop", 1);
    else {
      const jog = smoothstep(1.55, 3.15, speed);
      const sprint = smoothstep(3.4, 5.3, speed);
      set("Walk_Loop", (1 - jog) * (1 - sprint));
      set("Jog_Fwd_Loop", jog * (1 - sprint));
      set("Sprint_Loop", sprint);
    }
    const rate = 1 - Math.exp(-3.2 * dt);
    let sum = 0;
    for (const n of Object.keys(acts)) {
      weight[n] += ((tgt[n] || 0) - weight[n]) * rate;
      if (weight[n] < 0.004) weight[n] = 0;
      sum += weight[n];
    }
    for (const n of Object.keys(acts)) acts[n].setEffectiveWeight(sum > 0 ? weight[n] / sum : 0);

    if (moving && a.action !== "death") {
      const names = LOCO.filter((n) => acts[n] && weight[n] > 0.02);
      if (names.length) {
        let stride = 0;
        let wsum = 0;
        for (const n of names) {
          const w = weight[n];
          stride += w * NATIVE[n] * acts[n].getClip().duration;
          wsum += w;
        }
        stride = Math.max(0.45, stride / wsum);
        const cps = Math.max(0.35, Math.min(1.7, speed / stride));
        for (const n of names) acts[n].timeScale = cps * acts[n].getClip().duration;
        let lead = names[0];
        for (const n of names) if (weight[n] > weight[lead]) lead = n;
        const dur = acts[lead].getClip().duration;
        const lt = (acts[lead].time % dur) / dur;
        for (const n of names) if (n !== lead) acts[n].time = lt * acts[n].getClip().duration;
      }
    } else {
      for (const n of Object.keys(acts)) if (!LOCO.includes(n)) acts[n].timeScale = a.action === "death" ? 1 : 1;
    }

    if (api._tails) {
      const sway = Math.sin(phase * 1.6) * (moving ? 0.22 : 0.07);
      for (const tail of api._tails) {
        const s = tail.userData.side || 1;
        tail.rotation.x = 0.12 + sway * s;
        tail.rotation.z = s * (0.08 + sway * 0.35);
      }
    }
    mixer.update(dt);
    gesture(model, bones, api.root, a, api._trail);
    const dodge = a.action === "dodge";
    if (dodge) {
      const spins = Math.min(1, a.actionT || 0) * Math.PI * 2;
      if (Math.abs(a.dodgeSide || 0) > 0.45) {
        api._spin.rotation.z = -(a.dodgeSide) * spins;
        api._spin.rotation.x = 0;
      } else {
        api._spin.rotation.x = spins;
        api._spin.rotation.z = 0;
      }
      api._spin.position.y = -Math.sin(Math.min(1, a.actionT || 0) * Math.PI) * 0.28;
    } else {
      api._spin.rotation.set(0, 0, 0);
      api._spin.position.y = 0;
    }
    if (api.neck) addEuler(api.neck, a.air ? -0.15 : 0, a.look || 0, 0);

    phase += dt * (moving ? 2.2 : 0);
    const step = moving && acts.Walk_Loop && weight.Walk_Loop + weight.Jog_Fwd_Loop + weight.Sprint_Loop > 0.4
      && Math.sin(phase) > 0 && Math.sin(phase - dt * 2.2) <= 0;
    return { step: !!step };
  };
}

function gesture(model, bones, root, a, trail) {
  const B = (n) => bones[n];
  if (a.action === "attack" || a.action === "shove") {
    const p = Math.min(1, a.actionT || 0);
    const sw = Math.sin(p * Math.PI);
    const combo = a.combo || 1;
    const wind = a.action === "shove" ? sw * 0.55 : sw;
    addEuler(B("spine_02"), 0.12 * wind, (combo === 2 ? -0.42 : 0.38) * wind, 0);
    addEuler(B("upperarm_l"), -0.55, 0, 0.4 * wind);
    swingWeapon(model, {
      upperarm_r: B("upperarm_r"),
      lowerarm_r: B("lowerarm_r"),
      hand_r: B("hand_r"),
      upperarm_l: B("upperarm_l"),
    }, root, a, trail);
  } else if (a.action === "flash") {
    const p = Math.sin(Math.min(1, a.actionT || 0) * Math.PI);
    addEuler(B("upperarm_l"), -2.2 * p, 0, 0.4);
    addEuler(B("upperarm_r"), -2.2 * p, 0, -0.4);
  } else if (a.action === "shove") {
    const p = Math.sin(Math.min(1, a.actionT || 0) * Math.PI);
    addEuler(B("upperarm_l"), -1.3 * p, 0, 0.2);
    addEuler(B("upperarm_r"), -1.3 * p, 0, -0.2);
    addEuler(B("spine_02"), 0.25 * p, 0, 0);
  } else if (a.action === "throw") {
    const p = Math.min(1, a.actionT || 0);
    addEuler(B("upperarm_r"), -0.4 - Math.sin(p * Math.PI) * 1.7, 0.2, -0.3);
    addEuler(B("lowerarm_r"), -0.4, 0, 0);
  } else if (a.action === "guard") {
    addEuler(B("upperarm_l"), -1.15, 0.4, 0.55);
    addEuler(B("upperarm_r"), -1.15, -0.4, -0.55);
    addEuler(B("lowerarm_l"), -1.1, 0, 0);
    addEuler(B("lowerarm_r"), -1.1, 0, 0);
  } else if (a.air) {
    addEuler(B("upperarm_l"), -0.9, 0, 0.25);
    addEuler(B("upperarm_r"), -0.9, 0, -0.25);
  }
}
