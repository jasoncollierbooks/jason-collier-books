// Fog-taken wolves and shadow shapes. The gray is the Nonimaginaire.
// setFree() puts a wolf's color back. A shade thins out and is gone.
import * as THREE from "three";

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
        float scan = sin(vP.y * 40.0 - uTime * 12.0) * 0.5 + 0.5;
        float edge = pow(1.0 - abs(vN.y), 1.2);
        vec3 col = mix(vec3(0.22, 0.24, 0.26), vec3(0.62, 0.64, 0.66), scan);
        col = mix(col, vec3(0.1, 0.11, 0.12), edge * 0.45);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function shadeMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
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
      uniform float uFade;
      varying vec3 vP;
      varying vec3 vN;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        float n = hash(floor(vP * 8.0 + vec3(0.0, uTime * 5.0, uTime)));
        float scan = sin(vP.y * 30.0 - uTime * 11.0) * 0.5 + 0.5;
        float fres = pow(1.0 - abs(vN.y), 1.35);
        float alpha = (0.08 + n * 0.24 + scan * 0.14) * (0.4 + fres) * uFade;
        vec3 col = mix(vec3(0.06, 0.07, 0.08), vec3(0.5, 0.54, 0.56), scan * n);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.55));
      }
    `,
  });
}

export function createWolf(opts = {}) {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  root.scale.setScalar(opts.scale || 1);
  const taken = grayMat();
  const fur = new THREE.MeshStandardMaterial({ color: 0x5c4636, roughness: 0.9 });
  const earMatTaken = taken;
  const meshes = [];
  const legs = [];
  const add = (geo, x, y, z, mat = taken) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    bob.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  const chest = add(new THREE.SphereGeometry(0.22, 8, 7), 0, 0.52, 0.28);
  chest.scale.set(0.9, 0.85, 1.1);
  const body = add(new THREE.SphereGeometry(0.26, 10, 8), 0, 0.58, -0.08);
  body.scale.set(1.05, 0.82, 2.15);
  const hip = add(new THREE.SphereGeometry(0.16, 8, 6), 0, 0.58, -0.48);
  hip.scale.set(0.85, 0.75, 1);
  const neck = add(new THREE.SphereGeometry(0.1, 7, 6), 0, 0.66, 0.42);
  neck.scale.set(0.7, 0.7, 1.3);
  const head = add(new THREE.SphereGeometry(0.15, 8, 7), 0, 0.72, 0.62);
  head.scale.set(0.85, 0.8, 1.05);
  const snout = add(new THREE.ConeGeometry(0.07, 0.28, 6), 0, 0.66, 0.82);
  snout.rotation.x = Math.PI / 2;
  const nose = add(new THREE.SphereGeometry(0.035, 6, 5), 0, 0.68, 0.96);
  nose.scale.set(0.8, 0.6, 0.7);
  const ears = [-1, 1].map((s) => {
    const ear = add(new THREE.ConeGeometry(0.05, 0.16, 5), s * 0.09, 0.9, 0.58, earMatTaken);
    ear.rotation.z = s * -0.25;
    ear.rotation.x = -0.3;
    return ear;
  });
  const legGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.42, 5);
  [[-0.12, 0.22], [0.12, 0.22], [-0.13, -0.32], [0.13, -0.32]].forEach(([x, z]) => {
    const hipBone = new THREE.Group();
    hipBone.position.set(x, 0.42, z);
    const leg = new THREE.Mesh(legGeo, taken);
    leg.position.y = -0.18;
    leg.castShadow = true;
    hipBone.add(leg);
    bob.add(hipBone);
    meshes.push(leg);
    legs.push(hipBone);
  });
  const tail = add(new THREE.ConeGeometry(0.07, 0.42, 6), 0, 0.72, -0.72);
  tail.rotation.x = 1.15;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3dffa8 });
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), eyeMat);
    eye.position.set(s * 0.07, 0.76, 0.74);
    bob.add(eye);
  });
  let time = 0;
  let freed = false;
  function setFree() {
    if (freed) return;
    freed = true;
    for (const mesh of meshes) mesh.material = fur;
    eyeMat.color.setHex(0xc4a070);
  }
  function update(dt, anim = {}) {
    time += dt;
    if (taken.uniforms) taken.uniforms.uTime.value = time;
    const speed = anim.speed || 0;
    const swing = speed > 0.2 ? Math.sin(time * 10) : Math.sin(time * 1.4) * 0.08;
    legs.forEach((leg, i) => { leg.rotation.x = swing * (i % 2 ? 1 : -1) * 0.85; });
    tail.rotation.x = 1.15 + Math.sin(time * 2.2) * 0.18;
    tail.rotation.z = Math.sin(time * 1.6) * 0.2;
    const lunge = anim.action === "attack" ? -0.38 : 0;
    body.rotation.x = lunge;
    head.position.z = 0.62 + (anim.action === "attack" ? 0.08 : 0);
    head.rotation.x = anim.action === "attack" ? -0.25 : 0;
    ears.forEach((ear, i) => { ear.rotation.x = -0.3 + (anim.action === "attack" ? -0.25 : Math.sin(time * 2 + i) * 0.05); });
    bob.position.y = Math.abs(swing) * 0.04;
  }
  return { root, update, setFree };
}

export function createShade() {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);
  const mat = shadeMat();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), mat);
  body.scale.set(0.7, 1.7, 0.55);
  body.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), mat);
  head.position.y = 2.05;
  bob.add(body, head);
  const wisps = [];
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), mat);
    w.scale.set(0.45, 1.4, 0.35);
    w.position.y = 0.8;
    bob.add(w);
    wisps.push(w);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7dffc0, transparent: true, opacity: 0.9 });
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
    eye.position.set(s * 0.08, 2.08, 0.16);
    bob.add(eye);
    return eye;
  });
  let time = 0;
  let fade = 1;
  function setFree() { fade = Math.min(fade, 0.99); }
  function update(dt, anim = {}) {
    time += dt;
    if (anim.action === "idle" && fade < 1) fade = Math.max(0, fade - dt * 0.7);
    mat.uniforms.uTime.value = time;
    mat.uniforms.uFade.value = fade;
    eyeMat.opacity = fade;
    bob.position.y = Math.sin(time * 1.6) * 0.06;
    wisps.forEach((w, i) => {
      const a = time * 0.8 + i;
      w.position.set(Math.sin(a) * 0.28, 0.7 + (i % 2) * 0.4, Math.cos(a) * 0.2);
    });
    root.visible = fade > 0.02;
  }
  return { root, update, setFree };
}
