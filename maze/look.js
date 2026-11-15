/* Painted rooms. Photo textures from the book-worlds set where we have them,
   high-contrast canvas textures everywhere else, and props in the opening view.
   Puzzle data is not read except for where to hang a carving. */
import * as THREE from "three";
import { CELL, findChar } from "./logic.js";
import { peopleFor, posterSpots } from "./cast.js";

export const CEIL = 4.35;
const TEX = "../book-worlds/assets/tex/";

const LOOK = {
  trail: { wall: "boards", floor: "photo:dirt", ceil: "canvas", sky: ["#2a2060", "#e88848", "#f6d7a4"], outdoor: true, sun: 0xffc48a, fill: 0x8878c8, amb: 0.62, backdrop: "../book-worlds/assets/stations/trail.jpg" },
  pine: { wall: "photo:bark", floor: "planks", ceil: "planks", sky: ["#7eb6dc", "#e7f2fb", "#fff6e4"], outdoor: true, sun: 0xfff2d0, fill: 0x8eb8e0, amb: 0.7, backdrop: "../images/hero/hero-1.jpg" },
  mountain: { wall: "photo:rock", floor: "snow", ceil: "snow", sky: ["#050814", "#1a3348", "#8aa0b0"], outdoor: true, stars: true, sun: 0xc5d8ee, fill: 0x3a5080, amb: 0.48, backdrop: "../book-worlds/assets/stations/oldman.jpg" },
  rusty: { wall: "hull", floor: "hull", ceil: "hull", sky: ["#2a1a22", "#e0a060"], outdoor: false, sun: 0xffb060, fill: 0x6a5048, amb: 0.7, backdrop: "../book-worlds/assets/stations/stack.jpg" },
  pulse: { wall: "membrane", floor: "membrane", ceil: "membrane", sky: ["#07041a", "#3a2068"], outdoor: false, sun: 0xd8c0ff, fill: 0x8060c0, amb: 0.55, emissive: 0x6a48a0, ei: 0.45, backdrop: "../book-worlds/assets/stations/pulse.jpg" },
  thorne: { wall: "plaster", floor: "labtile", ceil: "drop", sky: ["#071018", "#163028"], outdoor: false, sun: 0xfff0c8, fill: 0x68d0a8, amb: 0.72, backdrop: "../images/lab/born-twice-banner.jpg" },
  seeders: { wall: "crystal", floor: "crystal", ceil: "crystal", sky: ["#021610", "#0c4030"], outdoor: false, sun: 0xc8ffe8, fill: 0x40c090, amb: 0.6, emissive: 0x1a8060, ei: 0.4, backdrop: "../seeders/seeders-cover.jpg" },
  envoy: { wall: "blackglass", floor: "blackglass", ceil: "blackglass", sky: ["#050510", "#201828"], outdoor: false, sun: 0xd0d4ff, fill: 0x804060, amb: 0.5, metal: 0.82, rough: 0.18, emissive: 0x301028, ei: 0.22, backdrop: "../images/the-ninth-envoy.jpg" },
  meta: { wall: "parlor", floor: "photo:leather", ceil: "parlor", sky: ["#1a120c", "#4a3018"], outdoor: false, sun: 0xffd9a0, fill: 0x806040, amb: 0.66, backdrop: "../book-worlds/assets/play-cover.webp" },
};

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(draw, seed, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function roughFrom(colorTex) {
  const img = colorTex.image;
  const s = img.width || 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, s, s);
  const data = g.getImageData(0, 0, s, s);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const rough = 255 - l * 0.35;
    d[i] = d[i + 1] = d[i + 2] = rough;
  }
  g.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const DRAW = {
  boards(g, s, r) {
    const colors = ["#a8643c", "#c48a52", "#7a4a30", "#d7b07a", "#8d3a2a", "#b08058"];
    g.fillStyle = "#3a2418";
    g.fillRect(0, 0, s, s);
    const h = 36;
    for (let y = 0; y < s; y += h) {
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.fillRect(1, y + 1, s - 2, h - 5);
      g.strokeStyle = "rgba(60,30,12,0.45)";
      g.beginPath();
      const yy = y + 8 + r() * (h - 16);
      g.moveTo(0, yy);
      g.bezierCurveTo(s * 0.3, yy + 4, s * 0.7, yy - 3, s, yy);
      g.stroke();
      g.fillStyle = "#2a160c";
      g.beginPath();
      g.arc(16 + r() * (s - 32), y + h * 0.5, 2.2, 0, 7);
      g.fill();
      if (r() > 0.55) {
        g.fillStyle = "rgba(90,40,20,0.35)";
        g.fillRect(r() * s, y + 4, 18 + r() * 30, 6);
      }
    }
  },
  canvas(g, s, r) {
    g.fillStyle = "#e4d2a8";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(120,90,50,0.45)";
    for (let i = 0; i < s; i += 5) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 1, s);
      g.stroke();
    }
    g.fillStyle = "rgba(140,70,30,0.28)";
    for (let i = 0; i < 10; i++) g.fillRect(r() * s, r() * s, 40, 14);
  },
  planks(g, s, r) {
    const colors = ["#c49a6a", "#a87848", "#e0c090", "#8a5a38", "#d7b48a"];
    g.fillStyle = "#3a2818";
    g.fillRect(0, 0, s, s);
    const w = 48;
    for (let x = 0; x < s; x += w) {
      g.fillStyle = colors[Math.floor(r() * colors.length)];
      g.fillRect(x + 2, 0, w - 6, s);
      g.fillStyle = "rgba(255,220,160,0.18)";
      g.fillRect(x + 4, 0, 6, s);
    }
  },
  snow(g, s, r) {
    g.fillStyle = "#f4f7fb";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${40 + r() * 40},${70 + r() * 40},${110 + r() * 30},${0.12 + r() * 0.28})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 16 + r() * 40, 8 + r() * 16, r(), 0, 7);
      g.fill();
    }
    g.fillStyle = "rgba(80,60,50,0.45)";
    for (let i = 0; i < 30; i++) g.fillRect(r() * s, r() * s, 4, 3);
  },
  hull(g, s, r) {
    g.fillStyle = "#8d5a40";
    g.fillRect(0, 0, s, s);
    const cell = 86;
    for (let y = 0; y < s; y += cell) {
      for (let x = 0; x < s; x += cell) {
        const n = 120 + r() * 70;
        g.fillStyle = `rgb(${n + 30},${n * 0.48},${n * 0.28})`;
        g.fillRect(x + 3, y + 3, cell - 8, cell - 8);
        if (r() > 0.72) {
          g.fillStyle = ["#6a2030", "#2a4060", "#3a5a38", "#c4a060"][Math.floor(r() * 4)];
          g.fillRect(x + 14, y + 14, cell - 30, cell - 30);
          g.strokeStyle = "#1a100c";
          g.strokeRect(x + 14, y + 14, cell - 30, cell - 30);
        }
      }
    }
    g.strokeStyle = "#1a100c";
    g.lineWidth = 4;
    for (let i = 0; i <= s; i += cell) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, s);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(s, i);
      g.stroke();
    }
    g.fillStyle = "#2a2018";
    for (let y = 12; y < s; y += cell) {
      for (let x = 12; x < s; x += cell) {
        g.beginPath();
        g.arc(x, y, 5, 0, 7);
        g.fill();
        g.fillStyle = "#f0d8a8";
        g.beginPath();
        g.arc(x - 1.2, y - 1.2, 2, 0, 7);
        g.fill();
        g.fillStyle = "#2a2018";
      }
    }
    g.lineWidth = 1;
  },
  membrane(g, s, r) {
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, "#1a1038");
    grd.addColorStop(1, "#3a1860");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = i % 2 ? "#f0d080" : "#d8b0ff";
      g.lineWidth = 7;
      g.shadowColor = g.strokeStyle;
      g.shadowBlur = 12;
      g.beginPath();
      g.moveTo(0, r() * s);
      for (let x = 0; x <= s; x += 12) g.lineTo(x, s * (0.15 + i * 0.1) + Math.sin(x * 0.04 + i) * 28);
      g.stroke();
    }
    g.shadowBlur = 0;
    g.lineWidth = 1;
  },
  plaster(g, s, r) {
    g.fillStyle = "#2f6b58";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
    g.fillStyle = "#e6c56a";
    g.fillRect(0, s * 0.62, s, 10);
    g.fillStyle = "#1a4034";
    g.fillRect(0, s * 0.66, s, 4);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 8; i++) g.fillRect(r() * s, r() * s, 30, 8);
  },
  labtile(g, s) {
    const n = 64;
    for (let y = 0; y < s; y += n) {
      for (let x = 0; x < s; x += n) {
        const k = 168 + ((x / n + y / n) % 2) * 18;
        g.fillStyle = `rgb(${k},${k - 4},${k - 12})`;
        g.fillRect(x, y, n - 4, n - 4);
        g.fillStyle = "#2e2c28";
        g.fillRect(x + n - 4, y, 4, n);
        g.fillRect(x, y + n - 4, n, 4);
      }
    }
  },
  drop(g, s) {
    g.fillStyle = "#d9d4c8";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#8a8478";
    g.lineWidth = 3;
    for (let i = 0; i < s; i += 64) {
      g.strokeRect(i + 2, 2, 60, s - 4);
    }
  },
  crystal(g, s, r) {
    g.fillStyle = "#0e4034";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 36; i++) {
      const x = r() * s;
      const y = r() * s;
      g.fillStyle = `rgba(${60 + r() * 80},${210 + r() * 45},${150 + r() * 70},0.95)`;
      g.beginPath();
      g.moveTo(x, y - 28);
      g.lineTo(x + 22, y + 16);
      g.lineTo(x - 18, y + 12);
      g.fill();
      g.strokeStyle = "#e8fff4";
      g.stroke();
    }
  },
  blackglass(g, s, r) {
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, "#161622");
    grd.addColorStop(0.5, "#2a2030");
    grd.addColorStop(1, "#101018");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(230,230,255,0.85)";
    g.lineWidth = 4;
    for (let i = -s; i < s * 2; i += 36) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + s * 0.55, s);
      g.stroke();
    }
    g.fillStyle = "rgba(160,60,120,0.55)";
    g.fillRect(0, 0, s, 18);
    g.fillRect(0, s - 18, s, 18);
    g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.2})`;
    g.fillRect(40 + r() * 80, 0, 6, s);
    g.lineWidth = 1;
  },
  parlor(g, s) {
    g.fillStyle = "#5a3a24";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#e6c56a";
    g.lineWidth = 8;
    g.strokeRect(16, 16, s - 32, s - 32);
    g.fillStyle = "#3a2416";
    g.fillRect(36, 36, s - 72, s - 72);
  },
};

function painted(name, seed) {
  const map = canvasTex(DRAW[name], seed, 512);
  const roughnessMap = roughFrom(map);
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap,
    roughness: 0.85,
    metalness: name === "blackglass" ? 0.72 : name === "hull" ? 0.25 : 0.04,
  });
}

function photoMat(kind, coarse) {
  const folder = coarse ? "512" : "1k";
  const loader = new THREE.TextureLoader();
  const map = loader.load(`${TEX}${folder}/${kind}_col.jpg`);
  const normalMap = loader.load(`${TEX}${folder}/${kind}_nrm.jpg`);
  const roughnessMap = loader.load(`${TEX}${folder}/${kind}_rgh.jpg`);
  [map, normalMap, roughnessMap].forEach((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  });
  map.colorSpace = THREE.SRGBColorSpace;
  normalMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    roughness: 1,
    metalness: kind === "leather" ? 0.08 : 0.02,
  });
}

function materialFor(spec, seed, coarse) {
  if (spec.startsWith("photo:")) return photoMat(spec.slice(6), coarse);
  const mat = painted(spec, seed);
  if (spec === "blackglass") {
    mat.metalness = 0.82;
    mat.roughness = 0.2;
    mat.emissive = new THREE.Color(0x401830);
    mat.emissiveIntensity = 0.25;
  }
  if (spec === "membrane" || spec === "crystal") {
    mat.emissive = new THREE.Color(spec === "membrane" ? 0x7040a0 : 0x1a8060);
    mat.emissiveIntensity = spec === "membrane" ? 0.55 : 0.4;
  }
  return mat;
}

function Bucket() {
  this.p = [];
  this.n = [];
  this.uv = [];
}
Bucket.prototype.quad = function (corners, normal, uvs) {
  const order = [0, 1, 2, 0, 2, 3];
  for (let k = 0; k < 6; k++) {
    const i = order[k];
    this.p.push(corners[i][0], corners[i][1], corners[i][2]);
    this.n.push(normal[0], normal[1], normal[2]);
    this.uv.push(uvs[i][0], uvs[i][1]);
  }
};
Bucket.prototype.geometry = function () {
  const g = new THREE.BufferGeometry();
  if (!this.p.length) {
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    return g;
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
  return g;
};

const FACE_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

function shellOf(world, style) {
  const grid = world.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const indoor = !style.outdoor;
  const wall = new Bucket();
  const floor = new Bucket();
  const ceil = new Bucket();
  const solid = (x, z) => x < 0 || z < 0 || x >= cols || z >= rows || grid[z][x] === "#";
  const open = (x, z) => x >= 0 && z >= 0 && x < cols && z < rows && grid[z][x] !== "#";
  const heightAt = (x, z) => (indoor ? CEIL : 3.7 + ((Math.abs(x * 3 + z * 5) % 5) * 0.16));
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (grid[z][x] !== "#") continue;
      const x0 = x * CELL;
      const x1 = x0 + CELL;
      const z0 = z * CELL;
      const z1 = z0 + CELL;
      const y1 = heightAt(x, z);
      if (!solid(x, z + 1)) wall.quad([[x0, 0, z1], [x1, 0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], FACE_UV);
      if (!solid(x, z - 1)) wall.quad([[x1, 0, z0], [x0, 0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], FACE_UV);
      if (!solid(x + 1, z)) wall.quad([[x1, 0, z1], [x1, 0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], FACE_UV);
      if (!solid(x - 1, z)) wall.quad([[x0, 0, z0], [x0, 0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], FACE_UV);
      wall.quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], FACE_UV);
    }
  }
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!open(x, z)) continue;
      const x0 = x * CELL;
      const x1 = x0 + CELL;
      const z0 = z * CELL;
      const z1 = z0 + CELL;
      floor.quad([[x0, 0.01, z1], [x1, 0.01, z1], [x1, 0.01, z0], [x0, 0.01, z0]], [0, 1, 0], FACE_UV);
      if (indoor) ceil.quad([[x0, CEIL, z0], [x1, CEIL, z0], [x1, CEIL, z1], [x0, CEIL, z1]], [0, -1, 0], FACE_UV);
      const n = open(x, z - 1);
      const s = open(x, z + 1);
      const e = open(x + 1, z);
      const w = open(x - 1, z);
      const corridor = (n && s && !e && !w) || (e && w && !n && !s);
      const ch = grid[z][x];
      if (corridor && (x + z) % 2 === 0 && ch !== "S" && ch !== "G" && ch !== "F") {
        const y0 = 2.85;
        const y1 = 3.15;
        if (n && s) {
          wall.quad([[x0 + 0.05, y0, z0], [x1 - 0.05, y0, z0], [x1 - 0.05, y0, z1], [x0 + 0.05, y0, z1]], [0, -1, 0], FACE_UV);
          wall.quad([[x0 + 0.05, y1, z1], [x1 - 0.05, y1, z1], [x1 - 0.05, y1, z0], [x0 + 0.05, y1, z0]], [0, 1, 0], FACE_UV);
        }
      }
    }
  }
  return { wall: wall.geometry(), floor: floor.geometry(), ceil: ceil.geometry() };
}

function doorMesh(world, mat) {
  const doors = [];
  const grid = world.grid;
  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[0].length; x++) {
      const ch = grid[z][x];
      if (ch !== "+" && ch !== "=") continue;
      const b = new Bucket();
      const x0 = x * CELL + 0.06;
      const x1 = (x + 1) * CELL - 0.06;
      const z0 = z * CELL + 0.06;
      const z1 = (z + 1) * CELL - 0.06;
      const y1 = CEIL - 0.04;
      const q = (corners, n) => b.quad(corners, n, FACE_UV);
      q([[x0, 0, z1], [x1, 0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
      q([[x1, 0, z0], [x0, 0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
      q([[x1, 0, z1], [x1, 0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
      q([[x0, 0, z0], [x0, 0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
      const mesh = new THREE.Mesh(b.geometry(), mat);
      doors.push({ x, z, mesh, open: false });
    }
  }
  return doors;
}

function carveTexture(kind, text, on) {
  const src = document.createElement("canvas");
  src.width = src.height = 256;
  const painter = kind.startsWith("photo:") ? DRAW.boards : DRAW[kind] || DRAW.boards;
  painter(src.getContext("2d"), 256, rng(kind.length * 13 + 4));
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0, 512, 256);
  const light = kind === "membrane" || kind === "blackglass" || kind === "crystal" || kind === "hull" || kind === "photo:rock";
  g.fillStyle = light ? "rgba(0,0,0,0.5)" : "rgba(255,244,214,0.38)";
  g.fillRect(16, 20, 480, 216);
  g.lineWidth = 8;
  g.strokeStyle = light ? "rgba(255,220,160,0.7)" : "rgba(40,22,8,0.75)";
  g.strokeRect(24, 28, 464, 200);
  const lines = String(text || "").split("\n").slice(0, 2);
  const size = lines.some((line) => line.length > 10) ? 46 : 96;
  g.font = "700 " + size + "px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  lines.forEach((line, i) => {
    const y = 128 + (i - (lines.length - 1) / 2) * (size + 4);
    const shown = on ? line.slice(0, 22) : "";
    g.lineWidth = 12;
    g.strokeStyle = light ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.55)";
    g.strokeText(shown, 256, y);
    g.fillStyle = light ? "#ffe7b0" : "#1a1008";
    g.fillText(shown, 256, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function mountPlaque(world, entry) {
  const grid = world.grid;
  const cols = grid[0].length;
  const rows = grid.length;
  const solid = (x, z) => x < 0 || z < 0 || x >= cols || z >= rows || grid[z][x] === "#";
  const dirs = [[0, -1, 0], [0, 1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]];
  for (let i = 0; i < dirs.length; i++) {
    if (!solid(entry.x + dirs[i][0], entry.z + dirs[i][1])) continue;
    return {
      x: (entry.x + 0.5) * CELL + dirs[i][0] * (CELL * 0.5 - 0.04),
      z: (entry.z + 0.5) * CELL + dirs[i][1] * (CELL * 0.5 - 0.04),
      rot: dirs[i][2],
    };
  }
  return { x: (entry.x + 0.5) * CELL, z: (entry.z + 0.5) * CELL - 0.4, rot: 0 };
}

function woodMat() {
  return photoMat("leather", true);
}
function metalMat(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.72,
    emissive: emissive || 0x000000,
    emissiveIntensity: emissive ? 0.4 : 0,
  });
}

function wagonWheel() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a3e24, roughness: 0.7, metalness: 0.05 });
  const iron = metalMat(0x8a9098);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 8, 24), iron);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.03, 6, 24), wood);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), iron);
  hub.rotation.x = Math.PI / 2;
  g.add(rim, tire, hub);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.15, 0.04), wood);
    spoke.rotation.z = (i * Math.PI) / 8;
    g.add(spoke);
  }
  g.position.y = 0.7;
  return g;
}

function barrel() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 });
  const iron = metalMat(0x667078);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.72, 12), wood);
  body.position.y = 0.36;
  g.add(body);
  [0.18, 0.5].forEach((y) => {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 6, 16), iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    g.add(hoop);
  });
  return g;
}

function crate() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xa87444, roughness: 0.75 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.5), wood);
  box.position.y = 0.24;
  g.add(box);
  [[-0.22, 0], [0.22, 0], [0, -0.16], [0, 0.16]].forEach(([x, z]) => {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.8 }));
    slat.position.set(x, 0.25, z);
    g.add(slat);
  });
  return g;
}

function lanternPost() {
  const g = new THREE.Group();
  const iron = metalMat(0x3a3430);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.7, 8), iron);
  post.position.y = 0.85;
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), new THREE.MeshStandardMaterial({
    color: 0xffe2a0, emissive: 0xffa040, emissiveIntensity: 0.9, roughness: 0.3,
  }));
  lamp.position.y = 1.75;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 4), iron);
  cap.position.y = 1.96;
  const light = new THREE.PointLight(0xffb060, 1.6, 7, 2);
  light.position.y = 1.75;
  g.add(post, lamp, cap, light);
  return g;
}

function pineTree(snow) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.9 }));
  trunk.position.y = 0.35;
  const leaf = new THREE.MeshStandardMaterial({ color: snow ? 0x2d5a40 : 0x1e6b3a, roughness: 0.85 });
  [0.9, 1.35, 1.75].forEach((y, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55 - i * 0.12, 0.7, 8), leaf);
    cone.position.y = y;
    g.add(cone);
  });
  if (snow) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 6), new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.6 }));
    cap.position.y = 2.15;
    g.add(cap);
  }
  g.add(trunk);
  return g;
}

function checkersTable() {
  const g = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#8a1e18" : "#f3ddb0";
      ctx.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  ctx.fillStyle = "#f0d060";
  ctx.beginPath();
  ctx.arc(48, 48, 10, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(208, 208, 10, 0, 7);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 1.15), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }));
  top.position.y = 0.72;
  g.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.8 });
  [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08), legMat);
    leg.position.set(x, 0.36, z);
    g.add(leg);
  });
  return g;
}

function storeSign(label) {
  const g = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4e2b8";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = "#6a3a18";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = "#6a2418";
  ctx.font = "700 64px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 256, 82);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  board.position.y = 2.15;
  const postMat = new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.8 });
  [-0.62, 0.62].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), postMat);
    post.position.set(x, 1.1, 0);
    g.add(post);
  });
  g.add(board);
  return g;
}

function porchRail() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xd7b48a, roughness: 0.55 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), mat);
  rail.position.y = 0.9;
  g.add(rail);
  [-0.8, -0.3, 0.3, 0.8].forEach((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), mat);
    p.position.set(x, 0.45, 0);
    g.add(p);
  });
  return g;
}

function campfire() {
  const g = new THREE.Group();
  g.name = "fire";
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 6), wood);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * 0.7;
    log.position.y = 0.1;
    g.add(log);
  }
  const colors = [0xff4a1a, 0xffb020, 0xfff0a0];
  colors.forEach((color, i) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.55 - i * 0.08, 7), new THREE.MeshBasicMaterial({ color }));
    flame.position.y = 0.4 + i * 0.08;
    flame.userData.base = flame.position.y;
    g.add(flame);
  });
  const embers = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(36), 3)),
    new THREE.PointsMaterial({ color: 0xffc060, size: 0.05, transparent: true })
  );
  embers.name = "embers";
  g.add(embers);
  const light = new THREE.PointLight(0xff7020, 2.2, 8, 2);
  light.position.y = 0.5;
  light.name = "firelight";
  g.add(light);
  return g;
}

function tent() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0xd7c4a0, roughness: 0.85, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 4), cloth);
  shell.position.y = 0.65;
  shell.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 }));
  door.position.set(0, 0.35, 0.42);
  g.add(shell, door);
  return g;
}

function balloon() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#c4a882";
  g.fillRect(0, 0, 256, 128);
  const patches = ["#8a3030", "#2a4068", "#3a6840", "#c4a060", "#6a6a6a"];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = patches[i % patches.length];
    g.fillRect(8 + (i % 4) * 62, 10 + Math.floor(i / 4) * 54, 52, 44);
    g.strokeStyle = "#2a2018";
    g.strokeRect(8 + (i % 4) * 62, 10 + Math.floor(i / 4) * 54, 52, 44);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.1 }));
  mesh.scale.set(1.35, 0.82, 0.72);
  mesh.position.y = 2.55;
  return mesh;
}

function pipeRun() {
  const g = new THREE.Group();
  const mat = metalMat(0xb08a62);
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 8), mat);
  a.rotation.z = Math.PI / 2;
  a.position.set(0, 1.4, 0);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), mat);
  b.position.set(0.9, 0.7, 0);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat);
  elbow.position.set(0.9, 1.4, 0);
  g.add(a, b, elbow);
  return g;
}

function porthole() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 18), metalMat(0xd4b070));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), new THREE.MeshStandardMaterial({
    color: 0x9fd8ee, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75, emissive: 0x206080, emissiveIntensity: 0.3,
  }));
  ring.position.z = 0.02;
  g.add(ring, glass);
  return g;
}

function gauge() {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.4 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), metalMat(0x222228));
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.015, 0.01), new THREE.MeshStandardMaterial({ color: 0xaa2020 }));
  needle.position.set(0.03, 0.02, 0.02);
  needle.rotation.z = -0.6;
  rim.position.z = 0.01;
  g.add(face, rim, needle);
  return g;
}

function crystalCluster(color) {
  const g = new THREE.Group();
  g.name = "glowbit";
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.85, roughness: 0.18, metalness: 0.15,
  });
  [[0, 0.35, 0, 0.28, 0.7], [0.22, 0.22, 0.08, 0.16, 0.45], [-0.18, 0.18, -0.06, 0.14, 0.4], [0.05, 0.48, -0.12, 0.1, 0.32]].forEach(([x, y, z, rad, h]) => {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 5), mat);
    shard.position.set(x, y, z);
    shard.rotation.z = x * 0.8;
    g.add(shard);
  });
  const light = new THREE.PointLight(color, 1.4, 6, 2);
  light.position.y = 0.4;
  g.add(light);
  return g;
}

function scope() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.32), new THREE.MeshStandardMaterial({ color: 0xc9ddd4, roughness: 0.45, metalness: 0.25 }));
  body.position.y = 0.9;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#04140c";
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = "#39ff9a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x < 256; x++) {
    const y = 80 + Math.sin(x * 0.08) * 36;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.32), new THREE.MeshStandardMaterial({ map: tex, emissive: 0x39ff9a, emissiveIntensity: 0.7, roughness: 0.3 }));
  screen.position.set(0, 0.92, 0.17);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8), metalMat(0x889098));
  stand.position.y = 0.35;
  g.add(body, screen, stand);
  return g;
}

function glassware() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xd8fff4, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.55 });
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.28, 10), glass);
  a.position.set(-0.12, 0.2, 0);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), glass);
  b.position.set(0.14, 0.16, 0.05);
  g.add(a, b);
  return g;
}

function ahead(world, dist, side) {
  const s = findChar(world, "S")[0];
  const yaw = world.spawnYaw || 0;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = Math.sin(yaw);
  return {
    x: (s.x + 0.5) * CELL + fx * dist + rx * side,
    z: (s.z + 0.5) * CELL + fz * dist + rz * side,
  };
}

function drop(group, obj, x, z, y) {
  obj.position.x += x;
  obj.position.z += z;
  if (y) obj.position.y += y;
  group.add(obj);
}

function addProps(scene, world) {
  const group = new THREE.Group();
  const id = world.id;
  if (id === "trail") {
    const w = wagonWheel();
    const p = ahead(world, 1.7, 0.85);
    drop(group, w, p.x, p.z);
    const b = barrel();
    const q = ahead(world, 1.5, -0.8);
    drop(group, b, q.x, q.z);
    const c = crate();
    const r = ahead(world, 2.6, 0.9);
    drop(group, c, r.x, r.z);
    const lamp = lanternPost();
    const s = ahead(world, 0.2, -0.9);
    drop(group, lamp, s.x, s.z);
  } else if (id === "pine") {
    const sign = storeSign("PINE KNOT");
    const p = ahead(world, 2.2, -1.1);
    drop(group, sign, p.x, p.z);
    const table = checkersTable();
    const q = ahead(world, 1.8, 1.05);
    drop(group, table, q.x, q.z);
    const rail = porchRail();
    const r = ahead(world, 1.2, 0);
    rail.rotation.y = world.spawnYaw || 0;
    drop(group, rail, r.x, r.z);
    [ahead(world, 6, 3.2), ahead(world, 7, -2.6), ahead(world, 4.5, 3.6)].forEach((spot) => {
      drop(group, pineTree(false), spot.x, spot.z);
    });
  } else if (id === "mountain") {
    const fire = campfire();
    const p = ahead(world, 1.8, 0.15);
    drop(group, fire, p.x, p.z);
    const tentMesh = tent();
    const q = ahead(world, 4.8, -1.8);
    drop(group, tentMesh, q.x, q.z);
    [ahead(world, 5.5, 2.4), ahead(world, 6.2, -2.2), ahead(world, 3.8, 2.8)].forEach((spot) => {
      drop(group, pineTree(true), spot.x, spot.z);
    });
    const logs = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4030, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.9, 6), wood);
      log.rotation.z = Math.PI / 2;
      log.position.y = 0.1 + i * 0.16;
      logs.add(log);
    }
    const s = ahead(world, 2.4, 1.3);
    drop(group, logs, s.x, s.z);
  } else if (id === "rusty") {
    const pipes = pipeRun();
    const p = ahead(world, 1.6, 0.95);
    drop(group, pipes, p.x, p.z);
    const hole = porthole();
    hole.position.y = 1.6;
    const q = ahead(world, 2.4, -1);
    drop(group, hole, q.x, q.z);
    const dial = gauge();
    dial.position.y = 1.35;
    const r = ahead(world, 1.3, -0.85);
    drop(group, dial, r.x, r.z);
    const bag = balloon();
    const s = ahead(world, 3.3, 0.15);
    drop(group, bag, s.x, s.z);
    const crateMesh = crate();
    const t = ahead(world, 2.8, 1.1);
    drop(group, crateMesh, t.x, t.z);
  } else if (id === "pulse") {
    const a = crystalCluster(0xf0d080);
    const p = ahead(world, 1.8, 0.7);
    drop(group, a, p.x, p.z);
    const b = crystalCluster(0xd0a0ff);
    const q = ahead(world, 2.6, -0.8);
    drop(group, b, q.x, q.z);
  } else if (id === "thorne") {
    const bench = scope();
    const p = ahead(world, 2.1, 0.85);
    drop(group, bench, p.x, p.z);
    bench.rotation.y = -(world.spawnYaw || 0);
    const glass = glassware();
    const q = ahead(world, 1.6, -0.7);
    drop(group, glass, q.x, q.z);
  } else if (id === "seeders") {
    const a = crystalCluster(0x5dffc4);
    const p = ahead(world, 1.7, 0.6);
    drop(group, a, p.x, p.z);
    const b = crystalCluster(0xffd36b);
    const q = ahead(world, 2.5, -0.9);
    drop(group, b, q.x, q.z);
  } else if (id === "envoy") {
    const shard = crystalCluster(0xc9c6e8);
    const p = ahead(world, 1.8, 0.7);
    drop(group, shard, p.x, p.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 10, 28), metalMat(0xd0d4ff, 0x8040a0));
    ring.rotation.x = Math.PI / 2.2;
    ring.position.y = 1.5;
    const q = ahead(world, 2.6, -0.4);
    drop(group, ring, q.x, q.z);
  } else {
    const lamp = lanternPost();
    const p = ahead(world, 1.4, -0.8);
    drop(group, lamp, p.x, p.z);
  }
  scene.add(group);
}

function skyDome(style) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  style.sky.forEach((color, i) => grd.addColorStop(i / Math.max(1, style.sky.length - 1), color));
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);
  if (style.stars) {
    g.fillStyle = "#fff";
    for (let i = 0; i < 160; i++) {
      g.globalAlpha = 0.45 + Math.random() * 0.55;
      g.fillRect(Math.random() * 1024, Math.random() * 220, 2, 2);
    }
    g.globalAlpha = 1;
  } else if (style.outdoor) {
    g.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 7; i++) {
      const x = 80 + i * 130;
      const y = 70 + (i % 3) * 30;
      g.beginPath();
      g.ellipse(x, y, 50, 18, 0, 0, 7);
      g.ellipse(x + 30, y + 6, 36, 16, 0, 0, 7);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }));
  return mesh;
}

function backdrop(url) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(36, 36, 18, 40, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  mesh.position.y = 7;
  return mesh;
}

function distantHills(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  for (let i = 0; i < 9; i++) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(4 + (i % 3), 5 + (i % 4), 6), mat);
    const a = (i / 9) * Math.PI * 2;
    hill.position.set(Math.cos(a) * 32, 1.2, Math.sin(a) * 32);
    g.add(hill);
  }
  return g;
}

function cutoutMaterial(url, crop) {
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (crop) {
    tex.repeat.set(crop[2], crop[3]);
    tex.offset.set(crop[0], crop[1]);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, side: THREE.DoubleSide });
}

function softFigure(data, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const rx = w * 0.46;
  const ry = h * 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const a = n <= 1 ? 255 : Math.max(0, Math.round(255 * (1.22 - n)));
      const i = (y * w + x) * 4 + 3;
      data[i] = Math.min(data[i], a);
    }
  }
}

function figureMaterial(url, crop) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.7, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide,
  });
  new THREE.TextureLoader().load(url, (tex) => {
    const img = tex.image;
    if (!img || !img.width) return;
    const sw = 200;
    const sh = 360;
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const g = canvas.getContext("2d");
    const u = crop ? crop[0] : 0;
    const v = crop ? crop[1] : 0;
    const uw = crop ? crop[2] : 1;
    const uh = crop ? crop[3] : 1;
    g.drawImage(img, u * img.width, (1 - v - uh) * img.height, uw * img.width, uh * img.height, 0, 0, sw, sh);
    const pixels = g.getImageData(0, 0, sw, sh);
    softFigure(pixels.data, sw, sh);
    g.putImageData(pixels, 0, 0);
    const cut = new THREE.CanvasTexture(canvas);
    cut.colorSpace = THREE.SRGBColorSpace;
    mat.map = cut;
    mat.needsUpdate = true;
  });
  return mat;
}

function addCast(scene, world) {
  const group = new THREE.Group();
  peopleFor(world).forEach((person, i) => {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.72), figureMaterial(person.art, person.crop));
    board.position.set(person.wx, 0.9, person.wz);
    board.name = "cast";
    board.userData.person = person.id;
    board.userData.lines = person.lines;
    board.userData.nameLabel = person.name;
    board.userData.bob = i;
    board.userData.home = { x: person.wx, z: person.wz };
    board.userData.patrol = person.greet ? 1.35 : 0.55;
    const mouth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.09, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x2a140e })
    );
    mouth.position.set(0.02, 0.58, 0.02);
    mouth.name = "mouth";
    mouth.visible = false;
    board.add(mouth);
    person.mesh = board;
    group.add(board);
  });
  posterSpots(world).forEach((spot) => {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.95), cutoutMaterial(spot.art));
    const c = (spot.x + 0.5) * CELL;
    const d = (spot.z + 0.5) * CELL;
    plane.position.set(c + spot.dx * 0.86, 1.45, d + spot.dz * 0.86);
    if (spot.dx === 1) plane.rotation.y = Math.PI / 2;
    if (spot.dx === -1) plane.rotation.y = -Math.PI / 2;
    if (spot.dz === 1) plane.rotation.y = 0;
    if (spot.dz === -1) plane.rotation.y = Math.PI;
    group.add(plane);
  });
  scene.add(group);
}

function addIvy(scene, world, coarse) {
  const spots = [];
  const grid = world.grid;
  for (let z = 1; z < grid.length - 1; z++) {
    for (let x = 1; x < grid[z].length - 1; x++) {
      if (grid[z][x] === "#") continue;
      const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => {
        const row = grid[z + dz];
        return row && row[x + dx] === "#";
      });
      if (!wall) continue;
      if (((x * 3 + z * 5) % 4) !== 0) continue;
      spots.push([x, z, wall[0], wall[1]]);
    }
  }
  const cap = coarse ? 16 : 70;
  const use = spots.slice(0, cap);
  if (!use.length) return;
  const mesh = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.14, 0.55, 5),
    new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.9 }),
    use.length
  );
  const dummy = new THREE.Object3D();
  use.forEach(([x, z, dx, dz], i) => {
    dummy.position.set((x + 0.5) * CELL + dx * 0.82, 0.28, (z + 0.5) * CELL + dz * 0.82);
    dummy.rotation.y = i;
    dummy.scale.set(1, 0.7 + (i % 3) * 0.25, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  if (!coarse) {
    const hedgeN = Math.min(24, use.length);
    const hedge = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.35, 0.7, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x1d4a28, roughness: 0.95 }),
      hedgeN
    );
    use.slice(0, hedgeN).forEach(([x, z, dx, dz], i) => {
      dummy.position.set((x + 0.5) * CELL + dx * 0.7, 0.35, (z + 0.5) * CELL + dz * 0.7);
      dummy.rotation.y = 0;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hedge.setMatrixAt(i, dummy.matrix);
    });
    hedge.instanceMatrix.needsUpdate = true;
    scene.add(hedge);
  }
}

function addKnockers(scene, doors) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xc4a15a, roughness: 0.35, metalness: 0.6 });
  doors.forEach((d) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 12), mat);
    ring.position.set((d.x + 0.5) * CELL, 1.35, (d.z + 0.5) * CELL);
    scene.add(ring);
  });
}

function addEscher(scene, world) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: world.id === "pulse" ? 0x6a5088 : 0x2a2838, roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.45), mat);
    step.position.set(2.2 + i * 0.45, 0.4 + i * 0.28, 2.2);
    step.rotation.y = i * 0.35;
    g.add(step);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 16, Math.PI), mat);
  arch.position.set(4.2, 1.6, 2.2);
  arch.rotation.z = Math.PI;
  g.add(arch);
  scene.add(g);
}

function distantSpires(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, fog: false });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 6 + (i % 3) * 2, 4), mat);
    spire.position.set(Math.cos(a) * 34, 4, Math.sin(a) * 34);
    g.add(spire);
  }
  return g;
}

export function dressScene(scene, world, coarse, renderer) {
  const style = LOOK[world.id] || LOOK.meta;
  const seed = world.id.split("").reduce((n, ch) => n + ch.charCodeAt(0), 11);
  const wallMat = materialFor(style.wall, seed, coarse);
  const floorMat = materialFor(style.floor, seed + 3, coarse);
  const ceilMat = materialFor(style.ceil, seed + 7, coarse);
  if (style.emissive) {
    wallMat.emissive = new THREE.Color(style.emissive);
    wallMat.emissiveIntensity = style.ei || 0.3;
  }
  if (style.metal) {
    wallMat.metalness = style.metal;
    floorMat.metalness = style.metal;
    ceilMat.metalness = style.metal;
    wallMat.roughness = style.rough;
    floorMat.roughness = style.rough;
    ceilMat.roughness = style.rough;
  }
  if (coarse) {
    wallMat.normalMap = null;
    floorMat.normalMap = null;
    ceilMat.normalMap = null;
  }
  const geos = shellOf(world, style);
  const shell = new THREE.Mesh(geos.wall, wallMat);
  const floor = new THREE.Mesh(geos.floor, floorMat);
  const ceil = new THREE.Mesh(geos.ceil, ceilMat);
  scene.add(shell, floor, ceil);
  const doors = doorMesh(world, wallMat);
  doors.forEach((d) => scene.add(d.mesh));

  scene.add(skyDome(style));
  if (style.backdrop) scene.add(backdrop(style.backdrop));
  if (style.outdoor) scene.add(distantHills(world.id === "mountain" ? 0x1a2838 : 0x6a4030));
  if (!coarse) scene.add(distantSpires(style.outdoor ? (world.id === "mountain" ? 0x0c1420 : 0x3a2418) : 0x1a140e));

  scene.add(new THREE.AmbientLight(style.sun, style.amb));
  scene.add(new THREE.HemisphereLight(style.sun, style.fill, 0.85));
  const sun = new THREE.DirectionalLight(style.sun, 1.25);
  sun.position.set(-16, style.outdoor ? 7 : 12, 8);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(style.fill, 0.55);
  fill.position.set(10, 6, -8);
  scene.add(fill);

  const plaques = [];
  const place = (entry, text, secret) => {
    const shown = carveTexture(style.wall, text, true);
    const hidden = carveTexture(style.wall, "", false);
    const pmat = new THREE.MeshStandardMaterial({ map: secret ? hidden : shown, roughness: 0.7 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), pmat);
    const spot = mountPlaque(world, entry);
    mesh.position.set(spot.x, 1.6, spot.z);
    mesh.rotation.y = spot.rot;
    scene.add(mesh);
    plaques.push({ entry, mesh, mat: pmat, shown, hidden, secret });
  };
  (world.tokens || []).forEach((t) => {
    if (t.kind === "trap") return;
    place(t, t.letter || "Use", t.kind === "lantern" || t.kind === "angle" || t.kind === "pitch");
  });
  (world.signs || []).forEach((s) => place(s, s.title, s.need === "lantern"));

  const accent = new THREE.MeshStandardMaterial({ color: world.theme.accent, emissive: world.theme.accent, emissiveIntensity: 0.45, roughness: 0.4 });
  const lie = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffb35c, emissiveIntensity: 0.6, roughness: 0.45 });
  function arch(x, z, material) {
    const grp = new THREE.Group();
    const post = new THREE.BoxGeometry(0.16, 3.2, 0.16);
    const lintel = new THREE.BoxGeometry(1.75, 0.2, 0.22);
    const a = new THREE.Mesh(post, material);
    const b = new THREE.Mesh(post, material);
    const c = new THREE.Mesh(lintel, material);
    a.position.set(-0.8, 1.6, 0);
    b.position.set(0.8, 1.6, 0);
    c.position.set(0, 3.2, 0);
    grp.add(a, b, c);
    grp.position.set((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
    scene.add(grp);
  }
  findChar(world, "G").forEach((p) => arch(p.x, p.z, accent));
  findChar(world, "F").forEach((p) => arch(p.x, p.z, lie));

  const spawn = findChar(world, "S")[0];
  const artMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), artMat);
  const px = (spawn.x + 0.5) * CELL;
  const pz = (spawn.z + 0.5) * CELL;
  const yaw0 = world.spawnYaw || 0;
  const fx = Math.sin(yaw0);
  const fz = -Math.cos(yaw0);
  art.position.set(px - fx * 0.15, 1.7, pz - fz * 0.15);
  art.lookAt(px - fx * 3, 1.7, pz - fz * 3);
  scene.add(art);
  new THREE.TextureLoader().load(world.theme.art, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    artMat.map = tex;
    artMat.needsUpdate = true;
  });

  addProps(scene, world);
  addCast(scene, world);
  addIvy(scene, world, coarse);
  addKnockers(scene, doors);
  if (world.id === "pulse" || world.id === "envoy") addEscher(scene, world);

  const count = coarse ? 40 : 80;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * world.grid[0].length * CELL;
    pos[i * 3 + 1] = Math.random() * CEIL;
    pos[i * 3 + 2] = Math.random() * world.grid.length * CELL;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(geo, new THREE.PointsMaterial({
    color: world.theme.particles === "snow" ? 0xf7fbff : world.id === "mountain" ? 0xffc080 : world.theme.accent,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }));
  particles.userData.hi = CEIL;
  scene.add(particles);

  if (renderer && (world.id === "envoy" || world.id === "rusty" || world.id === "thorne")) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(8, 12, 8),
      new THREE.MeshBasicMaterial({ color: style.sky[1] || style.sky[0], side: THREE.BackSide })
    ));
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();
  }

  scene.background = new THREE.Color(style.sky[0]);
  scene.fog = new THREE.Fog(style.sky[1] || style.sky[0], style.outdoor ? 20 : 10, style.outdoor ? 78 : 40);
  return { doors, plaques, particles, shell };
}
