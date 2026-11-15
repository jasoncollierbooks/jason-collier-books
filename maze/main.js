import * as THREE from "three";
import { WORLDS, ORDER, worldById } from "./worlds.js";
import {
  CELL, SPEED, FACE, createState, movePlayer, interact, nearest, objective,
  lettersHeld, submitCode, hintFor, cellOf, angDiff, findChar,
} from "./logic.js";
import { createAudio } from "./audio.js";

const SAVE_KEY = "ce-cryptic-mazes-v1";
const H = 2.7;
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
    <h1>Cryptic Mazes</h1>
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

function labelTexture(text, fg, bg) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const lines = String(text).split("\n").slice(0, 3);
  const size = lines.some((line) => line.length > 8) ? 40 : 78;
  g.font = "600 " + size + "px Georgia, serif";
  lines.forEach((line, i) => g.fillText(line.slice(0, 18), 256, 128 + (i - (lines.length - 1) / 2) * 78));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function readable(hex) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l < 0.2) c.offsetHSL(0, -0.08, 0.2 - hsl.l);
  return c;
}

function floorTexture(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const css = "#" + hex.toString(16).padStart(6, "0");
  g.fillStyle = css;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
    g.fillRect(0, Math.random() * 128, 128, 1 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeScene() {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? [].concat(o.material) : [];
    mats.forEach((m) => {
      if (m.map) m.map.dispose();
      m.dispose();
    });
  });
  scene = null;
  doors = [];
  plaques = [];
  particles = null;
}

function buildScene() {
  disposeScene();
  const theme = world.theme;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.fog, 12, 34);
  camera = new THREE.PerspectiveCamera(coarse ? 78 : 72, 1, 0.08, 60);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const skyLight = new THREE.Color(theme.sky).lerp(new THREE.Color(0xfff6e8), 0.78);
  const hemi = new THREE.HemisphereLight(skyLight, 0x8a7060, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dd, 0.72);
  sun.position.set(-8, 12, 5);
  scene.add(sun);
  spot = new THREE.SpotLight(theme.lamp, 0, 20, 0.58, 0.55, 1.1);
  const target = new THREE.Object3D();
  target.position.set(0, 0, -1);
  camera.add(spot);
  camera.add(target);
  spot.target = target;

  const rows = world.grid.length;
  const cols = world.grid[0].length;
  const wallMat = new THREE.MeshLambertMaterial({ color: readable(theme.wall) });
  const boxes = [];
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const ch = world.grid[z][x];
      if (ch === "#" || ch === "+" || ch === "=") boxes.push({ x, z, ch });
    }
  }
  const geo = new THREE.BoxGeometry(CELL, H, CELL);
  const mesh = new THREE.InstancedMesh(geo, wallMat, Math.max(1, boxes.length));
  const dummy = new THREE.Object3D();
  boxes.forEach((b, i) => {
    dummy.position.set((b.x + 0.5) * CELL, H / 2, (b.z + 0.5) * CELL);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (b.ch === "+" || b.ch === "=") doors.push({ x: b.x, z: b.z, i, open: false });
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  scene.userData.walls = mesh;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(cols * CELL, rows * CELL),
    new THREE.MeshLambertMaterial({ map: floorTexture(readable(theme.ground).getHex()), color: 0xffffff })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cols * CELL / 2, 0, rows * CELL / 2);
  scene.add(floor);
  if (theme.ceiling) {
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * CELL, rows * CELL),
      new THREE.MeshLambertMaterial({ color: 0x100e0c })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cols * CELL / 2, H, rows * CELL / 2);
    scene.add(ceil);
  }

  const accent = new THREE.MeshLambertMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.25 });
  const falseMat = new THREE.MeshLambertMaterial({ color: 0xffe2b0, emissive: 0xffb35c, emissiveIntensity: 0.45 });
  function arch(x, z, mat) {
    const g = new THREE.Group();
    const post = new THREE.BoxGeometry(0.18, 2.2, 0.18);
    const lintel = new THREE.BoxGeometry(1.5, 0.16, 0.18);
    const a = new THREE.Mesh(post, mat);
    const b = new THREE.Mesh(post, mat);
    const c = new THREE.Mesh(lintel, mat);
    a.position.set(-0.82, 1.1, 0);
    b.position.set(0.82, 1.1, 0);
    c.position.set(0, 2.2, 0);
    g.add(a, b, c);
    g.position.set((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
    scene.add(g);
  }
  findChar(world, "G").forEach((p) => arch(p.x, p.z, accent));
  findChar(world, "F").forEach((p) => arch(p.x, p.z, falseMat));

  const spawn = findChar(world, "S")[0];
  const artMat = new THREE.MeshBasicMaterial({ color: 0x222 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.15), artMat);
  const px = (spawn.x + 0.5) * CELL;
  const pz = (spawn.z + 0.5) * CELL;
  const yaw0 = world.spawnYaw || 0;
  const fx = Math.sin(yaw0);
  const fz = -Math.cos(yaw0);
  art.position.set(px - fx * 1.15, 1.4, pz - fz * 1.15);
  art.lookAt(px - fx * 3, 1.4, pz - fz * 3);
  scene.add(art);
  new THREE.TextureLoader().load(theme.art, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    artMat.map = tex;
    artMat.color.set(0xffffff);
    artMat.needsUpdate = true;
  });

  function plaqueFor(entry, text, secret) {
    const shown = labelTexture(text, "#1a140d", "#f3e2b0");
    const hidden = labelTexture("· · ·", "#2a241c", "#14110e");
    const mat = new THREE.MeshBasicMaterial({ map: secret ? hidden : shown, color: 0xffffff, side: THREE.FrontSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), mat);
    const cx = (entry.x + 0.5) * CELL;
    const cz = (entry.z + 0.5) * CELL;
    m.position.set(cx, 1.45, cz - 0.42);
    m.lookAt(cx, 1.45, cz - 2);
    scene.add(m);
    plaques.push({ entry, mesh: m, mat, shown, hidden, secret });
  }
  (world.tokens || []).forEach((t) => {
    if (t.kind === "trap") return;
    const secret = t.kind === "lantern" || t.kind === "angle" || t.kind === "pitch";
    plaqueFor(t, t.letter || "Use", secret);
  });
  (world.signs || []).forEach((s) => plaqueFor(s, s.title, s.need === "lantern"));

  dress(theme);
  addParticles(theme);
  applyLight();
  resize();
}

