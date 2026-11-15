/* Walk every maze with only the moves a clued player can make. */
import { WORLDS, META, worldById, brandsSpell, brandsShown } from "./worlds.js";
import { createState, walkTo, interact, submitCode, hintFor, lettersHeld, cellOf, FACE, findChar, blocked } from "./logic.js";

const SOLVE = {
  trail: [
    ["at", 1, 4],
    ["at", 2, 3],
    ["light", true],
    ["at", 8, 6],
    ["face", "west"],
    ["at", 1, 8],
    ["code", "ROPE"],
  ],
  pine: [
    ["at", 5, 2],
    ["light", true],
    ["at", 9, 3],
    ["at", 5, 6],
    ["at", 1, 5],
    ["face", "west"],
    ["at", 1, 8],
    ["code", "OPAL"],
  ],
  mountain: [
    ["at", 2, 3],
    ["light", true],
    ["at", 7, 8],
    ["face", "west"],
    ["at", 1, 8],
    ["at", 6, 9],
    ["code", "FIRE"],
  ],
  rusty: [
    ["at", 4, 2],
    ["light", false],
    ["to", 8, 6],
    ["light", true],
    ["use"],
    ["face", "west"],
    ["at", 1, 6],
    ["at", 4, 9],
    ["code", "DONT"],
  ],
  pulse: [
    ["at", 2, 4],
    ["at", 4, 7],
    ["light", true],
    ["at", 8, 6],
    ["at", 1, 8],
    ["pitch"],
    ["at", 8, 9],
    ["code", "ECHO"],
  ],
  thorne: [
    ["at", 4, 2],
    ["at", 2, 4],
    ["at", 2, 4],
    ["at", 2, 4],
    ["light", true],
    ["at", 8, 8],
    ["face", "west"],
    ["at", 1, 8],
    ["at", 5, 9],
    ["code", "BORN"],
  ],
  seeders: [
    ["at", 4, 2],
    ["face", "west"],
    ["at", 1, 2],
    ["at", 4, 4],
    ["light", true],
    ["at", 7, 6],
    ["code", "SEED"],
  ],
  envoy: [
    ["at", 4, 2],
    ["light", false],
    ["to", 8, 5],
    ["light", true],
    ["use"],
    ["face", "west"],
    ["at", 1, 5],
    ["at", 2, 6],
    ["at", 4, 9],
    ["code", "HIVE"],
  ],
};

function fail(msg) {
  console.error("FAIL " + msg);
  process.exitCode = 1;
}

function play(world, steps) {
  const state = createState(world);
  const early = submitCode(world, state, world.code);
  if (early.ok) fail(world.id + " accepted the code with no letters");
  for (const step of steps) {
    const [op, a, b] = step;
    if (op === "light") state.light = a;
    else if (op === "face") state.yaw = FACE[a];
    else if (op === "pitch") state.pitch = -0.9;
    else if (op === "use") {
      const res = interact(world, state);
      if (res.msg && /smear|dark|blank|Nothing/i.test(res.msg) && !res.found && !res.ui) {
        fail(world.id + " use failed: " + res.msg);
      }
    } else if (op === "to") {
      if (!walkTo(world, state, a, b)) {
        const at = cellOf(state.px, state.pz);
        fail(world.id + " cannot walk to " + a + "," + b + " (stuck " + at.x + "," + at.z + ")");
        return null;
      }
    } else if (op === "at") {
      state.pitch = step.pitch != null ? state.pitch : state.pitch;
      if (!walkTo(world, state, a, b)) {
        const at = cellOf(state.px, state.pz);
        fail(world.id + " cannot reach " + a + "," + b + " (stuck " + at.x + "," + at.z + " light=" + state.light + " flags=" + JSON.stringify(state.flags) + ")");
        return null;
      }
      const res = interact(world, state);
      if (!res.found && !res.ui && res.msg && /smear|dark|blank|Nothing here/i.test(res.msg)) {
        fail(world.id + " at " + a + "," + b + " did not work: " + res.msg);
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
  play(world, SOLVE[world.id]);
  if (world.door || world.door2) {
    const open = reachable(world, {}, true);
    const hidden = (world.tokens || []).filter((t) => t.letter && !open.has(t.x + "," + t.z));
    if (!hidden.length) fail(world.id + " hides no letter behind its door");
  }
}

const seed = createState(worldById("seeders"));
if (walkTo(worldById("seeders"), seed, 7, 6)) fail("seeders back room opens before the seed is used");

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
export { SOLVE };
