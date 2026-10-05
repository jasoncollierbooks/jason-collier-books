// World V signature boss. A zero-point photon shell, taken by the fog.
// Beating it frees the shell. The light settles. It is born twice.
import * as THREE from "three";

export const boss = {
  id: "photon-shell",
  world: "thorne-lab",
  name: "Photon Shell",
  hp: 360,
  radius: 1.85,
  home: { x: 0.2, z: 90, yaw: Math.PI },
  drain: { inner: 7.5, outer: 15 },
  lines: {
    thorne: "That is the shell. Zero-point. The fog is inside the light.",
    pin: "The bell jar. Pin it to the glass.",
    win: "The fog left the shell. It is born twice.",
  },
  objective: {
    waiting: "The photon shell",
    fighting: "Free the shell",
  },
  create,
};

function shellMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHit: { value: 0 },
      uFog: { value: 1 },
      uPhase: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vP = position;
        vN = normalize(normalMatrix * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uHit;
      uniform float uFog;
      uniform float uPhase;
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(viewDir, normalize(vN)), 0.0), 1.7);
        float scan = sin(vP.y * 28.0 + uTime * (4.0 + uPhase) + vP.x * 6.0) * 0.5 + 0.5;
        float band = smoothstep(0.35, 0.85, scan);
        vec3 cool = vec3(0.55, 1.0, 0.82);
        vec3 hot = vec3(1.0, 0.45, 0.85);
        vec3 gold = vec3(1.0, 0.78, 0.35);
        vec3 base = mix(cool, hot, clamp(uPhase - 1.0, 0.0, 1.0) * 0.55);
        base = mix(base, gold, 1.0 - uFog);
        vec3 mist = vec3(0.55, 0.6, 0.66);
        vec3 col = mix(base, mist, uFog * (0.25 + scan * 0.35));
        col += base * fres * (0.85 + (1.0 - uFog));
        col += vec3(1.0) * band * fres * 0.35;
        col = mix(col, vec3(1.0, 0.95, 0.8), uHit * 0.7);
        float alpha = (0.18 + fres * 0.62 + band * 0.12) * (0.55 + (1.0 - uFog) * 0.35);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.92));
      }
    `,
  });
}

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.position.y = 1.75;
  root.add(rig);

  const mat = shellMat();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.55, 28, 20), mat);
  shell.scale.set(1, 0.92, 1);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x07080c });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 12), innerMat);
  const rings = [];
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xc8ffe8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });
  [0.4, 1.1, 2.0].forEach((tilt, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + i * 0.18, 0.025, 8, 40), ringMat);
    ring.rotation.x = tilt;
    ring.rotation.y = i;
    rig.add(ring);
    rings.push(ring);
  });
  const motePivot = new THREE.Group();
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xe8fff4 });
  const motes = [];
  for (let i = 0; i < 8; i++) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), moteMat);
    const a = (i / 8) * Math.PI * 2;
    mote.position.set(Math.cos(a) * 1.35, Math.sin(a * 2) * 0.35, Math.sin(a) * 1.35);
    motePivot.add(mote);
    motes.push(mote);
  }
  const fog = new THREE.Mesh(new THREE.SphereGeometry(1.72, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x9aa4b0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
  }));
  rig.add(shell, inner, motePivot, fog);
  const light = new THREE.PointLight(0xb8ffd8, 6, 16, 2);
  rig.add(light);

  let time = 0;
  let freed = false;
  function free() { freed = true; }
  function update(dt, anim = {}) {
    time += dt;
    const phase = anim.phase || 1;
    mat.uniforms.uTime.value = time;
    mat.uniforms.uHit.value = anim.hit || 0;
    mat.uniforms.uPhase.value = phase;
    const fogAmt = freed || anim.freed ? Math.max(0, mat.uniforms.uFog.value - dt * 0.7) : 1;
    mat.uniforms.uFog.value = fogAmt;
    fog.material.opacity = 0.2 * fogAmt;
    const spin = (freed ? 0.35 : 0.8 + phase * 0.45) * (anim.state === "sweep" ? 2.4 : 1);
    shell.rotation.y += dt * spin;
    shell.rotation.z = Math.sin(time * (phase === 3 ? 3 : 1.2)) * 0.08;
    motePivot.rotation.y += dt * (1.4 + phase * 0.4);
    rings.forEach((ring, i) => {
      ring.rotation.z += dt * (0.4 + i * 0.25) * (phase === 3 ? 1.8 : 1);
      ringMat.opacity = freed ? 0.35 : 0.45 + Math.sin(time * 3 + i) * 0.15;
    });
    const swell = anim.state === "collapse" || anim.state === "collapseWind" ? 1.12 : 1;
    const s = (freed ? 0.96 + Math.sin(time * 1.6) * 0.03 : 1) * swell;
    shell.scale.set(s, s * 0.92, s);
    if (freed) {
      innerMat.color.setHex(0xffd27a);
      light.color.setHex(0xffd27a);
      light.intensity = 4.5 + Math.sin(time * 2) * 0.4;
      moteMat.color.setHex(0xffe2a8);
    } else {
      const hot = phase >= 3 ? 0xff7ad0 : phase >= 2 ? 0xffe0a0 : 0xc8ffe4;
      light.color.setHex(hot);
      light.intensity = 5 + phase * 1.4 + (anim.hit || 0) * 4;
      innerMat.color.setHex(phase >= 3 ? 0x1a0814 : 0x07080c);
    }
    if (anim.state === "dead") {
      rig.position.y = 1.75 + Math.sin(time) * 0.05;
    }
  }
  return { root, update, free };
}
