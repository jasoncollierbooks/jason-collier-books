/* Overhead maze, painted from above. North is up.
   Walls are one hedgerow: a shared cap, a face only on the outer rim,
   moss and ivy spilling into the corridor. The ground outside the maze
   is painted terrain, and unexplored corridors wear a soft mist. */
import { CELL, center } from "./logic.js";

const PX = 56;
const skirts = new WeakMap();
const paints = new WeakMap();

const PAL = {
  trail: {
    terrain: "#4a3424", terrainAlt: "#6a4a30", floor: "#7a5436", alt: "#6a482c",
    rut: "#3a2618", grass: "#3e6a34", stone: "#c4b29a", dark: "#5a4638",
    moss: "#2f6a32", ivy: "#1e5228", flower: "#e07a86", gold: "#e4c27a",
    mist: "#6e5640", glow: "255, 186, 110",
  },
  pine: {
    terrain: "#24301c", terrainAlt: "#3a4a2c", floor: "#4a5c38", alt: "#3c4c2e",
    rut: "#2a341c", grass: "#2f7a3c", stone: "#9aa48c", dark: "#3e4a38",
    moss: "#247038", ivy: "#184828", flower: "#d8e2a4", gold: "#d7e2a4",
    mist: "#3c5034", glow: "210, 230, 160",
  },
  mountain: {
    terrain: "#8aa0b0", terrainAlt: "#c5d2de", floor: "#e4ebf2", alt: "#d0dae4",
    rut: "#9aabba", grass: "#7a9484", stone: "#8b98a4", dark: "#3e4e5c",
    moss: "#4a7054", ivy: "#2c4c38", flower: "#f4f7fb", gold: "#f2e2b4",
    mist: "#b7c4d0", glow: "220, 230, 255",
  },
  rusty: {
    terrain: "#3a2822", terrainAlt: "#5a3c30", floor: "#5a3a30", alt: "#4a3028",
    rut: "#2a1c16", grass: "#6a4030", stone: "#b07050", dark: "#4a2c22",
    moss: "#3a5840", ivy: "#6a3030", flower: "#e0a060", gold: "#e0b070",
    mist: "#5a3a2e", glow: "255, 170, 90",
  },
  pulse: {
    terrain: "#140c22", terrainAlt: "#2a1848", floor: "#2c1848", alt: "#241440",
    rut: "#160c28", grass: "#4a3878", stone: "#8a74b0", dark: "#2c1c48",
    moss: "#3a5078", ivy: "#8060c8", flower: "#e0c0ff", gold: "#e0d0ff",
    mist: "#2c1c44", glow: "190, 160, 255",
  },
  thorne: {
    terrain: "#1a2822", terrainAlt: "#3a5048", floor: "#d0d6cc", alt: "#c0c8bc",
    rut: "#8a948c", grass: "#4a8a64", stone: "#b4baae", dark: "#3a4640",
    moss: "#2a6844", ivy: "#1a5840", flower: "#f2fff0", gold: "#d8f0c8",
    mist: "#6a7c74", glow: "180, 240, 200",
  },
  seeders: {
    terrain: "#0c2418", terrainAlt: "#1a4030", floor: "#1c4032", alt: "#163628",
    rut: "#0c241c", grass: "#1e8a52", stone: "#7a9c88", dark: "#1e3c34",
    moss: "#16884c", ivy: "#2ec880", flower: "#c8ffe0", gold: "#c8ffe0",
    mist: "#1a4032", glow: "120, 230, 180",
  },
  envoy: {
    terrain: "#100e18", terrainAlt: "#221c30", floor: "#1a1824", alt: "#221e30",
    rut: "#100e16", grass: "#3a3058", stone: "#6a6478", dark: "#221e2c",
    moss: "#3a3050", ivy: "#9070b8", flower: "#d0c0ff", gold: "#d0d4ff",
    mist: "#2a2638", glow: "180, 170, 255",
  },
  meta: {
    terrain: "#2a1c14", terrainAlt: "#4a3424", floor: "#3a2a1c", alt: "#4a3422",
    rut: "#24180e", grass: "#4a5830", stone: "#8a7058", dark: "#3a2c22",
    moss: "#3a5830", ivy: "#c4a060", flower: "#f0d8a0", gold: "#e6c878",
    mist: "#4a3426", glow: "255, 210, 140",
  },
};

