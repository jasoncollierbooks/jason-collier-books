/* Generated room tone only. Wind, creaks, hums. No melody. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let nodes = [];
  let timer = null;
  let buffer = null;
  let muted = false;

  function context() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.42;
      master.connect(ctx.destination);
      const n = ctx.sampleRate * 2;
      buffer = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        last = last * 0.96 + w * 0.04;
        d[i] = last * 2.4;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noise(freq, q, gain) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(master);
    src.start();
    nodes.push(src);
    return g;
  }

  function tone(freq, gain, type) {
    const o = ctx.createOscillator();
    o.type = type || "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    o.connect(g).connect(master);
    o.start();
    nodes.push(o);
    return g;
  }

  function burst(freq, dur, gain) {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } });
    nodes = [];
  }

  function ticks(every, freq, gain) {
    timer = setInterval(() => {
      if (muted || !ctx) return;
      burst(freq, 0.05 + Math.random() * 0.08, gain * (0.4 + Math.random()));
    }, every);
  }

  return {
    resume() { context(); },
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = v ? 0 : 0.42;
    },
    stop,
    play(kind) {
      if (!context()) return;
      stop();
      if (kind === "wind") {
        noise(380, 0.35, 0.22);
        ticks(2400, 180, 0.08);
      } else if (kind === "woods") {
        noise(720, 0.5, 0.12);
        noise(220, 0.4, 0.08);
        ticks(1800, 140, 0.07);
      } else if (kind === "mountain") {
        noise(280, 0.3, 0.28);
        ticks(700, 900, 0.05);
      } else if (kind === "ship") {
        noise(110, 0.6, 0.2);
        noise(1800, 0.4, 0.04);
        ticks(1600, 420, 0.09);
      } else if (kind === "hum") {
        tone(46, 0.045);
        tone(49, 0.03);
        noise(900, 0.3, 0.03);
      } else if (kind === "lab") {
        tone(60, 0.03);
        noise(1400, 0.5, 0.025);
        ticks(900, 2400, 0.04);
      } else if (kind === "seed") {
        tone(90, 0.025);
        noise(1500, 0.45, 0.04);
      } else if (kind === "void") {
        tone(40, 0.04);
        noise(500, 0.2, 0.03);
        ticks(2600, 3200, 0.035);
      } else {
        noise(500, 0.3, 0.05);
      }
    },
  };
}
