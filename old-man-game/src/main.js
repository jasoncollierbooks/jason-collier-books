// Old Man on the Mountain — main loop. Glues the engine (pictures), game (rules), hud and audio.
import * as THREE from "three";
import { whenLoaded } from "./loadprog.js";
import { Q } from "./quality.js";
import { createEngine, CAM_SPOTS, CAMP_FIRE } from "./engine.js";
import { createHud } from "./hud.js";
import { createInput } from "./input.js";
import * as A from "./audio.js";
import * as X from "./audio-extra.js";
import * as G from "./game.js";
import { lightAt, moonOf, snowAt } from "./light.js";
import { fireGame } from "./firegame.js";
import { cinchGame } from "./tactile.js";
import { BOUNDS, OVERLOOKS, PLACES, PLACE_IDS, VIEWS, heightAt, placeAt, trailBetween, trailDist } from "./terrain.js";
import { collide, occlusion, trunksNear, crownDepth, crownClearY } from "./forest.js";
import { clamp, damp, dampAngle, fmtClock, hash2, lerp, smooth, wrapPi } from "./util.js";
import { LINES, armThought, preloadThoughts, setVoiceMuteCheck, speakCaption, speakThought, stopThought, voiceCatalogReady, voiceReady } from "./thoughts.js";

const SAVE_KEY = "oldman-v2-save";
const canvas = document.getElementById("view");
const E = createEngine(canvas);
const hud = createHud();
const input = createInput(document.getElementById("app"), document.getElementById("stick"), document.getElementById("knob"));
for (const id of PLACE_IDS) PLACES[id].y = heightAt(PLACES[id].x, PLACES[id].z);

let S = null; // game state
const P = { x: PLACES.truck.x - 2, z: PLACES.truck.z - 6, yaw: 0, speed: 0, moving: false, running: false, sneaking: false, lastStepPhase: 0, travelled: 0, stillFor: 0 };
const cam = E.rig;
let mode = "title"; // title | play | optic | ending
let optic = null; // {kind:'binos'|'scope', yaw, pitch, hold, progress, target}
let paused = false;
let frostK = 0;
const frostEl = (() => {
  // procedural frost: dendrite crystals grown from the four corners, drawn once to a canvas
  const el = document.getElementById("frost"); if (!el) return null;
  const c = document.createElement("canvas"); c.width = 1024; c.height = 640; const g = c.getContext("2d");
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = "rgba(225,238,255,0.55)"; g.lineCap = "round";
  const branch = (x, y, a, len, w, d) => {
    if (d <= 0 || len < 3) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) { const t = 0.3 + rnd() * 0.6, bx = x + (x2 - x) * t, by = y + (y2 - y) * t; branch(bx, by, a + (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.3), len * 0.45, w * 0.6, d - 1); }
    branch(x2, y2, a + (rnd() - 0.5) * 0.4, len * 0.7, w * 0.8, d - 1);
  };
  for (const [cx, cy, a0] of [[0, 0, 0.78], [1024, 0, 2.36], [0, 640, -0.78], [1024, 640, -2.36]])
    for (let i = 0; i < 26; i++) branch(cx + (rnd() - 0.5) * 120, cy + (rnd() - 0.5) * 120, a0 + (rnd() - 0.5) * 1.6, 40 + rnd() * 90, 2.2, 5);
  el.style.backgroundImage = `url(${c.toDataURL()})`;
  return el;
})();
let harlanPose = null; // e.g. kneeling at the fire / the camera strap while an overlay is up
let lastT = performance.now();
let hintDone = (() => { try { return !!localStorage.getItem("oldman-walked"); } catch { return false; } })();
// the joystick is for touch screens only; a keyboard press hides it, a touch brings it back
{
  const touchy = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  document.body.classList.toggle("touch", touchy);
  addEventListener("keydown", () => document.body.classList.remove("touch"), { passive: true });
  addEventListener("touchstart", () => document.body.classList.add("touch"), { passive: true });
}
addEventListener("pointerdown", () => { A.unlockAudio(); armThought(); }, { passive: true });
let gameClockAcc = 0;
let lookIdleT = 0;
let fps = { acc: 0, n: 0, avg: 16 };
const TIME_SCALE = 1; // game minutes per real second while walking
const T = { now: 0 };

/* --------------------------------- creatures state --------------------------------- */
const bull = { x: 0, z: 0, yaw: 0, mode: "graze", vis: false, place: null, run: null, alertT: 0, wander: 0 };
const cows = [0, 1, 2].map((i) => ({ x: 0, z: 0, yaw: 0, off: [Math.cos(i * 2.1) * 9, Math.sin(i * 2.1) * 7], run: null, place: null }));
const W = { mode: "away", x: 0, z: 0, yaw: 0, t: 0, side: 1, hideT: 0, lastTrack: { x: 0, z: 0 }, seenNight: 0, eyes: 0, stillT: 0, charge: null, nextApproachAbs: 0, nextSpotAbs: 0, ridge: null, assault: null, pinned: 0, spot: null, scare: null };
const fp = { k: 0, target: 0, yaw: 0, pitch: 0.02, hold: 0, latched: false, sync: false };
const FP_ENTER = 22; // metres: drop into his eyes
const FP_EXIT = 34; // farther than enter, so the boundary cannot chatter
const FP_HOLD = 1.7; // seconds in first person before an exit is allowed
const FP_EASE = 0.85; // seconds to ease position and FOV
const LOOK_X = 0.0058;
const LOOK_Y = 0.0042;
let spotArm = 0;
let thinkAt = 0;
let voicedLine = "";
let lastShownLine = "";
let farT = 18;
let breathHeld = false;

/* --------------------------------- boot --------------------------------- */
function resize() { E.resize(); }
addEventListener("resize", resize);
resize();

function freshGame() {
  S = G.newGame();
  P.x = PLACES.truck.x - 2; P.z = PLACES.truck.z - 7; P.yaw = 0.05;
  cam.yaw = P.yaw;
  E.prints.clear(); E.elkTracks.clear(); E.walkerTracks.clear(); E.blood.clear();
  layElkTracks();
}
function save() {
  if (!S || S.mode !== "play") return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, P: { x: P.x, z: P.z, yaw: P.yaw } })); } catch {}
}
function migrateSave(s) {
  if (!s || typeof s !== "object" || !s.elk) return false;
  const blank = G.newGame(s.seed || 1);
  for (const k of Object.keys(blank)) if (s[k] === undefined) s[k] = blank[k];
  if (!s.flags || typeof s.flags !== "object") s.flags = {};
  if (!s.stats || typeof s.stats !== "object") s.stats = { shots: 0, cards: 0, nights: 0, seen: 0, stills: 0 };
  if (!s.walker || typeof s.walker !== "object") s.walker = { nextApproach: 0, approaches: 0, took: false };
  if (!Array.isArray(s.notes)) s.notes = [];
  if (!Array.isArray(s.beats)) s.beats = [];
  if (!Array.isArray(s.sticks)) s.sticks = [];
  if (!s.cams || typeof s.cams !== "object") s.cams = {};
  if (!s.thoughts || typeof s.thoughts !== "object") s.thoughts = {};
  if (typeof s.heart !== "number") s.heart = 80;
  if (typeof s.minutes !== "number") s.minutes = G.DAWN;
  if (typeof s.day !== "number") s.day = 1;
  s.v = 2;
  return s.mode === "play";
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d.S || !d.P || !migrateSave(d.S)) return false;
    S = d.S;
    if (S.flags.finale) S.flags.finale = 0; // a chase resumes when you near the truck again
    Object.assign(P, d.P);
    if (![P.x, P.z, P.yaw].every((n) => Number.isFinite(n))) return false;
    cam.yaw = P.yaw;
    layElkTracks();
    return true;
  } catch { return false; }
}
const NEAR_OK = new Set(["close", "retreat", "missed", "glimpse", "still", "charge", "eyes", "card"]);
const THOUGHT_BEAT = new Set(["close", "retreat", "missed", "fire", "night", "dawn", "card", "eyes", "glimpse", "charge", "still", "deer", "bugle", "cam"]);
const THOUGHT_TENSE = new Set(["close", "retreat", "missed", "nerve", "hear", "fire", "night", "dawn", "card", "eyes", "glimpse", "still", "charge", "tracks", "tree", "hair", "scat", "smell", "blood", "deer", "bugle", "cam"]);
setVoiceMuteCheck(() => !X.muted());
function monsterNear() {
  return W.mode === "spot" || W.mode === "scare" || W.mode === "still" || W.mode === "charge" || !!W.walkerNear;
}
function tensionHigh() {
  return monsterNear() || (S && S.heart < 38) || W.mode === "assault" || W.mode === "chase";
}
function think(id) {
  if (!S || S.mode !== "play") return false;
  const now = performance.now();
  const near = monsterNear();
  const high = tensionHigh();
  if (near && !NEAR_OK.has(id)) return false;
  if (high && !THOUGHT_TENSE.has(id)) return false;
  const gap = THOUGHT_BEAT.has(id) ? 3600 : (high || near ? 46000 : 22000);
  if (now - thinkAt < gap) return false;
  const gain = id === "close" || id === "still" || id === "smell" ? 0.4 : high ? 0.68 : 0.84;
  const spoken = speakThought(id, true, {
    gain,
    onbegin: (text, ms) => hud.thought(text, performance.now(), ms),
  });
  if (!spoken) return null;
  thinkAt = now;
  if (!spoken.queued) hud.thought(spoken.text, T.now || now, spoken.ms);
  return spoken;
}

/* elk tracks: a followable line of prints from the spur toward wherever he feeds today */
let elkPts = [];
let signRing = null;
function layElkTracks() {
  E.elkTracks.clear();
  elkPts = [];
  const dest = G.bullPlace(S) || G.cowsPlace(S) || "meadow";
  const from = ["spur", "burn", "camp", "knob", "saddle"].find((p) => p !== dest) || "spur";
  const path = G.route(from, dest);
  for (let i = 0; i < path.length - 1; i++) {
    const pts = trailBetween(path[i], path[i + 1]);
    if (!pts) continue;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z));
      for (let s = 0; s < L; s += 1.6) {
        const t = s / L;
        const side = (Math.floor(s / 1.6) % 2 ? 1 : -1) * 0.18;
        const x = lerp(a.x, b.x, t) + Math.cos(yaw) * (1.2 + side), z = lerp(a.z, b.z, t) - Math.sin(yaw) * (1.2 + side);
        E.elkTracks.add(x, z, yaw, 1.3);
        elkPts.push(x, z);
      }
    }
  }
  // Day 1 tutorial: the first fresh prints by the spur glow faintly until read
  if (S.day === 1 && !S.flags.signRead && elkPts.length > 20) {
    const sx = elkPts[14], sz = elkPts[15];
    S.flags.signAt = { x: sx, z: sz };
    if (!signRing) {
      signRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false }));
      signRing.rotation.x = -Math.PI / 2;
      E.scene.add(signRing);
    }
    signRing.position.set(sx, heightAt(sx, sz) + 0.12, sz);
    signRing.renderOrder = 5;
    signRing.visible = true;
  } else if (signRing) signRing.visible = false;
}
function updateSignRing(t) {
  if (!signRing || !signRing.visible) return;
  if (S.flags.signRead || S.day > 1) { signRing.visible = false; return; }
  signRing.material.opacity = 0.18 + Math.sin(t * 2.4) * 0.12;
  const s = 1 + Math.sin(t * 2.4) * 0.08;
  signRing.scale.set(s, s, s);
}

/* --------------------------------- overlays --------------------------------- */
const TITLE_BG = "./assets/title.jpg";
function showTitle() {
  mode = "title";
  const has = !!localStorage.getItem(SAVE_KEY);
  const c = hud.overlay(
    `<div class="title-bg" style="background-image:url(${TITLE_BG})"></div>
     <div style="position:relative">
      <h2>A HORROR HUNT · SEVEN DAYS</h2>
      <h1>Old Man<br>on the Mountain</h1>
      <p class="small">After the novel by Jason Collier</p>
      <div style="margin-top:22px">
        ${has ? `<button class="btn hot" id="tContinue">CONTINUE</button>` : ""}
        <button class="btn ${has ? "" : "hot"}" id="tNew">LEAVE THE TRUCK</button>
        <button type="button" class="btn home-big" id="tHome" aria-label="Home"><svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path fill="currentColor" d="M12 3.2 3 11h2v9h5v-6h4v6h5v-9h2L12 3.2z"/></svg></button>
      </div>
      <p class="small" style="margin-top:14px">Headphones. Lights off.</p>
      <div class="tload" id="tLoad"><div class="loadtrack"><i class="loadbar-fill"></i></div><small class="loadbar-msg">Loading the mountain…</small></div>
     </div>`,
  );
  c.querySelector("#tNew").onclick = () => { A.unlockAudio(); freshGame(); intro(); };
  const cont = c.querySelector("#tContinue");
  if (cont) cont.onclick = () => { A.unlockAudio(); if (load()) startPlay(); else { freshGame(); intro(); } };
  c.querySelector("#tHome").addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    location.href = "../index.html";
  });
}
function intro() {
  const lines = [
    "Seven days. One bull.",
    "Something on this mountain has been watching hunters a long time.",
    "Find his tracks. Glass him from high ground. Be back at the fire before dark.",
  ];
  let i = 0;
  const step = () => {
    if (i >= lines.length) { controlsCard(true); return; }
    const c = hud.overlay(`<p style="font-size:26px;font-style:italic">${lines[i]}</p><p class="small">tap to continue</p>`, { clear: false });
    i++;
    const next = () => { clearTimeout(tm); document.getElementById("overlay").onclick = null; step(); };
    const tm = setTimeout(next, 3800);
    document.getElementById("overlay").onclick = next;
  };
  X.truckDoor();
  step();
}
function controlsCard(first) {
  const touch = matchMedia("(pointer: coarse)").matches;
  const c = hud.overlay(
    `<h2>HOW TO HUNT</h2>
     <div class="controls">
      ${touch ? `<b>LEFT THUMB</b><span>Walk where you push. Push lightly to sneak.</span><b>DRAG</b><span>Look around</span>` : `<b>W A S D</b><span>Walk and turn (arrows work too)</span><b>MOUSE DRAG</b><span>Look around</span><b>SHIFT / C</b><span>Run (loud) · Sneak (quiet)</span>`}
      <b>COMPASS</b><span>Orange diamond = what to do next. Fire = camp.</span>
      <b>LOOK</b><span>Glass from high ground. Elsewhere, read sign${touch ? "" : " (F)"}</span>
      <b>RIFLE</b><span>Scope up. Hold breath, then fire${touch ? "" : " (R)"}</span>
      <b>NERVE</b><span>The dark takes it. The fire gives it back.</span>
     </div>
     <button class="btn hot" id="cGo">${first ? "START" : "BACK"}</button>`,
  );
  c.querySelector("#cGo").onclick = () => { hud.closeOverlay(); if (first) startPlay(); else paused = false; };
}
function startPlay() {
  hud.closeOverlay();
  mode = "play";
  paused = false;
  document.getElementById("loading").classList.add("gone");
  A.unlockAudio();
  A.ensureWind();
  A.ensureAmbience();
  X.init();
  preloadThoughts();
  hud.setLine(S.line || "", T.now);
  if (!S.line) G.say(S, "The truck ticks as it cools. The trail starts behind it, up through the spruce.");
}
function pauseMenu() {
  paused = true;
  input.clear();
  const c = hud.overlay(
    `<h2>PAUSED</h2><p>Day ${S.day} · ${fmtClock(S.minutes)}</p>
     <button class="btn hot" id="pRes">RESUME</button><br>
     <button class="btn" id="pHow">HOW TO HUNT</button><br>
     <button class="btn" id="pMute">${X.muted() ? "SOUND ON" : "SOUND OFF"}</button><br>
     <button class="btn ghost" id="pNew">ABANDON HUNT</button><br>
     <button type="button" class="btn home-big" id="pHome" aria-label="Home"><svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path fill="currentColor" d="M12 3.2 3 11h2v9h5v-6h4v6h5v-9h2L12 3.2z"/></svg></button>`,
  );
  c.querySelector("#pRes").onclick = () => { hud.closeOverlay(); paused = false; };
  c.querySelector("#pHow").onclick = () => controlsCard(false);
  c.querySelector("#pMute").onclick = () => { X.toggleMute(); if (X.muted()) stopThought(); hud.closeOverlay(); paused = false; };
  c.querySelector("#pNew").onclick = () => { localStorage.removeItem(SAVE_KEY); hud.closeOverlay(); showTitle(); };
  c.querySelector("#pHome").addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    askLeave();
  });
}
let leaveWasPaused = false;
function askLeave() {
  leaveWasPaused = paused;
  paused = true;
  input.clear();
  document.getElementById("leave").classList.remove("hidden");
}
document.getElementById("home-pin").addEventListener("pointerup", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (mode === "title") {
    location.href = "../index.html";
    return;
  }
  askLeave();
});
document.getElementById("leave-no").addEventListener("pointerup", (e) => {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("leave").classList.add("hidden");
  if (!leaveWasPaused && !hud.overlayOpen) paused = false;
});
document.getElementById("leave-yes").addEventListener("pointerup", (e) => {
  e.preventDefault();
  e.stopPropagation();
  location.href = "../index.html";
});
function notesSheet() {
  paused = true;
  input.clear();
  const notes = [...S.notes].reverse().map((n) => `<div class="note"><small>DAY ${n.day} · ${n.clock}</small>${n.text}</div>`).join("");
  hud.sheet(`<h3>FIELD NOTES</h3>${notes}<button class="btn" id="nClose">CLOSE</button>`);
  document.getElementById("nClose").onclick = () => { hud.closeSheet(); paused = false; };
}
const JOB_POSE = { "LAYING THE FIRE": "Fixing_Kneeling", "THE WALL": "PickUp_Table", "THE DEADFALL": "Interact", "THE WORK": "Fixing_Kneeling" };
function job(title, text, secs, gameMins, done) {
  paused = true;
  harlanPose = JOB_POSE[title] || "Interact";
  input.clear();
  const c = hud.overlay(`<h2>${title}</h2><p>${text}</p><div class="optic-bar" style="position:relative;left:auto;top:auto;margin:16px auto"><i id="jobFill"></i></div>`, { clear: true });
  const t0 = performance.now();
  X.work(secs);
  const iv = setInterval(() => {
    const k = (performance.now() - t0) / (secs * 1000);
    const f = document.getElementById("jobFill");
    if (f) f.style.width = `${Math.min(100, k * 100)}%`;
    if (k >= 1) {
      clearInterval(iv);
      hud.closeOverlay();
      paused = false; harlanPose = null;
      if (gameMins) advance(gameMins);
      done();
    }
  }, 50);
}

