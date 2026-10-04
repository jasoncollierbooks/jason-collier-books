// The First Pulse. A quantum realm: particle fields, crystalline islands,
// probability ripples, and glowing wave patterns. The path stays walkable.
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

function starfield(n, color, size, near, far) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = near + Math.random() * (far - near);
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.65 + 8;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false,
  }));
}

function particleField(n, color, size, spread) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread.x;
    pos[i * 3 + 1] = 0.4 + Math.random() * spread.y;
    pos[i * 3 + 2] = -16 + Math.random() * spread.z;
    phase[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false,
  }));
  points.userData.base = pos.slice();
  points.userData.phase = phase;
  return points;
}

function crystalMat(color) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.22,
    roughness: 0.18, metalness: 0.38, flatShading: true,
  });
}

export function buildPulseWorld(scene, low) {
  const obstacles = [];
  const block = (x, z, r) => obstacles.push({ x, z, r });

  scene.fog = new THREE.Fog(0x6a5088, 38, 108);
  scene.background = new THREE.Color(0x4a3268);
  scene.environmentIntensity = low ? 0.55 : 0.68;

  const hemi = new THREE.HemisphereLight(0xe7d4ff, 0xc4a070, low ? 0.72 : 0.88);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2c0, low ? 1.05 : 1.22);
  sun.position.set(-12, 24, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -28;
  sun.shadow.camera.right = sun.shadow.camera.top = 28;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = low ? 1.2 : 2.4;
  scene.add(sun, sun.target);
  const teal = new THREE.DirectionalLight(0x3ec8c4, low ? 0.42 : 0.55);
  teal.position.set(18, 10, 20);
  scene.add(teal);
  const violet = new THREE.DirectionalLight(0xb388ff, 0.28);
  violet.position.set(-8, 6, 40);
  scene.add(violet);
  const rimWarm = new THREE.PointLight(0xffd7a8, 2.2, 6.5, 2);
  const rimCool = new THREE.PointLight(0x7ee0ea, 1.4, 5.2, 2);
  scene.add(rimWarm, rimCool);

  scene.add(starfield(low ? 420 : 700, 0xfff4dc, 0.28, 90, 200));
  scene.add(starfield(low ? 80 : 140, 0xf0c56a, 0.36, 100, 180));
  scene.add(starfield(60, 0x7ee0ea, 0.3, 100, 170));

  const nebulaMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vP;
      uniform float uTime;
      void main() {
        vec3 d = normalize(vP);
        float gold = smoothstep(0.05, 0.85, sin(d.x * 2.1 + d.z * 1.4 + uTime * 0.05) * 0.5 + 0.5);
        float teal = smoothstep(-0.1, 0.8, sin(d.y * 2.4 + d.x * 1.6 - uTime * 0.04));
        float violet = smoothstep(0.0, 0.9, sin(d.z * 1.8 + d.y * 2.2 + uTime * 0.03) * 0.5 + 0.55);
        vec3 col = vec3(0.28, 0.16, 0.38);
        col = mix(col, vec3(0.78, 0.52, 0.18), gold * 0.72);
        col = mix(col, vec3(0.1, 0.48, 0.5), teal * 0.55);
        col = mix(col, vec3(0.42, 0.22, 0.62), violet * 0.4);
        float lift = smoothstep(-0.2, 0.65, d.y);
        col = mix(vec3(0.36, 0.22, 0.42), col, 0.45 + lift * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const nebula = new THREE.Mesh(new THREE.SphereGeometry(220, low ? 20 : 28, low ? 14 : 18), nebulaMat);
  scene.add(nebula);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 132),
    new THREE.MeshStandardMaterial({
      color: 0x7a6298, emissive: 0x3a2458, emissiveIntensity: 0.18,
      roughness: 0.86, metalness: 0.04,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.02, 46);
  floor.receiveShadow = true;
  scene.add(floor);

  const ribbonMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vW;
      void main() {
        float wave = sin(vW.z * 0.48 + uTime * 1.2) * 0.5 + 0.5;
        float wave2 = sin(vW.x * 1.3 - vW.z * 0.28 + uTime * 0.7) * 0.5 + 0.5;
        float bands = smoothstep(0.35, 0.5, fract(vW.z * 0.08 + wave * 0.15));
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        vec3 gold = vec3(0.9, 0.68, 0.28);
        vec3 teal = vec3(0.16, 0.66, 0.62);
        vec3 violet = vec3(0.5, 0.28, 0.72);
        vec3 col = mix(violet, gold, wave);
        col = mix(col, teal, wave2 * 0.62);
        col += vec3(0.15) * bands;
        gl_FragColor = vec4(col, edge * (0.42 + wave * 0.22));
      }
    `,
  });
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 126), ribbonMat);
  ribbon.rotation.x = -Math.PI / 2;
  ribbon.position.set(0, 0.04, 46);
  scene.add(ribbon);

  const fields = [
    particleField(low ? 220 : 380, 0xf0c56a, 0.16, { x: 22, y: 7, z: 130 }),
    particleField(low ? 160 : 260, 0x3ec8c4, 0.13, { x: 26, y: 8, z: 130 }),
    particleField(low ? 120 : 200, 0xc084fc, 0.14, { x: 20, y: 6.5, z: 130 }),
  ];
  fields.forEach((field) => scene.add(field));

  const islands = [];
  const islandColors = [0xf0c56a, 0x3ec8c4, 0xb388ff, 0xe7b45a, 0x7ee0ea];
  function addIsland(x, z, scale, color, bob) {
    const group = new THREE.Group();
    const mat = crystalMat(color);
    const slab = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), mat);
    slab.scale.set(1.8, 0.38, 1.25);
    slab.position.y = 0.15;
    slab.castShadow = true;
    group.add(slab);
    for (let i = 0; i < 4; i++) {
      const h = 0.9 + (i % 3) * 0.45;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18 + (i % 2) * 0.06, h, 5), mat);
      const a = i * 1.5;
      spike.position.set(Math.cos(a) * 0.7, 0.45 + h * 0.35, Math.sin(a) * 0.5);
      spike.castShadow = true;
      group.add(spike);
    }
    group.position.set(x, 0.35, z);
    group.scale.setScalar(scale);
    group.userData.bob = bob;
    group.userData.baseY = 0.35 + (bob % 3) * 0.15;
    scene.add(group);
    islands.push(group);
  }
  const islandSpots = [
    [-10.2, -4, 1.35, 0], [10.4, 2, 1.15, 1],
    [-9.6, 14, 1.5, 2], [11.2, 18, 1.05, 3],
    [-11, 32, 1.4, 4], [9.8, 36, 1.25, 0],
    [-10.5, 50, 1.2, 1], [11, 56, 1.45, 2],
    [-9.4, 70, 1.3, 3], [10.6, 78, 1.15, 4],
    [-11.2, 90, 1.4, 0], [9.5, 96, 1.2, 1],
  ];
  islandSpots.forEach(([x, z, scale, hue], i) => {
    addIsland(x, z, scale, islandColors[hue % islandColors.length], i);
  });

  const overhead = [];
  for (let i = 0; i < 8; i++) {
    const mat = crystalMat(islandColors[i % islandColors.length]);
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
    mesh.position.set(i % 2 ? 0.7 : -0.55, 2.9, -4 + i * 14);
    mesh.castShadow = true;
    mesh.userData.spin = 0.4 + (i % 3) * 0.2;
    scene.add(mesh);
    overhead.push(mesh);
  }

  const ripples = [];
  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.68, 28),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xf0c56a : i % 3 === 1 ? 0x3ec8c4 : 0xc084fc,
        transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(i % 3 === 0 ? 0 : i % 3 === 1 ? 0.7 : -0.65, 0.08, -10 + i * 8);
    ring.userData.phase = i * 0.6;
    scene.add(ring);
    ripples.push(ring);
  }

  const sideColors = [0xf0c56a, 0x3ec8c4, 0xb388ff];
  for (let z = -2; z < 100; z += 11) {
    for (const side of [-1, 1]) {
      const h = 1.1 + ((z + side) % 5) * 0.12;
      const color = sideColors[Math.abs(z + side) % 3];
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, h, 5), crystalMat(color));
      const x = side * (1.85 + (Math.abs(z) % 3) * 0.12);
      mesh.position.set(x, h * 0.35, z);
      mesh.castShadow = true;
      scene.add(mesh);
      block(x, z, 0.48);
    }
  }

  const pages = buildPages(scene);
  const chestMat = new THREE.MeshStandardMaterial({
    color: 0xc4a05a, emissive: 0xf0c56a, emissiveIntensity: 0.18,
    roughness: 0.4, metalness: 0.45,
  });
  const chestTrim = new THREE.MeshStandardMaterial({
    color: 0x3ec8c4, emissive: 0x3ec8c4, emissiveIntensity: 0.22,
    roughness: 0.35, metalness: 0.4,
  });
  const chests = [
    placeChest(scene, 4.6, 12, chestMat, chestTrim),
    placeChest(scene, -4.4, 58, chestMat, chestTrim),
  ];
  const radio = buildRadio(scene);
  const gate = buildGate(scene);
  const dark = buildDarkPath(scene);

  return {
    obstacles,
    chests,
    pages,
    radio,
    gate,
    setPathLit(v) { dark.setLit(!!v); },
    update(dt, t, player) {
      nebulaMat.uniforms.uTime.value = t;
      ribbonMat.uniforms.uTime.value = t;
      for (const island of islands) {
        const b = island.userData.bob;
        island.position.y = island.userData.baseY + Math.sin(t * 0.7 + b) * 0.28;
        island.rotation.y = Math.sin(t * 0.15 + b) * 0.08;
      }
      for (const mesh of overhead) {
        mesh.rotation.y = t * mesh.userData.spin;
        mesh.position.y = 3.3 + Math.sin(t * 0.9 + mesh.position.z) * 0.25;
      }
      for (const ring of ripples) {
        const k = (Math.sin(t * 1.4 + ring.userData.phase) * 0.5 + 0.5);
        ring.scale.setScalar(0.7 + k * 2.4);
        ring.material.opacity = 0.12 + (1 - k) * 0.4;
      }
      for (const field of fields) {
        const attr = field.geometry.attributes.position;
        const base = field.userData.base;
        const phase = field.userData.phase;
        for (let i = 0; i < phase.length; i++) {
          attr.setY(i, base[i * 3 + 1] + Math.sin(t * 0.8 + phase[i]) * 0.35);
          attr.setX(i, base[i * 3] + Math.sin(t * 0.25 + phase[i]) * 0.2);
        }
        attr.needsUpdate = true;
      }
      posePages(pages, t);
      dark.update(t);
      if (player) {
        rimWarm.position.set(player.x - 1.2, 1.7, player.z - 0.4);
        rimCool.position.set(player.x + 1.1, 1.45, player.z + 0.6);
      }
      if (radio.glow) radio.glow.material.opacity = 0.65 + Math.sin(t * 3) * 0.25;
      if (gate) {
        const pulse = gate.ready ? 0.45 + Math.sin(t * 3) * 0.25 : 0.08;
        gate.glow.material.opacity = pulse;
        if (gate.sheet) gate.sheet.material.opacity = gate.open ? 0.55 : pulse * 0.8;
        if (gate.lamp) gate.lamp.intensity = gate.ready ? 2.2 + Math.sin(t * 3) * 0.6 : 0.4;
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
        if (inside(p.x, p.z) && p.y < 8 && p.y > 0.4) break;
        dist *= 0.86;
      }
      const out = focus.clone().addScaledVector(dir, Math.max(1.3, dist));
      if (out.y < 0.8) out.y = 0.8;
      if (out.y > 6.2) out.y = 6.2;
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

function buildDarkPath(scene) {
  const fog = new THREE.Mesh(
    new THREE.BoxGeometry(16, 7, 9),
    new THREE.MeshBasicMaterial({ color: 0x07060e, transparent: true, opacity: 0.62, depthWrite: false }),
  );
  fog.position.set(0, 2.4, 39.2);
  const lamp = new THREE.PointLight(0xd7ecff, 0, 18, 1.5);
  lamp.position.set(0, 2.6, 39.2);
  const marks = [];
  for (let i = 0; i < 6; i++) {
    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 14),
      new THREE.MeshBasicMaterial({ color: 0x140e22, transparent: true, opacity: 0.9 }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(0, 0.05, 35.6 + i * 1.25);
    scene.add(mark);
    marks.push(mark);
  }
  scene.add(fog, lamp);
  let lit = false;
  return {
    setLit(v) { lit = !!v; },
    update(t) {
      const target = lit ? 0.05 : 0.58 + Math.sin(t * 1.2) * 0.04;
      fog.material.opacity += (target - fog.material.opacity) * 0.08;
      lamp.intensity = lit ? 7 + Math.sin(t * 3) * 0.5 : 0;
      for (const mark of marks) {
        mark.material.color.setHex(lit ? 0xf0c56a : 0x120c20);
        mark.material.opacity = lit ? 0.9 : 0.75;
      }
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
      map: tex, emissive: 0xffe2a8, emissiveIntensity: 0.35,
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
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({
      color: 0xf0c56a, emissive: 0xf0c56a, emissiveIntensity: 0.35,
      roughness: 0.2, metalness: 0.3, flatShading: true,
    }),
  );
  crystal.position.y = 0.7;
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x3ec8c4, emissive: 0x1a6a68, emissiveIntensity: 0.2, roughness: 0.4 }),
  );
  stand.position.y = 0.22;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.2, depthWrite: false }),
  );
  glow.position.y = 0.7;
  group.add(stand, crystal, glow);
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
  const lamp = new THREE.PointLight(0xffe2a8, 0.35, 10, 2);
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
