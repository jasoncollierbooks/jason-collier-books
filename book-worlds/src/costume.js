// Original clothing meshes for the CC0 Quaternius skeleton.
// Pieces are built in character space (feet at y = 0) and parented to bones
// so collars, sleeves, and split tails follow the rig.
import * as THREE from "three";

function openShell(rows, gap, opts = {}) {
  const segA = 20;
  const thick = opts.thick || 0;
  const curl = opts.curl || 0;
  const lay = opts.lay || 0;
  const a0 = gap;
  const a1 = Math.PI * 2 - gap;
  const positions = [];
  const uvs = [];
  const indices = [];
  rows.forEach((row, iy) => {
    for (let ia = 0; ia <= segA; ia++) {
      const t = ia / segA;
      const a = a0 + (a1 - a0) * t;
      const fold = Math.sin(a * 3.0 + iy * 0.85) * 0.012 * row.rx;
      const hem = iy / Math.max(1, rows.length - 1);
      const flare = 1 + Math.sin(a * 2.0) * 0.03 * hem;
      let x = Math.sin(a) * row.rx * flare + Math.sin(a) * fold;
      let z = Math.cos(a) * row.rz * flare + Math.cos(a) * fold + (row.z || 0);
      let y = row.y;
      if (curl || lay) {
        const lip = Math.max(0, 1 - Math.min(t, 1 - t) * (lay ? 5 : 4.2));
        if (curl) {
          x *= 1 - lip * curl * 0.55;
          z += lip * curl * 0.04;
        }
        if (lay) {
          y -= lip * lay;
          x *= 1 - lip * 0.42;
        }
      }
      positions.push(x, y, z);
      uvs.push(t, iy / Math.max(1, rows.length - 1));
    }
  });
  const stride = segA + 1;
  for (let iy = 0; iy < rows.length - 1; iy++) {
    for (let ia = 0; ia < segA; ia++) {
      const i = iy * stride + ia;
      indices.push(i, i + stride, i + 1, i + 1, i + stride, i + stride + 1);
    }
  }
  if (thick > 0) {
    const base = rows.length * stride;
    for (let i = 0; i < base; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const len = Math.hypot(x, z) || 1;
      positions.push(x - (x / len) * thick, y, z - (z / len) * thick);
      uvs.push(uvs[i * 2], uvs[i * 2 + 1]);
    }
    for (let iy = 0; iy < rows.length - 1; iy++) {
      for (let ia = 0; ia < segA; ia++) {
        const i = base + iy * stride + ia;
        indices.push(i, i + 1, i + stride, i + 1, i + stride + 1, i + stride);
      }
    }
    const stitch = (a, b, c, d) => indices.push(a, c, b, b, c, d);
    for (let iy = 0; iy < rows.length - 1; iy++) {
      const left = iy * stride;
      stitch(left, left + stride, base + left, base + left + stride);
      const right = iy * stride + segA;
      stitch(right + stride, right, base + right + stride, base + right);
    }
    for (let ia = 0; ia < segA; ia++) {
      stitch(ia + 1, ia, base + ia + 1, base + ia);
      const top = (rows.length - 1) * stride + ia;
      stitch(top, top + 1, base + top, base + top + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Long duster: shoulders to mid-calf, open down the front, cinched at the waist.
// "close" is the Keeper's tailor: same cut, seated on the shoulder and narrowed
// through the chest, back, sleeves, and hem. Other coats keep the original shell.
export function dusterGeometry(fit) {
  if (fit === "close") {
    return openShell([
      { y: 1.55, rx: 0.15, rz: 0.11, z: 0.012 },
      { y: 1.48, rx: 0.355, rz: 0.15, z: -0.012 },
      { y: 1.38, rx: 0.255, rz: 0.14, z: 0.0 },
      { y: 1.24, rx: 0.188, rz: 0.15, z: 0.0 },
      { y: 1.08, rx: 0.162, rz: 0.132, z: 0.006 },
      { y: 0.88, rx: 0.188, rz: 0.142, z: 0.004 },
      { y: 0.66, rx: 0.218, rz: 0.152, z: 0.0 },
      { y: 0.42, rx: 0.252, rz: 0.168, z: 0.0 },
    ], 0.4, { thick: 0.013, curl: 0.55 });
  }
  return openShell([
    { y: 1.56, rx: 0.22, rz: 0.16 },
    { y: 1.44, rx: 0.32, rz: 0.21 },
    { y: 1.26, rx: 0.27, rz: 0.19 },
    { y: 1.06, rx: 0.22, rz: 0.16 },
    { y: 0.86, rx: 0.28, rz: 0.20 },
    { y: 0.64, rx: 0.34, rz: 0.23 },
    { y: 0.40, rx: 0.40, rz: 0.26 },
  ], 0.62);
}

export function collarGeometry(fit) {
  if (fit === "close") {
    // Low band around the neck. The front tips lay down on the chest
    // and stay inside the shoulder line instead of standing up as wings.
    return openShell([
      { y: 1.46, rx: 0.112, rz: 0.086, z: 0.018 },
      { y: 1.50, rx: 0.122, rz: 0.092, z: 0.012 },
      { y: 1.535, rx: 0.116, rz: 0.086, z: 0.008 },
    ], 0.9, { lay: 0.07, thick: 0.008 });
  }
  return openShell([
    { y: 1.50, rx: 0.15, rz: 0.12 },
    { y: 1.58, rx: 0.20, rz: 0.15 },
    { y: 1.66, rx: 0.17, rz: 0.13 },
  ], 1.05);
}

export function coatTailGeometry(side, fit) {
  const close = fit === "close";
  const geo = new THREE.PlaneGeometry(close ? 0.18 : 0.22, close ? 0.46 : 0.52, 3, 6);
  geo.translate(side * (close ? 0.09 : 0.12), close ? 0.26 : 0.22, close ? -0.11 : -0.16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const drop = Math.max(0, (close ? 0.38 : 0.42) - y);
    pos.setX(i, pos.getX(i) + side * drop * (close ? 0.1 : 0.16));
    pos.setZ(i, pos.getZ(i) - drop * (close ? 0.12 : 0.22));
  }
  geo.computeVertexNormals();
  return geo;
}

// radii.top is the +Y end, radii.bottom the -Y end. The close coat passes
// matching elbow radii so the upper and forearm pieces read as one taper.
export function sleeveGeometry(len, fit, radii) {
  const close = fit === "close";
  const height = Math.max(0.12, len);
  const rTop = radii ? radii.top : (close ? 0.064 : 0.055);
  const rBot = radii ? radii.bottom : (close ? 0.078 : 0.072);
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, close ? 14 : 12, close ? 8 : 4, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / Math.max(0.05, height) + 0.5;
    const cuff = close ? 1 : (t < 0.18 ? 1.18 : 1);
    const wrinkle = 1 + Math.sin(t * (close ? 8 : 14)) * (close ? 0.006 : 0.045);
    pos.setX(i, pos.getX(i) * wrinkle * cuff);
    pos.setZ(i, pos.getZ(i) * wrinkle * cuff);
  }
  geo.computeVertexNormals();
  return geo;
}

export function coverallGeometry() {
  return openShell([
    { y: 0.92, rx: 0.20, rz: 0.15 },
    { y: 1.08, rx: 0.22, rz: 0.16 },
    { y: 1.28, rx: 0.24, rz: 0.17 },
    { y: 1.46, rx: 0.26, rz: 0.18 },
  ], 0.42);
}

function chestLapel(side) {
  const cols = 4;
  const rows = 5;
  const geo = new THREE.PlaneGeometry(0.046, 0.14, cols, rows);
  geo.translate(side * 0.046, 1.26, 0.112);
  const pos = geo.attributes.position;
  const src = pos.array;
  const n = pos.count;
  const shaped = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = src[i * 3];
    const y = src[i * 3 + 1];
    const z = src[i * 3 + 2];
    const u = (y - 1.19) / 0.14;
    const across = (x / side - 0.046) / 0.046;
    shaped[i * 3] = x - side * Math.max(0, u - 0.25) * 0.016;
    shaped[i * 3 + 1] = y - Math.pow(Math.max(0, u - 0.35), 2) * 0.08;
    shaped[i * 3 + 2] = z + Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) * 0.015 + (1 - Math.min(1, Math.abs(across))) * 0.005;
  }
  const thick = 0.008;
  const out = new Float32Array(n * 6);
  const uv = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    out[i * 3] = shaped[i * 3];
    out[i * 3 + 1] = shaped[i * 3 + 1];
    out[i * 3 + 2] = shaped[i * 3 + 2];
    const j = n + i;
    out[j * 3] = shaped[i * 3] + side * 0.001;
    out[j * 3 + 1] = shaped[i * 3 + 1];
    out[j * 3 + 2] = shaped[i * 3 + 2] - thick;
    const s = (i % (cols + 1)) / cols;
    const t = Math.floor(i / (cols + 1)) / rows;
    uv[i * 2] = s;
    uv[i * 2 + 1] = t;
    uv[j * 2] = s;
    uv[j * 2 + 1] = t;
  }
  const idx = [];
  const sx = cols + 1;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * sx + ix;
      idx.push(a, a + sx, a + 1, a + 1, a + sx, a + sx + 1);
      const b = n + a;
      idx.push(b, b + 1, b + sx, b + 1, b + sx + 1, b + sx);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function lapelGeometry(side, fit) {
  if (fit === "close") return chestLapel(side);
  const geo = new THREE.PlaneGeometry(0.09, 0.28, 1, 3);
  geo.translate(side * 0.1, 1.36, 0.16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) + side * (y - 1.22) * 0.15);
    pos.setZ(i, pos.getZ(i) + (y - 1.22) * 0.08);
  }
  geo.computeVertexNormals();
  return geo;
}

export function wrenchGroup(metal) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.2, 8), metal);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.022, 0.016), metal);
  head.position.y = 0.1;
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.014), metal);
  jaw.position.set(0.03, 0.112, 0);
  const jaw2 = jaw.clone();
  jaw2.position.x = -0.03;
  g.add(handle, head, jaw, jaw2);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function spyglassGroup(metal, leather) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.2, 10), metal);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 10), leather);
  band.position.y = -0.04;
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.03, 8), leather);
  eye.position.y = -0.1;
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 8),
    new THREE.MeshStandardMaterial({ color: 0x8eb4c4, metalness: 0.4, roughness: 0.12 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.y = 0.102;
  g.add(tube, band, eye, lens);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function goggleRig(brass, glass, strapMat) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 6, 12), brass);
    rim.position.set(s * 0.05, 0, 0);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 10), glass);
    lens.position.set(s * 0.05, 0, 0.004);
    g.add(rim, lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.01), brass);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 14), strapMat);
  strap.rotation.x = Math.PI / 2;
  g.add(bridge, strap);
  return g;
}
