// Fog-taken research subjects on the bench, and the two spheres that woke.
// Sphere 19 is the hero: the living subject Dr. Thorne was growing.
// Sphere 07 walks with it. The gray is the Nonimaginaire. setFree() puts the color back.
import * as THREE from "three";
import { trailKey } from "../../src/rigs.js?v=7";

function grayMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        vP = position;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        float scan = sin(vP.y * 46.0 - uTime * 14.0) * 0.5 + 0.5;
        float edge = pow(1.0 - abs(vN.y), 1.15);
        vec3 col = mix(vec3(0.16, 0.18, 0.2), vec3(0.62, 0.66, 0.68), scan);
        col = mix(col, vec3(0.08, 0.09, 0.1), edge * 0.4);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function tickMats(list, time) {
  for (const mat of list) if (mat.uniforms) mat.uniforms.uTime.value = time;
}

export function createVessel() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const hull = new THREE.MeshStandardMaterial({
    color: 0x1a140e, roughness: 0.42, metalness: 0.18,
    emissive: 0x102818, emissiveIntensity: 0.35,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xd8fff4, roughness: 0.12, metalness: 0.08,
    emissive: 0x0c4030, emissiveIntensity: 0.55,
    transparent: true, opacity: 0.82,
  });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xb8ffd8 });
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x204838, roughness: 0.35, metalness: 0.08,
    emissive: 0x0c3024, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.82, side: THREE.DoubleSide,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), coreMat);
  core.position.y = 0.72;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), glass);
  shell.position.y = 0.74;
  shell.castShadow = true;
  const plates = [];
  for (let i = 0; i < 5; i++) {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hull);
    const a = (i / 5) * Math.PI * 2;
    plate.scale.set(1.15, 0.42, 0.72);
    plate.position.set(Math.cos(a) * 0.28, 0.7, Math.sin(a) * 0.28);
    plate.lookAt(0, 0.7, 0);
    plate.castShadow = true;
    bob.add(plate);
    plates.push(plate);
  }
  const skirt = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), finMat);
  skirt.scale.set(1.35, 0.28, 1.35);
  skirt.position.y = 0.42;
  const fins = [-1, 1].map((s) => {
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.22), finMat);
    fin.position.set(s * 0.42, 0.78, -0.02);
    fin.rotation.z = s * -0.4;
    bob.add(fin);
    return fin;
  });
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 7), finMat);
  tail.position.set(0, 0.7, -0.42);
  tail.rotation.x = Math.PI / 2;
  const key = trailKey();
  key.scale.setScalar(0.42);
  key.position.set(0.34, 0.55, 0.12);
  key.rotation.z = -0.6;
  bob.add(core, shell, skirt, tail, key);
  const glow = new THREE.PointLight(0x9dffc8, 1.4, 4.5, 2);
  glow.position.y = 0.74;
  bob.add(glow);
  let time = 0;
  let stepped = 0;
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    const attack = anim.action === "attack";
    const hurt = anim.hurt || 0;
    bob.position.y = Math.sin(time * (speed > 0.4 ? 9 : 2.2)) * (speed > 0.4 ? 0.06 : 0.035);
    bob.rotation.z = Math.sin(time * 2.4) * 0.04 + (anim.dodgeSide || 0) * 0.15;
    const pulse = 0.85 + Math.sin(time * 5.5) * 0.15;
    core.scale.setScalar(pulse);
    coreMat.color.setHex(attack ? 0xf4ffd0 : hurt > 0.2 ? 0xff8866 : 0xb8ffd8);
    glow.intensity = attack ? 3.2 : 1.15 + Math.sin(time * 5.5) * 0.35;
    fins.forEach((fin, i) => {
      fin.rotation.y = Math.sin(time * 7 + i) * (speed > 0.3 ? 0.45 : 0.12);
    });
    tail.rotation.z = Math.sin(time * 4) * 0.25;
    shell.rotation.y = time * 0.35;
    if (attack) bob.rotation.x = -0.35 * Math.sin(Math.min(1, anim.actionT || 0) * Math.PI);
    else bob.rotation.x = speed > 0.4 ? 0.12 : 0;
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
  const taken = grayMat();
  const freedMat = new THREE.MeshStandardMaterial({
    color: 0xc48448, roughness: 0.55, transparent: true, opacity: 0.92,
  });
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
  add(new THREE.SphereGeometry(0.28, 12, 10), 0, 0.42, 0, 1.15, 0.72, 1.55);
  add(new THREE.SphereGeometry(0.12, 8, 7), 0, 0.48, 0.42, 0.8, 0.7, 1);
  const legs = legsOn(bob, taken, 0.32, 6, 0.22);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7dffc0 });
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
    eye.position.set(s * 0.08, 0.52, 0.5);
    bob.add(eye);
  });
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of meshes) mesh.material = freedMat;
    for (const pivot of legs) {
      pivot.traverse((o) => { if (o.isMesh) o.material = freedMat; });
    }
    eyeMat.color.setHex(0x2a140c);
  }
  function update(dt, anim = {}) {
    time += dt;
    tickMats([taken], time);
    const speed = anim.speed || 0;
    const swing = speed > 0.2 ? Math.sin(time * 11) : Math.sin(time * 1.6) * 0.1;
    legs.forEach((leg, i) => { leg.rotation.x = swing * (i % 2 ? 1 : -1); });
    bob.position.y = Math.abs(swing) * 0.03;
    bob.rotation.x = anim.action === "attack" ? -0.28 : 0;
  }
  return { root, update, setFree };
}

