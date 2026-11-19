import { WORLDS, ORDER, worldById } from "./worlds.js";
import { GAME_TITLE } from "./title.js";
import { createOverhead } from "./overhead.js";
import { preloadWorld, speak, speakChain, stopSpeak, unlockSpeech, busy } from "./speech.js?v=5";
import {
  CELL, SPEED, createState, movePlayer, interact, nearest, objective,
  lettersHeld, letterProgress, submitCode, hintFor, cellOf, wayFrom,
  routeCells, center, blocked,
} from "./logic.js";
import { peopleFor, pointLine, idleLine } from "./cast.js";
import { createAudio } from "./audio.js";

const SAVE_KEY = "ce-cryptic-mazes-v1";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const view = document.getElementById("view");
const hub = document.getElementById("hub");
const hud = document.getElementById("hud");
const toast = document.getElementById("toast");
const promptEl = document.getElementById("prompt");
const panel = document.getElementById("panel");
const touch = document.getElementById("touch");

const audio = createAudio();
const overhead = createOverhead(view);
let save = load();
let world = null;
let state = null;
let people = [];
let guideWay = null;
let hereCell = null;
let moving = false;
const idle = { x: 0, z: 0, t: 0 };
let voicedAt = 0;
let sprintUntil = 0;
let lastTap = 0;
let nearClue = false;
let speaking = null;
let clock = 0;
let last = 0;
let saveAt = 0;
const keys = {};
const ptrs = new Map();
let steering = null;
let route = null;
const WALK_TIP = "Hold anywhere. You walk toward your finger.";
let pinch = null;
const sprites = new Map();

function freshSave(extra) {
  return Object.assign({ v: 2, cleared: {}, meta: false, sound: true, sens: 1, help: false, run: null }, extra || {});
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && raw.v === 2) return raw;
    if (raw && raw.v === 1) {
      return freshSave({
        cleared: raw.cleared || {},
        meta: !!raw.meta,
        sound: raw.sound !== false,
        sens: raw.sens || 1,
        help: !!raw.help,
        captions: raw.captions,
        guide: raw.guide,
        walkTip: raw.walkTip,
        run: null,
      });
    }
  } catch (e) { /* empty save */ }
  return freshSave();
}

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
}

function snapshot() {
  if (!world || !state || state.cleared || world.id === "meta") return;
  save.run = {
    id: world.id,
    px: state.px, pz: state.pz, yaw: state.yaw, pitch: state.pitch, light: state.light,
    flags: state.flags, found: state.found, cycle: state.cycle,
    notes: state.notes, read: state.read, hintTier: state.hintTier, goalId: state.goalId,
    seen: state.seen, knownWall: state.knownWall, folded: state.folded, stirred: state.stirred, talk: state.talk,
    heard: state.heard,
  };
}

function restore(run) {
  state.px = run.px;
  state.pz = run.pz;
  state.yaw = run.yaw || 0;
  state.pitch = 0;
  state.light = !!run.light;
  state.flags = run.flags || {};
  state.found = run.found || {};
  state.cycle = run.cycle || {};
  state.notes = run.notes || [];
  state.read = run.read || {};
  state.hintTier = run.hintTier || 0;
  state.goalId = run.goalId || "";
  state.seen = run.seen || {};
  state.knownWall = run.knownWall || {};
  state.folded = run.folded || {};
  state.stirred = run.stirred || {};
  state.talk = run.talk || {};
  state.heard = run.heard || {};
  state.cue = [];
  const c = cellOf(state.px, state.pz);
  state.stood = c.x + "," + c.z;
  state.msg = state.notes[state.notes.length - 1] || world.intro;
}

function clearedCount() {
  return ORDER.filter((id) => save.cleared[id]).length;
}

