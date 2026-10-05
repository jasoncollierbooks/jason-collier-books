// Deck dressing, riveted stacks, rope rigging, cloud sea, and distant traffic.
// Static repeats are instanced. Textures are small canvases (512, or 256 on phones).
import * as THREE from "three";
import { softDot } from "../../src/rigs.js?v=7";

const dummy = new THREE.Object3D();
const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();

function canvasTex(w, h, draw, alpha) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  if (alpha) tex.premultiplyAlpha = false;
  return tex;
}

export function stackMetalTexture(size) {
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = "#5c6166";
    g.fillRect(0, 0, w, h);
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      const y = (i + 0.5) * (h / bands);
      g.fillStyle = i % 2 ? "#4a4e52" : "#6a7074";
      g.fillRect(0, i * (h / bands), w, h / bands - 2);
      g.strokeStyle = "#2e3236";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      g.fillStyle = "#c6a15a";
      for (let x = 18; x < w; x += 36) {
        g.beginPath();
        g.arc(x, y, 4.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = "rgba(30, 24, 20, 0.45)";
    g.fillRect(0, 0, w, h * 0.28);
    g.fillStyle = "rgba(40, 28, 22, 0.28)";
    for (let i = 0; i < 8; i++) g.fillRect((i * 47) % w, 0, 10, h * 0.55);
  });
}

export function cloudTexture(size) {
  return canvasTex(size, size, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % h;
      const rx = 70 + (i % 5) * 28;
      const ry = 26 + (i % 4) * 12;
      const grd = g.createRadialGradient(x, y, 8, x, y, rx);
      grd.addColorStop(0, "rgba(255,248,240,0.92)");
      grd.addColorStop(0.55, "rgba(236,214,196,0.55)");
      grd.addColorStop(1, "rgba(236,214,196,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, rx, ry, (i % 7) * 0.2, 0, Math.PI * 2);
      g.fill();
    }
  }, true);
}

export function makeStack(radiusTop, radiusBottom, height, metalMat, brass, capMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16), metalMat);
  body.castShadow = true;
  g.add(body);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop * 1.18, radiusTop * 1.05, height * 0.08, 16), capMat);
  lip.position.y = height * 0.46;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop * 0.72, radiusTop * 1.05, height * 0.12, 12), capMat);
  cap.position.y = height * 0.52;
  g.add(lip, cap);
  for (const t of [0.15, 0.55, 0.82]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radiusBottom * (1 - t * 0.25) + 0.02, 0.035, 6, 14), brass);
    band.rotation.x = Math.PI / 2;
    band.position.y = -height * 0.5 + height * t;
    g.add(band);
  }
  const soot = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop * 0.92, radiusBottom * 0.96, height * 0.22, 12, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 0.9, metalness: 0.05 }),
  );
  soot.position.y = height * 0.28;
  g.add(soot);
  return g;
}

function ropeMesh(count, mat) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  return new THREE.InstancedMesh(geo, mat, count);
}

function setRope(mesh, i, a, b, radius) {
  dir.subVectors(b, a);
  const len = Math.max(0.05, dir.length());
  dummy.position.copy(a).add(b).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / len));
  dummy.scale.set(radius, len, radius);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

function bagPinch(t) {
  const nose = t > 0 ? t * 1.05 : t * 0.94;
  const u = Math.max(-1, Math.min(1, nose));
  return Math.pow(Math.max(0, Math.cos(u * Math.PI * 0.5)), 0.58);
}

function gunwaleX(z) {
  if (z <= -16.6 || z >= 26.6) return 0.45;
  const t = (z + 16.6) / 43.2;
  const stern = Math.sin(Math.min(1, t / 0.18) * Math.PI * 0.5);
  const bowT = Math.max(0, Math.min(1, (t - 0.5) / 0.5));
  const bow = Math.pow(Math.cos(bowT * Math.PI * 0.5), 1.05);
  const bellyT = Math.max(0, Math.min(1, (t - 0.05) / 0.62));
  const belly = 0.86 + 0.14 * Math.sin(bellyT * Math.PI);
  const shape = t < 0.5 ? stern * belly : bow;
  return Math.max(0.4, 5.55 * shape);
}

