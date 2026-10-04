// Rules of the week. Plain data + functions; the engine never decides anything here.
import { BEATS } from "./beats.js";
import { CAM_SPOTS, CAMP_FIRE } from "./engine.js";
import { EDGES, PLACES, VIEWS, route } from "./terrain.js";
import { clamp, fmtClock, rng } from "./util.js";

export const DAWN = 5 * 60 + 40;
export const SUNSET = 18 * 60 + 10;
export const LEGAL_END = 18 * 60 + 35;
export const WIND_NAME = { N: "north", E: "east", S: "south", W: "west" };
const WIND_VEC = { N: [0, 1], S: [0, -1], E: [-1, 0], W: [1, 0] }; // direction the air MOVES (from N -> toward +z)

export const ENDINGS = {
  meat: { title: "Walked out", text: "The bull is in the truck. You did not imagine the timber. The mountain keeps its own, and this time it lets you leave with the meat." },
  meatScar: { title: "He paid. You paid.", text: "Meat in the bed, and a bruise across your shoulders the shape of a hand too long to be a hand. Some nights you will still hear the chorus rolling through the ridges. You sleep with the Colt on the nightstand, and the fire built high." },
  empty: { title: "Empty handed", text: "You shut the door. The elk is still up there. So is whatever walks when the light goes. The truck starts on the second try." },
  proof: { title: "The card", text: "No meat. A card in your shirt with a frame you will not show anyone. You leave the mountain what it already owned." },
  broken: { title: "Didn't come down", text: "Your nerve went before your legs did. They find the truck first, then the tracks: yours, and the long narrow ones beside them." },
  kept: { title: "The mountain keeps its own", text: "The week is spent and you are still up high. Weather closes the spur. The truck waits where you left it, ticking as it cools, and then not." },
};

export function phaseOf(m) {
  m = ((m % 1440) + 1440) % 1440;
  if (m >= 300 && m < 450) return "DAWN";
  if (m >= 450 && m < 660) return "MORNING";
  if (m >= 660 && m < 930) return "MIDDAY";
  if (m >= 930 && m < 1110) return "DUSK";
  return "NIGHT";
}
export const isNight = (m) => m >= 19 * 60 + 5 || m < 5 * 60 + 15;
export const isDark = (m) => m >= 18 * 60 + 40 || m < 5 * 60 + 30;

export function newGame(seed = (Date.now() & 0xffff) | 1) {
  const r = rng(seed);
  const winds = ["N", "E", "S", "W"];
  const s = {
    v: 2, seed, day: 1, minutes: DAWN, heart: 88, pressure: 8, mode: "play", ending: null,
    wind: winds.map((_, i) => winds[Math.floor(r() * 4)]),
    carried: 0, rounds: 5, colt: 7, rifle: true, rifleAt: null,
    camsLeft: 3, cams: {}, cards: [],
    fireDay: 0, laidDay: 0, wall: 0, deadfall: false, deadfallSprung: false,
    elk: { marked: 0, markedAt: null, down: false, wounded: false, packed: false, spoiled: false, x: 0, z: 0, spooked: null, bloodTo: null, shotDay: 0 },
    beats: [], notes: [], tut: 0, flags: {}, lineAt: -999, line: "",
    sticks: [], stickSeq: 1, sticksDay: 0,
    watch: false, sleeping: false,
    stats: { shots: 0, cards: 0, nights: 0, seen: 0, stills: 0 },
    walker: { nextApproach: 0, approaches: 0, took: false },
  };
  spawnSticks(s);
  note(s, "Day 1. You shut the truck door soft. Seven days, one bull, and the light is just now worth using.");
  return s;
}

export const windOf = (s) => s.wind[(s.day - 1) % s.wind.length];
export const atFireNow = (s, x, z) => s.fireDay === s.day && Math.hypot(x - CAMP_FIRE.x, z - CAMP_FIRE.z) < 15 && (s.minutes >= 16 * 60 || s.minutes < 7 * 60);
// laid (laidDay) and lit (fireDay) are separate: the fire only burns once you light it with flint and steel
export const fireLit = (s) => s.fireDay === s.day;
export const absMin = (s) => s.day * 1440 + s.minutes;

