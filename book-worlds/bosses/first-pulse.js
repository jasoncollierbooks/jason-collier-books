// World III signature boss. A Nonimaginaire fused with this book's villain:
// the Hum, the ancient intelligence that rides electromagnetic waves.
import * as THREE from "three";
import { makeDust, spinDust } from "../src/rigs.js?v=2";

export const boss = {
  id: "blank-hum",
  world: "first-pulse",
  name: "The Blank Hum",
  hp: 340,
  radius: 1.55,
  home: { x: 0, z: 84, yaw: Math.PI },
  drain: { inner: 11, outer: 20 },
  lines: {
    entity: "That is the Hum with the face washed off. The vibration stayed.",
    native: "The Hum, and a fog wearing it. I like the rings. I do not like what is inside them.",
    react: "Ground the wave. The rings are only the announcement.",
    win: "The color is back in the carrier. I will take a quiet sky.",
  },
  objective: {
    waiting: "The Hum in the wave",
    fighting: "Break the hum",
  },
  create,
};

function staticMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHit: { value: 0 }, uTell: { value: 0 } },
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
      uniform float uHit;
      uniform float uTell;
      varying vec3 vP;
      varying vec3 vN;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      float noise(vec3 p){
        vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
        float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
        float e=hash(i+vec3(0,0,1)), f2=hash(i+vec3(1,0,1)), g=hash(i+vec3(0,1,1)), h=hash(i+vec3(1,1,1));
        return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f2,f.x), mix(g,h,f.x), f.y), f.z);
      }
      void main() {
        float n = noise(vP * 6.5 + vec3(0.0, -uTime * 2.4, uTime * 0.8));
        float scan = sin(vP.y * 28.0 - uTime * (10.0 + uTell * 16.0)) * 0.5 + 0.5;
        float fres = pow(1.0 - abs(vN.z), 1.3);
        float alpha = (0.08 + n * 0.28 + scan * 0.16) * (0.45 + fres * 0.7);
        alpha *= 0.55 + uTell * 0.45;
        vec3 col = mix(vec3(0.06, 0.07, 0.08), vec3(0.55, 0.58, 0.62), scan * n);
        col = mix(col, vec3(0.45, 0.58, 0.7), fres * 0.28);
        col += vec3(0.7, 0.78, 0.9) * uTell * scan * 0.35;
        col += vec3(uHit) * 0.4;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.42));
      }
    `,
  });
}

function wispMat() {
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
      void main() {
        float fres = pow(1.0 - abs(vN.z), 1.5);
        float wave = sin(vP.y * 5.0 - uTime * 2.0) * 0.5 + 0.5;
        float alpha = fres * (0.12 + wave * 0.22);
        vec3 col = mix(vec3(0.06, 0.07, 0.08), vec3(0.62, 0.66, 0.7), fres);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.4));
      }
    `,
  });
}

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const columnMat = staticMat();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.88, 4.6, 24, 1, true), columnMat);
  column.position.y = 2.45;
  rig.add(column);

  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x8eb8c8, transparent: true, opacity: 0.42 }),
  );
  heart.position.y = 2.55;
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.045, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xd7ecff, emissive: 0x9ecfff, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.25,
    }),
  );
  halo.position.y = 2.55;
  rig.add(heart, halo);

  const rings = [];
  for (let i = 0; i < 7; i++) {
    const brass = i % 2 === 0;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95 + i * 0.28, i % 3 === 0 ? 0.07 : 0.045, 8, 40),
      new THREE.MeshStandardMaterial({
        color: brass ? 0xd7b56a : 0xd5e2ee,
        emissive: brass ? 0x6a4018 : 0x2a4860,
        emissiveIntensity: 0.45,
        metalness: 0.55,
        roughness: 0.28,
      }),
    );
    ring.position.y = 0.55 + i * 0.58;
    ring.rotation.x = i % 2 === 0 ? Math.PI / 2 : 0.25;
    rig.add(ring);
    rings.push(ring);
  }

  const tendrils = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const mat = wispMat();
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat);
    wisp.scale.set(0.45, 2.1, 0.32);
    wisp.position.y = 1.15;
    g.add(wisp);
    g.position.y = 0.35;
    g.rotation.z = (i - 2.5) * 0.28;
    g.rotation.y = i * 1.05;
    rig.add(g);
    tendrils.push({ g, mat });
  }

  const dust = makeDust(90, 0xc5ccd4, 2.2);
  dust.position.y = 2.2;
  dust.material.size = 0.06;
  rig.add(dust);

  const light = new THREE.PointLight(0xd5e6ff, 0.7, 9, 2);
  light.position.y = 2.6;
  const warm = new THREE.PointLight(0xffc56a, 0.45, 7, 2);
  warm.position.set(0.4, 1.2, 0.2);
  root.add(light, warm);

  return {
    root,
    update(dt, a) {
      const t = performance.now() / 1000;
      const dead = a.state === "dead";
      const tell = dead ? 0 : (a.tell || 0);
      const hum = 0.5 + Math.sin(t * 3.2) * 0.5;
      columnMat.uniforms.uTime.value = t;
      columnMat.uniforms.uHit.value = a.hit || 0;
      columnMat.uniforms.uTell.value = tell;
      const flare = 1 + tell * 0.45 + (a.state === "pulse" ? 0.12 : 0);
      column.scale.set(flare, 1, flare);
      heart.material.opacity = dead ? 0.08 : 0.35 + hum * 0.28 + tell * 0.25;
      heart.scale.setScalar(1 + hum * 0.18 + tell * 0.35);
      halo.material.emissiveIntensity = dead ? 0.05 : 0.55 + hum * 0.45 + tell * 0.9;
      rings.forEach((ring, i) => {
        const spin = dead ? 0.15 : 0.7 + (a.phase || 1) * 0.25;
        ring.rotation.z = t * spin * (i % 2 ? -1 : 1);
        const breathe = 1 + Math.sin(t * 2.4 + i * 0.7) * 0.07;
        const wind = 1 + tell * (0.18 + i * 0.035);
        ring.scale.setScalar(breathe * wind);
        ring.material.emissiveIntensity = dead ? 0.05 : 0.28 + hum * 0.22 + tell * 0.7;
      });
      tendrils.forEach((tendril, i) => {
        tendril.mat.uniforms.uTime.value = t + i;
        tendril.g.rotation.z = (i - 2.5) * 0.28 + Math.sin(t * 1.3 + i) * (0.12 + tell * 0.2);
        tendril.g.scale.y = 1 + Math.sin(t * 1.6 + i) * 0.08 - tell * 0.15;
      });
      light.intensity = dead ? 0 : 0.9 + hum * 0.5 + tell * 0.8;
      warm.intensity = dead ? 0 : 0.25 + tell * 0.7;
      spinDust(dust, t * (1.1 + tell * 2));
      dust.material.opacity = dead ? 0.15 : 0.55 + tell * 0.3;
    },
  };
}
