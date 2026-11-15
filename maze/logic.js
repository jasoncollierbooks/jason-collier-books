/* Maze rules, separate from the renderer so a maze can be walked and checked. */
export const CELL = 2;
export const RADIUS = 0.34;
export const SPEED = 3.55;

export const FACE = {
  north: 0,
  east: Math.PI / 2,
  south: Math.PI,
  west: -Math.PI / 2,
};

export function shiftLetter(ch, n) {
  const a = ch.toUpperCase().charCodeAt(0) - 65;
  return String.fromCharCode(65 + ((a + n) % 26 + 26) % 26);
}

export function cellOf(px, pz) {
  return { x: Math.floor(px / CELL), z: Math.floor(pz / CELL) };
}

export function center(x, z) {
  return { x: (x + 0.5) * CELL, z: (z + 0.5) * CELL };
}

export function findChar(world, ch) {
  const out = [];
  for (let z = 0; z < world.grid.length; z++) {
    for (let x = 0; x < world.grid[z].length; x++) {
      if (world.grid[z][x] === ch) out.push({ x, z });
    }
  }
  return out;
}

export function blocked(world, x, z, flags) {
  const h = world.grid.length;
  const w = world.grid[0].length;
  if (x < 0 || z < 0 || x >= w || z >= h) return true;
  const c = world.grid[z][x];
  if (c === "#") return true;
  if (c === "+" && !(flags && flags[world.door])) return true;
  if (c === "=" && !(flags && flags[world.door2])) return true;
  return false;
}

function circleHits(world, flags, px, pz) {
  const minX = Math.floor((px - RADIUS) / CELL);
  const maxX = Math.floor((px + RADIUS) / CELL);
  const minZ = Math.floor((pz - RADIUS) / CELL);
  const maxZ = Math.floor((pz + RADIUS) / CELL);
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      if (!blocked(world, x, z, flags)) continue;
      const x0 = x * CELL;
      const z0 = z * CELL;
      const cx = Math.max(x0, Math.min(px, x0 + CELL));
      const cz = Math.max(z0, Math.min(pz, z0 + CELL));
      const dx = px - cx;
      const dz = pz - cz;
      if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
    }
  }
  return false;
}

export function portalDest(world, state, x, z) {
  const p = (world.portals || []).find((q) => q.x === x && q.z === z);
  if (!p) return null;
  if (p.unlessFlag && state.flags[p.unlessFlag]) return null;
  if (p.lit || p.dark) return state.light ? p.lit : p.dark;
  return p.always || null;
}

function note(state, text) {
  if (!text) return;
  state.notes.push(text);
  if (state.notes.length > 48) state.notes.splice(0, state.notes.length - 48);
  state.msg = text;
}

export function cueLine(state, text) {
  if (!text) return;
  if (!state.cue) state.cue = [];
  state.cue.push(text);
}

function enterCell(world, state, x, z) {
  const k = x + "," + z;
  if (state.stood === k) return;
  state.stood = k;
  const dest = portalDest(world, state, x, z);
  if (!dest) return;
  if (dest.set) state.flags[dest.set] = true;
  if (dest.decoy) {
    note(state, dest.decoy);
    cueLine(state, dest.decoy);
  }
  if (dest.note) {
    note(state, dest.note);
    cueLine(state, dest.note);
  }
  if (!dest.pass) {
    if (!state.folded) state.folded = {};
    state.folded[x + "," + z] = 1;
    const c = center(dest.toX, dest.toZ);
    state.px = c.x;
    state.pz = c.z;
    state.stood = dest.toX + "," + dest.toZ;
    state.yaw = dest.yaw != null ? dest.yaw : state.yaw;
  }
}

export function createState(world) {
  const spawn = findChar(world, "S")[0];
  const c = center(spawn.x, spawn.z);
  return {
    px: c.x,
    pz: c.z,
    yaw: world.spawnYaw || 0,
    pitch: 0,
    light: false,
    flags: {},
    found: {},
    cycle: {},
    notes: [],
    read: {},
    seen: {},
    knownWall: {},
    folded: {},
    stirred: {},
    talk: {},
    heard: {},
    cue: [],
    hintTier: 0,
    goalId: "",
    cleared: false,
    stood: spawn.x + "," + spawn.z,
    msg: world.intro,
  };
}

