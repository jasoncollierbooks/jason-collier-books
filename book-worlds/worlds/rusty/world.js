// The Rusty Stack: a patched freight airship above a sunset cloud sea,
// with gangplanks to a sinking garden city, a goat farm, and a storm fortress.
import * as THREE from "three";
import { clamp } from "../../src/util.js";
import { createCritter, softDot } from "../../src/rigs.js?v=5";
import {
  stackMetalTexture, makeStack, rigBalloon, cloudSea, distantTraffic, deckDetail, wheelhouse, cloudTexture,
} from "./dress.js?v=4";

const ZONES = [
  { minX: -8.4, maxX: 8.4, minZ: -16.5, maxZ: 26.5 },
  { minX: 7.2, maxX: 24.8, minZ: 0.5, maxZ: 5.7 },
  { minX: 22.2, maxX: 42.8, minZ: -8.6, maxZ: 17.6 },
  { minX: -26.8, maxX: -7.2, minZ: -2.4, maxZ: 4.4 },
  { minX: -46.2, maxX: -22.2, minZ: -14.2, maxZ: 16.2 },
  { minX: -2.7, maxX: 2.7, minZ: 24.2, maxZ: 30.3 },
  { minX: -2.7, maxX: 2.7, minZ: 36.2, maxZ: 43.2 },
  { minX: -16.6, maxX: 16.6, minZ: 40.4, maxZ: 72.2 },
];

let deckRoll = 0;
let deckPitch = 0;
export function setDeckAttitude(roll, pitch) {
  deckRoll = roll;
  deckPitch = pitch;
}

// Boat plan: about a third as wide as it is long, round at the stern, sharp at the bow.
const HULL_STERN = -16.6;
const HULL_BOW = 26.6;
export function deckBeam(z) {
  if (z <= HULL_STERN || z >= HULL_BOW) return 0;
  const t = (z - HULL_STERN) / (HULL_BOW - HULL_STERN);
  const stern = Math.sin(Math.min(1, t / 0.18) * Math.PI * 0.5);
  const bow = Math.pow(Math.cos(clamp((t - 0.5) / 0.5, 0, 1) * Math.PI * 0.5), 1.05);
  const belly = 0.86 + 0.14 * Math.sin(clamp((t - 0.05) / 0.62, 0, 1) * Math.PI);
  const shape = (t < 0.5 ? stern * belly : bow);
  return Math.max(0.16, 6.05 * shape);
}

export function deckRise(z) {
  if (z <= -15.4) return 0.62;
  if (z < -8.4) return 0.62 * (1 - (z + 15.4) / 7);
  if (z > 19.5) return 0.22 * clamp((z - 19.5) / 6.5, 0, 1);
  return 0;
}

function onDeck(x, z) {
  if (z <= HULL_STERN + 0.2 || z >= HULL_BOW - 0.15) return false;
  return Math.abs(x) <= Math.max(0.28, deckBeam(z) - 0.32);
}

export function heightAt(x, z) {
  if (!onDeck(x, z)) return 0;
  return deckRise(z) + x * Math.sin(deckRoll) - (z - 5) * Math.sin(deckPitch);
}

function inside(x, z) {
  if (onDeck(x, z)) return true;
  for (let i = 1; i < ZONES.length; i++) {
    const zn = ZONES[i];
    if (x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) return true;
  }
  return false;
}

