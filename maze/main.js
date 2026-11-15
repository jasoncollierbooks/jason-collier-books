import * as THREE from "three";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from "three/addons";
import { WORLDS, ORDER, worldById } from "./worlds.js";
import { GAME_TITLE } from "./title.js";
import { dressScene } from "./look.js";
import { preloadWorld, speak, speakChain, stopSpeak, unlockSpeech, busy } from "./speech.js?v=3";
import {
  CELL, SPEED, FACE, createState, movePlayer, interact, nearest, objective,
  lettersHeld, letterProgress, submitCode, hintFor, cellOf, center, wayFrom, angDiff,
} from "./logic.js";
import { pointLine, idleLine } from "./cast.js";
import { createAudio } from "./audio.js";

const SAVE_KEY = "ce-cryptic-mazes-v1";
const EYE = 1.52;
const coarse = matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const view = document.getElementById("view");
const look = document.getElementById("look");
const hub = document.getElementById("hub");
const hud = document.getElementById("hud");
const toast = document.getElementById("toast");
const promptEl = document.getElementById("prompt");
const panel = document.getElementById("panel");
const touch = document.getElementById("touch");
const cross = document.getElementById("cross");
const stick = document.getElementById("stick");
const knob = document.getElementById("knob");

const audio = createAudio();
let save = load();
let world = null;
let state = null;
let renderer = null;
let scene = null;
let camera = null;
let spot = null;
let doors = [];
let plaques = [];
let particles = null;
let people = [];
let crumbs = null;
let mapOn = true;
let mapBig = false;
const idle = { x: 0, z: 0, t: 0 };
let voicedAt = 0;
let sprintUntil = 0;
let lastTap = 0;
let nearClue = false;
let turnHeld = 0;
let speaking = null;
const TURN = 2.2;
let clock = 0;
let last = 0;
let saveAt = 0;
let stepLeft = 0;
const hold = { on: false, hurry: false, gas: 0, wantSteer: 0, steer: 0, pitch: 0, timer: 0, lastUp: 0, lastWasTap: false };
const keys = {};
const phoneLayout = matchMedia("(pointer: coarse), (max-width: 900px)");
function directWalk() { return phoneLayout.matches && !save.stick; }
function applyStick() { document.body.classList.toggle("stick", !!save.stick); }
const joy = { x: 0, y: 0, id: null };
let sens = save.sens || 1;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && raw.v === 1) return raw;
  } catch (e) { /* empty save */ }
  return { v: 1, cleared: {}, meta: false, sound: true, sens: 1, help: false, run: null };
}

function persist() {
  save.sens = sens;
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
  state.yaw = run.yaw;
  state.pitch = run.pitch;
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
    <p class="lede">Eight worlds from the shelf, each with the exit hidden. A lantern, a wrong door, and a word you have to earn. When every page is branded, the cabinet has one more lock.</p>
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
  look.hidden = true;
  cross.hidden = true;
  hub.hidden = false;
}

function openPanel(html, lock) {
  if (typeof showBig === "function") showBig(false);
  hold.on = false;
  hold.hurry = false;
  hold.wantSteer = 0;
  panel.hidden = false;
  panel.innerHTML = `<div class="scrim"${lock ? "" : " data-close"}></div><div class="sheet" role="dialog">${html}</div>`;
  look.style.pointerEvents = "none";
  if (document.pointerLockElement) document.exitPointerLock();
}

function closePanel() {
  panel.hidden = true;
  panel.innerHTML = "";
  if (world) look.style.pointerEvents = "auto";
  if (state) {
    idle.x = state.px;
    idle.z = state.pz;
    idle.t = clock;
  }
}

function helpHtml() {
  return `<h2>How to play</h2>
    <p>Walk the maze. Read what is carved. Some letters show only under the lantern, some only when you look along a wall or up at the ceiling.</p>
    <p>A bright door is often a lie. A room that brings you back is telling you the truth about itself. Walls move when you do the thing the room asked for.</p>
    <p>The gate wants the letters you found, in the order a carving explains. Hints start vague. The third one is plain.</p>
    <p><strong>Phone.</strong> Hold a finger on the view to walk. Slide it sideways to steer. Let go to stop. A quick tap steps forward. Hold twice to hurry. Light, Use, Hint, and Map stay where they are. The stick can be turned back on in settings.</p>
    <p><strong>Keyboard.</strong> W and S walk. A and D, or the arrow keys, turn. Z and C sidestep. Hold Shift, or tap W twice, to hurry. Click the view to capture the mouse, and press Esc to let it go. Dragging still looks if the mouse is free. F lantern. E or Space uses what is in front of you, or talks to someone standing there. H hint. M shows the map. B toggles the head bob.</p>
    <p>The map only inks corridors you have seen. Your arrow shows which way you face. N is north. Gold is the next mark, once you have seen it, and the arch is the gate. Tap the map to make it large. A gold mark means a wall gave way. A curl means a room folded.</p>
    <p>Gold stones on the floor, and the needle beside the letter count, point to the next mark. Someone at a junction will point out loud. Stand still and the storyteller will too. Trail markers can be turned off in settings.</p>
    <p>People in the maze speak. Captions are off until you turn them on.</p>
    <div class="row"><button type="button" data-close>Step in</button></div>`;
}

