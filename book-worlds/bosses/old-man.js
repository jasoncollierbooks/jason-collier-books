// World IV signature boss. The Old Man, taken by the fog:
// bark skin, branch limbs, moss hair, green eyes, amber sap.
// Beating him frees him. The fog lifts. The eyes soften.
import * as THREE from "three";

export const boss = {
  id: "old-man",
  world: "old-man",
  name: "The Old Man",
  hp: 380,
  radius: 1.75,
  home: { x: 0.4, z: 88, yaw: Math.PI },
  drain: { inner: 8.5, outer: 16 },
  lines: {
    harlan: "That is him. Bark for skin. The fog is wearing the old man.",
    pin: "The spruce. Pin that arm.",
    win: "The green went out of his eyes. He is free of it.",
  },
  objective: {
    waiting: "The Old Man",
    fighting: "Free him",
  },
  create,
};

function barkMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHit: { value: 0 }, uFog: { value: 1 } },
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
      uniform float uFog;
      varying vec3 vP;
      varying vec3 vN;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float ridge = sin(vP.y * 9.0 + vP.x * 4.0) * 0.5 + 0.5;
        float grain = hash(floor(vP.xy * 7.0));
        vec3 bark = mix(vec3(0.28, 0.16, 0.08), vec3(0.45, 0.28, 0.14), ridge);
        bark = mix(bark, vec3(0.16, 0.22, 0.1), smoothstep(0.72, 0.95, grain) * 0.55);
        vec3 gray = vec3(0.28, 0.3, 0.31);
        vec3 col = mix(bark, gray, uFog * 0.72);
        col = mix(col, vec3(0.86, 0.48, 0.1), uHit * 0.75);
        float fres = pow(1.0 - abs(vN.z), 1.4);
        col += vec3(0.15, 0.2, 0.08) * fres * (1.0 - uFog);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function fogMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFog: { value: 1 } },
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
      uniform float uFog;
      varying vec3 vP;
      varying vec3 vN;
      void main() {
        float scan = sin(vP.y * 16.0 - uTime * 6.0) * 0.5 + 0.5;
        float fres = pow(1.0 - abs(vN.y), 1.3);
        float alpha = (0.08 + scan * 0.16 + fres * 0.2) * uFog;
        gl_FragColor = vec4(vec3(0.55, 0.58, 0.6), clamp(alpha, 0.0, 0.42));
      }
    `,
  });
}

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const bark = barkMat();
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3d5a32, roughness: 0.95 });
  const sapMat = new THREE.MeshStandardMaterial({
    color: 0xd88a28, emissive: 0xff9a2a, emissiveIntensity: 0.15, roughness: 0.35,
  });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 2.15, 10, 3), bark);
  torso.position.y = 2.05;
  torso.castShadow = true;
  rig.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), bark);
  head.position.y = 3.45;
  head.scale.set(1.05, 1.15, 0.95);
  head.castShadow = true;
  rig.add(head);

  const moss = [];
  for (let i = 0; i < 7; i++) {
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (i % 3) * 0.04, 0), mossMat);
    const a = (i / 7) * Math.PI * 2;
    clump.position.set(Math.cos(a) * 0.28, 3.85 + (i % 3) * 0.08, Math.sin(a) * 0.22);
    rig.add(clump);
    moss.push(clump);
  }

  function limb(side) {
    const g = new THREE.Group();
    g.position.set(side * 0.85, 2.7, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.15, 6), bark);
    upper.position.y = -0.45;
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 5), bark);
    fork.position.set(side * 0.18, -1.05, 0.05);
    fork.rotation.z = side * -0.6;
    g.add(upper, fork);
    rig.add(g);
    return g;
  }
  const armL = limb(-1);
  const armR = limb(1);

  function leg(side) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.15, 7), bark);
    mesh.position.set(side * 0.38, 0.58, 0);
    mesh.castShadow = true;
    rig.add(mesh);
    return mesh;
  }
  leg(-1);
  leg(1);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x39ff6a });
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
    eye.position.set(s * 0.18, 3.5, 0.42);
    rig.add(eye);
    return eye;
  });

  const sap = [];
  [[0.2, 2.2, 0.7], [-0.35, 1.7, 0.55], [0.5, 2.8, 0.4]].forEach(([x, y, z]) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), sapMat);
    drop.scale.set(0.7, 1.3, 0.7);
    drop.position.set(x, y, z);
    rig.add(drop);
    sap.push(drop);
  });

  const fog = fogMat();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.55, 16, 12), fog);
  shell.position.y = 2.15;
  shell.scale.set(1.15, 1.55, 1.05);
  rig.add(shell);

  const glow = new THREE.PointLight(0x39ff6a, 1.1, 9, 2);
  glow.position.y = 3.4;
  root.add(glow);

  let fogK = 1;
  let freed = false;
  const green = new THREE.Color(0x39ff6a);
  const warm = new THREE.Color(0xe7c48a);
  const eyeColor = new THREE.Color();

  function applyFree() {
    freed = true;
    fogK = 0;
  }

  return {
    root,
    free: applyFree,
    update(dt, a) {
      const t = performance.now() / 1000;
      const dead = a.state === "dead" || freed;
      if (dead) fogK = Math.max(0, fogK - dt * 0.55);
      else fogK = Math.min(1, fogK + dt * 0.4);
      if (a.freed) applyFree();
      bark.uniforms.uTime.value = t;
      bark.uniforms.uHit.value = a.hit || 0;
      bark.uniforms.uFog.value = fogK;
      fog.uniforms.uTime.value = t;
      fog.uniforms.uFog.value = fogK;
      const tell = dead ? 0 : (a.tell || 0);
      const breathe = 1 + Math.sin(t * 1.3) * 0.015;
      torso.scale.set(breathe, 1, breathe);
      sapMat.emissiveIntensity = dead ? 0.05 : 0.15 + (a.hit || 0) * 1.6;
      moss.forEach((clump, i) => {
        clump.rotation.y = t * 0.15 + i;
      });
      const state = a.state || "idle";
      let liftL = Math.sin(t * 0.6) * 0.08;
      let liftR = Math.sin(t * 0.6 + 1) * 0.08;
      if (state === "slamWind") { liftL = -2.2; liftR = -2.2; }
      else if (state === "slam") { liftL = 0.4; liftR = 0.4; }
      else if (state.startsWith("log")) { liftR = state === "logWind" ? -1.7 : 0.9; }
      else if (state.startsWith("roar")) { liftL = -1.2; liftR = -1.2; }
      else if (state.startsWith("trap")) { liftL = 0.9; liftR = -0.4; }
      else if (dead) { liftL = 0.55; liftR = 0.45; }
      armL.rotation.z = THREE.MathUtils.lerp(armL.rotation.z, 0.35 + liftL * 0.35, 0.12);
      armR.rotation.z = THREE.MathUtils.lerp(armR.rotation.z, -0.35 - liftR * 0.35, 0.12);
      const lean = state === "charge" ? 0.35 : dead ? 0.08 : tell * 0.05;
      rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, lean, 0.1);
      eyeColor.copy(green).lerp(warm, 1 - fogK);
      eyeMat.color.copy(eyeColor);
      glow.color.copy(eyeMat.color);
      glow.intensity = dead ? 0.35 : 0.7 + tell * 1.1 + Math.sin(t * 3) * 0.15;
      if (state.startsWith("roar") && !dead) {
        rig.scale.setScalar(1 + Math.sin(t * 18) * 0.02);
      } else rig.scale.setScalar(1);
    },
  };
}