export function say(s, text, journal = false) {
  s.line = text;
  s.lineAt = absMin(s);
  if (journal) note(s, text);
}
export function note(s, text) {
  s.notes.push({ day: s.day, clock: fmtClock(s.minutes), text });
  if (s.notes.length > 60) s.notes.shift();
}

/* ------------ firewood ------------ */
export function spawnSticks(s) {
  if (s.sticksDay === s.day) return;
  s.sticksDay = s.day;
  const r = rng(s.seed + s.day * 101);
  const keep = s.sticks.slice(-6);
  s.sticks = keep;
  const C = PLACES.camp;
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2, d = 9 + r() * 30;
    s.sticks.push({ id: s.stickSeq++, x: C.x + Math.cos(a) * d, z: C.z + Math.sin(a) * d });
  }
  // a few along the spur and knob trails
  for (const [px, pz] of [[PLACES.spur.x + 10, PLACES.spur.z - 6], [PLACES.knob.x - 12, PLACES.knob.z + 30], [PLACES.burn.x + 8, PLACES.burn.z + 6], [PLACES.timber.x + 6, PLACES.timber.z + 9]]) {
    s.sticks.push({ id: s.stickSeq++, x: px + (r() - 0.5) * 8, z: pz + (r() - 0.5) * 8 });
  }
}
export function pickStick(s, id) {
  const i = s.sticks.findIndex((k) => k.id === id);
  if (i < 0) return false;
  s.sticks.splice(i, 1);
  s.carried++;
  if (s.carried === 1 && !s.flags.firstStick) {
    s.flags.firstStick = 1;
    say(s, "Dry, light, snaps clean. Four of these will hold a fire till midnight.");
  } else say(s, `Firewood: ${s.carried}.`);
  return true;
}
export function canBuildFire(s) { return s.fireDay !== s.day && s.laidDay !== s.day && s.carried >= 4; }
export const fireLaid = (s) => s.laidDay === s.day && s.fireDay !== s.day;
/** light it from dusk on (or any time in the small hours) */
export function canLightFire(s) { return fireLaid(s) && (s.minutes >= 15 * 60 + 30 || s.minutes < 4 * 60); }
export function lightFire(s) {
  s.fireDay = s.day;
  s.flags.fireLearned = 1;
  if (s.tut >= 3 && s.tut < 5) s.tut = 5;
  say(s, "The fire takes. Small. Enough.", true);
}
export function buildFire(s) {
  s.carried -= 4;
  s.laidDay = s.day;
  say(s, s.minutes < 15 * 60 + 30 ? "You lay the fire in the stones: birch bark and dry grass for tinder, kindling, the four sticks set by. You will strike it when the light goes." : "You lay the fire in the stones: birch bark, kindling, four sticks. Now the flint and steel.", true);
}
export function addWall(s) {
  s.carried -= 3;
  s.wall = Math.min(4, s.wall + 1);
  say(s, s.wall >= 4 ? "The wall is up. Low, heavy, facing the timber. It will not stop what walks. It will make the walking have to choose." : `You drag deadfall into the line and pack snow on it. Wall ${s.wall} of 4.`, s.wall >= 4);
}
export function rigDeadfall(s) {
  s.carried -= 2;
  s.deadfall = true;
  say(s, "You half-cut a dead spruce above the approach, wedge it, and run the cord back to your seat. Thirty feet of trunk waiting on one pull.", true);
}

