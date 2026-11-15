/* Room surfaces. One atlas, one merged shell, carved plaques, themed props.
   Puzzle grids and answers live in worlds.js and are not touched here. */
import * as THREE from "three";
import { CELL, findChar } from "./logic.js";

export const CEIL = 4.35;

const TILE = 256;

function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function paint(draw, seed) {
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const g = c.getContext("2d");
  draw(g, TILE, rng(seed));
  const img = g.getImageData(0, 0, TILE, TILE);
  const height = new Float32Array(TILE * TILE);
  const d = img.data;
  for (let i = 0; i < height.length; i++) height[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765;
  return { canvas: c, height };
}

const PAINT = {
  boards(g, s, r) {
    g.fillStyle = "#6b442c";
    g.fillRect(0, 0, s, s);
    const plank = 28;
    for (let y = 0; y < s; y += plank) {
      const n = 90 + r() * 50;
      g.fillStyle = `rgb(${n + 36},${n * 0.55},${n * 0.28})`;
      g.fillRect(0, y, s, plank - 3);
      g.fillStyle = "rgba(24,12,6,0.65)";
      g.fillRect(0, y + plank - 3, s, 3);
      g.strokeStyle = "rgba(50,24,10,0.35)";
      g.beginPath();
      const yy = y + 6 + r() * (plank - 12);
      g.moveTo(0, yy);
      g.bezierCurveTo(s * 0.3, yy + r() * 5, s * 0.7, yy - r() * 4, s, yy + 1);
      g.stroke();
      g.fillStyle = "rgba(20,10,4,0.8)";
      g.beginPath();
      g.arc(20 + r() * (s - 40), y + plank * 0.45, 1.6, 0, 7);
      g.fill();
    }
  },
  canvas(g, s, r) {
    g.fillStyle = "#cbb892";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(90,70,40,0.35)";
    for (let i = 0; i < s; i += 4) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 2, s);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(s, i + 1);
      g.stroke();
    }
    g.fillStyle = "rgba(90,60,30,0.25)";
    for (let i = 0; i < 8; i++) g.fillRect(r() * s, r() * s, 30 + r() * 40, 8 + r() * 10);
  },
  dirt(g, s, r) {
    g.fillStyle = "#7a5736";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(${40 + r() * 40},${24 + r() * 20},10,${0.15 + r() * 0.3})`;
      g.fillRect(r() * s, r() * s, 2 + r() * 4, 2);
    }
    g.strokeStyle = "rgba(40,24,12,0.45)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(s * 0.3, s * 0.3, s * 0.6, s * 0.45, s, s * 0.32);
    g.stroke();
    g.lineWidth = 1;
  },
  bark(g, s, r) {
    g.fillStyle = "#6a4a32";
    g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 6 + r() * 8) {
      g.fillStyle = `rgba(${30 + r() * 40},${16 + r() * 20},8,0.75)`;
      g.fillRect(x, 0, 3 + r() * 4, s);
      g.fillStyle = `rgba(${170 + r() * 40},${120 + r() * 30},60,0.45)`;
      g.fillRect(x + 4, 0, 3, s);
    }
    g.fillStyle = "rgba(20,10,6,0.35)";
    for (let i = 0; i < 6; i++) g.fillRect(r() * s, r() * s, 8, 18 + r() * 30);
  },
  planks(g, s, r) {
    g.fillStyle = "#8a6848";
    g.fillRect(0, 0, s, s);
    const w = 36;
    for (let x = 0; x < s; x += w) {
      const n = 150 + r() * 50;
      g.fillStyle = `rgb(${n},${n * 0.72},${n * 0.42})`;
      g.fillRect(x, 0, w - 3, s);
      g.fillStyle = "rgba(20,12,6,0.7)";
      g.fillRect(x + w - 3, 0, 3, s);
    }
  },
  rock(g, s, r) {
    g.fillStyle = "#6a7268";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const n = 90 + r() * 90;
      g.fillStyle = `rgba(${n},${n + 4},${n - 6},0.55)`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 10 + r() * 28, 8 + r() * 16, r() * 3, 0, 7);
      g.fill();
    }
    g.strokeStyle = "rgba(16,18,14,0.65)";
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.moveTo(r() * s, r() * s);
      g.lineTo(r() * s, r() * s);
      g.stroke();
    }
    g.lineWidth = 1;
  },
  snow(g, s, r) {
    g.fillStyle = "#e7eef3";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(${80 + r() * 40},${100 + r() * 30},${120 + r() * 20},${0.08 + r() * 0.2})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 8 + r() * 20, 4 + r() * 8, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = "rgba(90,70,60,0.35)";
    for (let i = 0; i < 12; i++) g.fillRect(r() * s, r() * s, 3, 2);
  },
  hull(g, s, r) {
    g.fillStyle = "#a86a52";
    g.fillRect(0, 0, s, s);
    const cell = 64;
    g.strokeStyle = "rgba(30,14,10,0.8)";
    g.lineWidth = 3;
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
    g.fillStyle = "#5a4030";
    for (let y = 8; y < s; y += cell) {
      for (let x = 8; x < s; x += cell) {
        g.beginPath();
        g.arc(x, y, 3.2, 0, 7);
        g.fill();
        g.fillStyle = "#c4a070";
        g.beginPath();
        g.arc(x - 0.6, y - 0.6, 1.3, 0, 7);
        g.fill();
        g.fillStyle = "#5a4030";
      }
    }
    g.fillStyle = "rgba(90,40,16,0.35)";
    for (let i = 0; i < 5; i++) g.fillRect(r() * s, 0, 6 + r() * 8, s);
    g.lineWidth = 1;
  },
  brass(g, s, r) {
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, "#e6c878");
    grd.addColorStop(0.5, "#a67c3a");
    grd.addColorStop(1, "#e0bc70");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(60,36,10,0.45)";
    for (let i = 0; i < 18; i++) {
      g.beginPath();
      g.moveTo(0, r() * s);
      g.lineTo(s, r() * s);
      g.stroke();
    }
  },
  membrane(g, s, r) {
    g.fillStyle = "#140c28";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = i % 2 ? "rgba(255,220,140,0.95)" : "rgba(210,170,255,0.95)";
      g.lineWidth = 5 + r() * 4;
      g.beginPath();
      g.moveTo(0, r() * s);
      for (let x = 0; x <= s; x += 16) g.lineTo(x, s * 0.5 + Math.sin(x * 0.05 + i) * (20 + r() * 30));
      g.stroke();
    }
    g.fillStyle = "rgba(200,160,255,0.2)";
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(r() * s, r() * s, 10 + r() * 18, 0, 7);
      g.fill();
    }
    g.lineWidth = 1;
  },
  plaster(g, s, r) {
    g.fillStyle = "#1e4a3e";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
    g.fillStyle = "rgba(8,20,16,0.35)";
    g.fillRect(0, s * 0.62, s, 8);
    g.fillStyle = "#c9a24a";
    g.fillRect(0, s * 0.64, s, 3);
  },
  labtile(g, s) {
    const n = 32;
    for (let y = 0; y < s; y += n) {
      for (let x = 0; x < s; x += n) {
        const k = ((x + y) / n) % 2 ? 118 : 132;
        g.fillStyle = `rgb(${k},${k - 2},${k - 8})`;
        g.fillRect(x, y, n - 2, n - 2);
        g.fillStyle = "#3a3834";
        g.fillRect(x + n - 2, y, 2, n);
        g.fillRect(x, y + n - 2, n, 2);
      }
    }
  },
  crystal(g, s, r) {
    g.fillStyle = "#14382e";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 28; i++) {
      const x = r() * s;
      const y = r() * s;
      g.fillStyle = `rgba(${80 + r() * 60},${200 + r() * 55},${140 + r() * 60},0.95)`;
      g.beginPath();
      g.moveTo(x, y - 16 - r() * 10);
      g.lineTo(x + 12, y + 8);
      g.lineTo(x - 10, y + 6);
      g.fill();
    }
    g.strokeStyle = "rgba(180,255,210,0.7)";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(r() * s, r() * s);
      g.lineTo(r() * s, r() * s);
      g.stroke();
    }
    g.lineWidth = 1;
  },
  blackglass(g, s, r) {
    g.fillStyle = "#1c1c2a";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(210,210,240,0.7)";
    g.lineWidth = 3;
    for (let i = -s; i < s * 2; i += 28) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + s * 0.4, s);
      g.stroke();
    }
    g.fillStyle = "rgba(90,30,80,0.45)";
    g.fillRect(0, 0, s, 10);
    g.fillRect(0, s - 10, s, 10);
    g.fillStyle = `rgba(200,200,230,${0.15 + r() * 0.1})`;
    g.fillRect(r() * s, 0, 3, s);
    g.lineWidth = 1;
  },
  parlor(g, s) {
    g.fillStyle = "#3a2418";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "#c6a15a";
    g.lineWidth = 4;
    g.strokeRect(10, 10, s - 20, s - 20);
    g.strokeRect(22, 22, s - 44, s - 44);
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(28, 28, s - 56, s - 56);
    g.lineWidth = 1;
  },
};

const LOOK = {
  trail: { wall: "boards", floor: "dirt", ceil: "canvas", trim: "canvas", sky: ["#1c3358", "#e07a3a", "#f6d0a0"], outdoor: true, shine: 8, spec: 0x443322 },
  pine: { wall: "bark", floor: "planks", ceil: "planks", trim: "planks", sky: ["#6aa0c8", "#d5e6f2", "#f7f1e4"], outdoor: true, shine: 8, spec: 0x332211 },
  mountain: { wall: "rock", floor: "snow", ceil: "snow", trim: "rock", sky: ["#05080f", "#163044", "#6a7c88"], outdoor: true, stars: true, shine: 6, spec: 0x223033 },
  rusty: { wall: "hull", floor: "hull", ceil: "hull", trim: "brass", sky: ["#140e0c", "#3a241c"], outdoor: false, shine: 18, spec: 0x886644 },
  pulse: { wall: "membrane", floor: "membrane", ceil: "membrane", trim: "membrane", sky: ["#05030c", "#24143c"], outdoor: false, shine: 32, spec: 0xccb0ee, emissive: 0x3a2068, ei: 0.7 },
  thorne: { wall: "plaster", floor: "labtile", ceil: "labtile", trim: "brass", sky: ["#070a10", "#10241e"], outdoor: false, shine: 14, spec: 0x668877, emissive: 0x081810, ei: 0.06 },
  seeders: { wall: "crystal", floor: "crystal", ceil: "crystal", trim: "crystal", sky: ["#02140e", "#063828"], outdoor: false, shine: 30, spec: 0xaaffee, emissive: 0x146048, ei: 0.55 },
  envoy: { wall: "blackglass", floor: "blackglass", ceil: "blackglass", trim: "blackglass", sky: ["#000008", "#101018"], outdoor: false, shine: 60, spec: 0xddddee, emissive: 0x2a1830, ei: 0.35 },
  meta: { wall: "parlor", floor: "parlor", ceil: "parlor", trim: "brass", sky: ["#100e0c", "#2a1c12"], outdoor: false, shine: 16, spec: 0x886644 },
};

function buildAtlas(style, seed) {
  const tiles = ["wall", "floor", "ceil", "trim"].map((key, i) => paint(PAINT[style[key]], seed + i * 97));
  const S = TILE * 2;
  const diff = document.createElement("canvas");
  diff.width = diff.height = S;
  const dg = diff.getContext("2d");
  dg.drawImage(tiles[0].canvas, 0, 0);
  dg.drawImage(tiles[1].canvas, TILE, 0);
  dg.drawImage(tiles[2].canvas, 0, TILE);
  dg.drawImage(tiles[3].canvas, TILE, TILE);
  const height = new Float32Array(S * S);
  const blit = (src, ox, oy) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) height[(oy + y) * S + ox + x] = src[y * TILE + x];
    }
  };
  blit(tiles[0].height, 0, 0);
  blit(tiles[1].height, TILE, 0);
  blit(tiles[2].height, 0, TILE);
  blit(tiles[3].height, TILE, TILE);
  const nc = document.createElement("canvas");
  nc.width = nc.height = S;
  const img = nc.getContext("2d").createImageData(S, S);
  const dd = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const hl = height[y * S + ((x - 1 + S) % S)];
      const hr = height[y * S + ((x + 1) % S)];
      const hu = height[((y - 1 + S) % S) * S + x];
      const hd = height[((y + 1) % S) * S + x];
      let nx = (hl - hr) * 3.2;
      let ny = (hu - hd) * 3.2;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const o = (y * S + x) * 4;
      dd[o] = (nx / len * 0.5 + 0.5) * 255;
      dd[o + 1] = (ny / len * 0.5 + 0.5) * 255;
      dd[o + 2] = (nz / len * 0.5 + 0.5) * 255;
      dd[o + 3] = 255;
    }
  }
  nc.getContext("2d").putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(diff);
  const normalMap = new THREE.CanvasTexture(nc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.flipY = false;
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.flipY = false;
  return { map, normalMap };
}

function uv(region, u, v) {
  const tile = 2;
  const fu = ((u % tile) + tile) % tile / tile;
  const fv = ((v % tile) + tile) % tile / tile;
  const col = region % 2;
  const row = region < 2 ? 0 : 1;
  return [col * 0.5 + 0.012 + fu * 0.476, row * 0.5 + 0.012 + fv * 0.476];
}

function Bucket() {
  this.p = [];
  this.n = [];
  this.uv = [];
  this.c = [];
}
Bucket.prototype.quad = function (corners, normal, uvs, cols) {
  const order = [0, 1, 2, 0, 2, 3];
  for (let k = 0; k < 6; k++) {
    const i = order[k];
    this.p.push(corners[i][0], corners[i][1], corners[i][2]);
    this.n.push(normal[0], normal[1], normal[2]);
    this.uv.push(uvs[i][0], uvs[i][1]);
    this.c.push(cols[i][0], cols[i][1], cols[i][2]);
  }
};
Bucket.prototype.geometry = function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
  return g;
};

function shade(k) {
  return [k, k, k];
}

function shellOf(world, style) {
  const grid = world.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const indoor = !style.outdoor;
  const b = new Bucket();
  const solid = (x, z) => {
    if (x < 0 || z < 0 || x >= cols || z >= rows) return true;
    return grid[z][x] === "#";
  };
  const floorish = (x, z) => {
    if (x < 0 || z < 0 || x >= cols || z >= rows) return false;
    return grid[z][x] !== "#";
  };
  const heightAt = (x, z) => (indoor ? CEIL : 3.55 + ((Math.abs(x * 3 + z * 5) % 5) * 0.18));

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!solid(x, z)) continue;
      const x0 = x * CELL;
      const x1 = x0 + CELL;
      const z0 = z * CELL;
      const z1 = z0 + CELL;
      const y1 = heightAt(x, z);
      const add = (corners, n, u0, u1, v0, v1, region) => {
        const uvs = [uv(region, u0, v0), uv(region, u1, v0), uv(region, u1, v1), uv(region, u0, v1)];
        const ao = [shade(0.72), shade(0.72), shade(1), shade(1)];
        b.quad(corners, n, uvs, ao);
      };
      if (!solid(x, z + 1)) {
        add([[x0, 0, z1], [x1, 0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], x0, x1, 0, y1, 0);
      }
      if (!solid(x, z - 1)) {
        add([[x1, 0, z0], [x0, 0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], x0, x1, 0, y1, 0);
      }
      if (!solid(x + 1, z)) {
        add([[x1, 0, z1], [x1, 0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], z0, z1, 0, y1, 0);
      }
      if (!solid(x - 1, z)) {
        add([[x0, 0, z0], [x0, 0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], z0, z1, 0, y1, 0);
      }
      const topRegion = world.id === "mountain" ? 1 : 0;
      add([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], x0, x1, z0, z1, topRegion);
      if (!solid(x, z + 1)) {
        const yb = 0.32;
        b.quad(
          [[x0, 0, z1 + 0.02], [x1, 0, z1 + 0.02], [x1, yb, z1 + 0.02], [x0, yb, z1 + 0.02]],
          [0, 0, 1],
          [uv(3, x0, 0), uv(3, x1, 0), uv(3, x1, yb), uv(3, x0, yb)],
          [shade(0.55), shade(0.55), shade(0.75), shade(0.75)]
        );
      }
    }
  }

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!floorish(x, z)) continue;
      const x0 = x * CELL;
      const x1 = x0 + CELL;
      const z0 = z * CELL;
      const z1 = z0 + CELL;
      const edge = (nx, nz) => (solid(nx, nz) ? 0.62 : 0.92);
      b.quad(
        [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]],
        [0, 1, 0],
        [uv(1, x0, z1), uv(1, x1, z1), uv(1, x1, z0), uv(1, x0, z0)],
        [shade(edge(x, z + 1)), shade(edge(x + 1, z)), shade(edge(x, z - 1)), shade(edge(x - 1, z))]
      );
      if (indoor) {
        b.quad(
          [[x0, CEIL, z0], [x1, CEIL, z0], [x1, CEIL, z1], [x0, CEIL, z1]],
          [0, -1, 0],
          [uv(2, x0, z0), uv(2, x1, z0), uv(2, x1, z1), uv(2, x0, z1)],
          [shade(0.55), shade(0.55), shade(0.55), shade(0.55)]
        );
      }
      const openN = floorish(x, z - 1);
      const openS = floorish(x, z + 1);
      const openE = floorish(x + 1, z);
      const openW = floorish(x - 1, z);
      const corridor = (openN && openS && !openE && !openW) || (openE && openW && !openN && !openS);
      const ch = grid[z][x];
      if (corridor && (x + z) % 2 === 0 && ch !== "S" && ch !== "G" && ch !== "F") {
        const y0 = 2.72;
        const y1 = 3.02;
        if (openN && openS) {
          b.quad(
            [[x0 + 0.08, y0, z0], [x1 - 0.08, y0, z0], [x1 - 0.08, y0, z1], [x0 + 0.08, y0, z1]],
            [0, -1, 0],
            [uv(3, 0, 0), uv(3, 1, 0), uv(3, 1, 1), uv(3, 0, 1)],
            [shade(0.7), shade(0.7), shade(0.7), shade(0.7)]
          );
          b.quad(
            [[x0 + 0.08, y1, z1], [x1 - 0.08, y1, z1], [x1 - 0.08, y1, z0], [x0 + 0.08, y1, z0]],
            [0, 1, 0],
            [uv(3, 0, 0), uv(3, 1, 0), uv(3, 1, 1), uv(3, 0, 1)],
            [shade(0.85), shade(0.85), shade(0.85), shade(0.85)]
          );
        } else {
          b.quad(
            [[x0, y0, z0 + 0.08], [x0, y0, z1 - 0.08], [x1, y0, z1 - 0.08], [x1, y0, z0 + 0.08]],
            [0, -1, 0],
            [uv(3, 0, 0), uv(3, 1, 0), uv(3, 1, 1), uv(3, 0, 1)],
            [shade(0.7), shade(0.7), shade(0.7), shade(0.7)]
          );
          b.quad(
            [[x1, y1, z0 + 0.08], [x1, y1, z1 - 0.08], [x0, y1, z1 - 0.08], [x0, y1, z0 + 0.08]],
            [0, 1, 0],
            [uv(3, 0, 0), uv(3, 1, 0), uv(3, 1, 1), uv(3, 0, 1)],
            [shade(0.85), shade(0.85), shade(0.85), shade(0.85)]
          );
        }
      }
    }
  }
  return b.geometry();
}

function doorMesh(world, mat) {
  const doors = [];
  const grid = world.grid;
  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[0].length; x++) {
      const ch = grid[z][x];
      if (ch !== "+" && ch !== "=") continue;
      const bucket = new Bucket();
      const x0 = x * CELL + 0.08;
      const x1 = (x + 1) * CELL - 0.08;
      const z0 = z * CELL + 0.08;
      const z1 = (z + 1) * CELL - 0.08;
      const y1 = CEIL - 0.05;
      const q = (corners, n) => bucket.quad(corners, n, [uv(0, 0, 0), uv(0, 1, 0), uv(0, 1, 2), uv(0, 0, 2)], [shade(0.8), shade(0.8), shade(1), shade(1)]);
      q([[x0, 0, z1], [x1, 0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
      q([[x1, 0, z0], [x0, 0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
      q([[x1, 0, z1], [x1, 0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
      q([[x0, 0, z0], [x0, 0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
      const mesh = new THREE.Mesh(bucket.geometry(), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      doors.push({ x, z, mesh, open: false });
    }
  }
  return doors;
}

function skyTexture(stops, stars) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach((color, i) => grd.addColorStop(i / Math.max(1, stops.length - 1), color));
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  if (stars) {
    g.fillStyle = "#fff";
    for (let i = 0; i < 80; i++) {
      g.globalAlpha = 0.4 + Math.random() * 0.6;
      g.fillRect(Math.random() * 512, Math.random() * 140, 1.4, 1.4);
    }
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function carveTexture(style, text, on) {
  const src = document.createElement("canvas");
  src.width = src.height = 256;
  PAINT[style.wall](src.getContext("2d"), 256, rng(style.wall.length * 19 + 5));
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0, 512, 256);
  const light = style.wall === "membrane" || style.wall === "blackglass" || style.wall === "crystal" || style.wall === "hull" || style.wall === "rock";
  g.fillStyle = light ? "rgba(0,0,0,0.42)" : "rgba(255,244,214,0.3)";
  g.fillRect(18, 22, 476, 212);
  g.strokeStyle = light ? "rgba(255,220,160,0.55)" : "rgba(40,22,8,0.7)";
  g.lineWidth = 8;
  g.strokeRect(26, 30, 460, 196);
  const lines = String(text || "").split("\n").slice(0, 2);
  const size = lines.some((line) => line.length > 10) ? 44 : 92;
  g.font = "600 " + size + "px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  lines.forEach((line, i) => {
    const y = 128 + (i - (lines.length - 1) / 2) * (size + 6);
    const shown = on ? line.slice(0, 22) : "";
    g.lineWidth = 10;
    g.strokeStyle = light ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.45)";
    g.strokeText(shown, 256, y);
    g.fillStyle = light ? "rgba(255,236,196,0.96)" : "rgba(18,10,4,0.94)";
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
  const dirs = [
    [0, -1, 0],
    [0, 1, Math.PI],
    [1, 0, Math.PI / 2],
    [-1, 0, -Math.PI / 2],
  ];
  for (let i = 0; i < dirs.length; i++) {
    const dx = dirs[i][0];
    const dz = dirs[i][1];
    const rot = dirs[i][2];
    if (!solid(entry.x + dx, entry.z + dz)) continue;
    return {
      x: (entry.x + 0.5) * CELL + dx * (CELL * 0.5 - 0.045),
      z: (entry.z + 0.5) * CELL + dz * (CELL * 0.5 - 0.045),
      rot,
    };
  }
  return { x: (entry.x + 0.5) * CELL, z: (entry.z + 0.5) * CELL - 0.4, rot: 0 };
}

function addProps(scene, world) {
  const group = new THREE.Group();
  const wood = new THREE.MeshPhongMaterial({ color: 0x6b4428, shininess: 8, specular: 0x221408 });
  const metal = new THREE.MeshPhongMaterial({ color: world.theme.accent, shininess: 36, specular: 0xccb080, emissive: world.theme.accent, emissiveIntensity: 0.08 });
  const glow = new THREE.MeshPhongMaterial({ color: world.theme.accent, emissive: world.theme.accent, emissiveIntensity: 0.65, shininess: 20 });
  const grid = world.grid;
  const avoid = new Set();
  (world.tokens || []).forEach((t) => avoid.add(t.x + "," + t.z));
  (world.signs || []).forEach((t) => avoid.add(t.x + "," + t.z));
  (world.portals || []).forEach((t) => avoid.add(t.x + "," + t.z));
  ["S", "G", "F"].forEach((ch) => findChar(world, ch).forEach((p) => avoid.add(p.x + "," + p.z)));
  const spots = [];
  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[0].length; x++) {
      const ch = grid[z][x];
      if (ch === "#" || ch === "+" || ch === "=") continue;
      if (avoid.has(x + "," + z)) continue;
      spots.push({ x, z });
    }
  }
  function put(mesh, x, z, dx, dy, dz) {
    mesh.position.set((x + 0.5) * CELL + (dx || 0), dy || 0, (z + 0.5) * CELL + (dz || 0));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const id = world.id;
  if (id === "trail") {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 14), wood);
    wheel.rotation.y = 0.5;
    put(wheel, 1, 4, 0.55, 0.46, 0.1);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 8), wood), spots[0] ? spots[0].x : 2, spots[0] ? spots[0].z : 1, 0.4, 0.28, 0);
    put(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), wood), spots[1] ? spots[1].x : 4, spots[1] ? spots[1].z : 1, -0.35, 0.2, 0.2);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glow);
    put(lamp, 2, 2, -0.55, 1.3, 0.2);
  } else if (id === "pine") {
    const board = document.createElement("canvas");
    board.width = board.height = 128;
    const bg = board.getContext("2d");
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        bg.fillStyle = (x + y) % 2 ? "#7a221c" : "#f0ddb0";
        bg.fillRect(x * 16, y * 16, 16, 16);
      }
    }
    const tex = new THREE.CanvasTexture(board);
    tex.colorSpace = THREE.SRGBColorSpace;
    const checker = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 1.15), new THREE.MeshPhongMaterial({ map: tex, shininess: 10 }));
    put(checker, 1, 8, 0, 0.04, 0);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), wood), 5, 6, 0.35, 0.22, 0.15);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), wood), spots[0] ? spots[0].x : 4, spots[0] ? spots[0].z : 3, 0.45, 0.75, 0);
  } else if (id === "mountain") {
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.62, 7), new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
    fire.name = "fire";
    put(fire, 2, 3, 0.42, 0.32, 0.1);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 5), wood), 2, 3, 0.15, 0.12, 0.28);
    const spruceMat = new THREE.MeshPhongMaterial({ color: 0x1c3a28, shininess: 4 });
    [spots[0], spots[1], spots[2]].forEach((s, i) => {
      if (!s) return;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5), wood);
      trunk.position.y = 0.2;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.35, 7), spruceMat);
      top.position.y = 0.95;
      tree.add(trunk, top);
      put(tree, s.x, s.z, (i - 1) * 0.15, 0, 0.2);
    });
    put(new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.85, 4), new THREE.MeshPhongMaterial({ color: 0xc5d0c8 })), spots[3] ? spots[3].x : 5, spots[3] ? spots[3].z : 3, 0.3, 0.4, 0);
  } else if (id === "rusty") {
    put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.55), wood), 4, 9, 0.35, 0.24, 0.15);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), metal);
    pipe.rotation.z = Math.PI / 2;
    put(pipe, 1, 6, 0.15, 1.15, 0.35);
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshPhongMaterial({ color: 0xc4523a, shininess: 12 }));
    put(balloon, spots[0] ? spots[0].x : 6, spots[0] ? spots[0].z : 2, 0, 1.6, 0);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), metal), spots[1] ? spots[1].x : 7, spots[1] ? spots[1].z : 3, 0.4, 0.55, 0);
  } else if (id === "pulse") {
    put(new THREE.Mesh(new THREE.OctahedronGeometry(0.34), glow), 2, 4, 0.4, 0.85, 0);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 8, 16), glow), 8, 9, 0, 2.4, 0);
    put(new THREE.Mesh(new THREE.OctahedronGeometry(0.2), glow), spots[0] ? spots[0].x : 5, spots[0] ? spots[0].z : 3, 0.3, 0.7, 0);
  } else if (id === "thorne") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8), metal);
    tube.rotation.z = Math.PI / 2;
    put(tube, 2, 4, 0.25, 1.15, 0.2);
    put(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.35), new THREE.MeshPhongMaterial({ color: 0x24584a, shininess: 20, emissive: 0x9dffc8, emissiveIntensity: 0.15 })), 4, 2, 0.35, 0.85, 0.15);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), new THREE.MeshPhongMaterial({ color: 0x9fd8c8, shininess: 60, transparent: true, opacity: 0.85 })), spots[0] ? spots[0].x : 6, spots[0] ? spots[0].z : 3, 0, 0.9, 0);
  } else if (id === "seeders") {
    put(new THREE.Mesh(new THREE.OctahedronGeometry(0.38), glow), 4, 4, 0.4, 0.7, 0);
    put(new THREE.Mesh(new THREE.OctahedronGeometry(0.22), glow), spots[0] ? spots[0].x : 3, spots[0] ? spots[0].z : 2, -0.3, 0.5, 0.2);
    put(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), glow), spots[1] ? spots[1].x : 6, spots[1] ? spots[1].z : 7, 0.3, 0.3, 0);
  } else if (id === "envoy") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 18), metal);
    ring.rotation.x = Math.PI / 2.4;
    put(ring, 2, 6, 0.35, 1.35, 0);
    put(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.5), new THREE.MeshPhongMaterial({ color: 0x1a1a24, shininess: 80, specular: 0xaaaacc, emissive: 0x301028, emissiveIntensity: 0.4 })), spots[0] ? spots[0].x : 5, spots[0] ? spots[0].z : 5, 0.45, 0.7, 0);
  } else {
    put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), wood), 3, 3, 0.4, 0.35, 0);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow);
    put(lamp, 4, 4, 0, 1.6, 0);
  }
  scene.add(group);
  return group;
}

export function dressScene(scene, world, coarse) {
  const style = LOOK[world.id] || LOOK.meta;
  const seed = world.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 40);
  const atlas = buildAtlas(style, seed);
  const mat = new THREE.MeshPhongMaterial({
    map: atlas.map,
    normalMap: atlas.normalMap,
    normalScale: new THREE.Vector2(coarse ? 0.35 : 0.7, coarse ? 0.35 : 0.7),
    shininess: style.shine,
    specular: new THREE.Color(style.spec),
    emissive: new THREE.Color(style.emissive || 0x000000),
    emissiveIntensity: style.ei || 0,
    vertexColors: true,
  });
  const shell = new THREE.Mesh(shellOf(world, style), mat);
  shell.castShadow = true;
  shell.receiveShadow = true;
  scene.add(shell);

  const doors = doorMesh(world, mat);
  doors.forEach((d) => scene.add(d.mesh));

  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(78, coarse ? 12 : 20, coarse ? 8 : 14),
    new THREE.MeshBasicMaterial({ map: skyTexture(style.sky, style.stars), side: THREE.BackSide, depthWrite: false, fog: false })
  ));

  const plaques = [];
  const place = (entry, text, secret) => {
    const shown = carveTexture(style, text, true);
    const hidden = carveTexture(style, secret ? "" : text, !secret);
    const pmat = new THREE.MeshPhongMaterial({ map: secret ? hidden : shown, shininess: 6, specular: 0x222222 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.58), pmat);
    const spot = mountPlaque(world, entry);
    mesh.position.set(spot.x, 1.55, spot.z);
    mesh.rotation.y = spot.rot;
    scene.add(mesh);
    plaques.push({ entry, mesh, mat: pmat, shown, hidden, secret });
  };
  (world.tokens || []).forEach((t) => {
    if (t.kind === "trap") return;
    const secret = t.kind === "lantern" || t.kind === "angle" || t.kind === "pitch";
    place(t, t.letter || "Use", secret);
  });
  (world.signs || []).forEach((s) => place(s, s.title, s.need === "lantern"));

  const accent = new THREE.MeshPhongMaterial({ color: world.theme.accent, emissive: world.theme.accent, emissiveIntensity: 0.35, shininess: 20 });
  const lie = new THREE.MeshPhongMaterial({ color: 0xffe2b0, emissive: 0xffb35c, emissiveIntensity: 0.55, shininess: 12 });
  function arch(x, z, material, tall) {
    const g = new THREE.Group();
    const post = new THREE.BoxGeometry(0.16, tall, 0.16);
    const lintel = new THREE.BoxGeometry(1.7, 0.18, 0.2);
    const a = new THREE.Mesh(post, material);
    const b = new THREE.Mesh(post, material);
    const c = new THREE.Mesh(lintel, material);
    a.position.set(-0.78, tall / 2, 0);
    b.position.set(0.78, tall / 2, 0);
    c.position.set(0, tall, 0);
    g.add(a, b, c);
    g.position.set((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
    scene.add(g);
  }
  findChar(world, "G").forEach((p) => arch(p.x, p.z, accent, 3.15));
  findChar(world, "F").forEach((p) => arch(p.x, p.z, lie, 3.15));

  const spawn = findChar(world, "S")[0];
  const artMat = new THREE.MeshBasicMaterial({ color: 0x222 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.05), artMat);
  const px = (spawn.x + 0.5) * CELL;
  const pz = (spawn.z + 0.5) * CELL;
  const yaw0 = world.spawnYaw || 0;
  const fx = Math.sin(yaw0);
  const fz = -Math.cos(yaw0);
  art.position.set(px - fx * 1.05, 1.55, pz - fz * 1.05);
  art.lookAt(px - fx * 3, 1.55, pz - fz * 3);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.2, 0.06), new THREE.MeshPhongMaterial({ color: 0x4a3018, shininess: 10 }));
  frame.position.copy(art.position);
  frame.quaternion.copy(art.quaternion);
  frame.translateZ(-0.04);
  scene.add(frame);
  scene.add(art);
  new THREE.TextureLoader().load(world.theme.art, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    artMat.map = tex;
    artMat.color.set(0xffffff);
    artMat.needsUpdate = true;
  });

  addProps(scene, world);

  const n = coarse ? 36 : 70;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const spanX = world.grid[0].length * CELL;
  const spanZ = world.grid.length * CELL;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * spanX;
    pos[i * 3 + 1] = Math.random() * CEIL;
    pos[i * 3 + 2] = Math.random() * spanZ;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(geo, new THREE.PointsMaterial({
    color: world.theme.particles === "snow" ? 0xeef3f8 : world.theme.accent,
    size: coarse ? 0.055 : 0.04,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  }));
  particles.userData.hi = CEIL;
  scene.add(particles);

  scene.background = new THREE.Color(world.theme.sky);
  scene.fog = new THREE.Fog(world.theme.fog, style.outdoor ? 16 : 7, style.outdoor ? 56 : 32);

  return { doors, plaques, particles, shell };
}