/* --------------------------------- actions --------------------------------- */
function near(x, z, r) { return Math.hypot(P.x - x, P.z - z) < r; }
function atCamp() { return near(CAMP_FIRE.x, CAMP_FIRE.z, 11); }
function hereOverlook() { const p = placeAt(P.x, P.z, 6); return OVERLOOKS.includes(p) ? p : null; }
function nearestStick() {
  let best = null, bd = 2.2;
  for (const s of S.sticks) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < bd) { bd = d; best = s; } }
  return best;
}
function ctxActions() {
  const out = [];
  if (!S || S.mode !== "play") return out;
  const st = nearestStick();
  if (st) out.push({ id: "stick", label: "TAKE WOOD", key: "E" });
  if (atCamp()) {
    if (G.canBuildFire(S) && S.minutes < 23 * 60) out.push({ id: "fire", label: "LAY FIRE", key: "E" });
    if (G.canLightFire(S)) out.push({ id: "light", label: "LIGHT FIRE", key: "E" });
    if (S.carried >= 3 && S.wall < 4 && S.day >= 2) out.push({ id: "wall", label: `BUILD WALL ${S.wall}/4`, key: "B" });
    if (S.carried >= 2 && !S.deadfall && S.day >= 4) out.push({ id: "deadfall", label: "RIG DEADFALL", key: "G" });
    if (G.fireLit(S) && !S.watch && S.minutes >= 16 * 60 + 30 && S.minutes < 22 * 60) out.push({ id: "situp", label: "SIT UP", key: "Z" });
    if (G.canSleep(S, true) && W.mode !== "assault") out.push({ id: "sleep", label: "SLEEP", key: "Z" });
  }
  for (const [id, sp] of Object.entries(CAM_SPOTS)) {
    if (!near(sp.x, sp.z, 4.5)) continue;
    const c = S.cams[id];
    if (!c && S.camsLeft > 0) out.push({ id: "hang:" + id, label: "HANG CAMERA", key: "E" });
    if (c && c.day < S.day && c.pulled !== S.day) out.push({ id: "pull:" + id, label: "PULL CARD", key: "E" });
  }
  if (S.elk.down && !S.elk.packed && near(S.elk.x, S.elk.z, 5)) out.push({ id: "pack", label: "PACK MEAT", key: "E" });
  if (!S.rifle && S.rifleAt && near(S.rifleAt.x, S.rifleAt.z, 3.5)) out.push({ id: "rifle", label: "TAKE RIFLE", key: "E" });
  if (near(PLACES.truck.x + 5, PLACES.truck.z + 4, 9)) out.push({ id: "out", label: "WALK OUT", key: "E" });
  return out;
}
function doAction(id) {
  if (paused || mode !== "play" || W.mode === "spot" || W.mode === "scare") return;
  A.unlockAudio();
  if (id === "stick") {
    const st = nearestStick();
    if (st && G.pickStick(S, st.id)) X.stick();
  } else if (id === "fire") {
    job("LAYING THE FIRE", "Birch bark and dry grass for tinder, a fist of kindling, four dry sticks laid by.", 2.2, 15, () => { G.buildFire(S); });
  } else if (id === "light") {
    paused = true;
    harlanPose = "Fixing_Kneeling";
    input.clear();
    const snowNow = snowAt(S.day, S.minutes);
    const L0 = lightAt(S.minutes);
    fireGame(hud, {
      wind: clamp(snowNow * 0.8 + (S.day >= 5 ? 0.15 : 0), 0, 1), wet: clamp(snowNow, 0, 1), dark: L0.dark,
      fear: clamp(1 - S.heart / 100, 0, 1), learned: !!S.flags.fireLearned, auto: !!window.__autoFire,
    }, (ok) => {
      paused = false; harlanPose = null;
      if (ok) { G.lightFire(S); X.lighter(); think("fire"); advance(10); save(); }
      else G.say(S, "You set the flint and steel down. The fire is laid, waiting.");
    }, { strike: () => X.lighter?.(), crackle: () => {} });
  } else if (id === "wall") {
    job("THE WALL", "Drag deadfall into the line. Pack snow on it.", 2.6, 35, () => G.addWall(S));
  } else if (id === "deadfall") {
    job("THE DEADFALL", "Half-cut the dead spruce, wedge it, run the cord back to your seat.", 3, 45, () => G.rigDeadfall(S));
  } else if (id === "situp") {
    G.sitUp(S);
  } else if (id === "sleep") {
    doSleep(true);
  } else if (id.startsWith("hang:")) {
    const spot = id.slice(5);
    paused = true;
    input.clear();
    harlanPose = "Interact";
    cinchGame(hud, { learned: !!S.flags.camLearned, auto: !!(window.__autoFire || window.__autoTactile), cold: S.minutes < 9 * 60 ? 1 : 0 }, (ok) => {
      paused = false; harlanPose = null;
      if (ok) { S.flags.camLearned = 1; advance(12); G.hangCam(S, spot); X.beep(); think("cam"); }
    });
  } else if (id.startsWith("pull:")) {
    showCard(id.slice(5));
  } else if (id === "pack") {
    job("THE WORK", "Quarters, backstraps, the heart. Your knife, your breath, the cold.", 4, 0, () => { G.packMeat(S); E.harlan.setMeat(true); });
  } else if (id === "rifle") {
    S.rifle = true; S.rifleAt = null;
    G.say(S, "The Winchester lies across its tracks, stock gouged by something like teeth. It left it for you to find. That is worse.", true);
    X.stick();
  } else if (id === "out") {
    if (!S.elk.packed && S.day < 7) {
      paused = true;
      input.clear();
      const c = hud.overlay(`<h2>THE TRUCK</h2><p>Walk out now, ${S.elk.packed ? "with the meat" : "with nothing"}? The hunt ends.</p><button class="btn hot" id="oYes">DRIVE DOWN</button><button class="btn" id="oNo">STAY</button>`);
      c.querySelector("#oYes").onclick = () => { hud.closeOverlay(); paused = false; G.walkOut(S); finish(); };
      c.querySelector("#oNo").onclick = () => { hud.closeOverlay(); paused = false; };
    } else { G.walkOut(S); finish(); }
  }
}
function doSleep(atCampNow) {
  paused = true;
  input.clear();
  hud.el.flash.style.background = "#000";
  hud.flash(1, 2600);
  setTimeout(() => { hud.el.flash.style.background = "#fff"; }, 2700);
  const lit = S.fireDay === S.day;
  G.sleep(S, atCampNow);
  E.prints.clear();
  E.walkerTracks.clear();
  if (atCampNow) { for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; const r = lit ? 17 : 6; E.walkerTracks.add(CAMP_FIRE.x + Math.cos(a) * r, CAMP_FIRE.z + Math.sin(a) * r, -a, 1); } }
  W.mode = "away";
  layElkTracks();
  save();
  hud.toast(`DAY ${S.day}`, S.day >= 7 ? "The last day." : ["", "", "He moves at last light.", "Something walked the stones.", "It is learning you.", "The wall. The fire. The Colt.", "It wants you to run."][S.day - 1] || "");
  paused = false;
  if (S.mode === "ending") finish();
}
function advance(mins) {
  // fast time passing (jobs, packing): run the clock in chunks so beats still fire
  let left = mins;
  while (left > 0 && S.mode === "play") {
    const k = Math.min(5, left);
    stepClock(k);
    left -= k;
  }
}

/* LOOK: glass from an overlook, else read sign / listen */
function doLook() {
  if (paused || mode !== "play" || W.mode === "spot" || W.mode === "scare") return;
  A.unlockAudio();
  if (W.mode === "still") return;
  const ov = hereOverlook();
  if (ov || W.ridge) { enterOptic("binos"); return; }
  // sign underfoot?
  const place = placeAt(P.x, P.z, 10);
  let nearKind = null;
  if (W.trackNear) nearKind = "walker";
  else if (S.elk.wounded && bloodNear()) nearKind = "blood";
  else if (elkTrackNear()) nearKind = "elk";
  let text = G.readSign(S, place, nearKind);
  if (nearKind === "elk" && S.day === 1 && !S.flags.signRead) {
    S.flags.signRead = 1;
    text = "Elk. Prints wide as your palm, walking, not hurried. Cows, and one set bigger than the rest, sunk deep. They go down toward the park. You won't catch them on their tracks. Get high and let your eyes do the walking.";
    if (signRing) signRing.visible = false;
  }
  G.say(S, text, nearKind === "walker");
  if (nearKind === "walker") think(S.flags.signPick || "tracks");
  else if (nearKind === "elk") think("elk");
  else if (nearKind === "blood") think("blood");
  else if (place === "timber") think("timber");
  else think("sign");
  advance(nearKind ? 4 : 10);
  if (S.tut === 0 && place === "spur") S.tut = 1;
}
function elkTrackNear() {
  for (let i = 0; i < elkPts.length; i += 2) if (Math.abs(elkPts[i] - P.x) < 3.5 && Math.hypot(elkPts[i] - P.x, elkPts[i + 1] - P.z) < 3.5) return true;
  return false;
}
function bloodNear() { return true; }
function doRifle() {
  if (paused || mode !== "play" || W.mode === "spot" || W.mode === "scare") return;
  if (!S.rifle) { G.say(S, "Your hands go for the Winchester and find nothing. The Colt, then. Seven rounds and a short reach."); enterOptic("scope", true); return; }
  if (S.rounds <= 0) { G.say(S, "The magazine is empty. It is a heavy stick."); return; }
  enterOptic("scope");
}

/* trail-camera card viewer: three real frames rendered from the camera's spot */
function showCard(spot) {
  paused = true;
  input.clear();
  const frames = G.pullCard(S, spot);
  X.beep();
  const imgs = frames.map((f, i) =>
    E.renderCard(spot, (cc, sp) => {
      // stage the frame
      const placeAhead = (dist, lateral) => {
        const dir = new THREE.Vector3();
        cc.getWorldDirection(dir);
        const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        const x = cc.position.x + dir.x * dist + right.x * lateral, z = cc.position.z + dir.z * dist + right.z * lateral;
        return { x, z, yaw: Math.atan2(dir.x, dir.z) };
      };
      const vis = [];
      if (f.kind === "cows") {
        E.cows.forEach((c, k) => { const p = placeAhead(8 + k * 3, -2.5 + k * 2.6); c.root.position.set(p.x, heightAt(p.x, p.z), p.z); c.root.rotation.y = p.yaw + 1.2; c.root.visible = true; c.animate("alert", 0, 1); vis.push(c.root); });
      } else if (f.kind !== "empty") {
        const spec = f.kind === "edge" ? [9, -4.3, 0.6] : f.kind === "mid" ? [7, -0.8, 0.3] : [4.6, 0, 0];
        const p = placeAhead(spec[0], spec[1]);
        E.walker.root.position.set(p.x, heightAt(p.x, p.z), p.z);
        E.walker.root.rotation.y = p.yaw;
        E.walker.root.visible = true;
        E.walker.setLod?.(spec[0]);
        E.walker.animate("stand", 0, 3.3, f.kind === "face" ? 1 : 0.2);
        vis.push(E.walker.root);
      }
      return () => { vis.forEach((v) => (v.visible = false)); };
    }),
  );
  let i = 0;
  const show = () => {
    const f = frames[i];
    const cv = imgs[i];
    const g = cv.getContext("2d");
    g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, 296, 480, 24);
    g.fillStyle = "#ddd"; g.font = "14px monospace";
    g.fillText(`CAM ${Object.keys(CAM_SPOTS).indexOf(spot) + 1}  D${S.day - 1}  0${1 + i}:${String(14 + i * 7).padStart(2, "0")}:0${i}  -9°C  IR`, 8, 313);
    const c = hud.overlay(`<h2>TRAIL CAMERA · FRAME ${i + 1}/3</h2><div id="cardHost"></div><p>${f.text}</p><button class="btn hot" id="cNext">${i < 2 ? "NEXT FRAME" : "POCKET THE CARD"}</button>`);
    cv.className = "card";
    c.querySelector("#cardHost").appendChild(cv);
    if (f.kind === "face") { X.sting(); hud.flash(0.25, 300); think("card"); }
    else if (f.kind === "edge" || f.kind === "mid") think("eyes");
    else if (f.kind === "cows") think("deer");
    speakCaption(f.text, true);
    c.querySelector("#cNext").onclick = () => {
      i++;
      if (i < 3) show();
      else { hud.closeOverlay(); paused = false; const w = S.cards[S.cards.length - 1].worst; G.say(S, w === "face" ? "You power the camera down and sit a minute longer, scanning the park. Nothing moves. Old men see things, you think." : w === "edge" ? "Glitch, you tell yourself. Cheap cameras do strange things in the cold." : "Cows, coyotes, branches. Ordinary answers.", w !== "none"); }
    };
  };
  show();
}