/* ------------ trail cameras ------------ */
export function hangCam(s, spot) {
  s.camsLeft--;
  s.cams[spot] = { day: s.day, pulled: 0 };
  if (s.tut === 2) s.tut = 3;
  say(s, `You strap the camera low on the trunk, aimed across ${CAM_SPOTS[spot].label}. It will tell you what comes and goes after dark.`);
}
/** what is on the card: the book's three-frame series as the week closes in */
export function cardFrames(s, spot) {
  const c = s.cams[spot];
  const nights = s.day - c.day;
  const heat = s.pressure + s.day * 6;
  const frames = [];
  if (heat < 30 || nights < 1) {
    frames.push({ kind: "empty", text: "Blank white park, black timber beyond. Branches. Snow sliding off needles." });
    frames.push({ kind: "cows", text: "Cows, feeding through at 02:14. Eyes like coins in the flash." });
    frames.push({ kind: "empty", text: "Empty. Then empty. Then empty." });
  } else if (heat < 52) {
    frames.push({ kind: "cows", text: "Cows at 01:50, heads up, all looking the same way." });
    frames.push({ kind: "edge", text: "A faint smudge near the left edge. Dark, elongated, like a branch shadow that doesn't match any branch." });
    frames.push({ kind: "empty", text: "The next frame is clean." });
  } else {
    frames.push({ kind: "edge", text: "At the edge of the frame, indistinct. Darker than the snow, roughly man-height." });
    frames.push({ kind: "mid", text: "Closer. Almost centred. Taller than any man." });
    frames.push({ kind: "face", text: "Perfectly still, facing the lens. No detail. Just a shadow that has no business standing upright in an empty park." });
  }
  return frames;
}
export function pullCard(s, spot) {
  const frames = cardFrames(s, spot);
  s.cams[spot].pulled = s.day;
  s.cams[spot].day = s.day; // it keeps recording
  s.stats.cards++;
  const worst = frames.some((f) => f.kind === "face") ? "face" : frames.some((f) => f.kind !== "empty" && f.kind !== "cows") ? "edge" : "none";
  s.cards.push({ day: s.day, spot, worst });
  if (worst === "face") { s.heart = clamp(s.heart - 10, 0, 100); s.pressure += 4; note(s, "The card. Three frames. In the last one it is looking into the lens."); }
  else if (worst === "edge") { s.heart = clamp(s.heart - 4, 0, 100); note(s, "A smudge on the card that doesn't match any branch. Glitch, you tell yourself."); }
  if (s.tut === 6) s.tut = 7;
  return frames;
}

