// Fog-taken research subjects on the bench, and the two spheres that woke.
// Sphere 19 is the hero: the living subject Dr. Thorne was growing.
// Sphere 07 walks with it. The gray is the Nonimaginaire. setFree() puts the color back.
import * as THREE from "three";
import { trailKey } from "../../src/rigs.js?v=7";

function membraneMat(color, emissive, opacity) {
  return new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: 0.35,
    roughness: 0.18, metalness: 0.02,
    transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
}

function eyePair(parent, y, z, spread, scale) {
  const sclera = new THREE.MeshStandardMaterial({ color: 0xf7faf6, roughness: 0.32 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x140e0c, roughness: 0.35, emissive: 0x9dffc0, emissiveIntensity: 0.85 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xf4fff8 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.055 * scale, 10, 8), sclera);
    const dark = new THREE.Mesh(new THREE.SphereGeometry(0.028 * scale, 8, 6), pupil);
    dark.position.z = 0.04 * scale;
    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.012 * scale, 6, 4), glow);
    catchlight.position.set(0.015 * scale, 0.016 * scale, 0.05 * scale);
    g.add(white, dark, catchlight);
    g.position.set(s * spread, y, z);
    parent.add(g);
    eyes.push(g);
  }
  return eyes;
}

function cilia(parent, n, y, r, len, mat) {
  const list = [];
  const geo = new THREE.ConeGeometry(0.018, len, 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tip = new THREE.Mesh(geo, mat);
    tip.position.set(Math.cos(a) * r, y + Math.sin(i) * 0.02, Math.sin(a) * r);
    tip.lookAt(Math.cos(a) * (r + 0.4), y, Math.sin(a) * (r + 0.4));
    parent.add(tip);
    list.push(tip);
  }
  return list;
}

function fogWisps(parent, n) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14181e, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  });
  const wisps = [];
  for (let i = 0; i < n; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), mat);
    const a = (i / n) * Math.PI * 2;
    w.position.set(Math.cos(a) * 0.22, 0.45 + (i % 3) * 0.12, Math.sin(a) * 0.22);
    w.lookAt(0, 0.5, 0);
    parent.add(w);
    wisps.push(w);
  }
  return { mat, wisps };
}

export function createVessel() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const glass = membraneMat(0xd7fff4, 0x1a8870, 0.48);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 22, 16), glass);
  body.position.y = 0.5;
  body.scale.set(1, 1.08, 0.94);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 10),
    membraneMat(0xb8ffe8, 0x2a9a78, 0.28),
  );
  inner.position.y = 0.5;
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c2, emissive: 0xf0b050, emissiveIntensity: 0.7, roughness: 0.25,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), coreMat);
  core.position.y = 0.5;
  const ciliaMat = new THREE.MeshStandardMaterial({
    color: 0xb7f0dc, emissive: 0x0c4034, emissiveIntensity: 0.3,
    roughness: 0.4, side: THREE.DoubleSide,
  });
  const hairs = cilia(bob, 18, 0.5, 0.34, 0.22, ciliaMat);
  const eyes = eyePair(bob, 0.6, 0.24, 0.1, 1.35);
  const key = trailKey();
  key.scale.setScalar(0.22);
  key.position.set(0.22, 0.28, 0.08);
  key.rotation.z = -0.9;
  key.rotation.y = 0.4;
  bob.add(body, inner, core, key);
  const glow = new THREE.PointLight(0xffe2a8, 0.28, 2.2, 2);
  glow.position.y = 0.46;
  bob.add(glow);
  let time = 0;
  let stepped = 0;
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    const attack = anim.action === "attack";
    const hurt = anim.hurt || 0;
    bob.position.y = Math.sin(time * (speed > 0.4 ? 8 : 2.1)) * 0.045;
    bob.rotation.z = Math.sin(time * 1.8) * 0.05 + (anim.dodgeSide || 0) * 0.12;
    const pulse = 0.86 + Math.sin(time * 4.2) * 0.14;
    core.scale.setScalar(pulse);
    coreMat.emissive.setHex(attack ? 0xfff0c0 : hurt > 0.2 ? 0xff6040 : 0xe0a040);
    hairs.forEach((hair, i) => {
      hair.rotation.z = Math.sin(time * 6 + i) * (speed > 0.3 ? 0.45 : 0.18);
    });
    eyes.forEach((eye, i) => {
      eye.scale.setScalar(1 + Math.sin(time * 1.3 + i) * 0.04);
    });
    if (attack) bob.rotation.x = -0.28 * Math.sin(Math.min(1, anim.actionT || 0) * Math.PI);
    else bob.rotation.x = speed > 0.4 ? 0.08 : 0;
    const n = Math.floor(time * (speed > 2 ? 4.2 : 2.4));
    const step = speed > 0.55 && n !== stepped;
    stepped = n;
    return { step };
  }
  return { root, update };
}