/* --------------------------------- optics (glass + scope) --------------------------------- */
const opticEl = document.getElementById("optic");
function enterOptic(kind, colt = false) {
  mode = "optic";
  input.clear();
  optic = { kind, colt, yaw: cam.yaw, pitch: kind === "binos" ? -0.06 : -0.02, hold: 0, holdLeft: 3.5, progress: 0, sway: 0, t: 0, marked: false };
  // raise the glass to whatever living thing is nearest your line of sight
  const eyeY = heightAt(P.x, P.z) + 1.65;
  const cands = [];
  if (bull.vis) cands.push([bull.x, bull.z, 1.3]);
  for (const c of E.cows) if (c.root.visible) cands.push([c.root.position.x, c.root.position.z, 1.1]);
  let best = null, bd = 0.55;
  for (const [x, z, hgt] of cands) {
    const dy = Math.abs(wrapPi(Math.atan2(-(x - P.x), -(z - P.z)) - cam.yaw));
    if (dy < bd) { bd = dy; best = [x, z, hgt]; }
  }
  if (best) optic.pitch = Math.atan2(heightAt(best[0], best[1]) + best[2] - eyeY, Math.hypot(best[0] - P.x, best[1] - P.z));
  opticEl.classList.remove("hidden", "binos", "scope");
  opticEl.classList.add(kind);
  document.body.classList.add("in-optic");
  document.getElementById("btnHold").style.display = kind === "scope" ? "" : "none";
  document.getElementById("btnFire").style.display = kind === "scope" ? "" : "none";
  document.getElementById("opticFill").style.width = "0%";
  X.glass();
}
function baseFov() {
  const a = innerWidth / innerHeight;
  return a < 0.75 ? 72 : a < 1.2 ? 64 : 56;
}
function exitOptic() {
  mode = "play";
  opticEl.classList.add("hidden");
  document.body.classList.remove("in-optic");
  cam.yaw = optic ? optic.yaw : cam.yaw;
  optic = null;
  E.camera.fov = baseFov();
  E.camera.updateProjectionMatrix();
}
const ray = new THREE.Raycaster();
function fireShot() {
  if (!optic || optic.kind !== "scope") return;
  const colt = optic.colt;
  if (!colt && S.rounds <= 0) return;
  if (colt && S.colt <= 0) return;
  X.shot(colt);
  hud.flash(0.35, 160);
  cam.shake = 0.6;
  ray.setFromCamera(new THREE.Vector2(0, 0), E.camera);
  ray.far = colt ? 45 : 400;
  // walker first (defend)
  if (E.walker.root.visible && W.mode !== "away") {
    const hit = ray.intersectObject(E.walker.root, true);
    if (hit.length) { if (colt) S.colt--; else S.rounds--; walkerShot(colt); return; }
  }
  const legal = S.minutes >= G.DAWN - 10 && S.minutes <= G.LEGAL_END;
  if (bull.vis && !colt) {
    const hits = ray.intersectObjects(E.bull.hitMeshes, false);
    if (hits.length) {
      if (!legal) { /* shooting at a shape in the dark */ }
      const part = hits.find((h) => h.object.userData.part === "vitals") ? "vitals" : "body";
      const res = G.shotResult(S, part, bull.x, bull.z);
      if (res === "down") { bull.mode = "down"; bull.deathRun = { t: 0, fromX: bull.x, fromZ: bull.z }; }
      else { startBullRun(); if (res === "wounded") layBlood(); }
      setTimeout(() => exitOptic(), 900);
      return;
    }
  }
  if (colt) S.colt--; else S.rounds--;
  if (bull.vis) { G.spookBull(S, "shot"); startBullRun(); }
  else G.say(S, "The crack rolls off three ridges and comes back to you smaller each time.");
  S.pressure = clamp(S.pressure + 2, 0, 100);
}
function walkerShot(colt) {
  X.roar();
  S.flags.shotWalker = (S.flags.shotWalker || 0) + 1;
  S.pressure = clamp(S.pressure - 10, 0, 100);
  S.heart = clamp(S.heart + 6, 0, 100);
  G.say(S, W.mode === "assault" ? (colt ? "The .45 booms in the knoll." : "The Winchester slams in the knoll.") + " Muzzle flash in white strobes: bark-skin splintering, dark sap-like blood. It wrenches away downslope, breaking spruce like twigs." : "You fire at the shape. It is not there when the flash clears. Something heavy goes away through the timber, not hurrying.", true);
  if (W.mode === "assault") { S.flags.repelled = S.day; }
  W.mode = "flee"; W.t = 0;
  setTimeout(() => exitOptic(), 700);
}

/* --------------------------------- bull + cows --------------------------------- */
function placeSpot(place, salt) {
  const Pp = PLACES[place];
  const a = hash2(S.day * 7 + salt, place.length * 13) * Math.PI * 2;
  const r = place === "meadow" ? 18 : 9;
  let x = Pp.x + Math.cos(a) * r, z = Pp.z + Math.sin(a) * r;
  if (trailDist(x, z) < 4) { x += 6; z -= 4; }
  return { x, z };
}
function startBullRun() {
  const to = G.bullPlace(S) || "timber";
  const dest = placeSpot(to, 3);
  bull.run = { t: 0, fx: bull.x, fz: bull.z, tx: dest.x, tz: dest.z, dur: 4.5 };
  X.crash(panOf(bull.x, bull.z));
}
function layBlood() {
  const to = PLACES[S.elk.bloodTo] || PLACES.timber;
  const dx = to.x - bull.x, dz = to.z - bull.z, L = Math.hypot(dx, dz);
  for (let s = 2; s < L; s += 3.5) E.blood.add(bull.x + (dx / L) * s + Math.sin(s) * 0.8, bull.z + (dz / L) * s, 0, 0.6 + (s % 2) * 0.4);
}
function updateBull(dt) {
  const showing = G.bullShowing(S);
  const place = G.bullPlace(S);
  const t = T.now / 1000;
  if (S.elk.down && !S.elk.packed && !S.elk.spoiled) {
    if (bull.deathRun && bull.deathRun.t < 2.2) {
      bull.deathRun.t += dt;
      bull.x += Math.sin(bull.yaw) * dt * 4 * (1 - bull.deathRun.t / 2.2);
      bull.z += Math.cos(bull.yaw) * dt * 4 * (1 - bull.deathRun.t / 2.2);
      S.elk.x = bull.x; S.elk.z = bull.z;
      E.bull.animate(bull.deathRun.t < 1.6 ? "run" : "down", dt, t);
    } else { bull.x = S.elk.x; bull.z = S.elk.z; E.bull.animate("down", dt, t); }
    bull.vis = true;
  } else if (bull.run) {
    bull.run.t += dt;
    const k = Math.min(1, bull.run.t / bull.run.dur);
    bull.x = lerp(bull.run.fx, bull.run.tx, k);
    bull.z = lerp(bull.run.fz, bull.run.tz, k);
    bull.yaw = Math.atan2(bull.run.tx - bull.run.fx, bull.run.tz - bull.run.fz);
    E.bull.animate("run", dt, t);
    bull.vis = Math.hypot(bull.x - P.x, bull.z - P.z) < 80 && k < 0.7;
    if (k >= 1) bull.run = null;
  } else if (showing && place && !S.elk.packed && !S.elk.spoiled) {
    if (bull.place !== place) {
      const sp = placeSpot(place, 1);
      bull.x = sp.x; bull.z = sp.z; bull.place = place; bull.yaw = hash2(S.day, 5) * 6.28;
    }
    const st = G.bullState(S);
    bull.wander += dt;
    if (st === "graze" && bull.alertT <= 0) {
      bull.x += Math.sin(bull.yaw) * dt * 0.25;
      bull.z += Math.cos(bull.yaw) * dt * 0.25;
      if (Math.sin(bull.wander * 0.13) > 0.97) bull.yaw += dt * 0.6;
    }
    bull.alertT -= dt;
    if (bull.spookArm && bull.alertT <= 0 && !bull.run) {
      const why = bull.spookArm;
      bull.spookArm = null;
      G.spookBull(S, why);
      startBullRun();
    }
    E.bull.look?.(P.x, P.z);
    E.bull.animate(bull.alertT > 0 || bull.spookArm ? "alert" : st === "bed" ? "bed" : Math.sin(bull.wander * 0.3) > -0.2 ? "graze" : "stand", dt, t);
    bull.vis = Math.hypot(bull.x - P.x, bull.z - P.z) < 320;
    // detection: wind, noise, sight
    if (mode === "play" || mode === "optic") detectBull();
  } else bull.vis = false;
  E.bull.root.visible = bull.vis;
  if (bull.vis) {
    E.bull.root.position.set(bull.x, heightAt(bull.x, bull.z), bull.z);
    E.bull.root.rotation.y = bull.yaw + Math.PI; // model faces -z
  }
  // cows
  const cp = G.cowsPlace(S);
  cows.forEach((c, i) => {
    const m = E.cows[i];
    m.look?.(P.x, P.z);
    const hold = window.__oldman?.herdHold;
    if (hold && hold[i]) {
      const h = hold[i];
      const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
      const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
      c.x = P.x + fx * h.ahead + rx * h.side;
      c.z = P.z + fz * h.ahead + rz * h.side;
      c.yaw = Math.atan2(P.x - c.x, P.z - c.z);
      c.bolt = null; c.run = null;
      m.animate("alert", dt, t + i);
      m.root.visible = true;
      m.root.position.set(c.x, heightAt(c.x, c.z), c.z);
      m.root.rotation.y = c.yaw + Math.PI;
      return;
    }
    if (!cp || S.day > 6) { m.root.visible = false; c.place = null; return; }
    if (c.place !== cp) { const sp = placeSpot(cp, 9 + i); c.x = sp.x + c.off[0]; c.z = sp.z + c.off[1]; c.place = cp; c.yaw = i * 2; }
    if (c.run) {
      c.run.t += dt;
      const k = Math.min(1, c.run.t / 5);
      c.x = lerp(c.run.fx, c.run.tx, k); c.z = lerp(c.run.fz, c.run.tz, k);
      m.animate("run", dt, t);
      if (k >= 1) c.run = null;
    } else {
      c.x += Math.sin(c.yaw) * dt * 0.18; c.z += Math.cos(c.yaw) * dt * 0.18;
      c.yaw += Math.sin(t * 0.1 + i) * dt * 0.1;
      const d = Math.hypot(c.x - P.x, c.z - P.z);
      if (c.bolt) {
        c.bolt.t += dt;
        c.yaw = dampAngle(c.yaw, c.bolt.t < 0.45 ? c.bolt.face : c.bolt.away, 3.2, dt);
        m.animate(c.bolt.t < 0.7 ? "alert" : "run", dt, t + i);
        if (c.bolt.t >= 0.7 && !c.run) {
          const a = c.bolt.away;
          c.run = { t: 0, fx: c.x, fz: c.z, tx: c.x + Math.sin(a) * 70, tz: c.z + Math.cos(a) * 70 };
          c.yaw = a;
          c.bolt = null;
        }
      } else {
        m.animate(Math.sin(t * 0.2 + i * 2) > -0.25 ? "graze" : "stand", dt, t + i);
        if (d < (P.running ? 70 : P.sneaking ? 16 : 32) && mode === "play") {
          const away = Math.atan2(c.x - P.x, c.z - P.z);
          c.bolt = { t: 0, face: Math.atan2(P.x - c.x, P.z - c.z), away };
        }
      }
    }
    m.root.visible = Math.hypot(c.x - P.x, c.z - P.z) < 320;
    m.root.position.set(c.x, heightAt(c.x, c.z), c.z);
    m.root.rotation.y = c.yaw + Math.PI;
  });
}
function detectBull() {
  const d = Math.hypot(bull.x - P.x, bull.z - P.z);
  const bedded = G.bullState(S) === "bed";
  // Day 2 at last light: he looks past you at the timber and bolts (scripted, once)
  if (S.day === 2 && d < 75 && !S.beats.includes("d2-spook")) {
    S.beats.push("d2-spook");
    bull.alertT = 1.6;
    bull.yaw = Math.atan2(PLACES.timber.x - bull.x, PLACES.timber.z - bull.z);
    setTimeout(() => {
      G.spookBull(S, "script");
      S.heart = clamp(S.heart - 6, 0, 100);
      S.pressure = clamp(S.pressure + 8, 0, 100);
      startBullRun();
      setTimeout(() => A.playFx("scream", { pan: panOf(PLACES.timber.x, PLACES.timber.z), near: true }), 1200);
    }, 1600);
    return;
  }
  if (S.day < 3 || window.__oldman.noSpook) return;
  const loud = !P.moving ? 0 : P.running ? 95 : P.sneaking ? 12 : 36;
  const k = bedded ? 0.6 : 1;
  let why = null;
  if (d < loud * k) why = "noise";
  else if (d < 75 && !hereOverlook() && G.upwind(S, P.x, P.z, bull.x, bull.z)) why = "wind";
  else if (d < 8) why = "sight";
  else if (d < 30 && S.elk.marked !== S.day && P.moving && !P.sneaking) why = "sight";
  if (why && !bull.spookArm && !bull.run) {
    bull.spookArm = why;
    bull.alertT = 0.95;
    bull.yaw = Math.atan2(P.x - bull.x, P.z - bull.z);
  }
}

