// World IV signature boss. The Old Man, taken by the fog:
// a huge shaggy Bigfoot, more ape than tree, with bark on the
// shoulders and forearms, moss, and a few twig snags.
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

function furMat() {
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
        float strand = hash(floor(vP.xy * vec2(14.0, 36.0) + vec2(uTime * 0.15, 0.0)));
        float ridge = sin(vP.y * 26.0 + vP.x * 5.0) * 0.5 + 0.5;
        vec3 fur = mix(vec3(0.04, 0.028, 0.02), vec3(0.18, 0.09, 0.045), ridge);
        fur = mix(fur, vec3(0.015, 0.01, 0.008), smoothstep(0.55, 0.95, strand) * 0.7);
        vec3 mist = vec3(0.45, 0.5, 0.58);
        vec3 col = mix(fur, mist, uFog * 0.28);
        col = mix(col, vec3(0.92, 0.55, 0.22), uHit * 0.65);
        float fres = pow(1.0 - abs(vN.z), 1.5);
        col += vec3(0.16, 0.1, 0.06) * fres * (0.35 + (1.0 - uFog) * 0.4);
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
        float scan = sin(vP.y * 10.0 - uTime * 2.4 + vP.x * 3.0) * 0.5 + 0.5;
        float fres = pow(1.0 - abs(vN.y), 1.2);
        float alpha = (0.05 + scan * 0.12 + fres * 0.16) * uFog;
        gl_FragColor = vec4(vec3(0.62, 0.7, 0.8), clamp(alpha, 0.0, 0.38));
      }
    `,
  });
}

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const fur = furMat();
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3d5a32, roughness: 0.95 });
  const twigMat = new THREE.MeshStandardMaterial({ color: 0x24180f, roughness: 0.92 });

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 10), fur);
  torso.scale.set(1.45, 1.05, 1.05);
  torso.position.y = 2.05;
  torso.castShadow = true;
  rig.add(torso);

  const yoke = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), fur);
  yoke.scale.set(1.9, 0.55, 0.9);
  yoke.position.set(0, 2.72, 0.06);
  yoke.castShadow = true;
  rig.add(yoke);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), fur);
  head.scale.set(1.08, 1.12, 1.18);
  head.position.set(0, 3.42, 0.22);
  head.castShadow = true;
  rig.add(head);

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.2), fur);
  brow.position.set(0, 3.55, 0.52);
  rig.add(brow);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fur);
  muzzle.scale.set(1.15, 0.65, 1.35);
  muzzle.position.set(0, 3.22, 0.52);
  rig.add(muzzle);

  function arm(side) {
    const g = new THREE.Group();
    g.position.set(side * 1.18, 2.62, 0.08);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.2, 7), fur);
    upper.position.y = -0.58;
    upper.castShadow = true;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.1, 6), fur);
    fore.position.y = -1.55;
    fore.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), fur);
    hand.scale.set(1.15, 0.62, 0.75);
    hand.position.y = -2.15;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.5, 0.08), barkMat);
    patch.position.set(side * 0.1, -1.45, 0.14);
    g.add(upper, fore, hand, patch);
    rig.add(g);
    return g;
  }
  const armL = arm(-1);
  const armR = arm(1);

  function leg(side) {
    const g = new THREE.Group();
    g.position.set(side * 0.42, 1.05, 0.02);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.9, 7), fur);
    thigh.position.y = -0.32;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.72, 6), fur);
    shin.position.y = -1.02;
    shin.castShadow = true;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 6), fur);
    foot.scale.set(0.85, 0.38, 1.45);
    foot.position.set(0, -1.38, 0.16);
    g.add(thigh, shin, foot);
    rig.add(g);
    return g;
  }
  const legL = leg(-1);
  const legR = leg(1);

  [-1, 1].forEach((side) => {
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.16), barkMat);
    patch.position.set(side * 0.92, 2.88, 0.12);
    patch.rotation.z = side * -0.35;
    patch.rotation.x = 0.2;
    rig.add(patch);
  });

  const moss = [];
  for (let i = 0; i < 7; i++) {
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + (i % 3) * 0.015, 0), mossMat);
    clump.scale.set(0.8, 2.1, 0.7);
    clump.position.set((i - 3) * 0.16, 2.55 + (i % 3) * 0.12, -0.55);
    rig.add(clump);
    moss.push(clump);
  }

  function snag(x, y, z, rz, len) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, len, 4), twigMat);
    stick.position.set(x, y, z);
    stick.rotation.z = rz;
    stick.rotation.x = 0.55;
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, len * 0.42, 3), twigMat);
    fork.position.set(x + Math.sin(rz) * 0.12, y + len * 0.32, z - 0.04);
    fork.rotation.z = rz + 0.9;
    fork.rotation.x = 0.2;
    rig.add(stick, fork);
  }
  snag(-0.16, 3.82, -0.02, -0.55, 0.52);
  snag(0.18, 3.88, 0.02, 0.62, 0.46);
  snag(0.04, 3.05, -0.72, 0.15, 0.68);
  snag(-0.28, 2.55, -0.62, -0.45, 0.5);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8dffc0 });
  const eyes = [-1, 1].map((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
    eye.position.set(s * 0.15, 3.48, 0.58);
    rig.add(eye);
    return eye;
  });

  const fog = fogMat();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.85, 14, 10), fog);
  shell.position.y = 2.05;
  shell.scale.set(1.2, 1.15, 1.0);
  rig.add(shell);

  const glow = new THREE.PointLight(0x8dffc0, 1.15, 9, 2);
  glow.position.set(0, 3.4, 0.4);
  root.add(glow);

  let fogK = 1;
  let freed = false;
  const green = new THREE.Color(0x8dffc0);
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
      const phase = a.phase || 1;
      if (dead) fogK = Math.max(0, fogK - dt * 0.55);
      else fogK = Math.min(phase >= 2 ? 1 : 0.85, fogK + dt * 0.35);
      if (a.freed) applyFree();
      fur.uniforms.uTime.value = t;
      fur.uniforms.uHit.value = a.hit || 0;
      fur.uniforms.uFog.value = fogK;
      fog.uniforms.uTime.value = t;
      fog.uniforms.uFog.value = fogK;
      const tell = dead ? 0 : (a.tell || 0);
      const moving = !!a.moving;
      const stride = moving ? Math.sin(t * 3.1) : Math.sin(t * 0.7) * 0.2;
      const state = a.state || "idle";
      const hunch = dead ? 0.16 : phase >= 3 ? 0.42 : phase >= 2 ? 0.36 : 0.28;
      rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, state === "charge" ? hunch + 0.22 : hunch, 0.08);
      rig.position.y = dead ? 0 : Math.abs(stride) * (moving ? 0.14 : 0.03);
      const sway = moving ? stride * 0.08 : Math.sin(t * 0.5) * 0.02;
      yoke.rotation.z = sway;
      torso.rotation.z = sway * 0.4;
      legL.rotation.x = stride * (moving ? 0.55 : 0.08);
      legR.rotation.x = -stride * (moving ? 0.55 : 0.08);
      let swingL = -stride * 0.65;
      let swingR = stride * 0.65;
      if (state === "slamWind") { swingL = -2.1; swingR = -2.1; }
      else if (state === "slam") { swingL = 0.7; swingR = 0.7; }
      else if (state.startsWith("log")) { swingR = state === "logWind" ? -1.8 : 0.85; }
      else if (state.startsWith("roar")) { swingL = -1.35; swingR = -1.35; }
      else if (state.startsWith("trap")) { swingL = 0.4; swingR = -1.5; }
      else if (dead) { swingL = 0.35; swingR = 0.28; }
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, swingL, 0.14);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, swingR, 0.14);
      armL.rotation.z = THREE.MathUtils.lerp(armL.rotation.z, 0.18, 0.1);
      armR.rotation.z = THREE.MathUtils.lerp(armR.rotation.z, -0.18, 0.1);
      const nod = state.startsWith("roar") ? -0.25 : state === "charge" ? 0.2 : dead ? 0.35 : 0.08;
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, nod, 0.1);
      moss.forEach((clump, i) => {
        clump.rotation.z = Math.sin(t * 1.2 + i) * 0.15;
      });
      eyeColor.copy(green).lerp(warm, 1 - fogK);
      eyeMat.color.copy(eyeColor);
      glow.color.copy(eyeMat.color);
      const phaseGlow = phase >= 3 ? 1.5 : phase >= 2 ? 1.15 : 0.85;
      glow.intensity = dead ? 0.28 : phaseGlow + tell * 0.9 + Math.sin(t * 2.4) * 0.08;
      const bulk = dead ? 1 : phase >= 3 ? 1.08 : phase >= 2 ? 1.04 : 1;
      rig.scale.setScalar(state.startsWith("roar") && !dead ? bulk + Math.sin(t * 14) * 0.015 : bulk);
    },
  };
}
