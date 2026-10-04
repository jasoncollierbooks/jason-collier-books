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
    listener: "That is the Hum with the face washed off. The vibration stayed.",
    pilot: "The Hum, and a fog wearing it. I like the rings. I do not like what is inside them.",
    react: "Ground the wave. The rings are only the announcement.",
    win: "The color is back in the carrier. I will take a quiet sky.",
  },
  objective: {
    waiting: "The Hum in the wave",
    fighting: "Break the hum",
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
      float n = noise(vP * 1.6 + vec3(0.0, uTime * 0.35, uTime * 0.12));
      float wave = sin(vP.y * 6.0 - uTime * 3.0) * 0.5 + 0.5;
      float alpha = (0.05 + n * 0.16 + wave * 0.08) * (0.22 + fres * 0.4) * (0.4 + uPhase * 0.1);
      vec3 col = mix(vec3(0.48, 0.5, 0.54), vec3(0.9, 0.92, 0.94), n);
      col = mix(col, vec3(0.72, 0.78, 0.86), wave * 0.35) + vec3(uHit);
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.28));
    }
  `,
});

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const hide = new THREE.MeshStandardMaterial({
    color: 0x8d939c, roughness: 0.62, metalness: 0.22,
    emissive: 0x2a3038, emissiveIntensity: 0.45,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc6a15a, roughness: 0.35, metalness: 0.62, emissive: 0x3a2a10, emissiveIntensity: 0.35,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xd7e4f2, roughness: 0.22, metalness: 0.08, emissive: 0x8aa4c8, emissiveIntensity: 0.8,
  });

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 2.4, 16), hide);
  column.position.y = 1.35;
  column.castShadow = true;
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), hide);
  shoulder.scale.set(1.15, 0.7, 0.9);
  shoulder.position.y = 2.15;
  shoulder.castShadow = true;
  rig.add(column, shoulder);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 20),
    new THREE.MeshBasicMaterial({ color: 0xd0d0d0 }),
  );
  face.position.set(0, 2.15, 0.48);
  rig.add(face);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), coreMat);
  core.position.y = 1.45;
  rig.add(core);

  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95 + i * 0.22, 0.035, 8, 28), brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.7 + i * 0.55;
    rig.add(ring);
    rings.push(ring);
  }

  const wrap = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 14), fogMat);
  wrap.scale.set(1, 1.35, 1);
  wrap.position.y = 1.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), fogMat.clone());
  head.material.uniforms = {
    uTime: fogMat.uniforms.uTime,
    uHit: fogMat.uniforms.uHit,
    uPhase: fogMat.uniforms.uPhase,
  };
  head.position.y = 2.2;
  rig.add(wrap, head);

  const dust = makeDust(48, 0xd7e4f2, 1.6);
  dust.position.y = 1.3;
  rig.add(dust);

  const light = new THREE.PointLight(0xc5d4ea, 1.4, 9, 2);
  light.position.y = 1.6;
  root.add(light);

  return {
    root,
    update(dt, a) {
      const t = performance.now() / 1000;
      fogMat.uniforms.uTime.value = t;
      fogMat.uniforms.uHit.value = a.hit || 0;
      fogMat.uniforms.uPhase.value = a.phase || 1;
      const spin = a.state === "dead" ? 0.2 : 0.8 + (a.phase || 1) * 0.35;
      rings.forEach((ring, i) => {
        ring.rotation.z = t * spin * (i % 2 ? -1 : 1);
        ring.visible = (a.phase || 1) < 3 || i === 0;
        ring.position.y = 0.7 + i * 0.55 + Math.sin(t * 2 + i) * 0.04;
      });
      core.material.emissiveIntensity = a.state === "dead" ? 0.05 : 0.45 + Math.sin(t * 6) * 0.35;
      core.visible = a.state !== "dead";
      face.material.color.setHex(a.state === "dead" ? 0x6a6a6a : 0xd8d8d8);
      light.intensity = a.state === "dead" ? 0 : 1.1 + Math.sin(t * 5) * 0.5;
      spinDust(dust, t * 1.2);
      if (a.state === "pulse" || a.state === "pulseWind") {
        wrap.scale.setScalar(1 + Math.sin(t * 10) * 0.04);
      }
    },
  };
}