/* --------------------------------- the walker --------------------------------- */
function panOf(x, z) {
  const dx = x - P.x, dz = z - P.z;
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const d = Math.hypot(dx, dz) || 1;
  return clamp((dx * rx + dz * rz) / d, -1, 1);
}
function walkerAbroad() {
  const m = S.minutes;
  return G.isDark(m) || (S.day >= 2 && m >= 17 * 60 + 15);
}
function placeWalker(dist, ahead, side) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  let x = P.x + fx * dist * ahead + rx * dist * side, z = P.z + fz * dist * ahead + rz * dist * side;
  x = clamp(x, BOUNDS.x0 + 10, BOUNDS.x1 - 10); z = clamp(z, BOUNDS.z0 + 10, BOUNDS.z1 - 10);
  return { x, z };
}
function placeSpotHide(initial) {
  const yaw = fp.yaw || cam.yaw;
  const trunks = trunksNear(P.x, P.z, 22).filter((tr) => {
    const d = Math.hypot(tr.x - P.x, tr.z - P.z);
    return d > 7 && d < 18 && tr.r > 0.18;
  });
  let pick = null, best = -1;
  for (const tr of trunks) {
    const ang = Math.atan2(-(tr.x - P.x), -(tr.z - P.z));
    const off = Math.abs(wrapPi(ang - yaw));
    const score = off > 0.4 && off < 1.9 ? off : -1;
    if (score > best) { best = score; pick = tr; }
  }
  if (!pick && trunks.length) pick = trunks[(Math.random() * trunks.length) | 0];
  if (!W.spot) W.spot = { t: 0, window: 9.5, held: 0, cool: 1.6, tx: P.x, tz: P.z };
  if (pick) {
    const dx = pick.x - P.x, dz = pick.z - P.z, d = Math.hypot(dx, dz) || 1;
    const px = -dz / d, pz = dx / d;
    W.spot.tx = pick.x + px * 0.42 + (dx / d) * 0.2;
    W.spot.tz = pick.z + pz * 0.42 + (dz / d) * 0.2;
  } else {
    const side = Math.random() < 0.5 ? 1 : -1;
    const p = placeWalker(12, 0.4, side * 0.7);
    W.spot.tx = p.x; W.spot.tz = p.z;
  }
  if (initial) { W.x = W.spot.tx; W.z = W.spot.tz; }
}
function startSpot(force = false) {
  if (!force && W.mode !== "pace" && W.mode !== "away") return false;
  if (!force && W.mode === "away" && W.hideT > 0) return false;
  W.mode = "spot";
  W.t = 0;
  W.spot = { t: 0, window: 9.5, held: 0, cool: 1.7, tx: P.x, tz: P.z };
  fp.sync = true;
  fp.target = 1;
  fp.latched = true;
  fp.hold = 0;
  input.lookOnly = true;
  input.clear();
  placeSpotHide(true);
  X.breathing(false);
  X.breathing(true, 0, true);
  breathHeld = true;
  A.duck(0.62, 0.8);
  A.setHeartbeat(Math.min(S.heart, 36), true, true);
  think("close");
  hud.setWarn("FIND IT", true);
  document.body.classList.add("spotting");
  return true;
}
function spotSuccess() {
  X.breathing(false);
  breathHeld = false;
  think("retreat");
  S.heart = clamp(S.heart - 4, 0, 100);
  S.stats.seen = (S.stats.seen || 0) + 1;
  G.say(S, "You hold it in the middle of what you can see. It steps behind a trunk. The trunk is empty.", true);
  X.snapAt(panOf(W.x, W.z));
  W.mode = "flee";
  W.t = 0;
  W.nextSpotAbs = G.absMin(S) + 80;
  hud.setWarn("");
  input.lookOnly = false;
}
function startScare() {
  W.mode = "scare";
  W.scare = { t: 0, fx: W.x, fz: W.z, stung: false };
  A.duck(0.8, 0.45);
  hud.setWarn("");
}
function endScare() {
  X.breathing(false);
  breathHeld = false;
  hud.flash(0.15, 700);
  S.heart = clamp(S.heart - 18, 6, 100);
  think("missed");
  G.say(S, "You come to on your knees. The timber is empty. Your nerve is not.", true);
  W.mode = "away";
  W.hideT = 30;
  W.nextSpotAbs = G.absMin(S) + 55;
  E.walker.root.visible = false;
  input.lookOnly = false;
  hud.setWarn("");
}
function updateSpot(dt) {
  const t = T.now / 1000;
  const sp = W.spot;
  if (!paused) sp.t += dt;
  sp.cool -= dt;
  const d = Math.hypot(W.x - P.x, W.z - P.z);
  const wantYaw = Math.atan2(-(W.x - P.x), -(W.z - P.z));
  const yawErr = Math.abs(wrapPi(wantYaw - fp.yaw));
  const eye = heightAt(P.x, P.z) + 1.62;
  const wantPitch = Math.atan2(heightAt(W.x, W.z) + 2.2 - eye, Math.max(1.5, d));
  const pitchErr = Math.abs(wantPitch - fp.pitch);
  const looking = yawErr < 0.48;
  const centered = yawErr < 0.13 && pitchErr < 0.2 && d < 24 && d > 1.5;
  if (!paused && centered) sp.held += dt;
  else sp.held = Math.max(0, sp.held - dt * 0.4);
  if (!window.__oldman.holdSpot && !looking && sp.cool <= 0 && !paused) {
    placeSpotHide(false);
    sp.cool = 1.45;
    if (Math.random() < 0.55) X.snapAt(panOf(sp.tx, sp.tz) * 0.5);
  }
  if (!window.__oldman.holdSpot) {
    W.x = damp(W.x, sp.tx, looking ? 0.2 : 2.6, dt);
    W.z = damp(W.z, sp.tz, looking ? 0.2 : 2.6, dt);
  }
  const c = collide(W.x, W.z, 0.45);
  W.x = c.x; W.z = c.z;
  W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
  E.walker.root.visible = true;
  E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
  E.walker.root.rotation.y = W.yaw + Math.PI;
  E.walker.setLod?.(Math.hypot(W.x - P.x, W.z - P.z));
  E.walker.animate(looking ? "sniff" : "crouch", dt, t, G.isDark(S.minutes) || S.minutes > 17 * 60 ? 1 : 0.35);
  W.walkerNear = true;
  hud.fear(0.48 + Math.sin(t * 6.5) * 0.08);
  const fill = document.getElementById("spotfill");
  if (fill) fill.style.width = `${Math.max(0, (1 - sp.t / sp.window) * 100)}%`;
  if (sp.held > 0.7) { spotSuccess(); return; }
  if (!paused && sp.t > sp.window) startScare();
}
function updateScare(dt) {
  const sc = W.scare;
  sc.t += dt;
  const k = clamp(sc.t / 0.5, 0, 1);
  const tx = P.x - Math.sin(fp.yaw) * 2.15;
  const tz = P.z - Math.cos(fp.yaw) * 2.15;
  W.x = lerp(sc.fx, tx, k * k);
  W.z = lerp(sc.fz, tz, k * k);
  W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
  E.walker.root.visible = true;
  E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
  E.walker.root.rotation.y = W.yaw + Math.PI;
  E.walker.setLod?.(Math.hypot(W.x - P.x, W.z - P.z));
  E.walker.animate(k < 1 ? "run" : "reach", dt, T.now / 1000, 1);
  if (sc.t > 0.42 && !sc.stung) {
    sc.stung = true;
    X.sting();
    hud.flash(0.72, 420);
    cam.shake = 1.15;
  }
  if (sc.t > 1.15) endScare();
}
function updateWalker(dt) {
  const t = T.now / 1000;
  const m = S.minutes;
  const dark = G.isDark(m);
  const fireOn = G.fireLit(S);
  const atFire = G.atFireNow(S, P.x, P.z);
  W.t += dt;
  // the finale: walking out with the meat (or on the last day), it follows you down
  if (!S.flags.finale && S.mode === "play" && W.mode !== "assault" && (S.elk.packed || (S.day >= 7 && !S.flags.stayFinale)) && Math.hypot(P.x - PLACES.truck.x, P.z - PLACES.truck.z) < 120) startChase();
  if (W.mode === "chase") { updateChase(dt); return; }
  if (W.mode === "spot") { updateSpot(dt); return; }
  if (W.mode === "scare") { updateScare(dt); return; }
  const pressureK = clamp((S.pressure + S.day * 8) / 100, 0, 1);
  const pace = lerp(46, 17, pressureK);
  let visible = false, eyes = 0, anim = "stand";
  // day 3 ridge silhouette beat: it stands on the skyline in front of you
  if (S.beats.includes("d3-ridge") && !S.flags.ridgeDone && m < 18 * 60 + 30) {
    if (!W.ridge) {
      const p = placeWalker(150, 0.95, 0.25);
      W.ridge = { x: p.x, z: p.z, t: 0 };
    }
    W.ridge.t += dt;
    W.x = W.ridge.x; W.z = W.ridge.z;
    visible = true; anim = "stand";
    const lookAt = Math.abs(wrapPi(Math.atan2(-(W.x - P.x), -(W.z - P.z)) - (optic ? optic.yaw : cam.yaw)));
    if (W.ridge.t > 25 || (optic && optic.kind === "binos" && lookAt < 0.06 && W.ridge.t > 3)) {
      S.flags.ridgeDone = 1;
      if (optic) { G.say(S, "You put the glass on it and wish the glass were empty. It is the height of a man stood on a man's shoulders. The arms hang wrong. It looks into the lens until you take it down.", true); think("glimpse"); S.heart = clamp(S.heart - 8, 0, 100); X.sting(); S.stats.seen++; }
      W.ridge = null;
    }
  } else if (W.mode === "chase") {
    updateChase(dt);
    return;
  } else if (W.mode === "assault") {
    updateAssault(dt);
    return;
  } else if (W.mode === "still") {
    updateHoldStill(dt);
    return;
  } else if (W.mode === "charge") {
    W.charge.t += dt;
    const k = Math.min(1, W.charge.t / 0.9);
    W.x = lerp(W.charge.fx, P.x + Math.sin(P.yaw) * 1.2, k);
    W.z = lerp(W.charge.fz, P.z + Math.cos(P.yaw) * 1.2, k);
    W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
    visible = true; eyes = 1; anim = k < 1 ? "run" : "reach";
    if (W.charge.t > 1.0 && !W.charge.hit) {
      W.charge.hit = true;
      hud.flash(0.9, 900);
      cam.shake = 1.4;
      X.roar();
      S.heart = clamp(S.heart - 22, 0, 100);
      S.pressure = clamp(S.pressure + 8, 0, 100);
      if (S.day >= 3 && S.rifle && !S.walker.took) {
        S.rifle = false;
        S.walker.took = true;
        const rp = PLACES[["burn", "timber", "creek"][S.day % 3]];
        S.rifleAt = { x: rp.x + 6, z: rp.z + 4 };
        E.harlan.setRifle(false);
        G.say(S, "It slams into you chest-high. One massive arm sweeps the rifle from your hands like a toy. Then it is gone into the spruce, the Winchester in one impossible hand. You have the Colt.", true);
        hud.toast("IT TOOK YOUR RIFLE", "You have the Colt. Seven rounds.");
      } else {
        G.say(S, "You moved. It is on you before you can turn: a smell of damp earth and rot, a weight like a falling tree. Then the timber is silent again.", true);
      }
    }
    if (W.charge.t > 2.2) { W.mode = "flee"; W.t = 0; }
  } else if (W.mode === "flee") {
    const a = Math.atan2(W.x - P.x, W.z - P.z);
    W.x += Math.sin(a) * dt * 9; W.z += Math.cos(a) * dt * 9;
    W.yaw = a;
    visible = W.t < 2.5; anim = "run"; eyes = 0;
    if (W.t > 3) { W.mode = "away"; W.hideT = 60; }
  } else if (walkerAbroad() && S.mode === "play") {
    if (W.mode === "away" && W.hideT <= 0) {
      W.mode = "pace";
      W.side = hash2(S.day, Math.floor(m)) > 0.5 ? 1 : -1;
      const p = placeWalker(pace, 0.2, W.side);
      W.x = p.x; W.z = p.z;
    }
    W.hideT -= dt;
    if (W.mode === "pace") {
      if (fireOn && atFire) {
        // circle the camp beyond the firelight
        const r = lerp(30, 19, pressureK) - S.wall * 0.8;
        const a = t * 0.05 * (W.side) + S.day;
        const tx = CAMP_FIRE.x + Math.cos(a) * r, tz = CAMP_FIRE.z + Math.sin(a) * r;
        W.x = damp(W.x, tx, 0.6, dt); W.z = damp(W.z, tz, 0.6, dt);
      } else {
        // parallel: keep station ahead and off to one side, drifting in and out of the
        // edge of sight, so you catch it at the corner of your eye and never dead ahead
        const sweep = 0.5 + 0.5 * Math.sin(t * 0.09 + W.side * 2);
        const ang = W.side * (0.3 + 0.6 * sweep);
        const p = placeWalker(pace, Math.cos(ang), Math.sin(ang));
        const k = P.moving ? 1.6 : 0.4;
        W.x = damp(W.x, p.x, k, dt); W.z = damp(W.z, p.z, k, dt);
      }
      const c = collide(W.x, W.z, 0.6);
      W.x = c.x; W.z = c.z;
      // a frozen walker (tests, and a held position) stays put instead of being shoved by a trunk
      if (window.__oldman.freezeW) { W.x = window.__oldman.freezeW[0]; W.z = window.__oldman.freezeW[1]; }
      W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
      // tracks: parallel to yours, thirty yards off. Not crossing. Following.
      if (Math.hypot(W.x - W.lastTrack.x, W.z - W.lastTrack.z) > 1.7) {
        const yaw = Math.atan2(-(W.x - W.lastTrack.x), -(W.z - W.lastTrack.z));
        W.lastTrack = { x: W.x, z: W.z };
        E.walkerTracks.add(W.x, W.z, yaw, 1.15);
      }
      const d = Math.hypot(W.x - P.x, W.z - P.z);
      const lookA = Math.abs(wrapPi(Math.atan2(-(W.x - P.x), -(W.z - P.z)) - cam.yaw));
      visible = d < 60;
      {
        const stalk = d < 30 && !P.moving && dark;
        const pause = Math.sin(t * 0.23 + S.day) > 0.62;
        anim = stalk ? "crouch" : pause ? "sniff" : P.moving ? "walk" : "stand";
      }
      eyes = dark ? (Math.sin(t * 0.7 + W.side) > -0.25 ? 1 : 0.1) : 0;
      // looking straight at it in the light: it steps behind a trunk
      const lit = (dark && d < 34) || (!dark && d < 50);
      if (lookA < 0.12 && lit && d < 48) W.lookT = (W.lookT || 0) + dt;
      else W.lookT = Math.max(0, (W.lookT || 0) - dt * 0.5);
      if (W.lookT > 0.45) {
        W.lookT = 0;
        if (W.seenNight !== S.day) { W.seenNight = S.day; S.stats.seen++; X.sting(); S.heart = clamp(S.heart - 4, 0, 100); }
        const tr = trunksNear(W.x, W.z, 10).sort((a, b) => Math.hypot(b.x - P.x, b.z - P.z) - Math.hypot(a.x - P.x, a.z - P.z))[0];
        W.mode = "away";
        W.hideT = 8 + Math.random() * 10;
        visible = false;
        if (tr) X.snapAt(panOf(tr.x, tr.z));
      }
      // first person is decided after the walker step, with a nearer enter than exit
      // hold-still: away from the fire in the dark, it comes in close behind you
      const fireD = Math.hypot(P.x - CAMP_FIRE.x, P.z - CAMP_FIRE.z);
      if (dark && !atFire && (fireD > 28 || !fireOn) && G.absMin(S) > W.nextApproachAbs && S.day >= 1) {
        const gap = lerp(110, 40, pressureK);
        if (W.nextApproachAbs === 0) W.nextApproachAbs = G.absMin(S) + gap * 0.5;
        else startHoldStill();
      }
      // assault on the knoll: nights 5-7 when pressure is high, and always night 7
      if (atFire && fireOn && m >= 21 * 60 && ((S.day >= 7) || (S.day >= 5 && S.pressure >= 70)) && S.flags.assaultDay !== S.day) startAssault();
    }
  } else {
    W.mode = "away";
  }
  W.walkerNear = visible && Math.hypot(W.x - P.x, W.z - P.z) < 35 && dark;
  // walker tracks near the player = readable sign
  W.trackNear = walkerAbroad() && W.mode === "pace" && Math.hypot(W.x - P.x, W.z - P.z) < 40;
  E.walker.root.visible = visible;
  if (visible) {
    E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
    E.walker.root.rotation.y = W.yaw + Math.PI;
    E.walker.setLod?.(Math.hypot(W.x - P.x, W.z - P.z));
    E.walker.animate(anim, dt, t, eyes);
  }
}
function startChase() {
  S.flags.finale = 1;
  W.mode = "chase";
  W.chase = { t: 0, hits: 0, step: 0 };
  const p = placeWalker(34, -1, 0.1);
  W.x = p.x; W.z = p.z;
  A.playFx("scream", { pan: 0, near: true });
  cam.shake = 0.6;
  S.heart = clamp(S.heart - 8, 0, 100);
  G.say(S, S.elk.packed ? "Behind you, the timber breaks. Not stalking now. Coming. It wants what is on your back, or it wants you. The truck is close. RUN." : "Behind you, the timber breaks. It has stopped pretending. The truck is close. RUN.", true);
  think("charge");
  hud.toast("RUN", "Get to the truck.");
}
function updateChase(dt) {
  const t = T.now / 1000;
  const C = W.chase;
  C.t += dt;
  const d = Math.hypot(W.x - P.x, W.z - P.z);
  // it closes when you stop, keeps pace when you run; the meat slows you
  const sp = P.running ? 3.2 : P.moving ? (S.elk.packed ? 2.6 : 4.0) : 5.2; // a loaded man cannot run; it closes slowly
  const a = Math.atan2(P.x - W.x, P.z - W.z);
  if (d > 2) { W.x += Math.sin(a) * sp * dt; W.z += Math.cos(a) * sp * dt; }
  const c = collide(W.x, W.z, 0.6);
  W.x = c.x; W.z = c.z;
  W.yaw = a;
  E.walker.root.visible = true;
  E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
  E.walker.root.rotation.y = W.yaw + Math.PI;
  E.walker.setLod?.(d);
  E.walker.animate("run", dt, t, G.isDark(S.minutes) ? 1 : 0.6);
  C.step -= dt;
  if (C.step <= 0) { C.step = 0.42; X.heavyStep(panOf(W.x, W.z)); }
  W.walkerNear = true;
  hud.fear(clamp(1 - d / 30, 0.2, 0.9));
  hud.setWarn(d < 10 ? "IT'S RIGHT BEHIND YOU" : "RUN — THE TRUCK", true);
  if (d < 2.2) {
    C.hits++;
    hud.flash(0.85, 700);
    cam.shake = 1.3;
    X.roar();
    S.heart = clamp(S.heart - 20, 4, 100); // it will not break you this close to the truck
    G.say(S, C.hits > 1 ? "It hits you again and the world goes white. You are still on your feet. You do not know how." : "A blow across the shoulders like a swung log. You go to your knees in the snow, and get up, because the truck is right there.", true);
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    W.x = P.x - fx * 16; W.z = P.z - fz * 16;
  }
  // the truck: the door, the engine, the road down
  if (Math.hypot(P.x - (PLACES.truck.x + 5), P.z - (PLACES.truck.z + 4)) < 8) {
    W.mode = "away";
    E.walker.root.visible = false;
    hud.setWarn("");
    X.truckDoor();
    S.flags.chaseHits = C.hits;
    G.walkOut(S);
    finish();
  }
}
function startHoldStill() {
  W.mode = "still";
  W.stillT = 0;
  W.stillMoved = false;
  const p = placeWalker(9, -0.95, 0.15);
  W.x = p.x; W.z = p.z;
  S.walker.approaches++;
  input.clear();
  X.breathing(true, 0);
  think("still");
  hud.setWarn("IT IS CLOSE. DO NOT MOVE.", true);
  hud.toast("DON'T MOVE", "It is right behind you.");
}
function updateHoldStill(dt) {
  const t = T.now / 1000;
  W.stillT += dt;
  const dur = 8;
  // it circles from behind to one side, close, then away
  const k = W.stillT / dur;
  const a = P.yaw + Math.PI + (k - 0.5) * 2.2;
  const r = 6 - Math.sin(k * Math.PI) * 2.5;
  W.x = P.x + Math.sin(a) * r * -1; W.z = P.z + Math.cos(a) * r * -1;
  W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
  E.walker.root.visible = true;
  E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
  E.walker.root.rotation.y = W.yaw + Math.PI;
  E.walker.setLod?.(Math.hypot(W.x - P.x, W.z - P.z));
  E.walker.animate(W.stillT < 1.2 ? "sniff" : "crouch", dt, t, 0.9);
  if (Math.floor(W.stillT * 1.1) !== Math.floor((W.stillT - dt) * 1.1)) X.heavyStep(panOf(W.x, W.z));
  const ax = input.axes();
  const moved = Math.abs(ax.fwd) > 0.2 || Math.abs(ax.strafe) > 0.3 || Math.abs(ax.turn) > 0.5 || Math.abs(input.lookDX) > 40;
  input.lookDX = 0; input.lookDY = 0;
  hud.fear(0.55 + Math.sin(t * 7) * 0.1);
  if (moved && W.stillT > 0.6) {
    X.breathing(false);
    W.mode = "charge";
    W.charge = { t: 0, fx: W.x, fz: W.z, hit: false };
    hud.setWarn("");
    W.nextApproachAbs = G.absMin(S) + 70;
    return;
  }
  if (W.stillT >= dur) {
    X.breathing(false);
    S.stats.stills++;
    S.heart = clamp(S.heart - 5, 0, 100);
    G.say(S, S.stats.stills > 1 ? "The second time you do not run. It loses interest in a man who will not bolt." : "You keep the rifle down and the breath in your teeth. It passes. It may come again.", true);
    W.mode = "flee"; W.t = 0;
    hud.setWarn("");
    W.nextApproachAbs = G.absMin(S) + lerp(110, 45, clamp((S.pressure + S.day * 8) / 100, 0, 1));
  }
}
function startAssault() {
  S.flags.assaultDay = S.day;
  W.mode = "assault";
  W.assault = { t: 0, phase: "circle", pinned: 0 };
  const a = Math.atan2(P.x - CAMP_FIRE.x, P.z - CAMP_FIRE.z) + Math.PI;
  W.x = CAMP_FIRE.x; W.z = CAMP_FIRE.z + 26;
  A.playFx("chorus", { pan: 0, near: true });
  G.say(S, S.day >= 7 ? "They are all around you now. Then one of them comes for the fire." : "Branches break above camp, deliberate. Snow dumps from the high boughs. It is coming in.", true);
  hud.toast(S.day >= 7 ? "THE LAST NIGHT" : "IT IS COMING", "RIFLE. Shoot it in the firelight.");
}
function updateAssault(dt) {
  const t = T.now / 1000;
  const A_ = W.assault;
  A_.t += dt;
  const fx = CAMP_FIRE.x, fz = CAMP_FIRE.z + 1;
  // approach from the open front, across the wall line
  const startZ = PLACES.camp.z + 30, wallZ = PLACES.camp.z + 6.5;
  const slow = 1 + S.wall * 0.35;
  let z = startZ - (A_.t / (9 * slow)) * (startZ - fz - 2);
  if (S.deadfall && !S.deadfallSprung && z <= wallZ + 2.5) {
    S.deadfallSprung = true;
    A_.pinned = 6;
    E.deadfall.rotation.z = -1.45;
    X.roar(); X.crash(0);
    cam.shake = 1.2;
    G.say(S, "You yank the cord. Thirty feet of trunk comes down across its shoulders with a sound like a shotgun. It roars for the first time. Shoot. Now.", true);
  }
  if (A_.pinned > 0) { A_.pinned -= dt; z = wallZ + 2.5; A_.t -= dt; }
  W.x = fx + Math.sin(t * 0.5) * 1.5; W.z = z;
  W.yaw = Math.atan2(P.x - W.x, P.z - W.z);
  E.walker.root.visible = true;
  E.walker.root.position.set(W.x, heightAt(W.x, W.z), W.z);
  E.walker.root.rotation.y = W.yaw + Math.PI;
  E.walker.setLod?.(Math.hypot(W.x - P.x, W.z - P.z));
  E.walker.animate(A_.pinned > 0 ? "crouch" : "walk", dt, t, 1);
  W.walkerNear = true;
  hud.setWarn(A_.pinned > 0 ? "IT'S PINNED — SHOOT" : "IT'S COMING THROUGH — RIFLE", true);
  if (Math.hypot(W.x - P.x, W.z - P.z) < 2.2) {
    hud.flash(1, 1200);
    X.roar();
    S.heart = clamp(S.heart - 38, 0, 100);
    G.say(S, "It comes over the wall and through the fire like the fire is a rumor. You come to in the snow with the firelight on your face and the knoll empty.", true);
    W.mode = "flee"; W.t = 0;
    hud.setWarn("");
  }
}

