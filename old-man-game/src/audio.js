let ctx = null;
let master = null;
let windGain = null;
let windSrc = null;
let beatTimer = null;
let drone = null;
let droneGain = null;
let dish = null;
let dishGain = null;
let lfo = null;
let snapTimer = null;
let dread = 0;
let walkerNear = false;
function context() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    const session = navigator.audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
      }
    }
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 4e-3;
    comp.release.value = 0.25;
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  return ctx;
}
function unlockAudio() {
  const audio = context();
  if (!audio) return;
  const go = () => {
    try {
      const buf = audio.createBuffer(1, 1, audio.sampleRate);
      const src = audio.createBufferSource();
      src.buffer = buf;
      src.connect(audio.destination);
      src.start(0);
    } catch { /* already running */ }
  };
  if (audio.state === "suspended") void audio.resume().then(go);
  else go();
}
function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
function setMuted(muted) {
  const audio = context();
  if (!audio || !master) return;
  master.gain.cancelScheduledValues(audio.currentTime);
  master.gain.setTargetAtTime(muted ? 0 : 0.7, audio.currentTime, 0.04);
}
/** pull the whole mix down for a beat of quiet, then bring it back. No-op while muted. */
function duck(amount, hold = 0.6) {
  const audio = context();
  if (!audio || !master || master.gain.value < 0.05) return;
  const t = audio.currentTime;
  const from = Math.max(0.05, Math.min(0.7, master.gain.value));
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(from, t);
  master.gain.linearRampToValueAtTime(from * (1 - Math.max(0, Math.min(1, amount))), t + 0.08);
  master.gain.linearRampToValueAtTime(0.7, t + 0.08 + hold + 0.45);
}
function noise(seconds) {
  const audio = context();
  if (!audio) return null;
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
function ensureWind() {
  const audio = context();
  if (!audio || !master || windSrc) return;
  const buffer = noise(2);
  if (!buffer) return;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  windGain = audio.createGain();
  windGain.gain.value = 0.035;
  src.connect(filter);
  filter.connect(windGain);
  windGain.connect(master);
  src.start();
  windSrc = src;
}
function setWind(amount) {
  const audio = context();
  if (!audio || !windGain) return;
  windGain.gain.setTargetAtTime(Math.max(0, Math.min(0.08, amount)), audio.currentTime, 0.4);
}
let bedGain = null;
let bedFilter = null;
function setDread(amount, walker) {
  dread = Math.max(0, Math.min(1, amount));
  walkerNear = walker;
  const audio = context();
  if (!audio || !master) return;
  if (!bedGain) {
    bedFilter = audio.createBiquadFilter();
    bedFilter.type = "lowpass";
    bedFilter.frequency.value = 520;
    bedFilter.Q.value = 2.5;
    const lfoB = audio.createOscillator();
    lfoB.frequency.value = 0.09;
    const lg = audio.createGain();
    lg.gain.value = 220;
    lfoB.connect(lg);
    lg.connect(bedFilter.frequency);
    lfoB.start();
    bedGain = audio.createGain();
    bedGain.gain.value = 0;
    const voices = [
      [55, "sawtooth", 0.5],
      [58.3, "sawtooth", 0.4],
      [110.2, "triangle", 0.35],
      [164.8, "triangle", 0.18],
      [233.1, "sine", 0.08]
    ];
    for (const [fr, ty, a] of voices) {
      const o = audio.createOscillator();
      o.type = ty;
      o.frequency.value = fr;
      const og = audio.createGain();
      og.gain.value = a;
      o.connect(og);
      og.connect(bedFilter);
      o.start();
      if (fr < 60) drone = o;
    }
    bedFilter.connect(bedGain);
    bedGain.connect(master);
  }
  const level = dread * (walker ? 0.12 : 0.06);
  bedGain.gain.setTargetAtTime(level, audio.currentTime, 0.8);
  bedFilter?.frequency.setTargetAtTime(walker ? 760 : 480 + dread * 160, audio.currentTime, 0.6);
  if (drone) drone.detune.setTargetAtTime(walker ? -120 : 0, audio.currentTime, 0.5);
  if (dread > 0.28 && snapTimer === null) scheduleSnap();
  if (dread <= 0.28 && snapTimer !== null) {
    window.clearTimeout(snapTimer);
    snapTimer = null;
  }
}
function scheduleSnap() {
  const wait = (walkerNear ? 1600 : 4200) + Math.random() * (walkerNear ? 3400 : 7e3);
  snapTimer = window.setTimeout(() => {
    snapTimer = null;
    if (dread > 0.28) {
      limbCrack(walkerNear);
      scheduleSnap();
    }
  }, wait);
}
function limbCrack(close) {
  const audio = context();
  if (!audio || !master) return;
  const buffer = noise(close ? 0.22 : 0.16);
  if (!buffer) return;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = close ? 380 : 220;
  const gain = audio.createGain();
  const peak = close ? 0.22 : 0.08;
  gain.gain.setValueAtTime(1e-4, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(peak, audio.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + (close ? 0.28 : 0.2));
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
  if (!close) return;
  const knock = audio.createOscillator();
  const kg = audio.createGain();
  knock.frequency.setValueAtTime(70, audio.currentTime);
  knock.frequency.exponentialRampToValueAtTime(32, audio.currentTime + 0.18);
  kg.gain.setValueAtTime(0.12, audio.currentTime);
  kg.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + 0.22);
  knock.connect(kg);
  kg.connect(master);
  knock.start();
  knock.stop(audio.currentTime + 0.24);
}
function bootsteps() {
  const audio = context();
  const out = master;
  if (!audio || !out) return;
  [0, 0.28, 0.54].forEach((offset) => {
    const when = audio.currentTime + offset;
    const buffer = noise(0.09);
    if (!buffer) return;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(1e-4, when);
    gain.gain.exponentialRampToValueAtTime(0.16, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(1e-4, when + 0.1);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(when);
    const thumpOsc = audio.createOscillator();
    const tg = audio.createGain();
    thumpOsc.frequency.setValueAtTime(90, when);
    thumpOsc.frequency.exponentialRampToValueAtTime(40, when + 0.08);
    tg.gain.setValueAtTime(0.12, when);
    tg.gain.exponentialRampToValueAtTime(1e-4, when + 0.09);
    thumpOsc.connect(tg);
    tg.connect(out);
    thumpOsc.start(when);
    thumpOsc.stop(when + 0.1);
  });
}
function nightFall() {
  const audio = context();
  if (!audio || !master) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(38, audio.currentTime + 1.6);
  gain.gain.setValueAtTime(1e-4, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + 1.8);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(audio.currentTime + 1.85);
}
function blip() {
  const audio = context();
  if (!audio || !master) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = 520;
  gain.gain.setValueAtTime(1e-4, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, audio.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + 0.09);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(audio.currentTime + 0.1);
}
function rifleShot() {
  const audio = context();
  if (!audio || !master) return;
  const t = audio.currentTime;
  const shot = (when, level, bright) => {
    const crack = audio.createBufferSource();
    crack.buffer = noise(0.5);
    const hp = audio.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900 * bright + 200;
    const cg = audio.createGain();
    cg.gain.setValueAtTime(1e-4, when);
    cg.gain.exponentialRampToValueAtTime(0.6 * level, when + 3e-3);
    cg.gain.exponentialRampToValueAtTime(1e-4, when + 0.12 + (1 - bright) * 0.3);
    crack.connect(hp);
    hp.connect(cg);
    cg.connect(master);
    crack.start(when);
    const body = audio.createOscillator();
    const bg = audio.createGain();
    body.frequency.setValueAtTime(140, when);
    body.frequency.exponentialRampToValueAtTime(45, when + 0.25);
    bg.gain.setValueAtTime(0.4 * level, when);
    bg.gain.exponentialRampToValueAtTime(1e-4, when + 0.35);
    body.connect(bg);
    bg.connect(master);
    body.start(when);
    body.stop(when + 0.4);
  };
  shot(t, 1, 1);
  shot(t + 0.62, 0.22, 0.4);
  shot(t + 1.35, 0.1, 0.25);
  shot(t + 2.2, 0.05, 0.15);
}
function fireCrackle() {
  const audio = context();
  if (!audio || !master) return;
  const buffer = noise(0.25);
  if (!buffer) return;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 0.6 + Math.random() * 0.4;
  const filter = audio.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.05, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + 0.24);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start();
}
function thump(freq, when) {
  const audio = context();
  if (!audio || !master) return;
  const click = audio.createBufferSource();
  click.buffer = noise(0.02);
  const cbp = audio.createBiquadFilter();
  cbp.type = "bandpass";
  cbp.frequency.value = 1200;
  const cg = audio.createGain();
  cg.gain.setValueAtTime(1e-4, when);
  cg.gain.exponentialRampToValueAtTime(0.05, when + 2e-3);
  cg.gain.exponentialRampToValueAtTime(1e-4, when + 0.02);
  click.connect(cbp);
  cbp.connect(cg);
  cg.connect(master);
  click.start(when);
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.setValueAtTime(freq + 45, when);
  osc.frequency.exponentialRampToValueAtTime(52, when + 0.12);
  gain.gain.setValueAtTime(1e-4, when);
  gain.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(1e-4, when + 0.16);
  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + 0.18);
}
function setHeartbeat(heart, active, uneasy = false) {
  if (beatTimer !== null) {
    window.clearInterval(beatTimer);
    beatTimer = null;
  }
  const threshold = uneasy ? 72 : 42;
  if (!active || heart >= threshold) return;
  const gap = heart < 22 ? 640 : uneasy && heart < 48 ? 900 : uneasy ? 1280 : 1100;
  const tick = () => {
    const audio = context();
    if (!audio) return;
    thump(uneasy ? 70 : 78, audio.currentTime);
    thump(58, audio.currentTime + 0.16);
  };
  tick();
  beatTimer = window.setInterval(tick, gap);
}
let rustleGain = null;
let creekGain = null;
let tensionGain = null;
let fearGain = null;
let birdTimer = null;
let birdsPhase = "off";
let ambienceReady = false;
function ensureFear(_audio) {
}
let stepCount = 0;
function footstep(intensity = 0.6) {
  const audio = context();
  const out = master;
  if (!audio || !out) return;
  const t = audio.currentTime;
  stepCount++;
  const pan = audio.createStereoPanner();
  pan.pan.value = stepCount % 2 ? -0.12 : 0.12;
  pan.connect(out);
  for (let k = 0; k < 3; k++) {
    const src = audio.createBufferSource();
    src.buffer = noise(0.05);
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1700 + Math.random() * 1600;
    bp.Q.value = 1.1;
    const g2 = audio.createGain();
    const at = t + k * 0.022 + Math.random() * 0.01;
    g2.gain.setValueAtTime(1e-4, at);
    g2.gain.exponentialRampToValueAtTime(0.11 * (0.5 + intensity), at + 4e-3);
    g2.gain.exponentialRampToValueAtTime(1e-4, at + 0.05);
    src.connect(bp);
    bp.connect(g2);
    g2.connect(pan);
    src.start(at);
  }
  const o = audio.createOscillator();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.07);
  const g = audio.createGain();
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(0.06 * (0.4 + intensity), t + 5e-3);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 0.09);
  o.connect(g);
  g.connect(pan);
  o.start(t);
  o.stop(t + 0.1);
}
function ensureAmbience() {
  const audio = context();
  if (!audio || !master || ambienceReady) return;
  ambienceReady = true;
  const rustle = noise(2);
  const water = noise(2);
  if (rustle) {
    const src = audio.createBufferSource();
    src.buffer = rustle;
    src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.6;
    rustleGain = audio.createGain();
    rustleGain.gain.value = 0.012;
    src.connect(filter);
    filter.connect(rustleGain);
    rustleGain.connect(master);
    src.start();
  }
  if (water) {
    const src = audio.createBufferSource();
    src.buffer = water;
    src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    creekGain = audio.createGain();
    creekGain.gain.value = 0;
    src.connect(filter);
    filter.connect(creekGain);
    creekGain.connect(master);
    src.start();
  }
  const a = audio.createOscillator();
  const b = audio.createOscillator();
  a.type = "triangle";
  b.type = "triangle";
  a.frequency.value = 146.83;
  b.frequency.value = 174.61;
  tensionGain = audio.createGain();
  tensionGain.gain.value = 0;
  const pulse = audio.createGain();
  pulse.gain.value = 0.72;
  const lfo2 = audio.createOscillator();
  lfo2.frequency.value = 0.32;
  const lfoGain = audio.createGain();
  lfoGain.gain.value = 0.18;
  lfo2.connect(lfoGain);
  lfoGain.connect(pulse.gain);
  a.connect(tensionGain);
  b.connect(tensionGain);
  tensionGain.connect(pulse);
  pulse.connect(master);
  a.start();
  b.start();
  lfo2.start();
}
let hushed = false;
function hushBirds(on) {
  if (on) {
    hushed = true;
    if (birdTimer !== null) {
      window.clearTimeout(birdTimer);
      birdTimer = null;
    }
    birdsPhase = "off";
    return;
  }
  hushed = false;
}
function setAmbience(state) {
  const audio = context();
  if (!audio) return;
  ensureAmbience();
  creekGain?.gain.setTargetAtTime(Math.max(0, Math.min(0.09, state.creek)), audio.currentTime, 0.35);
  tensionGain?.gain.setTargetAtTime(Math.max(0, Math.min(0.05, state.tension)), audio.currentTime, 0.25);
  rustleGain?.gain.setTargetAtTime(Math.max(8e-3, Math.min(0.05, state.rustle)), audio.currentTime, 0.3);
  if (birdsPhase !== state.phase) {
    birdsPhase = state.phase;
    if (birdTimer !== null) {
      window.clearTimeout(birdTimer);
      birdTimer = null;
    }
    scheduleBird();
  }
}
function scheduleBird() {
  if (birdsPhase === "off") return;
  const night = birdsPhase === "night";
  const dusk = birdsPhase === "dusk";
  const wait = (night ? 14e3 : dusk ? 7e3 : 2800) + Math.random() * (night ? 12e3 : dusk ? 8e3 : 5e3);
  birdTimer = window.setTimeout(() => {
    birdTimer = null;
    if (birdsPhase === "off") return;
    birdCall(birdsPhase === "night");
    scheduleBird();
  }, wait);
}
function birdCall(night) {
  const audio = context();
  if (!audio || !master) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = night ? "sine" : "triangle";
  const t = audio.currentTime;
  if (night) {
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.setValueAtTime(330, t + 0.22);
    gain.gain.setValueAtTime(1e-4, t);
    gain.gain.exponentialRampToValueAtTime(0.03, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.7);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.72);
    return;
  }
  const f = 1600 + Math.random() * 1400;
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.07);
  gain.gain.setValueAtTime(1e-4, t);
  gain.gain.exponentialRampToValueAtTime(0.018, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.14);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + 0.16);
}
function stopAmbience() {
  birdsPhase = "off";
  if (birdTimer !== null) {
    window.clearTimeout(birdTimer);
    birdTimer = null;
  }
  const audio = context();
  if (!audio) return;
  creekGain?.gain.setTargetAtTime(0, audio.currentTime, 0.1);
  tensionGain?.gain.setTargetAtTime(0, audio.currentTime, 0.1);
  rustleGain?.gain.setTargetAtTime(0, audio.currentTime, 0.1);
}
let verbNode = null;
function verb() {
  const audio = context();
  if (!audio || !master) return null;
  if (!verbNode) {
    const seconds = 3.2;
    const len = Math.floor(audio.sampleRate * seconds);
    const b = audio.createBuffer(2, len, audio.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    verbNode = audio.createConvolver();
    verbNode.buffer = b;
    const wet = audio.createGain();
    wet.gain.value = 0.85;
    verbNode.connect(wet);
    wet.connect(master);
  }
  return verbNode;
}
function bus(pan, dry = 0.4) {
  const audio = context();
  const p = audio.createStereoPanner();
  p.pan.value = pan;
  const d = audio.createGain();
  d.gain.value = dry;
  p.connect(d);
  d.connect(master);
  const v = verb();
  if (v) p.connect(v);
  return p;
}
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(1e-4, t + a + d);
}
function playFx(fx, opts = {}) {
  const audio = context();
  if (!audio || !master || audio.state !== "running") return;
  const t = audio.currentTime + 0.05;
  const pan = opts.pan ?? (Math.random() < 0.5 ? -0.6 : 0.6);
  if (fx === "scream") scream(t, pan, opts.near ? 0.3 : 0.2);
  else if (fx === "chorus") {
    for (let v = 0; v < 3; v++) scream(t + v * 0.9 + Math.random() * 0.3, -0.9 + v * 0.9, 0.13);
    knocks(t + 3.2, -pan, 3);
  } else if (fx === "knocks") knocks(t, pan, 3);
  else if (fx === "snap") snap(t, pan, opts.near ?? true);
  else if (fx === "rock") {
    snap(t, pan * 0.4, true);
    const o = audio.createOscillator();
    o.frequency.setValueAtTime(220, t + 0.02);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
    const g = audio.createGain();
    env(g, t + 0.02, 3e-3, 0.3, 0.25);
    o.connect(g);
    g.connect(bus(pan * 0.4, 0.8));
    o.start(t);
    o.stop(t + 0.4);
    for (let i = 0; i < 6; i++) fireCrackleAt(t + 0.05 + i * 0.05);
  } else if (fx === "bugle") bugle(t, pan, opts.near ? 0.3 : 0.7);
  else if (fx === "flash") {
    const src = audio.createBufferSource();
    src.buffer = noise(0.03);
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3e3;
    const g = audio.createGain();
    env(g, t, 1e-3, 0.05, 0.03);
    src.connect(bp);
    bp.connect(g);
    g.connect(bus(pan, 0.2));
    src.start(t);
  } else if (fx === "gust") {
    const src = audio.createBufferSource();
    src.buffer = noise(4);
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.linearRampToValueAtTime(900, t + 1.6);
    bp.frequency.linearRampToValueAtTime(400, t + 3.8);
    bp.Q.value = 0.8;
    const g = audio.createGain();
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 1.4);
    g.gain.exponentialRampToValueAtTime(1e-4, t + 3.9);
    src.connect(bp);
    bp.connect(g);
    g.connect(bus(pan, 0.9));
    src.start(t);
  }
}
function fireCrackleAt(when) {
  const audio = context();
  if (!audio || !master) return;
  const src = audio.createBufferSource();
  src.buffer = noise(0.05);
  const hp = audio.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2e3;
  const g = audio.createGain();
  env(g, when, 1e-3, 0.08, 0.04);
  src.connect(hp);
  hp.connect(g);
  g.connect(master);
  src.start(when);
}
function scream(t, pan, level) {
  const audio = context();
  const shaper = audio.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = Math.tanh((i / n * 2 - 1) * 4);
  shaper.curve = curve;
  const g = audio.createGain();
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.25);
  g.gain.setValueAtTime(level, t + 1.6);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 2.8);
  [0, 17, -11].forEach((det, i) => {
    const o = audio.createOscillator();
    o.type = "sawtooth";
    o.detune.value = det * 3;
    const f = o.frequency;
    f.setValueAtTime(260, t);
    f.exponentialRampToValueAtTime(980 + i * 40, t + 0.5);
    f.linearRampToValueAtTime(820, t + 1.4);
    f.exponentialRampToValueAtTime(310, t + 2.7);
    const jit = audio.createOscillator();
    jit.type = "square";
    jit.frequency.value = 13 + i * 4;
    const jg = audio.createGain();
    jg.gain.value = 18;
    jit.connect(jg);
    jg.connect(f);
    o.connect(shaper);
    o.start(t);
    jit.start(t);
    o.stop(t + 2.9);
    jit.stop(t + 2.9);
  });
  const f1 = audio.createBiquadFilter();
  f1.type = "bandpass";
  f1.Q.value = 4;
  f1.frequency.setValueAtTime(700, t);
  f1.frequency.linearRampToValueAtTime(1300, t + 0.8);
  f1.frequency.linearRampToValueAtTime(600, t + 2.6);
  const f2 = audio.createBiquadFilter();
  f2.type = "bandpass";
  f2.Q.value = 6;
  f2.frequency.value = 2400;
  shaper.connect(f1);
  shaper.connect(f2);
  f1.connect(g);
  f2.connect(g);
  g.connect(bus(pan, 0.35));
}
function knocks(t, pan, count) {
  const audio = context();
  const out = bus(pan, 0.5);
  for (let k = 0; k < count; k++) {
    const tt = t + k * 0.55;
    const o = audio.createOscillator();
    o.frequency.setValueAtTime(330, tt);
    o.frequency.exponentialRampToValueAtTime(190, tt + 0.06);
    const g = audio.createGain();
    env(g, tt, 2e-3, 0.35, 0.12);
    o.connect(g);
    g.connect(out);
    o.start(tt);
    o.stop(tt + 0.2);
    const src = audio.createBufferSource();
    src.buffer = noise(0.03);
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 5;
    const ng = audio.createGain();
    env(ng, tt, 1e-3, 0.4, 0.03);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    src.start(tt);
  }
}
function snap(t, pan, close) {
  const audio = context();
  const out = bus(pan, close ? 0.9 : 0.3);
  const src = audio.createBufferSource();
  src.buffer = noise(0.12);
  const hp = audio.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = close ? 1200 : 700;
  const g = audio.createGain();
  env(g, t, 1e-3, close ? 0.5 : 0.15, close ? 0.09 : 0.06);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  src.start(t);
  const s2 = audio.createBufferSource();
  s2.buffer = noise(0.25);
  const bp = audio.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = 3;
  const g2 = audio.createGain();
  env(g2, t + 0.03, 2e-3, close ? 0.12 : 0.04, 0.2);
  s2.connect(bp);
  bp.connect(g2);
  g2.connect(out);
  s2.start(t + 0.03);
}
function bugle(t, pan, dist) {
  const audio = context();
  const out = bus(pan, 0.6);
  const lp = audio.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4e3 - dist * 2500;
  lp.connect(out);
  const o = audio.createOscillator();
  o.type = "triangle";
  const f = o.frequency;
  f.setValueAtTime(320, t);
  f.exponentialRampToValueAtTime(1450, t + 0.45);
  f.setValueAtTime(1450, t + 0.45);
  f.linearRampToValueAtTime(1550, t + 1.3);
  f.exponentialRampToValueAtTime(700, t + 1.9);
  const vib = audio.createOscillator();
  vib.frequency.value = 6;
  const vg = audio.createGain();
  vg.gain.value = 25;
  vib.connect(vg);
  vg.connect(f);
  const g = audio.createGain();
  g.gain.setValueAtTime(1e-4, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
  g.gain.setValueAtTime(0.16, t + 1.4);
  g.gain.exponentialRampToValueAtTime(1e-4, t + 2);
  o.connect(g);
  g.connect(lp);
  o.start(t);
  vib.start(t);
  o.stop(t + 2.1);
  vib.stop(t + 2.1);
  for (let k = 0; k < 3; k++) {
    const tt = t + 2.2 + k * 0.32;
    const go = audio.createOscillator();
    go.type = "sawtooth";
    go.frequency.setValueAtTime(190, tt);
    go.frequency.exponentialRampToValueAtTime(120, tt + 0.16);
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 450;
    bp.Q.value = 2;
    const gg = audio.createGain();
    env(gg, tt, 0.02, 0.12, 0.18);
    go.connect(bp);
    bp.connect(gg);
    gg.connect(lp);
    go.start(tt);
    go.stop(tt + 0.25);
  }
}
function getCtx() { return context(); }
function getMaster() { context(); return master; }
export {
  getCtx,
  getMaster,
  bus,
  env,
  noise,
  blip,
  bootsteps,
  ensureAmbience,
  ensureWind,
  fireCrackle,
  footstep,
  hushBirds,
  nightFall,
  playFx,
  resumeAudio,
  rifleShot,
  setAmbience,
  setDread,
  duck,
  setHeartbeat,
  setMuted,
  setWind,
  stopAmbience,
  unlockAudio
};