function closestPoint(x, z) {
  let best = { x, z };
  let bestD = 1e9;
  const cz = clamp(z, HULL_STERN + 0.25, HULL_BOW - 0.2);
  const lim = Math.max(0.35, deckBeam(cz) - 0.38);
  const cx = clamp(x, -lim, lim);
  const deckD = (cx - x) ** 2 + (cz - z) ** 2;
  if (deckD < bestD) {
    bestD = deckD;
    best = { x: cx, z: cz };
  }
  for (let i = 1; i < ZONES.length; i++) {
    const zn = ZONES[i];
    const qx = clamp(x, zn.minX, zn.maxX);
    const qz = clamp(z, zn.minZ, zn.maxZ);
    const d = (qx - x) ** 2 + (qz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { x: qx, z: qz };
    }
  }
  return best;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function ironTexture(low) {
  const size = low ? 512 : 1024;
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = "#6e7270";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const n = (x * 3 + y * 5) % 5;
        const shade = 96 + n * 8;
        g.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade - 2})`;
        g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120);
        g.strokeStyle = "#3e4448";
        g.lineWidth = 4;
        g.strokeRect(x * 128 + 6, y * 128 + 6, 116, 116);
        g.fillStyle = "#c6a15a";
        for (const [rx, ry] of [[18, 18], [102, 18], [18, 102], [102, 102], [60, 60]]) {
          g.beginPath();
          g.arc(x * 128 + rx, y * 128 + ry, 5, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "#6a5430";
          g.lineWidth = 1;
          g.stroke();
        }
        if (n === 0 || n === 3) {
          g.strokeStyle = "rgba(122, 64, 36, 0.55)";
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x * 128 + 24, y * 128 + 36);
          g.lineTo(x * 128 + 96, y * 128 + 100);
          g.stroke();
        }
      }
    }
  });
}

function plankTexture(low) {
  const size = low ? 512 : 1024;
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = "#4a3c2e";
    g.fillRect(0, 0, w, h);
    const boards = 8;
    const bh = h / boards;
    for (let i = 0; i < boards; i++) {
      const shade = 96 + ((i * 37) % 54);
      const warm = (i % 3) * 8;
      g.fillStyle = `rgb(${shade + 36 + warm}, ${shade + 10}, ${shade - 18})`;
      const seam = (i % 2) * 18;
      g.fillRect(seam, i * bh + 2, w - 28, bh - 5);
      g.fillStyle = `rgba(40, 28, 18, ${0.15 + (i % 4) * 0.05})`;
      g.fillRect(seam + 8, i * bh + 6, 40 + (i % 5) * 30, bh - 14);
      g.strokeStyle = "rgba(70, 48, 30, 0.45)";
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const y = i * bh + 10 + k * (bh / 6);
        g.beginPath();
        g.moveTo(4, y);
        g.lineTo(w - 4, y + ((i + k) % 3) - 1);
        g.stroke();
      }
      g.fillStyle = "#4a3c2e";
      for (let n = 0; n < 5; n++) {
        g.beginPath();
        g.arc(28 + n * 112, i * bh + bh * 0.5, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

function balloonTexture(low) {
  const patches = ["#e4c27a", "#9a3030", "#2f6a62", "#c8b060", "#5a4068", "#d07040", "#f0e2c4", "#3d5a40", "#8a6840", "#6a3038", "#c45a48", "#3a6a98"];
  return canvasTex(low ? 512 : 1024, low ? 256 : 512, (g, w, h) => {
    g.fillStyle = "#d8c4a4";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90, 60, 40, 0.28)";
    g.lineWidth = 1;
    for (let y = 0; y < h; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    for (let x = 0; x < w; x += 5) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let i = 0; i < 22; i++) {
      const pw = 70 + (i % 4) * 18;
      const ph = 36 + (i % 3) * 14;
      const x = (i * 83) % (w - pw);
      const y = (i * 47) % (h - ph);
      g.fillStyle = patches[i % patches.length];
      g.fillRect(x, y, pw, ph);
      g.strokeStyle = "#2a1c14";
      g.lineWidth = 3;
      g.strokeRect(x, y, pw, ph);
      g.setLineDash([4, 3]);
      g.strokeStyle = "rgba(255, 236, 200, 0.85)";
      g.lineWidth = 1.5;
      g.strokeRect(x + 4, y + 4, pw - 8, ph - 8);
      g.setLineDash([]);
    }
  });
}

function pageTexture() {
  return canvasTex(128, 160, (g) => {
    g.fillStyle = "#f4ead4";
    g.fillRect(0, 0, 128, 160);
    g.strokeStyle = "#8a6a42";
    g.strokeRect(6, 6, 116, 148);
    g.fillStyle = "#3a2a1c";
    for (let i = 0; i < 8; i++) g.fillRect(18, 28 + i * 14, 90 - (i % 3) * 12, 3);
  });
}

// Cross-section of the iron hull. v = 0 is the keel, v = 1 is the gunwale.
function hullProfile(z, v) {
  const beam = Math.max(0.2, deckBeam(z));
  const rise = deckRise(z);
  const vv = clamp(v, 0, 1);
  const flare = Math.sin(Math.pow(vv, 0.66) * Math.PI * 0.5);
  const half = beam * (0.012 + 1.02 * flare);
  const fullness = clamp(beam / 6.05, 0, 1);
  const draft = 2.05 + 2.85 * fullness;
  let y = rise + 0.02 - draft * Math.pow(1 - vv, 1.05);
  if (z > 16) y += clamp((z - 16) / 9, 0, 1) * Math.pow(1 - vv, 0.85) * 1.1;
  return { half, y };
}

export function hullSample(z, v, side) {
  const p = hullProfile(z, v);
  return new THREE.Vector3((side < 0 ? -1 : 1) * p.half, p.y, z);
}

function pushTri(idx, a, b, c) {
  idx.push(a, b, c);
}

function buildHullMesh(low) {
  const z0 = -16.55;
  const z1 = 26.7;
  const nz = low ? 16 : 30;
  const nv = low ? 6 : 10;
  const ring = nv * 2 + 1;
  const pos = [];
  const uv = [];
  for (let i = 0; i <= nz; i++) {
    const z = z0 + (i / nz) * (z1 - z0);
    const keel = hullProfile(z, 0);
    pos.push(0, keel.y, z);
    uv.push(0.5, i / nz);
    for (let s = 0; s < nv; s++) {
      const v = (s + 1) / nv;
      const p = hullProfile(z, v);
      pos.push(-p.half, p.y, z);
      uv.push(0.5 - 0.5 * v, i / nz);
    }
    for (let s = 0; s < nv; s++) {
      const v = (s + 1) / nv;
      const p = hullProfile(z, v);
      pos.push(p.half, p.y, z);
      uv.push(0.5 + 0.5 * v, i / nz);
    }
  }
  const idx = [];
  const port = (i, s) => i * ring + 1 + s;
  const star = (i, s) => i * ring + 1 + nv + s;
  const keelAt = (i) => i * ring;
  for (let i = 0; i < nz; i++) {
    pushTri(idx, keelAt(i), keelAt(i + 1), port(i + 1, 0));
    pushTri(idx, keelAt(i), port(i + 1, 0), port(i, 0));
    pushTri(idx, keelAt(i), star(i + 1, 0), keelAt(i + 1));
    pushTri(idx, keelAt(i), star(i, 0), star(i + 1, 0));
    for (let s = 0; s < nv - 1; s++) {
      pushTri(idx, port(i, s), port(i + 1, s), port(i + 1, s + 1));
      pushTri(idx, port(i, s), port(i + 1, s + 1), port(i, s + 1));
      pushTri(idx, star(i, s), star(i + 1, s + 1), star(i + 1, s));
      pushTri(idx, star(i, s), star(i, s + 1), star(i + 1, s + 1));
    }
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  hull.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  hull.setIndex(idx);
  hull.computeVertexNormals();

  const across = low ? 4 : 6;
  const dPos = [];
  const dUv = [];
  const dIdx = [];
  for (let i = 0; i <= nz; i++) {
    const z = z0 + (i / nz) * (z1 - z0);
    const beam = Math.max(0.18, deckBeam(z) - 0.16);
    for (let j = 0; j <= across; j++) {
      const u = -1 + (2 * j) / across;
      const camber = 0.05 * (1 - u * u);
      dPos.push(u * beam, deckRise(z) + 0.1 + camber, z);
      dUv.push((u + 1) * 0.5, i / nz);
    }
  }
  const row = across + 1;
  for (let i = 0; i < nz; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = b + 1;
      const d = a + 1;
      dIdx.push(a, b, c, a, c, d);
    }
  }
  const deck = new THREE.BufferGeometry();
  deck.setAttribute("position", new THREE.Float32BufferAttribute(dPos, 3));
  deck.setAttribute("uv", new THREE.Float32BufferAttribute(dUv, 2));
  deck.setIndex(dIdx);
  deck.computeVertexNormals();

  const kPos = [];
  const kIdx = [];
  for (let i = 0; i <= nz; i++) {
    const z = z0 + (i / nz) * (z1 - z0);
    const keel = hullProfile(z, 0);
    const drop = 0.38 + 0.16 * (1 - clamp(Math.abs(z - 4) / 16, 0, 1));
    kPos.push(-0.07, keel.y + 0.02, z, 0.07, keel.y + 0.02, z, 0, keel.y - drop, z);
  }
  for (let i = 0; i < nz; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    kIdx.push(a, b, a + 2, b, b + 2, a + 2);
    kIdx.push(a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
    kIdx.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const keel = new THREE.BufferGeometry();
  keel.setAttribute("position", new THREE.Float32BufferAttribute(kPos, 3));
  keel.setIndex(kIdx);
  keel.computeVertexNormals();
  return { hull, deck, keel };
}

function bagPinch(t) {
  const nose = t > 0 ? t * 1.05 : t * 0.94;
  const u = clamp(nose, -1, 1);
  return Math.pow(Math.max(0, Math.cos(u * Math.PI * 0.5)), 0.58);
}

function cigarGeometry(bag, low) {
  const segU = low ? 14 : 24;
  const segV = low ? 16 : 28;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segV; i++) {
    const t = -1 + (2 * i) / segV;
    const k = bagPinch(t);
    const rx = bag.rx * k;
    const ry = bag.ry * k;
    for (let j = 0; j <= segU; j++) {
      const a = (j / segU) * Math.PI * 2;
      pos.push(Math.cos(a) * rx, Math.sin(a) * ry, t * bag.rz);
      uv.push(j / segU, i / segV);
    }
  }
  const row = segU + 1;
  for (let i = 0; i < segV; i++) {
    for (let j = 0; j < segU; j++) {
      const a = i * row + j;
      idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function loadRepeat(url, srgb) {
  const tex = new THREE.TextureLoader().load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: new THREE.Vector3(-0.55, 0.22, -0.45).normalize() },
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector2() },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uSun;
      uniform float uTime;
      uniform vec2 uCam;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
      }
      void main() {
        vec3 n = normalize(vDir);
        vec3 zenith = vec3(0.28, 0.32, 0.58);
        vec3 mid = vec3(0.72, 0.42, 0.48);
        vec3 hor = vec3(0.98, 0.52, 0.28);
        vec3 below = vec3(0.86, 0.58, 0.46);
        float h = n.y;
        vec3 col = mix(below, hor, smoothstep(-0.35, 0.02, h));
        col = mix(col, mid, smoothstep(0.0, 0.28, h));
        col = mix(col, zenith, smoothstep(0.22, 0.85, h));
        float sun = pow(max(dot(n, uSun), 0.0), 800.0);
        float glow = pow(max(dot(n, uSun), 0.0), 5.0);
        col += vec3(1.0, 0.72, 0.42) * glow * 0.45;
        col += vec3(1.0, 0.96, 0.86) * sun;
        vec2 uv = n.xz / max(abs(n.y), 0.12) + uCam * 0.012;
        float c = fbm(uv * 0.22 + vec2(uTime * 0.035, uTime * 0.012));
        float c2 = fbm(uv * 0.55 + vec2(-uTime * 0.05, uTime * 0.02));
        float cloud = smoothstep(0.46, 0.7, c * 0.65 + c2 * 0.35);
        float streak = smoothstep(0.72, 0.9, c2) * smoothstep(0.15, 0.55, h);
        float belowCloud = smoothstep(-0.05, -0.28, h);
        col = mix(col, vec3(0.97, 0.98, 1.0), cloud * smoothstep(0.02, 0.22, h) * 0.9);
        col = mix(col, vec3(1.0, 0.96, 0.92), streak * 0.45);
        col = mix(col, vec3(0.82, 0.88, 0.94), belowCloud * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function buildRustyWorld(scene, low) {
  const obstacles = [];
  const block = (x, z, r) => obstacles.push({ x, z, r });
  const camHit = [];
  const camSphere = (x, y, z, r) => camHit.push({ x, y, z, r });

  scene.fog = new THREE.FogExp2(0xc48a68, low ? 0.012 : 0.007);
  scene.background = new THREE.Color(0xc47a58);

  const hemi = new THREE.HemisphereLight(0x9eb6d8, 0x8a6848, low ? 0.72 : 0.92);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd0a0, low ? 1.35 : 1.65);
  sun.position.set(-22, 28, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -28;
  sun.shadow.camera.right = sun.shadow.camera.top = 28;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.028;
  sun.shadow.radius = low ? 1.1 : 1.35;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xb7c8e0, 0.45);
  fill.position.set(16, 10, 12);
  scene.add(fill);
  const rimLight = new THREE.DirectionalLight(0xffb070, low ? 0.35 : 0.55);
  rimLight.position.set(18, 6, -24);
  scene.add(rimLight);
  const charKey = new THREE.DirectionalLight(0xfff0d4, low ? 0.55 : 0.85);
  charKey.position.set(4, 7, 5);
  scene.add(charKey, charKey.target);
  const charRim = new THREE.DirectionalLight(0x9eb6dc, low ? 0.28 : 0.48);
  charRim.position.set(-6, 4, -5);
  scene.add(charRim, charRim.target);
  const hullFill = new THREE.DirectionalLight(0xffc49a, low ? 0.45 : 0.7);
  hullFill.position.set(-24, -1, 10);
  hullFill.target.position.set(0, -2, 6);
  scene.add(hullFill, hullFill.target);

  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, low ? 20 : 28, low ? 14 : 18), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  const ironMap = ironTexture(low);
  ironMap.repeat.set(4, 6);
  const iron = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: ironMap, roughness: 0.62, metalness: 0.42,
  });
  const rust = new THREE.MeshStandardMaterial({ color: 0x7a4030, roughness: 0.78, metalness: 0.28 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc6a15a, roughness: 0.34, metalness: 0.74 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 0.55, metalness: 0.4 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0.02 });
  const planks = plankTexture(low);
  planks.repeat.set(2, 6);
  wood.map = planks;
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.04 });
  const rockCol = loadRepeat(`./assets/tex/${low ? "512" : "1k"}/rock_col.jpg`, true);
  rockCol.repeat.set(2, 2);
  rockMat.map = rockCol;
  rockMat.normalMap = loadRepeat(`./assets/tex/${low ? "512" : "1k"}/rock_nrm.jpg`, false);
  rockMat.roughnessMap = loadRepeat(`./assets/tex/${low ? "512" : "1k"}/rock_rgh.jpg`, false);
  const moss = new THREE.MeshStandardMaterial({ color: 0x6a7a48, roughness: 0.92 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3e6a3a, roughness: 0.9 });
  const redCloth = new THREE.MeshStandardMaterial({ color: 0x8a3030, roughness: 0.8 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe6d2b0, roughness: 0.7 });

  const shipPivot = new THREE.Group();
  shipPivot.position.set(0, 0, 5);
  const ship = new THREE.Group();
  ship.position.set(0, 0, -5);
  shipPivot.add(ship);
  scene.add(shipPivot);

  const hullBuilt = buildHullMesh(low);
  const hullMap = plankTexture(low);
  hullMap.repeat.set(3, 8);
  hullMap.needsUpdate = true;
  const hullWood = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: hullMap, roughness: 0.84, metalness: 0.02,
    emissive: 0x3a2218, emissiveIntensity: 0.22, side: THREE.DoubleSide,
  });
  const hull = new THREE.Mesh(hullBuilt.hull, hullWood);
  hull.castShadow = true;
  hull.receiveShadow = true;
  const deckMap = planks.clone();
  deckMap.repeat.set(1.4, 8);
  const deckMat = wood.clone();
  deckMat.map = deckMap;
  const deck = new THREE.Mesh(hullBuilt.deck, deckMat);
  deck.receiveShadow = true;
  deck.castShadow = true;
  const keel = new THREE.Mesh(hullBuilt.keel, new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.72, metalness: 0.35 }));
  keel.castShadow = true;
  ship.add(hull, deck, keel);
  for (const side of [-1, 1]) {
    const railPts = [];
    const steps = low ? 16 : 26;
    for (let i = 0; i <= steps; i++) {
      const z = -15.6 + (i / steps) * 40.2;
      const b = Math.max(0.55, deckBeam(z) * 0.96);
      if (b < 0.7 && z > 24) break;
      railPts.push(new THREE.Vector3(side * b, deckRise(z) + 0.86, z));
    }
    const curve = new THREE.CatmullRomCurve3(railPts);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, railPts.length * 2, 0.035, 5, false), brass);
    rail.castShadow = !low;
    ship.add(rail);
    const postN = railPts.length;
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 0.82, 5), dark, postN);
    const dummyPost = new THREE.Object3D();
    railPts.forEach((p, i) => {
      dummyPost.position.set(p.x, p.y - 0.4, p.z);
      dummyPost.updateMatrix();
      posts.setMatrixAt(i, dummyPost.matrix);
    });
    posts.castShadow = !low;
    ship.add(posts);
  }
  const portMat = new THREE.MeshStandardMaterial({
    color: 0xc5dde6, roughness: 0.12, metalness: 0.45, emissive: 0x3a2a18, emissiveIntensity: 0.18,
  });
  for (const z of [-10, -4, 2, 8, 14]) {
    for (const side of [-1, 1]) {
      const p = hullSample(z, 0.72, side);
      const port = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), portMat);
      port.position.copy(p);
      port.lookAt(0, p.y, p.z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 12), brass);
      ring.position.copy(port.position);
      ring.quaternion.copy(port.quaternion);
      ship.add(port, ring);
    }
  }
  const figure = new THREE.Group();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.55, 6), brass);
  neck.rotation.x = -0.8;
  neck.position.set(0, 0.15, 0.1);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), brass);
  skull.position.set(0, 0.38, 0.32);
  const figureBeak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 5), dark);
  figureBeak.rotation.x = Math.PI / 2;
  figureBeak.position.set(0, 0.36, 0.5);
  figure.add(neck, skull, figureBeak);
  const stem = hullProfile(25.6, 0.78);
  figure.position.set(0, stem.y + 0.28, 26.15);
  figure.rotation.x = -0.85;
  figure.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ship.add(figure);
  const stackMap = stackMetalTexture(low ? 256 : 512);
  stackMap.wrapS = stackMap.wrapT = THREE.RepeatWrapping;
  const stackMat = new THREE.MeshStandardMaterial({ map: stackMap, color: 0xffffff, roughness: 0.55, metalness: 0.62 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.48, metalness: 0.55 });
  const stack = makeStack(0.55, 0.72, 3.6, stackMat, brass, capMat);
  stack.position.set(2.4, 1.8 + deckRise(-6.2), -6.2);
  ship.add(stack);
  const stack2 = makeStack(0.4, 0.54, 2.7, stackMat, brass, capMat);
  stack2.position.set(-2.2, 1.4 + deckRise(10), 10);
  ship.add(stack2);
  block(2.4, -6.2, 0.85);
  block(-2.2, 10, 0.7);
  camSphere(2.4, 2.2, -6.2, 0.9);

  const dummy = new THREE.Object3D();
  const pipeMat = brass;
  const pipeRuns = low
    ? [[-3.5, 0.48, -2, 12], [3.5, 0.52, 1, 10]]
    : [[-3.5, 0.48, -2, 14], [3.5, 0.52, 1, 12], [-2.6, 0.95, 8, 5], [2.4, 1.12, 3, 4]];
  for (const [x, y, z, len] of pipeRuns) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 8), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, y + deckRise(z), z);
    pipe.castShadow = !low;
    ship.add(pipe);
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 10), brass);
    valve.position.set(x, y + deckRise(z) + 0.16, z);
    ship.add(valve);
  }

  const props = new THREE.Group();
  const rudders = [];
  const addProp = (x, y, z, spin, reach, axis) => {
    const mount = new THREE.Group();
    mount.position.set(x, y, z);
    if (axis === "z") mount.rotation.y = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8), brass);
    hub.rotation.z = Math.PI / 2;
    const blades = new THREE.Group();
    blades.userData.spin = spin;
    for (let b = 0; b < 4; b++) {
      const wrap = new THREE.Group();
      wrap.rotation.z = (b / 4) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, reach, 0.28), cream);
      blade.position.set(0, reach * 0.55, 0);
      wrap.add(blade);
      blades.add(wrap);
    }
    mount.add(hub, blades);
    props.add(mount);
    props.userData.blades = props.userData.blades || [];
    props.userData.blades.push(blades);
  };
  const sternKeel = hullProfile(-16.1, 0.05);
  // Twin pushers just aft of the stern. Shafts leave the stern face and run
  // aft, so the discs sit behind the hull instead of out the sides.
  const aftY = sternKeel.y + 1.2;
  for (const s of [-1, 1]) {
    const root = new THREE.Vector3(s * 0.16, aftY, -16.15);
    const hub = new THREE.Vector3(s * 1.2, aftY, -18.15);
    const span = hub.clone().sub(root);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, Math.max(0.2, span.length()), 6), dark);
    shaft.position.copy(root).add(hub).multiplyScalar(0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize());
    shaft.castShadow = true;
    ship.add(shaft);
    addProp(hub.x, hub.y, hub.z, s, 1.05, "z");
  }
  for (const s of [-0.55, 0.55]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.72), dark);
    fin.position.set(s, sternKeel.y + 0.35, -16.15);
    fin.castShadow = true;
    ship.add(fin);
    rudders.push(fin);
  }
  ship.add(props);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x2e3338, roughness: 0.38, metalness: 0.82 });
  const bandZs = low ? [-8, 0, 8, 16] : [-12, -6, 0, 6, 12, 17];
  for (const z of bandZs) {
    if (deckBeam(z) < 1.4) continue;
    const steps = low ? 6 : 11;
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(hullSample(z, 1 - i / steps, -1));
    for (let i = 1; i <= steps; i++) pts.push(hullSample(z, i / steps, 1));
    const curve = new THREE.CatmullRomCurve3(pts);
    const band = new THREE.Mesh(new THREE.TubeGeometry(curve, low ? 14 : 26, 0.055, 5, false), bandMat);
    band.castShadow = !low;
    ship.add(band);
  }
  for (const v of [0.42, 0.74]) {
    for (const side of [-1, 1]) {
      const n = low ? 8 : 16;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const z = -13.5 + (i / n) * 36;
        if (deckBeam(z) < 1.1) continue;
        pts.push(hullSample(z, v, side));
      }
      if (pts.length < 4) continue;
      const strap = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.038, 4, false),
        bandMat,
      );
      strap.castShadow = !low;
      ship.add(strap);
    }
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.4, 8), dark);
  mast.position.set(-3.4, 2.2, -1.2);
  mast.castShadow = true;
  ship.add(mast);
  block(-3.4, -1.2, 0.45);
  camSphere(-3.4, 3, -1.2, 0.6);
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.18, 8), wood);
  nest.position.set(-3.4, 4.15, -1.2);
  ship.add(nest);
  const nestRail = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.03, 4, 10), brass);
  nestRail.rotation.x = Math.PI / 2;
  nestRail.position.set(-3.4, 4.35, -1.2);
  ship.add(nestRail);

  const bag = { cx: 0, cy: 8.7, cz: 4.2, rx: 3.15, ry: 2.45, rz: 14.6 };
  const balloon = new THREE.Mesh(cigarGeometry(bag, low), new THREE.MeshStandardMaterial({
    color: 0xfff3df, map: balloonTexture(low), roughness: 0.84, metalness: 0.02,
  }));
  balloon.castShadow = !low;
  balloon.position.set(bag.cx, bag.cy, bag.cz);
  ship.add(balloon);
  camSphere(0, bag.cy, bag.cz, 5.5);
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.92 });
  rigBalloon(ship, bag, low, ropeMat, brass);

  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), redCloth);
  seat.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.08), redCloth);
  back.position.set(0, 0.95, -0.24);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), brass);
  pole.position.y = 0.25;
  chair.add(seat, back, pole);
  chair.position.set(-1.5, deckRise(-12.4), -12.4);
  ship.add(chair);
  block(-1.5, -12.4, 0.45);

  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 16), brass);
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.78, 0.03), dark);
    spoke.rotation.z = (i / 6) * Math.PI;
    wheel.add(spoke);
  }
  wheel.add(rim);
  wheel.position.set(0.2, 1.15 + deckRise(-14.2), -14.2);
  wheel.rotation.x = 0.4;
  ship.add(wheel);
  block(0.2, -14.2, 0.4);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), brass);
  horn.rotation.x = Math.PI / 2;
  horn.position.set(1.6, 1.15 + deckRise(-14.6), -14.6);
  ship.add(horn);

  const parrot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), brass);
  body.scale.set(0.8, 1, 1.2);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 7), brass);
  head.position.set(0, 0.12, 0.08);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 5), dark);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.1, 0.16);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xd8ece8, roughness: 0.15, metalness: 0.2 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeMat);
    eye.position.set(s * 0.035, 0.13, 0.12);
    parrot.add(eye);
  }
  const key = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 8), brass);
  key.position.set(0, 0.02, -0.12);
  const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 5), dark);
  perch.rotation.z = Math.PI / 2;
  perch.position.y = -0.16;
  parrot.add(body, head, beak, key, perch);
  parrot.position.set(2.3, 1.15 + deckRise(-12.8), -12.8);
  ship.add(parrot);

  const lanterns = [];
  for (const [x, z] of [[-4.0, -10], [4.1, -2], [-3.2, 12], [2.4, 15]]) {
    const lamp = new THREE.Group();
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 6), dark);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc56a }));
    glow.position.y = 0.01;
    lamp.add(cage, glow);
    lamp.position.set(x, 1.15 + deckRise(z), z);
    ship.add(lamp);
    if (lanterns.length < 2) {
      const light = new THREE.PointLight(0xffb060, 1.4, 6, 2);
      light.position.set(x, 1.3 + deckRise(z), z);
      ship.add(light);
      lanterns.push(light);
    }
  }

  const barrelGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.62, 8);
  for (const [x, z] of [[-4.0, -4], [-4.2, -3.2], [4.0, 6.5], [3.4, 7.1], [-2.1, 14]]) {
    const barrel = new THREE.Mesh(barrelGeo, wood);
    barrel.position.set(x, 0.32 + deckRise(z), z);
    barrel.castShadow = true;
    ship.add(barrel);
    block(x, z, 0.4);
  }
  const crateGeo = new THREE.BoxGeometry(0.7, 0.55, 0.7);
  for (const [x, z] of [[4.2, -8], [5.1, 3.2], [-4.4, 9], [2.2, 5.4], [-3.4, 1.6], [3.6, 14]]) {
    const crate = new THREE.Mesh(crateGeo, wood);
    crate.position.set(x, 0.3 + deckRise(z), z);
    crate.castShadow = true;
    ship.add(crate);
    block(x, z, 0.48);
  }
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 12), new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.9 }));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(3.2, 0.1 + deckRise(12), 12);
  ship.add(coil);
  block(3.2, 12, 0.4);

  const holdFloor = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.12, 4.6), dark);
  holdFloor.position.set(0, -1.5, 2.1);
  holdFloor.receiveShadow = true;
  ship.add(holdFloor);
  const humCrate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), wood);
  humCrate.position.set(2.6, 0.32, 3.4);
  const humGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.08, 0.82),
    new THREE.MeshBasicMaterial({ color: 0xb9a0e0, transparent: true, opacity: 0.65 }),
  );
  humGlow.position.set(2.6, 0.66, 3.4);
  ship.add(humCrate, humGlow);
  block(2.6, 3.4, 0.45);
  const rope = new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.94 });
  deckDetail(ship, { wood, brass, dark, iron, rope }, low, block);
  ship.add(wheelhouse({ wood, brass, dark, iron }, block));

  const plankMat = wood;
  const eastPlank = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 2.4), plankMat);
  eastPlank.position.set(20, -0.02, 3.1);
  eastPlank.receiveShadow = true;
  scene.add(eastPlank);
  const westPlank = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 2.2), plankMat);
  westPlank.position.set(-22, -0.02, 1);
  westPlank.receiveShadow = true;
  scene.add(westPlank);
  const nearPlank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 5.4), plankMat);
  nearPlank.position.set(0, -0.02, 27.5);
  nearPlank.receiveShadow = true;
  const farPlank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 6.4), plankMat);
  farPlank.position.set(0, -0.02, 39.3);
  farPlank.receiveShadow = true;
  const broken = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.5), plankMat);
  broken.position.set(0.35, -0.7, 33.1);
  broken.rotation.x = 0.85;
  broken.rotation.z = 0.2;
  scene.add(nearPlank, farPlank, broken);
  const bridges = [eastPlank, westPlank, nearPlank, farPlank];

  const city = new THREE.Group();
  const cityRock = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 12.5, 3.2, low ? 7 : 10), rockMat);
  cityRock.position.y = -1.7;
  cityRock.receiveShadow = true;
  city.add(cityRock);
  for (let i = 0; i < (low ? 4 : 7); i++) {
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(3.2 - i * 0.15, 0.7, 2.2), i % 2 ? moss : leaf);
    terrace.position.set(-3 + (i % 3) * 2.4, 0.4 + (i % 2) * 0.55, -2 + (i % 4));
    terrace.castShadow = !low;
    city.add(terrace);
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass);
  dome.position.set(1.5, 1.3, 2);
  city.add(dome);
  const falls = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 2.4),
    new THREE.MeshBasicMaterial({ color: 0xc5e0ea, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  );
  falls.position.set(6.5, -0.2, 4);
  city.add(falls);
  for (const s of [-1, 1]) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({
      color: 0x9a78d0, emissive: 0x6a48a8, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.1,
    }));
    crystal.position.set(s * 3.2, -1.55, 1);
    crystal.userData.under = true;
    city.add(crystal);
  }
  city.position.set(32, 0, 4);
  scene.add(city);

  const crystals = [];
  const sockets = [[28, 9], [33, 9], [38, 9]];
  const loose = [[28, 1.2], [33, 1.2], [38, 1.4]];
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({
      color: 0xcbb6f0, emissive: 0x7a5cc0, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.15,
    }));
    mesh.position.set(loose[i][0], 0.55, loose[i][1]);
    mesh.castShadow = true;
    scene.add(mesh);
    const socket = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 12), brass);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(sockets[i][0], 0.06, sockets[i][1]);
    scene.add(socket);
    crystals.push({
      mesh, x: loose[i][0], z: loose[i][1], homeX: loose[i][0], homeZ: loose[i][1],
      socketX: sockets[i][0], socketZ: sockets[i][1], seated: false,
    });
  }

  const farm = new THREE.Group();
  const farmRock = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 2.6, low ? 7 : 9), rockMat);
  farmRock.position.y = -1.4;
  farmRock.receiveShadow = true;
  farm.add(farmRock);
  const house = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 2.4), wood);
  house.position.set(-4, 1.05, -4);
  house.castShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 4), rust);
  roof.position.set(-4, 2.5, -4);
  roof.rotation.y = Math.PI / 4;
  farm.add(house, roof);
  const mill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3.2, 7), wood);
  mill.position.set(3.5, 1.6, -6);
  const vane = new THREE.Group();
  vane.position.set(3.5, 3.1, -6);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.28), cream);
    const wrap = new THREE.Group();
    wrap.rotation.z = (i / 4) * Math.PI * 2;
    blade.position.y = 0.75;
    wrap.add(blade);
    vane.add(wrap);
  }
  farm.add(mill, vane);
  farm.position.set(-34, 0, 1);
  scene.add(farm);
  block(-38, -3, 1.5);
  camSphere(-38, 2, -3, 1.6);

  const beetGeo = new THREE.ConeGeometry(0.16, 0.4, 5);
  const beetMat = new THREE.MeshStandardMaterial({ color: 0xd0c6a8, emissive: 0xc8b8e0, emissiveIntensity: 0.35, roughness: 0.6 });
  const beets = new THREE.InstancedMesh(beetGeo, beetMat, low ? 10 : 18);
  for (let i = 0; i < beets.count; i++) {
    dummy.position.set(-40 + (i % 6) * 0.7, 0.2, -8 + Math.floor(i / 6) * 0.7);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    beets.setMatrixAt(i, dummy.matrix);
  }
  scene.add(beets);

  const pen = { minX: -44, maxX: -38.2, minZ: 8.2, maxZ: 14 };
  for (const [x, z, len, rot] of [[-41, 14, 6, 0], [-44, 11, 5.5, Math.PI / 2], [-38.2, 11, 5.5, Math.PI / 2]]) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(len, 0.7, 0.12), wood);
    fence.position.set(x, 0.4, z);
    fence.rotation.y = rot;
    scene.add(fence);
  }
  block(-41, 14, 0.4);
  block(-44, 11, 0.35);
  block(-38.2, 11.5, 0.35);

  const goats = [];
  const goatSpots = [[-30, -2], [-33.5, 0.5], [-28.5, 2.2], [-32, -6]];
  goatSpots.forEach(([x, z], i) => {
    const rig = createCritter("goat");
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({
      color: i % 2 ? 0xa33a32 : 0xc45a48, roughness: 0.75,
    }));
    balloon.position.y = 1.55;
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), cream);
    patch.position.set(0.12, 1.68, 0.08);
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.45, 0),
      new THREE.Vector3(0, 1.3, 0),
    ]);
    const string = new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0x4a3428 }));
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), brass);
    bell.position.set(0, 0.35, 0.16);
    rig.root.add(balloon, patch, string, bell);
    rig.root.position.set(x, 0, z);
    scene.add(rig.root);
    goats.push({ rig, root: rig.root, x, z, yaw: i, seed: i * 1.7, penned: false, inside: false });
  });

  const fort = new THREE.Group();
  const fortRock = new THREE.Mesh(new THREE.BoxGeometry(30, 2.4, 30), rockMat);
  fortRock.position.y = -1.2;
  fortRock.receiveShadow = true;
  fort.add(fortRock);
  const gateL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.2, 1.2), dark);
  gateL.position.set(-3.2, 2.1, 1.2);
  const gateR = gateL.clone();
  gateR.position.x = 3.2;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.6, 1.2), dark);
  lintel.position.set(0, 4.2, 1.2);
  fort.add(gateL, gateR, lintel);
  for (const [x, z] of [[-8, 6], [8, 6], [-8, 14], [8, 14], [-6, 20], [6, 20]]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.4, 1.1), dark);
    pillar.position.set(x, 1.7, z);
    pillar.castShadow = true;
    fort.add(pillar);
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 5.5, 7), dark);
  tower.position.set(-10, 2.6, 18);
  fort.add(tower);
  const storm = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x1a1c24, transparent: true, opacity: 0.45, depthWrite: false,
  }));
  storm.position.set(0, 10, 16);
  fort.add(storm);
  const torch = new THREE.PointLight(0xff9850, 2.2, 10, 2);
  torch.position.set(3.4, 2.2, 2);
  fort.add(torch);
  const slime = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.18 + (i % 3) * 0.06, 8, 6), new THREE.MeshStandardMaterial({
      color: 0x141416, roughness: 0.25, metalness: 0.15,
    }));
    blob.position.set((i % 3) * 0.2, 0.15 + (i % 2) * 0.1, Math.floor(i / 3) * 0.18);
    slime.add(blob);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    eye.position.set(blob.position.x, blob.position.y + 0.08, blob.position.z + 0.12);
    slime.add(eye);
  }
  slime.position.set(6.5, 0, 8);
  const capeScrap = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshStandardMaterial({
    color: 0x5a3a78, roughness: 0.8, side: THREE.DoubleSide,
  }));
  capeScrap.rotation.x = -Math.PI / 2;
  capeScrap.position.set(-5, 0.04, 9);
  fort.add(slime, capeScrap);
  fort.position.set(0, 0, 46);
  scene.add(fort);
  const hangar = new THREE.PointLight(0xffc080, 28, 22, 2);
  hangar.position.set(1.6, 3.6, 58);
  scene.add(hangar);
  block(-3.2, 47.2, 0.7);
  block(3.2, 47.2, 0.7);
  for (const [x, z] of [[-8, 52], [8, 52], [-8, 60], [8, 60]]) block(x, z, 0.7);

  const banks = cloudSea(scene, low);
  const wisps = [];
  const wispMap = cloudTexture(low ? 128 : 256);
  for (let i = 0; i < (low ? 4 : 8); i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: wispMap.clone(), color: 0xffe6d4, transparent: true, opacity: 0.32,
      depthWrite: false, side: THREE.DoubleSide,
    });
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    const wisp = new THREE.Mesh(new THREE.PlaneGeometry(16, 5.5), mat);
    wisp.position.set((i % 2 ? 1 : -1) * (16 + (i % 3) * 7), -1.5 + (i % 4) * 1.2, -24 + i * 14);
    wisp.userData.speed = 6 + (i % 3) * 2.2;
    wisps.push(wisp);
    scene.add(wisp);
  }
  const streaks = [];
  const streakMat = new THREE.MeshBasicMaterial({
    color: 0xfff8f2, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide,
  });
  for (let i = 0; i < (low ? 5 : 10); i++) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 2.8 + (i % 3) * 0.6), streakMat);
    streak.position.set((i % 2 ? 1 : -1) * (3.5 + (i % 5) * 2.1), 1.6 + (i % 4) * 1.15, -18 + i * 6);
    streaks.push(streak);
    scene.add(streak);
  }
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(220, low ? 20 : 32),
    new THREE.MeshBasicMaterial({ color: 0xe7c4a4, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -28;
  scene.add(sea);
  distantTraffic(scene, rust, cream, rockMat, low);

  const farCity = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.8 + (i % 2) * 0.4, 1, 2 + i * 0.4, 6), i % 2 ? brass : cream);
    b.position.set((i - 3) * 1.6, 1 + i * 0.15, (i % 3) * 0.8);
    farCity.add(b);
  }
  farCity.position.set(70, -4, 30);
  scene.add(farCity);
  const farShip = new THREE.Group();
  const farHull = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 6), rust);
  const farBag = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), cream);
  farBag.scale.set(1, 0.45, 1.8);
  farBag.position.y = 1.6;
  farShip.add(farHull, farBag);
  farShip.position.set(-55, 6, 40);
  scene.add(farShip);

  const steamCount = low ? 40 : 90;
  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(steamCount * 3);
  for (let i = 0; i < steamCount; i++) {
    const forward = i % 3 === 0;
    steamPos[i * 3] = (forward ? -2.2 : 2.4) + (Math.random() - 0.5) * 0.55;
    steamPos[i * 3 + 1] = 3.1 + Math.random() * 1.8;
    steamPos[i * 3 + 2] = (forward ? 10 : -6.2) + (Math.random() - 0.5) * 0.55;
  }
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPos, 3));
  const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({
    color: 0xfff4e8, size: low ? 0.7 : 0.95, map: softDot(), transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  ship.add(steam);

  const smokeCount = low ? 24 : 48;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(smokeCount * 3);
  smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
    color: 0x4a403c, size: low ? 0.8 : 1.15, map: softDot(), transparent: true, opacity: 0.28,
    depthWrite: false, sizeAttenuation: true,
  }));
  ship.add(smoke);

  const pages = buildPages(scene);
  const chests = [
    placeChest(scene, 4.8, 3.6, wood, dark),
    placeChest(scene, -30.5, 6.5, wood, dark),
  ];
  chests.forEach((c) => block(c.x, c.z, 0.42));

  const radio = buildRadio(scene);
  const gate = buildHornGate(scene, brass, dark);

  let heel = 0.018;
  let cityCalm = 0;
  let stormFlash = 0;
  return {
    obstacles,
    chests,
    pages,
    radio,
    gate,
    crystals,
    goats,
    pen,
    floats: [],
    setCinematic(on) {
      const hide = !!on;
      for (const plank of bridges) plank.visible = !hide;
    },
    setHeel(v) { heel = v; },
    setCityCalm(v) { cityCalm = clamp(v, 0, 1); },
    flashStorm() { stormFlash = 1; },
    update(dt, t, focus) {
      sun.position.set(focus.x - 18, 26, focus.z - 12);
      sun.target.position.set(focus.x, 0, focus.z);
      sun.target.updateMatrixWorld();
      skyMat.uniforms.uTime.value = t;
      skyMat.uniforms.uCam.value.set(focus.x, focus.z);
      charKey.position.set(focus.x + 3.2, focus.y + 5.6, focus.z + 2.2);
      charKey.target.position.set(focus.x, focus.y + 1.15, focus.z);
      charKey.target.updateMatrixWorld();
      charRim.position.set(focus.x - 3.4, focus.y + 3.4, focus.z - 2.6);
      charRim.target.position.copy(charKey.target.position);
      charRim.target.updateMatrixWorld();
      const roll = Math.sin(t * 0.55) * (0.04 + heel * 0.35);
      const pitch = Math.sin(t * 0.31) * (0.026 + heel * 0.2);
      shipPivot.rotation.z = roll;
      shipPivot.rotation.x = pitch;
      setDeckAttitude(roll, pitch);
      for (const bank of banks) {
        bank.position.x = Math.sin(t * 0.05 + bank.position.y) * 6;
        if (bank.material.map) bank.material.map.offset.y -= dt * (bank.userData.scroll || 0.02);
      }
      for (const wisp of wisps) {
        wisp.position.z -= dt * wisp.userData.speed;
        if (wisp.position.z < -80) wisp.position.z += 150;
      }
      for (const streak of streaks) {
        streak.position.z -= dt * 16;
        if (streak.position.z < -36) streak.position.z += 78;
      }
      const blades = props.userData.blades || [];
      for (const group of blades) group.rotation.x += dt * 9 * (group.userData.spin || 1);
      for (const fin of rudders) fin.rotation.y = Math.sin(t * 0.48) * 0.22;
      vane.rotation.z += dt * 1.6;
      parrot.position.y = 1.15 + deckRise(-12.8) + Math.sin(t * 2.4) * 0.04;
      parrot.rotation.y = Math.sin(t * 0.8) * 0.4;
      humGlow.material.opacity = 0.35 + Math.sin(t * 3) * 0.25;
      const steamArr = steam.geometry.attributes.position.array;
      for (let i = 0; i < steamCount; i++) {
        steamArr[i * 3 + 1] += dt * 0.85;
        steamArr[i * 3] += Math.sin(t + i) * dt * 0.08;
        if (steamArr[i * 3 + 1] > 5.4) steamArr[i * 3 + 1] = 3.05;
      }
      steam.geometry.attributes.position.needsUpdate = true;
      const smokeArr = smoke.geometry.attributes.position.array;
      for (let i = 0; i < smokeCount; i++) {
        smokeArr[i * 3 + 1] += dt * (1.05 + (i % 4) * 0.12);
        smokeArr[i * 3 + 2] -= dt * 1.7;
        smokeArr[i * 3] += Math.sin(t * 1.4 + i) * dt * 0.35;
        if (smokeArr[i * 3 + 1] > 7.4 || smokeArr[i * 3 + 2] < -13) {
          smokeArr[i * 3] = 2.35 + ((i % 5) - 2) * 0.12;
          smokeArr[i * 3 + 1] = 3.45;
          smokeArr[i * 3 + 2] = -6.15;
        }
      }
      smoke.geometry.attributes.position.needsUpdate = true;
      city.rotation.z = (0.14 * (1 - cityCalm)) + Math.sin(t * 0.4) * 0.015 * (1 - cityCalm);
      city.position.y = Math.sin(t * 0.5) * 0.08 * (1 - cityCalm);
      for (const crystal of crystals) {
        if (crystal.seated) {
          crystal.mesh.position.set(crystal.socketX, 0.45, crystal.socketZ);
        } else {
          crystal.mesh.position.set(crystal.x, 0.55 + Math.sin(t * 2 + crystal.x) * 0.06, crystal.z);
          crystal.mesh.rotation.y = t * 0.6;
        }
      }
      for (const g of goats) {
        const bag = g.root.children.find((c) => c.geometry && c.geometry.type === "SphereGeometry");
        if (bag) bag.position.y = 1.55 + Math.sin(t * 1.6 + g.seed) * 0.08;
      }
      stormFlash = Math.max(0, stormFlash - dt);
      storm.material.opacity = 0.38 + Math.sin(t * 0.7) * 0.06 + stormFlash * 0.35;
      if (stormFlash > 0.6) sun.intensity = 3.1;
      else sun.intensity = low ? 1.35 : 1.65;
      farShip.position.x = -55 + Math.sin(t * 0.15) * 6;
      farShip.position.y = 6 + Math.sin(t * 0.4) * 0.4;
      posePages(pages, t);
      const gateOn = gate.ready || gate.open;
      const pulse = gateOn ? 0.42 + Math.sin(t * 3) * 0.18 : 0;
      gate.glow.material.opacity = pulse;
      if (gate.sheet) gate.sheet.material.opacity = gate.open ? 0.62 : pulse;
      if (gate.lamp) gate.lamp.intensity = gateOn ? 2.1 + Math.sin(t * 3) * 0.5 : 0;
      if (radio.glow) radio.glow.material.opacity = 0.35 + Math.sin(t * 3.1) * 0.3;
      scene.fog.color.setHex(focus.z > 42 ? 0x6a6248 : 0xc48a68);
    },
    setQuality(level) {
      const small = level === "low";
      sun.shadow.mapSize.set(small ? 512 : 2048, small ? 512 : 2048);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    },
    pullCamera(focus, desired) {
      const dir = desired.clone().sub(focus);
      let maxDist = dir.length();
      if (maxDist < 0.25) return desired;
      dir.multiplyScalar(1 / maxDist);
      let dist = maxDist;
      for (const s of camHit) {
        const ox = focus.x - s.x;
        const oy = focus.y - s.y;
        const oz = focus.z - s.z;
        const b = ox * dir.x + oy * dir.y + oz * dir.z;
        const c = ox * ox + oy * oy + oz * oz - s.r * s.r;
        const disc = b * b - c;
        if (disc < 0) continue;
        const sd = Math.sqrt(disc);
        const t1 = -b - sd;
        const t2 = -b + sd;
        const tHit = t1 > 0.15 ? t1 : (t2 > 0.15 ? t2 : -1);
        if (tHit > 0 && tHit < dist) dist = Math.max(1.15, tHit - 0.25);
      }
      const out = focus.clone().addScaledVector(dir, Math.max(1.35, Math.min(maxDist, dist)));
      const floorY = heightAt(out.x, out.z) + 0.55;
      if (out.y < floorY) out.y = floorY;
      return out;
    },
    resolve(x, z, radius, extra) {
      let px = x;
      let pz = z;
      if (!inside(px, pz)) {
        const spot = closestPoint(px, pz);
        px = spot.x;
        pz = spot.z;
      }
      const all = extra ? obstacles.concat(extra) : obstacles;
      for (let n = 0; n < 2; n++) {
        for (const o of all) {
          let dx = px - o.x;
          let dz = pz - o.z;
          const d = Math.hypot(dx, dz);
          const min = radius + o.r;
          if (d < min) {
            if (d < 1e-4) { px += min; continue; }
            const push = (min - d) / d;
            px += dx * push;
            pz += dz * push;
          }
        }
        if (!inside(px, pz)) {
          const spot = closestPoint(px, pz);
          px = spot.x;
          pz = spot.z;
        }
      }
      return { x: px, z: pz };
    },
  };
}

function buildPages(scene) {
  const tex = pageTexture();
  const spots = [
    ["half-left", 1.5, -13.2],
    ["crate-hums", 1.2, 2.4],
    ["forgot-float", 36.5, 12.5],
    ["balloon-goats", -28.5, -8],
    ["duke-day", 5.5, 50],
  ];
  return spots.map(([id, x, z]) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffe2a8, emissiveIntensity: 0.45,
      roughness: 0.55, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.86), mat);
    const y = heightAt(x, z) + 1.15;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { id, x, z, mesh, got: false, baseY: y };
  });
}

function posePages(pages, t) {
  for (const p of pages) {
    if (p.got) {
      p.mesh.visible = false;
      continue;
    }
    p.mesh.visible = true;
    p.mesh.position.y = p.baseY + Math.sin(t * 1.6 + p.x) * 0.08;
    p.mesh.rotation.y = t * 0.6 + p.z;
  }
}

function placeChest(scene, x, z, wood, dark) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.38, 0.46), wood);
  body.position.y = 0.22;
  body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.16, 0.5), dark);
  lid.position.set(0, 0.46, -0.22);
  lid.geometry.translate(0, 0, 0.25);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: 0xc6a15a, metalness: 0.6, roughness: 0.35 }));
  band.position.y = 0.28;
  group.add(body, lid, band);
  group.position.set(x, heightAt(x, z), z);
  scene.add(group);
  return { x, z, mesh: group, lid, open: false };
}

function buildRadio(scene) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.7, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x6a3a28, roughness: 0.6, metalness: 0.2 }),
  );
  box.position.y = 0.4;
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 10),
    new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0.8 }),
  );
  glow.position.set(0, 0.55, 0.15);
  group.add(box, glow);
  group.position.set(-2.4, deckRise(-13.1), -13.1);
  scene.add(group);
  return { x: -2.4, z: -13.1, mesh: group, glow };
}

function buildHornGate(scene, brass, dark) {
  const root = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 7), dark);
  post.position.y = 0.65;
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), brass);
  bell.position.y = 1.35;
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.4, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.05;
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.5),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  sheet.position.y = 1.4;
  const lamp = new THREE.PointLight(0xffe2a8, 0, 8, 2);
  lamp.position.y = 1.6;
  root.add(post, bell, glow, sheet, lamp);
  root.position.set(0, deckRise(-15.2), -15.2);
  scene.add(root);
  return {
    root,
    glow,
    sheet,
    lamp,
    open: false,
    x: 0,
    z: -15.2,
    ready: false,
    setReady(v) { this.ready = !!v; },
    setOpen(v) { this.open = !!v; },
  };
}