/* ------------ the bull ------------ */
const DAWN_SPOTS = ["meadow", "burn", "meadow", "creek", "meadow", "burn", "meadow"];
const DUSK_SPOTS = ["meadow", "meadow", "burn", "meadow", "creek", "meadow", "burn"];
export function bullShowing(s) {
  if (s.elk.down || s.elk.wounded) return true;
  if (s.day >= 3) return true;
  return s.day === 2 && s.minutes >= 15 * 60;
}
/** where the bull is right now (place id) or null at night */
export function bullPlace(s) {
  if (s.elk.down) return null;
  if (s.elk.spooked && s.elk.spooked.day === s.day) return s.elk.spooked.to;
  if (s.elk.wounded) return s.elk.bloodTo;
  const m = s.minutes;
  if (m < DAWN - 20 || m > 19 * 60 + 20) return null;
  const i = (s.day - 1) % 7;
  if (m < 10 * 60) return DAWN_SPOTS[i];
  if (m < 16 * 60) return "timber";
  return DUSK_SPOTS[i];
}
/** cows: on the meadow most of the day — something living to glass on Day 1 */
export function cowsPlace(s) {
  const m = s.minutes;
  if (m < DAWN - 20 || m > 19 * 60 + 20) return null;
  return m > 11 * 60 && m < 15 * 60 ? "timber" : "meadow";
}
export const bullState = (s) => {
  const m = s.minutes;
  if (s.elk.down) return "down";
  if (m > 10 * 60 && m < 16 * 60 && !s.elk.spooked) return "bed";
  return "graze";
};
export function overlookFor(place) {
  for (const o of ["knob", "saddle"]) if (VIEWS[o].includes(place)) return o;
  return "knob";
}
export function markBull(s, from) {
  const p = bullPlace(s);
  s.elk.marked = s.day;
  s.elk.markedAt = p;
  const w = windOf(s);
  say(s, `Bull. Six points, heavy through the shoulders, ${bullState(s) === "bed" ? "bedded" : "feeding"} at the ${PLACES[p].short.toLowerCase()}. Wind out of the ${WIND_NAME[w]}. Come in with it in your face.`, true);
  if (s.tut === 1) s.tut = 2;
}
/** scent: is the player upwind of the bull (air carries from player to him)? */
export function upwind(s, px, pz, ex, ez) {
  const [wx, wz] = WIND_VEC[windOf(s)];
  const dx = ex - px, dz = ez - pz;
  const d = Math.hypot(dx, dz) || 1;
  return (dx / d) * wx + (dz / d) * wz > 0.55;
}
export function spookBull(s, why) {
  const from = bullPlace(s);
  if (!from) return null;
  const nbs = EDGES.filter(([a, b]) => a === from || b === from).map(([a, b]) => (a === from ? b : a)).filter((p) => ["meadow", "burn", "creek", "timber", "saddle"].includes(p));
  const to = nbs[(s.day + s.minutes) % nbs.length] || "timber";
  s.elk.spooked = { day: s.day, to };
  s.elk.marked = 0;
  s.pressure = clamp(s.pressure + 3, 0, 100);
  const lines = {
    wind: "He gets your wind. A bark, a crash of timber, a rump going away. Wind on your neck is wind on his nose.",
    noise: "Your boots talk on the crust. He blows out of there and every ridge knows where you stood.",
    sight: "He sees you move. A long look, then he is gone in three jumps.",
    shot: "The bullet slaps wood. He is gone, and every ridge knows where you stood.",
    script: "He is there, broadside. Then his head comes up. Not at you. At the timber behind you. He is gone in three jumps, and something in the timber screams where he was looking.",
  };
  say(s, lines[why] || lines.sight, why === "script");
  return to;
}
export function shotResult(s, part, x, z) {
  s.rounds--;
  s.stats.shots++;
  if (part === "vitals" || (part === "body" && s.elk.wounded)) {
    s.elk.down = true;
    s.elk.wounded = false;
    s.elk.x = x; s.elk.z = z;
    s.elk.shotDay = s.day;
    say(s, "He drops in the frost and does not get up. The mountain goes quiet in a different register. The work is still ahead of you.", true);
    return "down";
  }
  if (part === "body") {
    const to = spookBull(s, "shot");
    s.elk.wounded = true;
    s.elk.bloodTo = to || "timber";
    s.elk.spooked = null;
    s.pressure = clamp(s.pressure + 12, 0, 100);
    s.heart = clamp(s.heart - 6, 0, 100);
    say(s, "The shot is back. He humps into the timber and does not fall. Now you have a blood trail, and a problem.", true);
    return "wounded";
  }
  spookBull(s, "shot");
  return "miss";
}
export function packMeat(s) {
  s.elk.packed = true;
  s.minutes += 80;
  say(s, "The work is ugly and necessary. Quarters, backstraps, the heart. You leave the rest where the mountain can have it. The truck is the only direction that matters now.", true);
}

/* ------------ sleep / nights ------------ */
export function canSleep(s, atCamp) { return atCamp && (s.minutes >= 19 * 60 + 30 || s.minutes < 4 * 60); }
export function sitUp(s) { s.watch = true; say(s, "You sit with your back to the stones and feed the fire. Sleep can wait until the dark has said what it came to say."); }
export function sleep(s, atCamp) {
  const lit = s.fireDay === s.day;
  s.watch = false;
  s.stats.nights++;
  const wasDay = s.day;
  s.day++;
  s.minutes = DAWN;
  s.pressure = clamp(s.pressure + 5, 0, 100);
  let text;
  if (atCamp && lit) {
    s.heart = clamp(s.heart + 34 + s.wall * 3, 0, 100);
    text = s.wall >= 2 ? "The wall took the wind. The fire is coals. Something walked the outside of the logs and did not come in." : "The fire is coals. Dawn is a gray blade on the ridge. You are still here.";
  } else if (atCamp) {
    s.heart = clamp(s.heart + 12, 0, 100);
    s.pressure = clamp(s.pressure + 8, 0, 100);
    text = "You slept in the stones with no fire. Dawn finds you stiff, and the dark is not convinced you were safe. Tracks circle the tent.";
  } else {
    s.heart = clamp(s.heart - 18, 0, 100);
    s.pressure = clamp(s.pressure + 12, 0, 100);
    text = "You sit against a trunk until gray light, rifle across your knees. You do not remember sleeping. The snow around you remembers something standing.";
  }
  if (s.elk.down && !s.elk.packed && s.elk.shotDay <= wasDay - 0) {
    s.elk.spoiled = true;
    s.elk.down = false;
    text += " The bull you left is no longer meat. Ravens, and the sign of something larger.";
  }
  if (s.elk.wounded) { s.elk.wounded = false; s.elk.spooked = null; }
  spawnSticks(s);
  if (s.tut <= 5) s.tut = 6;
  say(s, `Day ${s.day}. ${text}`, true);
  if (s.day >= 8) end(s, "kept");
}
export function end(s, id) {
  s.mode = "ending";
  s.ending = id;
}
export function walkOut(s) {
  if (s.elk.packed) end(s, s.walker.took || s.deadfallSprung || s.flags.chaseHits ? "meatScar" : "meat");
  else if (s.cards.some((c) => c.worst === "face")) end(s, "proof");
  else end(s, "empty");
}

