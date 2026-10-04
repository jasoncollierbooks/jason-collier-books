// The First Pulse. A research ship in deep space: first light, the dish,
// the bridge, and the wave where the Hum rides.
import * as THREE from "three";
import { clamp, lerp } from "../../src/util.js";

export function heightAt() {
  return 0;
}

export function halfWidth(z) {
  if (z < 68) return 7.35;
  if (z < 76) return lerp(7.35, 11.4, (z - 68) / 8);
  if (z < 94) return 11.4;
  return 9.2;
}

function inside(x, z) {
  if (z < -16 || z > 108) return false;
  return Math.abs(x) < halfWidth(z) - 0.15;
}

function closestPoint(x, z) {
  const zz = clamp(z, -15.6, 107.4);
  const hw = halfWidth(zz) - 0.35;
  return { x: clamp(x, -hw, hw), z: zz };
}

function panelTexture(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#2a3038";
  g.fillRect(0, 0, size, size);
  const cell = size / 4;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? "#323942" : "#262c34";
      g.fillRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
      g.strokeStyle = "#14181e";
      g.lineWidth = 3;
      g.strokeRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
      g.fillStyle = "#c6a15a";
      g.beginPath();
      g.arc(x * cell + 14, y * cell + 14, 3.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = y === 1 && x === 2 ? "#7eb0c8" : "#1c2228";
      g.fillRect(x * cell + 28, y * cell + 22, cell * 0.42, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 14);
  return tex;
}

function starfield() {
  const n = 700;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 80 + Math.random() * 140;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf4ecdf, size: 0.55, sizeAttenuation: true }));
}

