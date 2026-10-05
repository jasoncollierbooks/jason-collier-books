import * as THREE from "three";
import { createAudio } from "./audio.js?v=6";
import { createInput } from "./input.js?v=6";
import { createSim } from "./sim.js?v=12";
import { damp, clamp, springAngle, angDelta } from "./util.js";
import { createNarration } from "./narration.js?v=3";
import { createDialogue } from "./dialogue.js?v=8";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, GTAOPass, ShaderPass, FXAAPass } from "three/addons";
import { buildWorld } from "./world.js?v=9";
import { buildRustyWorld } from "../worlds/rusty/world.js?v=13";
import { createRustySim } from "../worlds/rusty/sim.js?v=19";
import { buildPulseWorld } from "../worlds/pulse/world.js?v=6";
import { createPulseSim } from "../worlds/pulse/sim.js?v=12";
import { buildOldmanWorld } from "../worlds/oldman/world.js?v=2";
import { createOldmanSim } from "../worlds/oldman/sim.js?v=4";
import { buildThorneWorld } from "../worlds/thorne/world.js?v=2";
import { createThorneSim } from "../worlds/thorne/sim.js?v=2";
import { createAbilities } from "./abilities.js?v=4";
import { whenCastReady } from "./actors.js?v=12";
import { tick as tickVfx, bind, spawn as spawnVfx, active as vfxActive } from "./vfx.js?v=1";
import { theBlank } from "../bosses/index.js?v=14";

const canvas = document.getElementById("view");
const app = document.getElementById("app");
const low = Math.min(window.innerWidth, window.innerHeight) < 520;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = low ? 1.08 : 1.16;
renderer.shadowMap.enabled = true;
// r186 folds the old PCFSoft kernel into PCFShadowMap; light.shadow.radius softens it.
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.15 : 1.5));

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(52, 1, 0.12, 400);
scene.add(camera);
const audio = createAudio();
const trailScene = scene;
const trailCamera = camera;
const trailWorld = buildWorld(scene, low);
const trailSim = createSim(scene, trailWorld, audio);
let world = trailWorld;
let sim = trailSim;
let worldKey = "trail";
let stackScene = null;
let stackCamera = null;
let stackWorld = null;
let stackSim = null;
let pulseScene = null;
let pulseCamera = null;
let pulseWorld = null;
let pulseSim = null;
let oldmanScene = null;
let oldmanCamera = null;
let oldmanWorld = null;
let oldmanSim = null;
let thorneScene = null;
let thorneCamera = null;
let thorneWorld = null;
let thorneSim = null;
const input = createInput(app);
try {
  const grant = new URLSearchParams(location.search).get("grant");
  if (grant === "firelight") localStorage.setItem("book-worlds-world4-clear", "1");
  if (grant === "argon") localStorage.setItem("book-worlds-world5-clear", "1");
} catch { /* private mode */ }
const abilities = createAbilities();
const narrate = createNarration(audio);
const dialogue = createDialogue(audio);
const SETTINGS_KEY = "bw-settings";
const CAM_PRESET = {
  slow: { max: 90 * Math.PI / 180, omega: 1.2, drag: 0.7 },
  normal: { max: 105 * Math.PI / 180, omega: 1.8, drag: 1 },
  fast: { max: 120 * Math.PI / 180, omega: 2.4, drag: 1.22 },
};
function defaultCam() {
  const coarse = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  return coarse || small ? "slow" : "normal";
}
const settings = { cam: defaultCam(), subs: false, sound: true };
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  if (saved && CAM_PRESET[saved.cam]) settings.cam = saved.cam;
  if (saved && typeof saved.subs === "boolean") settings.subs = saved.subs;
  if (saved && typeof saved.sound === "boolean") settings.sound = saved.sound;
} catch { /* private mode */ }
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ cam: settings.cam, subs: settings.subs, sound: settings.sound })); } catch { /* ignore */ }
}
document.body.classList.toggle("subs", settings.subs);
audio.sound(settings.sound);
const unlockAudio = () => audio.unlock();
window.addEventListener("pointerdown", unlockAudio, true);
window.addEventListener("touchstart", unlockAudio, { capture: true, passive: true });
window.addEventListener("touchend", unlockAudio, { capture: true, passive: true });

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uWarm: { value: 0.42 },
    uBias: { value: new THREE.Vector3(0.025, 0.006, -0.018) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uWarm;
    uniform vec3 uBias;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.30, 0.52, 0.18));
      c = (c - 0.5) * 1.08 + 0.5;
      c = mix(c, c * vec3(1.12, 0.94, 0.78), smoothstep(0.55, 0.05, l) * uWarm);
      c += uBias;
      c = mix(c, vec3(l), -0.06);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

function applyGrade(key) {
  const warm = GRADE.uniforms.uWarm;
  const bias = GRADE.uniforms.uBias.value;
  if (key === "thorne") {
    warm.value = 0.06;
    bias.set(-0.03, 0.018, 0.012);
  } else if (key === "oldman") {
    warm.value = 0;
    bias.set(-0.04, 0.006, 0.055);
  } else if (key === "pulse") {
    warm.value = 0.08;
    bias.set(0.0, 0.004, 0.02);
  } else if (key === "stack") {
    warm.value = 0.22;
    bias.set(0.016, 0.006, -0.006);
  } else {
    warm.value = 0.42;
    bias.set(0.025, 0.006, -0.018);
  }
  document.body.dataset.world = key || "trail";
}

installEnvironment(renderer, scene, low);
let composer = makeComposer(renderer, scene, camera, low);
let castReady = false;
whenCastReady().then(() => { castReady = true; });

const flashLight = new THREE.PointLight(0xffe6b8, 0, 16, 1.5);
scene.add(flashLight);
const shock = new THREE.Mesh(
  new THREE.RingGeometry(0.4, 0.55, 28),
  new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0, side: THREE.DoubleSide }),
);
shock.rotation.x = -Math.PI / 2;
scene.add(shock);
const lassoGeo = new THREE.BufferGeometry();
const lassoPos = new Float32Array(6);
lassoGeo.setAttribute("position", new THREE.BufferAttribute(lassoPos, 3));
const lassoLine = new THREE.Line(
  lassoGeo,
  new THREE.LineBasicMaterial({ color: 0xe4c56a, transparent: true, opacity: 0 }),
);
scene.add(lassoLine);
const fxFocus = new THREE.Vector3();
let flashPeak = 1;
const flashFx = bind({
  tag: "flash",
  life: 455,
  onTick(k) {
    flashLight.intensity = k * flashPeak * 16;
    flashLight.position.set(fxFocus.x, fxFocus.y + 1.35, fxFocus.z);
  },
  onStop() { flashLight.intensity = 0; },
});
const shockFx = bind({
  tag: "shock",
  mesh: shock,
  life: 450,
  onTick(k) {
    shock.position.copy(fxFocus);
    shock.scale.setScalar(1 + (1 - k) * 6);
    shock.material.opacity = k * 0.54;
  },
  onStop() {
    shock.material.opacity = 0;
    shock.visible = false;
  },
});
function burstEmbers(x, y, z) {
  const n = low ? 8 : 14;
  for (let i = 0; i < n; i++) {
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 5, 4),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe2a0 : 0xff6a22, transparent: true }),
    );
    scene.add(ember);
    const ang = (i / n) * Math.PI * 2 + i * 0.2;
    const sp = 0.7 + (i % 4) * 0.4;
    spawnVfx({
      tag: "ember",
      mesh: ember,
      disposable: true,
      life: 1100,
      onTick(k) {
        const u = 1 - k;
        ember.position.set(x + Math.cos(ang) * sp * u, y + 0.4 + u * 1.45, z + Math.sin(ang) * sp * u);
        ember.material.opacity = k;
        ember.scale.setScalar(0.35 + k * 0.7);
      },
    });
  }
}

const lassoFx = bind({
  tag: "lasso",
  mesh: lassoLine,
  life: 420,
  onTick(k) { lassoLine.material.opacity = k * 1.008; },
  onStop() {
    lassoLine.material.opacity = 0;
    lassoLine.visible = false;
  },
});

const params = new URLSearchParams(location.search);
const start = params.get("start");
const direct = ["ford", "play", "gate", "almost", "rope", "bank"].includes(start);
let mode = direct ? "play" : "hub";
let playing = mode === "play";
let station = 0;
const restored = { trail: false, stack: false, pulse: false, oldman: false, thorne: false };
try {
  restored.trail = localStorage.getItem("book-worlds-world1-clear") === "1";
  restored.stack = localStorage.getItem("book-worlds-world2-clear") === "1";
  restored.pulse = localStorage.getItem("book-worlds-world3-clear") === "1";
  restored.oldman = localStorage.getItem("book-worlds-world4-clear") === "1";
  restored.thorne = localStorage.getItem("book-worlds-world5-clear") === "1";
} catch { /* private mode */ }
let transitioning = false;
let pullTimer = 0;
let blankTimer = 0;
let blankVoiceTimer = 0;
let ready = false;
let camYaw = 0.25;
let camPitch = 0.38;
let camYawVel = 0;
let camManual = 0;
let camFace = 0.25;
let camFaceWait = 0;
let camRecenter = 0;
const camPos = new THREE.Vector3(0, 3, -10);
const lookAt = new THREE.Vector3();
let shotLight = null;
let shake = 0;
let hurtFx = null;
const v = new THREE.Vector3();

const el = {
  card: document.getElementById("card"),
  script: document.getElementById("card-script"),
  kicker: document.getElementById("card-kicker"),
  title: document.getElementById("card-title"),
  body: document.getElementById("card-body"),
  btn: document.getElementById("card-btn"),
  hint: document.getElementById("card-hint"),
  boot: document.getElementById("boot"),
  hp: document.getElementById("hp-fill"),
  hpNum: document.getElementById("hp-num"),
  lantern: document.getElementById("lantern-fill"),
  coins: document.getElementById("coins"),
  potions: document.getElementById("potions"),
  pages: document.getElementById("pages"),
  obj: document.getElementById("obj"),
  bossbar: document.getElementById("bossbar"),
  bossFill: document.getElementById("boss-fill"),
  pips: document.getElementById("pips"),
  prompt: document.getElementById("prompt"),
  tutor: document.getElementById("tutor"),
  tutorText: document.getElementById("tutor-text"),
  tutorHint: document.getElementById("tutor-hint"),
  tutorAct: document.getElementById("tutor-act"),
  tutorSkip: document.getElementById("tutor-skip"),
  reticle: document.getElementById("reticle"),
  tag: document.getElementById("tag"),
  subtitle: document.getElementById("subtitle"),
  floaters: document.getElementById("floats"),
  flash: document.getElementById("flash"),
  hurt: document.getElementById("hurt"),
  hud: document.getElementById("hud"),
  hub: document.getElementById("hub"),
  screen: document.getElementById("screen"),
  roll: document.getElementById("roll"),
  freq: document.getElementById("st-freq"),
  stScript: document.getElementById("st-script"),
  stTitle: document.getElementById("st-title"),
  stSub: document.getElementById("st-sub"),
  stBadge: document.getElementById("st-badge"),
  stSoon: document.getElementById("st-soon"),
  stNum: document.getElementById("st-num"),
  tune: document.getElementById("tune-in"),
  knob: document.getElementById("dial-knob"),
  blankShade: document.getElementById("blank-shade"),
  blankFace: document.getElementById("blank-face"),
  blankVoice: document.getElementById("blank-voice"),
};