export function createSeven() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xe8fff6, roughness: 0.16, metalness: 0.05,
    emissive: 0x243018, emissiveIntensity: 0.25,
    transparent: true, opacity: 0.78,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), glass);
  body.position.y = 0.46;
  body.castShadow = true;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
  core.position.y = 0.46;
  const legs = [];
  const legMat = new THREE.MeshStandardMaterial({ color: 0x243028, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    const a = (i / 4) * Math.PI * 2 + 0.4;
    pivot.position.set(Math.cos(a) * 0.16, 0.28, Math.sin(a) * 0.16);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 5), legMat);
    leg.position.y = -0.12;
    pivot.add(leg);
    bob.add(pivot);
    legs.push(pivot);
  }
  bob.add(body, core);
  const glow = new THREE.PointLight(0xffe2a0, 0.6, 2.4, 2);
  glow.position.y = 0.5;
  bob.add(glow);
  let time = 0;
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    bob.position.y = Math.abs(Math.sin(time * (speed > 0.3 ? 8 : 2))) * 0.04;
    core.scale.setScalar(0.85 + Math.sin(time * 6) * 0.15);
    legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(time * 8 + i) * (speed > 0.3 ? 0.5 : 0.08);
    });
  }
  return { root, update };
}

function legsOn(bob, mat, y, n, r) {
  const legs = [];
  const geo = new THREE.CylinderGeometry(0.035, 0.045, 0.34, 5);
  for (let i = 0; i < n; i++) {
    const pivot = new THREE.Group();
    const a = (i / n) * Math.PI * 2;
    pivot.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const leg = new THREE.Mesh(geo, mat);
    leg.position.y = -0.16;
    leg.castShadow = true;
    pivot.add(leg);
    bob.add(pivot);
    legs.push(pivot);
  }
  return legs;
}

export function createCrawler() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const taken = new THREE.MeshStandardMaterial({
    color: 0xa07848, roughness: 0.62, emissive: 0x3a2814, emissiveIntensity: 0.12,
  });
  const freedMat = new THREE.MeshStandardMaterial({ color: 0xd4924c, roughness: 0.5, emissive: 0x6a4018, emissiveIntensity: 0.15 });
  const meshes = [];
  const add = (geo, x, y, z, sx, sy, sz) => {
    const mesh = new THREE.Mesh(geo, taken);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    bob.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  add(new THREE.SphereGeometry(0.32, 14, 10), 0, 0.42, 0, 1.25, 0.78, 1.85);
  add(new THREE.SphereGeometry(0.16, 10, 8), 0, 0.48, 0.42, 0.95, 0.8, 1.05);
  const legs = legsOn(bob, taken, 0.32, 8, 0.28);
  const eyes = eyePair(bob, 0.56, 0.58, 0.09, 1.05);
  const fog = fogWisps(bob, 4);
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of meshes) mesh.material = freedMat;
    for (const pivot of legs) pivot.traverse((o) => { if (o.isMesh) o.material = freedMat; });
    fog.mat.opacity = 0;
  }
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    const swing = speed > 0.2 ? Math.sin(time * 10) : Math.sin(time * 1.6) * 0.12;
    legs.forEach((leg, i) => { leg.rotation.x = swing * (i % 2 ? 1 : -1); });
    bob.position.y = Math.abs(swing) * 0.03;
    fog.wisps.forEach((w, i) => {
      w.position.y = 0.42 + Math.sin(time * 2 + i) * 0.06;
      w.material.opacity = freed ? 0 : 0.22 + Math.sin(time * 3 + i) * 0.06;
    });
    eyes.forEach((eye) => { eye.scale.y = 0.92 + Math.sin(time * 1.7) * 0.08; });
    bob.rotation.x = anim.action === "attack" ? -0.28 : 0;
  }
  return { root, update, setFree };
}

