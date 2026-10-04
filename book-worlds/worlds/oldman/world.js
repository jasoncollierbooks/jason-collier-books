// Old Man on the Mountain. Snowy high country at dusk.
// Forest road and truck, steep timber, benches, an elk park,
// Harlan's wall tent and fire, then the ridge.
import * as THREE from "three";
import { clamp, lerp } from "../../src/util.js";

export function heightAt(x, z) {
  let h = Math.sin(z * 0.05) * 1.15
    + Math.cos(x * 0.09 + 0.4) * 0.45
    + Math.sin(x * 0.17 - z * 0.04) * 0.28;
  h += Math.sin(z * 0.085) * 0.55;
  const path = Math.exp(-(x * x) / 22);
  h = h * (1 - path * 0.78) + Math.sin(z * 0.04) * 0.1 * path;
  const knoll = Math.exp(-((x - 1.4) * (x - 1.4) + (z - 47) * (z - 47)) / 26);
  h += knoll * 1.15;
  if (z < 4) h *= 0.28;
  return h;
}

export function halfWidth(z) {
  if (z < 36) return 8.6;
  if (z < 44) return lerp(8.6, 13.6, (z - 36) / 8);
  if (z < 60) return 13.6;
  if (z < 70) return lerp(13.6, 8.2, (z - 60) / 10);
  if (z < 78) return 8.2;
  if (z < 86) return lerp(8.2, 12.4, (z - 78) / 8);
  if (z < 100) return 12.4;
  return 9.2;
}

function inside(x, z) {
  if (z < -16 || z > 104) return false;
  return Math.abs(x) < halfWidth(z) - 0.2;
}

function closestPoint(x, z) {
  const zz = clamp(z, -15.5, 103.4);
  const hw = halfWidth(zz) - 0.4;
  return { x: clamp(x, -hw, hw), z: zz };
}