/* --------------------------------- clock --------------------------------- */
function stepClock(mins) {
  const ctx = { atCamp: atCamp(), atFire: G.atFireNow(S, P.x, P.z), walkerNear: !!W.walkerNear, running: P.running };
  const ev = G.tick(S, mins, ctx);
  for (const e of ev) {
    if (e.type === "beat") {
      const b = e.beat;
        if (b.fx) {
        const ang = hash2(S.day, b.from) * 2 - 1;
        A.duck(0.45, 0.35);
        A.playFx(b.fx, { pan: b.near ? ang * 0.6 : ang, near: !!b.near });
        think(b.fx === "bugle" ? "bugle" : "hear");
      }
      if (b.id.startsWith("n") && b.heart) { cam.shake = Math.max(cam.shake, 0.3); }
      if (b.id === "n4-flash") hud.flash(0.08, 400);
      if (b.id === "d2-tracks") { for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; E.walkerTracks.add(CAMP_FIRE.x + Math.cos(a) * 15, CAMP_FIRE.z + Math.sin(a) * 15, -a, 1.1); } }
    } else if (e.type === "nightfall") {
      A.nightFall();
      think("night");
      hud.toast(S.day === 1 ? "FIRST DARK" : `NIGHT ${S.day}`, G.atFireNow(S, P.x, P.z) ? "Stay in the light." : "You are a long way from the fire.");
    } else if (e.type === "dusk") {
      A.hushBirds(true);
    } else if (e.type === "sleep") {
      doSleep(true);
    } else if (e.type === "collapse") {
      doSleep(atCamp());
    } else if (e.type === "end") {
      finish();
    }
  }
}

/* --------------------------------- ending --------------------------------- */
function finish() {
  mode = "ending";
  localStorage.removeItem(SAVE_KEY);
  const e = G.ENDINGS[S.ending] || G.ENDINGS.empty;
  const carried = [S.elk.packed ? "Bull elk, packed out" : null, S.cards.length ? `${S.cards.length} camera card${S.cards.length > 1 ? "s" : ""}` : null, S.rifle ? "The Winchester" + (S.walker.took ? ", gouged by teeth" : "") : "No rifle", `${S.rounds} rounds left`].filter(Boolean);
  setTimeout(() => {
    const c = hud.overlay(
      `<div class="title-bg" style="background-image:url(./assets/${S.elk.packed ? "truck" : S.ending === "broken" || S.ending === "kept" ? "walker" : "truck"}.jpg)"></div>
       <div style="position:relative"><h2>DAY ${Math.min(7, S.day)} · HARLAN WADE</h2><h1>${e.title}</h1><p>${e.text}</p>
       <p class="small">${carried.join(" · ")}<br>Nights on the mountain: ${S.stats.nights} · Times you saw it: ${S.stats.seen} · Held still: ${S.stats.stills}</p>
       <button class="btn hot" id="eAgain">HUNT AGAIN</button>
       <p class="small tip-line">If the trail was worth it — <a href="https://venmo.com/u/Jason-Collier-40" target="_blank" rel="noopener noreferrer">tip the trail boss</a>.</p></div>`,
    );
    c.querySelector("#eAgain").onclick = () => { freshGame(); intro(); };
  }, 1200);
}

/* --------------------------------- UI wiring --------------------------------- */
document.getElementById("btnLook").onclick = (e) => { e.stopPropagation(); doLook(); };
document.getElementById("btnRifle").onclick = (e) => { e.stopPropagation(); doRifle(); };
document.getElementById("btnNotes").onclick = (e) => { e.stopPropagation(); if (mode === "play") notesSheet(); };
document.getElementById("btnPause").onclick = (e) => { e.stopPropagation(); if (mode === "play") pauseMenu(); };
document.getElementById("btnOpticClose").onclick = (e) => { e.stopPropagation(); exitOptic(); };
document.getElementById("btnFire").onclick = (e) => { e.stopPropagation(); fireShot(); };
const holdBtn = document.getElementById("btnHold");
holdBtn.onpointerdown = (e) => { e.stopPropagation(); if (optic) optic.hold = 1; };
holdBtn.onpointerup = holdBtn.onpointerleave = () => { if (optic) optic.hold = 0; };
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (mode === "optic") {
    if (k === "r" && optic?.kind === "scope" || k === "f" && optic?.kind === "binos") { exitOptic(); return; }
    if (k === " " || k === "enter") { if (optic?.kind === "scope") fireShot(); }
    if (k === "shift" && optic) optic.hold = 1;
    if (k === "escape" || k === "x") exitOptic();
    return;
  }
  if (mode !== "play") return;
  if (k === "escape" || k === "p") { if (hud.sheetOpen) { hud.closeSheet(); paused = false; } else if (!hud.overlayOpen) pauseMenu(); return; }
  if (paused) return;
  if (k === "f") doLook();
  else if (k === "r") doRifle();
  else if (k === "j" || k === "n") notesSheet();
  else if (k === "h" || k === "?") { paused = true; controlsCard(false); }
  else {
    const acts = ctxActions();
    const a = acts.find((b) => (b.key || "").toLowerCase() === k);
    if (a) doAction(a.id);
  }
});
addEventListener("keyup", (e) => { if (e.key === "Shift" && optic) optic.hold = 0; });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play" && !paused) pauseMenu(); });

