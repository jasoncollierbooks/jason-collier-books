// Original clothing meshes for the CC0 Quaternius skeleton.
// Pieces are built in character space (feet at y = 0) and parented to bones
// so collars, sleeves, and split tails follow the rig.
import * as THREE from "three";

function openShell(rows, gap) {
  const segA = 20;
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
      const x = Math.sin(a) * row.rx * flare + Math.sin(a) * fold;
      const z = Math.cos(a) * row.rz * flare + Math.cos(a) * fold;
      positions.push(x, row.y, z);
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Long duster: shoulders to mid-calf, open down the front, cinched at the waist.
export function dusterGeometry() {
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

export function collarGeometry() {
  return openShell([
    { y: 1.50, rx: 0.15, rz: 0.12 },
    { y: 1.58, rx: 0.20, rz: 0.15 },
    { y: 1.66, rx: 0.17, rz: 0.13 },
  ], 1.05);
}

export function coatTailGeometry(side) {
  const geo = new THREE.PlaneGeometry(0.22, 0.52, 3, 6);
  geo.translate(side * 0.12, 0.22, -0.16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const drop = Math.max(0, 0.42 - y);
    pos.setX(i, pos.getX(i) + side * drop * 0.16);
    pos.setZ(i, pos.getZ(i) - drop * 0.22);
  }
  geo.computeVertexNormals();
  return geo;
}

export function sleeveGeometry(len) {
  const geo = new THREE.CylinderGeometry(0.055, 0.072, Math.max(0.12, len), 12, 4, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / Math.max(0.05, len) + 0.5;
    const cuff = t < 0.18 ? 1.18 : 1;
    const wrinkle = 1 + Math.sin(t * 14) * 0.045;
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

export function lapelGeometry(side) {
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