export function buildOldmanWorld(scene, low) {
  const obstacles = [];
  const block = (x, z, r) => obstacles.push({ x, z, r });

  scene.fog = new THREE.FogExp2(0x1a2436, low ? 0.028 : 0.02);
  scene.background = new THREE.Color(0x1a2436);

  const hemi = new THREE.HemisphereLight(0x8aa0c4, 0x3a342c, low ? 0.55 : 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb07a, low ? 1.15 : 1.45);
  sun.position.set(-28, 8, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -26;
  sun.shadow.camera.right = sun.shadow.camera.top = 26;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = low ? 1.1 : 1.6;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x6a7c9a, 0.28);
  fill.position.set(12, 10, 16);
  scene.add(fill);

  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(240, low ? 20 : 28, low ? 12 : 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  const ground = buildGround(low);
  ground.receiveShadow = true;
  scene.add(ground);

  scatterSpruce(scene, low, block);
  scatterRocks(scene, low, block);
  const tracks = wrongTracks(scene);
  const eyes = eyeShine(scene);
  const elk = placeElk(scene, block);

  const camp = campfire();
  camp.position.set(0.6, heightAt(0.6, 46.2), 46.2);
  scene.add(camp);
  block(0.6, 46.2, 0.7);

  const tent = wallTent();
  tent.position.set(2.5, heightAt(2.5, 48.2), 48.2);
  tent.rotation.y = -0.4;
  scene.add(tent);
  block(2.5, 48.2, 1.15);

  const truck = pickup();
  const tx = 3.1;
  const tz = -8.2;
  truck.position.set(tx, heightAt(tx, tz), tz);
  truck.rotation.y = 0.5;
  scene.add(truck);
  block(tx, tz, 1.5);

  const gate = buildGate(scene, tx, tz);
  const radio = buildCache(scene);
  const chests = [
    placeChest(scene, -3.2, 18.5),
    placeChest(scene, 3.4, 52.5),
  ];
  chests.forEach((c) => block(c.x, c.z, 0.45));
  const pages = buildPages(scene);

  const snow = fallingSnow(low ? 90 : 170);
  scene.add(snow);

  const fallen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 4.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 }),
  );
  fallen.rotation.z = Math.PI / 2;
  fallen.rotation.y = 0.4;
  fallen.position.set(-2.2, heightAt(-2.2, 86) + 0.28, 86);
  fallen.castShadow = true;
  scene.add(fallen);
  block(-2.2, 86, 0.7);

  let freed = false;
  const fogA = new THREE.Color(0x1c2838);
  const fogB = new THREE.Color(0x121614);
  const fogC = new THREE.Color();

  return {
    obstacles,
    chests,
    pages,
    radio,
    gate,
    camp: { x: 0.6, z: 46.2 },
    truck: { x: tx, z: tz },
    setFreed(v) { freed = !!v; },
    update(dt, t, player) {
      skyMat.uniforms.uTime.value = t;
      const fl = camp.userData;
      const flick = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 23) * 0.05;
      fl.light.intensity = 8.4 * flick;
      fl.outer.scale.y = 0.9 + Math.sin(t * 9) * 0.16;
      fl.inner.scale.y = 1 + Math.sin(t * 13) * 0.18;
      driftSnow(snow, dt, t, player);
      posePages(pages, t);
      const z = player ? player.z : 0;
      const dread = freed ? 0.1 : clamp((z - 8) / 78, 0, 1);
      fogC.copy(fogA).lerp(fogB, dread * 0.8);
      if (freed) fogC.setHex(0x243044);
      scene.fog.color.copy(fogC);
      scene.background.copy(fogC);
      scene.fog.density = (low ? 0.026 : 0.018) + dread * 0.008;
      for (const pair of eyes) {
        const blink = Math.sin(t * 1.7 + pair.phase) > 0.2 ? 1 : 0.15;
        const near = player ? clamp(1 - Math.hypot(player.x - pair.x, player.z - pair.z) / 18, 0, 1) : 0.4;
        const show = freed ? 0 : blink * (0.25 + dread * 0.75) * (0.35 + near);
        pair.mesh.visible = show > 0.08;
        pair.mesh.scale.setScalar(0.8 + show);
      }
      for (const mark of tracks) {
        mark.material.opacity = freed ? 0.08 : 0.28 + dread * 0.35;
      }
      for (const animal of elk) {
        animal.visible = dread < 0.55;
      }
      if (gate) {
        const on = gate.ready || gate.open;
        gate.glow.material.opacity = on ? 0.35 + Math.sin(t * 3) * 0.15 : 0.04;
        if (gate.lamp) gate.lamp.intensity = on ? 1.6 + Math.sin(t * 3) * 0.4 : 0;
      }
      if (radio.glow) radio.glow.material.opacity = 0.25 + Math.sin(t * 2.4) * 0.12;
      sun.target.position.set(0, 0, 40);
      sun.target.updateMatrixWorld();
    },
    setQuality(level) {
      const small = level === "low";
      sun.shadow.mapSize.set(small ? 512 : 2048, small ? 512 : 2048);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    },
    pullCamera(focus, desired) {
      const dir = desired.clone().sub(focus);
      let dist = dir.length();
      if (dist < 0.25) return desired;
      dir.multiplyScalar(1 / dist);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const tt = (dist * i) / steps;
        const x = focus.x + dir.x * tt;
        const y = focus.y + dir.y * tt;
        const z = focus.z + dir.z * tt;
        if (y < heightAt(x, z) + 0.5 || (z > -16 && z < 104 && !inside(x, z))) {
          dist = Math.max(1.15, tt * 0.84);
          break;
        }
      }
      const out = focus.clone().addScaledVector(dir, Math.max(1.2, dist));
      const floorY = heightAt(out.x, out.z) + 0.5;
      if (out.y < floorY) out.y = floorY;
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

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vP;
      uniform float uTime;
      void main() {
        vec3 d = normalize(vP);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 zenith = vec3(0.08, 0.1, 0.2);
        vec3 mid = vec3(0.28, 0.22, 0.36);
        vec3 hor = vec3(0.72, 0.38, 0.24);
        vec3 col = mix(vec3(0.16, 0.14, 0.16), hor, smoothstep(-0.05, 0.12, d.y));
        col = mix(col, mid, smoothstep(0.05, 0.4, d.y));
        col = mix(col, zenith, smoothstep(0.28, 0.85, d.y));
        float sun = pow(max(dot(d, normalize(vec3(-0.75, 0.18, -0.2))), 0.0), 28.0);
        col += vec3(1.0, 0.62, 0.32) * sun * 0.85;
        float flake = sin(d.x * 40.0 + uTime * 0.2) * sin(d.z * 36.0);
        col += vec3(0.7) * smoothstep(0.82, 1.0, flake) * smoothstep(0.2, 0.7, d.y) * 0.04;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

function buildGround(low) {
  const geo = new THREE.PlaneGeometry(46, 140, low ? 36 : 56, low ? 80 : 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const snow = new THREE.Color(0.82, 0.86, 0.92);
  const path = new THREE.Color(0.7, 0.68, 0.64);
  const camp = new THREE.Color(0.45, 0.32, 0.22);
  const shade = new THREE.Color(0.55, 0.62, 0.72);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + 48;
    pos.setZ(i, z);
    pos.setY(i, heightAt(x, z));
    const pathK = Math.exp(-(x * x) / 20);
    const campK = Math.exp(-((x - 0.6) * (x - 0.6) + (z - 46) * (z - 46)) / 18);
    const treeK = Math.abs(x) > halfWidth(z) - 1.2 ? 0.35 : 0;
    tmp.copy(snow).lerp(path, pathK * 0.55).lerp(camp, campK * 0.7).lerp(shade, treeK);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.92, metalness: 0,
  }));
}

