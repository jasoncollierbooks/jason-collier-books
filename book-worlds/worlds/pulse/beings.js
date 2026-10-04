// The Entity (shifting light) and the natives of the quantum realm.
// A fog-taken native is the same crystal person, gray and full of static,
// until setFree() puts the color back.
import * as THREE from "three";

function crystalMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.32,
    flatShading: true,
  });
}

function takenCrystalMat() {
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
        float scan = sin(vP.y * 46.0 - uTime * 16.0) * 0.5 + 0.5;
        float edge = pow(1.0 - abs(vN.y), 1.15);
        vec3 col = mix(vec3(0.28, 0.30, 0.32), vec3(0.72, 0.74, 0.76), scan);
        col = mix(col, vec3(0.12, 0.13, 0.14), edge * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function staticMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
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
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        float n = hash(floor(vP * 9.0 + vec3(0.0, uTime * 6.0, uTime * 2.0)));
        float scan = sin(vP.y * 36.0 - uTime * 14.0) * 0.5 + 0.5;
        float fres = pow(1.0 - abs(vN.y), 1.4);
        float alpha = (0.05 + n * 0.22 + scan * 0.12) * (0.35 + fres);
        vec3 col = mix(vec3(0.08, 0.09, 0.1), vec3(0.55, 0.58, 0.6), scan * n);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.38));
      }
    `,
  });
}

function glowMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlare: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
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
      uniform float uFlare;
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        float n = sin(vP.y * 7.0 + uTime * 2.1) * 0.5 + 0.5;
        float w = sin(vP.x * 5.0 - uTime * 1.3 + vP.z * 4.0) * 0.5 + 0.5;
        vec3 gold = vec3(0.86, 0.62, 0.22);
        vec3 teal = vec3(0.12, 0.62, 0.58);
        vec3 violet = vec3(0.48, 0.24, 0.72);
        vec3 col = mix(gold, teal, n);
        col = mix(col, violet, w * 0.7);
        float fres = pow(1.0 - abs(vN.z), 1.5);
        col *= 0.62 + fres * 0.28 + uFlare * 0.2;
        gl_FragColor = vec4(col, 0.78);
      }
    `,
  });
}

export function createEntity() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);

  const coreMat = glowMat();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), coreMat);
  core.position.y = 1.35;
  bob.add(core);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xf0c56a, transparent: true, opacity: 0.16, depthWrite: false,
    }),
  );
  halo.position.y = 1.35;
  bob.add(halo);

  const ribbonMats = [0xf0c56a, 0x3ec8c4, 0xb388ff].map((color) => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.34,
    roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide,
  }));
  const ribbons = ribbonMats.map((mat, i) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.12, 0.025, 8, 28), mat);
    mesh.position.y = 1.35;
    mesh.rotation.x = 0.6 + i * 0.5;
    mesh.rotation.z = i * 0.8;
    bob.add(mesh);
    return mesh;
  });

  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(36 * 3);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r = 0.35 + (i % 5) * 0.08;
    motePos[i * 3] = Math.cos(a) * r;
    motePos[i * 3 + 1] = 1.1 + (i % 7) * 0.12;
    motePos[i * 3 + 2] = Math.sin(a) * r;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: 0xffe2a8, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false,
  }));
  bob.add(motes);

  const lamp = new THREE.PointLight(0xffe0b0, 1.35, 5.2, 2);
  lamp.position.y = 1.45;
  bob.add(lamp);
  const cool = new THREE.PointLight(0x7ee0ea, 0.55, 3.6, 2);
  cool.position.set(0.3, 1.2, 0.2);
  bob.add(cool);

  let time = 0;
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    const flare = anim.action === "throw" ? 1 : 0;
    bob.position.y = Math.sin(time * 1.7) * 0.08 + (speed > 0.3 ? Math.sin(time * 7) * 0.03 : 0);
    core.rotation.y = time * 0.6;
    core.rotation.x = Math.sin(time * 0.4) * 0.3;
    coreMat.uniforms.uTime.value = time;
    coreMat.uniforms.uFlare.value = flare;
    const pulse = 1 + flare * 0.18 + Math.sin(time * 3) * 0.04;
    core.scale.setScalar(pulse);
    halo.scale.setScalar(1 + Math.sin(time * 2.2) * 0.08 + flare * 0.2);
    ribbons.forEach((mesh, i) => {
      mesh.rotation.y = time * (0.7 + i * 0.25);
      mesh.rotation.x = 0.5 + Math.sin(time * 0.8 + i) * 0.4;
    });
    const attr = motes.geometry.attributes.position;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + time * 0.8;
      const r = 0.38 + (i % 5) * 0.07;
      attr.setX(i, Math.cos(a) * r);
      attr.setZ(i, Math.sin(a) * r);
      attr.setY(i, 1.05 + Math.sin(time * 1.4 + i) * 0.18 + (i % 7) * 0.06);
    }
    attr.needsUpdate = true;
  }
  return { root, update };
}