export function createMold() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const taken = new THREE.MeshStandardMaterial({ color: 0x3d5a32, roughness: 0.85, emissive: 0x1a3014, emissiveIntensity: 0.15 });
  const fuzzTaken = new THREE.MeshStandardMaterial({ color: 0xd7efc8, roughness: 1, emissive: 0x4a6840, emissiveIntensity: 0.08 });
  const fuzzWhite = new THREE.MeshStandardMaterial({ color: 0xf4f7f0, roughness: 1 });
  const freedStalk = new THREE.MeshStandardMaterial({ color: 0x2a4020, roughness: 0.85, emissive: 0x143010, emissiveIntensity: 0.25 });
  const freedFuzz = new THREE.MeshStandardMaterial({ color: 0xd8f0c8, roughness: 1, emissive: 0x6a8848, emissiveIntensity: 0.15 });
  const parts = [];
  const fuzz = [];
  for (let i = 0; i < 4; i++) {
    const h = 0.72 + (i % 3) * 0.28;
    const a = (i / 4) * Math.PI * 2;
    const rad = i === 0 ? 0 : 0.2;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, h, 6), taken);
    stalk.position.set(Math.cos(a) * rad, h * 0.5, Math.sin(a) * rad);
    stalk.castShadow = true;
    bob.add(stalk);
    parts.push(stalk);
    for (let k = 0; k < 7; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), k % 2 ? fuzzWhite : fuzzTaken);
      const pa = (k / 7) * Math.PI * 2;
      puff.position.set(Math.cos(a) * rad + Math.cos(pa) * 0.14, h + 0.04 + (k % 2) * 0.08, Math.sin(a) * rad + Math.sin(pa) * 0.14);
      bob.add(puff);
      fuzz.push(puff);
    }
  }
  const eyes = eyePair(bob, 1.05, 0.16, 0.08, 0.9);
  const fog = fogWisps(bob, 3);
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of parts) mesh.material = freedStalk;
    for (const mesh of fuzz) mesh.material = freedFuzz;
    fog.mat.opacity = 0;
  }
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    bob.position.y = Math.sin(time * (speed > 0.2 ? 7 : 1.6)) * 0.035;
    bob.rotation.z = Math.sin(time * 1.8) * 0.05;
    parts.forEach((mesh, i) => { mesh.rotation.z = Math.sin(time * 2.4 + i) * 0.08; });
    fog.wisps.forEach((w, i) => { w.material.opacity = freed ? 0 : 0.2 + Math.sin(time * 2 + i) * 0.05; });
    bob.rotation.x = anim.action === "attack" ? -0.2 : 0;
  }
  return { root, update, setFree };
}

export function createShell() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const goo = new THREE.MeshStandardMaterial({
    color: 0x9ecf55, roughness: 0.18, emissive: 0x4a6818, emissiveIntensity: 0.16,
    transparent: true, opacity: 0.82,
  });
  const freedGoo = new THREE.MeshStandardMaterial({
    color: 0xc8e878, roughness: 0.18, emissive: 0x6a7020, emissiveIntensity: 0.2,
    transparent: true, opacity: 0.78,
  });
  const blobs = [];
  const spots = [[0, 0.48, 0, 0.38], [0.2, 0.4, 0.1, 0.2], [-0.18, 0.38, 0.08, 0.18], [0.06, 0.32, -0.12, 0.15]];
  for (const [x, y, z, r] of spots) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), goo);
    blob.position.set(x, y, z);
    blob.castShadow = true;
    bob.add(blob);
    blobs.push(blob);
  }
  const drips = [];
  for (let i = 0; i < 3; i++) {
    const drip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), goo);
    drip.position.set(-0.12 + i * 0.12, 0.16, 0.12);
    drip.rotation.x = Math.PI;
    bob.add(drip);
    drips.push(drip);
  }
  const eyes = eyePair(bob, 0.62, 0.28, 0.1, 1.05);
  const fog = fogWisps(bob, 3);
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of blobs.concat(drips)) mesh.material = freedGoo;
    fog.mat.opacity = 0;
  }
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    bob.position.y = Math.sin(time * (speed > 0.2 ? 6 : 2)) * 0.04;
    blobs.forEach((blob, i) => {
      const s = 1 + Math.sin(time * 3 + i) * 0.06;
      blob.scale.setScalar(s);
    });
    fog.wisps.forEach((w, i) => { w.material.opacity = freed ? 0 : 0.22; });
    eyes.forEach((eye, i) => { eye.position.y = 0.5 + Math.sin(time * 2 + i) * 0.015; });
    bob.rotation.x = anim.action === "attack" ? -0.25 : 0;
  }
  return { root, update, setFree };
}