function scatterSpruce(scene, low, block) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1c2e22, roughness: 0.86 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xe4eaf2, roughness: 0.8 });
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1.3, 5);
  const leafGeo = new THREE.ConeGeometry(0.85, 2.4, 6);
  const capGeo = new THREE.ConeGeometry(0.42, 0.55, 5);
  const spots = [];
  const n = low ? 32 : 58;
  for (let i = 0; i < n; i++) {
    const z = -12 + i * (116 / n);
    const side = i % 2 === 0 ? -1 : 1;
    const hw = halfWidth(z);
    let x = side * (hw + 0.2 + (i % 4) * 0.7);
    if (Math.hypot(x - 1.4, z - 47) < 5) continue;
    if (z < 2 && Math.abs(x) < 5) continue;
    if (z > 80 && Math.abs(x) < 3.5) continue;
    spots.push([x, z, 0.85 + (i % 5) * 0.18]);
  }
  const dummy = new THREE.Object3D();
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, spots.length);
  const caps = new THREE.InstancedMesh(capGeo, capMat, spots.length);
  spots.forEach(([x, z, s], i) => {
    const y = heightAt(x, z);
    dummy.position.set(x, y + 0.65 * s, z);
    dummy.scale.setScalar(s);
    dummy.rotation.set(0, i, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, y + 1.9 * s, z);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, y + 2.7 * s, z);
    dummy.scale.setScalar(s * 0.9);
    dummy.updateMatrix();
    caps.setMatrixAt(i, dummy.matrix);
    if (Math.abs(x) < halfWidth(z) + 0.4) block(x, z, 0.7 * s);
  });
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  caps.instanceMatrix.needsUpdate = true;
  trunks.castShadow = !low;
  leaves.castShadow = !low;
  scene.add(trunks, leaves, caps);
}

function scatterRocks(scene, low, block) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xc5ccd4, roughness: 0.92 });
  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const n = low ? 10 : 16;
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const z = 6 + i * 5.5;
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (2.8 + (i % 3) * 0.8);
    const s = 0.6 + (i % 4) * 0.2;
    dummy.position.set(x, heightAt(x, z) + 0.15, z);
    dummy.scale.set(s, s * 0.55, s);
    dummy.rotation.set(i, i * 0.7, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    block(x, z, 0.4 * s);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = !low;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function wrongTracks(scene) {
  const marks = [];
  const mat = () => new THREE.MeshBasicMaterial({
    color: 0x2a241c, transparent: true, opacity: 0.4, depthWrite: false,
  });
  const spots = [
    [-1.6, 22], [1.8, 28], [-2.2, 34], [2.4, 41], [-3.2, 58], [2.1, 66], [-1.4, 74],
  ];
  for (const [x, z] of spots) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), mat());
    mark.rotation.x = -Math.PI / 2;
    mark.rotation.z = 0.4;
    mark.position.set(x, heightAt(x, z) + 0.05, z);
    scene.add(mark);
    marks.push(mark);
  }
  return marks;
}

function eyeShine(scene) {
  const pairs = [
    [-7.2, 16], [7.4, 30], [-8.6, 44], [8.2, 63], [-6.8, 76],
  ];
  return pairs.map(([x, z], i) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0x39e878 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), mat);
      eye.position.set(s * 0.14, 1.35, 0);
      g.add(eye);
    }
    g.position.set(x, heightAt(x, z), z);
    g.lookAt(0, g.position.y, z + 2);
    scene.add(g);
    return { mesh: g, x, z, phase: i * 1.3 };
  });
}

function placeElk(scene, block) {
  const herd = [];
  const fur = new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: 0.88 });
  const bone = new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.7 });
  [[-6.2, 50], [5.4, 54], [-4.8, 57]].forEach(([x, z]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.05), fur);
    body.position.y = 1.05;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), fur);
    neck.position.set(0, 1.35, 0.42);
    neck.rotation.x = 0.45;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.38), fur);
    head.position.set(0, 1.65, 0.62);
    g.add(body, neck, head);
    for (const s of [-1, 1]) {
      const antler = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.035), bone);
      antler.position.set(s * 0.18, 1.86, 0.58);
      antler.rotation.z = s * 0.35;
      g.add(antler);
    }
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = x < 0 ? 0.6 : -0.8;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
    block(x, z, 0.6);
    herd.push(g);
  });
  return herd;
}

function campfire() {
  const g = new THREE.Group();
  const logM = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.65, 5), logM);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * 0.8;
    log.position.y = 0.08;
    g.add(log);
  }
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.5, 6),
    new THREE.MeshBasicMaterial({ color: 0xff7a32, transparent: true, opacity: 0.85 }),
  );
  outer.position.y = 0.36;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 5), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
  inner.position.y = 0.32;
  const light = new THREE.PointLight(0xff7a32, 8, 12, 1.6);
  light.position.y = 0.6;
  g.add(outer, inner, light);
  g.userData = { light, outer, inner };
  return g;
}

