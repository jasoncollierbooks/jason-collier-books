/* Walk every maze with only the moves a clued player can make. */
import { WORLDS, META, worldById, brandsSpell, brandsShown } from "./worlds.js";
import { createState, walkTo, interact, submitCode, hintFor, lettersHeld, cellOf, FACE, findChar, blocked, wayFrom, routeCells } from "./logic.js";
import { peopleFor } from "./cast.js";

const PLAN = {
  trail: [["use", "rope"], ["use", "passage"], ["light", true], ["use", "ox"], ["face", "west"], ["use", "boards"], ["code", "ROPE"]],
  pine: [["use", "gold"], ["light", true], ["use", "napkin"], ["use", "hole"], ["use", "reward"], ["face", "west"], ["use", "board"], ["code", "OPAL"]],
  mountain: [["use", "campfire"], ["light", true], ["use", "tent"], ["face", "west"], ["use", "spruce"], ["use", "camera"], ["code", "FIRE"]],
  rusty: [["use", "plate"], ["face", "west"], ["use", "pipe"], ["light", false], ["goto", "grate"], ["light", true], ["use", "grate"], ["use", "crate"], ["code", "DONT"]],
  pulse: [["use", "pedestal"], ["use", "arch"], ["light", true], ["use", "pocket"], ["use", "quote"], ["pitch"], ["use", "ring"], ["code", "ECHO"]],
  thorne: [["use", "clip"], ["use", "scope", 3], ["light", true], ["use", "chamber"], ["face", "west"], ["use", "trefoil"], ["use", "shell"], ["code", "BORN"]],
  seeders: [["use", "hull"], ["face", "west"], ["use", "edge"], ["use", "vein"], ["light", true], ["use", "circuit"], ["code", "SEED"]],
  envoy: [["use", "fates"], ["face", "west"], ["use", "shard"], ["light", false], ["goto", "glass"], ["light", true], ["use", "glass"], ["use", "lens"], ["use", "bind"], ["code", "HIVE"]],
};

function fail(msg) {
  console.error("FAIL " + msg);
  process.exitCode = 1;
}

function entity(world, id) {
  return (world.tokens || []).concat(world.signs || []).find((t) => t.id === id) || null;
}

function play(world, steps) {
  const state = createState(world);
  const early = submitCode(world, state, world.code);
  if (early.ok && !world.freeCode) fail(world.id + " accepted the code with no letters");
  for (const step of steps) {
    const [op, a, b] = step;
    if (op === "light") state.light = a;
    else if (op === "face") state.yaw = FACE[a];
    else if (op === "pitch") state.pitch = -0.9;
    else if (op === "goto" || op === "use") {
      const spot = entity(world, a);
      if (!spot) { fail(world.id + " missing " + a); return null; }
      if (!walkTo(world, state, spot.x, spot.z)) {
        const at = cellOf(state.px, state.pz);
        fail(world.id + " cannot reach " + a + " at " + spot.x + "," + spot.z + " (stuck " + at.x + "," + at.z + " light=" + state.light + " flags=" + JSON.stringify(state.flags) + ")");
        return null;
      }
      if (op === "use") {
        const times = b || 1;
        for (let n = 0; n < times; n++) {
          const res = interact(world, state);
          if (res.msg && /smear|dark|blank|Nothing/i.test(res.msg) && !res.found && !res.ui) {
            fail(world.id + " use " + a + " failed: " + res.msg);
            return null;
          }
        }
      }
    } else if (op === "code") {
      const res = submitCode(world, state, a);
      if (!res.ok) fail(world.id + " code " + a + " rejected: " + res.msg + " held " + lettersHeld(world, state).map((l) => l.letter).join(""));
    }
  }
  if (!state.cleared) fail(world.id + " not cleared");
  const hints = [0, 1, 2].map(() => hintFor(world, state).text);
  if (hints[2].toUpperCase().indexOf(world.code) < 0) fail(world.id + " final hint does not name the code: " + hints[2]);
  return state;
}

function reachable(world, flags, light) {
  const state = createState(world);
  state.flags = Object.assign({}, flags);
  state.light = !!light;
  const start = findChar(world, "S")[0];
  const seen = new Set();
  const q = [[start.x, start.z]];
  seen.add(start.x + "," + start.z);
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = nx + "," + nz;
      if (seen.has(k)) continue;
      if (blocked(world, nx, nz, state.flags)) continue;
      seen.add(k);
      q.push([nx, nz]);
    }
  }
  return seen;
}