hurtFx = bind({
  tag: "hurt",
  life: 360,
  onTick() { el.hurt.classList.add("on"); },
  onStop() { el.hurt.classList.remove("on"); },
});
const screenFlash = bind({
  tag: "screen-flash",
  life: 160,
  onTick() { el.flash.classList.add("on"); },
  onStop() { el.flash.classList.remove("on"); },
});

const STATIONS = [
  { id: "trail", freq: "54.7", script: "On the air", title: "The California Trail", sub: "Jang & Tom · Wagon Masters", live: true },
  { id: "stack", freq: "67.2", script: "On the air", title: "The Rusty Stack", sub: "Spacey & Mira · Sky Freight", live: true, note: "Recommended after the Trail" },
  { id: "pulse", freq: "103.0", script: "On the air", title: "The First Pulse", sub: "The Entity · Quantum Realm", live: true, note: "Recommended after the Stack" },
  { id: "oldman", freq: "81.4", script: "On the air", title: "Old Man on the Mountain", sub: "Harlan Wade · High Country", live: true, note: "Recommended after the Pulse" },
  { id: "thorne", freq: "51.4", script: "On the air", title: "Thorne's Lab", sub: "Dr. Elias Thorne · Princeton, 1982", live: true, note: "Recommended after the mountain" },
];

const CARDS = {
  title: {
    script: "Please stand by",
    kicker: "Book Worlds  ·  Station 1",
    title: "The California Trail",
    body: "Nonimaginaires — brain fogs born where imagination dies — are leaking through the broadcast and eating this story. Five pages are going gray. The scenes are scrambled. The Keeper has to gather those pages, put the river and the bandits back the way the story remembers, and restore the imagination on this channel. The bear from the hunt has fused with the fog and waits at the ford. This channel is the wagon road. Jang and Tom, two Philadelphia debtors posing as guides, are pretending they meant to be here. The weapon in the Keeper's hand is a brass skeleton key worn like a saber — the Trail Key.",
    btn: "Step through",
    hint: true,
  },
  outro: {
    script: "End of the trail",
    kicker: "World I",
    title: "The river remembers",
    body: "The Blank Bear comes apart, fog first and then the shape of a hunt the book still remembers. The sepia crawls back into the ford. Jang counts the oxen twice and gets a different number both times. Tom scratches the back of his neck and admits, quietly, that the picture has its color again. The screen home stays shut until every torn page is back in the book.",
    btn: "On to the Stack",
    hint: false,
  },
  dead: {
    script: "Dust settles",
    kicker: "The trail keeps your boots",
    title: "Not yet",
    body: "The Keeper hits the dirt. Jang is already composing the handbill. Tom offers a hand the size of a skillet.",
    btn: "Retry",
    hint: false,
  },
};

const STACK_CARDS = {
  title: {
    script: "Please stand by",
    kicker: "Book Worlds  ·  Station 2",
    title: "The Rusty Stack",
    body: "Nonimaginaires — brain fogs born where imagination dies — are leaking through the broadcast and eating this story. Five pages are going gray above the clouds. The Keeper has to gather those pages, put the deck, the city, and the goats back the way the book remembers, and restore the imagination on this channel. Baron von Smash has fused with the fog and waits in the hangar. This channel is a rusty freight airship. Spacey and Mira are pretending the smoke means everything is fine. The weapon in the Keeper's hand is the same brass skeleton key — the Trail Key. Recommended after the Trail.",
    btn: "Step onto the deck",
    hint: true,
  },
  outro: {
    script: "End of the bulletin",
    kicker: "World II",
    title: "The stack keeps its color",
    body: "The Blank Baron comes apart, fog first and then the shape of an axe the book still remembers. Sunset crawls back into the rivets. Spacey does not light the cigar. Mira checks a gauge that was gray a minute ago and nods once. The screen home stays shut until every torn page is back in the book.",
    btn: "On to the Pulse",
    hint: false,
  },
  dead: {
    script: "Steam settles",
    kicker: "The deck keeps your boots",
    title: "Not yet",
    body: "The Keeper hits the iron. Spacey is already rewriting the story so this was the plan. Mira offers the long end of the wrench.",
    btn: "Retry",
    hint: false,
  },
};

const STACK_PAGES = {
  "half-left": {
    script: "A torn page",
    title: "Still got half left",
    body: "A torn page. The freight hauler looked half dead. Her captain said the funny thing about half dead is you still got half left.",
  },
  "crate-hums": {
    script: "A torn page",
    title: "The crate that hums",
    body: "A torn page. One crate in the hold, stenciled like instruments, humming like a cat or a bomb. On this ship, humming means alive.",
  },
  "forgot-float": {
    script: "A torn page",
    title: "A city that forgot how to float",
    body: "A torn page. A garden city forgot how to float. Its lift crystals cracked, and every small ship in the sky took a rope and pulled.",
  },
  "balloon-goats": {
    script: "A torn page",
    title: "Goats with balloons",
    body: "A torn page. Cloud-farm goats on patched balloons, and a war that never ended because nobody could agree which sky was theirs.",
  },
  "duke-day": {
    script: "A torn page",
    title: "The Duke's bad day",
    body: "A torn page. A short round warlord met a void slime. The slime ate the crown, then the cape clasps, and left the warlord in his long johns.",
  },
};

const PULSE_CARDS = {
  title: {
    script: "Please stand by",
    kicker: "Book Worlds  ·  Station 3",
    title: "The First Pulse",
    body: "Nonimaginaires — brain fogs born where imagination dies — are leaking through the broadcast and eating this story. Five pages are going gray in the quantum foam. The Keeper has to gather those pages, walk the first light, the ripples, and the wave, and restore the imagination on this channel. The Hum has fused with the fog and waits ahead. This channel is a quantum realm of particle fields and crystalline islands. The Entity keeps the light. A native of the foam keeps the path. The weapon in the Keeper's hand is the same brass skeleton key — the Trail Key.",
    btn: "Step into the foam",
    hint: true,
  },
  outro: {
    script: "End of the bulletin",
    kicker: "World III",
    title: "The signal remembers",
    body: "The Blank Hum comes apart, fog first and then the vibration the book still remembers. Color crawls back into the foam. The Entity takes the quiet. A native watches a neighbor turn from gray to gold and nods once. The screen home stays shut until every torn page is back in the book.",
    btn: "On to the mountain",
    hint: false,
  },
  dead: {
    script: "The carrier drops",
    kicker: "The foam keeps your boots",
    title: "Not yet",
    body: "The Keeper hits the light underfoot. The Entity holds a probability open. A native offers a hand that is still the right color.",
    btn: "Retry",
    hint: false,
  },
};

const PULSE_PAGES = {
  "only-hum": {
    script: "A torn page",
    title: "Only the hum",
    body: "A torn page. In the beginning there was no light, no matter, no void. Only the hum.",
  },
  "it-answered": {
    script: "A torn page",
    title: "It answered",
    body: "A torn page. The hum was already listening. Then, one day, or one epoch, it answered.",
  },
  "the-dish": {
    script: "A torn page",
    title: "The foam",
    body: "A torn page. The entity drifted through the quantum foam, tasting probabilities. It learned it could become a wave.",
  },
  "no-medium": {
    script: "A torn page",
    title: "No medium",
    body: "A torn page. A wave needs no medium. It moves at the speed of light, indifferent to distance, indifferent to time.",
  },
  invitations: {
    script: "A torn page",
    title: "Invitations",
    body: "A torn page. Humanity's breakthroughs are not accidents. They are invitations.",
  },
};

const OLDMAN_CARDS = {
  title: {
    script: "Please stand by",
    kicker: "Book Worlds  ·  Station 4",
    title: "Old Man on the Mountain",
    body: "Nonimaginaires — brain fogs born where imagination dies — are leaking through the broadcast and eating this story. Five pages are going gray in the high country. The Keeper has to gather those pages, walk the timber, the benches, and the elk park, and restore the imagination on this channel. The Old Man has been taken by the fog and waits on the ridge. This channel is a snowy hunt at dusk. Harlan Wade keeps the fire. The weapon in the Keeper's hand is the same brass skeleton key — the Trail Key.",
    btn: "Step into the snow",
    hint: true,
  },
  outro: {
    script: "End of the bulletin",
    kicker: "World IV",
    title: "The ridges answer",
    body: "The fog lifts off the Old Man. The green goes out of his eyes. Amber sap dries where the key found bark. A chorus of bellows rolls down from every ridge, and then the mountain keeps its secrets. Harlan Wade walks back to the truck. The screen home stays shut until every torn page is back in the book.",
    btn: "Back to the cabinet",
    hint: false,
  },
  dead: {
    script: "The cold settles",
    kicker: "The mountain keeps your boots",
    title: "Not yet",
    body: "The Keeper hits the snow. Harlan keeps the fire up and offers a gloved hand.",
    btn: "Retry",
    hint: false,
  },
};

const OLDMAN_PAGES = {
  "seven-days": {
    script: "A torn page",
    title: "Seven days of food",
    body: "A torn page. Harlan Wade went up alone for elk, with seven days of food.",
  },
  "wall-tent": {
    script: "A torn page",
    title: "The wall tent",
    body: "A torn page. A small wall tent. He built the fire high when the cold went below zero.",
  },
  "steep-timber": {
    script: "A torn page",
    title: "Steep timber",
    body: "A torn page. Steep timber, then benches, then parks where the elk should have been.",
  },
  "bark-skin": {
    script: "A torn page",
    title: "Bark for skin",
    body: "A torn page. It had bark for skin, and eyes that shone green. Where it bled, the blood was amber, like sap.",
  },
  "the-ridges": {
    script: "A torn page",
    title: "Every ridge",
    body: "A torn page. A chorus of bellows rolled down from every ridge. The mountain kept its secrets.",
  },
};