function wallTent() {
  const g = new THREE.Group();
  const canvas = new THREE.MeshStandardMaterial({ color: 0xd7cbb2, roughness: 0.92, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.7), canvas);
  wall.position.y = 0.35;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.7, 4), canvas);
  roof.position.y = 1.05;
  roof.rotation.y = Math.PI / 4;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.8 }),
  );
  pole.position.y = 0.7;
  g.add(wall, roof, pole);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function pickup() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.62, metalness: 0.25 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.05, 1.35), body);
  cab.position.set(0, 0.95, 0.5);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 1.55), body);
  bed.position.set(0, 0.68, -0.85);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.38, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1a2830, roughness: 0.15, metalness: 0.45 }),
  );
  glass.position.set(0, 1.15, 1.16);
  g.add(cab, bed, glass);
  const wheel = new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.9 });
  for (const [x, z] of [[-0.68, 0.45], [0.68, 0.45], [-0.68, -0.75], [0.68, -0.75]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 8), wheel);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.26, z);
    g.add(w);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildGate(scene, x, z) {
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.04, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, heightAt(x, z) + 0.06, z);
  const lamp = new THREE.PointLight(0xffc56a, 0, 8, 2);
  lamp.position.set(x, heightAt(x, z) + 1.2, z);
  scene.add(glow, lamp);
  return {
    glow, lamp, open: false, ready: false, x, z,
    setReady(v) { this.ready = !!v; },
    setOpen(v) { this.open = !!v; this.ready = this.ready || !!v; },
  };
}

function buildCache(scene) {
  const g = new THREE.Group();
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.38, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.85 }),
  );
  pack.position.y = 0.22;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.3 }),
  );
  glow.position.y = 0.5;
  g.add(pack, glow);
  const x = -2.4;
  const z = -6.4;
  g.position.set(x, heightAt(x, z), z);
  scene.add(g);
  return { x, z, mesh: g, glow };
}

function placeChest(scene, x, z) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.84 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2118, roughness: 0.7 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.36, 0.42), wood);
  body.position.y = 0.28;
  body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.46), dark);
  lid.geometry.translate(0, 0.06, 0.2);
  lid.position.set(0, 0.46, -0.2);
  group.add(body, lid);
  group.position.set(x, heightAt(x, z), z);
  scene.add(group);
  return { mesh: group, lid, x, z, open: false };
}

function pageTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 168;
  const g = c.getContext("2d");
  g.fillStyle = "#f3e6c8";
  g.fillRect(8, 8, 112, 152);
  g.strokeStyle = "#8a6238";
  g.strokeRect(8, 8, 112, 152);
  g.strokeStyle = "rgba(90, 58, 32, .4)";
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(22, 32 + i * 16);
    g.lineTo(100 - (i % 3) * 8, 32 + i * 16);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPages(scene) {
  const tex = pageTexture();
  const spots = [
    ["seven-days", -2.2, 8],
    ["wall-tent", 2.4, 24],
    ["steep-timber", -2.6, 38],
    ["bark-skin", 2.2, 62],
    ["the-ridges", -1.8, 74],
  ];
  return spots.map(([id, x, z]) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffe2a8, emissiveIntensity: 0.45,
      roughness: 0.55, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.86), mat);
    const y = heightAt(x, z) + 1.15;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return { id, x, z, mesh, got: false, baseY: y };
  });
}

function posePages(pages, t) {
  for (const p of pages) {
    if (p.got) {
      p.mesh.visible = false;
      continue;
    }
    p.mesh.visible = true;
    p.mesh.position.y = p.baseY + Math.sin(t * 1.8 + p.x) * 0.08;
    p.mesh.rotation.y = t * 0.45 + p.z;
  }
}

function fallingSnow(n) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xeef3f8, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true,
  }));
  pts.frustumCulled = false;
  pts.userData.n = n;
  return pts;
}

function driftSnow(pts, dt, t, player) {
  const arr = pts.geometry.attributes.position.array;
  const ox = player ? player.x : 0;
  const oz = player ? player.z : 40;
  for (let i = 0; i < pts.userData.n; i++) {
    arr[i * 3] += Math.sin(t * 0.4 + i) * dt * 0.35;
    arr[i * 3 + 1] -= dt * (1.1 + (i % 5) * 0.15);
    arr[i * 3 + 2] += dt * 0.15;
    if (arr[i * 3 + 1] < 0) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = 6 + Math.random() * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
  }
  pts.geometry.attributes.position.needsUpdate = true;
  pts.position.set(ox, 0, oz);
}