const isMain = process.argv[1] && process.argv[1].endsWith("sim.mjs");
if (isMain) {
if (brandsSpell() !== "HANDBILL") fail("brands spell " + brandsSpell());
if (brandsShown() !== "IBOECJMM") fail("shown brands " + brandsShown());

for (const world of WORLDS.concat([META])) {
  const letters = (world.tokens || []).filter((t) => t.letter).map((t) => t.letter).sort().join("");
  if (world.code && letters && letters !== world.code.split("").sort().join("")) {
    fail(world.id + " letters " + letters + " are not " + world.code);
  }
  const state = createState(world);
  const way = wayFrom(world, state, findChar(world, "S")[0].x, findChar(world, "S")[0].z);
  if (!way || !way.dir) fail(world.id + " has no way from the entrance");
  const folks = peopleFor(world);
  if (!folks.length) fail(world.id + " has nobody standing in it");
  for (const p of folks) {
    const ch = world.grid[p.z][p.x];
    if (ch === "#" || ch === "+" || ch === "=") fail(world.id + " put " + p.id + " on " + ch);
  }
  const w = world.grid[0].length;
  if (world.grid.some((row) => row.length !== w)) fail(world.id + " ragged grid");
  for (const t of (world.tokens || []).concat(world.signs || [])) {
    const ch = world.grid[t.z][t.x];
    if (ch === "#" || ch === "+" || ch === "=") fail(world.id + " entity " + t.id + " sits on " + ch + " at " + t.x + "," + t.z);
  }
  const g = findChar(world, "G");
  const s = findChar(world, "S");
  if (s.length !== 1 || g.length !== 1) fail(world.id + " spawn/gate count");
}

for (const world of WORLDS) {
  if (world.grid.length < 21) fail(world.id + " grid is only " + world.grid.length);
  const openFlags = {};
  if (world.door) openFlags[world.door] = true;
  if (world.door2) openFlags[world.door2] = true;
  for (const portal of world.portals || []) if (portal.unlessFlag) openFlags[portal.unlessFlag] = true;
  const probe = createState(world);
  Object.assign(probe.flags, openFlags);
  probe.light = true;
  const start = findChar(world, "S")[0];
  const goal = findChar(world, "G")[0];
  const viaLight = routeCells(world, probe, start.x, start.z, goal.x, goal.z);
  probe.light = false;
  const viaDark = routeCells(world, probe, start.x, start.z, goal.x, goal.z);
  const solution = viaLight || viaDark;
  if (!solution) fail(world.id + " has no solved path to the gate");
  else console.log("  path " + world.id + " " + solution.length + " cells  grid " + world.grid.length + "x" + world.grid[0].length + " oneways " + (world.oneway || []).length);
  for (const token of world.tokens || []) {
    probe.light = true;
    const lit = routeCells(world, probe, start.x, start.z, token.x, token.z);
    probe.light = false;
    const dark = routeCells(world, probe, start.x, start.z, token.x, token.z);
    if (!lit && !dark) fail(world.id + " token " + token.id + " is unreachable even with the tricks done");
  }
  play(world, PLAN[world.id]);
  if (world.door || world.door2) {
    const open = reachable(world, {}, true);
    const hidden = (world.tokens || []).filter((t) => t.letter && !open.has(t.x + "," + t.z));
    if (!hidden.length) fail(world.id + " hides no letter behind its door");
  }
}

const seeders = worldById("seeders");
const circuit = seeders.tokens.find((t) => t.id === "circuit");
const seed = createState(seeders);
if (walkTo(seeders, seed, circuit.x, circuit.z)) fail("seeders back room opens before the seed is used");

const meta = createState(META);
const metaBad = submitCode(META, meta, "STATIONS");
if (metaBad.ok) fail("meta accepted a wrong word");
const metaOk = submitCode(META, meta, "handbill");
if (!metaOk.ok) fail("meta rejected HANDBILL");
const metaHints = [];
const metaState = createState(META);
for (let i = 0; i < 3; i++) metaHints.push(hintFor(META, metaState).text);
if (metaHints[2].indexOf("HANDBILL") < 0) fail("meta hint missing the word");

if (!process.exitCode) {
  console.log("All " + WORLDS.length + " mazes solve. Brands " + brandsShown() + " roll back to " + brandsSpell() + ".");
  for (const w of WORLDS) console.log("  " + w.id + " " + w.code + " brand " + w.shown);
}
}
export { PLAN };