/* --------------------------------- frame --------------------------------- */
const TURN_RATE = 1.9; // rad/s at full stick / A-D
const tmpV = new THREE.Vector3();
const _qT = new THREE.Quaternion();
const _qF = new THREE.Quaternion();
const _m4 = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
function boomReach(px, pz, hy, yaw, dist, side, wantY) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  let lo = 0.2, hi = 1;
  for (let n = 0; n < 7; n++) {
    const mid = (lo + hi) * 0.5;
    const sx = px + (-fx * dist + rx * side) * mid;
    const sz = pz + (-fz * dist + rz * side) * mid;
    const sy = lerp(hy + 1.62, wantY, mid);
    const buried = sy < heightAt(sx, sz) + 0.95 || crownDepth(sx, sy, sz, 0.5) > 0;
    if (buried) hi = mid; else lo = mid;
  }
  return lo;
}
function camOnBoom(yaw, dist, side, kb, hy, wantY) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const x = P.x + (-fx * dist + rx * side) * kb;
  const z = P.z + (-fz * dist + rz * side) * kb;
  let y = lerp(hy + 1.75, wantY, Math.max(kb, 0.45));
  y = Math.max(y, heightAt(x, z) + 1.05);
  const buried = crownDepth(x, y, z, 0.28);
  return { x, y, z, buried, depth: buried };
}
/** A point on the ring around Harlan, at about shoulder height. */
function ringSpot(yaw, back, side, hy, wantY) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const x = P.x + (-fx * back + rx * side);
  const z = P.z + (-fz * back + rz * side);
  const y = Math.max(lerp(hy + 1.7, wantY, 0.72), heightAt(x, z) + 1.1);
  const buried = crownDepth(x, y, z, 0.28);
  return { x, y, z, buried, depth: buried };
}
/** Shoulder the camera prefers. In the open it stays on the boom; in a crown it eases to a clear ring. */
function desiredShoulder(hy, yaw, dist, side, wantY) {
  const nominal = boomReach(P.x, P.z, hy, yaw, dist, side, wantY);
  const spot = camOnBoom(yaw, dist, side, nominal, hy, wantY);
  if (spot.buried <= 0.05 && nominal > 0.72) { cam.avoid = null; return { reach: nominal, yaw, side, spot, ring: false }; }
  const prev = cam.avoid;
  let best = null;
  const yaws = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2];
  const backs = [dist, dist + 2.4, dist + 4.8, dist + 7.2, dist + 9.6];
  const sides = [side, side + 2.4, side - 2.4, side + 4.8, side - 4.8];
  for (const ny of yaws) {
    for (const back of backs) {
      for (const s of sides) {
        const syaw = yaw + ny;
        const p = ringSpot(syaw, back, s, hy, wantY);
        let cost = p.buried * 8 + Math.abs(ny) * 0.18 + Math.abs(back - dist) * 0.06 + Math.abs(s - side) * 0.05;
        if (prev) cost += Math.abs(wrapPi(syaw - prev.yaw)) * 0.45 + Math.abs(back - prev.back) * 0.08 + Math.abs(s - prev.side) * 0.08;
        if (!best || cost < best.cost) best = { cost, yaw: syaw, back, side: s, spot: p };
      }
    }
  }
  if (!best || best.spot.buried > 0.05) {
    const lifted = { ...spot, y: crownClearY(spot.x, spot.y, spot.z, 0.28) };
    lifted.depth = crownDepth(lifted.x, lifted.y, lifted.z, 0.28);
    return { reach: Math.min(nominal, 0.45), yaw, side, spot: lifted, ring: false };
  }
  cam.avoid = { yaw: best.yaw, back: best.back, side: best.side };
  const reach = clamp(best.back / dist, 0.34, 1);
  return { reach, yaw: best.yaw, side: best.side, spot: best.spot, ring: true };
}
function updateViewLatch(dt, live) {
  if (!live) return;
  if (window.__oldman?.lockFp) {
    fp.latched = true;
    fp.target = 1;
    fp.hold = 0;
    return;
  }
  const d = Math.hypot(W.x - P.x, W.z - P.z);
  const sequence = W.mode === "spot" || W.mode === "scare";
  const nightish = G.isDark(S.minutes) || S.minutes > 17 * 60 + 25;
  const timber = placeAt(P.x, P.z) === "timber" || trunksNear(P.x, P.z, 14).length > 2;
  const band = fp.latched ? FP_EXIT : FP_ENTER;
  const close = d > 8 && d < band;
  const cooled = G.absMin(S) >= (W.nextSpotAbs || 0);
  const threat = W.mode === "pace" && timber && nightish && !G.atFireNow(S, P.x, P.z) && close;
  if (sequence || (threat && (cooled || fp.latched || window.__oldman?.freezeW))) {
    if (!fp.latched) {
      let ok = sequence || !!window.__oldman?.freezeW;
      if (!ok) ok = startSpot(false);
      if (ok) { fp.latched = true; fp.hold = 0; fp.sync = true; fp.target = 1; }
    }
    if (fp.latched || sequence) fp.target = 1;
  } else if (fp.latched && fp.hold < FP_HOLD) {
    fp.target = 1;
  } else if (fp.latched) {
    cam.yaw = fp.yaw;
    P.yaw = fp.yaw;
    lookIdleT = 0;
    fp.latched = false;
    fp.target = 0;
    input.lookOnly = false;
  } else fp.target = 0;
  if (fp.latched) fp.hold += dt;
  const step = dt / FP_EASE;
  if (fp.k < fp.target) fp.k = Math.min(fp.target, fp.k + step);
  else if (fp.k > fp.target) fp.k = Math.max(fp.target, fp.k - step);
}
let stepAcc = 0, heartKey = "", ambT = 0, crackleT = 0, saveT = 0, breathT = 0;
// Real-time simulation (playtest): game time follows the wall clock even when the frame rate drops.
// Each rendered frame advances by the real elapsed time (capped at 0.5 s, e.g. after a tab switch),
// split into sub-steps of at most 50 ms so movement, AI and collisions stay stable; only the last
// sub-step renders.
let simHold = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (simHold) { lastT = now; return; }
  const real = Math.min(0.5, Math.max(0, (now - lastT) / 1000));
  lastT = now;
  const warp = window.__warp || 1;
  const total = real * warp;
  const n = Math.min(40, Math.max(1, Math.ceil(total / 0.05)));
  // adaptive quality watches the real frame time
  fps.acc += real; fps.n++;
  for (let i = 0; i < n; i++) tick(now - ((n - 1 - i) * real * 1000) / n, total / n, i === n - 1);
}
function tick(now, dt, last) {
  T.now = now;
  if (!S) { if (last) E.render(E.camera); return; }
  const t = now / 1000;
  const live = mode === "play" && !paused && S.mode === "play";
  if (last) {
  if (fps.acc > 2) {
    const avg = (fps.acc / fps.n) * 1000;
    fps.avg = avg;
    if (avg > 40 && E.quality > 0.7) E.setQuality(Math.max(0.7, E.quality - 0.15));
    else if (avg > 40 && !document.hidden && !Q.locked) {
      // still slow at reduced resolution: shed post effects, then remember a lower tier for the session
      fps.slow = (fps.slow || 0) + 1;
      if (fps.slow >= 2) { fps.slow = 0; const what = E.degrade(); if (!what) { if (E.quality > 0.55) E.setQuality(0.55); else Q.drop(); } }
    }
    else if (avg < 22 && E.quality < 1) E.setQuality(Math.min(1, E.quality + 0.1));
    fps.acc = 0; fps.n = 0;
  }
  }

  // ---- movement ----
  let speed = 0;
  const spotting = W.mode === "spot" || W.mode === "scare";
  const fpLook = spotting || fp.target > 0.5 || fp.k > 0.04;
  if (spotArm > 0 && live) { spotArm -= dt; if (spotArm <= 0) startSpot(true); }
  if (!spotting) input.lookOnly = false;
  if (live && fpLook) {
    input.lookOnly = spotting;
    const ax = spotting ? (auto ? { turn: 0, fwd: 0 } : input.axes()) : null;
    const turn = ax ? ax.turn : 0;
    fp.yaw = wrapPi(fp.yaw - input.lookDX * LOOK_X - turn * TURN_RATE * dt);
    fp.pitch = clamp(fp.pitch - input.lookDY * LOOK_Y, -0.95, 0.82);
    input.lookDX = 0; input.lookDY = 0;
    if (!spotting && (fp.target < 0.5 || fp.k > 0.72)) cam.yaw = fp.yaw;
  }
  if (live && W.mode !== "still" && !spotting) {
    const ax = auto ? autoAxes(dt) : input.axes();
    // tank steering (playtest): left/right turns Harlan in place at a steady rate, forward walks where he
    // faces, back steps backward. Heading never snaps toward the stick direction.
    let steer = ax.turn + (Math.abs(ax.strafe) > 0.12 ? (ax.strafe - Math.sign(ax.strafe) * 0.12) / 0.88 : 0);
    steer = clamp(steer, -1, 1);
    const turnK = ax.sneak && !ax.run ? 0.75 : 1;
    P.yaw = wrapPi(P.yaw - steer * TURN_RATE * turnK * dt);
    if (fpLook && (fp.target < 0.5 || fp.k > 0.72)) {
      fp.yaw = wrapPi(fp.yaw - steer * TURN_RATE * turnK * dt);
      cam.yaw = fp.yaw;
      lookIdleT = 0;
    } else if (!fpLook) {
      cam.yaw -= input.lookDX * LOOK_X;
      cam.pitch = clamp(cam.pitch + input.lookDY * 0.003, -0.1, 0.55);
      if (input.lookDX || input.lookDY) lookIdleT = 0; else lookIdleT += dt;
      input.lookDX = 0; input.lookDY = 0;
    }
    // the camera settles in behind Harlan unless the player is looking around
    if (lookIdleT > 1.2 && !fpLook) cam.yaw = dampAngle(cam.yaw, P.yaw, Math.abs(steer) > 0.05 ? 5 : 2.2, dt);
    const mag = Math.min(1, Math.abs(ax.fwd));
    if (mag > 0.08) {
      const back = ax.fwd < 0;
      const dirYaw = P.yaw;
      const sneaking = ax.sneak && !ax.run;
      const running = ax.run && !S.elk.packed && !back;
      speed = (running ? 4.8 : sneaking ? 1.5 : 2.7) * (back ? 0.45 : 1) * (S.elk.packed ? 0.8 : 1);
      if (input.my && !input.keys.size) speed *= clamp(mag * 1.15, 0.45, 1);
      const fx = -Math.sin(dirYaw) * (back ? -1 : 1), fz = -Math.cos(dirYaw) * (back ? -1 : 1);
      const slope = (heightAt(P.x + fx, P.z + fz) - heightAt(P.x, P.z));
      speed *= clamp(1 - slope * 0.35, 0.55, 1.15);
      const nx = P.x + fx * speed * dt, nz = P.z + fz * speed * dt;
      let c = collide(nx, nz, 0.42);
      for (const pc of E.propColliders) {
        const dx = c.x - pc.x, dz = c.z - pc.z, d = Math.hypot(dx, dz);
        if (d < pc.r + 0.4 && d > 0) c = { x: pc.x + (dx / d) * (pc.r + 0.4), z: pc.z + (dz / d) * (pc.r + 0.4) };
      }
      const wasX = P.x, wasZ = P.z;
      P.x = clamp(c.x, BOUNDS.x0 + 18, BOUNDS.x1 - 18);
      P.z = clamp(c.z, BOUNDS.z0 + 30, BOUNDS.z1 - 30);
      if (P.x !== c.x || P.z !== c.z) hud.setWarn("Too steep. Turn back.");
      P.travelled += Math.hypot(P.x - wasX, P.z - wasZ);
      P.running = running; P.sneaking = sneaking;
    } else { P.running = false; P.sneaking = false; }
  } else if (mode === "optic" && optic) {
    optic.yaw -= input.lookDX * 0.0016 + input.axes().turn * dt * 0.35;
    optic.pitch = clamp(optic.pitch - input.lookDY * 0.0012 + input.axes().fwd * dt * 0.15, -0.5, 0.35);
    input.lookDX = 0; input.lookDY = 0;
  }
  P.speed = damp(P.speed, speed, 4.6, dt);
  P.moving = P.speed > 0.3;
  if (P.moving) P.stillFor = 0; else P.stillFor += dt;

  // ---- clock ----
  if (live || (mode === "optic" && S.mode === "play")) {
    gameClockAcc += dt * TIME_SCALE * (S.watch ? 6 : 1) * (mode === "optic" ? 0.5 : 1);
    if (gameClockAcc >= 1) {
      const k = Math.floor(gameClockAcc);
      gameClockAcc -= k;
      stepClock(k);
    }
  }
  const place = placeAt(P.x, P.z);
  if (S.tut === 0 && place === "spur") { S.tut = 1; G.say(S, "The spur. Blazes on the spruce, old axe marks gone grey. Fresh tracks cut across the snow just past the post."); think("tracks"); }
  if (place === "timber" && S.flags.thoughtTimber !== S.day) { if (think("timber")) S.flags.thoughtTimber = S.day; }
  if (G.isDark(S.minutes) && atCamp() && G.fireLit(S) && S.flags.thoughtCamp !== S.day) { if (think("camp")) S.flags.thoughtCamp = S.day; }
  if (S.heart < 32 && !S.flags.thoughtNerve) { if (think("nerve")) S.flags.thoughtNerve = 1; }
  if (S.heart > 55) S.flags.thoughtNerve = 0;
  if (S.minutes < 6 * 60 + 30 && S.minutes > 5 * 60 + 20 && S.flags.thoughtDawn !== S.day) { if (think("dawn")) S.flags.thoughtDawn = S.day; }
  if (S.minutes > 10 * 60) S.flags.thoughtDawn = 0;

  // ---- world ----
  const L = lightAt(S.minutes, moonOf(S.day), clamp(snowAt(S.day, S.minutes) - 0.4, 0, 1));
  const snow = snowAt(S.day, S.minutes);
  const lit = E.applyLight(L, S.minutes, { moon: moonOf(S.day), snow, storm: clamp(snow - 0.4, 0, 1) });
  if (place === "timber" || Math.hypot(P.x - PLACES.timber.x, P.z - PLACES.timber.z) < 55) E.scene.fog.density *= 1.12;
  if (window.__oldman?.clearFog != null) {
    E.scene.fog.density = window.__oldman.clearFog;
    E.renderer.toneMappingExposure = 1.2;
    E.hemi.intensity *= 1.35;
    E.sun.intensity *= 1.25;
  }
  // good glass cuts the haze: optics see much farther than the naked eye
  if (mode === "optic") E.scene.fog.density *= optic && optic.kind === "binos" ? 0.3 : 0.4;
  // good glass gathers light: the last of dusk and the firelight read better through the scope
  if (mode === "optic" && optic) E.hemi.intensity *= 1.7;
  const dark = L.dark;
  if (window.__autoFire === true && live && atCamp() && G.canLightFire(S) && !hud.overlayOpen) G.lightFire(S); // test hook
  E.setFire(G.fireLit(S), G.fireLaid(S));
  const fl = E.updateFire(dt, t);
  // frost creeps in from the screen corners when it's cold and dark away from the fire (and when fear spikes)
  if (last) {
    const nearFire = G.fireLit(S) && Math.hypot(P.x - CAMP_FIRE.x, P.z - CAMP_FIRE.z) < 9 ? 1 : 0;
    const want = clamp(dark * 0.55 + snow * 0.25 + (S.heart < 30 ? 0.25 : 0) - nearFire * 0.6 + (S.minutes < 7 * 60 ? 0.15 : 0), 0, 0.85);
    frostK += (want - frostK) * (1 - Math.exp(-0.4 * dt));
    if (frostEl) frostEl.style.opacity = frostK.toFixed(3);
  }
  E.setSticks(S.sticks, S.day === 1 || dark > 0.5);
  updateBull(dt);
  updateWalker(dt);
  if (window.__oldman?.beastPose) {
    const bx = window.__oldman.freezeW ? window.__oldman.freezeW[0] : W.x;
    const bz = window.__oldman.freezeW ? window.__oldman.freezeW[1] : W.z;
    W.x = bx; W.z = bz;
    E.walker.root.visible = true;
    E.walker.root.position.set(bx, heightAt(bx, bz), bz);
    E.walker.root.rotation.y = Math.atan2(P.x - bx, P.z - bz) + Math.PI;
    E.walker.setLod?.(Math.hypot(bx - P.x, bz - P.z));
    E.walker.animate(window.__oldman.beastPose, dt, t, window.__oldman.beastEyes ?? 1);
  }
  updateViewLatch(dt, live);

  // Harlan
  const H = E.harlan;
  const hy = heightAt(P.x, P.z);
  H.root.position.set(P.x, hy, P.z);
  H.root.rotation.y = P.yaw;
  H.setRifle(S.rifle);
  H.setMeat(S.elk.packed);
  const afraid = S.heart < 40 || W.walkerNear || W.mode === "still";
  const sitWatch = !harlanPose && S.watch && !P.moving && P.speed < 0.1 && mode !== "optic";
  const an = H.animate(harlanPose || sitWatch ? 0 : P.speed, dt, { sneak: P.sneaking, afraid, aiming: mode === "optic", pose: harlanPose, sitting: sitWatch });
  // footsteps + prints
  const ph = H.phase();
  const crossed = Math.floor(ph / Math.PI) !== Math.floor(P.lastStepPhase / Math.PI);
  const real = an && an.plant !== undefined; // rigged Harlan reports actual foot plants
  if ((real ? an.plant : crossed) && P.moving) {
    const side = real ? (an.plant === "l" ? -1 : 1) : Math.floor(ph / Math.PI) % 2 ? 1 : -1;
    A.footstep(P.running ? 1 : P.sneaking ? 0.2 : 0.6);
    E.prints.add(P.x + Math.cos(P.yaw) * 0.14 * side, P.z - Math.sin(P.yaw) * 0.14 * side, P.yaw);
  }
  P.lastStepPhase = ph;
  // breath in the cold
  breathT -= dt;
  if (breathT <= 0) {
    breathT = afraid ? 0.9 : P.running ? 1.0 : 2.6;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    E.puff(P.x + fx * 0.3, hy + 1.68, P.z + fz * 0.3, fx, fz);
  }
  E.updatePuffs(dt, 0.6 + dark * 0.5);
  updateSignRing(t);
  E.updateMist(dt, t, clamp(L.fogDensity - 0.35, 0, 1) * (0.5 + dark * 0.3) + (S.minutes < 9 * 60 ? 0.25 : 0), E.scene.fog.color);

  // headlamp: on after sunset or in deep murk
  const lampOn = dark > 0.35;
  H.setLamp?.(lampOn);
  const fwdX = -Math.sin(P.yaw), fwdZ = -Math.cos(P.yaw);
  const lampYaw = mode === "optic" && optic ? optic.yaw : lerp(P.yaw, cam.yaw, 0.0) ;
  const lx = -Math.sin(lampYaw), lz = -Math.cos(lampYaw);
  const flick = 0.94 + Math.sin(t * 37) * 0.03 * (S.heart < 30 ? 3 : 1);
  E.lamp.intensity = lampOn ? (28 + dark * 10) * flick * (S.heart < 25 ? 0.85 : 1) : 0;
  E.lamp.angle = S.heart < 35 ? 0.34 : 0.42;
  E.lamp.position.set(P.x + lx * 0.25, hy + 1.82, P.z + lz * 0.25);
  E.lamp.target.position.set(P.x + lx * 12, heightAt(P.x + lx * 12, P.z + lz * 12) + 0.2, P.z + lz * 12);
  E.lampFill.intensity = lampOn ? 1.6 : 0;
  E.lampFill.position.set(P.x + lx * 0.6, hy + 2.2, P.z + lz * 0.6);

  // ---- camera ----
  const camT = E.camera;
  if (mode === "optic" && optic) {
    const eye = tmpV.set(P.x, hy + 1.7, P.z);
    camT.position.copy(eye);
    optic.t += dt;
    let swayX = 0, swayY = 0;
    if (optic.kind === "scope") {
      const nerve = clamp(1 - S.heart / 100, 0, 1);
      const amp = (0.006 + nerve * 0.014 + (W.walkerNear ? 0.01 : 0)) * (optic.hold && optic.holdLeft > 0 ? 0.22 : 1);
      if (optic.hold) optic.holdLeft -= dt; else optic.holdLeft = Math.min(3.5, optic.holdLeft + dt * 0.6);
      if (optic.holdLeft <= 0) optic.hold = 0;
      swayX = Math.sin(optic.t * 0.75) * 0.004 + Math.sin(optic.t * 1.3) * amp + Math.sin(optic.t * 3.1) * amp * 0.3;
      swayY = Math.sin(optic.t * 0.55) * 0.003 + Math.sin(optic.t * 1.7 + 1) * amp * 0.8 + Math.sin(optic.t * 0.9) * amp * 0.4;
      document.getElementById("opticFill").style.width = `${(optic.holdLeft / 3.5) * 100}%`;
    }
    const yaw = optic.yaw + swayX, pitch = optic.pitch + swayY;
    camT.lookAt(eye.x - Math.sin(yaw) * Math.cos(pitch) * 10, eye.y + Math.sin(pitch) * 10, eye.z - Math.cos(yaw) * Math.cos(pitch) * 10);
    camT.fov = optic.kind === "scope" ? (optic.colt ? 40 : 12) : 14;
    camT.updateProjectionMatrix();
    H.root.visible = false;
    updateOpticInfo(dt);
  } else {
    const yaw = cam.yaw;
    // over-the-shoulder: Harlan sits lower-left, the trail ahead stays open
    const dist = cam.dist + (P.running ? 0.5 : 0) + (S.elk.packed ? 0.3 : 0);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const side = 0.85;
    const wantY = hy + cam.height + cam.pitch * 3.2;
    const want = desiredShoulder(hy, yaw, dist, side, wantY);
    if (!want.ring) cam.avoid = null;
    if (cam.boom == null) cam.boom = want.reach;
    const pulling = want.ring || want.reach < cam.boom - 0.002;
    cam.boom = damp(cam.boom, want.reach, pulling ? 4.4 : 2.3, dt);
    const goal = (want.ring || want.spot.buried > 0.05) ? want.spot : camOnBoom(yaw, dist, side, cam.boom, hy, wantY);
    if (!cam.ready) { cam.x = goal.x; cam.y = goal.y; cam.z = goal.z; cam.ready = true; }
    else {
      // ease into the clear spot; a hard snap is what made the shoulder feel finicky
      const rate = want.ring ? 3.5 : 8;
      cam.x = damp(cam.x, goal.x, rate, dt);
      cam.y = damp(cam.y, goal.y, rate, dt);
      cam.z = damp(cam.z, goal.z, rate, dt);
    }
    const floor = heightAt(cam.x, cam.z) + 1.05;
    if (cam.y < floor) cam.y = damp(cam.y, floor, 6, dt);
    const ahead = 7;
    const ly = heightAt(P.x + fx * ahead, P.z + fz * ahead);
    const ox = P.x + fx * ahead + rx * side * 0.6;
    const oy = Math.max(ly, hy) + 1.15 - cam.pitch * 2 + (W.mode === "still" ? -0.2 : 0);
    const oz = P.z + fz * ahead + rz * side * 0.6;
    const eyeY = hy + 1.62;
    if (fp.sync || (!spotting && fp.target < 0.5 && fp.k < 0.02)) {
      const dx = ox - cam.x, dy = oy - cam.y, dz = oz - cam.z;
      fp.yaw = Math.atan2(-dx, -dz);
      fp.pitch = Math.atan2(dy, Math.hypot(dx, dz) || 1);
      fp.sync = false;
    }
    const blend = fp.k * fp.k * (3 - 2 * fp.k);
    if (blend > 0.42) H.root.visible = false;
    else if (blend < 0.18) H.root.visible = true;
    cam.shake = Math.max(0, cam.shake - dt * 1.5);
    const sh = cam.shake * 0.12;
    const phb = H.phase();
    const bobAmp = P.moving ? (P.running ? 0.055 : P.sneaking ? 0.014 : 0.032) : 0;
    const breathY = Math.sin(t * (afraid ? 2.6 : 1.15)) * (blend > 0.4 ? 0.014 : 0.008);
    const bobY = Math.sin(phb * 2) * bobAmp + breathY;
    const bobX = Math.cos(phb) * bobAmp * 0.4;
    const px = lerp(cam.x, P.x, blend) + (Math.random() - 0.5) * sh + bobX * blend;
    const py = lerp(cam.y, eyeY, blend) + (Math.random() - 0.5) * sh * 0.6 + bobY * (0.35 + blend * 0.65);
    const pz = lerp(cam.z, P.z, blend) + (Math.random() - 0.5) * sh;
    camT.position.set(px, py, pz);
    const useFp = spotting || fp.target > 0.5 || fp.k > 0.04;
    if (!useFp) {
      camT.lookAt(ox, oy, oz);
    } else {
      const pit = fp.pitch;
      _a.set(cam.x, cam.y, cam.z);
      _b.set(ox, oy, oz);
      _m4.lookAt(_a, _b, _up);
      _qT.setFromRotationMatrix(_m4);
      _a.set(P.x, eyeY, P.z);
      _b.set(
        P.x - Math.sin(fp.yaw) * Math.cos(pit) * 8,
        eyeY + Math.sin(pit) * 8,
        P.z - Math.cos(fp.yaw) * Math.cos(pit) * 8,
      );
      _m4.lookAt(_a, _b, _up);
      _qF.setFromRotationMatrix(_m4);
      camT.quaternion.slerpQuaternions(_qT, _qF, blend);
    }
    const bf = baseFov() * lerp(1, 0.84, blend);
    if (Math.abs(camT.fov - bf) > 0.01) { camT.fov = bf; camT.updateProjectionMatrix(); }
  }
  const phNow = H.phase();
  E.viewmodel?.update(dt, {
    show: !window.__oldman?.hideHands && optic?.kind !== "binos" && (fp.k > 0.55 || (mode === "optic" && optic?.kind === "scope")),
    aim: mode === "optic" && optic?.kind === "scope",
    phase: phNow,
    speed: P.speed,
    afraid,
    sway: mode === "optic" ? Math.sin(t * 0.8) : 0,
  });
  occlusion.uCam.value.copy(camT.position);
  occlusion.uPlayer.value.set(P.x, hy + 1.1, P.z);
  occlusion.uOn.value = mode === "optic" || fp.k > 0.45 ? 0 : 1;
  E.sky.follow(camT);
  E.sky.starU.time.value = t;
  E.snowU.t.value = t;
  E.snowU.origin.value.copy(camT.position);
  E.forest.update(camT.position.x, camT.position.z, 240);
  // trail cameras + wall + deadfall visibility
  for (const [id, m] of Object.entries(E.camMeshes)) {
    const on = !!S.cams[id];
    m.box.visible = m.strap.visible = m.led.visible = on;
    m.led.material.color.setHex(Math.sin(t * 3) > 0.9 ? 0xff2200 : 0x330000);
  }
  E.wallSegs.forEach((w, i) => (w.g.visible = i < S.wall));
  E.deadfall.visible = S.deadfall;
  if (!S.deadfallSprung) E.deadfall.rotation.z = -0.5;

  if (last) E.render(camT);

  // ---- audio ----
  ambT -= dt;
  if (ambT <= 0 && mode !== "title") {
    ambT = 0.5;
    const creekD = Math.min(...[[-122, -276], [-110, -320], [-140, -230]].map(([x, z]) => Math.hypot(P.x - x, P.z - z)));
    const night = G.isDark(S.minutes);
    A.setAmbience({ creek: clamp(1 - creekD / 70, 0, 1) * 0.08, tension: W.walkerNear ? 0.03 : 0, rustle: 0.02 + snow * 0.02, phase: night ? "night" : S.minutes > 16 * 60 ? "dusk" : "day" });
    A.setWind(0.02 + snow * 0.05 + (hereOverlook() ? 0.02 : 0));
    const dread = night ? (G.atFireNow(S, P.x, P.z) ? 0.35 : 0.8) : S.minutes > 16 * 60 + 30 ? 0.4 : 0.06;
    A.setDread(W.mode === "still" || W.mode === "assault" || W.mode === "spot" || W.mode === "scare" ? 1 : dread, !!W.walkerNear || W.mode === "still" || W.mode === "spot");
    if (G.isDark(S.minutes) && W.mode === "pace") {
      farT -= 0.5;
      if (farT <= 0) { farT = 28 + Math.random() * 24; A.duck(0.35, 0.4); X.distant((Math.random() * 2 - 1) * 0.8); }
    }
    const scare = W.mode === "spot" || W.mode === "scare";
    const hk = `${Math.round(S.heart / 6)}|${night || W.walkerNear}|${W.mode}`;
    if (hk !== heartKey) { heartKey = hk; A.setHeartbeat(scare ? Math.min(S.heart, 30) : S.heart, true, night || !!W.walkerNear || scare); }
    X.fireLevel(G.fireLit(S) ? clamp(1 - Math.hypot(P.x - CAMP_FIRE.x, P.z - CAMP_FIRE.z) / 30, 0, 1) : 0);
  }
  saveT += dt;
  if (saveT > 20 && live) { saveT = 0; save(); }

  // ---- HUD ----
  if (last) updateHud(dark);
}