function slide(world, state, mx, mz) {
  if (!mx && !mz) return;
  if (!circleHits(world, state.flags, state.px + mx, state.pz + mz)) {
    if (mx) state.px += mx;
    if (mz) state.pz += mz;
    return;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 5; i++) {
    const mid = (lo + hi) / 2;
    if (!circleHits(world, state.flags, state.px + mx * mid, state.pz + mz * mid)) lo = mid;
    else hi = mid;
  }
  if (mx) state.px += mx * lo;
  if (mz) state.pz += mz * lo;
}

export function movePlayer(world, state, mx, mz) {
  slide(world, state, mx, 0);
  slide(world, state, 0, mz);
  const c = cellOf(state.px, state.pz);
  enterCell(world, state, c.x, c.z);
}

function distTo(state, x, z) {
  const c = center(x, z);
  const dx = state.px - c.x;
  const dz = state.pz - c.z;
  return Math.hypot(dx, dz);
}

function entities(world) {
  const list = [];
  for (const t of world.tokens || []) list.push(Object.assign({ etype: "token" }, t));
  for (const s of world.signs || []) list.push(Object.assign({ etype: "sign" }, s));
  const g = findChar(world, "G")[0];
  if (g) list.push({ etype: "gate", x: g.x, z: g.z, id: "gate" });
  return list;
}

