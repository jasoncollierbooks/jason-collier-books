import * as THREE from "three";
import { WORLDS, ORDER, worldById } from "./worlds.js";
import { GAME_TITLE } from "./title.js";
import { dressScene } from "./look.js";
import {
  CELL, SPEED, FACE, createState, movePlayer, interact, nearest, objective,
  lettersHeld, submitCode, hintFor, cellOf, angDiff,
} from "./logic.js";
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
let clock = 0;
let last = 0;
let saveAt = 0;
let stepLeft = 0;
const keys = {};
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
  panel.hidden = false;
  panel.innerHTML = `<div class="scrim"${lock ? "" : " data-close"}></div><div class="sheet" role="dialog">${html}</div>`;
  look.style.pointerEvents = "none";
}

function closePanel() {
  panel.hidden = true;
  panel.innerHTML = "";
  if (world) look.style.pointerEvents = "auto";
}

function helpHtml() {
  return `<h2>How to play</h2>
    <p>Walk the maze. Read what is carved. Some letters show only under the lantern, some only when you look along a wall or up at the ceiling.</p>
    <p>A bright door is often a lie. A room that brings you back is telling you the truth about itself. Walls move when you do the thing the room asked for.</p>
    <p>The gate wants the letters you found, in the order a carving explains. Hints start vague. The third one is plain.</p>
    <p><strong>Phone.</strong> The left stick moves. Drag the view to look. A short tap steps forward. Light, Use, Hint, Notes.</p>
    <p><strong>Keyboard.</strong> WASD or arrows move and turn. Drag the mouse to look. F lantern. E or Space uses what is in front of you. H hint.</p>
    <div class="row"><button type="button" data-close>Step in</button></div>`;
}

