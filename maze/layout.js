/* Seeded mazes. The hand-drawn rooms are thrown out. Tokens, notes,
   and trick doors keep their rules and move onto branches of a real maze. */
import { createState, findChar, routeCells } from "./logic.js";

const SPEC = {
  trail:    { size: 23, mask: "oval",  cuts: [{ at: 0.52, role: "door" }] },
  pine:     { size: 25, mask: "knot",  cuts: [{ at: 0.56, role: "door" }] },
  mountain: { size: 25, mask: "peak",  cuts: [{ at: 0.40, role: "door" }, { at: 0.70, role: "litpass" }] },
  rusty:    { size: 27, mask: "hull",  cuts: [{ at: 0.46, role: "darkpass" }, { at: 0.64, role: "door" }] },
  pulse:    { size: 27, mask: "square", cuts: [{ at: 0.42, role: "door" }] },
  thorne:   { size: 29, mask: "square", cuts: [{ at: 0.40, role: "door" }, { at: 0.68, role: "litpass" }] },
  seeders:  { size: 29, mask: "knot",  cuts: [{ at: 0.58, role: "flagpass" }] },
  envoy:    { size: 31, mask: "disc", center: true, cuts: [{ at: 0.42, role: "darkpass" }, { at: 0.72, role: "door" }] },
};

/* Which branch each token or sign belongs on. 0 is before the first
   trick, then one segment per cut. */
const PLACE = {
  trail:    { 0: ["rope", "passage", "axle", "handbill"], 1: ["ox", "boards", "cipher"] },
  pine:     { 0: ["gold", "napkin", "hole", "paper", "pie"], 1: ["reward", "board", "cipher"] },
  mountain: { 0: ["campfire", "wade", "seven"], 1: ["spruce"], 2: ["tent", "camera", "cipher"] },
  rusty:    { 0: ["plate", "pipe", "dont", "mono"], 1: ["grate"], 2: ["crate", "cipher"] },
  pulse:    { 0: ["pedestal", "chalk", "quote", "begin"], 1: ["arch", "pocket", "ring", "cipher"] },
  thorne:   { 0: ["clip", "scope", "entry"], 1: ["trefoil"], 2: ["chamber", "shell", "cipher"] },
  seeders:  { 0: ["hull", "edge", "vein", "counts"], 1: ["circuit", "cipher"] },
  envoy:    { 0: ["fates", "shard", "counts"], 1: ["glass", "lens"], 2: ["bind", "cipher"] },
};

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function maskFn(name, n) {
  const cx = (n - 1) / 2;
  const cy = (n - 1) / 2;
  return function inside(i, j) {
    if (i < 0 || j < 0 || i >= n || j >= n) return false;
    if (name === "square") return true;
    if (name === "disc" || name === "knot") {
      const dx = i - cx;
      const dy = j - cy;
      return dx * dx + dy * dy <= (cx + 0.15) * (cx + 0.15);
    }
    if (name === "oval") {
      const dx = (i - cx) / (cx * 0.98 + 0.1);
      const dy = (j - cy) / (cy * 0.7 + 0.1);
      return dx * dx + dy * dy <= 1;
    }
    if (name === "hull") {
      const dx = (i - cx) / (cx * 0.92);
      const dy = (j - cy) / (cy * 0.58);
      return dx * dx + dy * dy <= 1;
    }
    if (name === "peak") {
      const t = n <= 1 ? 1 : j / (n - 1);
      const half = (0.18 + 0.9 * t) * cx;
      return Math.abs(i - cx) <= half + 0.02;
    }
    return true;
  };
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function cellOfRoom(i, j) {
  return { x: 1 + 2 * i, z: 1 + 2 * j };
}

function between(a, b) {
  return { x: 1 + a.i + b.i, z: 1 + a.j + b.j };
}

function portalRole(world, portal) {
  if (portal.lit && portal.dark) {
    if (portal.dark.pass && !(portal.lit && portal.lit.pass)) return "darkpass";
    if (portal.lit.pass && !(portal.dark && portal.dark.pass)) return "litpass";
  }
  if (portal.unlessFlag && world.id === "seeders") return "flagpass";
  return "fake";
}

function carvePerfect(size, inside, rand) {
  const n = (size - 1) >> 1;
  const grid = Array.from({ length: size }, () => Array(size).fill("#"));
  const open = (i, j) => inside(i, j);
  let si = 0;
  let sj = 0;
  let found = false;
  for (let j = 0; j < n && !found; j++) {
    for (let i = 0; i < n; i++) if (open(i, j)) { si = i; sj = j; found = true; break; }
  }
  const seen = new Set([si + "," + sj]);
  const stack = [[si, sj]];
  const links = new Set();
  const start = cellOfRoom(si, sj);
  grid[start.z][start.x] = ".";
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = shuffle(DIRS.map(([di, dj]) => [i + di, j + dj]), rand)
      .filter(([ni, nj]) => open(ni, nj) && !seen.has(ni + "," + nj));
    if (!next.length) { stack.pop(); continue; }
    const [ni, nj] = next[0];
    const wall = between({ i, j }, { i: ni, j: nj });
    grid[wall.z][wall.x] = ".";
    const room = cellOfRoom(ni, nj);
    grid[room.z][room.x] = ".";
    links.add([i, j, ni, nj].join(","));
    links.add([ni, nj, i, j].join(","));
    seen.add(ni + "," + nj);
    stack.push([ni, nj]);
  }
  return { grid, n, links, inside: open };
}