export function buildPulseWorld(scene, low) {
  const obstacles = [];
  const block = (x, z, r) => obstacles.push({ x, z, r });

  scene.fog = new THREE.FogExp2(0x141820, low ? 0.018 : 0.011);
  scene.background = new THREE.Color(0x07080e);

  const hemi = new THREE.HemisphereLight(0x9eb4d0, 0x2a241c, low ? 0.55 : 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xd7e2f2, low ? 1.35 : 1.7);
  sun.position.set(-12, 18, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -24;
  sun.shadow.camera.right = sun.shadow.camera.top = 24;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = low ? 1.2 : 2.4;
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight(0xffb15a, 0.6, 18, 2);
  fill.position.set(2, 3, 8);
  scene.add(fill);

  scene.add(starfield());
  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(220, 28, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP;
        uniform float uTime;
        void main() {
          vec3 d = normalize(vP);
          float band = smoothstep(0.15, 0.85, sin(d.x * 3.2 + d.y * 1.4 + uTime * 0.05) * 0.5 + 0.5);
          vec3 col = mix(vec3(0.03, 0.04, 0.08), vec3(0.45, 0.22, 0.28), band);
          col = mix(col, vec3(0.18, 0.28, 0.48), smoothstep(-0.2, 0.8, d.y) * 0.55);
          col += vec3(0.55, 0.32, 0.16) * pow(max(0.0, d.z * 0.3 + d.x * 0.2), 3.0) * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(nebula);

  const floorMat = new THREE.MeshStandardMaterial({
    map: panelTexture(low ? 256 : 512),
    roughness: 0.62,
    metalness: 0.28,
    color: 0xb7c0c8,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 130, 1, 1), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 46);
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a424c, roughness: 0.55, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ec4de, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.18,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0xc6a15a, roughness: 0.4, metalness: 0.55 });

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.2, 120), wallMat);
    wall.position.set(side * 7.5, 1.6, 42);
    wall.castShadow = true;
    scene.add(wall);
    for (let i = 0; i < 8; i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.5), glassMat);
      pane.position.set(side * 7.28, 1.85, -4 + i * 12);
      pane.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(pane);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.4), trim);
      rail.position.set(side * 7.32, 1.05, -4 + i * 12);
      scene.add(rail);
    }
  }
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 124),
    new THREE.MeshStandardMaterial({ color: 0x1c222a, roughness: 0.8, metalness: 0.2 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.35, 44);
  scene.add(ceiling);

  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  for (let z = -6; z < 100; z += 8) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 1.4), lampMat);
    lamp.position.set(0, 3.22, z);
    scene.add(lamp);
    const light = new THREE.PointLight(0xffe2b0, 0.35, 8, 2);
    light.position.set(0, 2.8, z);
    scene.add(light);
  }

  function consoleBank(x, z, rot) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.7), wallMat);
    body.position.y = 0.55;
    body.castShadow = true;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x163044, emissive: 0x3a7ea8, emissiveIntensity: 0.7, roughness: 0.3 }),
    );
    screen.position.set(0, 0.95, 0.36);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), trim);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.55, 0.72, 0.36);
    g.add(body, screen, knob);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
    block(x, z, 0.85);
    return screen;
  }
  const screens = [
    consoleBank(-4.2, -2, 0.4),
    consoleBank(4.4, 1.2, -0.5),
    consoleBank(0.2, 48, Math.PI),
    consoleBank(-3.6, 50, 0.8),
    consoleBank(3.8, 51, -0.7),
  ];

  const dish = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.48),
    new THREE.MeshStandardMaterial({ color: 0xd5dde6, roughness: 0.32, metalness: 0.62, side: THREE.DoubleSide }),
  );
  bowl.rotation.x = Math.PI * 0.55;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), trim);
  mast.position.y = 1.1;
  const feed = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampMat);
  feed.position.y = 2.15;
  dish.add(bowl, mast, feed);
  dish.position.set(0, 0.1, 28);
  scene.add(dish);
  block(0, 28, 2.4);

  const strutMat = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.45, metalness: 0.4 });
  for (const [x, z] of [[-2.2, 26], [2.2, 26], [-2.2, 30.2], [2.2, 30.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), strutMat);
    leg.position.set(x, 0.6, z);
    scene.add(leg);
  }

  const chests = [];
  chests.push(placeChest(scene, 4.6, 12, wallMat, trim));
  chests.push(placeChest(scene, -4.4, 58, wallMat, trim));

  const pages = buildPages(scene);
  const radio = buildRadio(scene);
  block(radio.x, radio.z, 0.45);
  const gate = buildGate(scene);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), wallMat);
  crate.position.set(-3.2, 0.28, -5);
  crate.castShadow = true;
  scene.add(crate);
  block(-3.2, -5, 0.45);

  return {
    obstacles,
    chests,
    pages,
    radio,
    gate,
    dish,
    sun,
    update(dt, t) {
      nebula.material.uniforms.uTime.value = t;
      dish.rotation.y = Math.sin(t * 0.15) * 0.18;
      for (const screen of screens) {
        screen.material.emissiveIntensity = 0.45 + Math.sin(t * 3 + screen.position.x) * 0.25;
      }
      posePages(pages, t);
      if (gate.ready || gate.open) {
        const pulse = 0.42 + Math.sin(t * 3) * 0.2;
        gate.glow.material.opacity = pulse;
        if (gate.sheet) gate.sheet.material.opacity = gate.open ? 0.55 : pulse * 0.8;
        if (gate.lamp) gate.lamp.intensity = 2.4 + Math.sin(t * 3) * 0.8;
      }
      sun.target.position.set(0, 0, 40);
      sun.target.updateMatrixWorld();
    },
    pullCamera(focus, cam) {
      const dir = cam.clone().sub(focus);
      let dist = dir.length();
      if (dist < 0.2) return cam;
      dir.multiplyScalar(1 / dist);
      for (let i = 0; i < 8; i++) {
        const p = focus.clone().addScaledVector(dir, dist);
        if (inside(p.x, p.z) && p.y < 3.05 && p.y > 0.4) break;
        dist *= 0.86;
      }
      const out = focus.clone().addScaledVector(dir, Math.max(1.3, dist));
      if (out.y < 0.7) out.y = 0.7;
      if (out.y > 2.9) out.y = 2.9;
      return out;
    },
    resolve(x, z, radius, extra) {
      let px = x;
      let pz = z;
      if (!inside(px, pz)) {
        const spot = closestPoint(px, pz);
        px = spot.x;
        pz = spot.z;
      }
      const all = extra ? obstacles.concat(extra) : obstacles;
      for (let n = 0; n < 2; n++) {
        for (const o of all) {
          let dx = px - o.x;
          let dz = pz - o.z;
          const d = Math.hypot(dx, dz);
          const min = radius + o.r;
          if (d < min) {
            if (d < 1e-4) { px += min; continue; }
            const push = (min - d) / d;
            px += dx * push;
            pz += dz * push;
          }
        }
        if (!inside(px, pz)) {
          const spot = closestPoint(px, pz);
          px = spot.x;
          pz = spot.z;
        }
      }
      return { x: px, z: pz };
    },
  };
}

function pageTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 176;
  const g = c.getContext("2d");
  g.fillStyle = "#f4ead4";
  g.fillRect(0, 0, 128, 176);
  g.strokeStyle = "#8a6a40";
  g.strokeRect(6, 6, 116, 164);
  g.fillStyle = "#3a2a1c";
  for (let i = 0; i < 8; i++) g.fillRect(18, 28 + i * 16, 92 - (i % 3) * 14, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPages(scene) {
  const tex = pageTexture();
  const spots = [
    ["only-hum", 1.4, 6],
    ["it-answered", -2.2, 16],
    ["the-dish", 3.2, 34],
    ["no-medium", -1.2, 54],
    ["invitations", 2.4, 70],
  ];
  return spots.map(([id, x, z]) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffe2a8, emissiveIntensity: 0.4,
      roughness: 0.55, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.86), mat);
    mesh.position.set(x, 1.15, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { id, x, z, mesh, got: false, baseY: 1.15 };
  });
}

function posePages(pages, t) {
  for (const p of pages) {
    if (p.got) { p.mesh.visible = false; continue; }
    p.mesh.visible = true;
    p.mesh.position.y = p.baseY + Math.sin(t * 1.6 + p.x) * 0.08;
    p.mesh.rotation.y = t * 0.55 + p.z;
  }
}

function placeChest(scene, x, z, bodyMat, trim) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.42, 0.5), bodyMat);
  body.position.y = 0.28;
  body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.52), trim);
  lid.position.y = 0.52;
  lid.geometry.translate(0, -0.08, -0.24);
  lid.position.z = 0.24;
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), trim);
  latch.position.set(0, 0.42, 0.26);
  group.add(body, lid, latch);
  group.position.set(x, 0, z);
  scene.add(group);
  return { x, z, group, lid, open: false };
}

function buildRadio(scene) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.72, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x243038, roughness: 0.5, metalness: 0.4 }),
  );
  box.position.y = 0.42;
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 12),
    new THREE.MeshBasicMaterial({ color: 0x8ec8ea }),
  );
  glow.position.set(0, 0.55, 0.17);
  group.add(box, glow);
  group.position.set(-4.8, 0, -8);
  scene.add(group);
  return { x: -4.8, z: -8, mesh: group, glow };
}

function buildGate(scene) {
  const root = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.07, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0xe7d7a2, emissive: 0xffe2a8, emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.3 }),
  );
  ring.position.y = 1.45;
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 1.35, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  glow.position.y = 1.45;
  const sheet = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  sheet.position.y = 1.45;
  const lamp = new THREE.PointLight(0xffe2a8, 0, 10, 2);
  lamp.position.y = 1.5;
  root.add(ring, glow, sheet, lamp);
  root.position.set(0, 0, 100);
  scene.add(root);
  return {
    root, glow, sheet, lamp, open: false, ready: false, x: 0, z: 100,
    setReady(v) { this.ready = !!v; },
    setOpen(v) { this.open = !!v; },
  };
}