function drawHub() {
  const resume = save.run && worldById(save.run.id);
  const cards = WORLDS.map((w) => {
    const brand = save.cleared[w.id];
    return `<button type="button" class="station${brand ? " cleared" : ""}" data-world="${w.id}">
      <span class="sk">${w.kicker}</span>
      <span class="st">${w.title}</span>
      <span class="sb">${w.blurb}</span>
      ${brand ? `<b class="brand" aria-label="Brand ${brand}">${brand}</b>` : ""}
    </button>`;
  }).join("");
  const n = clearedCount();
  const dead = n === 8
    ? `<button type="button" class="station dead${save.meta ? " cleared" : ""}" data-world="meta">
        <span class="sk">After every station</span>
        <span class="st">Dead Air</span>
        <span class="sb">${save.meta ? "The pages are back in the book." : "Eight brands. One sheet. The cabinet is listening."}</span>
      </button>`
    : `<p class="locked">Dead Air stays shut until every station has branded the page. ${n} of 8.</p>`;
  hub.innerHTML = `<div class="hub-inner">
    <p class="wordmark">COLLIER<span>ENTERTAINMENT</span></p>
    <h1>${GAME_TITLE}</h1>
    <p class="lede">Eight worlds from the shelf, each a maze seen from above. A lantern, a wrong door, and a word you have to earn. When every page is branded, the cabinet has one more lock.</p>
    <div class="hub-row">
      ${resume ? `<button type="button" class="text-btn" id="resume">Resume ${resume.title}</button>` : ""}
      <button type="button" class="text-btn" id="settings">Sound and progress</button>
    </div>
    <div class="stations">${cards}</div>
    <div class="stations" style="margin-top:12px">${dead}</div>
    <p class="fine">Progress stays on this device. The sounds are wind, pipes, and hums. No music. <a href="../play.html">Back to Play</a></p>
  </div>`;
  hud.hidden = true;
  toast.hidden = true;
  promptEl.hidden = true;
  touch.hidden = true;
  hub.hidden = false;
  document.body.classList.remove("playing");
}

function openPanel(html, lock) {
  steering = null;
  route = null;
  panel.hidden = false;
  panel.innerHTML = `<div class="scrim"${lock ? "" : " data-close"}></div><div class="sheet" role="dialog">${html}</div>`;
}

function closePanel() {
  panel.hidden = true;
  panel.innerHTML = "";
  if (state) {
    idle.x = state.px;
    idle.z = state.pz;
    idle.t = clock;
  }
}

function helpHtml() {
  return `<h2>How to play</h2>
    <p>You are looking down on the maze. North is the gold needle. A soft mist covers what you have not walked.</p>
    <p>Some letters show only under the lantern. Stand beside a mark and use it. The side you face does not matter.</p>
    <p>A bright door is often a lie. A room that brings you back is telling you the truth about itself. Walls move when you do the thing the room asked for.</p>
    <p>The gate wants the letters you found, in the order a carving explains. Hints start vague. The third one is plain.</p>
    <p><strong>Phone.</strong> Hold a finger on the maze and you walk toward it. Drag to steer. Let go to stop. A tap walks the path to that spot. Pinch, or All, pulls the camera back.</p>
    <p><strong>Keyboard.</strong> Arrows or WASD walk. Click a spot and the maze walks you there. Shift hurries. F lantern. E or Space uses what is beside you, or talks to someone standing there. H hint. M zooms out to the whole maze.</p>
    <p>Gold stones mark the next steps, faint when they run into the mist. A small arrow points the way. Someone at a junction will point out loud. Stand still and the storyteller will too. Trail markers can be turned off in settings.</p>
    <p>People in the maze speak. Captions are off until you turn them on.</p>
    <div class="row"><button type="button" data-close>Step in</button></div>`;
}

function settingsHtml() {
  return `<h2>On this device</h2>
    <p><label><input type="checkbox" id="sound" ${save.sound ? "checked" : ""}> Sound</label></p>
    <p><label><input type="checkbox" id="captions" ${save.captions ? "checked" : ""}> Captions</label></p>
    <p><label><input type="checkbox" id="guide" ${save.guide !== false ? "checked" : ""}> Trail markers</label></p>
    <div class="row"><button type="button" id="wipe">Erase saved progress</button><button type="button" data-close>Close</button></div>`;
}

function notesHtml() {
  const held = world ? lettersHeld(world, state).slice().sort((a, b) => a.letter.localeCompare(b.letter) || a.tag.localeCompare(b.tag)) : [];
  const brands = ORDER.map((id) => {
    const w = worldById(id);
    const b = save.cleared[id];
    return b ? `<li>${w.title}: brand ${b}</li>` : "";
  }).join("");
  const log = (state.notes || []).slice().reverse().map((n) => `<li>${escapeHtml(n)}</li>`).join("");
  return `<h2>Notes</h2>
    <p>${held.length ? "Holding " + held.map((h) => h.tag + " " + h.letter).join(", ") : "No letters yet."}</p>
    ${brands ? `<ul class="notes">${brands}</ul>` : ""}
    <ul class="notes">${log || "<li>The pages are still blank.</li>"}</ul>
    <div class="row"><button type="button" data-close>Close</button></div>`;
}