function settingsHtml() {
  return `<h2>On this device</h2>
    <p><label><input type="checkbox" id="sound" ${save.sound ? "checked" : ""}> Sound</label></p>
    <p><label><input type="checkbox" id="bob" ${save.bob !== false ? "checked" : ""}> Head bob</label></p>
    <p><label><input type="checkbox" id="captions" ${save.captions ? "checked" : ""}> Captions</label></p>
    <p><label><input type="checkbox" id="stick" ${save.stick ? "checked" : ""}> On-screen stick</label></p>
    <p><label><input type="checkbox" id="guide" ${save.guide !== false ? "checked" : ""}> Trail markers</label></p>
    <p>Look speed</p>
    <div class="row">
      <button type="button" data-sens="0.7">Slow</button>
      <button type="button" data-sens="1">Normal</button>
      <button type="button" data-sens="1.4">Fast</button>
    </div>
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

function buildScene() {
  disposeScene();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(coarse ? 78 : 72, 1, 0.08, 80);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const lampColor = world.theme.lamp;
  spot = new THREE.SpotLight(lampColor, 0, 16, 0.8, 0.5, 1.1);
  spot.castShadow = false;
  const target = new THREE.Object3D();
  target.position.set(0, -0.15, -1);
  fillLamp = new THREE.PointLight(lampColor, 0, 9, 2);
  camera.add(spot);
  camera.add(target);
  camera.add(fillLamp);
  spot.target = target;
  const built = dressScene(scene, world, coarse, renderer);
  people = [];
  scene.traverse((obj) => {
    if (obj.name !== "cast" || !obj.userData.lines) return;
    people.push({
      id: obj.userData.person,
      name: obj.userData.nameLabel,
      lines: obj.userData.lines,
      mesh: obj,
      wx: obj.userData.home.x,
      wz: obj.userData.home.z,
      x: obj.userData.cell ? obj.userData.cell.x : cellOf(obj.userData.home.x, obj.userData.home.z).x,
      z: obj.userData.cell ? obj.userData.cell.z : cellOf(obj.userData.home.x, obj.userData.home.z).z,
    });
  });
  crumbs = new THREE.Group();
  crumbs.name = "crumbs";
  for (let i = 0; i < 7; i++) {
    const stone = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd56a })
    );
    stone.visible = false;
    crumbs.add(stone);
  }
  scene.add(crumbs);
  doors = built.doors;
  plaques = built.plaques;
  particles = built.particles;
  try {
    if (!coarse) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.14, 0.25, 0.9));
      composer.addPass(new OutputPass());
    } else composer = null;
  } catch (e) {
    composer = null;
  }
  applyLight();
  resize();
}

let fillLamp = null;
let composer = null;

function disposeScene() {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? [].concat(o.material) : [];
    mats.forEach((m) => {
      if (m.map) m.map.dispose();
      if (m.normalMap) m.normalMap.dispose();
      m.dispose();
    });
  });
  scene = null;
  doors = [];
  plaques = [];
  particles = null;
  crumbs = null;
}


function plaqueReady(entry) {
  if (!entry.secret) return true;
  const t = entry.entry;
  if (t.kind === "lantern" || t.need === "lantern") return state.light;
  if (t.kind === "angle") return angDiff(state.yaw, FACE[t.face] || 0) < 0.55;
  if (t.kind === "pitch") return state.pitch < -0.62;
  return true;
}

function applyLight() {
  const on = !!(state && state.light);
  if (spot) spot.intensity = on ? 9 : 0;
  if (fillLamp) fillLamp.intensity = on ? 2.4 : 0;
  const btn = document.getElementById("btn-light");
  if (btn) btn.classList.toggle("on", on);
}

function resize() {
  if (!renderer || !camera) return;
  const w = view.clientWidth || window.innerWidth;
  const h = view.clientHeight || window.innerHeight;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
}

function ensureRenderer() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: view, antialias: !coarse, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    return true;
  } catch (e) {
    hub.innerHTML = "<div class='hub-inner'><h1>" + GAME_TITLE + "</h1><p>This browser could not start the 3D view.</p></div>";
    return false;
  }
}

function enter(id, resume) {
  if (id === "meta" && clearedCount() < 8) return;
  const next = worldById(id);
  if (!next) return;
  if (!ensureRenderer()) return;
  closePanel();
  world = next;
  state = createState(world);
  if (resume && save.run && save.run.id === id) restore(save.run);
  buildScene();
  audio.play(world.theme.ambient);
  audio.setMuted(!save.sound);
  hub.hidden = true;
  hud.hidden = false;
  seedMap();
  showMap(mapOn);
  idle.x = state.px;
  idle.z = state.pz;
  idle.t = clock;
  voicedAt = clock;
  touch.hidden = false;
  look.hidden = false;
  cross.hidden = coarse;
  document.getElementById("kicker").textContent = world.kicker;
  document.getElementById("title").textContent = world.title;
  refreshHud();
  unlockSpeech();
  preloadWorld(world.id);
  applyStick();
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
  if (!directWalk() || save.walkTip) {
    if (tip) tip.hidden = true;
    then();
    return;
  }
  save.walkTip = true;
  persist();
  if (tip) tip.hidden = false;
  speak("Hold to walk, slide to steer.", { id: "narrator", name: "Tip" });
  markSpeaking("narrator", "Hold to walk, slide to steer.");
  setTimeout(() => {
    if (tip) tip.hidden = true;
    if (world) then();
  }, 2300);
}

function showMap(on) {
  mapOn = on;
  const canvas = document.getElementById("minimap");
  const btn = document.getElementById("btn-map");
  if (canvas) canvas.hidden = !on || !world;
  if (btn) {
    btn.hidden = !world;
    btn.textContent = on ? "Hide map" : "Map";
  }
  const cc = document.getElementById("btn-captions");
  if (cc) {
    cc.hidden = !world;
    cc.classList.toggle("on", !!save.captions);
  }
}

function personSpot(person) {
  if (person.mesh) return { x: person.mesh.position.x, z: person.mesh.position.z };
  return { x: person.wx, z: person.wz };
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
  for (let z = here.z - 7; z <= here.z + 2; z++) {
    for (let x = here.x - 8; x <= here.x + 1; x++) {
      if (x < 0 || z < 0 || x >= cols || z >= rows) continue;
      if (Math.abs(x - here.x) + Math.abs(z - here.z) > 7) continue;
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
  for (const [x, z] of [[c.x, c.z], [c.x + 1, c.z], [c.x - 1, c.z], [c.x, c.z + 1], [c.x, c.z - 1]]) {
    if (x < 0 || z < 0 || x >= cols || z >= rows) continue;
    const ch = world.grid[z][x];
    const shut = (ch === "+" && !state.flags[world.door]) || (ch === "=" && !state.flags[world.door2]) || ch === "#";
    const key = x + "," + z;
    if (shut) state.knownWall[key] = 1;
    else {
      if (state.knownWall[key] && (ch === "+" || ch === "=")) state.stirred[key] = 1;
      state.seen[key] = 1;
    }
  }
}

function updateGuide() {
  const on = save.guide !== false && !state.cleared;
  const here = cellOf(state.px, state.pz);
  const way = on ? wayFrom(world, state, here.x, here.z) : null;
  const bearing = document.getElementById("bearing");
  const name = document.getElementById("bearing-name");
  const needle = document.getElementById("needle");
  if (bearing) bearing.hidden = !way || !way.dir;
  if (way && way.dir && name) {
    const word = way.dir.charAt(0).toUpperCase() + way.dir.slice(1);
    name.textContent = (way.target.kind === "gate" ? "Gate" : "Next") + " · " + word;
  }
  if (needle && way && way.dir) {
    const ang = way.dir === "east" ? Math.PI / 2 : way.dir === "west" ? -Math.PI / 2 : way.dir === "south" ? Math.PI : 0;
    needle.style.transform = "rotate(" + (ang - state.yaw) + "rad)";
  }
  if (crumbs) {
    const path = way && way.path ? way.path : [];
    crumbs.children.forEach((stone, i) => {
      const step = path[i + 1];
      if (!on || !step) { stone.visible = false; return; }
      const spot = center(step[0], step[1]);
      stone.visible = true;
      stone.position.set(spot.x, 0.14 + Math.sin(clock * 3 + i) * 0.02, spot.z);
      stone.scale.setScalar(1);
    });
  }
  if (view) view.dataset.bearing = way && way.dir ? way.dir : "";
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
  if (mapBig || busy() || clock < 8) return;
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
  const way = wayFrom(world, state, here.x, here.z);
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

function showBig(on) {
  mapBig = !!on && !!world;
  const overlay = document.getElementById("map-overlay");
  if (overlay) overlay.hidden = !mapBig;
  if (mapBig) paintMap(document.getElementById("map-big"), true);
}

function paintMap(canvas, big) {
  if (!canvas || !world || !state) return;
  const g = canvas.getContext("2d");
  const cols = world.grid[0].length;
  const rows = world.grid.length;
  let minX = cols, maxX = 0, minZ = rows, maxZ = 0;
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (!state.seen[x + "," + z] && !state.knownWall[x + "," + z]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  if (minX > maxX) { minX = 0; maxX = 1; minZ = 0; maxZ = 1; }
  const spanX = maxX - minX + 1;
  const spanZ = maxZ - minZ + 1;
  const pad = big ? 36 : 22;
  const cell = Math.min((canvas.width - pad * 2) / spanX, (canvas.height - pad * 2) / spanZ);
  const ox = (canvas.width - cell * spanX) / 2 - minX * cell;
  const oy = (canvas.height - cell * spanZ) / 2 - minZ * cell;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "#c9b48a";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = "rgba(90,58,28,0.18)";
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const key = x + "," + z;
      if (!state.seen[key] && !state.knownWall[key]) continue;
      const ch = world.grid[z][x];
      const shut = ch === "#" || (ch === "+" && !state.flags[world.door]) || (ch === "=" && !state.flags[world.door2]);
      g.fillStyle = shut ? "#5c3a22" : (state.seen[key] ? "#f4e6c4" : "#b89a6a");
      g.fillRect(ox + x * cell, oy + z * cell, Math.max(1, cell - 0.6), Math.max(1, cell - 0.6));
      if (state.stirred[key]) {
        g.strokeStyle = "#c47a18";
        g.lineWidth = Math.max(1, cell * 0.08);
        g.strokeRect(ox + x * cell + 1, oy + z * cell + 1, cell - 2, cell - 2);
      }
      if (state.folded && state.folded[key]) {
        g.strokeStyle = "#5a3a78";
        g.lineWidth = Math.max(1, cell * 0.08);
        g.beginPath();
        g.arc(ox + (x + 0.5) * cell, oy + (z + 0.5) * cell, cell * 0.28, 0, Math.PI * 2);
        g.stroke();
      }
    }
  }
  const hereCell = cellOf(state.px, state.pz);
  const target = wayFrom(world, state, hereCell.x, hereCell.z);
  const gateCell = findGate();
  if (gateCell && state.seen[gateCell.x + "," + gateCell.z]) {
    drawArch(g, ox + (gateCell.x + 0.5) * cell, oy + (gateCell.z + 0.5) * cell, cell);
  }
  for (const t of world.tokens || []) {
    if (!t.letter && !t.blocks) continue;
    if (!state.seen[t.x + "," + t.z]) continue;
    const cx = ox + (t.x + 0.5) * cell;
    const cy = oy + (t.z + 0.5) * cell;
    const found = !!(t.letter && state.found[t.id]) || !!(t.blocks && state.flags[t.flag]);
    const hot = target && target.target.id === t.id;
    drawDiamond(g, cx, cy, cell * (hot ? 0.34 : 0.26), found ? "#8a7048" : "#c47a18");
    if (t.letter && cell > 11) {
      g.fillStyle = found ? "#3a2a18" : "#1a120c";
      g.font = "600 " + Math.max(8, cell * 0.42) + "px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(t.letter, cx, cy + 0.5);
    }
  }
  people.forEach((p) => {
    if (!state.seen[p.x + "," + p.z]) return;
    const cx = ox + (p.x + 0.5) * cell;
    const cy = oy + (p.z + 0.5) * cell;
    g.fillStyle = "#8a3a22";
    g.beginPath();
    g.arc(cx, cy, Math.max(2.2, cell * 0.2), 0, Math.PI * 2);
    g.fill();
    if (big && cell > 14) {
      g.fillStyle = "#1a120c";
      g.font = "600 " + Math.max(9, cell * 0.28) + "px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "bottom";
      g.fillText(p.name, cx, cy - cell * 0.28);
    }
  });
  const here = cellOf(state.px, state.pz);
  const px = ox + (state.px / CELL) * cell;
  const py = oy + (state.pz / CELL) * cell;
  if (save.guide !== false && target && target.dir) {
    const ang = target.dir === "east" ? 0 : target.dir === "south" ? Math.PI / 2 : target.dir === "west" ? Math.PI : -Math.PI / 2;
    g.strokeStyle = "#c47a18";
    g.lineWidth = Math.max(2, cell * 0.09);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(ang) * cell * 1.7, py + Math.sin(ang) * cell * 1.7);
    g.stroke();
  }
  g.save();
  g.translate(px, py);
  g.rotate(state.yaw);
  g.fillStyle = "#1a120c";
  g.strokeStyle = "#f4e6c4";
  g.lineWidth = Math.max(1, cell * 0.06);
  g.beginPath();
  g.moveTo(0, -cell * 0.46);
  g.lineTo(cell * 0.26, cell * 0.32);
  g.lineTo(-cell * 0.26, cell * 0.32);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  g.fillStyle = "#3a2416";
  g.font = "700 " + (big ? 28 : 18) + "px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "top";
  g.fillText("N", canvas.width / 2, 6);
  if (!state.seen[here.x + "," + here.z]) revealMap();
}

function findGate() {
  for (let z = 0; z < world.grid.length; z++) {
    for (let x = 0; x < world.grid[z].length; x++) {
      if (world.grid[z][x] === "G") return { x, z };
    }
  }
  return null;
}

function drawDiamond(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r, y);
  g.lineTo(x, y + r);
  g.lineTo(x - r, y);
  g.closePath();
  g.fill();
}

function drawArch(g, x, y, cell) {
  const w = cell * 0.34;
  const h = cell * 0.42;
  g.strokeStyle = "#1a120c";
  g.lineWidth = Math.max(1.5, cell * 0.08);
  g.beginPath();
  g.moveTo(x - w, y + h * 0.45);
  g.lineTo(x - w, y - h * 0.15);
  g.quadraticCurveTo(x, y - h, x + w, y - h * 0.15);
  g.lineTo(x + w, y + h * 0.45);
  g.stroke();
}

function drawMap() {
  const canvas = document.getElementById("minimap");
  if (!canvas || canvas.hidden || !world || !state) return;
  paintMap(canvas, false);
  if (mapBig) paintMap(document.getElementById("map-big"), true);
}

function leave() {
  const canvas = document.getElementById("minimap");
  const btn = document.getElementById("btn-map");
  if (canvas) canvas.hidden = true;
  if (btn) btn.hidden = true;
  showBig(false);
  const cc = document.getElementById("btn-captions");
  if (cc) cc.hidden = true;
  if (state && !state.cleared) snapshot();
  persist();
  stopSpeak();
  speaking = null;
  closePanel();
  world = null;
  state = null;
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
    }
  else if (res.ui === "read" && save.captions) {
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

function stickAxis(v) {
  const dead = 0.14;
  if (Math.abs(v) < dead) return 0;
  const sign = v < 0 ? -1 : 1;
  return sign * (Math.abs(v) - dead) / (1 - dead);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (!world || !state || !scene) return;
  clock += dt;
  if (panel.hidden) {
    const stickX = stickAxis(joy.x);
    const stickY = stickAxis(joy.y);
    let ix = 0;
    let iz = -stickY;
    if (keys.w || keys.arrowup) iz += 1;
    if (keys.s || keys.arrowdown) iz -= 1;
    if (keys.z) ix -= 1;
    if (keys.c) ix += 1;
    if (stepLeft > 0) { iz += 1; stepLeft -= dt; }
    const gasGoal = hold.on ? 1 : 0;
    hold.gas += (gasGoal - hold.gas) * (1 - Math.exp(-(hold.on ? 5.2 : 7.5) * dt));
    if (hold.gas > 0.02) iz += hold.gas;
    hold.wantSteer *= Math.exp(-7 * dt);
    hold.steer += (hold.wantSteer - hold.steer) * (1 - Math.exp(-14 * dt));
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    if (keys.a || keys.arrowleft || turnHeld < 0) state.yaw -= TURN * dt * sens;
    if (keys.d || keys.arrowright || turnHeld > 0) state.yaw += TURN * dt * sens;
    if (stickX) state.yaw += stickX * TURN * dt * sens;
    if (Math.abs(hold.steer) > 0.02) state.yaw += hold.steer * dt * sens;
    if (hold.pitch) {
      state.pitch = Math.max(-1.15, Math.min(1.05, state.pitch + hold.pitch));
      hold.pitch = 0;
    }
    const fx = Math.sin(state.yaw);
    const fz = -Math.cos(state.yaw);
    const rx = Math.cos(state.yaw);
    const rz = Math.sin(state.yaw);
    const moving = len > 0.05;
    const sprint = keys.shift || clock < sprintUntil || hold.hurry;
    const pace = SPEED * (sprint ? 1.7 : 1);
    movePlayer(world, state, (fx * iz + rx * ix) * pace * dt, (fz * iz + rz * ix) * pace * dt);
    const bob = moving && save.bob !== false && !reduce ? Math.sin(clock * 9) * 0.05 : 0;
    revealMap();
    updateGuide();
    guideSpeech();
    const clue = (world.tokens || []).some((t) => t.letter && !state.found[t.id] && Math.hypot(state.px - (t.x + 0.5) * CELL, state.pz - (t.z + 0.5) * CELL) < 2.3);
    if (clue && !nearClue) audio.blip();
    nearClue = clue;
    camera.position.set(state.px, EYE + bob, state.pz);
    camera.rotation.y = -state.yaw;
    view.dataset.yaw = String(state.yaw);
    view.dataset.holding = hold.on ? "1" : "0";
    view.dataset.gas = hold.gas.toFixed(2);
    camera.rotation.x = state.pitch;
    if (now - saveAt > 2000) { saveAt = now; snapshot(); persist(); }
  }
  const fire = scene.getObjectByName("fire");
  if (fire && !reduce) {
    fire.children.forEach((child, i) => {
      if (!child.isMesh || !child.userData.base) return;
      child.scale.y = 0.75 + Math.sin(clock * 14 + i * 1.7) * 0.3;
    });
    const glow = fire.getObjectByName("firelight");
    if (glow) glow.intensity = 1.7 + Math.sin(clock * 17) * 0.7;
  }
  const embers = scene.getObjectByName("embers");
  if (embers && !reduce) {
    const arr = embers.geometry.attributes.position;
    for (let i = 0; i < arr.count; i++) {
      let y = arr.getY(i) + dt * 0.55;
      if (y > 1.15 || arr.getX(i) === 0) {
        y = 0.2;
        arr.setX(i, (Math.random() - 0.5) * 0.35);
        arr.setZ(i, (Math.random() - 0.5) * 0.35);
      }
      arr.setY(i, y);
    }
    arr.needsUpdate = true;
  }
  if (!reduce && scene.getObjectsByProperty) {
    scene.getObjectsByProperty("name", "glowbit").forEach((bit, i) => {
      const s = 1 + Math.sin(clock * 2.4 + i) * 0.07;
      bit.scale.setScalar(s);
    });
  }
  if (scene.getObjectsByProperty) {
    const ease = (cur, goal, rate) => cur + (goal - cur) * (1 - Math.exp(-rate * dt));
    scene.getObjectsByProperty("name", "cast").forEach((root) => {
      const ud = root.userData;
      const home = ud.home || { x: root.position.x, z: root.position.z };
      const bob = ud.bob || 0;
      const dist = Math.hypot(camera.position.x - home.x, camera.position.z - home.z);
      ud.near = ease(ud.near || 0, dist < 3.1 ? 1 : 0, 3.2);
      ud.talk = ease(ud.talk || 0, speaking && speaking.id === ud.person && clock < speaking.until ? 1 : 0, 5);
      if (ud.near > 0.7 && !ud.greeted) { ud.hopT = clock; ud.greeted = true; }
      if (ud.near < 0.25) ud.greeted = false;
      const along = Math.sin(clock * 0.4 + bob) * (ud.span || 0.3) * (1 - ud.near * 0.9);
      const tx = home.x + (ud.axis === "z" ? 0 : along);
      const tz = home.z + (ud.axis === "z" ? along : 0);
      const walking = (1 - ud.near) * Math.min(1, (ud.span || 0.3) / 0.3);
      const step = Math.abs(Math.sin(clock * 5.4 + bob)) * 0.04 * walking;
      let hop = 0;
      let wave = 0;
      if (ud.hopT != null) {
        const k = (clock - ud.hopT) / 0.62;
        if (k >= 0 && k < 1) {
          hop = Math.sin(k * Math.PI) * 0.1;
          wave = Math.sin(k * Math.PI * 2) * 0.06;
        }
      }
      if (ud.px == null) { ud.px = tx; ud.pz = tz; }
      ud.px = ease(ud.px, tx, 3.2);
      ud.pz = ease(ud.pz, tz, 3.2);
      const face = Math.atan2(camera.position.x - ud.px, camera.position.z - ud.pz);
      if (ud.yaw == null) ud.yaw = face;
      let turn = face - ud.yaw;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      ud.yaw += turn * (1 - Math.exp(-5.5 * dt));
      const breathe = 1 + Math.sin(clock * 1.65 + bob) * 0.014;
      const talkPulse = 1 + ud.talk * (0.018 + Math.sin(clock * 5.2) * 0.016);
      const sy = breathe * talkPulse;
      const body = root.getObjectByName("body");
      if (ud.sprite) {
        root.position.set(ud.px, hop + step, ud.pz);
        root.rotation.set(0, ud.yaw, 0);
        if (body) {
          body.scale.set(1, sy, 1);
          body.position.y = (ud.height || 1.74) * sy / 2;
          body.rotation.z = Math.sin(clock * 1.05 + bob) * 0.016 + wave;
        }
        if (ud.shade) {
          const sway = body ? body.rotation.z : 0;
          const shift = Math.sin(sway) * (ud.height || 1.74) * 0.5 * (body ? body.scale.y : 1);
          const yaw = ud.yaw || 0;
          ud.shade.position.set(ud.px + Math.cos(yaw) * shift, 0.012, ud.pz - Math.sin(yaw) * shift);
          ud.shade.rotation.set(-Math.PI / 2, 0, 0);
        }
      } else {
        root.position.set(ud.px, 0, ud.pz);
        root.rotation.set(0, ud.yaw, 0);
        if (body) {
          body.scale.set(1, sy, 1);
          body.position.y = 0.06 + ((ud.height || 1.52) * sy) / 2 + hop * 0.35 + step * 0.25;
          body.rotation.z = Math.sin(clock * 1.05 + bob) * 0.01;
        }
      }
      const mark = root.getObjectByName("speech");
      if (mark) mark.material.opacity = ud.talk;
    });
  }
  drawMap();
  if (particles && !reduce) {
    const arr = particles.geometry.attributes.position;
    const kind = world.theme.particles;
    for (let i = 0; i < arr.count; i++) {
      let y = arr.getY(i);
      if (kind === "snow") y -= dt * 0.35;
      else if (kind === "soot") y += dt * 0.2;
      else y += Math.sin(clock + i) * dt * 0.15;
      if (y < 0.15) y = particles.userData.hi || 4;
      if (y > (particles.userData.hi || 4)) y = 0.2;
      arr.setY(i, y);
    }
    arr.needsUpdate = true;
  }
  plaques.forEach((p) => {
    const on = plaqueReady(p);
    if (p.on !== on) {
      p.on = on;
      p.mat.map = on ? p.shown : p.hidden;
      p.mat.needsUpdate = true;
    }
  });
  doors.forEach((d) => {
    const ch = world.grid[d.z][d.x];
    const open = ch === "+" ? !!state.flags[world.door] : !!state.flags[world.door2];
    if (open !== d.open) {
      d.open = open;
      d.mesh.position.y = open ? -24 : 0;
    }
  });
  if (panel.hidden) refreshHud();
  if (composer) composer.render();
  else renderer.render(scene, camera);
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
  document.getElementById("btn-map").addEventListener("click", () => { if (world) showMap(!mapOn); });
  document.getElementById("minimap").addEventListener("click", () => { if (world) showBig(!mapBig); });
  document.getElementById("map-close").addEventListener("click", () => showBig(false));
  document.getElementById("map-overlay").addEventListener("click", (e) => {
    if (e.target.id === "map-overlay") showBig(false);
  });
  document.getElementById("btn-captions").addEventListener("click", () => {
    save.captions = !save.captions;
    persist();
    document.getElementById("btn-captions").classList.toggle("on", !!save.captions);
    if (world) refreshHud();
  });
  function holdTurn(dir) {
    return (e) => {
      if (e.cancelable) e.preventDefault();
      audio.resume();
      turnHeld = dir;
      if (e.pointerId != null) {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* touchend still releases */ }
      }
    };
  }
  function releaseTurn(dir) {
    return () => { if (turnHeld === dir) turnHeld = 0; };
  }
  [["btn-left", -1], ["btn-right", 1]].forEach(([id, dir]) => {
    const el = document.getElementById(id);
    el.addEventListener("pointerdown", holdTurn(dir));
    el.addEventListener("pointerup", releaseTurn(dir));
    el.addEventListener("pointercancel", releaseTurn(dir));
    el.addEventListener("touchstart", holdTurn(dir), { passive: false });
    el.addEventListener("touchend", releaseTurn(dir), { passive: false });
    el.addEventListener("touchcancel", releaseTurn(dir), { passive: false });
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
    if (e.target.dataset.sens) { sens = Number(e.target.dataset.sens); persist(); }
    if (e.target.id === "wipe") {
      const sound = save.sound;
      world = null;
      state = null;
      save = { v: 1, cleared: {}, meta: false, sound, sens, help: true, run: null };
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
    if (e.target.id === "bob") {
      save.bob = e.target.checked;
      persist();
    }
    if (e.target.id === "captions") {
      save.captions = e.target.checked;
      persist();
      if (world) refreshHud();
    }
    if (e.target.id === "stick") {
      save.stick = e.target.checked;
      persist();
      applyStick();
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
      if (mapBig) { showBig(false); return; }
      if (document.pointerLockElement) document.exitPointerLock();
      closePanel();
    }
    if (!world || !panel.hidden) return;
    if (k === "f") toggleLight();
    if (k === "e" || k === " ") useNow();
    if (k === "h") doHint();
    if (k === "m") {
      if (mapBig) showBig(false);
      else showMap(!mapOn);
    }
    if (k === "b") { save.bob = save.bob === false; persist(); }
    if (k === "j") openPanel(notesHtml(), false);
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => Object.keys(keys).forEach((k) => { keys[k] = false; }));

  let drag = null;
  let lookFromPointer = false;
  function nudgeLook(dx, dy, rec) {
    if (!state || !panel.hidden) return;
    if (rec && dx * dx + dy * dy > 16) rec.moved = true;
    state.yaw += dx * 0.0042 * sens;
    state.pitch = Math.max(-1.15, Math.min(1.05, state.pitch - dy * 0.0036 * sens));
  }
  function tapLook() {
    if (!state || !panel.hidden) return;
    if (nearest(world, state)) useNow();
    else stepLeft = 0.34;
  }
  look.addEventListener("pointerdown", (e) => {
    audio.resume();
    unlockSpeech();
    if (!panel.hidden) return;
    if (e.pointerType === "touch") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    lookFromPointer = true;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, type: e.pointerType || "" };
    try { look.setPointerCapture(e.pointerId); } catch (err) { /* iOS may refuse capture */ }
  });
  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement !== look || !state || !panel.hidden) return;
    state.yaw += e.movementX * 0.0022 * sens;
    state.pitch = Math.max(-1.15, Math.min(1.05, state.pitch - e.movementY * 0.0018 * sens));
  });
  look.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || document.pointerLockElement === look) return;
    if (!drag || e.pointerId !== drag.id || !state) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    nudgeLook(dx, dy, drag);
  });
  function endLook(e) {
    if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
    const tap = !drag.moved;
    const kind = drag.type;
    drag = null;
    lookFromPointer = false;
    if (!tap || !state || !panel.hidden) return;
    if (!coarse && kind !== "touch" && document.pointerLockElement !== look) {
      look.requestPointerLock();
      return;
    }
    tapLook();
  }
  look.addEventListener("pointerup", endLook);
  look.addEventListener("pointercancel", endLook);
  look.addEventListener("touchstart", (e) => {
    if (e.cancelable) e.preventDefault();
    if (!panel.hidden || !e.changedTouches.length) return;
    audio.resume();
    unlockSpeech();
    const t = e.changedTouches[0];
    const nowMs = performance.now();
    const again = nowMs - hold.lastUp < 340 && hold.lastWasTap;
    drag = { id: "touch", x: t.clientX, y: t.clientY, moved: false, type: "touch", walking: false, hurry: again, t: nowMs };
    clearTimeout(hold.timer);
    if (directWalk()) {
      hold.timer = setTimeout(() => {
        if (!drag || drag.id !== "touch" || drag.moved) return;
        drag.walking = true;
        hold.on = true;
        hold.hurry = !!drag.hurry;
        const tip = document.getElementById("walk-tip");
        if (tip) tip.hidden = true;
      }, 170);
    }
  }, { passive: false });
  look.addEventListener("touchmove", (e) => {
    if (e.cancelable) e.preventDefault();
    if (!drag || drag.id !== "touch" || !e.touches.length) return;
    const t = e.touches[0];
    const dx = t.clientX - drag.x;
    const dy = t.clientY - drag.y;
    drag.x = t.clientX;
    drag.y = t.clientY;
    if (drag.walking) {
      const span = Math.max(0.016, Math.min(0.05, (performance.now() - (drag.moveT || drag.t)) / 1000));
      drag.moveT = performance.now();
      hold.wantSteer = Math.max(-2.6, Math.min(2.6, dx / span * 0.0044));
      hold.pitch += -dy * 0.0032 * sens;
      return;
    }
    nudgeLook(dx, dy, drag);
    if (drag.moved) clearTimeout(hold.timer);
  }, { passive: false });
  look.addEventListener("touchend", (e) => {
    if (e.cancelable) e.preventDefault();
    if (!drag || drag.id !== "touch") return;
    clearTimeout(hold.timer);
    const tap = !drag.moved && !drag.walking;
    hold.on = false;
    hold.hurry = false;
    hold.wantSteer = 0;
    drag = null;
    hold.lastUp = performance.now();
    hold.lastWasTap = tap;
    if (tap) tapLook();
  }, { passive: false });
  look.addEventListener("touchcancel", () => {
    clearTimeout(hold.timer);
    hold.on = false;
    hold.hurry = false;
    hold.wantSteer = 0;
    if (!lookFromPointer) drag = null;
  });

  function joyPos(e) {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const clamp = Math.min(max, len);
    dx = dx / len * clamp;
    dy = dy / len * clamp;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / max;
    joy.y = dy / max;
  }
  let joyFromPointer = false;
  stick.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    audio.resume();
    if (e.cancelable) e.preventDefault();
    if (clock - lastTap < 0.32) sprintUntil = clock + 1.5;
    lastTap = clock;
    joyFromPointer = true;
    joy.id = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch (err) { /* touch fallback still tracks the finger */ }
    joyPos(e);
  });
  stick.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || e.pointerId !== joy.id) return;
    joyPos(e);
  });
  function endJoy(e) {
    if (e && e.pointerId != null && e.pointerId !== joy.id) return;
    joyFromPointer = false;
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    knob.style.transform = "";
  }
  stick.addEventListener("pointerup", endJoy);
  stick.addEventListener("pointercancel", endJoy);
  stick.addEventListener("touchstart", (e) => {
    if (e.cancelable) e.preventDefault();
    audio.resume();
    if (!e.changedTouches.length) return;
    if (clock - lastTap < 0.32) sprintUntil = clock + 1.5;
    lastTap = clock;
    joy.id = "touch";
    joyPos(e.changedTouches[0]);
  }, { passive: false });
  stick.addEventListener("touchmove", (e) => {
    if (e.cancelable) e.preventDefault();
    if (joy.id !== "touch" || !e.touches.length) return;
    joyPos(e.touches[0]);
  }, { passive: false });
  stick.addEventListener("touchend", (e) => {
    if (e.cancelable) e.preventDefault();
    if (joy.id === "touch") endJoy();
  }, { passive: false });
  stick.addEventListener("touchcancel", () => { if (joy.id === "touch") endJoy(); });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { snapshot(); persist(); } });
  window.addEventListener("pagehide", () => { snapshot(); persist(); });
}

applyStick();
drawHub();
audio.setMuted(!save.sound);
document.title = GAME_TITLE + " | Collier Entertainment";
bind();
requestAnimationFrame(frame);

const params = new URLSearchParams(location.search);
if (params.get("reset") === "1") {
  save = { v: 1, cleared: {}, meta: false, sound: true, sens: 1, help: true, run: null };
  persist();
  drawHub();
}
const start = params.get("world");
if (start && worldById(start) && !(start === "meta" && clearedCount() < 8)) enter(start, false);