export function rigBalloon(ship, bag, low, ropeMat, brass) {
  const { cx, cy, cz, rx, ry, rz } = bag;
  const bands = low ? 4 : 6;
  for (let i = 0; i < bands; i++) {
    const t = -0.62 + (i / (bands - 1)) * 1.24;
    const k = bagPinch(t);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.35, rx * k + 0.04), 0.045, 6, low ? 14 : 22),
      brass,
    );
    band.position.set(cx, cy, cz + t * rz);
    band.scale.set(1, ry / rx, 1);
    band.castShadow = !low;
    ship.add(band);
  }

  const pairs = [];
  const longs = low ? 4 : 6;
  const steps = low ? 7 : 11;
  for (let i = 0; i < longs; i++) {
    const a = (i / longs) * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      const t0 = -0.9 + (s / steps) * 1.8;
      const t1 = -0.9 + ((s + 1) / steps) * 1.8;
      const at = (t) => {
        const k = bagPinch(t);
        return new THREE.Vector3(
          cx + Math.cos(a) * rx * k,
          cy + Math.sin(a) * ry * k,
          cz + t * rz,
        );
      };
      pairs.push(at(t0), at(t1));
    }
  }
  const seams = ropeMesh(pairs.length / 2, ropeMat);
  seams.castShadow = !low;
  seams.frustumCulled = false;
  for (let i = 0; i < pairs.length / 2; i++) setRope(seams, i, pairs[i * 2], pairs[i * 2 + 1], 0.03);
  seams.instanceMatrix.needsUpdate = true;
  ship.add(seams);

  const guys = [];
  const n = low ? 5 : 8;
  for (let i = 0; i < n; i++) {
    const t = -0.55 + (i / (n - 1)) * 1.1;
    const k = bagPinch(t);
    const z = cz + t * rz * 0.78;
    const deckZ = Math.max(-14, Math.min(20, z));
    const rise = deckZ <= -15.4 ? 0.62 : deckZ < -8.4 ? 0.62 * (1 - (deckZ + 15.4) / 7) : 0;
    const gx = gunwaleX(deckZ);
    for (const side of [-1, 1]) {
      const belly = Math.PI * (side < 0 ? 1.22 : 1.78);
      guys.push(
        new THREE.Vector3(side * gx, 0.95 + rise, deckZ),
        new THREE.Vector3(
          cx + Math.cos(belly) * rx * k * 0.82,
          cy + Math.sin(belly) * ry * k,
          z,
        ),
      );
    }
  }
  const lines = ropeMesh(guys.length / 2, ropeMat);
  lines.frustumCulled = false;
  for (let i = 0; i < guys.length / 2; i++) setRope(lines, i, guys[i * 2], guys[i * 2 + 1], 0.026);
  lines.instanceMatrix.needsUpdate = true;
  ship.add(lines);
  for (let i = 0; i < n; i += 2) {
    const t = -0.55 + (i / (n - 1)) * 1.1;
    const z = Math.max(-14, Math.min(20, cz + t * rz * 0.78));
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 10), brass);
    pulley.position.set(gunwaleX(z) * (i % 4 === 0 ? -1 : 1), 1.05, z);
    pulley.rotation.y = Math.PI / 2;
    ship.add(pulley);
  }
}

export function cloudSea(scene, low) {
  const size = low ? 256 : 512;
  const map = cloudTexture(size);
  const layers = low
    ? [{ y: -14, s: 90, o: 0.78, c: 0xf3e6d8 }, { y: -22, s: 140, o: 0.62, c: 0xe4cbb8 }]
    : [
      { y: -12, s: 70, o: 0.55, c: 0xfff4ea },
      { y: -18, s: 120, o: 0.72, c: 0xf6e2d0 },
      { y: -26, s: 180, o: 0.6, c: 0xe7cfc0 },
      { y: -36, s: 240, o: 0.45, c: 0xd9c2c4 },
    ];
  const banks = [];
  for (const layer of layers) {
    const mat = new THREE.MeshBasicMaterial({
      map, color: layer.c, transparent: true, opacity: layer.o, depthWrite: false, side: THREE.DoubleSide,
    });
    mat.map = map.clone();
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(2, 2);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layer.s * 4, layer.s * 4), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = layer.y;
    mesh.userData.scroll = 0.015 + banks.length * 0.004;
    scene.add(mesh);
    banks.push(mesh);
  }
  return banks;
}

export function distantTraffic(scene, rust, cream, rockMat, low) {
  const spots = low
    ? [[-48, 8, 36], [62, 4, -20]]
    : [[-48, 8, 36], [62, 4, -20], [-70, 14, -30], [40, 18, 70]];
  spots.forEach(([x, y, z], i) => {
    const ship = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 4.2), i % 2 ? rust : cream);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), cream);
    bag.scale.set(0.8, 0.5, 1.6);
    bag.position.y = 1.15;
    ship.add(hull, bag);
    ship.position.set(x, y, z);
    ship.userData.drift = 0.15 + (i % 3) * 0.05;
    ship.userData.base = y;
    scene.add(ship);
  });
  const rocks = low ? 3 : 5;
  for (let i = 0; i < rocks; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + (i % 3), 0), rockMat);
    rock.position.set(-30 + i * 22, -6 - (i % 2) * 4, -40 + (i % 3) * 18);
    rock.rotation.set(i, i * 0.4, 0.2);
    scene.add(rock);
  }
}