function settingsHtml() {
  return `<h2>On this device</h2>
    <p><label><input type="checkbox" id="sound" ${save.sound ? "checked" : ""}> Sound</label></p>
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
  const skyLight = new THREE.Color(world.theme.sky).lerp(new THREE.Color(0xfff6e8), 0.55);
  scene.add(new THREE.HemisphereLight(skyLight, 0x8a7560, 0.95));
  const sun = new THREE.DirectionalLight(0xfff1d2, 0.62);
  sun.position.set(-10, 18, 6);
  scene.add(sun);
  const lampColor = world.theme.lamp;
  spot = new THREE.SpotLight(lampColor, 0, 18, 0.72, 0.45, 1.2);
  spot.castShadow = true;
  spot.shadow.mapSize.set(coarse ? 256 : 512, coarse ? 256 : 512);
  spot.shadow.bias = -0.0008;
  spot.shadow.normalBias = 0.045;
  spot.shadow.camera.near = 0.4;
  spot.shadow.camera.far = 22;
  const target = new THREE.Object3D();
  target.position.set(0, 0, -1);
  fillLamp = new THREE.PointLight(lampColor, 0, 7.5, 2);
  camera.add(spot);
  camera.add(target);
  camera.add(fillLamp);
  spot.target = target;
  const built = dressScene(scene, world, coarse);
  doors = built.doors;
  plaques = built.plaques;
  particles = built.particles;
  applyLight();
  resize();
}

let fillLamp = null;

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
}

function ensureRenderer() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: view, antialias: !coarse, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.15 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = coarse ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
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
  touch.hidden = false;
  look.hidden = false;
  cross.hidden = coarse;
  document.getElementById("kicker").textContent = world.kicker;
  document.getElementById("title").textContent = world.title;
  refreshHud();
  if (!save.help) {
    save.help = true;
    persist();
    openPanel(helpHtml(), false);
  }
}

function leave() {
  if (state && !state.cleared) snapshot();
  persist();
  closePanel();
  world = null;
  state = null;
  audio.play("parlor");
  drawHub();
}

function refreshHud() {
  if (!world) return;
  document.getElementById("objective").textContent = objective(world, state);
  const held = lettersHeld(world, state).slice().sort((a, b) => a.letter.localeCompare(b.letter) || a.tag.localeCompare(b.tag));
  const need = (world.tokens || []).filter((t) => t.letter).length;
  document.getElementById("held").textContent = need ? "Letters " + held.length + "/" + need + (held.length ? " · " + held.map((h) => h.letter).join(" ") : "") : "";
  toast.hidden = !state.msg;
  toast.textContent = state.msg || "";
  const near = nearest(world, state);
  if (!near || !panel.hidden) {
    promptEl.hidden = true;
  } else {
    promptEl.hidden = false;
    promptEl.textContent = near.etype === "gate" ? "Use · the gate" : near.etype === "sign" ? "Use · read" : "Use";
  }
}

function useNow() {
  if (!world || !panel.hidden) return;
  const res = interact(world, state);
  applyLight();
  refreshHud();
  if (res.ui === "code") {
      openPanel(codeHtml(), false);
      const field = document.getElementById("code");
      if (field) field.focus();
    }
  else if (res.ui === "read") {
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
  refreshHud();
  openPanel(`<h2>Hint ${h.tier + 1} of 3</h2><p>${escapeHtml(h.text)}</p><div class="row"><button type="button" data-close>Close</button></div>`, false);
  snapshot();
  persist();
}

function tryCode(raw) {
  const res = submitCode(world, state, raw);
  if (!res.ok) {
    state.msg = res.msg;
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
  openPanel(winHtml(res.shown), true);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  if (!world || !state || !scene) return;
  clock += dt;
  if (panel.hidden) {
    let ix = joy.x;
    let iz = -joy.y;
    if (keys.w || keys.arrowup) iz += 1;
    if (keys.s || keys.arrowdown) iz -= 1;
    if (keys.a) ix -= 1;
    if (keys.d) ix += 1;
    if (stepLeft > 0) { iz += 1; stepLeft -= dt; }
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    if (keys.arrowleft) state.yaw -= 1.7 * dt * sens;
    if (keys.arrowright) state.yaw += 1.7 * dt * sens;
    const fx = Math.sin(state.yaw);
    const fz = -Math.cos(state.yaw);
    const rx = Math.cos(state.yaw);
    const rz = Math.sin(state.yaw);
    const moving = len > 0.05;
    movePlayer(world, state, (fx * iz + rx * ix) * SPEED * dt, (fz * iz + rz * ix) * SPEED * dt);
    const bob = moving && !reduce ? Math.sin(clock * 8) * 0.035 : 0;
    camera.position.set(state.px, EYE + bob, state.pz);
    camera.rotation.y = -state.yaw;
    camera.rotation.x = state.pitch;
    if (now - saveAt > 2000) { saveAt = now; snapshot(); persist(); }
  }
  const fire = scene.getObjectByName("fire");
  if (fire && !reduce) fire.scale.y = 0.85 + Math.sin(clock * 9) * 0.15;
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
  renderer.render(scene, camera);
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
  });
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) {
      if (e.key === "Enter" && e.target.id === "code") tryCode(e.target.value);
      return;
    }
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === "escape") closePanel();
    if (!world || !panel.hidden) return;
    if (k === "f") toggleLight();
    if (k === "e" || k === " ") useNow();
    if (k === "h") doHint();
    if (k === "j") openPanel(notesHtml(), false);
  });
  window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => Object.keys(keys).forEach((k) => { keys[k] = false; }));

  let drag = null;
  look.addEventListener("pointerdown", (e) => {
    audio.resume();
    if (!panel.hidden) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    look.setPointerCapture(e.pointerId);
  });
  look.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id || !state) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (dx * dx + dy * dy > 16) drag.moved = true;
    state.yaw += dx * 0.0042 * sens;
    state.pitch = Math.max(-1.15, Math.min(1.05, state.pitch - dy * 0.0036 * sens));
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  function endLook(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const tap = !drag.moved;
    drag = null;
    if (!tap || !state || !panel.hidden) return;
    if (nearest(world, state)) useNow();
    else stepLeft = 0.34;
  }
  look.addEventListener("pointerup", endLook);
  look.addEventListener("pointercancel", endLook);

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
  stick.addEventListener("pointerdown", (e) => {
    audio.resume();
    joy.id = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    joyPos(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === joy.id) joyPos(e); });
  function endJoy(e) {
    if (e.pointerId !== joy.id) return;
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    knob.style.transform = "";
  }
  stick.addEventListener("pointerup", endJoy);
  stick.addEventListener("pointercancel", endJoy);
  window.addEventListener("resize", resize);
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
  save = { v: 1, cleared: {}, meta: false, sound: true, sens: 1, help: true, run: null };
  persist();
  drawHub();
}
const start = params.get("world");
if (start && worldById(start) && !(start === "meta" && clearedCount() < 8)) enter(start, false);
