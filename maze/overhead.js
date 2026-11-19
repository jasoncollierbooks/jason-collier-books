/* Overhead maze. North is up. Walls are tall stone seen from above:
   a lit cap, a darker face, moss, and ivy into the corridor.
   Puzzle data is only used to mark what the player can already see. */
import { CELL, FACE, angDiff, center, blocked } from "./logic.js";

const skirts = new WeakMap();

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

const PAL = {
  trail:    { void: "#1c140e", fog: "#2a1c12", floor: "#7a5434", alt: "#6a482c", grout: "#3a2818", stone: "#a89884", dark: "#5c4e42", moss: "#3e6a38", ivy: "#2c5a30", gold: "#e4c27a", glow: "255,180,90" },
  pine:     { void: "#12180f", fog: "#1a2416", floor: "#4d5c38", alt: "#3f4e2e", grout: "#24301c", stone: "#8b917f", dark: "#4a5244", moss: "#2f7a3c", ivy: "#1d5a28", gold: "#d7e2a4", glow: "210,230,150" },
  mountain: { void: "#0c1218", fog: "#141c26", floor: "#d7e0ea", alt: "#c5d0dc", grout: "#8ea0b0", stone: "#7d8b98", dark: "#3c4c5c", moss: "#3d6844", ivy: "#2a4c34", gold: "#f2e2b4", glow: "220,230,255" },
  rusty:    { void: "#160e0c", fog: "#241612", floor: "#5a3a30", alt: "#4a3028", grout: "#2a1814", stone: "#a06848", dark: "#5a3428", moss: "#3a6840", ivy: "#6a3830", gold: "#e0b070", glow: "255,170,90" },
  pulse:    { void: "#0c0816", fog: "#160e24", floor: "#2c1848", alt: "#241440", grout: "#140a22", stone: "#7a68a0", dark: "#3a2860", moss: "#3a5078", ivy: "#9070d0", gold: "#e0d0ff", glow: "190,160,255" },
  thorne:   { void: "#0c1412", fog: "#14201c", floor: "#c5cfc4", alt: "#b4c0b2", grout: "#6a7870", stone: "#9aa198", dark: "#4a544e", moss: "#2a6844", ivy: "#1a5840", gold: "#d8f0c8", glow: "180,240,200" },
  seeders:  { void: "#061410", fog: "#0c2218", floor: "#1c4032", alt: "#163628", grout: "#0c281c", stone: "#6e8c7c", dark: "#244840", moss: "#1e8a52", ivy: "#3ec888", gold: "#c8ffe0", glow: "120,230,180" },
  envoy:    { void: "#07060e", fog: "#100e18", floor: "#16141e", alt: "#1e1a2a", grout: "#0a0810", stone: "#4a4658", dark: "#221e2c", moss: "#2a4038", ivy: "#8060a8", gold: "#d0d4ff", glow: "180,170,255" },
  meta:     { void: "#100e0c", fog: "#1c1612", floor: "#3a2a1c", alt: "#4a3422", grout: "#24180e", stone: "#7a604c", dark: "#3a2c22", moss: "#3a5830", ivy: "#c4a060", gold: "#e6c878", glow: "255,210,140" },
};

function unit(x, z, salt) {
  let n = Math.imul(x + salt * 19, 374761393) ^ Math.imul(z + salt * 7, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) % 1000 / 1000;
}