function codeHtml() {
  const held = lettersHeld(world, state).slice().sort((a, b) => a.letter.localeCompare(b.letter) || a.tag.localeCompare(b.tag));
  const chips = held.map((h) => `<button type="button" data-chip="${h.letter}">${h.letter}<small> ${h.tag}</small></button>`).join("");
  const brands = world.freeCode
    ? `<p>Brands, as the pages hold them, in the plaque's order:</p><ul class="notes">${ORDER.map((id) => "<li>" + worldById(id).title + ": " + (save.cleared[id] || "?") + "</li>").join("")}</ul>`
    : "";
  return `<h2>The gate</h2>
    ${brands}
    ${chips ? `<div class="chips">${chips}</div>` : ""}
    <input id="code" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Code">
    <div class="row">
      <button type="button" id="code-go">Try the gate</button>
      <button type="button" id="code-back">Backspace</button>
      <button type="button" data-close>Leave it</button>
    </div>`;
}

function winHtml(shown) {
  const brand = world.freeCode
    ? ""
    : `<p>The page is branded <strong>${shown}</strong>.</p>`;
  return `<h2>${world.freeCode ? "On the air" : world.title}</h2>
    <p>${escapeHtml(world.win)}</p>
    ${brand}
    <div class="row"><button type="button" id="to-hub">Back to the cabinet</button></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function knockOut(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  if (!c.width || !c.height) return img;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    if (max < 16) d[i + 3] = 0;
    else if (max < 40) d[i + 3] = Math.round(((max - 16) / 24) * 255);
  }
  g.putImageData(data, 0, 0);
  return c;
}

function loadSprite(src, cut) {
  if (!src) return null;
  if (sprites.has(src)) return sprites.get(src);
  const rec = { ready: null };
  const img = new Image();
  img.onload = () => { rec.ready = cut ? knockOut(img) : img; };
  img.src = src;
  sprites.set(src, rec);
  return rec;
}

function applyLight() {
  const on = !!(state && state.light);
  const btn = document.getElementById("btn-light");
  if (btn) btn.classList.toggle("on", on);
}

function showChrome(on) {
  const zoom = document.getElementById("btn-zoom");
  const cc = document.getElementById("btn-captions");
  if (zoom) zoom.hidden = !on;
  if (cc) {
    cc.hidden = !on;
    cc.classList.toggle("on", !!save.captions);
  }
  const tip = document.getElementById("walk-tip");
  if (!on && tip) tip.hidden = true;
}

function enter(id, resume) {
  if (id === "meta" && clearedCount() < 8) return;
  const next = worldById(id);
  if (!next) return;
  closePanel();
  world = next;
  state = createState(world);
  if (resume && save.run && save.run.id === id) restore(save.run);
  people = peopleFor(world).map((p, i) => Object.assign({}, p, {
    bob: i * 1.7,
    img: p.sprite ? loadSprite(p.sprite, true) : null,
    art: p.art ? loadSprite(p.art, false) : null,
    ax: p.wx,
    az: p.wz,
    pacing: true,
  }));
  overhead.reset(state.px, state.pz, world);
  audio.play(world.theme.ambient);
  audio.setMuted(!save.sound);
  hub.hidden = true;
  hud.hidden = false;
  document.body.classList.add("playing");
  seedMap();
  showChrome(true);
  applyLight();
  const zoom = document.getElementById("btn-zoom");
  if (zoom) zoom.textContent = "All";
  idle.x = state.px;
  idle.z = state.pz;
  idle.t = clock;
  voicedAt = clock;
  touch.hidden = false;
  document.getElementById("kicker").textContent = world.kicker;
  document.getElementById("title").textContent = world.title;
  refreshHud();
  unlockSpeech();
  preloadWorld(world.id);
  showWalkTip(() => {
    speak(world.intro, { id: "narrator", name: world.title });
    markSpeaking("narrator", world.intro);
  });
  if (!save.help) {
    save.help = true;
    persist();
    openPanel(helpHtml(), false);
  }
}

function showWalkTip(then) {
  const tip = document.getElementById("walk-tip");
  const coarse = matchMedia("(pointer: coarse), (max-width: 900px)").matches;
  if (!coarse || save.walkTip) {
    if (tip) tip.hidden = true;
    then();
    return;
  }
  save.walkTip = true;
  persist();
  if (tip) {
    tip.hidden = false;
    tip.textContent = WALK_TIP;
  }
  speak(WALK_TIP, { id: "narrator", name: "Tip" });
  markSpeaking("narrator", WALK_TIP);
  setTimeout(() => {
    if (tip) tip.hidden = true;
    if (world) then();
  }, 2300);
}

function personSpot(person) {
  return { x: person.ax, z: person.az };
}

function personNear() {
  let best = null;
  let bestD = 2.5;
  for (const p of people) {
    const spot = personSpot(p);
    const d = Math.hypot(state.px - spot.x, state.pz - spot.z);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function markSpeaking(id, line) {
  speaking = { id, until: clock + Math.min(9, 1.1 + String(line || "").length * 0.045) };
  if (view) view.dataset.speaking = id + ": " + line;
}

function talk(person, auto) {
  const i = state.talk[person.id] || 0;
  const line = person.lines[Math.min(i, person.lines.length - 1)];
  if (auto) state.talk[person.id] = Math.max(i, 1);
  else state.talk[person.id] = Math.min(person.lines.length - 1, i + 1);
  state.heard[person.id] = 1;
  const way = wayFrom(world, state, person.x, person.z);
  const tail = way && way.dir ? pointLine(person.id, way.dir, way.target.kind === "gate") : "";
  state.msg = save.captions ? person.name + ". " + line : "";
  state.notes.push(person.name + ". " + [line, tail].filter(Boolean).join(" "));
  if (state.notes.length > 48) state.notes.splice(0, state.notes.length - 48);
  unlockSpeech();
  speakChain([line, tail], person);
  markSpeaking(person.id, line);
  voicedAt = clock;
  refreshHud();
}

function seedMap() {
  const here = cellOf(state.px, state.pz);
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  for (let z = here.z - 3; z <= here.z + 3; z++) {
    for (let x = here.x - 3; x <= here.x + 3; x++) {
      if (x < 0 || z < 0 || x >= cols || z >= rows) continue;
      if (Math.abs(x - here.x) + Math.abs(z - here.z) > 4) continue;
      const ch = world.grid[z][x];
      const shut = ch === "#" || ch === "+" || ch === "=";
      if (shut) state.knownWall[x + "," + z] = 1;
      else state.seen[x + "," + z] = 1;
    }
  }
}

function revealMap() {
  if (!state.seen) state.seen = {};
  if (!state.knownWall) state.knownWall = {};
  if (!state.stirred) state.stirred = {};
  const c = cellOf(state.px, state.pz);
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  for (let z = c.z - 2; z <= c.z + 2; z++) {
    for (let x = c.x - 2; x <= c.x + 2; x++) {
      if (x < 0 || z < 0 || x >= cols || z >= rows) continue;
      const ch = world.grid[z][x];
      const shut = (ch === "+" && !state.flags[world.door]) || (ch === "=" && !state.flags[world.door2]) || ch === "#";
      const key = x + "," + z;
      if (shut) state.knownWall[key] = 1;
      else {
        if (state.knownWall[key] && (ch === "+" || ch === "=")) state.stirred[key] = 1;
        state.seen[key] = 1;
        delete state.knownWall[key];
      }
    }
  }
}

function updateGuide() {
  const on = save.guide !== false && !state.cleared;
  hereCell = cellOf(state.px, state.pz);
  guideWay = on ? wayFrom(world, state, hereCell.x, hereCell.z) : null;
  const bearing = document.getElementById("bearing");
  const name = document.getElementById("bearing-name");
  const needle = document.getElementById("needle");
  if (bearing) bearing.hidden = !guideWay || !guideWay.dir;
  if (guideWay && guideWay.dir && name) {
    const word = guideWay.dir.charAt(0).toUpperCase() + guideWay.dir.slice(1);
    name.textContent = (guideWay.target.kind === "gate" ? "Gate" : "Next") + " · " + word;
  }
  if (needle && guideWay && guideWay.dir) {
    const ang = guideWay.dir === "east" ? Math.PI / 2 : guideWay.dir === "west" ? -Math.PI / 2 : guideWay.dir === "south" ? Math.PI : 0;
    needle.style.transform = "rotate(" + ang + "rad)";
  }
  if (view) view.dataset.bearing = guideWay && guideWay.dir ? guideWay.dir : "";
  if (view) view.dataset.guide = on ? "1" : "0";
}

function guideSpeech() {
  if (!state.heard) state.heard = {};
  if (state.cue && state.cue.length && !busy() && clock - voicedAt > 0.4) {
    const lines = state.cue.splice(0, state.cue.length);
    speakChain(lines, { id: "narrator", name: world.title });
    markSpeaking("narrator", lines[0]);
    voicedAt = clock;
    return;
  }
  if (busy() || clock < 8) return;
  const moved = Math.hypot(state.px - idle.x, state.pz - idle.z);
  if (moved > 1.3) {
    idle.x = state.px;
    idle.z = state.pz;
    idle.t = clock;
  }
  const person = personNear();
  if (person && !state.heard[person.id] && clock - voicedAt > 1.2) {
    state.heard[person.id] = 1;
    talk(person, true);
    return;
  }
  const here = cellOf(state.px, state.pz);
  const way = guideWay || wayFrom(world, state, here.x, here.z);
  if (way && way.target) {
    const d = Math.hypot(state.px - (way.target.x + 0.5) * CELL, state.pz - (way.target.z + 0.5) * CELL);
    const key = "near:" + way.target.id;
    if (d < 3.1 && !state.heard[key] && clock - voicedAt > 1.2) {
      state.heard[key] = 1;
      const line = way.target.kind === "gate" ? world.closing : world.near;
      if (line) {
        speak(line, { id: "narrator", name: world.title });
        markSpeaking("narrator", line);
        if (save.captions) state.msg = line;
        voicedAt = clock;
        return;
      }
    }
  }
  if (save.guide === false || state.cleared) return;
  if (clock - idle.t > 45 && clock - voicedAt > 12) {
    const line = idleLine(way && way.dir, way && way.target && way.target.kind === "gate");
    speak(line, { id: "narrator", name: "Hint" });
    markSpeaking("narrator", line);
    if (save.captions) state.msg = line;
    voicedAt = clock;
    idle.t = clock;
  }
}

function leave() {
  showChrome(false);
  if (state && !state.cleared) snapshot();
  persist();
  stopSpeak();
  speaking = null;
  steering = null;
  route = null;
  closePanel();
  world = null;
  state = null;
  people = [];
  audio.play("parlor");
  drawHub();
}

function refreshHud() {
  if (!world) return;
  document.getElementById("objective").textContent = objective(world, state);
  const prog = letterProgress(world, state);
  const heldEl = document.getElementById("held");
  heldEl.textContent = prog.need ? "Letters " + prog.have + "/" + prog.need : (world.id === "meta" ? "Eight brands, then the gate" : "");
  if (view) view.dataset.progress = prog.need ? prog.have + "/" + prog.need : "meta";
  toast.hidden = !save.captions || !state.msg;
  toast.textContent = state.msg || "";
  const person = personNear();
  const near = nearest(world, state);
  const spot = person ? personSpot(person) : null;
  const pd = spot ? Math.hypot(state.px - spot.x, state.pz - spot.z) : 99;
  const zd = near ? Math.hypot(state.px - (near.x + 0.5) * CELL, state.pz - (near.z + 0.5) * CELL) : 99;
  if (panel.hidden && person && pd + 0.2 < zd) {
    promptEl.hidden = false;
    promptEl.textContent = "Use · " + person.name;
  } else if (!near || !panel.hidden) {
    promptEl.hidden = true;
  } else {
    promptEl.hidden = false;
    promptEl.textContent = near.etype === "gate" ? "Use · the gate" : near.etype === "sign" ? "Use · read" : "Use";
  }
}

function useNow() {
  if (!world || !panel.hidden) return;
  const puzzle = nearest(world, state);
  const person = personNear();
  if (person) {
    const spot = personSpot(person);
    const pd = Math.hypot(state.px - spot.x, state.pz - spot.z);
    const zd = puzzle ? Math.hypot(state.px - (puzzle.x + 0.5) * CELL, state.pz - (puzzle.z + 0.5) * CELL) : 99;
    if (pd + 0.2 < zd) {
      talk(person);
      snapshot();
      persist();
      return;
    }
  }
  const res = interact(world, state);
  applyLight();
  if (res && (res.ui === "read" || (res.msg && !/Nothing here/i.test(res.msg)))) {
    const said = res.ui === "read" ? res.body : res.msg;
    unlockSpeech();
    speak(said, { id: "narrator", name: res.title || "Clue" });
    markSpeaking("narrator", said);
    voicedAt = clock;
    if (!save.captions) state.msg = "";
  }
  refreshHud();
  if (res.ui === "code") {
    openPanel(codeHtml(), false);
    const field = document.getElementById("code");
    if (field) field.focus();
  } else if (res.ui === "read" && save.captions) {
    openPanel(`<h2>${escapeHtml(res.title)}</h2><p>${escapeHtml(res.body)}</p><div class="row"><button type="button" data-close>Close</button></div>`, false);
  }
  snapshot();
  persist();
}

function toggleLight() {
  if (!state) return;
  state.light = !state.light;
  applyLight();
  refreshHud();
}

function toggleZoom() {
  if (!world) return;
  const on = overhead.setFit(!overhead.fit, world);
  const btn = document.getElementById("btn-zoom");
  if (btn) btn.textContent = on ? "Near" : "All";
}

function walkToPoint(wx, wz) {
  const here = cellOf(state.px, state.pz);
  let goal = cellOf(wx, wz);
  if (blocked(world, goal.x, goal.z, state.flags)) {
    let best = null;
    let bestD = 1e9;
    for (let z = goal.z - 4; z <= goal.z + 4; z++) {
      for (let x = goal.x - 4; x <= goal.x + 4; x++) {
        if (blocked(world, x, z, state.flags)) continue;
        const d = (x - goal.x) * (x - goal.x) + (z - goal.z) * (z - goal.z);
        if (d < bestD) { best = { x, z }; bestD = d; }
      }
    }
    if (!best) return;
    goal = best;
  }
  const cells = routeCells(world, state, here.x, here.z, goal.x, goal.z);
  if (!cells || cells.length < 2) { route = null; return; }
  route = cells.slice(1).map(([x, z]) => center(x, z));
}

function doHint() {
  if (!world) return;
  const h = hintFor(world, state);
  unlockSpeech();
  speak(h.text, { id: "narrator", name: "Hint" });
  markSpeaking("narrator", h.text);
  refreshHud();
  if (save.captions) {
    openPanel(`<h2>Hint ${h.tier + 1} of 3</h2><p>${escapeHtml(h.text)}</p><div class="row"><button type="button" data-close>Close</button></div>`, false);
  }
  snapshot();
  persist();
}

function tryCode(raw) {
  const res = submitCode(world, state, raw);
  if (!res.ok) {
    state.msg = res.msg;
    unlockSpeech();
    speak(res.msg, { id: "narrator", name: "Gate" });
    markSpeaking("narrator", res.msg);
    refreshHud();
    const field = document.getElementById("code");
    if (field) {
      field.value = "";
      let note = document.getElementById("code-msg");
      if (!note) {
        note = document.createElement("p");
        note.id = "code-msg";
        field.before(note);
      }
      note.textContent = res.msg;
    }
    return;
  }
  if (world.id === "meta") save.meta = true;
  else save.cleared[world.id] = world.shown;
  save.run = null;
  persist();
  unlockSpeech();
  speak(world.win, { id: "narrator", name: world.title });
  markSpeaking("narrator", world.win);
  openPanel(winHtml(res.shown), true);
}

function intentVector() {
  let mx = 0;
  let mz = 0;
  if (keys.w || keys.arrowup) mz -= 1;
  if (keys.s || keys.arrowdown) mz += 1;
  if (keys.a || keys.arrowleft) mx -= 1;
  if (keys.d || keys.arrowright) mx += 1;
  if (mx || mz) {
    route = null;
    steering = null;
    const len = Math.hypot(mx, mz);
    return { mx: mx / len, mz: mz / len, keys: true };
  }
  if (steering && !steering.armed) {
    if (steering.moved || performance.now() - steering.t > 170) steering.armed = true;
  }
  if (steering && steering.armed && panel.hidden) {
    const spot = overhead.screenToWorld(steering.x, steering.y);
    const goal = cellOf(spot.x, spot.z);
    const key = goal.x + "," + goal.z;
    if (steering.cell !== key) {
      steering.cell = key;
      walkToPoint(spot.x, spot.z);
    }
  }
  if (route && route.length && panel.hidden) {
    let goal = route[0];
    let dx = goal.x - state.px;
    let dz = goal.z - state.pz;
    let len = Math.hypot(dx, dz);
    if (len < 0.2) {
      route.shift();
      if (!route.length) return null;
      goal = route[0];
      dx = goal.x - state.px;
      dz = goal.z - state.pz;
      len = Math.hypot(dx, dz) || 1;
    }
    return { mx: dx / len, mz: dz / len, keys: false };
  }
  return null;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (!world || !state) return;
  clock += dt;
  if (panel.hidden) {
    const wish = intentVector();
    moving = !!wish;
    if (wish) {
      state.yaw = Math.atan2(wish.mx, -wish.mz);
      const sprint = keys.shift || clock < sprintUntil;
      const pace = SPEED * (sprint ? 1.7 : 1);
      const px0 = state.px;
      const pz0 = state.pz;
      movePlayer(world, state, wish.mx * pace * dt, wish.mz * pace * dt);
      if (route && Math.hypot(state.px - px0, state.pz - pz0) < 0.004) route = null;
    }
    revealMap();
    updateGuide();
    guideSpeech();
    const clue = (world.tokens || []).some((t) => t.letter && !state.found[t.id] && Math.hypot(state.px - (t.x + 0.5) * CELL, state.pz - (t.z + 0.5) * CELL) < 2.3);
    if (clue && !nearClue) audio.blip();
    nearClue = clue;
    if (view) {
      view.dataset.yaw = String(state.yaw);
      view.dataset.holding = steering ? "1" : "0";
    }
    if (now - saveAt > 2000) { saveAt = now; snapshot(); persist(); }
  } else moving = false;
  people.forEach((p) => {
    const dist = Math.hypot(state.px - p.wx, state.pz - p.wz);
    p.pacing = dist > 2.4;
    const along = Math.sin(clock * 0.45 + p.bob) * (p.span || 0.2) * (p.pacing ? 1 : 0.15);
    p.ax = p.wx + (p.axis === "z" ? 0 : along);
    p.az = p.wz + (p.axis === "z" ? along : 0);
  });
  overhead.follow(world, state, dt);
  overhead.draw(world, state, {
    people,
    way: guideWay,
    here: hereCell,
    guide: save.guide !== false && !state.cleared,
    clock,
    reduce,
    moving,
    speaking: speaking && clock < speaking.until ? speaking : null,
  });
  if (panel.hidden) refreshHud();
}

function onPlay(e) {
  if (!world || !panel.hidden) return false;
  const el = e.target;
  if (el && el.closest && el.closest("button, a, input, textarea, #panel, .sheet")) return false;
  return true;
}

function bind() {
  hub.addEventListener("click", (e) => {
    audio.resume();
    const worldBtn = e.target.closest("[data-world]");
    if (worldBtn) { enter(worldBtn.dataset.world, false); return; }
    if (e.target.id === "resume" && save.run) enter(save.run.id, true);
    if (e.target.id === "settings") openPanel(settingsHtml(), false);
  });
  document.getElementById("btn-help").addEventListener("click", () => openPanel(helpHtml(), false));
  document.getElementById("btn-light").addEventListener("click", () => { audio.resume(); toggleLight(); });
  document.getElementById("btn-use").addEventListener("click", () => { audio.resume(); useNow(); });
  document.getElementById("btn-hint").addEventListener("click", () => { audio.resume(); doHint(); });
  document.getElementById("btn-book").addEventListener("click", () => openPanel(notesHtml(), false));
  document.getElementById("btn-zoom").addEventListener("click", () => { if (world) toggleZoom(); });
  document.getElementById("btn-captions").addEventListener("click", () => {
    save.captions = !save.captions;
    persist();
    document.getElementById("btn-captions").classList.toggle("on", !!save.captions);
    if (world) refreshHud();
  });
  panel.addEventListener("click", (e) => {
    if (e.target.dataset.close != null || e.target.closest("[data-close]")) {
      if (!e.target.closest(".sheet") || e.target.dataset.close != null) closePanel();
      return;
    }
    const chip = e.target.closest("[data-chip]");
    const field = document.getElementById("code");
    if (chip && field) { field.value = (field.value + chip.dataset.chip).toUpperCase(); return; }
    if (e.target.id === "code-back" && field) { field.value = field.value.slice(0, -1); return; }
    if (e.target.id === "code-go" && field) { tryCode(field.value); return; }
    if (e.target.id === "to-hub") leave();
    if (e.target.id === "wipe") {
      const sound = save.sound;
      world = null;
      state = null;
      save = freshSave({ sound, help: true });
      persist();
      closePanel();
      audio.play("parlor");
      drawHub();
    }
  });
  panel.addEventListener("change", (e) => {
    if (e.target.id === "sound") {
      save.sound = e.target.checked;
      audio.setMuted(!save.sound);
      persist();
    }
    if (e.target.id === "captions") {
      save.captions = e.target.checked;
      persist();
      if (world) refreshHud();
    }
    if (e.target.id === "guide") {
      save.guide = e.target.checked;
      persist();
      if (world) updateGuide();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.matches && e.target.matches("input, textarea")) {
      if (e.key === "Enter" && e.target.id === "code") tryCode(e.target.value);
      return;
    }
    const k = e.key.toLowerCase();
    if ((k === "w" || k === "arrowup") && !keys[k] && clock - lastTap < 0.32) sprintUntil = clock + 1.5;
    if (k === "w" || k === "arrowup") lastTap = clock;
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === "escape") {
      if (overhead.fit) { toggleZoom(); return; }
      closePanel();
    }
    if (!world || !panel.hidden) return;
    if (k === "f") toggleLight();
    if (k === "e" || k === " ") useNow();
    if (k === "h") doHint();
    if (k === "m") toggleZoom();
    if (k === "j") openPanel(notesHtml(), false);
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => {
    Object.keys(keys).forEach((k) => { keys[k] = false; });
    steering = null;
    ptrs.clear();
    pinch = null;
  });

  window.addEventListener("pointerdown", (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!onPlay(e)) return;
    audio.resume();
    unlockSpeech();
    if (ptrs.size >= 2) {
      steering = null;
      const pts = [...ptrs.values()];
      pinch = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        scale: overhead.scale,
      };
      return;
    }
    steering = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      armed: false,
      t: performance.now(),
      type: e.pointerType || "mouse",
    };
  });
  window.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2 && pinch && world) {
      const pts = [...ptrs.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      overhead.setScale(pinch.scale * (dist / pinch.dist), world);
      const btn = document.getElementById("btn-zoom");
      if (btn) btn.textContent = "All";
      return;
    }
    if (!steering || e.pointerId !== steering.id) return;
    if (Math.hypot(e.clientX - steering.sx, e.clientY - steering.sy) > 10) steering.moved = true;
    steering.x = e.clientX;
    steering.y = e.clientY;
  });
  function endPtr(e) {
    const was = steering && steering.id === e.pointerId ? steering : null;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!was) return;
    steering = null;
    if (!was.armed && !was.moved && world) {
      const spot = overhead.screenToWorld(was.x, was.y);
      walkToPoint(spot.x, spot.z);
    }
  }
  window.addEventListener("pointerup", endPtr);
  window.addEventListener("pointercancel", endPtr);
  window.addEventListener("wheel", (e) => {
    if (!world || !panel.hidden) return;
    if (e.target && e.target.closest && e.target.closest("#panel, #hub")) return;
    e.preventDefault();
    overhead.nudge(e.deltaY > 0 ? 0.9 : 1.11, world);
    const btn = document.getElementById("btn-zoom");
    if (btn) btn.textContent = overhead.fit ? "Near" : "All";
  }, { passive: false });
  window.addEventListener("resize", () => overhead.resize());
  document.addEventListener("visibilitychange", () => { if (document.hidden) { snapshot(); persist(); } });
  window.addEventListener("pagehide", () => { snapshot(); persist(); });
}

drawHub();
audio.setMuted(!save.sound);
document.title = GAME_TITLE + " | Collier Entertainment";
bind();
requestAnimationFrame(frame);

const params = new URLSearchParams(location.search);
if (params.get("reset") === "1") {
  save = freshSave({ help: true, walkTip: true });
  persist();
  drawHub();
}
const start = params.get("world");
if (start && worldById(start) && !(start === "meta" && clearedCount() < 8)) enter(start, false);