const THORNE_CARDS = {
  title: {
    script: "Please stand by",
    kicker: "Book Worlds  ·  Station 5",
    title: "Thorne's Lab",
    body: "Nonimaginaires — brain fogs born where imagination dies — are in a 1982 laboratory in Princeton. You are Sphere Nineteen, the subject Dr. Elias Thorne was growing. Five pages are gray on the bench. Free the other subjects. A photon shell waits under the bell jar. The weapon is still the Trail Key.",
    btn: "Step onto the bench",
    hint: true,
  },
  outro: {
    script: "End of the bulletin",
    kicker: "World V",
    title: "Born twice",
    body: "The fog lifts off the photon shell. The light settles and stays. It is born twice. Sphere Nineteen is still growing. The screen home stays shut until every torn page is back in the book.",
    btn: "Back to the cabinet",
    hint: false,
  },
  dead: {
    script: "The lamp stays on",
    kicker: "The bench keeps you",
    title: "Not yet",
    body: "Sphere Nineteen hits the wood. Dr. Thorne keeps the lamp on and waits.",
    btn: "Retry",
    hint: false,
  },
};

const THORNE_PAGES = {
  "born-twice": {
    script: "A torn page",
    title: "Born twice",
    body: "A torn page. The shell must be born twice. Once in vacuum. Once in biology.",
  },
  "sphere-nineteen": {
    script: "A torn page",
    title: "Sphere Nineteen",
    body: "A torn page. Sphere Nineteen answered. The vacuum spoke.",
  },
  trehalose: {
    script: "A torn page",
    title: "Trehalose",
    body: "A torn page. The trehalose film held. The sugar film shattered.",
  },
  "argon-laser": {
    script: "A torn page",
    title: "The argon laser",
    body: "A torn page. The borrowed argon laser. He fixed it himself.",
  },
  "second-birth": {
    script: "A torn page",
    title: "The second birth",
    body: "A torn page. First the physics. Then the living thing. Two births.",
  },
};

const PAGES = {
  handbills: {
    script: "A torn page",
    title: "Flashy handbills",
    body: "A torn page. Two debtors printed flashy handbills and hired themselves out as guides who had never guided a wagon.",
  },
  dentistry: {
    script: "A torn page",
    title: "Negotiated by dentistry",
    body: "A torn page. Pawnee warriors had the train surrounded. Jang bought the peace with dentistry.",
  },
  bear: {
    script: "A torn page",
    title: "The hunt turns around",
    body: "A torn page. The bear hunt turned inside out. The hunters became the hunted.",
  },
  pendulum: {
    script: "A torn page",
    title: "A human pendulum",
    body: "A torn page. Bandits held the narrows until Tom, the clumsiest human pendulum in the West, cleared them on the backswing.",
  },
  circus: {
    script: "A torn page",
    title: "The floating circus",
    body: "A torn page. The river would not ford, so the crossing became a floating circus of wagons.",
  },
};

function cardsFor() {
  if (worldKey === "stack") return STACK_CARDS;
  if (worldKey === "pulse") return PULSE_CARDS;
  if (worldKey === "oldman") return OLDMAN_CARDS;
  if (worldKey === "thorne") return THORNE_CARDS;
  return CARDS;
}

function pagesFor() {
  if (worldKey === "stack") return STACK_PAGES;
  if (worldKey === "pulse") return PULSE_PAGES;
  if (worldKey === "oldman") return OLDMAN_PAGES;
  if (worldKey === "thorne") return THORNE_PAGES;
  return PAGES;
}

function showCard(id) {
  const c = cardsFor()[id];
  mode = id;
  el.script.textContent = c.script;
  el.kicker.textContent = c.kicker;
  el.title.textContent = c.title;
  el.body.textContent = c.body;
  const result = document.getElementById("card-result");
  if (result) {
    if (id === "outro" && sim.recap) {
      const recap = sim.recap();
      const secs = Math.max(0, Math.round(recap.time || 0));
      const mins = Math.floor(secs / 60);
      const rem = String(secs % 60).padStart(2, "0");
      result.hidden = false;
      result.textContent = `Freed ${recap.freed || 0}. Time ${mins}:${rem}.`;
    } else {
      result.hidden = true;
      result.textContent = "";
    }
  }
  el.btn.textContent = c.btn;
  el.hint.hidden = !c.hint;
  el.body.hidden = false;
  el.card.classList.remove("is-spoken");
  el.card.hidden = false;
  el.card.dataset.card = id;
  playing = false;
  input.enabled = false;
  document.body.classList.remove("playing");
  if (id === "title") narrate.say("intro");
}
function showPage(id, n) {
  const c = pagesFor()[id];
  mode = "page";
  el.script.textContent = c.script;
  el.kicker.textContent = `Story page  ·  ${n} of 5`;
  el.title.textContent = c.title;
  el.body.textContent = "";
  el.body.hidden = true;
  el.btn.textContent = "Tuck it back";
  el.hint.hidden = true;
  el.card.classList.add("is-spoken");
  el.card.hidden = false;
  el.card.dataset.card = "page";
  playing = false;
  input.enabled = false;
  document.body.classList.remove("playing");
  narrate.say("page-" + id);
}

let flyby = null;

function helpOpen() {
  const panel = document.getElementById("help");
  return !!(panel && !panel.hidden);
}

function beginFlyby() {
  if (worldKey !== "stack" && worldKey !== "thorne") return;
  if (params.get("shot")) return;
  flyby = { t: 0, dur: 7.4, arm: 0 };
  input.enabled = false;
}

function endFlyby() {
  if (!flyby) return;
  flyby = null;
  if (mode === "play") input.enabled = true;
}

function thorneFly(k) {
  const smooth = (x) => x * x * (3 - 2 * x);
  const u = smooth(Math.max(0, Math.min(1, k)));
  const pts = [
    { x: -11, y: 8.2, z: -2, lx: 1.2, ly: 1.6, lz: 22 },
    { x: 5.5, y: 4.6, z: 16, lx: 0, ly: 1.4, lz: 34 },
    { x: -3.2, y: 3.4, z: 46, lx: 1, ly: 2.2, lz: 64 },
    { x: -2.2, y: 2.2, z: -1.5, lx: 0.2, ly: 0.8, lz: 8 },
  ];
  const span = pts.length - 1;
  const x = u * span;
  const i = Math.min(span - 1, Math.floor(x));
  const f = smooth(x - i);
  const a = pts[i];
  const b = pts[i + 1];
  const mix = (p, q) => p + (q - p) * f;
  return {
    x: mix(a.x, b.x), y: mix(a.y, b.y), z: mix(a.z, b.z),
    lx: mix(a.lx, b.lx), ly: mix(a.ly, b.ly), lz: mix(a.lz, b.lz),
  };
}

function flyPose(k) {
  if (worldKey === "thorne") return thorneFly(k);
  const smooth = (x) => x * x * (3 - 2 * x);
  const u = smooth(Math.max(0, Math.min(1, k)));
  const pts = [
    { x: -16, y: -0.7, z: 20, lx: 0.4, ly: -1.6, lz: 6 },
    { x: -13.5, y: -1.7, z: 3, lx: 0.2, ly: -1.5, lz: 5 },
    { x: -11, y: -0.9, z: -14, lx: 0, ly: -1.15, lz: 1 },
    { x: -2.2, y: 2.35, z: -12.2, lx: 0.1, ly: 1.35, lz: -6 },
  ];
  const span = pts.length - 1;
  const x = u * span;
  const i = Math.min(span - 1, Math.floor(x));
  const f = smooth(x - i);
  const a = pts[i];
  const b = pts[i + 1];
  const mix = (p, q) => p + (q - p) * f;
  return {
    x: mix(a.x, b.x), y: mix(a.y, b.y), z: mix(a.z, b.z),
    lx: mix(a.lx, b.lx), ly: mix(a.ly, b.ly), lz: mix(a.lz, b.lz),
  };
}

function hideCard() {
  el.card.hidden = true;
  el.hub.hidden = true;
  playing = true;
  input.enabled = true;
  mode = "play";
  document.body.classList.add("playing");
  maybeShowHelp();
}

function paintStation() {
  const st = STATIONS[station];
  const closed = !!restored[st.id];
  el.screen.classList.remove("is-tuning");
  el.screen.dataset.station = st.id;
  el.screen.classList.toggle("is-static", !st.live);
  el.freq.textContent = st.freq;
  el.stScript.textContent = st.live && closed ? "Story restored" : st.script;
  el.stTitle.textContent = st.title;
  el.stSub.textContent = st.sub;
  el.stNum.textContent = `Station ${station + 1}`;
  el.stSoon.hidden = st.live;
  el.stBadge.textContent = "Story restored";
  el.stBadge.hidden = !(st.live && closed);
  el.tune.disabled = !st.live;
  el.tune.textContent = !st.live ? "Coming soon" : closed ? "Tune in again" : "Tune in";
  const note = document.getElementById("st-note");
  if (note) {
    note.hidden = !st.note;
    note.textContent = st.note || "";
  }
  el.knob.style.transform = `rotate(${station * 78 - 36}deg)`;
  for (const pic of el.screen.querySelectorAll(".bw-pic")) pic.hidden = pic.dataset.pic !== st.id;
  el.hub.dataset.station = st.id;
  el.hub.dataset.closed = closed ? "1" : "0";
}