function updateOpticInfo(dt) {
  // binoculars: hold the bull (or cows / the ridge thing) in the ring to mark him
  const lab = document.getElementById("opticLabel"), rng = document.getElementById("opticRange");
  const camT = E.camera;
  const fwd = new THREE.Vector3();
  camT.getWorldDirection(fwd);
  const inRing = (x, y, z, tol) => {
    const v = new THREE.Vector3(x - camT.position.x, y - camT.position.y, z - camT.position.z);
    const d = v.length();
    return { ok: v.normalize().dot(fwd) > Math.cos(tol), d };
  };
  let txt = optic.kind === "binos" ? "GLASSING" : optic.colt ? "COLT 1911" : `${S.rounds} RDS`;
  let rtxt = "";
  if (optic.kind === "binos") {
    let target = null;
    if (bull.vis && G.bullShowing(S) && !S.elk.down) {
      const r = inRing(bull.x, heightAt(bull.x, bull.z) + 1.4, bull.z, 0.05);
      if (r.ok) target = { kind: "bull", d: r.d };
    }
    if (!target && S.day <= 2) {
      for (const c of cows) {
        if (!E.cows[cows.indexOf(c)].root.visible) continue;
        const r = inRing(c.x, heightAt(c.x, c.z) + 1.3, c.z, 0.06);
        if (r.ok) { target = { kind: "cows", d: r.d }; break; }
      }
    }
    if (target) {
      optic.progress = Math.min(1, optic.progress + dt / 1.2);
      txt = target.kind === "bull" ? "BULL" : "COWS";
      rtxt = `${Math.round(target.d)} m`;
      if (optic.progress >= 1 && !optic.marked) {
        optic.marked = true;
        X.beep();
        if (target.kind === "bull") { if (S.elk.marked !== S.day) { G.markBull(S, hereOverlook()); think("elk"); } }
        else {
          if (S.tut === 1) S.tut = 2;
          G.say(S, S.day === 1 ? "Cows, three of them, feeding along the edge of the park. No bull with them. Not yet. He is close: you can smell the rut on the wind. A camera on the saddle trail will tell you what moves at night." : "Cows on the meadow, heads up, all looking at the timber.", true);
          think("deer");
        }
      }
    } else optic.progress = Math.max(0, optic.progress - dt);
    document.getElementById("opticFill").style.width = `${optic.progress * 100}%`;
    if (!target) {
      optic.scan = (optic.scan || 0) + dt;
      if (optic.scan > 7 && !optic.marked && !optic.saidNothing) {
        optic.saidNothing = true;
        const bp = G.bullPlace(S);
        const ov = hereOverlook();
        G.say(S, !G.bullShowing(S) ? "Elk sign all over the park, but the bull is not showing himself. He moves at last light." : bp && ov && VIEWS[ov].includes(bp) ? `Something moving at the ${PLACES[bp].short.toLowerCase()}. Pan to it and hold the glass steady.` : "Nothing moving below. Wrong overlook, or he is somewhere you cannot see from here.");
      }
    }
  }
  lab.textContent = txt;
  rng.textContent = rtxt;
}

