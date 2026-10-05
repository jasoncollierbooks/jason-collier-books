// Thorne's lab, Princeton, 1982, at night. The walker is the size of a
// growing microsphere, so the bench is a country: glass towers, a pencil
// like a log, a spill like a lake, mold like timber.
import * as THREE from "three";
import { clamp, lerp } from "../../src/util.js";

export function heightAt(x, z) {
  let h = Math.sin(x * 0.31 + 0.4) * 0.035 + Math.cos(z * 0.17) * 0.025;
  const lake = Math.exp(-((x * x) + (z - 36) * (z - 36)) / 30);
  h -= lake * 0.48;
  const paper = Math.exp(-((x + 1.2) * (x + 1.2) + (z - 2) * (z - 2)) / 40);
  h += paper * 0.02;
  return h;
}

export function halfWidth(z) {
  if (z < 18) return 8.4;
  if (z < 30) return lerp(8.4, 11.2, (z - 18) / 12);
  if (z < 48) return 11.2;
  if (z < 60) return lerp(11.2, 8.6, (z - 48) / 12);
  if (z < 76) return 8.6;
  if (z < 84) return lerp(8.6, 12.2, (z - 76) / 8);
  if (z < 100) return 12.2;
  return 9.4;
}

function inside(x, z) {
  if (z < -16 || z > 108) return false;
  return Math.abs(x) < halfWidth(z) - 0.15;
}

function closestPoint(x, z) {
  const zz = clamp(z, -15.2, 107.2);
  const hw = halfWidth(zz) - 0.35;
  return { x: clamp(x, -hw, hw), z: zz };
}

