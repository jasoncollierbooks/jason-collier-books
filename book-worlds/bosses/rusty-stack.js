// World II signature boss. A Nonimaginaire fused with this book's enforcer:
// Baron von Smash, the seven-foot axe at the fortress hangar.
import * as THREE from "three";
import { damp } from "../src/util.js";
import { makeDust, spinDust, softDot } from "../src/rigs.js?v=5";
import { dusterGeometry, collarGeometry } from "../src/costume.js?v=1";

export const boss = {
  id: "blank-baron",
  world: "rusty-stack",
  name: "The Blank Baron",
  hp: 320,
  radius: 1.7,
  home: { x: 0, z: 62, yaw: Math.PI },
  drain: { inner: 11, outer: 20 },
  lines: {
    spacey: "That is the Baron with the face washed off. The axe stayed.",
    mira: "Seven feet, one monocle, no face. I like the monocle. I do not like the rest.",
    react: "Hook the knee. The monocle is for show.",
    win: "The hangar can have its storm back. We are keeping the color.",
  },
  objective: {
    waiting: "Baron in the hangar",
    fighting: "Break the baron",
  },
  create,
};

const fogMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uHit: { value: 0 }, uPhase: { value: 1 } },
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
    uniform float uPhase;
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
      float fres = pow(1.0 - abs(vN.z), 1.4);
      float n = noise(vP * 1.4 + vec3(0.0, uTime * 0.22, uTime * 0.08));
      float n2 = noise(vP * 3.1 - vec3(uTime * 0.28, 0.0, uTime * 0.16));
      float alpha = (0.04 + n * 0.16 + n2 * 0.08) * (0.2 + fres * 0.35) * (0.35 + uPhase * 0.12);
      vec3 col = mix(vec3(0.55), vec3(0.92), n);
      col = mix(col, vec3(0.78), fres * 0.25) + vec3(uHit);
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.22));
    }
  `,
});

function metal(hex, rough, metalness) {
  const emissive = new THREE.Color(hex);
  emissive.multiplyScalar(0.22);
  return new THREE.MeshStandardMaterial({
    color: hex, roughness: rough, metalness, emissive, emissiveIntensity: 0.42,
  });
}

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(1.42);
  root.add(rig);

  const iron = metal(0x9a968f, 0.48, 0.42);
  const plate = metal(0x5e5a56, 0.38, 0.74);
  const brass = metal(0xd4b15a, 0.28, 0.82);
  const cloth = new THREE.MeshStandardMaterial({ color: 0x5c3a42, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide });
  const capeMat = new THREE.MeshStandardMaterial({ color: 0x8e343c, roughness: 0.78, side: THREE.DoubleSide });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb9a090, roughness: 0.72 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, roughness: 0.55, emissive: 0x9a9a9a, emissiveIntensity: 0.18 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.72, 6, 14), iron);
  torso.position.y = 1.55;
  torso.scale.set(1.35, 1.05, 0.92);
  torso.castShadow = true;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), plate);
  belly.scale.set(1.25, 0.85, 0.9);
  belly.position.set(0, 1.35, 0.12);
  belly.castShadow = true;
  rig.add(torso, belly);

  const rivets = [];
  for (let i = 0; i < 8; i++) {
    const riv = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), brass);
    const a = (i / 8) * Math.PI * 2;
    riv.position.set(Math.cos(a) * 0.48, 1.35 + (i % 3) * 0.22, Math.sin(a) * 0.36);
    rig.add(riv);
    rivets.push(riv);
  }

  const plates = [];
  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), plate);
    pauldron.scale.set(1.2, 0.55, 0.9);
    pauldron.position.set(s * 0.58, 2.05, 0);
    pauldron.castShadow = true;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.08), plate);
    slab.position.set(s * 0.42, 1.45, 0.28);
    slab.castShadow = true;
    rig.add(pauldron, slab);
    plates.push(pauldron, slab);
  }

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin);
  skull.scale.set(0.9, 0.82, 0.95);
  skull.castShadow = true;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), plate);
  helm.position.y = 0.04;
  helm.castShadow = true;
  const spikeGeo = new THREE.ConeGeometry(0.035, 0.16, 5);
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(spikeGeo, brass);
    const a = -0.7 + i * 0.35;
    spike.position.set(Math.sin(a) * 0.12, 0.22, Math.cos(a) * 0.08);
    spike.rotation.z = -a * 0.35;
    head.add(spike);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.12), skin);
  jaw.position.set(0, -0.12, 0.08);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), faceMat);
  face.position.set(0, 0.02, 0.18);
  const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 12), brass);
  monocle.position.set(0.07, 0.03, 0.16);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.038, 12),
    new THREE.MeshStandardMaterial({ color: 0xd8e2ea, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.8 }),
  );
  lens.position.set(0.07, 0.03, 0.165);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.005, 4, 10), brass);
  chain.position.set(0.12, -0.08, 0.08);
  chain.rotation.y = 0.6;
  head.add(skull, helm, jaw, face, monocle, lens, chain);
  head.position.set(0, 2.35, 0.08);
  head.scale.setScalar(0.82);
  rig.add(head);

  const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.55, 4, 6), capeMat);
  cape.position.set(0, 1.45, -0.28);
  cape.geometry.translate(0, -0.4, 0);
  const coat = new THREE.Mesh(dusterGeometry(), capeMat);
  coat.scale.set(1.45, 1.2, 1.35);
  coat.position.y = 0.08;
  coat.castShadow = true;
  const collar = new THREE.Mesh(collarGeometry(), cloth);
  collar.scale.setScalar(1.35);
  collar.position.y = 0.15;
  rig.add(cape, coat, collar);

  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.62, 1.95, 0.05);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 3, 8), iron);
    upper.position.y = -0.22;
    upper.castShadow = true;
    const el = new THREE.Group();
    el.position.y = -0.42;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.26, 3, 8), iron);
    lower.position.y = -0.2;
    lower.castShadow = true;
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), plate);
    fist.position.y = -0.4;
    el.add(lower, fist);
    sh.add(upper, el);
    rig.add(sh);
    return { sh, el };
  };
  const left = arm(-1);
  const right = arm(1);

  const axe = new THREE.Group();
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.55, 7), metal(0x4a3424, 0.7, 0.08));
  haft.castShadow = true;
  const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.55), brass);
  bladeL.position.set(0, 0.62, 0.12);
  bladeL.scale.set(1, 1, 1);
  const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.55), brass);
  bladeR.position.set(0, 0.62, -0.12);
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.36, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.25, metalness: 0.7, emissive: 0x666666, emissiveIntensity: 0.15 }),
  );
  edge.position.y = 0.62;
  axe.add(haft, bladeL, bladeR, edge);
  axe.position.set(0, -0.15, 0.05);
  axe.rotation.x = 0.15;
  right.el.add(axe);

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.24, 0.96, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.28, 3, 8), iron);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 3, 8), plate);
    shin.position.y = -0.2;
    shin.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), metal(0x1a1614, 0.5, 0.4));
    boot.position.set(0, -0.42, 0.06);
    boot.castShadow = true;
    knee.add(shin, boot);
    hip.add(thigh, knee);
    rig.add(hip);
    legs.push(hip);
  }

  const fogWrap = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), fogMat);
  fogWrap.scale.set(0.62, 0.42, 0.5);
  fogWrap.position.y = 0.72;
  fogWrap.frustumCulled = false;
  const fogHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), fogMat);
  fogHead.position.set(0, 2.55, 0.12);
  fogHead.frustumCulled = false;
  rig.add(fogWrap, fogHead);

  const dust = makeDust(80, 0xe4e4e4, 1.8);
  dust.position.set(0, 1.6, 0);
  rig.add(dust);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 16),
    new THREE.MeshBasicMaterial({ map: softDot(), color: 0x140e0a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  let phaseT = 0;
  return {
    root,
    update(dt, a) {
      const phase = a.phase || 1;
      phaseT += dt * (a.moving ? 5.5 : 1.4);
      const dead = a.state === "dead";
      rig.position.y = dead ? 0 : Math.abs(Math.sin(phaseT)) * (a.moving ? 0.06 : 0.02);
      legs.forEach((hip, i) => {
        hip.rotation.x = a.moving ? Math.sin(phaseT + i * Math.PI) * 0.55 : Math.sin(phaseT * 0.4 + i) * 0.04;
      });
      const swing = a.state === "slam" || a.state === "slamWind";
      const wind = a.state === "slamWind" ? a.state : "";
      right.sh.rotation.x = swing ? (a.state === "slam" ? -1.7 : -0.7) : (a.state === "charge" ? -0.45 : -0.2);
      right.sh.rotation.z = -0.35;
      left.sh.rotation.x = a.state === "roar" || a.state === "roarWind" ? -1.3 : -0.25;
      left.sh.rotation.z = 0.4;
      const nod = a.state === "chargeWind" ? -0.25
        : a.state === "monocle" || a.state === "monocleWind" ? 0.15
          : a.state === "roar" || a.state === "roarWind" ? -0.45
            : 0.04;
      head.rotation.x = damp(head.rotation.x, nod, 7, dt);
      cape.rotation.x = 0.12 + Math.sin(phaseT * 1.4) * 0.08 + (a.moving ? 0.25 : 0);
      const pos = cape.geometry.attributes.position;
      if (!cape.userData.base) cape.userData.base = Float32Array.from(pos.array);
      const base = cape.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const y = base[i * 3 + 1];
        pos.setX(i, base[i * 3] + Math.sin(phaseT * 2.2 + y * 3.0) * 0.04 * (1 - y));
      }
      pos.needsUpdate = true;
      fogMat.uniforms.uTime.value = phaseT;
      fogMat.uniforms.uHit.value = (a.hit || 0) * 0.75 + (a.state === "roar" ? 0.3 : 0);
      fogMat.uniforms.uPhase.value = phase;
      faceMat.emissiveIntensity = 0.12 + phase * 0.12 + (a.hit || 0) * 0.5;
      brass.emissive = brass.emissive || new THREE.Color();
      brass.emissiveIntensity = phase >= 3 ? 0.75 : 0.5;
      for (const slab of plates) {
        if (phase >= 2 && !dead && !slab.userData.dropped) slab.userData.dropped = true;
        if (slab.userData.dropped && (slab.userData.fall || 0) < 1.15) {
          slab.userData.fall = (slab.userData.fall || 0) + dt * 1.6;
          slab.position.y -= dt * 1.6;
          slab.rotation.z += dt * slab.position.x * 0.4;
        }
      }
      cape.visible = phase < 3;
      spinDust(dust, phaseT);
      rig.rotation.x = damp(rig.rotation.x, a.state === "charge" ? 0.18 : 0, 6, dt);
      void wind;
    },
  };
}