export function nearest(world, state) {
  let best = null;
  let bestD = 1.7;
  for (const e of entities(world)) {
    const d = distTo(state, e.x, e.z);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

export function nextGoal(world, state) {
  for (const t of world.tokens || []) {
    if (t.blocks && t.flag && !state.flags[t.flag]) return t;
    if (t.letter && !state.found[t.id]) return t;
  }
  return null;
}

function syncGoal(world, state) {
  const g = nextGoal(world, state);
  const id = g ? g.id : "cipher";
  if (state.goalId && state.goalId !== id) state.hintTier = 0;
  state.goalId = id;
}

export function letterProgress(world, state) {
  const letters = (world.tokens || []).filter((t) => t.letter);
  const have = letters.filter((t) => state.found[t.id]).length;
  return { have, need: letters.length };
}

export function objective(world, state) {
  if (state.cleared) return world.goals.done;
  const g = nextGoal(world, state);
  if (!g) return world.goals.cipher;
  const prog = letterProgress(world, state);
  if (prog.have === 0 && world.goals.start) return world.goals.start;
  return g.goal || world.goals.start;
}

function facingOk(state, token) {
  if (token.kind === "angle") return angDiff(state.yaw, FACE[token.face] || 0) < 0.55;
  if (token.kind === "pitch") return state.pitch < -0.62;
  return true;
}

export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function takeLetter(state, token) {
  state.found[token.id] = token.letter;
  if (token.flag) state.flags[token.flag] = true;
  note(state, token.text);
  return { found: token.letter, msg: token.text };
}

export function interact(world, state) {
  const e = nearest(world, state);
  if (!e) return { msg: "Nothing here you can use." };
  if (e.etype === "gate") return { ui: "code" };
  if (e.etype === "sign") {
    if (e.need === "lantern" && !state.light) {
      return { msg: "The sheet is blank until the lantern is on it." };
    }
    state.read[e.id] = true;
    note(state, e.title + ". " + e.body);
    return { ui: "read", title: e.title, body: e.body };
  }
  const token = e;
  if (token.kind === "trap") {
    const spawn = findChar(world, "S")[0];
    const c = center(spawn.x, spawn.z);
    state.px = c.x;
    state.pz = c.z;
    state.stood = spawn.x + "," + spawn.z;
    note(state, token.text);
    return { msg: token.text, trap: true };
  }
  if (token.kind === "cycle") {
    const i = ((state.cycle[token.id] ?? -1) + 1) % token.values.length;
    state.cycle[token.id] = i;
    const val = token.values[i];
    state.flags[token.flag] = val === token.open;
    const line = token.lines[val];
    note(state, line);
    syncGoal(world, state);
    return { msg: line };
  }
  if (token.kind === "lantern" && !state.light) {
    return { msg: token.dark || "The carving stays dark." };
  }
  if ((token.kind === "angle" || token.kind === "pitch") && !facingOk(state, token)) {
    return { msg: token.smear || "The cuts are a smear from this angle." };
  }
  if (token.letter && state.found[token.id]) {
    return { msg: "You already hold that letter." };
  }
  const res = token.letter ? takeLetter(state, token) : { msg: token.text };
  if (!token.letter && token.flag) state.flags[token.flag] = true;
  if (!token.letter) note(state, token.text);
  syncGoal(world, state);
  return res;
}

export function lettersHeld(world, state) {
  const out = [];
  for (const t of world.tokens || []) {
    if (t.letter && state.found[t.id]) out.push({ letter: t.letter, tag: t.tag || t.letter, id: t.id });
  }
  return out;
}

export function submitCode(world, state, raw) {
  const code = String(raw || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!world.freeCode) {
    const need = (world.tokens || []).filter((t) => t.letter);
    if (!need.every((t) => state.found[t.id])) {
      return { ok: false, reason: "missing", msg: "The gate can feel a letter you have not found." };
    }
  }
  if (code !== world.code) {
    return { ok: false, reason: "wrong", msg: world.wrong || "The gate does not take that." };
  }
  state.cleared = true;
  note(state, world.win);
  return { ok: true, msg: world.win, shown: world.shown, brand: world.brand };
}

export function hintFor(world, state) {
  const tier = Math.max(0, Math.min(2, state.hintTier));
  state.hintTier = Math.min(2, state.hintTier + 1);
  const g = nextGoal(world, state);
  const text = g ? g.hints[tier] : (world.cipherHints || world.goals.cipherHints)[tier];
  note(state, "Hint. " + text);
  return { tier, text };
}

export function routeCells(world, state, sx, sz, tx, tz) {
  const key = (x, z) => x + "," + z;
  const q = [[sx, sz]];
  const prev = new Map();
  prev.set(key(sx, sz), null);
  while (q.length) {
    const [x, z] = q.shift();
    if (x === tx && z === tz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = key(nx, nz);
      if (prev.has(k)) continue;
      if (blocked(world, nx, nz, state.flags)) continue;
      const dest = portalDest(world, state, nx, nz);
      if (dest && !dest.pass) continue;
      prev.set(k, [x, z]);
      q.push([nx, nz]);
    }
  }
  if (!prev.has(key(tx, tz))) return null;
  const path = [];
  let cur = [tx, tz];
  while (cur) {
    path.push(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  path.reverse();
  return path;
}

/* +x is east, +z is south. North is the facing at yaw 0. */
export function cardinal(dx, dz) {
  if (!dx && !dz) return "";
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? "east" : "west";
  return dz > 0 ? "south" : "north";
}

export function guideTarget(world, state) {
  if (!world || !state || state.cleared) return null;
  const g = nextGoal(world, state);
  if (g) return { x: g.x, z: g.z, id: g.id, kind: g.letter ? "letter" : "mark", label: g.tag || "the next mark" };
  const gate = findChar(world, "G")[0];
  if (!gate) return null;
  return { x: gate.x, z: gate.z, id: "gate", kind: "gate", label: "the gate" };
}

export function wayFrom(world, state, x, z) {
  const target = guideTarget(world, state);
  if (!target) return null;
  const path = routeCells(world, state, x, z, target.x, target.z);
  if (!path || path.length < 2) return { target, dir: "", path: path || [] };
  return {
    target,
    dir: cardinal(path[1][0] - path[0][0], path[1][1] - path[0][1]),
    path,
  };
}

export function walkTo(world, state, tx, tz) {
  const start = cellOf(state.px, state.pz);
  const path = routeCells(world, state, start.x, start.z, tx, tz);
  if (!path) return false;
  for (const [x, z] of path) {
    const step = 0.18;
    const goal = center(x, z);
    for (let n = 0; n < 40; n++) {
      const dx = goal.x - state.px;
      const dz = goal.z - state.pz;
      const len = Math.hypot(dx, dz);
      if (len < 0.04) break;
      const m = Math.min(step, len);
      movePlayer(world, state, (dx / len) * m, (dz / len) * m);
    }
  }
  const at = cellOf(state.px, state.pz);
  return at.x === tx && at.z === tz;
}