/* ------------ the clock ------------ */
/**
 * Advance the world by `mins` game minutes. ctx: {atCamp, atFire, walkerNear, running, place}
 * Returns list of events for the presentation layer: {type:'beat', beat} | {type:'nightfall'} | ...
 */
export function tick(s, mins, ctx) {
  const ev = [];
  if (s.mode !== "play") return ev;
  const before = s.minutes;
  s.minutes += mins;
  const m = s.minutes;
  // nightfall
  if (before < 18 * 60 + 40 && m >= 18 * 60 + 40) {
    s.pressure = clamp(s.pressure + 4, 0, 100);
    ev.push({ type: "nightfall" });
  }
  if (before < 16 * 60 + 30 && m >= 16 * 60 + 30) ev.push({ type: "dusk" });
  // nerve economy
  const dark = isDark(m);
  let dh = 0;
  if (dark && !ctx.atFire) dh -= 0.055 * mins * (1 + (s.day - 1) * 0.08);
  if (dark && ctx.atFire) dh += 0.07 * mins;
  if (!dark) dh += 0.02 * mins;
  if (ctx.walkerNear) dh -= 0.12 * mins;
  if (ctx.running && dark) dh -= 0.04 * mins;
  s.heart = clamp(s.heart + dh, 0, 100);
  // beats (let the last line breathe first)
  const since = absMin(s) - s.lineAt;
  if (since >= 10) {
    for (const b of BEATS) {
      if (b.day !== s.day || s.beats.includes(b.id)) continue;
      if (m < b.from || m > b.from + 180) continue;
      if (b.where === "camp" && !ctx.atFire) continue;
      if (b.where === "away" && ctx.atFire) continue;
      if (b.grp && s.beats.includes("g:" + b.grp)) continue;
      s.beats.push(b.id);
      if (b.grp) s.beats.push("g:" + b.grp);
      const k = ctx.atFire ? 1 - s.wall * 0.08 : 1.4;
      s.heart = clamp(s.heart + (b.heart || 0) * k, 0, 100);
      s.pressure = clamp(s.pressure + (b.pressure || 0), 0, 100);
      say(s, b.text, !!b.journal);
      ev.push({ type: "beat", beat: b });
      break;
    }
  }
  // the watch: sitting up at the fire until 22:00, then sleep
  if (s.watch && (!ctx.atCamp || !fireLit(s))) s.watch = false;
  if (s.watch && m >= 22 * 60) { ev.push({ type: "sleep" }); }
  // nobody walks all night: past 01:30 you sit down wherever you are
  if (m >= 25 * 60 + 30) ev.push({ type: "collapse" });
  if (s.heart <= 0) { end(s, "broken"); ev.push({ type: "end" }); }
  return ev;
}