function unit(x, z, salt) {
  let n = Math.imul((x | 0) + salt * 19, 374761393) ^ Math.imul((z | 0) + salt * 7, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) % 1000 / 1000;
}

function tint(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.min(255, ((n >> shift) & 255) + delta));
  return "rgb(" + (ch(16) | 0) + "," + (ch(8) | 0) + "," + (ch(0) | 0) + ")";
}

function skirtOf(world) {
  let set = skirts.get(world);
  if (set) return set;
  set = new Set();
  const rows = world.grid.length;
  const cols = world.grid[0].length;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      let touch = false;
      for (let dz = -1; dz <= 1 && !touch; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const row = world.grid[z + dz];
          const ch = row && row[x + dx];
          if (ch && ch !== "#") touch = true;
        }
      }
      if (!touch) set.add(x + "," + z);
    }
  }
  skirts.set(world, set);
  return set;
}

function wallAt(world, flags, skirt, x, z) {
  if (x < 0 || z < 0 || z >= world.grid.length || x >= world.grid[0].length) return false;
  if (skirt.has(x + "," + z)) return false;
  const ch = world.grid[z][x];
  if (ch === "#") return true;
  if (ch === "+" && !(flags && flags[world.door])) return true;
  if (ch === "=" && !(flags && flags[world.door2])) return true;
  return false;
}

function floorAt(world, flags, skirt, x, z) {
  if (x < 0 || z < 0 || z >= world.grid.length || x >= world.grid[0].length) return false;
  if (skirt.has(x + "," + z)) return false;
  return !wallAt(world, flags, skirt, x, z);
}

function paintWorld(world, flags) {
  const key = world.id + ":" + (flags && flags[world.door] ? "1" : "0") + (flags && flags[world.door2] ? "1" : "0");
  const hit = paints.get(world);
  if (hit && hit.key === key) return hit;
  const skirt = skirtOf(world);
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  const pad = 8;
  const canvas = document.createElement("canvas");
  canvas.width = (cols + pad * 2) * PX;
  canvas.height = (rows + pad * 2) * PX;
  const g = canvas.getContext("2d");
  const pal = PAL[world.id] || PAL.trail;
  const ox = pad * PX;
  const oy = pad * PX;
  g.fillStyle = pal.terrain;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = i % 3 ? pal.terrainAlt : pal.grass;
    g.globalAlpha = 0.28 + unit(i, 2, 3) * 0.25;
    g.beginPath();
    g.ellipse(
      unit(i, 4, 5) * canvas.width,
      unit(i, 6, 7) * canvas.height,
      PX * (1.4 + unit(i, 8, 9) * 3.2),
      PX * (0.7 + unit(i, 1, 2) * 1.6),
      unit(i, 3, 4) * 4,
      0,
      Math.PI * 2
    );
    g.fill();
  }
  g.globalAlpha = 1;

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!floorAt(world, flags, skirt, x, z)) continue;
      drawFloor(g, ox + x * PX, oy + z * PX, PX, pal, world.id, x, z, world, flags, skirt);
    }
  }

  g.fillStyle = "rgba(20, 12, 8, 0.38)";
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!wallAt(world, flags, skirt, x, z)) continue;
      g.fillRect(ox + x * PX + PX * 0.16, oy + z * PX + PX * 0.22, PX * 0.96, PX * 0.92);
    }
  }
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!wallAt(world, flags, skirt, x, z)) continue;
      g.fillStyle = tint(pal.dark, (unit(x, z, 8) - 0.5) * 16);
      g.fillRect(ox + x * PX - 1, oy + z * PX - 1, PX + 2, PX + 2);
    }
  }
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!wallAt(world, flags, skirt, x, z)) continue;
      drawCap(g, ox + x * PX, oy + z * PX, PX, pal, x, z, world, flags, skirt);
    }
  }
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!wallAt(world, flags, skirt, x, z)) continue;
      drawSpill(g, ox + x * PX, oy + z * PX, PX, pal, x, z, world, flags, skirt);
    }
  }
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!floorAt(world, flags, skirt, x, z)) continue;
      if (world.grid[z][x] === "S" || world.grid[z][x] === "G") continue;
      if (unit(x, z, 90) < 0.84) continue;
      drawProp(g, ox + x * PX, oy + z * PX, PX, pal, world.id, x, z);
    }
  }
  if (world.id === "envoy") drawDisc(g, ox, oy, PX, pal, world, skirt);

  const made = { key, canvas, pad, px: PX };
  paints.set(world, made);
  return made;
}