function dress(theme) {
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4428 });
  const metal = new THREE.MeshLambertMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.2 });
  function at(x, z, mesh, dx, dy) {
    mesh.position.set((x + 0.5) * CELL + (dx || 0.5), dy || 0, (z + 0.5) * CELL);
    scene.add(mesh);
  }
  (world.tokens || []).forEach((t) => {
    if (t.kind === "lever" || t.kind === "trap" || t.kind === "cycle") {
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), metal);
      at(t.x, t.z, lever, -0.45, 0.7);
    }
  });
  if (world.id === "trail") {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 10), wood);
    at(1, 4, wheel, 0.5, 0.45);
    wheel.rotation.y = 0.4;
  }
  if (world.id === "mountain") {
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
    at(2, 3, fire, 0.45, 0.35);
    fire.name = "fire";
    const spruce = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x1d3a28 }));
    at(1, 8, spruce, 0.45, 0.8);
  }
  if (world.id === "rusty") {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), wood);
    at(4, 9, crate, 0.4, 0.25);
  }
  if (world.id === "pulse" || world.id === "seeders") {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), metal);
    const t = (world.tokens || []).find((n) => n.kind === "lever" && n.letter) || findChar(world, "S")[0];
    at(t.x, t.z, crystal, 0.45, 0.7);
  }
  if (world.id === "envoy") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 12), metal);
    at(2, 6, ring, 0.4, 1.2);
    ring.rotation.x = Math.PI / 2.5;
  }
  if (world.id === "thorne") {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), metal);
    tube.rotation.z = Math.PI / 2;
    at(2, 4, tube, 0.4, 1.1);
  }
  if (world.id === "pine") {
    const hog = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    at(5, 6, hog, 0.4, 0.22);
  }
}

function addParticles(theme) {
  const n = coarse ? 28 : 56;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  const cols = world.grid[0].length * CELL;
  const rows = world.grid.length * CELL;
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * cols;
    pos[i * 3 + 1] = Math.random() * 3;
    pos[i * 3 + 2] = Math.random() * rows;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const color = theme.particles === "snow" ? 0xdde7ef : theme.accent;
  particles = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: coarse ? 0.06 : 0.045, transparent: true, opacity: 0.7, depthWrite: false,
  }));
  scene.add(particles);
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
  if (spot) spot.intensity = state && state.light ? 7.5 : 0;
  const btn = document.getElementById("btn-light");
  if (btn) btn.classList.toggle("on", !!(state && state.light));
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    return true;
  } catch (e) {
    hub.innerHTML = "<div class='hub-inner'><h1>Cryptic Mazes</h1><p>This browser could not start the 3D view.</p></div>";
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
      if (y < 0.1) y = 2.8;
      if (y > 3) y = 0.2;
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
      const dummy = new THREE.Object3D();
      dummy.position.set((d.x + 0.5) * CELL, open ? -8 : H / 2, (d.z + 0.5) * CELL);
      dummy.updateMatrix();
      const mesh = scene.userData.walls;
      mesh.setMatrixAt(d.i, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
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