/* ------------ what to do next ------------ */
export function objective(s, ctx) {
  const m = s.minutes;
  const P = (id) => ({ x: PLACES[id].x, z: PLACES[id].z, label: PLACES[id].short });
  const C = { x: CAMP_FIRE.x, z: CAMP_FIRE.z, label: "CAMP" };
  const darkIn = SUNSET + 30 - m;
  if (s.mode !== "play") return null;
  if (s.flags.finale) return { text: "Run for the truck", target: P("truck"), urgent: true };
  if (s.day >= 7 && m >= 15 * 60 && !s.elk.packed) {
    if (s.flags.stayFinale) return { text: "Hold the knoll. Keep the fire high.", target: C };
    return { text: "Walk out to the truck. Or stay, and be kept.", target: P("truck") };
  }
  if (s.elk.packed) return { text: "Walk out to the truck with the meat", target: P("truck") };
  if (s.elk.down) return { text: "Pack the meat", target: { x: s.elk.x, z: s.elk.z, label: "BULL" } };
  if (!s.rifle && s.rifleAt) return { text: "Find your rifle along its tracks", target: { x: s.rifleAt.x, z: s.rifleAt.z, label: "RIFLE" } };
  // tutorial chain, Day 1
  if (s.day === 1 && s.tut < 5 && m < 16 * 60 + 30) {
    if (s.tut === 0) return { text: "Walk up the trail to the spur", target: P("spur") };
    if (s.tut === 1 && !s.flags.signRead && s.flags.signAt) return { text: "Read the elk sign — stand on the tracks, LOOK", target: { x: s.flags.signAt.x, z: s.flags.signAt.z, label: "TRACKS" } };
    if (s.tut === 1) return { text: "Climb the knob and glass the park — LOOK", target: P("knob") };
    if (s.tut === 2) return { text: "Hang a trail camera at the saddle", target: { ...CAM_SPOTS.saddle, label: "CAMERA" } };
    if (s.tut === 3) return s.carried < 4 ? { text: `Gather firewood near camp (${s.carried}/4)`, target: C } : { text: "Lay the fire at camp", target: C };
    if (s.tut === 4) return { text: "Lay the fire at camp", target: C };
  }
  // evening begins when the walk home would eat the remaining light (trails wander: x1.3)
  const homeMin = ctx.px != null ? (Math.hypot(ctx.px - CAMP_FIRE.x, ctx.pz - CAMP_FIRE.z) * 1.3) / 2.7 : 120;
  const evening = m < 4 * 60 || m >= SUNSET + 30 || (m >= 15 * 60 && (ctx.atCamp ? m >= 17 * 60 : darkIn < homeMin + 30));
  if (evening) {
    if (!ctx.atCamp) return { text: darkIn > 0 ? `Get back to camp — dark in ${Math.max(5, Math.round(darkIn / 5) * 5)} min` : "Get back to the fire", target: C, urgent: darkIn < 40 };
    if (s.fireDay !== s.day) return s.laidDay === s.day ? { text: "Light the fire: flint and steel", target: C, urgent: m >= 17 * 60 } : s.carried >= 4 ? { text: "Lay the fire in the stones", target: C } : { text: `Gather firewood close to camp (${s.carried}/4)`, target: C, urgent: true };
    if (s.day >= 3 && s.wall < 4 && s.carried >= 3) return { text: `Add to the log wall (${s.wall}/4)`, target: C };
    if (s.day >= 5 && !s.deadfall && s.carried >= 2) return { text: "Rig the deadfall over the approach", target: C };
    if (m >= 19 * 60 + 30 || m < 4 * 60) return { text: s.watch ? "Sit up by the fire. You sleep at 22:00" : "Stay in the firelight. SLEEP or SIT UP", target: null };
    return { text: "Stay close to the fire. Night is coming", target: null };
  }
  // daytime hunting
  for (const [spot, c] of Object.entries(s.cams)) {
    if (c && c.day < s.day && c.pulled !== s.day && m > 9 * 60 && !(s.elk.marked === s.day)) return { text: `Pull the card at ${CAM_SPOTS[spot].label}`, target: { ...CAM_SPOTS[spot], label: "CARD" } };
  }
  if (s.elk.wounded) return { text: "Follow the blood. Finish him", target: P(s.elk.bloodTo) };
  const bp = bullPlace(s);
  if (bp && bullShowing(s) && s.elk.marked === s.day) {
    return { text: `Stalk the bull at the ${PLACES[bp].short.toLowerCase()} — keep the ${WIND_NAME[windOf(s)]} wind in your face`, target: P(bp) };
  }
  if (s.day === 1) {
    if (s.camsLeft > 0 && m > 9 * 60) return { text: "Hang cameras on the game trails", target: { ...(s.cams.meadow ? CAM_SPOTS.timber : CAM_SPOTS.meadow), label: "CAMERA" } };
    return { text: "Scout the meadow. Read the sign", target: P("meadow") };
  }
  if (bullShowing(s) && bp) {
    const o = overlookFor(bp);
    return { text: `Glass for the bull from the ${PLACES[o].short.toLowerCase()} — LOOK`, target: P(o) };
  }
  if (s.day === 2 && m >= 13 * 60) return { text: "He moves at last light. Be on the saddle by four", target: P("saddle") };
  if (s.day === 2 && s.wall < 2) return { text: `Gather wood and start the log wall (${s.wall}/4)`, target: C };
  if (s.camsLeft > 1) return { text: "Hang another camera on the game trails", target: { ...(s.cams.meadow ? CAM_SPOTS.timber : CAM_SPOTS.meadow), label: "CAMERA" } };
  if (s.day >= 3 && s.wall < 4) return { text: `Gather wood for the wall (${s.carried} carried)`, target: C };
  if (s.day === 2) return { text: "He moves at last light. Be on the saddle by four", target: P("saddle") };
  return { text: "Read sign in the timber. He beds there", target: P("timber") };
}

