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

function create() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.position.y = 1.65;
  root.add(rig);

  const glass = new THREE.MeshStandardMaterial({
    color: 0x16382e, emissive: 0x0c241c, emissiveIntensity: 0.2,
    transparent: true, opacity: 0.2, roughness: 0.12, metalness: 0.04,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.28, 22, 16), glass);
  const wireGreen = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.62, 0),
    new THREE.MeshBasicMaterial({ color: 0x1f8f62, wireframe: true, transparent: true, opacity: 0.8 }),
  );
  const wireGold = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.95, 0),
    new THREE.MeshBasicMaterial({ color: 0xb8883e, wireframe: true, transparent: true, opacity: 0.55 }),
  );
  const hexMat = new THREE.MeshBasicMaterial({ color: 0x2f9a68, transparent: true, opacity: 0.8 });
  const hexes = [];
  for (let i = 0; i < 4; i++) {
    const hex = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.32, 0.045, 5, 6), hexMat);
    hex.rotation.x = Math.PI / 2;
    hex.position.y = -0.62 + i * 0.42;
    rig.add(hex);
    hexes.push(hex);
  }
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x1a4034, emissive: 0x3dcc88, emissiveIntensity: 0.4, roughness: 0.32,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), coreMat);
  const motePivot = new THREE.Group();
  const moteMat = new THREE.MeshStandardMaterial({
    color: 0xe7fff4, emissive: 0x6ad8a4, emissiveIntensity: 0.7, roughness: 0.3,
  });
  const motes = [];
  for (let i = 0; i < 6; i++) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), moteMat);
    const a = (i / 6) * Math.PI * 2;
    mote.position.set(Math.cos(a) * 1.15, Math.sin(a * 2) * 0.28, Math.sin(a) * 1.15);
    motePivot.add(mote);
    motes.push({ mesh: mote, a, y: (i % 2 ? 0.35 : -0.2) });
  }
  const wispMat = new THREE.MeshBasicMaterial({
    color: 0x1c2228, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  });
  const wisps = [];
  for (let i = 0; i < 5; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.28), wispMat);
    const a = (i / 5) * Math.PI * 2;
    w.position.set(Math.cos(a) * 1.05, 0.15 + (i % 3) * 0.25, Math.sin(a) * 1.05);
    w.lookAt(0, 0.2, 0);
    rig.add(w);
    wisps.push(w);
  }
  rig.add(shell, wireGreen, wireGold, core, motePivot);
  const light = new THREE.PointLight(0x88ffc0, 0.4, 7, 2);
  rig.add(light);

  let time = 0;
  let freed = false;
  let fogAmt = 1;
  const hexGroup = { hexes };
  function free() { freed = true; }
  function update(dt, anim = {}) {
    time += dt;
    const phase = anim.phase || 1;
    if (freed || anim.freed) fogAmt = Math.max(0, fogAmt - dt * 0.7);
    wispMat.opacity = 0.34 * fogAmt;
    const spin = (freed ? 0.28 : 0.45 + phase * 0.18) * (anim.state === "sweep" ? 1.8 : 1);
    wireGreen.rotation.y += dt * spin;
    wireGreen.rotation.x += dt * spin * 0.35;
    wireGold.rotation.y -= dt * spin * 0.72;
    wireGold.rotation.z += dt * 0.2;
    hexGroup.hexes.forEach((hex, i) => {
      hex.rotation.z += dt * (0.25 + i * 0.08) * (i % 2 ? -1 : 1);
    });
    motePivot.rotation.y += dt * (0.7 + phase * 0.15);
    motes.forEach((mote, i) => {
      const a = mote.a + time * (0.8 + i * 0.05);
      mote.mesh.position.set(Math.cos(a) * 1.15, mote.y + Math.sin(time * 2 + i) * 0.12, Math.sin(a) * 1.15);
    });
    const swell = anim.state === "collapse" || anim.state === "collapseWind" ? 1.08 : 1;
    const s = (freed ? 0.98 + Math.sin(time * 1.4) * 0.02 : 1) * swell;
    shell.scale.setScalar(s);
    wireGreen.scale.setScalar(s);
    const hit = anim.hit || 0;
    if (freed) {
      coreMat.emissive.setHex(0xe0a050);
      coreMat.emissiveIntensity = 0.55;
      light.color.setHex(0xffd7a0);
      light.intensity = 0.7;
      moteMat.emissive.setHex(0xe8c080);
      wireGreen.material.color.setHex(0xc4924a);
      wireGold.material.color.setHex(0xe0b86a);
      hexMat.color.setHex(0xd7a85a);
    } else {
      const hot = phase >= 3 ? 0xc45a88 : phase >= 2 ? 0xd7a85a : 0x2fa872;
      coreMat.emissive.setHex(hot);
      coreMat.emissiveIntensity = 0.35 + hit * 0.15;
      light.color.setHex(phase >= 3 ? 0xff9ec8 : phase >= 2 ? 0xffe0a8 : 0x88ffc0);
      light.intensity = 0.32 + phase * 0.06 + hit * 0.1;
    }
    if (anim.state === "dead") rig.position.y = 1.65 + Math.sin(time) * 0.04;
  }
  return { root, update, free };
}