function showHub() {
  mode = "hub";
  playing = false;
  input.enabled = false;
  el.card.hidden = true;
  el.hub.hidden = false;
  el.hub.classList.remove("pull", "return", "settle");
  document.body.classList.remove("playing");
  paintStation();
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setStation(index, fromUser) {
  if (transitioning || mode !== "hub") return;
  station = (index + STATIONS.length) % STATIONS.length;
  paintStation();
  if (!fromUser) return;
  audio.unlock();
  audio.dial();
  audio.staticBurst();
  el.screen.classList.add("is-tuning");
  clearTimeout(pullTimer);
  pullTimer = window.setTimeout(() => el.screen.classList.remove("is-tuning"), reducedMotion() ? 0 : 460);
}

function hideBlankShade() {
  el.blankShade.classList.remove("is-on");
  el.blankShade.hidden = true;
}

function glimpseBlank() {
  el.blankShade.hidden = false;
  el.blankShade.classList.remove("is-on");
  void el.blankShade.offsetWidth;
  el.blankShade.classList.add("is-on");
}

function flickerBlank(exitKey) {
  const pack = exitKey === "stack" ? "stack" : exitKey === "pulse" ? "pulse" : exitKey === "oldman" ? "oldman" : exitKey === "thorne" ? "thorne" : "trail";
  el.blankVoice.textContent = exitKey === "stack"
    ? "The next sky is already forgetting its name."
    : exitKey === "pulse"
      ? "The next dark is already forgetting the name of its star."
      : exitKey === "oldman"
        ? "The next ridge is already forgetting its own weather."
        : exitKey === "thorne"
          ? "The next bench is already forgetting its own experiment."
          : theBlank.voice;
  el.blankFace.hidden = false;
  el.blankFace.classList.remove("is-on");
  void el.blankFace.offsetWidth;
  el.blankFace.classList.add("is-on");
  clearTimeout(blankTimer);
  clearTimeout(blankVoiceTimer);
  blankTimer = window.setTimeout(() => {
    el.blankFace.classList.remove("is-on");
    el.blankFace.hidden = true;
  }, 5400);
  blankVoiceTimer = window.setTimeout(() => {
    if (mode === "hub" && restored[exitKey] && !transitioning) narrate.sayFrom(pack, "blank-next");
  }, 4600);
}

function ensureStack() {
  if (stackScene) return;
  stackScene = new THREE.Scene();
  stackCamera = new THREE.PerspectiveCamera(52, 1, 0.12, 700);
  stackScene.add(stackCamera);
  installEnvironment(renderer, stackScene, low, "stack");
  stackWorld = buildRustyWorld(stackScene, low);
  stackSim = createRustySim(stackScene, stackWorld, audio);
}

function ensurePulse() {
  if (pulseScene) return;
  pulseScene = new THREE.Scene();
  pulseCamera = new THREE.PerspectiveCamera(52, 1, 0.12, 800);
  pulseScene.add(pulseCamera);
  installEnvironment(renderer, pulseScene, low, "pulse");
  pulseWorld = buildPulseWorld(pulseScene, low);
  pulseSim = createPulseSim(pulseScene, pulseWorld, audio);
}

function ensureOldman() {
  if (oldmanScene) return;
  oldmanScene = new THREE.Scene();
  oldmanCamera = new THREE.PerspectiveCamera(52, 1, 0.12, 700);
  oldmanScene.add(oldmanCamera);
  installEnvironment(renderer, oldmanScene, low, "oldman");
  oldmanWorld = buildOldmanWorld(oldmanScene, low);
  oldmanSim = createOldmanSim(oldmanScene, oldmanWorld, audio);
}

function retargetComposer(nextScene, nextCam) {
  if (composer) {
    try { composer.dispose(); } catch { /* an old pass can already be gone */ }
    composer = null;
  }
  composer = makeComposer(renderer, nextScene, nextCam, low);
}

function ensureThorne() {
  if (thorneScene) return;
  thorneScene = new THREE.Scene();
  thorneCamera = new THREE.PerspectiveCamera(52, 1, 0.12, 900);
  thorneScene.add(thorneCamera);
  installEnvironment(renderer, thorneScene, low, "thorne");
  thorneWorld = buildThorneWorld(thorneScene, low);
  thorneSim = createThorneSim(thorneScene, thorneWorld, audio);
}

function bindStation(key) {
  const kicker = document.getElementById("tutor-kicker");
  if (key === "stack") {
    dialogue.setWorld("rusty-stack");
    narrate.use("stack");
    audio.setBed("stack");
    if (kicker) kicker.textContent = "On the deck";
  } else if (key === "pulse") {
    dialogue.setWorld("first-pulse");
    narrate.use("pulse");
    audio.setBed("pulse");
    if (kicker) kicker.textContent = "In the foam";
  } else if (key === "oldman") {
    dialogue.setWorld("old-man");
    narrate.use("oldman");
    audio.setBed("oldman");
    if (kicker) kicker.textContent = "On the mountain";
  } else if (key === "thorne") {
    dialogue.setWorld("thorne-lab");
    narrate.use("thorne");
    audio.setBed("thorne");
    if (kicker) kicker.textContent = "On the bench";
  } else {
    dialogue.setWorld("california-trail");
    narrate.use("trail");
    audio.setBed("trail");
    if (kicker) kicker.textContent = "On the trail";
  }
}

function enterWorld(key) {
  dialogue.stop();
  narrate.stop();
  if (key === "stack") {
    ensureStack();
    scene = stackScene;
    camera = stackCamera;
    world = stackWorld;
    sim = stackSim;
    worldKey = "stack";
  } else if (key === "pulse") {
    ensurePulse();
    scene = pulseScene;
    camera = pulseCamera;
    world = pulseWorld;
    sim = pulseSim;
    worldKey = "pulse";
  } else if (key === "oldman") {
    ensureOldman();
    scene = oldmanScene;
    camera = oldmanCamera;
    world = oldmanWorld;
    sim = oldmanSim;
    worldKey = "oldman";
  } else if (key === "thorne") {
    ensureThorne();
    scene = thorneScene;
    camera = thorneCamera;
    world = thorneWorld;
    sim = thorneSim;
    worldKey = "thorne";
  } else {
    scene = trailScene;
    camera = trailCamera;
    world = trailWorld;
    sim = trailSim;
    worldKey = "trail";
  }
  applyGrade(worldKey);
  bindStation(worldKey);
  scene.add(camera);
  scene.add(flashLight);
  scene.add(shock);
  scene.add(lassoLine);
  retargetComposer(scene, camera);
  if (worldKey === "thorne" && composer && composer.bloom) {
    composer.bloom.strength = low ? 0.18 : 0.36;
    composer.bloom.threshold = 0.62;
    composer.bloom.radius = 0.55;
  }
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function finishThrough() {
  el.hub.classList.remove("pull");
  el.hub.hidden = true;
  el.roll.classList.remove("in", "out");
  el.roll.hidden = true;
  hideBlankShade();
  transitioning = false;
  const key = STATIONS[station].id;
  const liveKey = key === "stack" || key === "pulse" || key === "oldman" || key === "thorne" ? key : "trail";
  if (key !== worldKey) enterWorld(liveKey);
  else bindStation(liveKey);
  sim.resetTrail();
  camYaw = key === "trail" ? 0.55 : 0.2;
  camPitch = 0.4;
  showCard("title");
}

function pullThrough() {
  if (transitioning || mode !== "hub" || !STATIONS[station].live) return;
  transitioning = true;
  audio.unlock();
  audio.staticBurst();
  glimpseBlank();
  if (reducedMotion()) {
    clearTimeout(pullTimer);
    pullTimer = window.setTimeout(finishThrough, 720);
    return;
  }
  el.roll.hidden = false;
  el.roll.classList.remove("out");
  el.roll.classList.add("in");
  el.hub.classList.add("pull");
  clearTimeout(pullTimer);
  pullTimer = window.setTimeout(finishThrough, 980);
}

function finishBack() {
  el.hub.classList.remove("pull", "return", "settle");
  el.hub.hidden = false;
  el.roll.classList.remove("in", "out");
  el.roll.hidden = true;
  transitioning = false;
  showHub();
}

function pullBack() {
  if (transitioning) return;
  transitioning = true;
  const exitKey = worldKey;
  restored[exitKey] = true;
  const nextStation = { trail: 1, stack: 2, pulse: 3, oldman: 4 };
  if (nextStation[exitKey] != null) station = nextStation[exitKey];
  playing = false;
  input.enabled = false;
  mode = "hub";
  audio.staticBurst();
  el.card.hidden = true;
  document.body.classList.remove("playing");
  audio.setBed("trail");
  narrate.say("restored");
  flickerBlank(exitKey);
  if (reducedMotion()) {
    finishBack();
    return;
  }
  el.roll.hidden = false;
  el.roll.classList.remove("in", "hold");
  el.roll.classList.add("out");
  el.hub.hidden = false;
  el.hub.classList.remove("pull", "return");
  el.hub.classList.add("settle");
  paintStation();
  clearTimeout(pullTimer);
  pullTimer = window.setTimeout(finishBack, 980);
}

function tryTune() {
  if (transitioning || mode !== "hub") return;
  audio.unlock();
  if (!STATIONS[station].live) {
    audio.staticBurst();
    el.screen.classList.add("is-tuning");
    clearTimeout(pullTimer);
    pullTimer = window.setTimeout(() => el.screen.classList.remove("is-tuning"), 420);
    return;
  }
  pullThrough();
}

document.getElementById("dial-prev").addEventListener("click", () => setStation(station - 1, true));
document.getElementById("dial-next").addEventListener("click", () => setStation(station + 1, true));
el.knob.addEventListener("click", () => setStation(station + 1, true));
el.tune.addEventListener("click", () => tryTune());
window.addEventListener("pointerdown", () => {
  if (flyby && flyby.arm > 0.35 && !params.get("shot")) endFlyby();
}, true);

window.addEventListener("keydown", (e) => {
  if (flyby && flyby.arm > 0.35 && !params.get("shot")) {
    endFlyby();
    return;
  }
  if (e.key === "Escape" && mode === "play" && sim.teaching()) {
    e.preventDefault();
    sim.skipLesson();
    return;
  }
  if (mode !== "hub" || transitioning) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    setStation(station + 1, true);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    setStation(station - 1, true);
  } else if (e.key === "Enter" && !(e.target && e.target.closest && e.target.closest("button"))) {
    e.preventDefault();
    tryTune();
  }
});

el.btn.addEventListener("click", () => {
  audio.unlock();
  if (mode === "title") {
    camYaw = 0;
    camPitch = 0.42;
    sim.begin({ restore: !start });
    hideCard();
    beginFlyby();
    if (sim.teaching()) {
      camYaw = 0;
      camPitch = 0.36;
      narrate.say("tutor-arrive");
    } else narrate.say("enter");
  } else if (mode === "dead") {
    if (!sim.continueFromSave()) sim.revive();
    hideCard();
  } else if (mode === "outro" || mode === "page") {
    hideCard();
  }
});

if (params.get("shot")) document.body.classList.add("shot");

const worldParam = params.get("world");
const wantStack = worldParam === "stack" || worldParam === "rusty";
const wantPulse = worldParam === "pulse" || worldParam === "first-pulse";
const wantOldman = worldParam === "oldman" || worldParam === "old-man";
const wantThorne = worldParam === "thorne" || worldParam === "thorne-lab" || worldParam === "lab";
const stackStarts = ["play", "deck", "boss", "city", "goats", "brawl", "fort"];
const pulseStarts = ["play", "boss", "dish", "bridge", "light", "gate", "wave"];
const oldmanStarts = ["play", "boss", "camp", "timber", "park", "gate", "freed", "fire"];
const thorneStarts = ["play", "boss", "dishes", "enemies", "spill", "laser", "gate", "trays", "hero", "freed", "overview", "outro", "argon"];
if (wantStack) station = 1;
if (wantPulse) station = 2;
if (wantOldman) station = 3;
if (wantThorne) station = 4;
if (wantThorne && thorneStarts.includes(start)) {
  enterWorld("thorne");
  if (start === "boss") {
    sim.place(-3.2, 80, 0);
    sim.wakeBoss();
    if (sim.poseBoss) sim.poseBoss();
  } else if (start === "freed") {
    sim.place(-1.2, 82, 0.2);
    sim.defeatForExit();
  } else if (start === "enemies" || start === "dishes") {
    if (sim.showcase) sim.showcase();
  } else if (start === "spill") sim.place(0, 34, 0);
  else if (start === "laser" || start === "argon") {
    sim.place(0, 54, 0);
    if (sim.armArgonDemo) sim.armArgonDemo();
  } else if (start === "gate") sim.skipToGate();
  else if (start === "trays") sim.place(0, 68, 0);
  else if (start === "hero" || start === "overview") {
    sim.place(0.2, 16, Math.PI);
    if (sim.poseCrew) sim.poseCrew();
  } else if (start === "outro") {
    sim.defeatForExit();
  }
  hideCard();
  audio.unlock();
  if (start === "outro") showCard("outro");
} else if (wantThorne) {
  showHub();
} else if (wantOldman && oldmanStarts.includes(start)) {
  enterWorld("oldman");
  if (start === "boss") {
    sim.place(-1.7, 83.2, 0.35);
    sim.wakeBoss();
    if (sim.poseCrew) sim.poseCrew();
    if (sim.poseBoss) sim.poseBoss();
  } else if (start === "freed") {
    sim.place(-1.2, 83, 0.15);
    sim.defeatForExit();
    if (sim.poseCrew) sim.poseCrew();
  } else if (start === "camp") {
    sim.place(0.2, 45.2, 0.2);
    if (params.get("shot") === "harlan" && sim.poseCrew) sim.poseCrew();
  } else if (start === "timber") sim.place(0, 8, 0);
  else if (start === "park") sim.place(0, 48, 0);
  else if (start === "gate") sim.skipToGate();
  else if (start === "fire") {
    sim.place(0, 12, 0);
    if (sim.armFireDemo) sim.armFireDemo();
  }
  hideCard();
  audio.unlock();
} else if (wantOldman) {
  showHub();
} else if (wantPulse && pulseStarts.includes(start)) {
  enterWorld("pulse");
  if (start === "boss" || start === "wave") {
    sim.place(0, params.get("shot") === "boss" ? 76 : 74, 0);
    sim.wakeBoss();
    if (sim.poseBoss) sim.poseBoss();
  } else if (start === "dish") sim.place(0, 26, 0);
  else if (start === "bridge") sim.place(0, 50, 0);
  else if (start === "light") sim.place(0, 8, 0);
  else if (start === "gate") sim.skipToGate();
  if (params.get("shot") === "crew" && sim.poseCrew) sim.poseCrew();
  hideCard();
  audio.unlock();
} else if (wantPulse) {
  showHub();
} else if (wantStack && stackStarts.includes(start)) {
  enterWorld("stack");
  if (start === "boss") {
    if (params.get("shot") === "boss") {
      sim.place(-9, 44, 0);
      if (sim.poseBoss) sim.poseBoss();
    }
    else {
      sim.place(0, 58, Math.PI);
      sim.wakeBoss();
    }
  } else if (start === "city") sim.place(32, 2, 0);
  else if (start === "goats") sim.place(-34, 2, 0);
  else if (start === "brawl") sim.place(0, 18, 0);
  else if (start === "fort") sim.place(0, 48, 0);
  if (params.get("shot") === "crew" && sim.poseCrew) sim.poseCrew();
  if ((params.get("shot") === "deck" || params.get("shot") === "flyby" || params.get("shot") === "swing") && sim.tuckExtras) {
    sim.tuckExtras();
  }
  if (params.get("shot") === "swing" && sim.holdSwing) sim.holdSwing(1);
  hideCard();
  audio.unlock();
} else if (wantStack) {
  showHub();
} else if (start === "ford") {
  camYaw = 0;
  camPitch = 0.36;
  sim.place(0, 104, 0);
  sim.wakeBoss();
  hideCard();
  audio.unlock();
} else if (start === "gate") {
  camYaw = 0;
  camPitch = 0.36;
  sim.skipToGate(true);
  hideCard();
  audio.unlock();
} else if (start === "almost") {
  camYaw = 0;
  camPitch = 0.36;
  sim.skipToGate(false);
  hideCard();
  audio.unlock();
} else if (start === "rope") {
  camYaw = 0;
  camPitch = 0.36;
  sim.place(0, 80, 0);
  hideCard();
  audio.unlock();
} else if (start === "bank") {
  camYaw = 0;
  camPitch = 0.42;
  sim.place(0, 96, 0);
  hideCard();
  audio.unlock();
} else if (start === "play") {
  hideCard();
  audio.unlock();
} else {
  showHub();
}
if (!document.body.dataset.world) applyGrade(worldKey);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  const coarse = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("touch", coarse || w < 820 || h < 500);
  document.body.classList.toggle("portrait", h > w);
}
window.addEventListener("resize", resize);
resize();