function roomGraph(n, links, inside) {
  const g = new Map();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) if (inside(i, j)) g.set(i + "," + j, []);
  }
  for (const key of links) {
    const [i, j, ni, nj] = key.split(",").map(Number);
    if ((ni > i) || (ni === i && nj > j)) continue;
    const a = g.get(i + "," + j);
    const b = g.get(ni + "," + nj);
    if (a && b) { a.push([ni, nj]); b.push([i, j]); }
  }
  return g;
}

function farthest(graph, si, sj) {
  const q = [[si, sj]];
  const dist = new Map([[si + "," + sj, 0]]);
  const prev = new Map([[si + "," + sj, null]]);
  let far = [si, sj];
  let best = 0;
  while (q.length) {
    const [i, j] = q.shift();
    const d = dist.get(i + "," + j);
    if (d > best) { best = d; far = [i, j]; }
    for (const [ni, nj] of graph.get(i + "," + j) || []) {
      const k = ni + "," + nj;
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      prev.set(k, [i, j]);
      q.push([ni, nj]);
    }
  }
  return { far, prev, dist };
}

function roomPath(prev, goal) {
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = prev.get(cur[0] + "," + cur[1]);
  }
  path.reverse();
  return path;
}

function cellsOn(rooms) {
  const out = [];
  for (let i = 0; i < rooms.length; i++) {
    const [ri, rj] = rooms[i];
    const cell = cellOfRoom(ri, rj);
    if (i > 0) out.push(between({ i: rooms[i - 1][0], j: rooms[i - 1][1] }, { i: ri, j: rj }));
    out.push(cell);
  }
  return out;
}

function key(x, z) { return x + "," + z; }

function neighbors(grid, x, z) {
  const out = [];
  for (const [dx, dz] of DIRS) {
    const nx = x + dx;
    const nz = z + dz;
    if (grid[nz] && grid[nz][nx] && grid[nz][nx] !== "#") out.push([nx, nz]);
  }
  return out;
}

function yawToward(dx, dz) {
  if (dx > 0) return Math.PI / 2;
  if (dx < 0) return -Math.PI / 2;
  if (dz > 0) return Math.PI;
  return 0;
}