function woodTexture(low) {
  const s = low ? 256 : 512;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d");
  g.fillStyle = "#3a2416";
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < (low ? 80 : 160); i++) {
    const x = Math.random() * s;
    g.strokeStyle = `rgba(${40 + Math.random() * 30}, ${22 + Math.random() * 16}, 12, ${0.15 + Math.random() * 0.35})`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 12, s * 0.3, x - 18, s * 0.6, x + 6, s);
    g.stroke();
  }
  g.strokeStyle = "rgba(20, 10, 6, 0.35)";
  for (let i = 0; i < 8; i++) {
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.random() * s, Math.random() * s);
    g.lineTo(Math.random() * s, Math.random() * s);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glassMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color(0.75, 0.95, 1) } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTint;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(viewDir, normalize(vN)), 0.0), 2.05);
        float glint = pow(max(0.0, sin(vW.y * 2.4 + uTime * 0.7) * sin(vW.x * 1.3 + vW.z * 0.6)), 10.0);
        vec3 col = mix(uTint * 0.15, uTint, fres);
        col += vec3(0.85, 1.0, 0.95) * glint * 0.85;
        col += vec3(0.6, 0.9, 1.0) * pow(fres, 4.0);
        float alpha = 0.08 + fres * 0.5 + glint * 0.35;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.72));
      }
    `,
  });
}

function scopeTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, ctx: g, tex };
}

function drawScope(pack, t) {
  const { canvas, ctx, tex } = pack;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#04140c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(40, 120, 70, 0.35)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo((w / 8) * i, 0);
    ctx.lineTo((w / 8) * i, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (h / 8) * i);
    ctx.lineTo(w, (h / 8) * i);
    ctx.stroke();
  }
  ctx.strokeStyle = "#9dffc0";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#7dffb0";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = h * 0.5 + Math.sin(x * 0.06 + t * 3.2) * (h * 0.28) + Math.sin(x * 0.02 + t) * 8;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  tex.needsUpdate = true;
}

export function buildThorneWorld(scene, low) {
  const obstacles = [];
  const block = (x, z, r) => obstacles.push({ x, z, r });
  const glasses = [];

  scene.fog = new THREE.FogExp2(0x070a10, low ? 0.014 : 0.0105);
  scene.background = new THREE.Color(0x070a10);

  const hemi = new THREE.HemisphereLight(0x8aa0b8, 0x1a120c, low ? 0.28 : 0.38);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xb9c8e8, low ? 0.35 : 0.5);
  moon.position.set(-18, 22, -8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048);
  moon.shadow.camera.near = 2;
  moon.shadow.camera.far = 90;
  moon.shadow.camera.left = moon.shadow.camera.bottom = -28;
  moon.shadow.camera.right = moon.shadow.camera.top = 28;
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  const room = buildRoom(scene);
  const ground = buildBench(low);
  ground.receiveShadow = true;
  scene.add(ground);

  const paper = graphPaper();
  scene.add(paper);

  const pencil = giantPencil();
  pencil.position.set(-3.6, heightAt(-3.6, 6) + 0.32, 6);
  pencil.rotation.y = 1.15;
  scene.add(pencil);
  block(-4.2, 6.2, 0.85);

  const clip = paperclipArch();
  clip.position.set(0.2, heightAt(0.2, 22), 22);
  scene.add(clip);
  block(-2.7, 22, 0.45);
  block(2.9, 22, 0.45);

  placeTubes(scene, low, block, glasses);
  placeBeakers(scene, low, block, glasses);
  placeDishes(scene, low, block);
  const mold = moldForest(scene, low, block);
  placeTrays(scene, block);

  const lake = spillLake();
  scene.add(lake);

  const lamp = deskLamp();
  lamp.position.set(-1.6, heightAt(-1.6, -6.2), -6.2);
  scene.add(lamp);
  block(-1.6, -6.2, 0.45);
  const lampLight = new THREE.PointLight(0xffc888, 8, 14, 2);
  lampLight.position.set(-1.2, 3.2, -5.4);
  scene.add(lampLight);

  const geiger = buildGeiger();
  const gx = -2.5;
  const gz = -1.2;
  geiger.position.set(gx, heightAt(gx, gz), gz);
  scene.add(geiger);
  const radio = { x: gx, z: gz, mesh: geiger, glow: geiger.userData.glow };

  const laser = buildLaser(scene, glasses);
  const beam = laser.beam;

  const scopePack = scopeTexture();
  const scope = buildScope(scopePack.tex);
  scope.position.set(0.4, heightAt(0.4, 106), 106);
  scene.add(scope);
  block(0.4, 103.5, 2.4);
  const scopeLight = new THREE.PointLight(0x7dffb0, 18, 28, 2);
  scopeLight.position.set(0.4, 4.2, 100);
  scene.add(scopeLight);

  const jar = bellJar();
  jar.position.set(0.2, heightAt(0.2, 90), 90);
  scene.add(jar);
  glasses.push(jar.userData.mat);

  const shoe = giantShoe();
  shoe.position.set(-10.4, heightAt(-10.4, 34), 34);
  shoe.rotation.y = 0.6;
  scene.add(shoe);

  const chair = chairLeg();
  chair.position.set(10.2, 0, 72);
  scene.add(chair);
  block(9.2, 72, 0.7);

  const gate = buildGate(scene, 0.4, -7.2);
  const notebook = buildNotebook();
  notebook.position.set(0.4, heightAt(0.4, -7.2), -7.2);
  scene.add(notebook);

  const chests = [
    placeChest(scene, 3.2, 18.5),
    placeChest(scene, -2.8, 70),
  ];
  chests.forEach((c) => block(c.x, c.z, 0.45));
  const pages = buildPages(scene);
  const curtain = fogCurtain(scene);
  const motes = beamMotes(low ? 40 : 90);
  scene.add(motes);
  const drips = makeDrips(low ? 8 : 16);
  scene.add(drips);

  const tubes = new THREE.Group();
  scene.add(tubes);
  const fluors = fluorescentBanks(scene);

  let freed = false;
  const fogA = new THREE.Color(0x10141c);
  const fogB = new THREE.Color(0x070910);
  const fogC = new THREE.Color();

  return {
    obstacles,
    chests,
    pages,
    radio,
    gate,
    laser: { x: 6.2, z: 52 },
    scope: { x: 0.4, z: 100 },
    setFreed(v) { freed = !!v; },
    setFogGate(v) { curtain.setOpen(!!v); },
    update(dt, t, player) {
      for (const mat of glasses) if (mat.uniforms) mat.uniforms.uTime.value = t;
      drawScope(scopePack, t);
      const flick = 0.82 + Math.sin(t * 47) * 0.08 + (Math.sin(t * 13) > 0.92 ? -0.25 : 0);
      for (const fl of fluors) fl.intensity = (low ? 3.2 : 5.4) * flick;
      scopeLight.intensity = (freed ? 10 : 16) * (0.85 + Math.sin(t * 6) * 0.08);
      lampLight.intensity = 7 + Math.sin(t * 2) * 0.4;
      beam.material.opacity = 0.28 + Math.sin(t * 9) * 0.06;
      laser.core.material.opacity = 0.55 + Math.sin(t * 11) * 0.2;
      lake.userData.mat.uniforms.uTime.value = t;
      curtain.update(t);
      posePages(pages, t);
      driftMotes(motes, dt, player);
      driftDrips(drips, dt, t);
      geiger.userData.needle.rotation.z = -0.6 + Math.sin(t * 18) * 0.08 + (freed ? 0 : Math.random() * 0.12);
      if (radio.glow) radio.glow.material.opacity = 0.35 + Math.sin(t * 4) * 0.15;
      mold.rotation.y = Math.sin(t * 0.2) * 0.01;
      const z = player ? player.z : 0;
      const dread = freed ? 0.08 : clamp((z - 6) / 84, 0, 1);
      fogC.copy(fogA).lerp(fogB, dread * 0.65);
      if (freed) fogC.setHex(0x121820);
      scene.fog.color.copy(fogC);
      scene.background.copy(fogC);
      scene.fog.density = (low ? 0.015 : 0.011) + (freed ? 0 : dread * 0.004);
      if (gate) {
        const on = gate.ready || gate.open;
        gate.glow.material.opacity = on ? 0.35 + Math.sin(t * 3) * 0.12 : 0.05;
        if (gate.lamp) gate.lamp.intensity = on ? 2.2 : 0.15;
      }
      moon.target.position.set(0, 0, 40);
      moon.target.updateMatrixWorld();
      room.userData.window.material.emissiveIntensity = 0.35 + Math.sin(t * 0.4) * 0.05;
    },
    setQuality(level) {
      const small = level === "low";
      moon.shadow.mapSize.set(small ? 512 : 2048, small ? 512 : 2048);
      if (moon.shadow.map) {
        moon.shadow.map.dispose();
        moon.shadow.map = null;
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
        if (y < heightAt(x, z) + 0.45 || (z > -16 && z < 108 && !inside(x, z))) {
          dist = Math.max(1.15, tt * 0.84);
          break;
        }
      }
      const out = focus.clone().addScaledVector(dir, Math.max(1.2, dist));
      const floorY = heightAt(out.x, out.z) + 0.45;
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
          const dx = px - o.x;
          const dz = pz - o.z;
          const d = Math.hypot(dx, dz);
          const min = radius + o.r;
          if (d < min) {
            if (d < 1e-4) { px += min; continue; }
            const push = (min - d) / d;
            px += dx * push;
            pz += dz * push;
          }
        }
      }
      if (!inside(px, pz)) {
        const spot = closestPoint(px, pz);
        px = spot.x;
        pz = spot.z;
      }
      return { x: px, z: pz };
    },
  };
}

function buildRoom(scene) {
  const wall = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.92 });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 160),
    new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.6, 46);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(80, 160), wall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 18, 46);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(160, 20), wall);
  left.position.set(-18, 8, 46);
  left.rotation.y = Math.PI / 2;
  const right = left.clone();
  right.position.x = 18;
  right.rotation.y = -Math.PI / 2;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wall);
  back.position.set(0, 8, 120);
  const front = back.clone();
  front.position.z = -22;
  front.rotation.y = Math.PI;
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a2744, emissive: 0x6a88b8, emissiveIntensity: 0.4, roughness: 0.2,
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), windowMat);
  win.position.set(-17.8, 8.5, 18);
  win.rotation.y = Math.PI / 2;
  const mullion = new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 0.8 });
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.2, 0.08), mullion);
  barV.position.copy(win.position);
  barV.position.x += 0.05;
  const barH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7), mullion);
  barH.position.set(-17.75, 8.5, 18);
  scene.add(floor, ceiling, left, right, back, front, win, barV, barH);
  const moonFill = new THREE.PointLight(0x9eb4d8, 4, 24, 2);
  moonFill.position.set(-14, 7, 18);
  scene.add(moonFill);
  return { userData: { window: win } };
}

function buildBench(low) {
  const geo = new THREE.PlaneGeometry(30, 140, low ? 24 : 40, low ? 64 : 100);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const wood = new THREE.Color(0.28, 0.16, 0.09);
  const edge = new THREE.Color(0.12, 0.07, 0.04);
  const lake = new THREE.Color(0.05, 0.12, 0.14);
  const paper = new THREE.Color(0.72, 0.66, 0.52);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + 48;
    pos.setZ(i, z);
    pos.setY(i, heightAt(x, z));
    const edgeK = clamp((Math.abs(x) - (halfWidth(z) - 2)) / 3, 0, 1);
    const lakeK = Math.exp(-((x * x) + (z - 36) * (z - 36)) / 34);
    const paperK = Math.exp(-((x + 0.4) * (x + 0.4) + (z + 2) * (z + 2)) / 28);
    tmp.copy(wood).lerp(edge, edgeK).lerp(lake, lakeK * 0.85).lerp(paper, paperK * 0.55);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.computeVertexNormals();
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const skirt = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xffffff, map: woodTexture(low), vertexColors: true, roughness: 0.72, metalness: 0.04,
  }));
  return skirt;
}

function graphPaper() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#efe6d2";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(90, 140, 170, 0.45)";
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.moveTo(i * 16, 0);
    g.lineTo(i * 16, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i * 16);
    g.lineTo(256, i * 16);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 5.2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(-0.6, heightAt(-0.6, 1.5) + 0.025, 1.5);
  mesh.receiveShadow = true;
  return mesh;
}

function giantPencil() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe2b43a, roughness: 0.62 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.8 });
  const lead = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.4, metalness: 0.3 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xd46a78, roughness: 0.7 });
  const band = new THREE.MeshStandardMaterial({ color: 0xc0c6cc, roughness: 0.25, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 9.2, 8), yellow);
  body.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 8), wood);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 5.1;
  const graphite = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), lead);
  graphite.rotation.z = -Math.PI / 2;
  graphite.position.x = 5.7;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 8), pink);
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -4.9;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 8), band);
  ferrule.rotation.z = Math.PI / 2;
  ferrule.position.x = -4.4;
  g.add(body, tip, graphite, eraser, ferrule);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function paperclipArch() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xd5dbe2, roughness: 0.22, metalness: 0.82 });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.11, 10, 28, Math.PI), mat);
  mesh.rotation.z = Math.PI;
  mesh.rotation.y = 0.15;
  mesh.position.y = 2.6;
  mesh.castShadow = true;
  return mesh;
}

function placeTubes(scene, low, block, glasses) {
  const spots = [
    [-6.4, 9, 8.2, 0xff5a78, 0.55],
    [-7.2, 16, 11.4, 0x7dffc4, 0.7],
    [6.5, 12, 7.4, 0xf0c060, 0.48],
    [7.1, 24, 12.2, 0x7ec8ff, 0.62],
    [-6.8, 31, 9.6, 0xd6e060, 0.4],
    [6.2, 42, 10.5, 0xff7a48, 0.58],
    [-7.0, 54, 8.8, 0xb8d8ff, 0.5],
    [6.8, 68, 11, 0xc090ff, 0.66],
    [-6.3, 80, 9.2, 0x7dffc0, 0.44],
    [6.4, 92, 12.6, 0xf2d090, 0.6],
  ];
  const count = low ? 6 : spots.length;
  for (let i = 0; i < count; i++) {
    const [x, z, h, color, fill] = spots[i];
    const tube = testTube(h, color, fill, glasses);
    tube.position.set(x, heightAt(x, z), z);
    tube.rotation.z = (i % 2 ? -1 : 1) * 0.06;
    scene.add(tube);
    block(x, z, 0.55);
  }
}

function testTube(h, color, fill, glasses) {
  const g = new THREE.Group();
  const mat = glassMat();
  mat.uniforms.uTint.value.set(0.8, 0.95, 1);
  glasses.push(mat);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, h, 12, 1, true), mat);
  wall.position.y = h * 0.5;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 12), mat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = h;
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.3, h * fill, 10),
    new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.45, roughness: 0.25, transparent: true, opacity: 0.88,
    }),
  );
  liquid.position.y = h * fill * 0.5 + 0.08;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 }),
  );
  cap.position.y = h + 0.12;
  const glow = new THREE.PointLight(color, 1.6, 6, 2);
  glow.position.y = h * fill * 0.5;
  g.add(wall, lip, liquid, cap, glow);
  return g;
}

function placeBeakers(scene, low, block, glasses) {
  const spots = [[-3.4, 33], [4.2, 39], [-4.6, 44], [2.2, 47]];
  const n = low ? 2 : spots.length;
  for (let i = 0; i < n; i++) {
    const [x, z] = spots[i];
    const beaker = makeBeaker(i, glasses);
    beaker.position.set(x, heightAt(x, z), z);
    scene.add(beaker);
    block(x, z, 0.7);
  }
}

function makeBeaker(i, glasses) {
  const g = new THREE.Group();
  const mat = glassMat();
  glasses.push(mat);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 1.5, 14, 1, true), mat);
  cup.position.y = 0.8;
  const colors = [0x66d0c8, 0xe8c56a, 0x88a0ff, 0xf09098];
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.6, 0.7, 12),
    new THREE.MeshStandardMaterial({
      color: colors[i], emissive: colors[i], emissiveIntensity: 0.28, roughness: 0.2, transparent: true, opacity: 0.8,
    }),
  );
  liquid.position.y = 0.42;
  g.add(cup, liquid);
  return g;
}

function placeDishes(scene, low, block) {
  const spots = [[-3.2, 14], [2.6, 17], [-1.2, 27], [3.4, 29], [-4, 20]];
  const n = low ? 3 : spots.length;
  const glass = new THREE.MeshStandardMaterial({
    color: 0xd8e8ee, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.55,
  });
  const growths = [0x1c2814, 0x243018, 0x142018, 0x2a2410, 0x18241c];
  for (let i = 0; i < n; i++) {
    const [x, z] = spots[i];
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 16), glass);
    dish.position.y = 0.1;
    const agar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: 0xd8c8a4, roughness: 0.7 }),
    );
    agar.position.y = 0.12;
    const colony = new THREE.Mesh(
      new THREE.CircleGeometry(0.35 + (i % 3) * 0.12, 10),
      new THREE.MeshStandardMaterial({ color: growths[i], roughness: 1 }),
    );
    colony.rotation.x = -Math.PI / 2;
    colony.position.y = 0.16;
    g.add(dish, agar, colony);
    g.position.set(x, heightAt(x, z), z);
    scene.add(g);
    if (i % 2 === 0) block(x, z, 0.7);
  }
}

function moldForest(scene, low, block) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2414, roughness: 1, emissive: 0x0c1408, emissiveIntensity: 0.2 });
  const n = low ? 28 : 60;
  const geo = new THREE.ConeGeometry(0.16, 1, 5);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (3.2 + (i % 5) * 0.7);
    const z = 12 + (i % 10) * 1.7 + (i % 3) * 0.2;
    const s = 0.7 + (i % 4) * 0.35;
    dummy.position.set(x, heightAt(x, z) + s * 0.45, z);
    dummy.scale.set(s, s * (1.2 + (i % 3) * 0.3), s);
    dummy.rotation.y = i;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (i % 7 === 0) block(x, z, 0.35);
  }
  mesh.castShadow = !low;
  g.add(mesh);
  scene.add(g);
  return g;
}

function placeTrays(scene, block) {
  const spots = [[-3.5, 66], [3.2, 74]];
  const mat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.45, metalness: 0.35 });
  const well = new THREE.MeshStandardMaterial({ color: 0x10140e, roughness: 0.8 });
  for (const [x, z] of spots) {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 1.5), mat);
    tray.position.y = 0.12;
    tray.castShadow = true;
    g.add(tray);
    for (let i = 0; i < 6; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), well);
      dot.position.set(-0.8 + (i % 3) * 0.8, 0.24, -0.3 + Math.floor(i / 3) * 0.6);
      const colors = [0x7dffc0, 0xf0c060, 0xff6a78, 0x88c0ff, 0xd0e060, 0xc090ff];
      dot.material = new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.4 });
      g.add(dot);
    }
    g.position.set(x, heightAt(x, z), z);
    scene.add(g);
    block(x, z, 0.9);
  }
}

function spillLake() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ripple = sin(r * 28.0 - uTime * 3.0) * 0.5 + 0.5;
        float edge = smoothstep(1.0, 0.55, r);
        vec3 col = mix(vec3(0.02, 0.08, 0.1), vec3(0.35, 0.75, 0.7), ripple * 0.35);
        col += vec3(0.6, 0.95, 0.85) * pow(ripple, 6.0) * 0.35;
        float alpha = edge * (0.28 + ripple * 0.18);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(5.4, 28), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, heightAt(0, 36) + 0.06, 36);
  mesh.userData.mat = mat;
  return mesh;
}

function deskLamp() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7b3a8, roughness: 0.35, metalness: 0.65 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 10), metal);
  base.position.y = 0.08;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), metal);
  arm.position.set(0.2, 1.2, 0);
  arm.rotation.z = 0.4;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 10, 1, true), new THREE.MeshStandardMaterial({
    color: 0x1a140c, roughness: 0.6, emissive: 0xffb060, emissiveIntensity: 0.35, side: THREE.DoubleSide,
  }));
  shade.position.set(0.7, 2.15, 0);
  g.add(base, arm, shade);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildGeiger() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.55, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.7 }),
  );
  body.position.y = 0.4;
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.5 }),
  );
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0.7, 0.32);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x8a1c14 }),
  );
  needle.position.set(0.05, 0.7, 0.38);
  const wand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x141210, metalness: 0.4, roughness: 0.4 }),
  );
  wand.rotation.z = 0.9;
  wand.position.set(0.7, 0.7, 0);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffc56a, transparent: true, opacity: 0.4 }),
  );
  glow.position.set(0.45, 0.55, 0.36);
  g.add(body, face, needle, wand, glow);
  g.userData.needle = needle;
  g.userData.glow = glow;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildLaser(scene, glasses) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.4, metalness: 0.55 }),
  );
  body.rotation.z = Math.PI / 2;
  body.position.set(0, 1.3, 0);
  const headMat = glassMat();
  glasses.push(headMat);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 10), headMat);
  head.rotation.z = Math.PI / 2;
  head.position.set(-1.75, 1.3, 0);
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 1.3, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.4, roughness: 0.45 }),
  );
  stand.position.y = 0.65;
  g.add(body, head, stand);
  g.position.set(6.4, heightAt(6.4, 52), 52);
  g.rotation.y = Math.PI / 2;
  scene.add(g);
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 13.5, 8),
    new THREE.MeshBasicMaterial({
      color: 0xc8ffe4, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  core.rotation.z = Math.PI / 2;
  core.position.set(-1.2, heightAt(0, 52) + 3.15, 52);
  scene.add(core);
  const halo = new THREE.PointLight(0x9dffc8, 10, 18, 2);
  halo.position.set(0, 3.2, 52);
  scene.add(halo);
  return { beam: core, core, group: g };
}

function buildScope(tex) {
  const g = new THREE.Group();
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.55, metalness: 0.25 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(8.5, 5.4, 4.2), caseMat);
  box.position.y = 2.8;
  box.castShadow = true;
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 3.4, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.4 }),
  );
  bezel.position.set(0, 3.1, 2.15);
  const crt = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.7),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  crt.position.set(0, 3.1, 2.28);
  const knobMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.5, roughness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), knobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-1.2 + i * 0.8, 1.15, 2.2);
    g.add(knob);
  }
  g.add(box, bezel, crt);
  return g;
}

function bellJar() {
  const mat = glassMat();
  mat.uniforms.uTint.value.set(0.7, 0.9, 1);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(6.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  mesh.position.y = 0.15;
  mesh.userData.mat = mat;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(6.3, 6.3, 0.18, 20),
    new THREE.MeshStandardMaterial({ color: 0x1c2026, metalness: 0.5, roughness: 0.4 }),
  );
  base.position.y = 0.08;
  const g = new THREE.Group();
  g.add(mesh, base);
  g.userData.mat = mat;
  return g;
}

function giantShoe() {
  const g = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.78 });
  const sole = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 5.2), new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: 0.9 }));
  sole.position.y = 0.2;
  const upper = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), leather);
  upper.scale.set(1.05, 0.55, 1.8);
  upper.position.set(0, 0.7, 0.3);
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), leather);
  toe.scale.set(1.1, 0.5, 1.2);
  toe.position.set(0, 0.45, 2.1);
  g.add(sole, upper, toe);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function chairLeg() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x24180f, roughness: 0.7 });
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 16, 8), mat);
  leg.position.y = 8;
  leg.castShadow = true;
  return leg;
}

function buildNotebook() {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.12, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1a2744, roughness: 0.7 }),
  );
  cover.position.y = 0.1;
  const page = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.04, 1.9),
    new THREE.MeshStandardMaterial({ color: 0xf0e6d0, roughness: 0.85 }),
  );
  page.position.y = 0.18;
  g.add(cover, page);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildGate(scene, x, z) {
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.05, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, heightAt(x, z) + 0.05, z);
  const lamp = new THREE.PointLight(0xffc56a, 0.2, 7, 2);
  lamp.position.set(x, heightAt(x, z) + 0.8, z);
  scene.add(glow, lamp);
  return {
    glow, lamp, open: false, ready: false, x, z,
    setReady(v) { this.ready = !!v; },
    setOpen(v) { this.open = !!v; this.ready = this.ready || !!v; },
  };
}

function placeChest(scene, x, z) {
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7c0c6, roughness: 0.4, metalness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a3034, roughness: 0.5 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.55), metal);
  body.position.y = 0.2;
  body.castShadow = true;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.1, 0.58), dark);
  lid.geometry.translate(0, 0.05, 0.22);
  lid.position.set(0, 0.34, -0.22);
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
  g.fillStyle = "#f4ecd8";
  g.fillRect(8, 8, 112, 152);
  g.strokeStyle = "#1a2744";
  g.strokeRect(8, 8, 112, 152);
  g.strokeStyle = "rgba(26, 39, 68, 0.45)";
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(20, 34 + i * 16);
    g.lineTo(104 - (i % 3) * 10, 34 + i * 16);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildPages(scene) {
  const tex = pageTexture();
  const spots = [
    ["born-twice", -2.1, 8],
    ["sphere-nineteen", 2.3, 26],
    ["trehalose", -2.5, 40],
    ["argon-laser", 2.1, 66],
    ["second-birth", -1.7, 78],
  ];
  return spots.map(([id, x, z]) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffe2a8, emissiveIntensity: 0.4,
      roughness: 0.55, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.96), mat);
    const y = heightAt(x, z) + 1.05;
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
    p.mesh.position.y = p.baseY + Math.sin(t * 1.7 + p.x) * 0.08;
    p.mesh.rotation.y = t * 0.4 + p.z;
  }
}

function fogCurtain(scene) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xa8b4c4, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const z0 = 58.2;
  const base = heightAt(0, z0);
  for (let i = 0; i < 3; i++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(20, 4.2), mat);
    sheet.position.set(0, base + 1.8, z0 + i * 0.28);
    group.add(sheet);
  }
  scene.add(group);
  let open = false;
  return {
    setOpen(v) { open = !!v; },
    update(t) {
      const target = open ? 0.03 : 0.46 + Math.sin(t * 1.4) * 0.05;
      mat.opacity += (target - mat.opacity) * 0.08;
      group.position.y = Math.sin(t * 0.7) * 0.06;
    },
  };
}

function fluorescentBanks(scene) {
  const lights = [];
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd8efe8, emissive: 0xdff8ee, emissiveIntensity: 1.4, roughness: 0.3,
  });
  for (const z of [8, 40, 78]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 8), mat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, 16.2, z);
    scene.add(tube);
    const light = new THREE.PointLight(0xd8f0e8, 5, 22, 2);
    light.position.set(0, 15.2, z);
    scene.add(light);
    lights.push(light);
  }
  return lights;
}

function beamMotes(n) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = 2.4 + Math.random() * 2;
    pos[i * 3 + 2] = 48 + Math.random() * 8;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xd8ffe8, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true,
  }));
  pts.userData.n = n;
  pts.frustumCulled = false;
  return pts;
}

function driftMotes(pts, dt, player) {
  const arr = pts.geometry.attributes.position.array;
  const oz = player ? player.z : 40;
  for (let i = 0; i < pts.userData.n; i++) {
    arr[i * 3] -= dt * 0.35;
    if (arr[i * 3] < -8) arr[i * 3] = 7;
    arr[i * 3 + 2] += Math.sin(arr[i * 3] + oz) * dt * 0.05;
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

function makeDrips(n) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (i % 2 ? -6.4 : 6.5);
    pos[i * 3 + 1] = 4 + Math.random() * 6;
    pos[i * 3 + 2] = 10 + i * 7;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xc8fff0, size: 0.08, transparent: true, opacity: 0.75, depthWrite: false,
  }));
  pts.userData.n = n;
  pts.userData.base = pos.slice();
  pts.frustumCulled = false;
  return pts;
}

function driftDrips(pts, dt) {
  const arr = pts.geometry.attributes.position.array;
  const base = pts.userData.base;
  for (let i = 0; i < pts.userData.n; i++) {
    arr[i * 3 + 1] -= dt * 1.4;
    if (arr[i * 3 + 1] < heightAt(arr[i * 3], arr[i * 3 + 2]) + 0.1) arr[i * 3 + 1] = base[i * 3 + 1];
  }
  pts.geometry.attributes.position.needsUpdate = true;
}