function project(x, y, z) {
  v.set(x, y, z);
  v.project(camera);
  if (v.z > 1) return null;
  const r = canvas.getBoundingClientRect();
  return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
}

function addFloat(x, y, z, text, coin) {
  const node = document.createElement("span");
  node.className = coin ? "floater coin" : "floater";
  node.textContent = coin ? `+${text}` : String(text);
  el.floaters.appendChild(node);
  const home = { x, y, z };
  bind({
    tag: coin ? "coin" : "dmg",
    life: 900,
    onTick(k) {
      const pt = project(home.x, home.y + (1 - k) * 0.72, home.z);
      if (!pt) {
        node.style.opacity = "0";
        return;
      }
      node.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
      node.style.opacity = String(Math.max(0, k));
    },
    onStop() { node.remove(); },
  }).restart(900);
}

let last = performance.now();
function frame(now) {
  const raw = Math.min(0.3, Math.max(0.001, (now - last) / 1000));
  last = now;
  abilities.tick(raw);
  // Expire trails, rings, ropes, and flashes before the sim. A hidden tab,
  // hit-stop, or caption cannot keep last frame's effect on the body.
  tickVfx(performance.now());
  if (mode === "title") {
    camYaw = 0.62 + Math.sin(now / 1000 * 0.18) * 0.08;
    camPitch = 0.4;
  } else {
    const look = input.consumeLook();
    const preset = CAM_PRESET[settings.cam] || CAM_PRESET.slow;
    const touch = document.body.classList.contains("touch");
    if (Math.abs(look.dx) + Math.abs(look.dy) > 0.4) {
      camManual = 1.15;
      camYawVel = 0;
      camRecenter = 0;
      camFaceWait = 0.6;
    }
    const drag = (touch ? 0.00205 : 0.0042) * preset.drag;
    const dragY = (touch ? 0.00145 : 0.003) * preset.drag;
    // Drag right turns the view right: yaw down swings lookDir toward screen-right.
    camYaw -= look.dx * drag;
    camPitch = clamp(camPitch + look.dy * dragY, 0.16, 1.05);
  }
  camManual = Math.max(0, camManual - raw);

  const step = 1 / 60;
  let left = raw;
  let snap = null;
  let fresh = true;
  let guard = 0;
  while (left > 0.0004 && guard < 20) {
    const dt = Math.min(step, left);
    snap = sim.update(dt, input, camYaw, playing && mode === "play", fresh);
    fresh = false;
    left -= dt;
    guard++;
  }
  if (mode === "play" && playing && snap && !params.get("shot")) {
    const preset = CAM_PRESET[settings.cam] || CAM_PRESET.slow;
    const face = snap.player.yaw;
    const turned = Math.abs(angDelta(camFace, face));
    if (turned > 0.28) {
      camFace = face;
      camFaceWait = 0.6;
    } else camFaceWait = Math.max(0, camFaceWait - raw);
    const err = angDelta(camYaw, face);
    const towardCam = Math.abs(err) > (100 * Math.PI) / 180;
    const moving = snap.player.speed > 0.55;
    if (snap.events.some((ev) => ev.type === "recenter")) {
      camRecenter = 0.4;
      camManual = 0;
      camFaceWait = 0;
      camFace = face;
    }
    let sprung = null;
    if (camRecenter > 0) {
      camRecenter = Math.max(0, camRecenter - raw);
      sprung = springAngle(camYaw, camYawVel, face, 6.5, raw, 150 * Math.PI / 180);
      camPitch = damp(camPitch, 0.38, 5, raw);
    } else if (snap.lock) {
      const ang = Math.atan2(snap.lock.x - snap.player.x, snap.lock.z - snap.player.z);
      sprung = springAngle(camYaw, camYawVel, ang, preset.omega * 1.15, raw, preset.max);
    } else if (!towardCam && moving && camManual <= 0 && camFaceWait <= 0) {
      sprung = springAngle(camYaw, camYawVel, face, preset.omega, raw, preset.max);
    }
    if (sprung) {
      camYaw = sprung.angle;
      camYawVel = sprung.vel;
    } else camYawVel *= Math.exp(-5 * raw);
  }

  const lookDirX = Math.sin(camYaw);
  const lookDirZ = Math.cos(camYaw);
  const rightX = -Math.cos(camYaw);
  const rightZ = Math.sin(camYaw);
  const shot = params.get("shot");
  shake = Math.max(0, shake - raw);
  if (flyby && !helpOpen()) {
    flyby.arm += raw;
    flyby.t += raw;
    if (flyby.t >= flyby.dur) endFlyby();
  }
  const cinematic = shot === "flyby" || !!flyby;
  document.body.classList.toggle("flyby", cinematic);
  if (world.setCinematic) world.setCinematic(cinematic);
  if (shot === "flyby") {
    camPos.set(-17.5, -2.6, -8);
    lookAt.set(1.6, -1.15, 12);
  } else if (flyby) {
    const pose = flyPose(flyby.t / flyby.dur);
    camPos.set(pose.x, pose.y, pose.z);
    lookAt.set(pose.lx, pose.ly, pose.lz);
  } else if (shot === "deck") {
    camPos.set(-2.8, 2.05, -4.6);
    lookAt.set(-6.4, -3.6, 14);
  } else if (shot === "swing" && snap) {
    const y = snap.player.y;
    camPos.set(snap.player.x - 2.55, y + 1.28, snap.player.z + 0.15);
    lookAt.set(snap.player.x + 0.05, y + 1.12, snap.player.z + 0.55);
  } else if (shot === "crew") {
    const y = snap.player.y;
    camPos.set(snap.player.x - 4.65, y + 1.7, snap.player.z);
    lookAt.set(snap.player.x, y + 0.82, snap.player.z);
    if (!shotLight) {
      shotLight = new THREE.DirectionalLight(0xfff3e2, 3.1);
      shotLight.position.set(snap.player.x - 6, y + 4, snap.player.z);
      shotLight.target.position.set(snap.player.x, y + 1, snap.player.z);
      scene.add(shotLight, shotLight.target);
    }
  } else if (shot === "harlan" && snap) {
    camPos.set(snap.player.x - 3.4, snap.player.y + 1.65, snap.player.z - 4.8);
    lookAt.set(snap.player.x + 0.7, snap.player.y + 1.2, snap.player.z + 0.6);
  } else if (shot === "fire" && snap) {
    camPos.set(snap.player.x - 4.4, snap.player.y + 1.75, snap.player.z - 0.6);
    lookAt.set(snap.player.x + 0.3, snap.player.y + 1.05, snap.player.z + 2.2);
  } else if (shot === "freed" && snap.boss) {
    camPos.set(snap.boss.x + 2.4, 2.15, snap.boss.z - 6.4);
    lookAt.set(snap.boss.x, 2.45, snap.boss.z);
  } else if (shot === "overview" && worldKey === "thorne") {
    camPos.set(-3.2, 1.05, 1.2);
    lookAt.set(0.6, 3.6, 24);
  } else if (shot === "enemies" && worldKey === "thorne") {
    camPos.set(-2.15, 1.05, 9.4);
    lookAt.set(0.15, 0.72, 12.6);
    if (!shotLight) {
      shotLight = new THREE.DirectionalLight(0xd7fff0, 2.4);
      shotLight.position.set(-4, 4.2, 6);
      shotLight.target.position.set(0.2, 0.8, 12.6);
      scene.add(shotLight, shotLight.target);
    }
  } else if (shot === "hero" && worldKey === "thorne" && snap) {
    camPos.set(snap.player.x + 0.42, snap.player.y + 0.92, snap.player.z - 0.95);
    lookAt.set(snap.player.x - 0.02, snap.player.y + 0.7, snap.player.z + 0.02);
    if (!shotLight) {
      shotLight = new THREE.DirectionalLight(0xe8fff4, 2.8);
      shotLight.position.set(snap.player.x + 1.4, snap.player.y + 2.2, snap.player.z - 1.6);
      shotLight.target.position.set(snap.player.x, snap.player.y + 0.7, snap.player.z);
      scene.add(shotLight, shotLight.target);
    }
  } else if (shot === "boss" && worldKey === "thorne" && snap.boss) {
    camPos.set(snap.boss.x + 3.6, 2.35, snap.boss.z - 4.6);
    lookAt.set(snap.boss.x - 0.1, 1.85, snap.boss.z + 0.2);
  } else if (shot === "boss" && snap.boss) {
    camPos.set(snap.boss.x + 0.15, 2.2, snap.boss.z - 6.5);
    lookAt.set(snap.boss.x, 2.5, snap.boss.z);
    if (!shotLight) {
      shotLight = new THREE.DirectionalLight(0xffe2c0, 3.6);
      shotLight.position.set(snap.boss.x - 8, 7.2, snap.boss.z - 4);
      shotLight.target.position.set(snap.boss.x, 2.8, snap.boss.z);
      scene.add(shotLight, shotLight.target);
    }
  } else {
    let dist = 5.05 + camPitch * 1.25;
    let lift = 1.62 + camPitch * 1.55;
    const shoulder = 0.46;
    let lookX = snap.player.x + lookDirX * 1.55 + rightX * 0.12;
    let lookY = snap.player.y + 1.38;
    let lookZ = snap.player.z + lookDirZ * 1.55 + rightZ * 0.12;
    if (snap.lock && mode === "play") {
      const dx = snap.lock.x - snap.player.x;
      const dz = snap.lock.z - snap.player.z;
      const sep = Math.hypot(dx, dz);
      dist = clamp(5.3 + sep * 0.24, 5.2, 9.6);
      lookX = snap.player.x + dx * 0.4;
      lookZ = snap.player.z + dz * 0.4;
      lookY = (snap.player.y + 1.3 + snap.lock.y) * 0.5;
    }
    const cx = snap.player.x - lookDirX * dist + rightX * shoulder;
    const cz = snap.player.z - lookDirZ * dist + rightZ * shoulder;
    const cy = snap.player.y + lift;
    camPos.x = damp(camPos.x, cx, 5.2, raw);
    camPos.y = damp(camPos.y, cy, 5.2, raw);
    camPos.z = damp(camPos.z, cz, 5.2, raw);
    const focus = new THREE.Vector3(snap.player.x, snap.player.y + 1.2, snap.player.z);
    camPos.copy(world.pullCamera(focus, camPos));
    lookAt.set(lookX, lookY, lookZ);
  }
  camera.position.copy(camPos);
  camera.position.x += Math.sin(now / 40) * shake * 0.12;
  camera.position.y += Math.cos(now / 35) * shake * 0.08;
  camera.lookAt(lookAt);

  world.update(raw, now / 1000, snap.player);
  fxFocus.set(snap.player.x, snap.player.y + 0.05, snap.player.z);

  for (const ev of snap.events) {
    if (ev.type === "say") dialogue.say(ev.id);
    else if (ev.type === "dmg") addFloat(ev.x, ev.y, ev.z, ev.n, ev.coin);
    else if (ev.type === "hurt") {
      shake = Math.max(shake, 0.55);
      hurtFx.restart(360);
      const ring = document.getElementById("hp-ring");
      if (ring) {
        ring.classList.add("is-hit");
        clearTimeout(ring._hitTimer);
        ring._hitTimer = setTimeout(() => ring.classList.remove("is-hit"), 420);
      }
    }
    else if (ev.type === "hit") shake = Math.max(shake, ev.heavy ? 0.55 : 0.26);
    else if (ev.type === "level") addFloat(ev.x, ev.y, ev.z, "Lv " + ev.n, true);
    else if (ev.type === "flash" || ev.type === "steam" || ev.type === "pulse" || ev.type === "firelight" || ev.type === "argon") {
      const fire = ev.type === "firelight";
      const argon = ev.type === "argon";
      flashPeak = ev.type === "steam" ? 0.45 : fire ? 0.9 : argon ? 0.7 : 1;
      flashLight.color.setHex(argon ? 0x9dffc8 : fire ? 0xff7a32 : ev.type === "pulse" ? 0xd7ecff : ev.type === "steam" ? 0xe7d2b4 : 0xffe6b8);
      flashFx.restart(fire ? 520 : ev.type === "steam" ? 205 : 455);
      shock.material.color.setHex(argon ? 0xb8ffe0 : fire ? 0xff8a3a : ev.type === "pulse" ? 0xd7ecff : ev.type === "steam" ? 0xe7d2b4 : 0xfff0c8);
      shockFx.restart(fire ? 560 : 450);
      if (ev.type !== "steam") screenFlash.restart(160);
      if (fire) burstEmbers(ev.x, ev.y || 0, ev.z);
    }
    else if (ev.type === "lasso") {
      const attr = lassoLine.geometry.attributes.position;
      attr.setXYZ(0, ev.x, snap.player.y + 1.15, ev.z);
      attr.setXYZ(1, ev.tx, snap.player.y + 0.9, ev.tz);
      attr.needsUpdate = true;
      lassoFx.restart(420);
    }
    else if (ev.type === "ability") {
      const names = { lasso: "Lasso", steam: "Steam", pulse: "Pulse", firelight: "Firelight", argon: "Argon" };
      addFloat(snap.player.x, snap.player.y + 1.8, snap.player.z, names[ev.id] || "Ability", true);
    }
    else if (ev.type === "dead") showCard("dead");
    else if (ev.type === "outro") showCard("outro");
    else if (ev.type === "gate") pullBack();
    else if (ev.type === "page") showPage(ev.id, ev.n);
    else if (ev.type === "bulletin") narrate.say(ev.id);
    else if (ev.type === "boss") shake = 0.2;
  }

  tickVfx(performance.now());
  paintHud(snap);
  paintAbilities();
  if (flyby && flyby.arm > 0.35 && !helpOpen()) {
    el.prompt.hidden = false;
    el.prompt.classList.remove("is-react");
    el.prompt.textContent = "Tap to skip";
  }
  paintTutor(snap);
  const drain = snap.drain || 0;
  renderer.domElement.style.filter = drain > 0.02 ? `saturate(${(1 - drain * 0.94).toFixed(3)})` : "";
  syncRotateHint(snap);
  adaptQuality(raw);
  if (composer) {
    try { composer.render(); }
    catch (err) {
      console.warn("Post stack disabled.", err);
      composer = null;
      renderer.render(scene, camera);
    }
  } else renderer.render(scene, camera);
  if (!ready && castReady) {
    ready = true;
    el.boot.classList.add("gone");
    window.__BOOKWORLDS.ready = true;
  }
  requestAnimationFrame(frame);
}