function roundRect(g, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function openCell(world, flags, x, z) {
  return !blocked(world, x, z, flags);
}

export function createOverhead(canvas) {
  let camX = 0;
  let camZ = 0;
  let scale = 28;
  let target = 28;
  let fit = false;
  let snapped = false;
  const dprCap = 2;

  function cssSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function levels(world) {
    const { w, h } = cssSize();
    const cols = world.grid[0].length;
    const rows = world.grid.length;
    const closeCells = Math.min(w, h) < 720 ? 10.5 : 14.5;
    const close = Math.min(w, h) / closeCells / CELL;
    const fitScale = Math.min((w - 28) / (cols * CELL), (h - 28) / (rows * CELL));
    return { w, h, cols, rows, close, fitScale };
  }

  function resize() {
    const { w, h } = cssSize();
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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
      const k = 1 - Math.exp(-6 * dt);
      scale += (want - scale) * k;
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
    target = Math.min(m.close * 1.85, Math.max(m.fitScale, value));
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
    target = Math.min(m.close * 1.85, Math.max(m.fitScale, base * factor));
  }

  function draw(world, state, extras) {
    const { w, h, dpr } = resize();
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = PAL[world.id] || PAL.trail;
    const cols = world.grid[0].length;
    const rows = world.grid.length;
    const cell = scale * CELL;
    const seen = state.seen || {};
    const known = state.knownWall || {};
    const skirt = skirtOf(world);
    const flags = state.flags || {};
    const clock = extras.clock || 0;
    const reduce = !!extras.reduce;

    g.fillStyle = pal.void;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = "rgba(255,255,255,0.015)";
      g.beginPath();
      g.ellipse((unit(i, 3, 1) * w), unit(i, 9, 2) * h, 80, 40, 0, 0, 7);
      g.fill();
    }

    const origin = project(0, 0, w, h);
    function cellRect(x, z) {
      return { x: origin.x + x * cell, y: origin.y + z * cell, s: cell };
    }

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const key = x + "," + z;
        if (!seen[key]) continue;
        if (!openCell(world, flags, x, z) && world.grid[z][x] !== "F") continue;
        const r = cellRect(x, z);
        if (r.x > w || r.y > h || r.x + r.s < 0 || r.y + r.s < 0) continue;
        drawFloor(g, r.x, r.y, r.s + 0.6, pal, x, z);
        if (state.stirred && state.stirred[key]) {
          g.strokeStyle = "rgba(212,175,55,0.85)";
          g.lineWidth = Math.max(1, cell * 0.06);
          g.strokeRect(r.x + 2, r.y + 2, r.s - 4, r.s - 4);
        }
        if (state.folded && state.folded[key]) {
          g.strokeStyle = "rgba(120,80,170,0.8)";
          g.lineWidth = Math.max(1, cell * 0.05);
          g.beginPath();
          g.arc(r.x + r.s / 2, r.y + r.s / 2, r.s * 0.22, 0, Math.PI * 2);
          g.stroke();
        }
      }
    }

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const key = x + "," + z;
        if (skirt.has(key)) continue;
        const ch = world.grid[z][x];
        const shut = ch === "#" || (ch === "+" && !flags[world.door]) || (ch === "=" && !flags[world.door2]);
        if (!shut || !known[key]) continue;
        const r = cellRect(x, z);
        if (r.x > w + cell || r.y > h + cell || r.x + r.s < -cell || r.y + r.s < -cell) continue;
        drawStone(g, r.x, r.y, r.s, pal, x, z, ch === "#" ? "" : "door");
      }
    }

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const key = x + "," + z;
        if (skirt.has(key) || !known[key]) continue;
        const ch = world.grid[z][x];
        const shut = ch === "#" || (ch === "+" && !flags[world.door]) || (ch === "=" && !flags[world.door2]);
        if (!shut) continue;
        const r = cellRect(x, z);
        drawIvy(g, r.x, r.y, r.s, pal, x, z, world, flags, seen);
      }
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
    if (world.grid) {
      for (let z = 0; z < rows; z++) {
        for (let x = 0; x < cols; x++) {
          if (world.grid[z][x] !== "F" || !seen[x + "," + z]) continue;
          const r = cellRect(x, z);
          drawArch(g, r.x + r.s / 2, r.y + r.s / 2, r.s * 0.85, "rgba(90,40,30,0.7)");
        }
      }
    }

    const way = extras.way;
    const here = extras.here;
    for (const t of world.tokens || []) {
      if (!seen[t.x + "," + t.z]) continue;
      const showLetter = letterVisible(t, state);
      const r = cellRect(t.x, t.z);
      const hot = way && way.target && way.target.id === t.id;
      drawMark(g, r.x + r.s / 2, r.y + r.s / 2, r.s, t, showLetter, hot, !!(t.letter && state.found[t.id]));
    }
    for (const s of world.signs || []) {
      if (!seen[s.x + "," + s.z]) continue;
      const r = cellRect(s.x, s.z);
      drawScroll(g, r.x + r.s / 2, r.y + r.s / 2, r.s);
    }

    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const key = x + "," + z;
        if (skirt.has(key) || seen[key] || known[key]) continue;
        const r = cellRect(x, z);
        if (r.x > w || r.y > h || r.x + r.s < 0 || r.y + r.s < 0) continue;
        const edge = seen[(x + 1) + "," + z] || seen[(x - 1) + "," + z] || seen[x + "," + (z + 1)] || seen[x + "," + (z - 1)];
        g.fillStyle = edge ? "rgba(8,6,5,0.55)" : pal.fog;
        g.fillRect(r.x, r.y, r.s + 0.6, r.s + 0.6);
      }
    }

    if (extras.guide && way && way.path) {
      way.path.slice(1, 4).forEach((step, i) => {
        if (!seen[step[0] + "," + step[1]]) return;
        const spot = center(step[0], step[1]);
        const p = project(spot.x, spot.z, w, h);
        const bob = reduce ? 0 : Math.sin(clock * 3 + i) * cell * 0.04;
        drawCrumb(g, p.x, p.y + bob, cell, i);
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

    if (state.light) {
      const glow = g.createRadialGradient(player.x, player.y, cell * 0.2, player.x, player.y, cell * 3.4);
      glow.addColorStop(0, "rgba(" + pal.glow + ",0.28)");
      glow.addColorStop(1, "rgba(" + pal.glow + ",0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(player.x, player.y, cell * 3.4, 0, Math.PI * 2);
      g.fill();
    }

    if (extras.lookingUp) {
      g.fillStyle = "rgba(12,10,8,0.42)";
      g.fillRect(0, 0, w, h);
      for (const t of world.tokens || []) {
        if (t.kind !== "pitch" || !seen[t.x + "," + t.z]) continue;
        const r = cellRect(t.x, t.z);
        g.strokeStyle = pal.gold;
        g.lineWidth = Math.max(2, cell * 0.06);
        g.beginPath();
        g.arc(r.x + r.s / 2, r.y + r.s / 2, r.s * 0.34, 0, Math.PI * 2);
        g.stroke();
        if (letterVisible(t, state)) {
          g.fillStyle = "#fbf6ee";
          g.font = "700 " + Math.max(14, cell * 0.42) + "px Georgia, serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(t.letter, r.x + r.s / 2, r.y + r.s / 2);
        }
      }
    }

    drawCompass(g, h, Math.min(w, h) < 720);
  }

  return {
    resize,
    follow,
    draw,
    reset,
    screenToWorld,
    worldToScreen,
    setFit,
    setScale,
    nudge,
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
  if (state.found[t.id]) return true;
  if (t.kind === "lantern") return !!state.light;
  if (t.kind === "pitch") return state.pitch < -0.62;
  if (t.kind === "angle") return angDiff(state.yaw, FACE[t.face] || 0) < 0.55;
  return true;
}

function drawFloor(g, x, y, s, pal, cx, cz) {
  g.fillStyle = unit(cx, cz, 2) > 0.55 ? pal.floor : pal.alt;
  g.fillRect(x, y, s, s);
  g.strokeStyle = pal.grout;
  g.globalAlpha = 0.45;
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  g.globalAlpha = 0.18;
  g.beginPath();
  g.moveTo(x + s * unit(cx, cz, 4), y + 2);
  g.lineTo(x + s * unit(cx, cz, 5), y + s - 2);
  g.stroke();
  g.globalAlpha = 1;
  if (unit(cx, cz, 6) > 0.72) {
    g.fillStyle = pal.moss;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.ellipse(x + s * 0.2, y + s * 0.8, s * 0.12, s * 0.06, 0.4, 0, 7);
    g.fill();
    g.globalAlpha = 1;
  }
}

function drawStone(g, x, y, s, pal, cx, cz, kind) {
  const face = s * 0.34;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(x + s * 0.12, y + s * 0.2, s * 0.92, s * 0.92);
  g.fillStyle = pal.dark;
  g.fillRect(x, y, s + 0.5, s + 0.5);
  g.fillStyle = tint(pal.dark, -18);
  g.fillRect(x + s * 0.78, y, s * 0.22, s);
  g.fillStyle = tint(pal.stone, (unit(cx, cz, 8) - 0.5) * 22);
  g.fillRect(x + 1, y + 1, s - 2, s - face);
  g.fillStyle = "rgba(255,255,255,0.22)";
  g.fillRect(x + 2, y + 2, s * 0.45, Math.max(2, s * 0.06));
  g.strokeStyle = "rgba(50,36,24,0.45)";
  g.lineWidth = 1;
  g.beginPath();
  const crack = y + s * (0.18 + unit(cx, cz, 9) * 0.28);
  g.moveTo(x + s * 0.12, crack);
  g.lineTo(x + s * 0.7, crack + s * 0.08);
  g.stroke();
  g.fillStyle = pal.moss;
  g.globalAlpha = 0.92;
  g.beginPath();
  g.ellipse(x + s * (0.25 + unit(cx, cz, 11) * 0.4), y + s * 0.16, s * 0.16, s * 0.07, 0.2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(x + s * 0.62, y + (s - face) - s * 0.02, s * 0.22, s * 0.06, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  if (kind === "door") {
    g.fillStyle = "rgba(24,14,8,0.78)";
    g.fillRect(x + s * 0.28, y + s * 0.18, s * 0.44, s * 0.34);
    g.strokeStyle = pal.gold;
    g.lineWidth = Math.max(1.5, s * 0.045);
    g.strokeRect(x + s * 0.28, y + s * 0.18, s * 0.44, s * 0.34);
  }
}

function tint(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.min(255, ((n >> shift) & 255) + delta));
  return "rgb(" + (ch(16) | 0) + "," + (ch(8) | 0) + "," + (ch(0) | 0) + ")";
}

function drawIvy(g, x, y, s, pal, cx, cz, world, flags, seen) {
  const sides = [
    { dx: 0, dz: -1, ox: 0.35, oy: 0.12, ix: 0.05, iy: -0.42 },
    { dx: 1, dz: 0, ox: 0.84, oy: 0.4, ix: 0.46, iy: 0.08 },
    { dx: 0, dz: 1, ox: 0.62, oy: 0.86, ix: -0.06, iy: 0.48 },
    { dx: -1, dz: 0, ox: 0.14, oy: 0.55, ix: -0.48, iy: 0.04 },
  ];
  sides.forEach((side, i) => {
    const nx = cx + side.dx;
    const nz = cz + side.dz;
    if (!seen[nx + "," + nz] || !openCell(world, flags, nx, nz)) return;
    if (unit(cx, cz, 50 + i) < 0.35) return;
    const x0 = x + s * (side.ox + (unit(cx, cz, 60 + i) - 0.5) * 0.2);
    const y0 = y + s * side.oy;
    const x1 = x0 + s * side.ix;
    const y1 = y0 + s * side.iy;
    g.strokeStyle = pal.ivy;
    g.lineWidth = Math.max(1.6, s * 0.055);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + s * 0.08, (y0 + y1) / 2, x1, y1);
    g.stroke();
    g.fillStyle = pal.moss;
    g.beginPath();
    g.ellipse(x1, y1, s * 0.09, s * 0.05, i, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x1 - s * side.ix * 0.35, y1 - s * side.iy * 0.35, s * 0.06, s * 0.035, i + 1, 0, Math.PI * 2);
    g.fill();
  });
}

function drawOneWay(g, x, y, s, dx, dz) {
  const ang = Math.atan2(dz, dx);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = "rgba(42,110,170,0.9)";
  g.beginPath();
  g.moveTo(s * 0.22, 0);
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
  const r = s * (hot ? 0.28 : 0.22);
  g.fillStyle = found ? "#8a7048" : "#e0b04a";
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r * 0.85, y);
  g.lineTo(x, y + r);
  g.lineTo(x - r * 0.85, y);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(20,12,8,0.65)";
  g.lineWidth = 1;
  g.stroke();
  if (showLetter && token.letter) {
    g.fillStyle = "#1a120c";
    g.font = "700 " + Math.max(10, s * 0.34) + "px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(token.letter, x, y + 0.5);
  }
}

function drawScroll(g, x, y, s) {
  g.fillStyle = "#f0e2c0";
  roundRect(g, x - s * 0.16, y - s * 0.12, s * 0.32, s * 0.24, s * 0.04);
  g.fill();
  g.strokeStyle = "#5c3b22";
  g.lineWidth = 1;
  g.stroke();
}

function drawCrumb(g, x, y, s, i) {
  const rad = s * (0.09 - i * 0.012);
  g.fillStyle = "rgba(255, 210, 90, 0.35)";
  g.beginPath();
  g.arc(x, y, rad * 2.1, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffd56a";
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.65)";
  g.beginPath();
  g.arc(x - rad * 0.25, y - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
  g.fill();
}

function drawGoalArrow(g, x, y, ang, s, clock, reduce) {
  const pulse = reduce ? 0 : Math.sin(clock * 2.4) * s * 0.04;
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.translate(s * 0.62 + pulse, 0);
  g.globalAlpha = 0.82;
  g.fillStyle = "#f0c14a";
  g.beginPath();
  g.moveTo(s * 0.28, 0);
  g.lineTo(-s * 0.08, s * 0.16);
  g.lineTo(-s * 0.02, 0);
  g.lineTo(-s * 0.08, -s * 0.16);
  g.closePath();
  g.fill();
  g.restore();
}

function drawPerson(g, person, x, y, cell, clock, reduce, speaking) {
  const img = person.img && person.img.ready;
  const aspect = person.aspect || 0.4;
  const scale = person.scale || 1;
  const talking = speaking && speaking.id === person.id;
  const h = cell * 2.55 * scale * (talking ? 1.05 : 1);
  const w = h * aspect;
  const bob = reduce ? 0 : Math.sin(clock * 2.1 + (person.bob || 0)) * cell * 0.06;
  const sway = reduce ? 0 : Math.sin(clock * (person.pacing ? 5.2 : 1.3) + (person.bob || 0)) * (person.pacing ? 0.08 : 0.02);
  g.save();
  g.translate(x, y + bob);
  g.rotate(sway);
  g.fillStyle = "rgba(0,0,0,0.38)";
  g.beginPath();
  g.ellipse(0, h * 0.46, Math.max(cell * 0.28, w * 0.55), cell * 0.11, 0, 0, Math.PI * 2);
  g.fill();
  if (img) g.drawImage(img, -w / 2, -h * 0.52, w, h);
  else drawFrame(g, person, w, h);
  g.restore();
}

function drawFrame(g, person, w, h) {
  g.fillStyle = "#1a120c";
  roundRect(g, -w / 2 - 3, -h * 0.52 - 3, w + 6, h + 6, 6);
  g.fill();
  const art = person.art && person.art.ready;
  if (art && person.crop) {
    const iw = art.naturalWidth || art.width;
    const ih = art.naturalHeight || art.height;
    const c = person.crop;
    g.drawImage(art, c[0] * iw, c[1] * ih, c[2] * iw, c[3] * ih, -w / 2, -h * 0.52, w, h);
  } else {
    g.fillStyle = "#c4a574";
    g.fillRect(-w / 2, -h * 0.52, w, h);
  }
}

function drawWalker(g, x, y, yaw, moving, clock, light, cell, reduce) {
  const bob = reduce ? 0 : (moving ? Math.sin(clock * 11) * cell * 0.07 : Math.sin(clock * 2) * cell * 0.02);
  const step = reduce || !moving ? 0 : Math.sin(clock * 11) * cell * 0.06;
  g.save();
  g.translate(x, y + bob);
  g.rotate(yaw);
  g.fillStyle = "rgba(0,0,0,0.4)";
  g.beginPath();
  g.ellipse(0, cell * 0.06, cell * 0.22, cell * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f4e6c4";
  g.beginPath();
  g.ellipse(-cell * 0.1, cell * 0.16, cell * 0.06, cell * 0.04, 0, 0, 7);
  g.ellipse(cell * 0.1 + step, cell * 0.16, cell * 0.06, cell * 0.04, 0, 0, 7);
  g.fill();
  g.fillStyle = "#6b3a28";
  roundRect(g, -cell * 0.2, -cell * 0.36, cell * 0.4, cell * 0.5, cell * 0.1);
  g.fill();
  g.fillStyle = "#1a120c";
  g.beginPath();
  g.arc(0, -cell * 0.34, cell * 0.11, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = light ? "#ffd56a" : "#fbf6ee";
  g.beginPath();
  g.moveTo(0, -cell * 0.58);
  g.lineTo(cell * 0.09, -cell * 0.4);
  g.lineTo(-cell * 0.09, -cell * 0.4);
  g.closePath();
  g.fill();
  if (light) {
    g.fillStyle = "rgba(255,190,80,0.9)";
    g.beginPath();
    g.arc(cell * 0.2, -cell * 0.02, cell * 0.05, 0, 7);
    g.fill();
  }
  g.restore();
}

function drawCompass(g, h, phone) {
  const x = 36;
  const y = h - (phone ? 118 : 46);
  g.save();
  g.translate(x, y);
  g.fillStyle = "rgba(16,14,12,0.78)";
  g.beginPath();
  g.arc(0, 0, 15, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#d4af37";
  g.lineWidth = 1;
  g.stroke();
  g.fillStyle = "#c47a18";
  g.beginPath();
  g.moveTo(0, -9);
  g.lineTo(3.5, 2);
  g.lineTo(-3.5, 2);
  g.closePath();
  g.fill();
  g.fillStyle = "#fbf6ee";
  g.font = "700 9px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("N", 0, 6);
  g.restore();
}