export function weaveMaze(world) {
  const spec = SPEC[world.id];
  if (!spec) return;
  const rand = mulberry32(hash("collier-maze:" + world.id));
  const inside = maskFn(spec.mask, (spec.size - 1) >> 1);
  const carved = carvePerfect(spec.size, inside, rand);
  const { grid, n, links } = carved;
  const graph = roomGraph(n, links, inside);
  let si = 0;
  let sj = 0;
  if (spec.center) {
    const cx = (n - 1) / 2;
    const cy = (n - 1) / 2;
    let best = 1e9;
    for (const k of graph.keys()) {
      const [i, j] = k.split(",").map(Number);
      const d = (i - cx) * (i - cx) + (j - cy) * (j - cy);
      if (d < best) { best = d; si = i; sj = j; }
    }
  } else {
    let best = 1e9;
    for (const k of graph.keys()) {
      const [i, j] = k.split(",").map(Number);
      const score = i * 3 + Math.abs(j - (n - 1) / 2);
      if (score < best) { best = score; si = i; sj = j; }
    }
  }
  const far = farthest(graph, si, sj);
  const rooms = roomPath(far.prev, far.far);
  if (rooms.length < 4) throw new Error(world.id + " maze path is too short to place");
  const path = cellsOn(rooms);
  const pathAt = new Map(path.map((c, i) => [key(c.x, c.z), i]));
  const cuts = spec.cuts.map((cut) => {
    let index = Math.round(cut.at * (path.length - 1));
    index = Math.max(2, Math.min(path.length - 3, index));
    return { role: cut.role, index, x: path[index].x, z: path[index].z };
  });
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i].index <= cuts[i - 1].index) {
      cuts[i].index = Math.min(path.length - 3, cuts[i - 1].index + 2);
      cuts[i].x = path[cuts[i].index].x;
      cuts[i].z = path[cuts[i].index].z;
    }
  }
  const cutAt = new Set(cuts.map((c) => c.index));

  function segmentOf(index) {
    let s = 0;
    for (const cut of cuts) if (cut.index < index) s++;
    return s;
  }

  const pockets = [];
  for (let z = 1; z < spec.size - 1; z++) {
    for (let x = 1; x < spec.size - 1; x++) {
      if (grid[z][x] !== ".") continue;
      if (pathAt.has(key(x, z))) continue;
      if (neighbors(grid, x, z).length !== 1) continue;
      const join = nearestPath(grid, x, z, pathAt, cuts);
      if (join == null || cutAt.has(join)) continue;
      pockets.push({ x, z, segment: segmentOf(join) });
    }
  }
  shuffle(pockets, rand);

  const used = new Set(path.filter((_, i) => cutAt.has(i)).map((c) => key(c.x, c.z)));
  used.add(key(path[0].x, path[0].z));
  used.add(key(path[path.length - 1].x, path[path.length - 1].z));

  function take(segment) {
    const idx = pockets.findIndex((p) => p.segment === segment && !used.has(key(p.x, p.z)));
    if (idx >= 0) {
      const spot = pockets.splice(idx, 1)[0];
      used.add(key(spot.x, spot.z));
      return spot;
    }
    for (let z = 1; z < spec.size - 1; z++) {
      for (let x = 1; x < spec.size - 1; x++) {
        if (grid[z][x] === "#" || used.has(key(x, z)) || pathAt.has(key(x, z))) continue;
        const join = nearestPath(grid, x, z, pathAt, cuts);
        if (join == null || cutAt.has(join) || segmentOf(join) !== segment) continue;
        used.add(key(x, z));
        return { x, z, segment };
      }
    }
    throw new Error(world.id + " ran out of branch cells in segment " + segment);
  }

  const byId = new Map();
  for (const token of world.tokens || []) byId.set(token.id, token);
  for (const sign of world.signs || []) byId.set(sign.id, sign);
  const plan = PLACE[world.id] || {};
  for (const segment of Object.keys(plan)) {
    for (const id of plan[segment]) {
      const entity = byId.get(id);
      if (!entity) throw new Error(world.id + " has no entity " + id);
      const spot = take(Number(segment));
      entity.x = spot.x;
      entity.z = spot.z;
    }
  }

  const doorChar = world.door ? "+" : "=";
  for (const cut of cuts) {
    if (cut.role === "door") grid[cut.z][cut.x] = doorChar;
  }

  const specials = { darkpass: [], litpass: [], flagpass: [], fake: [] };
  for (const portal of world.portals || []) specials[portalRole(world, portal)].push(portal);
  for (const cut of cuts) {
    if (cut.role === "door") continue;
    const portal = specials[cut.role].shift();
    if (!portal) throw new Error(world.id + " missing a " + cut.role + " passage");
    movePortal(portal, cut.x, cut.z, path[0]);
    used.add(key(cut.x, cut.z));
  }
  for (const role of ["darkpass", "litpass", "flagpass"]) {
    if (specials[role].length) throw new Error(world.id + " has an unused " + role);
  }
  for (const portal of specials.fake) {
    const spot = carveSpur(grid, path, pathAt, cutAt, segmentOf, spec.size);
    if (!spot) throw new Error(world.id + " has nowhere to hang a false door");
    movePortal(portal, spot.x, spot.z, path[1] || path[0]);
    grid[spot.z][spot.x] = "F";
    used.add(key(spot.x, spot.z));
  }

  grid[path[0].z][path[0].x] = "S";
  grid[path[path.length - 1].z][path[path.length - 1].x] = "G";
  const next = path[1] || path[0];
  world.spawnYaw = yawToward(next.x - path[0].x, next.z - path[0].z);

  const loops = addLoops(grid, n, inside, links, rand, cuts, (i, j) => {
    const cell = cellOfRoom(i, j);
    const on = pathAt.get(key(cell.x, cell.z));
    if (on != null) return on;
    return nearestPath(grid, cell.x, cell.z, pathAt, cuts);
  });
  world.oneway = loops.slice(0, 3).map((edge) => ({
    x: edge.from.x,
    z: edge.from.z,
    dx: edge.to.x - edge.from.x,
    dz: edge.to.z - edge.from.z,
  })).concat(loops.slice(0, 3).map((edge) => ({
    x: edge.wall.x,
    z: edge.wall.z,
    dx: edge.to.x - edge.wall.x,
    dz: edge.to.z - edge.wall.z,
  })));

  world.grid = grid.map((row) => row.join(""));
  checkLayout(world);
}