const PALETTES = [
  [0xf0c56a, 0x3ec8c4, 0xb388ff],
  [0x3ec8c4, 0xf0c56a, 0xc084fc],
  [0xd4a0ff, 0x5ed0c8, 0xf0c56a],
];

export function createNative(opts = {}) {
  const scale = opts.scale || 1;
  const seed = opts.seed || 0;
  const pal = PALETTES[Math.abs(seed) % PALETTES.length];
  let taken = !!opts.taken;

  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  bob.scale.setScalar(scale);

  const parts = [];
  const takenMats = [];
  function useMat(color) {
    if (!taken) return crystalMat(color);
    const mat = takenCrystalMat();
    takenMats.push(mat);
    return mat;
  }
  function addCrystal(geo, colorIndex, x, y, z, rot) {
    const color = pal[colorIndex % pal.length];
    const mesh = new THREE.Mesh(geo, useMat(color));
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.castShadow = true;
    mesh.userData.color = color;
    bob.add(mesh);
    parts.push(mesh);
    return mesh;
  }

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.18, 0.78, 0);
  legR.position.set(0.18, 0.78, 0);
  bob.add(legL, legR);
  const legGeo = new THREE.ConeGeometry(0.12, 0.78, 5);
  legGeo.translate(0, -0.36, 0);
  const lMesh = new THREE.Mesh(legGeo, useMat(pal[1]));
  const rMesh = new THREE.Mesh(legGeo, useMat(pal[2]));
  lMesh.castShadow = rMesh.castShadow = true;
  lMesh.userData.color = pal[1];
  rMesh.userData.color = pal[2];
  legL.add(lMesh);
  legR.add(rMesh);
  parts.push(lMesh, rMesh);

  addCrystal(new THREE.OctahedronGeometry(0.26, 0), 0, 0, 0.98, 0);
  const torso = addCrystal(new THREE.OctahedronGeometry(0.38, 0), 1, 0, 1.38, 0);
  torso.scale.set(0.9, 1.2, 0.62);
  const head = addCrystal(new THREE.OctahedronGeometry(0.2, 0), 2, 0, 1.92, 0);
  addCrystal(new THREE.ConeGeometry(0.09, 0.62, 5), 0, -0.46, 1.4, 0, [0, 0, 1.05]);
  addCrystal(new THREE.ConeGeometry(0.09, 0.62, 5), 2, 0.46, 1.4, 0, [0, 0, -1.05]);
  addCrystal(new THREE.ConeGeometry(0.07, 0.32, 4), 0, 0.1, 2.18, 0);
  addCrystal(new THREE.ConeGeometry(0.06, 0.24, 4), 1, -0.2, 1.62, 0.14);

  const eyeMatFree = new THREE.MeshBasicMaterial({ color: 0x7ee8e0 });
  const eyeMatTaken = new THREE.MeshBasicMaterial({ color: 0x9aa0a6 });
  const eyes = [-0.06, 0.06].map((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), taken ? eyeMatTaken : eyeMatFree);
    eye.position.set(x, 1.94, 0.14);
    bob.add(eye);
    return eye;
  });

  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 1), staticMat());
  shell.position.y = 1.35;
  shell.scale.set(0.7, 1.15, 0.55);
  shell.visible = taken;
  bob.add(shell);

  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(28 * 3);
  for (let i = 0; i < 28; i++) {
    sparkPos[i * 3] = (Math.random() - 0.5) * 0.9;
    sparkPos[i * 3 + 1] = 0.7 + Math.random() * 1.3;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    color: 0xd5dbe2, size: 0.045, transparent: true, opacity: 0.75, depthWrite: false,
  }));
  sparks.visible = taken;
  bob.add(sparks);

  function paint() {
    takenMats.length = 0;
    for (const mesh of parts) mesh.material = taken ? useMat(mesh.userData.color) : crystalMat(mesh.userData.color);
    for (const eye of eyes) eye.material = taken ? eyeMatTaken : eyeMatFree;
    shell.visible = taken;
    sparks.visible = taken;
  }

  function setFree() {
    if (!taken) return;
    taken = false;
    paint();
  }

  let time = seed * 0.7;
  function update(dt, anim = {}) {
    time += dt;
    const speed = anim.speed || 0;
    bob.position.y = Math.sin(time * (taken ? 9 : 2)) * (taken ? 0.015 : 0.035);
    const step = speed > 0.25 ? Math.sin(time * 8) * 0.45 : Math.sin(time * 1.4) * 0.08;
    legL.rotation.x = step;
    legR.rotation.x = -step;
    head.rotation.y = Math.sin(time * 0.8) * 0.2;
    if (taken) {
      shell.material.uniforms.uTime.value = time;
      for (const mat of takenMats) mat.uniforms.uTime.value = time;
      shell.rotation.y = time * 0.4;
      const attr = sparks.geometry.attributes.position;
      for (let i = 0; i < 28; i++) {
        attr.setY(i, 0.7 + ((attr.getY(i) + dt * (0.4 + (i % 4) * 0.15)) % 1.35));
      }
      attr.needsUpdate = true;
    }
  }

  return { root, update, setFree, get taken() { return taken; } };
}