function drawFloor(g, x, y, s, pal, id, cx, cz, world, flags, skirt) {
  g.fillStyle = unit(cx, cz, 2) > 0.5 ? pal.floor : pal.alt;
  g.fillRect(x, y, s + 0.5, s + 0.5);
  if (id === "thorne") {
    g.strokeStyle = "rgba(90,100,90,0.45)";
    g.strokeRect(x + 2, y + 2, s - 4, s - 4);
  } else if (id === "envoy") {
    g.strokeStyle = "rgba(160,150,190,0.18)";
    g.beginPath();
    g.moveTo(x + s * 0.5, y + 2);
    g.lineTo(x + s - 2, y + s * 0.5);
    g.lineTo(x + s * 0.5, y + s - 2);
    g.lineTo(x + 2, y + s * 0.5);
    g.closePath();
    g.stroke();
  } else if (id === "trail" || id === "pine") {
    const east = floorAt(world, flags, skirt, cx + 1, cz) || floorAt(world, flags, skirt, cx - 1, cz);
    g.strokeStyle = pal.rut;
    g.globalAlpha = 0.55;
    g.lineWidth = Math.max(2, s * 0.06);
    g.beginPath();
    if (east) {
      g.moveTo(x, y + s * 0.38);
      g.lineTo(x + s, y + s * 0.38);
      g.moveTo(x, y + s * 0.62);
      g.lineTo(x + s, y + s * 0.62);
    } else {
      g.moveTo(x + s * 0.38, y);
      g.lineTo(x + s * 0.38, y + s);
      g.moveTo(x + s * 0.62, y);
      g.lineTo(x + s * 0.62, y + s);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
  if (unit(cx, cz, 6) > 0.62) {
    g.fillStyle = pal.grass;
    g.globalAlpha = 0.8;
    const n = 1 + (unit(cx, cz, 7) > 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const tx = x + s * (0.15 + unit(cx, cz, 12 + i) * 0.7);
      const ty = y + s * (0.2 + unit(cx, cz, 18 + i) * 0.6);
      g.beginPath();
      g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + s * 0.04, ty - s * 0.12, tx + s * 0.02, ty - s * 0.2);
      g.quadraticCurveTo(tx, ty - s * 0.1, tx, ty);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

function drawCap(g, x, y, s, pal, cx, cz, world, flags, skirt) {
  const south = wallAt(world, flags, skirt, cx, cz + 1) ? 0 : s * 0.28;
  const east = wallAt(world, flags, skirt, cx + 1, cz) ? 0 : s * 0.14;
  const wob = (unit(cx, cz, 4) - 0.5) * s * 0.04;
  g.fillStyle = tint(pal.stone, (unit(cx, cz, 9) - 0.5) * 28);
  g.fillRect(x + wob, y, Math.max(2, s - east + 1), Math.max(2, s - south));
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.fillRect(x + s * 0.08, y + s * 0.06, s * 0.36, Math.max(1.5, s * 0.045));
  if (south) {
    g.fillStyle = tint(pal.dark, -12);
    g.fillRect(x, y + s - south, Math.max(2, s - east), south);
    g.fillStyle = pal.moss;
    g.globalAlpha = 0.9;
    g.beginPath();
    g.ellipse(x + s * 0.42, y + s - south, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  if (unit(cx, cz, 15) > 0.55) {
    g.strokeStyle = "rgba(40,28,18,0.4)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x + s * 0.2, y + s * 0.18);
    g.lineTo(x + s * (0.45 + unit(cx, cz, 16) * 0.3), y + s * 0.42);
    g.stroke();
  }
  const ch = world.grid[cz][cx];
  if (ch === "+" || ch === "=") {
    g.strokeStyle = pal.gold;
    g.lineWidth = Math.max(2, s * 0.06);
    g.strokeRect(x + s * 0.28, y + s * 0.16, s * 0.44, s * 0.36);
  }
}

function drawSpill(g, x, y, s, pal, cx, cz, world, flags, skirt) {
  const sides = [
    { dx: 0, dz: -1, ox: 0.4, oy: 0.08, ix: 0.08, iy: -0.55 },
    { dx: 1, dz: 0, ox: 0.9, oy: 0.45, ix: 0.55, iy: 0.06 },
    { dx: 0, dz: 1, ox: 0.55, oy: 0.78, ix: 0.02, iy: 0.62 },
    { dx: -1, dz: 0, ox: 0.1, oy: 0.5, ix: -0.58, iy: 0.08 },
  ];
  sides.forEach((side, i) => {
    const nx = cx + side.dx;
    const nz = cz + side.dz;
    if (!floorAt(world, flags, skirt, nx, nz)) return;
    if (unit(cx, cz, 40 + i) < 0.28) return;
    const x0 = x + s * side.ox;
    const y0 = y + s * side.oy;
    const x1 = x0 + s * side.ix;
    const y1 = y0 + s * side.iy;
    g.strokeStyle = i % 2 ? pal.ivy : pal.moss;
    g.lineWidth = Math.max(2.2, s * (0.07 + unit(cx, cz, 50 + i) * 0.04));
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x0 + s * side.ix * 0.4, y0 + s * 0.05, x1, y1);
    g.stroke();
    g.fillStyle = pal.moss;
    g.beginPath();
    g.ellipse(x1, y1, s * 0.11, s * 0.06, i, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x1 - s * side.ix * 0.28, y1 - s * side.iy * 0.28, s * 0.07, s * 0.04, i + 0.6, 0, Math.PI * 2);
    g.fill();
    if (unit(cx, cz, 70 + i) > 0.72) {
      g.fillStyle = pal.flower;
      g.beginPath();
      g.arc(x1 + s * 0.04, y1 - s * 0.02, s * 0.045, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function drawProp(g, x, y, s, pal, id, cx, cz) {
  const kind = propKind(id, cx, cz);
  const cxp = x + s * 0.5;
  const cyp = y + s * 0.55;
  g.save();
  g.translate(cxp, cyp);
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.beginPath();
  g.ellipse(2, 4, s * 0.16, s * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  if (kind === "wheel") {
    g.strokeStyle = "#4a3018";
    g.lineWidth = Math.max(2, s * 0.05);
    g.beginPath();
    g.arc(0, 0, s * 0.16, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(-s * 0.14, 0); g.lineTo(s * 0.14, 0);
    g.moveTo(0, -s * 0.14); g.lineTo(0, s * 0.14);
    g.stroke();
  } else if (kind === "crate") {
    g.fillStyle = "#8a5a32";
    g.fillRect(-s * 0.14, -s * 0.1, s * 0.28, s * 0.2);
    g.strokeStyle = "#3a2414";
    g.strokeRect(-s * 0.14, -s * 0.1, s * 0.28, s * 0.2);
  } else if (kind === "lantern") {
    g.fillStyle = "#c47a18";
    g.fillRect(-s * 0.05, -s * 0.12, s * 0.1, s * 0.16);
    g.fillStyle = "#ffd56a";
    g.fillRect(-s * 0.03, -s * 0.08, s * 0.06, s * 0.08);
  } else if (kind === "bones") {
    g.strokeStyle = "#e6dcc8";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-s * 0.12, s * 0.04);
    g.quadraticCurveTo(0, -s * 0.1, s * 0.12, 0);
    g.stroke();
  } else if (kind === "seed" || kind === "sprout") {
    g.fillStyle = pal.gold;
    g.beginPath();
    g.ellipse(0, 0, s * 0.06, s * 0.1, 0.4, 0, Math.PI * 2);
    g.fill();
    if (kind === "sprout") {
      g.strokeStyle = pal.grass;
      g.beginPath();
      g.moveTo(0, -s * 0.04);
      g.quadraticCurveTo(s * 0.08, -s * 0.16, s * 0.02, -s * 0.22);
      g.stroke();
    }
  } else if (kind === "journal") {
    g.fillStyle = "#f0e2c0";
    g.fillRect(-s * 0.1, -s * 0.12, s * 0.2, s * 0.24);
    g.strokeStyle = "#5c3b22";
    g.strokeRect(-s * 0.1, -s * 0.12, s * 0.2, s * 0.24);
  } else if (kind === "shard" || kind === "glass") {
    g.fillStyle = pal.gold;
    g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(0, -s * 0.14);
    g.lineTo(s * 0.08, s * 0.08);
    g.lineTo(-s * 0.06, s * 0.06);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  } else if (kind === "pipe") {
    g.strokeStyle = "#8a8a90";
    g.lineWidth = s * 0.08;
    g.beginPath();
    g.moveTo(-s * 0.16, s * 0.04);
    g.lineTo(s * 0.16, -s * 0.02);
    g.stroke();
  } else if (kind === "stump") {
    g.fillStyle = "#6a4a30";
    g.beginPath();
    g.ellipse(0, 0, s * 0.12, s * 0.08, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#3a2818";
    g.stroke();
  }
  g.restore();
}

function propKind(id, x, z) {
  const bag = {
    trail: ["wheel", "crate", "lantern"],
    pine: ["stump", "crate"],
    mountain: ["bones", "lantern"],
    rusty: ["crate", "pipe"],
    pulse: ["shard"],
    thorne: ["journal", "glass"],
    seeders: ["seed", "sprout"],
    envoy: ["shard", "glass"],
    meta: ["journal"],
  }[id] || ["crate"];
  return bag[Math.floor(unit(x, z, 91) * bag.length)] || bag[0];
}

function drawDisc(g, ox, oy, s, pal, world, skirt) {
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  let maxR = 0;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (skirt.has(x + "," + z)) continue;
      maxR = Math.max(maxR, Math.hypot(x - cx, z - cy));
    }
  }
  const px = ox + (cx + 0.5) * s;
  const py = oy + (cy + 0.5) * s;
  const rad = (maxR + 0.35) * s;
  g.lineCap = "round";
  g.strokeStyle = pal.dark;
  g.lineWidth = s * 1.05;
  g.beginPath();
  g.arc(px, py, rad, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = pal.stone;
  g.lineWidth = s * 0.62;
  g.beginPath();
  g.arc(px, py, rad - s * 0.12, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = pal.moss;
  g.globalAlpha = 0.75;
  g.lineWidth = s * 0.12;
  g.beginPath();
  g.arc(px, py, rad + s * 0.08, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
}

export function createOverhead(canvas) {
  let camX = 0;
  let camZ = 0;
  let scale = 28;
  let target = 28;
  let fit = false;
  let snapped = false;

  function cssSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function levels(world) {
    const { w, h } = cssSize();
    const cols = world.grid[0].length;
    const rows = world.grid.length;
    const phone = w < 760;
    const across = phone ? 6.4 : 12.5;
    const close = Math.min(w, h) / across / CELL;
    const fitScale = Math.min((w - 24) / (cols * CELL), (h - 24) / (rows * CELL));
    return { w, h, cols, rows, close, fitScale };
  }

  function resize() {
    const { w, h } = cssSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return { w, h, dpr };
  }

  function project(wx, wz, w, h) {
    return { x: (wx - camX) * scale + w / 2, y: (wz - camZ) * scale + h / 2 };
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - rect.width / 2) / scale + camX,
      z: (clientY - rect.top - rect.height / 2) / scale + camZ,
    };
  }

  function worldToScreen(wx, wz) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (wx - camX) * scale + rect.width / 2,
      y: rect.top + (wz - camZ) * scale + rect.height / 2,
    };
  }

  function follow(world, state, dt) {
    const m = levels(world);
    const want = fit ? m.fitScale : (target || m.close);
    if (!snapped) {
      scale = want;
      camX = state.px;
      camZ = state.pz;
      snapped = true;
    } else {
      scale += (want - scale) * (1 - Math.exp(-6 * dt));
      const gx = fit ? (m.cols * CELL) / 2 : state.px;
      const gz = fit ? (m.rows * CELL) / 2 : state.pz;
      const c = 1 - Math.exp(-4.2 * dt);
      camX += (gx - camX) * c;
      camZ += (gz - camZ) * c;
    }
    canvas.dataset.zoom = fit ? "maze" : "near";
    canvas.dataset.scale = scale.toFixed(2);
    canvas.dataset.cam = camX.toFixed(2) + "," + camZ.toFixed(2);
  }

  function reset(px, pz, world) {
    snapped = false;
    camX = px;
    camZ = pz;
    fit = false;
    if (world) target = levels(world).close;
  }

  function setScale(value, world) {
    const m = levels(world);
    fit = false;
    target = Math.min(m.close * 1.65, Math.max(m.fitScale, value));
  }

  function setFit(on, world) {
    fit = !!on;
    if (!fit && world) target = levels(world).close;
    return fit;
  }

  function nudge(factor, world) {
    const m = levels(world);
    const base = fit ? scale : (target || scale || m.close);
    fit = false;
    target = Math.min(m.close * 1.65, Math.max(m.fitScale, base * factor));
  }

  function draw(world, state, extras) {
    const { w, h, dpr } = resize();
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = PAL[world.id] || PAL.trail;
    const painted = paintWorld(world, state.flags || {});
    const skirt = skirtOf(world);
    const cols = world.grid[0].length;
    const rows = world.grid.length;
    const cell = scale * CELL;
    const seen = state.seen || {};
    const clock = extras.clock || 0;
    const reduce = !!extras.reduce;

    g.fillStyle = pal.terrain;
    g.fillRect(0, 0, w, h);
    const origin = project(-painted.pad * CELL, -painted.pad * CELL, w, h);
    const drawW = painted.canvas.width * (cell / painted.px);
    const drawH = painted.canvas.height * (cell / painted.px);
    g.drawImage(painted.canvas, origin.x, origin.y, drawW, drawH);

    const gridOrigin = project(0, 0, w, h);
    function cellRect(x, z) {
      return { x: gridOrigin.x + x * cell, y: gridOrigin.y + z * cell, s: cell };
    }

    for (const arrow of world.oneway || []) {
      if (!seen[arrow.x + "," + arrow.z]) continue;
      const r = cellRect(arrow.x, arrow.z);
      drawOneWay(g, r.x + r.s / 2, r.y + r.s / 2, r.s, arrow.dx, arrow.dz);
    }
    const gate = findChar(world, "G");
    if (gate && seen[gate.x + "," + gate.z]) {
      const r = cellRect(gate.x, gate.z);
      drawArch(g, r.x + r.s / 2, r.y + r.s / 2, r.s, "#1a120c");
    }
    for (const t of world.tokens || []) {
      if (!seen[t.x + "," + t.z]) continue;
      const r = cellRect(t.x, t.z);
      const hot = extras.way && extras.way.target && extras.way.target.id === t.id;
      const show = letterVisible(t, state);
      drawMark(g, r.x + r.s / 2, r.y + r.s / 2, r.s, t, show, hot, !!(t.letter && state.found[t.id]));
    }
    for (const s of world.signs || []) {
      if (!seen[s.x + "," + s.z]) continue;
      const r = cellRect(s.x, s.z);
      drawScroll(g, r.x + r.s / 2, r.y + r.s / 2, r.s);
    }

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const key = x + "," + z;
        if (skirt.has(key) || seen[key]) continue;
        const r = cellRect(x, z);
        if (r.x > w || r.y > h || r.x + r.s < 0 || r.y + r.s < 0) continue;
        drawMist(g, r.x, r.y, r.s, pal);
      }
    }

    const way = extras.way;
    const here = extras.here;
    if (extras.guide && way && way.path) {
      way.path.slice(1, 4).forEach((step, i) => {
        const spot = center(step[0], step[1]);
        const p = project(spot.x, spot.z, w, h);
        const known = !!seen[step[0] + "," + step[1]];
        const bob = reduce ? 0 : Math.sin(clock * 3 + i) * cell * 0.04;
        drawCrumb(g, p.x, p.y + bob, cell, i, known ? 1 : 0.55);
      });
    }

    for (const person of extras.people || []) {
      if (!seen[person.x + "," + person.z]) continue;
      const p = project(person.ax, person.az, w, h);
      drawPerson(g, person, p.x, p.y, cell, clock, reduce, extras.speaking);
    }

    const player = project(state.px, state.pz, w, h);
    if (extras.guide && way && way.path && way.path.length > 1 && here) {
      const nxt = way.path[1];
      const ang = Math.atan2(nxt[1] - here.z, nxt[0] - here.x);
      drawGoalArrow(g, player.x, player.y, ang, cell, clock, reduce);
    }
    drawWalker(g, player.x, player.y, state.yaw, !!extras.moving, clock, !!state.light, cell, reduce);

    const glow = g.createRadialGradient(player.x, player.y, cell * 0.2, player.x, player.y, cell * (state.light ? 3.6 : 2.2));
    glow.addColorStop(0, "rgba(" + pal.glow + "," + (state.light ? "0.34" : "0.16") + ")");
    glow.addColorStop(1, "rgba(" + pal.glow + ",0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(player.x, player.y, cell * (state.light ? 3.6 : 2.2), 0, Math.PI * 2);
    g.fill();

    if (world.id === "envoy") drawDiscScreen(g, world, skirt, project, cell, pal, w, h);

    const wash = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    wash.addColorStop(0, "rgba(255, 220, 170, 0.05)");
    wash.addColorStop(1, "rgba(20, 10, 6, 0.28)");
    g.fillStyle = wash;
    g.fillRect(0, 0, w, h);

    drawCompass(g, h, w < 760);
  }

  return {
    resize, follow, draw, reset, screenToWorld, worldToScreen, setFit, setScale, nudge,
    get fit() { return fit; },
    get scale() { return scale; },
  };
}

function findChar(world, ch) {
  for (let z = 0; z < world.grid.length; z++) {
    for (let x = 0; x < world.grid[z].length; x++) {
      if (world.grid[z][x] === ch) return { x, z };
    }
  }
  return null;
}

function letterVisible(t, state) {
  if (!t.letter) return false;
  if (t.kind === "lantern" && !state.found[t.id]) return !!state.light;
  return true;
}

function drawMist(g, x, y, s, pal) {
  g.fillStyle = pal.mist;
  g.fillRect(x - 1, y - 1, s + 2, s + 2);
}

function drawOneWay(g, x, y, s, dx, dz) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.atan2(dz, dx));
  g.fillStyle = "rgba(42,110,170,0.92)";
  g.beginPath();
  g.moveTo(s * 0.24, 0);
  g.lineTo(-s * 0.12, s * 0.14);
  g.lineTo(-s * 0.12, -s * 0.14);
  g.closePath();
  g.fill();
  g.restore();
}

function drawArch(g, x, y, s, color) {
  const w = s * 0.22;
  const h = s * 0.28;
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.5, s * 0.06);
  g.beginPath();
  g.moveTo(x - w, y + h * 0.55);
  g.lineTo(x - w, y - h * 0.05);
  g.quadraticCurveTo(x, y - h, x + w, y - h * 0.05);
  g.lineTo(x + w, y + h * 0.55);
  g.stroke();
}

function drawMark(g, x, y, s, token, showLetter, hot, found) {
  const r = s * (hot ? 0.3 : 0.24);
  g.fillStyle = found ? "#8a7048" : "#e0b04a";
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r * 0.85, y);
  g.lineTo(x, y + r);
  g.lineTo(x - r * 0.85, y);
  g.closePath();
  g.fill();
  if (showLetter && token.letter) {
    g.fillStyle = "#1a120c";
    g.font = "700 " + Math.max(11, s * 0.36) + "px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(token.letter, x, y + 0.5);
  }
}

function drawScroll(g, x, y, s) {
  g.fillStyle = "#f0e2c0";
  g.fillRect(x - s * 0.14, y - s * 0.1, s * 0.28, s * 0.2);
  g.strokeStyle = "#5c3b22";
  g.strokeRect(x - s * 0.14, y - s * 0.1, s * 0.28, s * 0.2);
}

function drawCrumb(g, x, y, s, i, alpha) {
  const rad = s * (0.1 - i * 0.012);
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = "rgba(255, 210, 90, 0.45)";
  g.beginPath();
  g.arc(x, y, rad * 2.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffd56a";
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawGoalArrow(g, x, y, ang, s, clock, reduce) {
  const pulse = reduce ? 0 : Math.sin(clock * 2.4) * s * 0.04;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.translate(s * 0.72 + pulse, 0);
  g.globalAlpha = 0.9;
  g.fillStyle = "#f0c14a";
  g.beginPath();
  g.moveTo(s * 0.3, 0);
  g.lineTo(-s * 0.08, s * 0.16);
  g.lineTo(-s * 0.02, 0);
  g.lineTo(-s * 0.08, -s * 0.16);
  g.closePath();
  g.fill();
  g.restore();
}

function drawPerson(g, person, x, y, cell, clock, reduce, speaking) {
  const img = person.img && person.img.ready;
  const aspect = person.aspect || 0.42;
  const scale = person.scale || 1;
  const talking = speaking && speaking.id === person.id;
  const h = cell * 3.15 * scale * (talking ? 1.04 : 1);
  const w = h * aspect;
  const bob = reduce ? 0 : Math.sin(clock * 2.1 + (person.bob || 0)) * cell * 0.07;
  const sway = reduce ? 0 : Math.sin(clock * (person.pacing ? 5.2 : 1.3) + (person.bob || 0)) * (person.pacing ? 0.07 : 0.02);
  g.save();
  g.translate(x, y + bob);
  g.rotate(sway);
  g.fillStyle = "rgba(0,0,0,0.32)";
  g.beginPath();
  g.ellipse(0, h * 0.46, Math.max(cell * 0.34, w * 0.62), cell * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  if (img) g.drawImage(img, -w / 2, -h * 0.52, w, h);
  else drawFrame(g, person, w, h);
  g.restore();
}

function drawFrame(g, person, w, h) {
  g.fillStyle = "#1a120c";
  g.fillRect(-w / 2 - 3, -h * 0.52 - 3, w + 6, h + 6);
  const art = person.art && person.art.ready;
  if (art && person.crop) {
    const iw = art.naturalWidth || art.width;
    const ih = art.naturalHeight || art.height;
    const c = person.crop;
    g.save();
    g.beginPath();
    g.rect(-w / 2, -h * 0.52, w, h);
    g.clip();
    g.drawImage(art, c[0] * iw, c[1] * ih, c[2] * iw, c[3] * ih, -w / 2, -h * 0.52, w, h);
    g.restore();
  }
}

function drawWalker(g, x, y, yaw, moving, clock, light, cell, reduce) {
  const bob = reduce ? 0 : (moving ? Math.sin(clock * 11) * cell * 0.06 : Math.sin(clock * 2) * cell * 0.02);
  g.save();
  g.translate(x, y + bob);
  g.fillStyle = "rgba(255, 210, 120, 0.55)";
  g.beginPath();
  g.arc(0, 0, cell * 0.34, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = light ? "#ffd56a" : "#f4e6c4";
  g.lineWidth = Math.max(2, cell * 0.045);
  g.beginPath();
  g.arc(0, 0, cell * 0.42, 0, Math.PI * 2);
  g.stroke();
  g.rotate(yaw);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(0, cell * 0.08, cell * 0.22, cell * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f7efe0";
  g.beginPath();
  g.moveTo(0, -cell * 0.62);
  g.lineTo(cell * 0.2, cell * 0.22);
  g.lineTo(0, cell * 0.08);
  g.lineTo(-cell * 0.2, cell * 0.22);
  g.closePath();
  g.fill();
  g.fillStyle = "#6b3a28";
  g.beginPath();
  g.arc(0, -cell * 0.08, cell * 0.12, 0, Math.PI * 2);
  g.fill();
  if (light) {
    g.fillStyle = "#ffd56a";
    g.beginPath();
    g.arc(cell * 0.16, cell * 0.02, cell * 0.05, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawDiscScreen(g, world, skirt, project, cell, pal, w, h) {
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  let maxR = 0;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (skirt.has(x + "," + z)) continue;
      maxR = Math.max(maxR, Math.hypot(x - cx, z - cy));
    }
  }
  const p = project((cx + 0.5) * CELL, (cy + 0.5) * CELL, w, h);
  const rad = (maxR + 0.35) * cell;
  g.lineCap = "round";
  g.strokeStyle = pal.dark;
  g.lineWidth = Math.max(3, cell * 0.72);
  g.beginPath();
  g.arc(p.x, p.y, rad, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = pal.stone;
  g.lineWidth = Math.max(2, cell * 0.4);
  g.beginPath();
  g.arc(p.x, p.y, rad - cell * 0.1, 0, Math.PI * 2);
  g.stroke();
}

function drawCompass(g, h, phone) {
  const x = 28;
  const y = phone ? h - 72 : h - 46;
  g.save();
  g.translate(x, y);
  g.fillStyle = "rgba(16,14,12,0.78)";
  g.beginPath();
  g.arc(0, 0, 14, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#d4af37";
  g.stroke();
  g.fillStyle = "#c47a18";
  g.beginPath();
  g.moveTo(0, -8);
  g.lineTo(3, 2);
  g.lineTo(-3, 2);
  g.closePath();
  g.fill();
  g.fillStyle = "#fbf6ee";
  g.font = "700 8px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("N", 0, 6);
  g.restore();
}
