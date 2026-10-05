// Original procedural wind, swings, and a quiet trail melody. No recorded music.
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function createAudio() {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let bedGain = null;
  let voiceGain = null;
  let windGain = null;
  let musicGain = null;
  let started = false;
  let soundOn = true;
  let primed = false;
  let speaking = false;
  let ducked = false;
  let stepAt = 0;
  let tension = 0;
  let mediaEl = null;
  let mediaNode = null;
  let mediaGen = 0;
  let voiceSrc = null;
  const clipCache = new Map();
  let unlockedP = null;
  let markUnlocked = null;
  let voiceOwner = null;
  let companionGen = 0;
  let companionCancel = null;
  let mediaUnlocked = false;
  let primeP = null;
  let gate = Promise.resolve();

  function context() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = soundOn ? 0.8 : 0;
      master.connect(ctx.destination);
      ctx.addEventListener("statechange", () => {
        if (ctx.state !== "running" || !started) return;
        try { applyBed(); } catch { /* a refused node must not stall the picture */ }
        if (markUnlocked) {
          const done = markUnlocked;
          markUnlocked = null;
          done();
        }
      });
      sfxGain = ctx.createGain();
      sfxGain.connect(master);
      bedGain = ctx.createGain();
      bedGain.connect(master);
      voiceGain = ctx.createGain();
      voiceGain.gain.value = 0.95;
      voiceGain.connect(master);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function whenUnlocked() {
    if (!unlockedP) unlockedP = new Promise((resolve) => { markUnlocked = resolve; });
    return unlockedP;
  }

  function ramp(param, value, seconds) {
    const audio = context();
    if (!audio || !param) return;
    const t = audio.currentTime;
    const from = param.value;
    param.cancelScheduledValues(t);
    param.setValueAtTime(from, t);
    param.linearRampToValueAtTime(value, t + seconds);
  }

  function setDuck(active) {
    ducked = active;
    const sfxTarget = active ? 0.12 : 1;
    const bedTarget = active ? 0.38 : 1;
    ramp(sfxGain && sfxGain.gain, sfxTarget, 0.1);
    ramp(bedGain && bedGain.gain, bedTarget, 0.1);
    if (sfxGain) sfxGain.gain.value = sfxTarget;
    if (bedGain) bedGain.gain.value = bedTarget;
  }

  function noise(seconds) {
    const audio = context();
    if (!audio) return null;
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function burst(opts) {
    const audio = context();
    if (!audio || !started || !master || !soundOn || audio.state !== "running") return;
    const { dur = 0.12, freq = 240, type = "bandpass", gain = 0.2, q = 0.8, from = null, to = null } = opts;
    const src = audio.createBufferSource();
    src.buffer = noise(dur + 0.05);
    const filter = audio.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = audio.createGain();
    const t = audio.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain || master);
    src.start(t);
    src.stop(t + dur + 0.02);
    if (from != null) {
      const osc = audio.createOscillator();
      osc.type = "sine";
      const og = audio.createGain();
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to || from), t + dur);
      og.gain.setValueAtTime(gain * 0.45, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(og);
      og.connect(sfxGain || master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  function ensureWind() {
    const audio = context();
    if (!audio || windGain) return;
    const src = audio.createBufferSource();
    src.buffer = noise(2);
    src.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    windGain = audio.createGain();
    windGain.gain.value = 0.045;
    src.connect(filter);
    filter.connect(windGain);
    windGain.connect(bedGain || master);
    src.start();
  }

  let musicTimer = null;
  let bedName = "trail";
  let stackGain = null;
  let stackTimer = null;
  let stackBeat = 0;

  function ensureMusic() {
    const audio = context();
    if (!audio || bedName !== "trail") return;
    if (!musicGain) {
      musicGain = audio.createGain();
      musicGain.connect(bedGain || master);
      const drone = audio.createOscillator();
      drone.type = "triangle";
      drone.frequency.value = 110;
      const dg = audio.createGain();
      dg.gain.value = 0.35;
      drone.connect(dg);
      dg.connect(musicGain);
      drone.start();
    }
    musicGain.gain.value = 0.035;
    if (musicTimer) return;
    const notes = [220, 247, 262, 294, 330, 294, 262, 247];
    let i = 0;
    const tick = () => {
      if (!ctx || !musicGain || bedName !== "trail") {
        musicTimer = null;
        return;
      }
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const g = ctx.createGain();
      const t = ctx.currentTime;
      const f = notes[i % notes.length] * (tension > 0.5 ? 0.5 : 1);
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(tension > 0.5 ? 0.22 : 0.16, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (tension > 0.5 ? 0.42 : 0.7));
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.8);
      i++;
      musicTimer = window.setTimeout(tick, tension > 0.5 ? 480 : 860);
    };
    tick();
  }

  function muteMusic() {
    if (musicTimer) {
      clearTimeout(musicTimer);
      musicTimer = null;
    }
    if (musicGain) musicGain.gain.value = 0;
  }

  function tone(freq, dur, gain, type = "sine") {
    const audio = context();
    if (!audio || !started || !soundOn || audio.state !== "running") return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = audio.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(sfxGain || master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function ensureStackBed() {
    const audio = context();
    if (!audio || !started) return;
    muteMusic();
    if (windGain) windGain.gain.value = 0;
    if (!stackGain) {
      stackGain = audio.createGain();
      stackGain.connect(bedGain || master);
      const wind = audio.createBufferSource();
      wind.buffer = noise(3);
      wind.loop = true;
      const windFilter = audio.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 640;
      const windG = audio.createGain();
      windG.gain.value = 0.08;
      wind.connect(windFilter);
      windFilter.connect(windG);
      windG.connect(stackGain);
      wind.start();

      const hiss = audio.createBufferSource();
      hiss.buffer = noise(2);
      hiss.loop = true;
      const hissFilter = audio.createBiquadFilter();
      hissFilter.type = "highpass";
      hissFilter.frequency.value = 1600;
      const hissG = audio.createGain();
      hissG.gain.value = 0.028;
      hiss.connect(hissFilter);
      hissFilter.connect(hissG);
      hissG.connect(stackGain);
      hiss.start();

      const creak = audio.createBufferSource();
      creak.buffer = noise(4);
      creak.loop = true;
      const creakFilter = audio.createBiquadFilter();
      creakFilter.type = "bandpass";
      creakFilter.frequency.value = 160;
      creakFilter.Q.value = 3.2;
      const creakG = audio.createGain();
      creakG.gain.value = 0.018;
      const creakLfo = audio.createOscillator();
      creakLfo.frequency.value = 0.17;
      const creakLfoG = audio.createGain();
      creakLfoG.gain.value = 0.03;
      creakLfo.connect(creakLfoG);
      creakLfoG.connect(creakG.gain);
      creak.connect(creakFilter);
      creakFilter.connect(creakG);
      creakG.connect(stackGain);
      creak.start();
      creakLfo.start();

      const flap = audio.createBufferSource();
      flap.buffer = noise(2);
      flap.loop = true;
      const flapFilter = audio.createBiquadFilter();
      flapFilter.type = "bandpass";
      flapFilter.frequency.value = 380;
      flapFilter.Q.value = 0.6;
      const flapG = audio.createGain();
      flapG.gain.value = 0.012;
      const flapLfo = audio.createOscillator();
      flapLfo.frequency.value = 1.15;
      const flapLfoG = audio.createGain();
      flapLfoG.gain.value = 0.045;
      flapLfo.connect(flapLfoG);
      flapLfoG.connect(flapG.gain);
      flap.connect(flapFilter);
      flapFilter.connect(flapG);
      flapG.connect(stackGain);
      flap.start();
      flapLfo.start();
    }
    stackGain.gain.value = 1;
    if (stackTimer) return;
    const beat = () => {
      if (!ctx || !stackGain) {
        stackTimer = null;
        return;
      }
      stackBeat += 1;
      if (bedName === "stack") {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(46, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(g);
        g.connect(stackGain);
        osc.start(t);
        osc.stop(t + 0.34);
        if (stackBeat % 9 === 0) playClank();
        if (stackBeat % 13 === 4) playSquawk();
        if (stackBeat % 17 === 0) horn();
        if (stackBeat % 23 === 11) playBleat();
      }
      stackTimer = window.setTimeout(beat, 850);
    };
    beat();
  }

  function horn() {
    tone(196, 0.55, 0.08, "sawtooth");
    window.setTimeout(() => tone(146, 0.7, 0.07, "sawtooth"), 280);
  }

  function playClank() {
    burst({ dur: 0.09, freq: 1400, type: "highpass", gain: 0.12, q: 2, from: 520, to: 180 });
  }

  function playSquawk() {
    tone(880, 0.08, 0.07, "square");
    tone(640, 0.12, 0.05, "square");
  }

  function playBleat() {
    tone(420, 0.18, 0.06, "triangle");
    tone(310, 0.22, 0.05, "sawtooth");
  }

  let pulseGain = null;
  let pulseTimer = null;
  let oldmanGain = null;
  let oldmanWindFilter = null;
  let oldmanTimer = null;
  let thorneGain = null;
  let thorneTimer = null;
  let moodDread = 0;
  let moodFire = 0;

  function addPartial(audio, freq, level, wobble) {
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = audio.createGain();
    g.gain.value = level;
    if (wobble) {
      const lfo = audio.createOscillator();
      lfo.frequency.value = wobble;
      const lg = audio.createGain();
      lg.gain.value = level * 0.42;
      lfo.connect(lg);
      lg.connect(g.gain);
      lfo.start();
    }
    osc.connect(g);
    g.connect(pulseGain);
    osc.start();
  }

  function particle(freq) {
    if (!ctx || !pulseGain || !soundOn || ctx.state !== "running" || bedName !== "pulse") return;
    const t = ctx.currentTime;
    const dur = 0.28 + Math.random() * 0.34;
    const peak = 0.05;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(pulseGain);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    const src = ctx.createBufferSource();
    src.buffer = noise(0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(peak * 0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(filter);
    filter.connect(ng);
    ng.connect(pulseGain);
    src.start(t);
    src.stop(t + 0.16);
  }

  function ensurePulseBed() {
    const audio = context();
    // iOS stays silent if a node is started while the context is still suspended.
    if (!audio || !started || audio.state !== "running") return;
    muteMusic();
    if (windGain) windGain.gain.value = 0;
    if (stackGain) stackGain.gain.value = 0;
    if (!pulseGain) {
      pulseGain = audio.createGain();
      pulseGain.connect(bedGain || master);
      // Low hum, plus harmonics a phone speaker can actually move.
      addPartial(audio, 55, 0.04, 0.07);
      addPartial(audio, 110, 0.045, 0.05);
      addPartial(audio, 165, 0.05, 0.09);
      addPartial(audio, 220, 0.055, 0.06);
      addPartial(audio, 330, 0.03, 0.11);
      // Two close tones beat against each other. That is the shimmer, not a melody.
      addPartial(audio, 590, 0.02, 0.13);
      addPartial(audio, 596, 0.018, 0.17);
      addPartial(audio, 884, 0.012, 0.08);
      const air = audio.createBufferSource();
      air.buffer = noise(2);
      air.loop = true;
      const airFilter = audio.createBiquadFilter();
      airFilter.type = "bandpass";
      airFilter.frequency.value = 1800;
      airFilter.Q.value = 0.6;
      const airG = audio.createGain();
      airG.gain.value = 0.028;
      air.connect(airFilter);
      airFilter.connect(airG);
      airG.connect(pulseGain);
      air.start();
    }
    pulseGain.gain.value = 1;
    if (pulseTimer) return;
    const bells = [617, 873, 1049, 1480, 1760, 2217, 2637];
    const tick = () => {
      if (!ctx || !pulseGain) {
        pulseTimer = null;
        return;
      }
      if (bedName === "pulse") particle(bells[Math.floor(Math.random() * bells.length)]);
      pulseTimer = window.setTimeout(tick, 900 + Math.random() * 1400);
    };
    tick();
  }

  function applyMaster() {
    if (!master || !ctx) return;
    const t = ctx.currentTime || 0;
    const level = soundOn ? 0.8 : 0;
    try {
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(level, t);
    } catch {
      master.gain.value = level;
    }
  }

  function bugle() {
    burst({ dur: 0.55, freq: 520, type: "bandpass", gain: 0.07, q: 4, from: 340, to: 520 });
  }

  function bellow(amount = 0.5) {
    const gain = 0.08 + amount * 0.2;
    const from = Math.max(48, 96 - amount * 36);
    burst({ dur: 0.7 + amount * 0.35, freq: 80, type: "lowpass", gain, q: 0.7, from, to: 40 });
  }

  function howl() {
    burst({ dur: 0.85, freq: 640, type: "bandpass", gain: 0.08, q: 3, from: 380, to: 720 });
  }

  function chorus() {
    bellow(1);
    window.setTimeout(() => bellow(0.8), 160);
    window.setTimeout(() => bellow(1), 340);
    window.setTimeout(() => bellow(0.65), 520);
  }

  function ensureOldmanBed() {
    const audio = context();
    // iOS stays silent if a node is started while the context is still suspended.
    if (!audio || !started || audio.state !== "running") return;
    muteMusic();
    if (windGain) windGain.gain.value = 0;
    if (stackGain) stackGain.gain.value = 0;
    if (pulseGain) pulseGain.gain.value = 0;
    if (!oldmanGain) {
      oldmanGain = audio.createGain();
      oldmanGain.connect(bedGain || master);
      const src = audio.createBufferSource();
      src.buffer = noise(3);
      src.loop = true;
      oldmanWindFilter = audio.createBiquadFilter();
      oldmanWindFilter.type = "lowpass";
      oldmanWindFilter.frequency.value = 460;
      const g = audio.createGain();
      g.gain.value = 0.085;
      src.connect(oldmanWindFilter);
      oldmanWindFilter.connect(g);
      g.connect(oldmanGain);
      src.start();
    }
    oldmanGain.gain.value = 1;
    if (oldmanTimer) return;
    const tick = () => {
      if (!ctx || !oldmanGain) {
        oldmanTimer = null;
        return;
      }
      if (bedName === "oldman" && soundOn && ctx.state === "running") {
        burst({
          dur: 0.45 + Math.random() * 0.55,
          freq: 480,
          type: "lowpass",
          gain: 0.07 + Math.random() * 0.08 + moodDread * 0.06,
          q: 0.45,
          from: 120,
          to: 60,
        });
        if (oldmanWindFilter) oldmanWindFilter.frequency.value = 300 + Math.random() * 380 + moodDread * 80;
        if (moodFire > 0.18 && Math.random() < 0.8) {
          burst({ dur: 0.07, freq: 2200, type: "highpass", gain: 0.035 * moodFire, q: 0.55 });
        }
        if (moodDread < 0.32 && Math.random() < 0.34) bugle();
        if (moodDread > 0.16 && Math.random() < 0.25 + moodDread * 0.4) bellow(moodDread);
        if (moodDread > 0.42 && Math.random() < 0.38) howl();
      }
      oldmanTimer = window.setTimeout(tick, 1500 + Math.random() * 2100);
    };
    tick();
  }

  function ensureThorneBed() {
    const audio = context();
    if (!audio || !started || audio.state !== "running") return;
    muteMusic();
    if (windGain) windGain.gain.value = 0;
    if (stackGain) stackGain.gain.value = 0;
    if (pulseGain) pulseGain.gain.value = 0;
    if (oldmanGain) oldmanGain.gain.value = 0;
    if (!thorneGain) {
      thorneGain = audio.createGain();
      thorneGain.connect(bedGain || master);
      const hum = audio.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 120;
      const humG = audio.createGain();
      humG.gain.value = 0.018;
      hum.connect(humG);
      humG.connect(thorneGain);
      hum.start();
      const src = audio.createBufferSource();
      src.buffer = noise(3);
      src.loop = true;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 180;
      filter.Q.value = 0.7;
      const buzz = audio.createGain();
      buzz.gain.value = 0.012;
      src.connect(filter);
      filter.connect(buzz);
      buzz.connect(thorneGain);
      src.start();
    }
    thorneGain.gain.value = 1;
    if (thorneTimer) return;
    const tick = () => {
      if (!ctx || !thorneGain) {
        thorneTimer = null;
        return;
      }
      if (bedName === "thorne" && soundOn && ctx.state === "running") {
        const clicks = 1 + Math.floor(moodDread * 3 + moodFire * 2);
        for (let i = 0; i < clicks; i++) {
          burst({ dur: 0.02, freq: 2800, type: "highpass", gain: 0.035 + moodFire * 0.02, q: 1.2 });
        }
        if (Math.random() < 0.55) {
          burst({ dur: 0.09, freq: 480, type: "bandpass", gain: 0.04, q: 3.2, from: 620, to: 180 });
        }
        if (Math.random() < 0.4) {
          burst({ dur: 0.16, freq: 1600, type: "highpass", gain: 0.03, q: 0.8, from: 1800, to: 700 });
        }
        if (moodFire > 0.25 && Math.random() < 0.45) {
          burst({ dur: 0.45, freq: 2400, type: "bandpass", gain: 0.02 * moodFire, q: 8, from: 1900, to: 2600 });
        }
        if (Math.random() < 0.18) {
          burst({ dur: 0.08, freq: 3200, type: "highpass", gain: 0.025, q: 0.5 });
        }
        if (moodDread > 0.2 && Math.random() < 0.22) {
          burst({ dur: 0.4, freq: 55, type: "lowpass", gain: 0.1, from: 70, to: 28 });
        }
        if (Math.random() < 0.12) {
          burst({ dur: 0.45, freq: 200, type: "bandpass", gain: 0.05, q: 1.6, from: 240, to: 80 });
        }
      }
      thorneTimer = window.setTimeout(tick, 700 + Math.random() * 900);
    };
    tick();
  }

  function applyBed() {
    if (!started) return;
    const audio = ctx;
    if (audio && audio.state !== "running") return;
    if (bedName === "stack") {
      if (pulseGain) pulseGain.gain.value = 0;
      if (oldmanGain) oldmanGain.gain.value = 0;
      if (thorneGain) thorneGain.gain.value = 0;
      ensureStackBed();
    } else if (bedName === "pulse") {
      if (stackGain) stackGain.gain.value = 0;
      if (oldmanGain) oldmanGain.gain.value = 0;
      if (thorneGain) thorneGain.gain.value = 0;
      ensurePulseBed();
    } else if (bedName === "oldman") {
      if (stackGain) stackGain.gain.value = 0;
      if (pulseGain) pulseGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      if (thorneGain) thorneGain.gain.value = 0;
      ensureOldmanBed();
    } else if (bedName === "thorne") {
      if (stackGain) stackGain.gain.value = 0;
      if (pulseGain) pulseGain.gain.value = 0;
      if (oldmanGain) oldmanGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      ensureThorneBed();
    } else {
      if (stackGain) stackGain.gain.value = 0;
      if (pulseGain) pulseGain.gain.value = 0;
      if (oldmanGain) oldmanGain.gain.value = 0;
      if (thorneGain) thorneGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0.045;
      ensureWind();
      ensureMusic();
    }
  }

  function lock() {
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    const ready = gate.then(() => release, () => release);
    gate = gate.then(() => held, () => held);
    return ready;
  }

  function sleep(ms) {
    return new Promise((resolve) => { window.setTimeout(resolve, ms); });
  }

  function ensureMedia() {
    if (mediaEl) return mediaEl;
    mediaEl = new Audio();
    mediaEl.playsInline = true;
    mediaEl.setAttribute("playsinline", "");
    mediaEl.setAttribute("webkit-playsinline", "true");
    mediaEl.preload = "none";
    mediaEl.setAttribute("aria-hidden", "true");
    mediaEl.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none";
    if (document.body) document.body.appendChild(mediaEl);
    return mediaEl;
  }

  function hookMedia() {
    const audio = context();
    if (!audio || !mediaEl || mediaNode) return;
    try {
      mediaNode = audio.createMediaElementSource(mediaEl);
      mediaNode.connect(voiceGain || master);
    } catch { mediaNode = null; }
  }

  function voiceLevel() {
    const v = voiceGain ? voiceGain.gain.value : 0.95;
    const m = master ? master.gain.value : 0.8;
    return Math.max(0, Math.min(1, v * m));
  }

  function primeMedia() {
    if (mediaUnlocked) return Promise.resolve(true);
    if (voiceOwner) return Promise.resolve(false);
    if (primeP) return primeP;
    const el = ensureMedia();
    hookMedia();
    el.src = SILENT_WAV;
    const gen = ++mediaGen;
    primeP = new Promise((resolve) => {
      const finish = (ok) => {
        if (gen !== mediaGen) { primeP = null; resolve(false); return; }
        if (ok) {
          mediaUnlocked = true;
          try { el.pause(); } catch { /* the gesture already counted */ }
        }
        primeP = null;
        resolve(!!ok);
      };
      try {
        const played = el.play();
        if (played && played.then) played.then(() => finish(true)).catch(() => finish(false));
        else finish(true);
      } catch { finish(false); }
    });
    return primeP;  }

  function playElement(url) {
    return new Promise((resolve) => {
      const el = ensureMedia();
      hookMedia();
      mediaGen += 1;
      if (!mediaNode) el.volume = voiceLevel();
      else el.volume = 1;
      speaking = true;
      setDuck(true);
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        speaking = false;
        setDuck(false);
        resolve(ok);
      };
      el.onended = () => finish(true);
      el.onerror = () => finish(false);
      el.src = url;
      const played = el.play();
      if (played && played.then) played.then(() => { mediaUnlocked = true; }).catch(() => {});
      if (played && played.catch) played.catch(() => finish(false));
    });
  }

  function playCompanionElement(url, gen) {
    return new Promise((resolve) => {
      const el = ensureMedia();
      hookMedia();
      if (!mediaNode) el.volume = voiceLevel();
      else el.volume = 1;
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        if (companionCancel === cancel) companionCancel = null;
        if (gen === companionGen && voiceOwner === "companion") {
          speaking = false;
          setDuck(false);
          voiceOwner = null;
        }
        resolve(result);
      };
      const cancel = () => {
        try { el.pause(); } catch { /* already quiet */ }
        el.onended = null;
        el.onerror = null;
        finish(false);
      };
      companionCancel = cancel;
      el.onended = () => finish(gen === companionGen);
      el.onerror = () => finish(false);
      speaking = true;
      voiceOwner = "companion";
      setDuck(true);
      mediaGen += 1;
      try { el.pause(); } catch { /* ignore */ }
      el.src = url;
      let played = null;
      try { played = el.play(); } catch (err) {
        const blocked = err && err.name === "NotAllowedError";
        finish(blocked ? "blocked" : false);
        return;
      }
      if (played && played.then) {
        played.then(() => { mediaUnlocked = true; }).catch((err) => {
          const blocked = err && (err.name === "NotAllowedError" || err.name === "AbortError");
          finish(blocked ? "blocked" : false);
        });
      }
    });
  }

  async function playCompanion(url) {
    const gen = ++companionGen;
    if (companionCancel) companionCancel();
    if (voiceOwner === "companion") {
      voiceOwner = null;
      speaking = false;
      setDuck(false);
    }
    await whenUnlocked();
    if (gen !== companionGen) return false;
    let result = "blocked";
    let tries = 0;
    while (result === "blocked" && gen === companionGen && tries < 4) {
      tries += 1;
      if (primeP) await primeP;
      if (!mediaUnlocked) {
        await new Promise((resolve) => {
          const timer = window.setInterval(() => {
            if (mediaUnlocked || gen !== companionGen) {
              window.clearInterval(timer);
              resolve();
            }
          }, 40);
        });
      }
      if (gen !== companionGen) return false;
      const release = await lock();
      try {
        if (gen !== companionGen) return false;
        voiceOwner = "companion";
        result = await playCompanionElement(url, gen);
      } finally {
        if (voiceOwner === "companion") voiceOwner = null;
        release();
      }
    }
    return result === true;
  }

  async function playOne(url) {
    await whenUnlocked();
    const audio = context();
    if (!audio || !started) return false;
    try {
      let decoded = clipCache.get(url);
      if (!decoded) {
        const res = await fetch(url);
        if (!res.ok) return false;
        const raw = await res.arrayBuffer();
        decoded = await audio.decodeAudioData(raw.slice(0));
        clipCache.set(url, decoded);
      }
      return await new Promise((resolve) => {
        if (voiceSrc) {
          try { voiceSrc.onended = null; voiceSrc.stop(); } catch { /* already ended */ }
          voiceSrc = null;
        }
        const src = audio.createBufferSource();
        src.buffer = decoded;
        src.connect(voiceGain || master);
        voiceSrc = src;
        speaking = true;
        setDuck(true);
        const finish = (ok) => {
          if (voiceSrc === src) voiceSrc = null;
          speaking = false;
          setDuck(false);
          resolve(ok);
        };
        src.onended = () => finish(true);
        try { src.start(); } catch { finish(false); }
      });
    } catch {
      return playElement(url);
    }
  }

  return {
    unlock() {
      const audio = context();
      if (!audio) return;
      started = true;
      whenUnlocked();
      // resume() has to run inside the tap. iOS drops a context that only resumes later.
      if (audio.state !== "running" && audio.resume) audio.resume();
      if (!primed) {
        primed = true;
        try {
          const blip = audio.createBufferSource();
          blip.buffer = audio.createBuffer(1, 1, audio.sampleRate || 44100);
          blip.connect(master);
          blip.start(0);
        } catch { /* a suspended context still accepts the gesture */ }
      }
      primeMedia();
      const go = () => {
        if (!ctx || ctx.state !== "running") return;
        try {
          applyBed();
        } catch { /* headless audio can refuse a node; the picture still plays */ }
        if (markUnlocked) {
          const done = markUnlocked;
          markUnlocked = null;
          done();
        }
      };
      if (audio.state === "running") go();
      else if (audio.resume) audio.resume().then(go).catch(go);
      else go();
    },
    sound(on) {
      if (typeof on === "boolean") soundOn = on;
      applyMaster();
      return soundOn;
    },
    speaking() { return speaking; },
    levels() {
      return {
        sfx: sfxGain ? sfxGain.gain.value : null,
        bed: bedGain ? bedGain.gain.value : null,
        ducked,
        speaking,
        owner: voiceOwner,
      };
    },
    playClip(url) {
      return (async () => {
        const release = await lock();
        voiceOwner = "narration";
        try { return await playOne(url); }
        finally {
          if (voiceOwner === "narration") voiceOwner = null;
          release();
        }
      })();
    },
    playCompanion,
    cancelCompanion() {
      companionGen += 1;
      if (companionCancel) companionCancel();
      if (voiceOwner === "companion") {
        voiceOwner = null;
        speaking = false;
        setDuck(false);
      }
    },
    warm(urls) {
      const queue = (urls || []).filter(Boolean);
      const run = () => {
        const url = queue.shift();
        if (!url) return;
        fetch(url).catch(() => {}).finally(() => {
          const ric = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 70));
          ric(run);
        });
      };
      window.setTimeout(() => {
        const ric = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 0));
        ric(run);
      }, 1800);
    },
    setTension(v) { tension = v; },
    setBed(name) {
      bedName = name === "stack" ? "stack" : name === "pulse" ? "pulse" : name === "oldman" ? "oldman" : name === "thorne" ? "thorne" : "trail";
      applyBed();
    },
    setMood(dread, fire) {
      moodDread = Math.max(0, Math.min(1, dread || 0));
      moodFire = Math.max(0, Math.min(1, fire || 0));
    },
    bed() { return bedName; },
    thunder() { burst({ dur: 0.9, freq: 70, type: "lowpass", gain: 0.34, from: 80, to: 36 }); },
    bleat() { playBleat(); },
    squawk() { playSquawk(); },
    clank() { playClank(); },
    swing() { burst({ dur: 0.09, freq: 900, type: "highpass", gain: 0.12, q: 0.6 }); },
    whip() { burst({ dur: 0.16, freq: 1400, type: "bandpass", gain: 0.14, q: 1.4, from: 420, to: 180 }); },
    hiss() { burst({ dur: 0.28, freq: 2200, type: "highpass", gain: 0.1, q: 0.5 }); },
    pulse() { burst({ dur: 0.42, freq: 90, type: "lowpass", gain: 0.28, from: 140, to: 40 }); },
    firelight() { burst({ dur: 0.36, freq: 1600, type: "bandpass", gain: 0.16, q: 0.65, from: 240, to: 80 }); },
    argon() { burst({ dur: 0.24, freq: 1900, type: "bandpass", gain: 0.16, q: 7, from: 880, to: 2600 }); },
    rifle() { burst({ dur: 0.11, freq: 1500, type: "highpass", gain: 0.15, q: 1.1, from: 190, to: 70 }); },
    bugle() { bugle(); },
    howl() { howl(); },
    bellow() { bellow(moodDread || 0.4); },
    chorus() { chorus(); },
    hit() { burst({ dur: 0.1, freq: 180, type: "lowpass", gain: 0.28, from: 220, to: 70 }); },
    hurt() { burst({ dur: 0.16, freq: 140, type: "lowpass", gain: 0.22, from: 180, to: 60 }); },
    flash() { burst({ dur: 0.28, freq: 1400, type: "bandpass", gain: 0.16, q: 4, from: 660, to: 1320 }); },
    chest() { burst({ dur: 0.14, freq: 320, type: "bandpass", gain: 0.2, q: 2, from: 520, to: 180 }); },
    roar() { burst({ dur: 0.45, freq: 90, type: "lowpass", gain: 0.32, from: 90, to: 40 }); },
    dial() { burst({ dur: 0.16, freq: 480, type: "bandpass", gain: 0.14, q: 3, from: 240, to: 720 }); },
    staticBurst() { burst({ dur: 0.55, freq: 2200, type: "highpass", gain: 0.14, q: 0.35 }); },
    step() {
      const now = performance.now();
      if (now - stepAt < 280) return;
      stepAt = now;
      if (bedName === "oldman") {
        burst({ dur: 0.06, freq: 1400, type: "highpass", gain: 0.04, q: 0.7, from: 160, to: 70 });
        return;
      }
      if (bedName === "thorne") {
        burst({ dur: 0.04, freq: 900, type: "highpass", gain: 0.035, q: 0.8 });
        return;
      }
      burst({ dur: 0.05, freq: 160, type: "lowpass", gain: 0.05 });
    },
    jump() { burst({ dur: 0.08, freq: 420, type: "bandpass", gain: 0.08, q: 0.7, from: 280, to: 520 }); },
    parry() { burst({ dur: 0.12, freq: 1400, type: "highpass", gain: 0.2, q: 2, from: 880, to: 220 }); },
    guard() { burst({ dur: 0.07, freq: 240, type: "lowpass", gain: 0.16, from: 160, to: 90 }); },
    heal() { burst({ dur: 0.22, freq: 660, type: "bandpass", gain: 0.12, q: 3, from: 520, to: 990 }); },
    coin() { burst({ dur: 0.06, freq: 1200, type: "highpass", gain: 0.08, q: 2, from: 880, to: 1320 }); },
    wind() { burst({ dur: 0.32, freq: 700, type: "bandpass", gain: 0.16, q: 0.6, from: 240, to: 90 }); },
    finisher() { burst({ dur: 0.16, freq: 110, type: "lowpass", gain: 0.34, from: 180, to: 48 }); },
    level() { burst({ dur: 0.28, freq: 520, type: "bandpass", gain: 0.14, q: 4, from: 440, to: 880 }); },
    dispose() {
      if (musicTimer) clearTimeout(musicTimer);
      if (stackTimer) clearTimeout(stackTimer);
      if (pulseTimer) clearTimeout(pulseTimer);
      if (oldmanTimer) clearTimeout(oldmanTimer);
      if (thorneTimer) clearTimeout(thorneTimer);
      try { ctx && ctx.close(); } catch { /* ignore */ }
    },
  };
}