function carveSpur(grid, path, pathAt, cutAt, segmentOf, size) {
  for (const cell of path) {
    const index = pathAt.get(key(cell.x, cell.z));
    if (cutAt.has(index) || segmentOf(index) !== 0) continue;
    for (const [dx, dz] of DIRS) {
      const nx = cell.x + dx;
      const nz = cell.z + dz;
      if (nx < 1 || nz < 1 || nx >= size - 1 || nz >= size - 1) continue;
      if (grid[nz][nx] !== "#") continue;
      const boxed = DIRS.every(([ex, ez]) => {
        if (nx + ex === cell.x && nz + ez === cell.z) return true;
        const ch = grid[nz + ez] && grid[nz + ez][nx + ex];
        return !ch || ch === "#";
      });
      if (!boxed) continue;
      return { x: nx, z: nz };
    }
  }
  return null;
}

function nearestPath(grid, x, z, pathAt, cuts) {
  const cut = new Set((cuts || []).map((c) => key(c.x, c.z)));
  const here = key(x, z);
  if (pathAt.has(here) && !cut.has(here)) return pathAt.get(here);
  const q = [[x, z]];
  const seen = new Set([here]);
  while (q.length) {
    const [cx, cz] = q.shift();
    for (const [nx, nz] of neighbors(grid, cx, cz)) {
      const k = key(nx, nz);
      if (cut.has(k)) continue;
      if (pathAt.has(k)) return pathAt.get(k);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, nz]);
    }
  }
  return null;
}

function addLoops(grid, n, inside, links, rand, cuts, joinIndex) {
  const candidates = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (!inside(i, j)) continue;
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (!inside(ni, nj)) continue;
        if (links.has([i, j, ni, nj].join(","))) continue;
        const ja = joinIndex(i, j);
        const jb = joinIndex(ni, nj);
        if (ja == null || jb == null) continue;
        const lo = Math.min(ja, jb);
        const hi = Math.max(ja, jb);
        if (cuts.some((c) => c.index > lo && c.index < hi)) continue;
        const wall = between({ i, j }, { i: ni, j: nj });
        if (!grid[wall.z] || grid[wall.z][wall.x] !== "#") continue;
        candidates.push({ i, j, ni, nj, wall });
      }
    }
  }
  shuffle(candidates, rand);
  const count = Math.max(1, Math.round(candidates.length * 0.12));
  const made = [];
  for (const edge of candidates.slice(0, count)) {
    grid[edge.wall.z][edge.wall.x] = ".";
    const from = cellOfRoom(edge.i, edge.j);
    const to = cellOfRoom(edge.ni, edge.nj);
    made.push({ from, wall: edge.wall, to });
  }
  return made;
}

function movePortal(portal, x, z, back) {
  portal.x = x;
  portal.z = z;
  for (const slot of ["always", "lit", "dark"]) {
    const dest = portal[slot];
    if (!dest || dest.toX == null) continue;
    dest.toX = back.x;
    dest.toZ = back.z;
  }
}

function reachGoal(world, light) {
  const state = createState(world);
  if (world.door) state.flags[world.door] = true;
  if (world.door2) state.flags[world.door2] = true;
  for (const portal of world.portals || []) {
    if (portal.unlessFlag) state.flags[portal.unlessFlag] = true;
  }
  state.light = light;
  const start = findChar(world, "S")[0];
  const goal = findChar(world, "G")[0];
  return !!routeCells(world, state, start.x, start.z, goal.x, goal.z);
}

function checkLayout(world) {
  if (!reachGoal(world, true) && !reachGoal(world, false)) {
    throw new Error(world.id + " gate is walled off from the start");
  }
  for (const token of world.tokens || []) {
    const ch = world.grid[token.z][token.x];
    if (ch === "#" || ch === "+" || ch === "=") {
      throw new Error(world.id + " left " + token.id + " on " + ch);
    }
  }
}