/** hints for sign at a place, for LOOK when not on an overlook */
export function readSign(s, place, near) {
  if (near === "walker") {
    s.heart = clamp(s.heart - 3, 0, 100);
    const keys = ["tracks", "tree", "hair", "scat", "smell"];
    const lines = {
      tracks: "Long, narrow prints, no claw marks. The stride too even, almost measured. Not crossing your trail. Following it.",
      tree: "A spruce snapped off above your head. The break is fresh and pale. Nothing fell on it.",
      hair: "Dark hair in the bark, long as your hand. Not deer. Not elk.",
      scat: "A pile in the snow, too big, grass and bone in it. It was warm this morning.",
      smell: "Wet earth and rot, hung in the cold air. Something stood here and breathed.",
    };
    const n = s.flags.signN | 0;
    const k = keys[n % keys.length];
    s.flags.signN = n + 1;
    s.flags.signPick = k;
    return lines[k];
  }
  if (near === "elk") {
    const bp = bullPlace(s);
    return bp ? `Fresh tracks, big as your palm, splayed where he trotted. They lead toward the ${PLACES[bp].short.toLowerCase()}.` : "Big tracks, last night's. He came through after dark and did not stop.";
  }
  if (near === "blood") return "Blood on the snowberry, bright and frothy, then dark. He is hurt. He went this way.";
  const lines = {
    meadow: "Beds dimpled deep in the snow, droppings in piles, saplings rubbed raw and polished dark. A seep steams at the upper end.",
    burn: "The snags talk in the wind. Elk paw through the ash for grass. Old rubs on the dead trunks.",
    creek: "Open water, steaming. Tracks come down to drink at first light, all of them pointed upslope after.",
    timber: "The duff is scuffed. Big beds under the spruce, still faintly warm in the middle. He lies up in here through midday.",
    saddle: "From up here the park is a white page. Anything that moves on it, you will see.",
    knob: "Wind-scoured rock. The whole park below you, and the black timber around it.",
    camp: "Your boot tracks, the tent, the stones. Whatever else walked here walked carefully.",
    spur: "The trail forks. Blazes on the spruce, old axe marks gone grey.",
    truck: "The road. Tire tracks filling with snow. The way home.",
  };
  return lines[place] || "Snow, and the quiet under it. You sit still long enough to hear your own blood.";
}
export { route };