export function deckDetail(ship, mats, low, block) {
  const { wood, brass, dark, iron, rope } = mats;
  const strapGeo = new THREE.BoxGeometry(0.12, 0.04, 7.4);
  const strapN = low ? 8 : 14;
  const straps = new THREE.InstancedMesh(strapGeo, iron, strapN);
  for (let i = 0; i < strapN; i++) {
    dummy.position.set(0, 0.12, -6 + i * (20 / strapN));
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    straps.setMatrixAt(i, dummy.matrix);
  }
  straps.receiveShadow = true;
  straps.frustumCulled = false;
  ship.add(straps);

  const rivetGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const rivetN = low ? 40 : 80;
  const rivets = new THREE.InstancedMesh(rivetGeo, brass, rivetN);
  for (let i = 0; i < rivetN; i++) {
    const along = -6 + (i % (rivetN / 2)) * (20 / (rivetN / 2));
    const side = i < rivetN / 2 ? -2.8 : 2.8;
    dummy.position.set(side, 0.05, along);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 0.45, 1);
    dummy.updateMatrix();
    rivets.setMatrixAt(i, dummy.matrix);
  }
  rivets.frustumCulled = false;
  ship.add(rivets);

  for (const [x, z] of [[-2.4, 6.5], [3.1, -4]]) {
    const hatch = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.15), dark);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.9), wood);
    lid.position.y = 0.04;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 5, 8), brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.35, 0.08, 0);
    hatch.add(frame, lid, ring);
    hatch.position.set(x, 0.02, z);
    ship.add(hatch);
  }

  const barrelSpots = [[-5.2, -4], [-5.5, -3.2], [5.4, 6.5], [4.6, 7.1], [-4.8, 16]];
  for (const [x, z] of barrelSpots) {
    for (const y of [0.18, 0.42]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 5, 10), dark);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, y, z);
      ship.add(hoop);
    }
  }

  for (const [x, z] of [[3.2, 12], [-4.2, 8.5], [2.4, -2.2]]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 12), rope);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(x, 0.08, z);
    ship.add(coil);
  }

  for (const side of [-1, 1]) {
    const cannon = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.15, 10), dark);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.x = side * 0.35;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 5, 10), brass);
    band.rotation.y = Math.PI / 2;
    band.position.x = side * 0.15;
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.42), wood);
    carriage.position.y = -0.2;
    cannon.add(barrel, band, carriage);
    cannon.position.set(side * 3.9, 0.42, side > 0 ? 4.2 : 8.4);
    cannon.rotation.y = side > 0 ? -0.4 : 0.5;
    ship.add(cannon);
    block(side * 3.9, side > 0 ? 4.2 : 8.4, 0.55);
  }
}

export function wheelhouse(mats, block) {
  const { wood, brass, dark, iron } = mats;
  const house = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({
    color: 0xc5dde6, roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.42,
  });
  const wall = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };
  house.add(wall(4.4, 0.18, 3.4, 0, 0.1, 0));
  house.add(wall(0.16, 2.15, 3.2, -2.1, 1.2, 0));
  house.add(wall(0.16, 2.15, 3.2, 2.1, 1.2, 0));
  house.add(wall(3.9, 0.7, 0.14, 0, 1.95, -1.55));
  house.add(wall(3.9, 0.55, 0.14, 0, 0.55, -1.55));
  house.add(wall(1.15, 2.15, 0.14, -1.45, 1.2, 1.55));
  house.add(wall(1.15, 2.15, 0.14, 1.45, 1.2, 1.55));
  house.add(wall(3.9, 0.4, 0.14, 0, 2.05, 1.55));
  const pane = (w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    return m;
  };
  house.add(pane(3.4, 0.85, 0, 1.25, -1.64));
  house.add(pane(3.4, 0.85, 0, 1.25, 1.64, Math.PI));
  house.add(pane(1.7, 0.85, -2.2, 1.25, 0, Math.PI / 2));
  house.add(pane(1.7, 0.85, 2.2, 1.25, 0, -Math.PI / 2));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 3.7), iron);
  roof.position.y = 2.35;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.06, 0.08), brass);
  trim.position.set(0, 2.2, -1.7);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.06), dark);
  door.position.set(0, 0.85, 1.58);
  const lamp = new THREE.PointLight(0xffb060, 0.8, 6, 2);
  lamp.position.set(0, 1.7, 0.2);
  house.add(roof, trim, door, lamp);
  house.position.set(0, 0, -0.4);
  block(0, -0.4, 1.7);
  block(-1.6, -0.4, 0.7);
  block(1.6, -0.4, 0.7);
  return house;
}

export { softDot };
