// World I signature boss. A Nonimaginaire fused with this book's threat:
// the bear from the hunt that turned on the hunters, waiting at the ford.
import * as THREE from "three";
import { damp } from "../src/util.js";
import { makeDust, spinDust } from "../src/rigs.js?v=5";

export const boss = {
  id: "blank-bear",
  world: "california-trail",
  name: "The Blank Bear",
  hp: 280,
  radius: 2.05,
  home: { x: 0, z: 114, yaw: Math.PI },
  drain: { inner: 12, outer: 22 },
  lines: {
    jang: "That bear has no face and too many opinions.",
    tom: "I don't like a bear that eats the pages, Jang.",
    lasso: "Lasso the neck. It is not a horse, but it can be convinced.",
    win: "The hunt is over. I will not be putting that on a handbill.",
  },
  objective: {
    waiting: "Bear at the ford",
    fighting: "Break the bear",
    thinning(left) {
      return left === 1 ? "1 page left" : `${left} pages left`;
    },
  },
  create,
};

const bearFog = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uHit: { value: 0 } },
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vN;
    varying vec3 vP;
    void main() {
      vP = position;
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uHit;
    varying vec3 vN;
    varying vec3 vP;
    float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
    float noise(vec3 p){
      vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
      float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
      float e=hash(i+vec3(0,0,1)), f2=hash(i+vec3(1,0,1)), g=hash(i+vec3(0,1,1)), h=hash(i+vec3(1,1,1));
      return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f2,f.x), mix(g,h,f.x), f.y), f.z);
    }
    void main() {
      float fres = pow(1.0 - abs(vN.z), 1.35);
      float n = noise(vP * 1.6 + vec3(0.0, uTime * 0.25, uTime * 0.1));
      float n2 = noise(vP * 3.4 - vec3(uTime * 0.3, 0.0, uTime * 0.18));
      float core = smoothstep(1.1, 0.2, length(vP));
      float alpha = (0.06 + n * 0.32 + n2 * 0.18) * (0.25 + fres) * mix(0.55, 1.3, core);
      vec3 col = mix(vec3(0.38), vec3(0.9), n);
      col = mix(col, vec3(0.7), fres * 0.4) + vec3(uHit);
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.62));
    }
  `,
});

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(1.35);
  root.add(rig);

  const hide = new THREE.MeshStandardMaterial({ color: 0x6a6a66, roughness: 0.92, metalness: 0.02, emissive: 0x2a2a28, emissiveIntensity: 0.18 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3e3e3c, roughness: 0.88, metalness: 0.04, emissive: 0x161616, emissiveIntensity: 0.08 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xd2d2d2, roughness: 0.7, metalness: 0, emissive: 0x9a9a9a, emissiveIntensity: 0.12 });

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 16), hide);
  torso.scale.set(1.05, 0.82, 1.55);
  torso.position.set(0, 1.15, -0.05);
  torso.castShadow = true;
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), hide);
  hump.scale.set(1.05, 0.62, 1.15);
  hump.position.set(0, 1.72, -0.22);
  hump.castShadow = true;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), hide);
  belly.scale.set(1.15, 0.7, 1.05);
  belly.position.set(0, 0.82, 0.15);
  rig.add(torso, hump, belly);

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), hide);
  skull.scale.set(1.05, 0.92, 1.08);
  skull.castShadow = true;
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), dark);
  muzzle.scale.set(0.95, 0.62, 1.45);
  muzzle.position.set(0, -0.06, 0.32);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), dark);
  nose.position.set(0, 0.02, 0.58);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), faceMat);
  face.position.set(0, 0.04, 0.34);
  head.add(skull, muzzle, nose, face);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), dark);
    ear.scale.set(0.55, 1.15, 0.35);
    ear.position.set(s * 0.24, 0.28, -0.02);
    ear.castShadow = true;
    head.add(ear);
  }
  head.position.set(0, 1.42, 1.15);
  rig.add(head);

  const legs = [];
  const fronts = [];
  for (const [x, z, front] of [[-0.38, 0.48, true], [0.38, 0.48, true], [-0.42, -0.72, false], [0.42, -0.72, false]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 1.05, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.13 : 0.16, 0.28, 4, 8), hide);
    upper.position.y = -0.22;
    upper.castShadow = true;
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.1 : 0.13, 0.26, 3, 8), hide);
    lower.position.y = -0.16;
    lower.castShadow = true;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(front ? 0.14 : 0.16, 10, 8), dark);
    paw.scale.set(1.15, 0.45, 1.35);
    paw.position.set(0, -0.36, 0.06);
    knee.add(lower, paw);
    hip.add(upper, knee);
    rig.add(hip);
    legs.push(hip);
    if (front) fronts.push(hip);
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), dark);
  tail.scale.set(1, 0.8, 1.2);
  tail.position.set(0, 1.15, -1.15);
  rig.add(tail);

  const fogWrap = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 14), bearFog);
  fogWrap.scale.set(1.15, 0.95, 1.45);
  fogWrap.position.set(0, 1.25, 0.05);
  fogWrap.frustumCulled = false;
  const fogHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), bearFog);
  fogHead.position.set(0, 1.55, 1.2);
  fogHead.scale.set(1.15, 1.05, 1.35);
  fogHead.frustumCulled = false;
  rig.add(fogWrap, fogHead);

  const dust = makeDust(90, 0xe6e6e6, 2.1);
  dust.position.set(0, 1.4, 0.15);
  rig.add(dust);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  let phase = 0;
  return {
    root,
    update(dt, a) {
      phase += dt * (a.moving ? 6.5 : 1.5);
      rig.position.y = a.state === "dead" ? 0 : Math.abs(Math.sin(phase)) * (a.moving ? 0.05 : 0.02);
      legs.forEach((hip, i) => {
        const walk = a.moving ? Math.sin(phase + (i % 2) * Math.PI) * 0.55 : Math.sin(phase * 0.35 + i) * 0.04;
        hip.rotation.x = walk;
      });
      if (a.state === "slam") fronts.forEach((hip) => { hip.rotation.x = 1.15; });
      const nod = a.state === "chargeWind" ? -0.42
        : a.state === "charge" ? 0.28
          : a.state === "slam" ? 0.65
            : a.state === "roar" || a.state === "roarWind" ? -0.5
              : 0.05;
      head.rotation.x = damp(head.rotation.x, nod, 8, dt);
      bearFog.uniforms.uTime.value = phase;
      bearFog.uniforms.uHit.value = (a.hit || 0) * 0.7 + (a.state === "roar" ? 0.25 : 0);
      hide.emissive.setHex((a.hit || 0) > 0.2 ? 0xd8d8d8 : 0x2a2a28);
      faceMat.emissiveIntensity = 0.08 + (a.hit || 0) * 0.6;
      spinDust(dust, phase);
      rig.rotation.x = damp(rig.rotation.x, a.state === "charge" ? 0.1 : 0, 6, dt);
    },
  };
}