export function createMold() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const taken = grayMat();
  const freedMat = new THREE.MeshStandardMaterial({ color: 0x24301a, roughness: 0.95, emissive: 0x102008, emissiveIntensity: 0.25 });
  const stalks = [];
  for (let i = 0; i < 5; i++) {
    const h = 0.7 + (i % 3) * 0.28;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, h, 6), taken);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), taken);
    const a = (i / 5) * Math.PI * 2;
    const rad = i === 0 ? 0 : 0.22;
    stalk.position.set(Math.cos(a) * rad, h * 0.5, Math.sin(a) * rad);
    cap.position.set(Math.cos(a) * rad, h + 0.08, Math.sin(a) * rad);
    cap.scale.set(1, 0.55, 1);
    stalk.castShadow = true;
    bob.add(stalk, cap);
    stalks.push(stalk, cap);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9dffc0 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat);
  eye.position.set(0, 1.15, 0.12);
  bob.add(eye);
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of stalks) mesh.material = freedMat;
    eyeMat.color.setHex(0xc8f060);
  }
  function update(dt, anim = {}) {
    time += dt;
    tickMats([taken], time);
    const speed = anim.speed || 0;
    bob.position.y = Math.sin(time * (speed > 0.2 ? 8 : 1.8)) * 0.04;
    bob.rotation.z = Math.sin(time * 2) * 0.06;
    stalks.forEach((mesh, i) => {
      if (i % 2 === 0) mesh.rotation.z = Math.sin(time * 3 + i) * 0.08;
    });
    bob.rotation.x = anim.action === "attack" ? -0.2 : 0;
  }
  return { root, update, setFree };
}

export function createShell() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const taken = grayMat();
  const glass = new THREE.MeshStandardMaterial({
    color: 0xe8fff8, roughness: 0.08, metalness: 0.12,
    emissive: 0xf0e2b0, emissiveIntensity: 0.35,
    transparent: true, opacity: 0.62,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), taken);
  body.position.y = 0.5;
  body.castShadow = true;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x1a1814 }));
  inner.position.y = 0.5;
  const legs = legsOn(bob, taken, 0.28, 4, 0.18);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8ffe8 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat);
  eye.position.set(0, 0.58, 0.26);
  bob.add(body, inner, eye);
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    body.material = glass;
    inner.material = new THREE.MeshBasicMaterial({ color: 0xf0e2b0 });
    for (const pivot of legs) pivot.traverse((o) => { if (o.isMesh) o.material = glass; });
    eyeMat.color.setHex(0x2a2010);
  }
  function update(dt, anim = {}) {
    time += dt;
    tickMats([taken], time);
    const speed = anim.speed || 0;
    bob.position.y = Math.sin(time * 3) * 0.05;
    body.rotation.y = time * 0.8;
    legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * 9 + i) * (speed > 0.2 ? 0.55 : 0.08); });
    bob.rotation.x = anim.action === "attack" ? -0.3 : 0;
  }
  return { root, update, setFree };
}