function paintHud(snap) {
  const p = snap.player;
  const hudNames = document.querySelectorAll("#hud .bar-label > span:first-child");
  if (hudNames[0]) hudNames[0].textContent = worldKey === "thorne" ? "Sphere 19" : "Keeper";
  if (hudNames[1]) hudNames[1].textContent = worldKey === "thorne" ? "Core" : "Lantern";
  el.hud.classList.toggle("on", mode === "play");
  el.hp.style.width = `${clamp(p.hp / p.hpMax, 0, 1) * 100}%`;
  el.hpNum.textContent = String(Math.ceil(p.hp));
  el.lantern.style.width = `${clamp(p.flash, 0, 1) * 100}%`;
  el.coins.textContent = `${p.coins} coins`;
  const mpNum = document.getElementById("mp-num");
  if (mpNum) mpNum.textContent = String(Math.ceil(p.mp ?? 0));
  el.potions.textContent = p.potions > 0 ? `Tonic ${p.potions}` : "";
  const pageWord = /page/i.test(snap.objective || "");
  el.pages.hidden = pageWord;
  if (!pageWord) el.pages.textContent = `Pages ${snap.pages || 0}/5`;
  const objText = document.getElementById("obj-text");
  if (objText) objText.textContent = snap.objective;
  else el.obj.textContent = snap.objective;
  if (mode === "play" && el.hud) {
    const hudBottom = el.hud.getBoundingClientRect().bottom;
    const party = document.getElementById("party");
    const partyBottom = party ? party.getBoundingClientRect().bottom : 0;
    const clear = Math.ceil(Math.max(hudBottom, partyBottom) + 14);
    document.documentElement.style.setProperty("--hud-clear", clear + "px");
  }
  const setBtn = document.getElementById("settings-btn");
  if (setBtn) setBtn.hidden = mode !== "play";
  el.pips.innerHTML = [1, 2, 3, 4].map((i) => `<i class="${p.combo >= i ? "on" : ""}"></i>`).join("");
  setRing("hp-ring", 40, p.hp / p.hpMax);
  setRing("mp-ring", 28, (p.mp ?? p.hp) / (p.mpMax || p.hpMax));
  const gHp = document.getElementById("g-hp");
  const gMp = document.getElementById("g-mp");
  const gLv = document.getElementById("g-lv");
  const gMini = document.getElementById("g-lv-mini");
  if (gHp) gHp.textContent = String(Math.ceil(p.hp));
  if (gMp) gMp.textContent = String(Math.ceil(p.mp ?? 0));
  if (gLv) gLv.textContent = `Lv ${p.level || 1}`;
  if (gMini) gMini.textContent = `Lv ${p.level || 1}`;
  paintParty(snap);
  renderMenu(snap);
  const bossName = document.getElementById("boss-name");
  if (bossName && snap.boss.name) bossName.textContent = snap.boss.name;
  const showBoss = snap.boss.active && (snap.boss.alive || snap.boss.hp <= 0);
  el.bossbar.hidden = !showBoss || mode !== "play";
  if (showBoss) el.bossFill.style.width = `${clamp(snap.boss.hp / snap.boss.hpMax, 0, 1) * 100}%`;
  const react = snap.reaction;
  const shown = react || snap.prompt;
  const interact = document.getElementById("interact");
  if (shown && mode === "play") {
    el.prompt.hidden = false;
    el.prompt.classList.toggle("is-react", !!react);
    el.prompt.textContent = react ? `${shown.label}  ·  F` : `${shown.label}  ·  E`;
  } else {
    el.prompt.hidden = true;
    el.prompt.classList.remove("is-react");
  }
  if (interact) {
    const showAct = !!(snap.prompt && !react && mode === "play");
    interact.hidden = !showAct;
    if (showAct) interact.textContent = snap.prompt.label;
  }
  const magicBtn = document.querySelector("#actions button.magic");
  if (magicBtn && mode === "play") {
    const mp = Math.ceil(p.mp ?? 0);
    const num = magicBtn.querySelector("b");
    if (num) num.textContent = String(mp);
    const ring = magicBtn.querySelector("circle");
    if (ring) {
      const circ = 2 * Math.PI * 15;
      const ready = snap.player.spell == null ? 1 : snap.player.spell;
      ring.style.strokeDasharray = String(circ);
      ring.style.strokeDashoffset = String(circ * (1 - clamp(ready, 0, 1)));
    }
    magicBtn.classList.toggle("is-dry", mp < 25);
  }
  if (snap.lock && mode === "play") {
    const pt = project(snap.lock.x, snap.lock.y, snap.lock.z);
    if (pt) {
      el.reticle.hidden = false;
      el.reticle.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    } else el.reticle.hidden = true;
  } else el.reticle.hidden = true;
  el.hurt.style.opacity = hurtFx.alive ? "0.66" : (mode === "play" && p.hp > 0 && p.hp < 35 ? "0.22" : "0");

  const line = dialogue.active();
  if (line && el.tag && mode === "play") {
    const head = snap.heads[line.speaker];
    const pt = head && project(head.x, head.y + 0.72, head.z);
    if (pt) {
      el.tag.hidden = false;
      el.tag.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -100%)`;
    } else el.tag.hidden = true;
  } else if (el.tag) el.tag.hidden = true;
}

window.__BOOKWORLDS = {
  ready: false,
  mode: () => mode,
  station: () => station,
  stationId: () => STATIONS[station].id,
  signalClosed: () => {
    const key = mode === "hub" ? STATIONS[station].id : worldKey;
    return !!restored[key];
  },
  worldKey: () => worldKey,
  worldId: () => (worldKey === "stack" ? "rusty-stack" : worldKey === "pulse" ? "first-pulse" : worldKey === "oldman" ? "old-man" : worldKey === "thorne" ? "thorne-lab" : "california-trail"),
  abilities: () => abilities.list().map((a) => ({ id: a.id, ready: a.ready, cd: a.cd })),
  fx: () => vfxActive(),
  player: () => {
    const p = sim.player;
    return { x: p.x, y: p.y, z: p.z, hp: p.hp, yaw: p.yaw, hits: sim.hits(), mp: p.mp, coins: p.coins, potions: p.potions };
  },
  enemies: () => sim.enemies.map((e) => ({ id: e.id, kind: e.kind, hp: e.hp, hpMax: e.hpMax, alive: e.alive, freed: !!e.freed, x: e.x, z: e.z, pendulum: !!e.pendulum, routed: !!e.routed })),
  bulletin: () => narrate.current(),
  pages: () => sim.pageCount(),
  circus: () => sim.circusDone(),
  floats: () => sim.floats(),
  boss: () => ({ hp: sim.boss.hp, alive: sim.boss.alive, active: sim.boss.active, x: sim.boss.x, z: sim.boss.z, state: sim.boss.state }),
  chipBoss: (n) => (sim.chipBoss ? sim.chipBoss(n) : null),
  hits: () => sim.hits(),
  mp: () => sim.mp(),
  level: () => sim.level(),
  team: () => sim.team(),
  reaction: () => sim.reaction(),
  lockId: () => sim.lockId(),
  camera: () => ({ yaw: camYaw, pitch: camPitch, x: camera.position.x, y: camera.position.y, z: camera.position.z }),
  skinned: () => {
    let n = 0;
    scene.traverse((o) => { if (o.isSkinnedMesh) n++; });
    return n;
  },
  project: (x, y, z) => project(x, y, z),
  voice: () => ({ speaking: audio.speaking(), depth: narrate.depth() + dialogue.depth(), levels: audio.levels(), bulletin: narrate.current(), line: dialogue.active() }),
  settings: () => ({ cam: settings.cam, subs: settings.subs }),
  say: (id) => narrate.say(id),
  bark: (id) => dialogue.say(id),
  teaching: () => sim.teaching(),
  tutorStep: () => sim.tutorStep(),
  allies: () => sim.allies(),
  keyOn: () => sim.keyOn(),
  skipLesson: () => sim.skipLesson(),
  tutorSave: () => sim.tutorSave(),
  place: (x, z, yaw) => sim.place(x, z, yaw),
  chests: () => sim.chests(),
  exitReady: () => sim.exitReady(),
  defeatBoss: () => sim.defeatForExit(),
  debugStrike: (opts) => sim.debugStrike(opts || {}),
  debugFoe: () => sim.debugFoe(),
  foeHp: (id) => sim.foeHp(id),
};

function setRing(id, radius, pct) {
  const node = document.getElementById(id);
  if (!node) return;
  const circ = 2 * Math.PI * radius;
  node.style.strokeDasharray = String(circ);
  node.style.strokeDashoffset = String(circ * (1 - clamp(pct, 0, 1)));
}

function paintTutor(snap) {
  const node = el.tutor;
  if (!node) return;
  const tutor = snap && snap.tutor;
  const show = !!(tutor && mode === "play");
  node.hidden = !show;
  document.body.classList.toggle("tutor-lock", !!(show && tutor.step === "lock"));
  if (!show) return;
  el.tutorText.textContent = "";
  const touch = document.body.classList.contains("touch");
  el.tutorHint.textContent = touch ? tutor.hintTouch : tutor.hintKey;
  if (tutor.act) {
    el.tutorAct.hidden = false;
    el.tutorAct.textContent = tutor.act;
  } else el.tutorAct.hidden = true;
}

el.tutorSkip.addEventListener("pointerup", () => {
  if (mode === "play" && sim.teaching()) sim.skipLesson();
});
el.tutorAct.addEventListener("pointerup", () => {
  if (mode === "play") sim.tutorSave();
});
document.getElementById("interact").addEventListener("pointerup", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (mode !== "play" || !playing) return;
  input.press("use");
});
document.getElementById("abilities")?.addEventListener("pointerup", (e) => {
  const btn = e.target.closest("[data-ability]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  if (mode !== "play" || !playing) return;
  input.press(btn.getAttribute("data-ability"));
});

function paintAbilities() {
  const box = document.getElementById("abilities");
  if (!box) return;
  const rows = mode === "play" ? abilities.list() : [];
  box.hidden = rows.length === 0;
  const touch = document.body.classList.contains("touch");
  const ids = rows.map((a) => a.id).join(",");
  if (box.dataset.ids !== ids || box.dataset.touch !== (touch ? "1" : "0")) {
    box.dataset.ids = ids;
    box.dataset.touch = touch ? "1" : "0";
    box.innerHTML = rows.map((a) => {
      const key = touch ? "" : `<b>${a.key}</b>`;
      return `<button type="button" data-ability="${a.id}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"></circle></svg><span>${a.name}</span>${key}</button>`;
    }).join("");
  }
  const circ = 2 * Math.PI * 15;
  for (const btn of box.querySelectorAll("button")) {
    const row = rows.find((a) => a.id === btn.dataset.ability);
    if (!row) continue;
    btn.classList.toggle("is-dry", !row.ready);
    const ring = btn.querySelector("circle");
    if (!ring) continue;
    const left = row.cool > 0 ? Math.min(1, row.cd / row.cool) : 0;
    ring.style.strokeDasharray = String(circ);
    ring.style.strokeDashoffset = String(circ * left);
  }
}

function paintParty(snap) {
  const rows = snap.party || [];
  const slots = document.querySelectorAll("#party .ally");
  slots.forEach((slot, i) => {
    const row = rows[i];
    const name = slot.querySelector("span");
    const bar = slot.querySelector("b");
    if (!row) {
      slot.hidden = true;
      return;
    }
    slot.hidden = false;
    if (name && row.name) name.textContent = row.name;
    if (bar) bar.style.width = `${clamp(row.hp / row.hpMax, 0, 1) * 100}%`;
  });
  const team = document.getElementById("team-fill");
  if (team) team.style.width = `${clamp((snap.player.team || 0) / 100, 0, 1) * 100}%`;
}

const MENU = {
  root: [
    { id: "attack", label: "Attack" },
    { id: "magic", label: "Magic" },
    { id: "items", label: "Items" },
    { id: "special", label: "Special" },
  ],
  magic: [
    { id: "flash", label: "Lantern Flash", cost: 25 },
    { id: "devil", label: "Dust Devil", cost: 20 },
    { id: "mend", label: "Trail Mend", cost: 30 },
    { id: "back", label: "Back" },
  ],
  items: [
    { id: "tonic", label: "Tonic" },
    { id: "back", label: "Back" },
  ],
  special: [
    { id: "team", label: "Wagon Toss" },
    { id: "back", label: "Back" },
  ],
};
let menuPane = "root";
let menuIndex = 0;
let menuSig = "";
let menuOpen = false;
let menuInit = false;
let rotateDismissed = false;
let rotateShownAt = 0;
try { rotateDismissed = sessionStorage.getItem("bw-rotate") === "1"; } catch { /* private mode */ }
if (params.get("shot")) rotateDismissed = true;

function menuList() {
  return MENU[menuPane] || MENU.root;
}

function inCombat(snap) {
  if (!snap) return false;
  if (snap.boss && snap.boss.active && snap.boss.alive) return true;
  const p = snap.player;
  if (!p || !snap.enemies) return false;
  for (const e of snap.enemies) {
    if (!e.alive) continue;
    const dx = (e.x || 0) - p.x;
    const dz = (e.z || 0) - p.z;
    if (dx * dx + dz * dz < 196) return true;
  }
  return false;
}

function syncRotateHint(snap) {
  const node = document.getElementById("rotate-hint");
  if (!node) return;
  const phone = document.body.classList.contains("touch") && Math.min(window.innerWidth, window.innerHeight) < 520;
  const want = phone && window.innerHeight > window.innerWidth && document.body.classList.contains("playing") && !rotateDismissed;
  if (want) {
    if (!rotateShownAt) rotateShownAt = performance.now();
    if (performance.now() - rotateShownAt > 4000) {
      rotateDismissed = true;
      try { sessionStorage.setItem("bw-rotate", "1"); } catch { /* ignore */ }
    }
  } else if (!rotateDismissed) {
    rotateShownAt = 0;
  }
  const combat = inCombat(snap);
  node.hidden = !(want && !rotateDismissed && !combat);
}

function maybeShowHelp() {
  const panel = document.getElementById("help");
  if (!panel) return;
  if (params.get("shot")) {
    panel.hidden = true;
    return;
  }
  let seen = false;
  try { seen = localStorage.getItem("bw-help") === "1"; } catch { /* private mode */ }
  panel.hidden = seen;
}

function dismissHelp() {
  const panel = document.getElementById("help");
  if (panel) panel.hidden = true;
  try { localStorage.setItem("bw-help", "1"); } catch { /* ignore */ }
}

function renderMenu(snap) {
  const node = document.getElementById("cmd");
  if (!node) return;
  if (!menuInit) {
    menuOpen = !document.body.classList.contains("touch");
    menuInit = true;
  }
  const list = menuList();
  menuIndex = (menuIndex % list.length + list.length) % list.length;
  const p = snap && snap.player;
  node.classList.toggle("is-collapsed", !menuOpen);
  if (!menuOpen) {
    const sig = `closed|${mode}`;
    if (sig === menuSig) return;
    menuSig = sig;
    node.innerHTML = `<button type="button" class="cmd-tab" data-cmd="toggle">Commands</button>`;
    return;
  }
  const sig = `${menuPane}|${menuIndex}|${p ? p.potions : 0}|${p ? Math.ceil(p.mp) : 0}|${p ? Math.floor(p.team || 0) : 0}|${mode}|open`;
  if (sig === menuSig) return;
  menuSig = sig;
  node.innerHTML = `<button type="button" class="cmd-tab" data-cmd="toggle"><span>${menuPane === "root" ? "Commands" : menuPane}</span><small>hide</small></button>` + list.map((item, i) => {
    let note = "";
    let disabled = false;
    if (item.cost) note = String(item.cost);
    if (item.id === "tonic") note = "x" + ((p && p.potions) || 0);
    if (item.id === "team") note = p && p.team >= 100 ? "ready" : "meter";
    if (item.id === "flash" || item.id === "devil" || item.id === "mend") disabled = !p || p.mp < item.cost;
    if (item.id === "tonic") disabled = !p || p.potions <= 0;
    if (item.id === "team") disabled = !p || p.team < 100;
    return `<button type="button" data-cmd="${item.id}" class="${i === menuIndex ? "is-on" : ""}" ${disabled ? "disabled" : ""}><span>${item.label}</span><small>${note}</small></button>`;
  }).join("");
}

function activateMenu(id) {
  if (id === "toggle") {
    menuOpen = !menuOpen;
    menuSig = "";
    return;
  }
  if (id === "magic" || id === "items" || id === "special") {
    menuPane = id;
    menuIndex = 0;
    menuSig = "";
    return;
  }
  if (id === "back") {
    menuPane = "root";
    menuIndex = 0;
    menuSig = "";
    return;
  }
  if (id === "attack") input.press("attack");
  else if (id === "flash") input.press("flash");
  else if (id === "devil") input.press("devil");
  else if (id === "mend") input.press("mend");
  else if (id === "tonic") input.press("potion");
  else if (id === "team") input.press("special");
  if (document.body.classList.contains("touch")) {
    menuOpen = false;
    menuPane = "root";
    menuIndex = 0;
    menuSig = "";
  }
}

document.getElementById("cmd").addEventListener("pointerup", (e) => {
  const btn = e.target.closest("[data-cmd]");
  if (!btn || mode !== "play") return;
  e.preventDefault();
  e.stopPropagation();
  activateMenu(btn.getAttribute("data-cmd"));
  menuSig = "";
});

document.getElementById("rotate-dismiss")?.addEventListener("pointerup", (e) => {
  e.preventDefault();
  e.stopPropagation();
  rotateDismissed = true;
  try { sessionStorage.setItem("bw-rotate", "1"); } catch { /* ignore */ }
  syncRotateHint();
});

function wireSettings() {
  const btn = document.getElementById("settings-btn");
  const panel = document.getElementById("settings");
  const speeds = document.getElementById("cam-speed");
  const subToggle = document.getElementById("sub-toggle");
  const soundToggle = document.getElementById("sound-toggle");
  if (!btn || !panel) return;
  const paint = () => {
    document.body.classList.toggle("subs", settings.subs);
    if (subToggle) subToggle.checked = settings.subs;
    if (soundToggle) soundToggle.checked = settings.sound;
    if (speeds) {
      for (const node of speeds.querySelectorAll("[data-speed]")) {
        node.classList.toggle("is-on", node.getAttribute("data-speed") === settings.cam);
      }
    }
  };
  paint();
  btn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  speeds?.addEventListener("pointerup", (e) => {
    const node = e.target.closest("[data-speed]");
    if (!node) return;
    e.preventDefault();
    e.stopPropagation();
    const id = node.getAttribute("data-speed");
    if (!CAM_PRESET[id]) return;
    settings.cam = id;
    saveSettings();
    paint();
  });
  subToggle?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    subToggle.checked = !subToggle.checked;
    subToggle.dispatchEvent(new Event("change"));
  });
  // The settings panel swallows touchstart, so iOS never delivers the click.
  // pointerdown flips the box; the later click must not flip it back.
  soundToggle?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    soundToggle.checked = !soundToggle.checked;
    soundToggle.dispatchEvent(new Event("change"));
  });
  soundToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  document.getElementById("help-dismiss")?.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dismissHelp();
  });
  document.getElementById("help-reopen")?.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = document.getElementById("help");
    if (panel) panel.hidden = false;
  });
  soundToggle?.addEventListener("change", () => {
    settings.sound = !!soundToggle.checked;
    saveSettings();
    audio.sound(settings.sound);
    audio.unlock();
    paint();
  });
  subToggle?.addEventListener("change", () => {
    settings.subs = !!subToggle.checked;
    saveSettings();
    paint();
    const cur = narrate.current();
    const bar = document.getElementById("bulletin");
    if (!bar) return;
    if (settings.subs && cur) bar.hidden = false;
    else if (!settings.subs && bar.dataset.force !== "1") bar.hidden = true;
  });
}

function installEnvironment(gl, rootScene, lowQ, kind) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 32);
  if (kind === "stack") {
    grd.addColorStop(0, "#1a3358");
    grd.addColorStop(0.42, "#7aa0c8");
    grd.addColorStop(0.68, "#e8b07a");
    grd.addColorStop(1, "#8a6848");
  } else if (kind === "oldman") {
    grd.addColorStop(0, "#0e1428");
    grd.addColorStop(0.42, "#243456");
    grd.addColorStop(0.72, "#3a4c6c");
    grd.addColorStop(1, "#1a2438");
  } else if (kind === "thorne") {
    grd.addColorStop(0, "#070a12");
    grd.addColorStop(0.35, "#143028");
    grd.addColorStop(0.62, "#1a4038");
    grd.addColorStop(1, "#100c08");
  } else if (kind === "pulse") {
    grd.addColorStop(0, "#2a1458");
    grd.addColorStop(0.28, "#6a3a28");
    grd.addColorStop(0.48, "#e0a04a");
    grd.addColorStop(0.68, "#1a7a78");
    grd.addColorStop(1, "#140818");
  } else {
    grd.addColorStop(0, "#1a2744");
    grd.addColorStop(0.42, "#c45a3a");
    grd.addColorStop(0.68, "#f0b67a");
    grd.addColorStop(1, "#8a5a38");
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(gl);
  rootScene.environment = pm.fromEquirectangular(tex).texture;
  rootScene.environmentIntensity = lowQ ? 0.38 : 0.52;
  tex.dispose();
  pm.dispose();
}

function makeComposer(gl, rootScene, cam, lowQ) {
  const post = new EffectComposer(gl);
  post.addPass(new RenderPass(rootScene, cam));
  if (!lowQ) {
    try {
      const ao = new GTAOPass(rootScene, cam, window.innerWidth, window.innerHeight);
      ao.blendIntensity = 0.42;
      if (ao.updateGtaoMaterial) ao.updateGtaoMaterial({ samples: 8, radius: 0.28, thickness: 0.6, scale: 0.85 });
      post.addPass(ao);
      post.ao = ao;
    } catch (err) {
      console.warn("Ambient occlusion skipped.", err);
    }
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), lowQ ? 0.1 : 0.18, 0.42, 0.88);
  post.addPass(bloom);
  post.bloom = bloom;
  post.addPass(new ShaderPass(GRADE));
  const fxaa = new FXAAPass();
  post.addPass(fxaa);
  post.fxaa = fxaa;
  post.addPass(new OutputPass());
  return post;
}

let qualityDrop = 0;
function adaptQuality(dt) {
  if (dt > 0.034) qualityDrop += 1;
  else qualityDrop = Math.max(0, qualityDrop - 1);
  if (qualityDrop < 45) return;
  qualityDrop = 0;
  const ratio = renderer.getPixelRatio();
  if (ratio > 1) renderer.setPixelRatio(1);
  if (composer && composer.ao) composer.ao.enabled = false;
  if (composer && composer.bloom) composer.bloom.strength = 0.06;
  if (world.setQuality) world.setQuality("low");
}

window.addEventListener("wheel", (e) => {
  if (mode !== "play" || !playing) return;
  if (e.target.closest && e.target.closest("#hub, #card")) return;
  menuIndex += e.deltaY > 0 ? 1 : -1;
  menuSig = "";
  e.preventDefault();
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (mode !== "play" || !playing) return;
  const k = e.key.toLowerCase();
  if (k === "[") { menuIndex -= 1; menuSig = ""; e.preventDefault(); }
  else if (k === "]") { menuIndex += 1; menuSig = ""; e.preventDefault(); }
  else if (k === "m") {
    const list = menuList();
    const item = list[(menuIndex % list.length + list.length) % list.length];
    if (item) activateMenu(item.id);
    menuSig = "";
    e.preventDefault();
  } else if (k === "b" || k === "backspace") {
    if (menuPane !== "root") { menuPane = "root"; menuIndex = 0; menuSig = ""; e.preventDefault(); }
  }
});

function wireHome() {
  const leave = document.getElementById("leave");
  const ask = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "hub") {
      location.href = "../index.html";
      return;
    }
    if (input) input.enabled = false;
    if (leave) leave.hidden = false;
  };
  document.getElementById("home-pin")?.addEventListener("pointerup", ask);
  document.getElementById("leave-no")?.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (leave) leave.hidden = true;
    if (input && mode === "play") input.enabled = true;
  });
  document.getElementById("leave-yes")?.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    location.href = "../index.html";
  });
}

wireSettings();
wireHome();
requestAnimationFrame(frame);