let hudT = 0;
function updateHud(dark) {
  hudT -= 1;
  const now = T.now;
  const phase = G.phaseOf(S.minutes);
  hud.setTop(S.day, S.minutes, phase, G.isDark(S.minutes));
  hud.setNerve(S.heart);
  if (S.line && S.line !== voicedLine && voiceCatalogReady()) {
    voicedLine = S.line;
    const dur = Math.max(5600, Math.min(16000, S.line.length * 70));
    hud.setLine(S.line, now, dur);
    speakCaption(S.line, true, (text, ms) => hud.setLine(text, performance.now(), ms));
  } else if (S.line && S.line !== lastShownLine) {
    lastShownLine = S.line;
    hud.setLine(S.line, now, Math.max(5600, Math.min(16000, S.line.length * 70)));
  } else hud.setLine(S.line, now);
  hud.tickThought(now);
  document.body.classList.toggle("spotting", W.mode === "spot" || W.mode === "scare");
  document.body.classList.toggle("eyeline", fp.k > 0.35);
  const ctx = { atCamp: atCamp(), px: P.x, pz: P.z };
  const ob = G.objective(S, ctx);
  const dist = ob && ob.target ? Math.hypot(ob.target.x - P.x, ob.target.z - P.z) : null;
  if (ob) hud.setObjective(ob.text, dist, ob.urgent); else hud.setObjective("", null);
  // warnings
  if (W.mode !== "still" && W.mode !== "assault" && W.mode !== "chase") {
    let warn = "";
    let hot = false;
    const bp = G.bullPlace(S);
    if (bull.vis && bp && G.bullShowing(S) && !S.elk.down && S.elk.marked !== S.day && Math.hypot(bull.x - P.x, bull.z - P.z) < 95 && S.day >= 3) warn = "You haven't glassed him. Walking in will blow him out.";
    else if (W.walkerNear) { warn = "IT IS IN THE TREES"; hot = true; }
    else if (G.isDark(S.minutes) && !G.atFireNow(S, P.x, P.z)) warn = "Far from the fire";
    else if (P.running && bull.vis) warn = "Too loud";
    hud.setWarn(warn, hot);
  }
  const fear = clamp((1 - S.heart / 100) * 0.7 + (W.walkerNear ? 0.35 : 0), 0, 1) * (mode === "optic" ? 0.3 : 1);
  if (W.mode !== "still" && W.mode !== "chase") hud.fear(fear * (0.85 + Math.sin(now / 300) * 0.15));
  hud.status(`${S.rifle ? S.rounds + " RDS" : "COLT " + S.colt} · ${S.camsLeft} CAM · ${S.carried} WOOD${S.wall ? ` · WALL ${S.wall}/4` : ""}${S.elk.packed ? " · MEAT" : ""}`);
  hud.setCtx(mode === "play" ? ctxActions() : [], doAction);
  // compass
  const markers = [
    { x: CAMP_FIRE.x, z: CAMP_FIRE.z, label: "CAMP", color: G.fireLit(S) ? "#ffb060" : "rgba(236,230,218,0.7)" },
    { x: PLACES.truck.x, z: PLACES.truck.z, label: "TRUCK", color: "rgba(169,193,220,0.8)" },
  ];
  if (ob && ob.target) markers.push({ x: ob.target.x, z: ob.target.z, label: ob.target.label, color: "#e07a2e", kind: "diamond" });
  if (W.walkerNear) markers.push({ x: W.x, z: W.z, label: "", color: "rgba(255,60,40,0.85)" });
  const wv = { N: [0, 1], S: [0, -1], E: [-1, 0], W: [1, 0] }[G.windOf(S)];
  hud.compass(mode === "optic" && optic ? optic.yaw : cam.yaw, P.x, P.z, markers, wv);
  // world labels + waypoint
  const project = (x, y, z) => E.worldToScreen(x, y, z);
  hud.labels(project, P.x, P.z, mode === "play");
  if (ob && ob.target && mode === "play") {
    const ty = heightAt(ob.target.x, ob.target.z) + 3.2;
    hud.waypoint(project(ob.target.x, ty, ob.target.z), ob.target.label, dist);
  } else hud.waypoint(null);
  // "PUSH TO WALK" goes for good after the first real walk
  if (!hintDone && (input.usedStick || input.usedKeys || P.travelled > 0.4)) { hintDone = true; try { localStorage.setItem("oldman-walked", "1"); } catch {} }
  document.getElementById("touchhint").classList.toggle("gone", hintDone || mode !== "play");
  // keyboard hint (desktop)
  const kh = hud.el.keyhint;
  const txt = mode === "optic" ? (optic.kind === "scope" ? "DRAG/WASD AIM · SHIFT HOLD BREATH · SPACE FIRE · R/X LOWER" : "DRAG/WASD PAN · HOLD THE RING ON HIM · F/X LOWER") : "WASD WALK · DRAG LOOK · SHIFT RUN · C SNEAK · F LOOK · R RIFLE · E ACT · J NOTES · H HELP";
  if (kh.textContent !== txt) kh.textContent = txt;
  // camera hint keeps Harlan in the lower third: done by lookAt offset
}

/* --------------------------------- autopilot (playtests walk the real trails) --------------------------------- */
let auto = null;
function nearestPlaceId(x, z) {
  let best = "truck", bd = 1e9;
  for (const id of PLACE_IDS) { const d = Math.hypot(PLACES[id].x - x, PLACES[id].z - z); if (d < bd) { bd = d; best = id; } }
  return best;
}
function autopilotTo(x, z, opts = {}) {
  const from = nearestPlaceId(P.x, P.z), to = nearestPlaceId(x, z);
  const path = G.route(from, to);
  const pts = [{ x: PLACES[from].x, z: PLACES[from].z }];
  if (Math.hypot(P.x - PLACES[from].x, P.z - PLACES[from].z) < 25) pts.shift();
  for (let i = 0; i < path.length - 1; i++) { const tp = trailBetween(path[i], path[i + 1]); if (tp) pts.push(...tp.slice(1)); }
  pts.push({ x, z });
  auto = { pts, i: 0, run: !!opts.run, sneak: !!opts.sneak, stuck: 0, last: { x: P.x, z: P.z }, t: 0 };
  return pts.length;
}
function autoAxes(dt) {
  const a = auto;
  let tgt = a.pts[a.i];
  while (tgt && Math.hypot(tgt.x - P.x, tgt.z - P.z) < (a.i === a.pts.length - 1 ? 1.6 : 3.5)) { a.i++; tgt = a.pts[a.i]; }
  if (!tgt) { auto = null; return { fwd: 0, strafe: 0, turn: 0, run: false, sneak: false }; }
  const want = Math.atan2(-(tgt.x - P.x), -(tgt.z - P.z));
  const diff = wrapPi(want - P.yaw);
  a.t += dt;
  if (a.t > 1.5) { const moved = Math.hypot(P.x - a.last.x, P.z - a.last.z); a.stuck = moved < 0.5 ? a.stuck + 1 : 0; a.last = { x: P.x, z: P.z }; a.t = 0; }
  const wiggle = a.stuck > 1 ? Math.sin(T.now / 400) : 0;
  return { fwd: Math.abs(diff) > 1.3 ? 0.15 : 1, strafe: 0, turn: clamp(-diff * 2.5, -1, 1) + wiggle * 0.5, run: a.run, sneak: a.sneak };
}

/* --------------------------------- test hooks --------------------------------- */
window.__oldman = {
  get S() { return S; }, P, W, bull, E, G,
  get mode() { return mode; },
  teleport(x, z, yaw) { P.x = x; P.z = z; if (yaw != null) { P.yaw = yaw; cam.yaw = yaw; fp.yaw = yaw; } cam.x = 0; cam.y = 0; cam.z = 0; cam.ready = false; cam.boom = 1; },
  tp(place, back = 0) { const p = PLACES[place]; this.teleport(p.x, p.z + back, P.yaw); },
  face(x, z) { const y = Math.atan2(-(x - P.x), -(z - P.z)); P.yaw = y; cam.yaw = y; fp.yaw = y; cam.ready = false; if (optic) { optic.yaw = y; optic.pitch = Math.atan2(heightAt(x, z) + 1.2 - heightAt(P.x, P.z) - 1.65, Math.hypot(x - P.x, z - P.z)); } },
  setTime(day, minutes) { S.day = day; S.minutes = minutes; },
  advance,
  start() { if (!S) freshGame(); startPlay(); },
  doAction, doLook, doRifle, fireShot, exitOptic, ctxActions, notesSheet, pauseMenu,
  get optic() { return optic; },
  keys: input,
  fps,
  autopilotTo,
  goPlace(id, opts) { const p = PLACES[id]; return autopilotTo(p.x, p.z, opts); },
  get auto() { return auto; },
  get line() { return S.line; },
  objective() { return G.objective(S, { atCamp: atCamp(), px: P.x, pz: P.z }); },
  hudText() { return { obj: document.getElementById("hudObjective").textContent, warn: document.getElementById("hudWarn").textContent, line: document.getElementById("hudLine").textContent, status: document.getElementById("hudStatus").textContent, ctx: [...document.querySelectorAll("#ctxBtns button")].map((b) => b.textContent) }; },
  overlayText() { const o = document.getElementById("overlay"); return o.classList.contains("hidden") ? "" : o.innerText; },
  clickOverlay(sel) { const b = document.querySelector(sel || "#overlayCard button"); if (b) b.click(); return !!b; },
  bullPos() { return { x: bull.x, z: bull.z, vis: bull.vis }; },
  forceAssault() { S.flags.assaultDay = 0; startAssault(); },
  forceStill() { startHoldStill(); },
  forceSpot() { startSpot(true); },
  lookAtWalker() {
    fp.yaw = Math.atan2(-(W.x - P.x), -(W.z - P.z));
    const d = Math.hypot(W.x - P.x, W.z - P.z) || 1;
    fp.pitch = Math.atan2(heightAt(W.x, W.z) + 2.15 - (heightAt(P.x, P.z) + 1.62), d);
  },
  holdSpot: false,
  armSpot(sec = 1.4) { spotArm = sec; },
  get fp() { return fp.k; },
  get fpYaw() { return fp.yaw; },
  get spotting() { return W.mode; },
  set warpT(v) { window.__warp = v; },
  fpBand: { enter: FP_ENTER, exit: FP_EXIT, hold: FP_HOLD, ease: FP_EASE },
  placeWalker(dist, ang = 0) {
    const x = P.x + Math.sin(ang) * dist;
    const z = P.z + Math.cos(ang) * dist;
    W.mode = "pace";
    W.hideT = 0;
    W.x = x; W.z = z;
    this.freezeW = [x, z];
    E.walker.root.visible = true;
    E.walker.root.position.set(x, heightAt(x, z), z);
  },
  camState() {
    const d = new THREE.Vector3();
    E.camera.getWorldDirection(d);
    return {
      k: fp.k, target: fp.target, latched: fp.latched, hold: +fp.hold.toFixed(3),
      yaw: fp.yaw, camYaw: cam.yaw, pyaw: P.yaw, fov: E.camera.fov, boom: cam.boom ?? 1,
      pos: [E.camera.position.x, E.camera.position.y, E.camera.position.z],
      dir: [d.x, d.y, d.z], mode: W.mode, lookOnly: !!input.lookOnly,
      clip: crownDepth(E.camera.position.x, E.camera.position.y, E.camera.position.z, 0.2),
      wd: Math.hypot(W.x - P.x, W.z - P.z),
      ground: E.camera.position.y - heightAt(E.camera.position.x, E.camera.position.z),
    };
  },
  relaxThought() { thinkAt = 0; armThought(); },
  sayThought(id) { return think(id); },
  holdSim(on) { simHold = !!on; lastT = performance.now(); },
  pump(seconds = 0.05, present = false) {
    const total = Math.max(0.001, seconds);
    const n = Math.min(120, Math.max(1, Math.ceil(total / 0.05)));
    const dt = total / n;
    const now = performance.now();
    for (let i = 0; i < n; i++) tick(now, dt, present && i === n - 1);
  },
  draw() { E.render(E.camera); },
  thoughtText() {
    const n = document.getElementById("thought");
    return { text: n ? n.textContent : "", show: !!(n && n.classList.contains("show")) };
  },
  thoughtLines() { return LINES; },
  voiceReady,
};

/* --------------------------------- go --------------------------------- */
whenLoaded(12000).then(() => { document.getElementById("loadMsg").textContent = "Ready"; setTimeout(() => document.getElementById("loading").classList.add("gone"), 250); });
freshGame();
showTitle();
requestAnimationFrame(frame);
function setupShot(kind) {
  S.line = " ";
  S.tut = 1;
  S.flags.thoughtTimber = 1;
  window.__oldman.start();
  window.__oldman.setTime(1, 9 * 60 + 10);
  window.__oldman.lockFp = true;
  const elkLine = "Cows on the meadow, heads up, all looking at the timber.";
  const signLine = "Long, narrow prints, no claw marks. The stride too even, almost measured. Not crossing your trail. Following it.";
  if (kind === "harlan" || kind === "harlan2") {
    window.__oldman.tp("meadow", 8);
    fp.k = 1; fp.target = 1; fp.latched = true; fp.pitch = -0.12;
    window.__oldman.hideHands = false;
  } else if (kind === "beast" || kind === "beast2" || kind === "beastclose") {
    const close = kind === "beastclose";
    const mid = kind === "beast2";
    window.__oldman.tp("meadow", close || mid ? 18 : 12);
    window.__oldman.placeWalker(close ? 4.2 : mid ? 13 : 6.2, close ? 0.15 : mid ? 0.05 : 0.35);
    window.__oldman.face(W.x, W.z);
    fp.k = 1; fp.target = 1; fp.latched = true;
    fp.pitch = close ? 0.11 : mid ? -0.04 : 0.04;
    window.__oldman.hideHands = true;
    window.__oldman.beastPose = "stand";
    window.__oldman.beastEyes = 1;
    window.__oldman.clearFog = close ? 0.0035 : mid ? 0.012 : 0.002;
  } else if (kind === "elk") {
    window.__oldman.tp("meadow", 18);
    fp.k = 1; fp.target = 1; fp.latched = true; fp.pitch = -0.02;
    window.__oldman.hideHands = true;
    window.__oldman.herdHold = [
      { ahead: 7.2, side: -1.6 },
      { ahead: 8.6, side: 1.8 },
      { ahead: 6.4, side: 0.35 },
    ];
  } else if (kind === "sign") {
    window.__oldman.tp("spur", 4);
    fp.k = 1; fp.target = 1; fp.latched = true;
    fp.pitch = -0.62;
    window.__oldman.hideHands = true;
  }
  window.__oldman.pump(0.4, true);
  if (kind === "sign") {
    E.walkerTracks.clear();
    for (let i = 0; i < 8; i++) {
      const x = P.x - Math.sin(P.yaw) * (1.5 + i * 0.7) + Math.cos(P.yaw) * 0.15;
      const z = P.z - Math.cos(P.yaw) * (1.5 + i * 0.7) - Math.sin(P.yaw) * 0.15;
      E.walkerTracks.add(x, z, P.yaw + 0.15, 2.1);
    }
  }
  if (kind === "elk") {
    S.line = elkLine;
    voicedLine = elkLine;
    lastShownLine = elkLine;
    hud.setLine(elkLine, performance.now(), 60000);
    hud.thought("Heads up. All of them.", performance.now(), 60000);
  } else if (kind === "sign") {
    S.line = signLine;
    voicedLine = signLine;
    lastShownLine = signLine;
    hud.setLine(signLine, performance.now(), 60000);
    hud.thought("Ain't elk.", performance.now(), 60000);
  } else {
    S.line = "";
    voicedLine = "";
    lastShownLine = "";
    hud.setLine("", performance.now());
    document.getElementById("thought")?.classList.remove("show");
  }
  window.__oldman.pump(0.05, true);
}
const shotKind = new URLSearchParams(location.search).get("shot");
if (shotKind) setTimeout(() => setupShot(shotKind), 900);
if (new URLSearchParams(location.search).get("spot") === "1") {
  setTimeout(() => {
    window.__oldman.start();
    window.__oldman.setTime(1, 19 * 60 + 20);
    window.__oldman.tp("timber", 5);
    window.__oldman.armSpot(1.3);
  }, 500);
}
