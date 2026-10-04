(function () {
  var reduce = document.documentElement.classList.contains("reduce-motion");
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) reduce = true;
  } catch (e) {}

  var year = document.getElementById("y");
  if (year) year.textContent = String(new Date().getFullYear());

  var nav = document.getElementById("nav");
  if (nav) {
    var btn = nav.querySelector(".nav-toggle");
    var groups = Array.prototype.slice.call(nav.querySelectorAll(".nav-group"));
    var desktop = function () { return window.matchMedia("(min-width: 861px)").matches; };
    var closeGroups = function (except) {
      groups.forEach(function (g) {
        if (g === except) return;
        g.classList.remove("is-open");
        var b = g.querySelector(".nav-label");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    };
    var setMenu = function (open) {
      nav.classList.toggle("open", open);
      if (!btn) return;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
      if (!open) closeGroups();
    };
    if (btn) btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    groups.forEach(function (g) {
      var b = g.querySelector(".nav-label");
      var links = Array.prototype.slice.call(g.querySelectorAll(".nav-menu a"));
      if (!b) return;
      b.addEventListener("click", function () {
        var willOpen = !g.classList.contains("is-open");
        closeGroups(willOpen ? g : null);
        g.classList.toggle("is-open", willOpen);
        b.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowDown") return;
        e.preventDefault();
        closeGroups(g);
        g.classList.add("is-open");
        b.setAttribute("aria-expanded", "true");
        if (links[0]) links[0].focus();
      });
      links.forEach(function (a, i) {
        a.addEventListener("keydown", function (e) {
          if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length].focus(); }
          if (e.key === "ArrowUp") { e.preventDefault(); (i === 0 ? b : links[i - 1]).focus(); }
          if (e.key === "Escape") { closeGroups(); b.focus(); }
        });
      });
    });
    nav.querySelectorAll(".nav-menu a, a.nav-link").forEach(function (a) {
      a.addEventListener("click", function () {
        closeGroups();
        if (!desktop()) setMenu(false);
      });
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) {
        closeGroups();
        if (!desktop()) setMenu(false);
      }
    });
    window.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var openGroup = groups.filter(function (g) { return g.classList.contains("is-open"); })[0];
      if (openGroup) {
        var b = openGroup.querySelector(".nav-label");
        closeGroups();
        if (b) b.focus();
        return;
      }
      if (nav.classList.contains("open")) { setMenu(false); if (btn) btn.focus(); }
    });
    window.addEventListener("resize", function () { if (desktop()) setMenu(false); });
  }

  /* Typewriter sounds follow the teletype. No-ops until a gesture unlocks audio. */
  var typeAudio = { keys: function () {}, carriage: function () {} };
  try { typeAudio = setupTypewriterAudio(reduce); } catch (e) {}

  if (!reduce && "IntersectionObserver" in window) {
    var jobs = [];
    var timer = 0;
    function tick() {
      var pending = false;
      jobs = jobs.filter(function (job) {
        if (job.i >= job.text.length) {
          job.el.classList.add("is-done");
          if (job.text.length) {
            try { typeAudio.carriage(); } catch (e) {}
          }
          return false;
        }
        var typedFrom = job.i;
        job.i += job.text.length > 90 ? 2 : 1;
        job.live.textContent = job.text.slice(0, job.i);
        try { typeAudio.keys(job.text, typedFrom, job.i); } catch (e) {}
        pending = true;
        return true;
      });
      if (pending) timer = window.setTimeout(tick, 16);
      else timer = 0;
    }
    function start(el) {
      var full = el.querySelector(".tele-full");
      var live = el.querySelector(".tele-live");
      if (!full || !live) return;
      el.classList.add("is-armed");
      jobs.push({ el: el, live: live, text: full.textContent, i: 0 });
      if (!timer) tick();
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        start(en.target);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -5% 0px" });
    Array.prototype.forEach.call(document.querySelectorAll(".teletype"), function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) return;
      el.classList.add("is-armed");
      io.observe(el);
    });
  }

  /* Original Web Audio synthesis (no sample files): key clack, softer space thunk,
     and a bell plus carriage zip at the end of each typed block or line.
     Kept in this file so a missing asset cannot break the teletype. */
  function setupTypewriterAudio(reduceMotion) {
    var KEY = "jc-type-sound";
    var VOICES = 4;
    var CLACK_GAP = 1 / 25;
    var soundBtn = document.getElementById("type-sound");
    var soundLabel = soundBtn ? soundBtn.querySelector(".static-label") : null;
    var staticBtn = document.getElementById("static-btn");
    var enabled = true;
    try { enabled = localStorage.getItem(KEY) !== "0"; } catch (e) { enabled = true; }

    var ctx = null;
    var unlocked = false;
    var priming = false;
    var built = false;
    var waiters = [];
    var master = null;
    var voices = [];
    var voiceUntil = [];
    var lastKeyAt = -1;
    var lastCarriage = -1;
    var clacks = null;
    var thunkBuf = null;
    var dingBuf = null;
    var zipBuf = null;
    var dingGain = null;
    var zipGain = null;
    var staticGain = null;
    var staticOn = false;

    function paint() {
      if (!soundBtn) return;
      soundBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
      soundBtn.setAttribute("aria-label", enabled ? "Typewriter sounds on" : "Typewriter sounds off");
      if (soundLabel) soundLabel.textContent = enabled ? "Sound" : "Muted";
    }
    paint();

    function ctor() {
      try { if (window.AudioContext) return window.AudioContext; } catch (e) {}
      try { if (window.webkitAudioContext) return window.webkitAudioContext; } catch (e) {}
      return null;
    }

    function listen(type, fn, capture) {
      try {
        document.addEventListener(type, fn, { capture: !!capture, passive: true });
      } catch (e) {
        try { document.addEventListener(type, fn, !!capture); } catch (e2) {}
      }
    }

    function audible() {
      return !!(enabled && unlocked && ctx && ctx.state === "running" && document.visibilityState !== "hidden");
    }

    function applyGain() {
      if (!master || !ctx) return;
      var level = audible() ? 1 : 0;
      var now = ctx.currentTime || 0;
      try { master.gain.setValueAtTime(level, now); } catch (e) {
        try { master.gain.value = level; } catch (e2) {}
      }
    }

    function primeSilent() {
      var buf = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }

    function ready() {
      if (!built) {
        try {
          if (!reduceMotion) buildSounds();
          built = true;
          try { document.removeEventListener("touchmove", onGesture, true); } catch (e) {}
        } catch (e) {
          master = null;
          voices = [];
          voiceUntil = [];
        }
      }
      unlocked = true;
      priming = false;
      applyGain();
      var q = waiters;
      waiters = [];
      for (var i = 0; i < q.length; i++) {
        try { q[i](); } catch (e) {}
      }
    }

    function unlock(done) {
      if (typeof done === "function") waiters.push(done);
      try {
        var AC = ctor();
        if (!AC) return;
        if (!ctx) {
          ctx = new AC();
          try {
            ctx.onstatechange = function () { try { applyGain(); } catch (e) {} };
          } catch (e) {}
        }
        if (ctx.state === "running") { ready(); return; }
        if (priming) return;
        priming = true;
        primeSilent();
        var p = ctx.resume && ctx.resume();
        var settled = function () {
          priming = false;
          if (ctx && ctx.state === "running") ready();
        };
        if (ctx.state === "running") settled();
        else if (p && typeof p.then === "function") {
          p.then(settled).catch(function () { priming = false; });
        } else priming = false;
        window.setTimeout(function () { priming = false; }, 800);
      } catch (e) { priming = false; }
    }

    function onGesture() { unlock(); }
    listen("pointerdown", onGesture, true);
    listen("touchstart", onGesture, true);
    listen("touchend", onGesture, true);
    listen("touchmove", onGesture, true);
    listen("keydown", onGesture, true);
    listen("click", onGesture, true);

    document.addEventListener("visibilitychange", function () {
      try { applyGain(); } catch (e) {}
    });

    function lcg(seed) {
      var s = seed >>> 0;
      return function () {
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }

    function normalize(data, peak) {
      var max = 0;
      var i, a;
      for (i = 0; i < data.length; i++) {
        a = data[i] < 0 ? -data[i] : data[i];
        if (a > max) max = a;
      }
      if (!(max > 0)) return;
      var g = peak / max;
      for (i = 0; i < data.length; i++) data[i] *= g;
    }

    function fadeEdges(data, sr, inSec, outSec) {
      var nIn = Math.max(1, Math.floor(sr * inSec));
      var nOut = Math.max(1, Math.floor(sr * outSec));
      var i;
      for (i = 0; i < nIn && i < data.length; i++) data[i] *= i / nIn;
      for (i = 0; i < nOut && i < data.length; i++) data[data.length - 1 - i] *= i / nOut;
    }

    function makeClack(sr, seed, freq) {
      var n = Math.floor(sr * 0.062);
      var data = new Float32Array(n);
      var rng = lcg(seed);
      var lp = 0;
      var strikeAt = 0.006 + (seed % 5) * 0.0011;
      var i, t, white, t2;
      for (i = 0; i < n; i++) {
        t = i / sr;
        white = rng() * 2 - 1;
        lp += (white - lp) * 0.62;
        data[i] = white * Math.exp(-t * 340) * 0.62
          + lp * Math.exp(-t * 52) * 0.34
          + Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 78) * 0.46
          + Math.sin(2 * Math.PI * freq * 1.79 * t) * Math.exp(-t * 110) * 0.16;
        t2 = t - strikeAt;
        if (t2 > 0) {
          data[i] += (rng() * 2 - 1) * Math.exp(-t2 * 280) * 0.72
            + Math.sin(2 * Math.PI * freq * 1.33 * t2) * Math.exp(-t2 * 130) * 0.26;
        }
      }
      fadeEdges(data, sr, 0.00035, 0.004);
      normalize(data, 0.9);
      return data;
    }

    function makeThunk(sr) {
      var n = Math.floor(sr * 0.048);
      var data = new Float32Array(n);
      var rng = lcg(3);
      var lp = 0;
      var i, t, white;
      for (i = 0; i < n; i++) {
        t = i / sr;
        white = rng() * 2 - 1;
        lp += (white - lp) * 0.1;
        data[i] = lp * Math.exp(-t * 34) * 0.9
          + Math.sin(2 * Math.PI * 108 * t) * Math.exp(-t * 26) * 0.55;
      }
      fadeEdges(data, sr, 0.001, 0.006);
      normalize(data, 0.5);
      return data;
    }

    function makeDing(sr) {
      var n = Math.floor(sr * 0.46);
      var data = new Float32Array(n);
      var rng = lcg(7);
      var f = 2489;
      var i, t;
      for (i = 0; i < n; i++) {
        t = i / sr;
        data[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3.5) * 0.72
          + Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 5.4) * 0.26
          + Math.sin(2 * Math.PI * f * 2.97 * t) * Math.exp(-t * 6.6) * 0.14
          + Math.sin(2 * Math.PI * f * 4.16 * t) * Math.exp(-t * 8.8) * 0.07
          + Math.sin(2 * Math.PI * f * 0.5 * t) * Math.exp(-t * 4.2) * 0.12
          + (rng() * 2 - 1) * Math.exp(-t * 200) * 0.18;
      }
      fadeEdges(data, sr, 0.002, 0.012);
      normalize(data, 0.85);
      return data;
    }

    function makeZip(sr) {
      var dur = 0.21;
      var n = Math.floor(sr * dur);
      var data = new Float32Array(n);
      var rng = lcg(99);
      var lp = 0;
      var phase = 0;
      var i, t, u, white, cut, env, freq;
      for (i = 0; i < n; i++) {
        t = i / sr;
        u = t / dur;
        white = rng() * 2 - 1;
        cut = 0.06 + 0.62 * Math.sin(Math.PI * u);
        lp += (white - lp) * cut;
        env = Math.sin(Math.PI * u);
        freq = 190 - 90 * u;
        phase += freq / sr;
        data[i] = lp * env * env * 0.85 + Math.sin(2 * Math.PI * phase) * env * 0.18;
        if (u > 0.84) {
          var t2 = (u - 0.84) / 0.16;
          data[i] += (rng() * 2 - 1) * (1 - t2) * 0.7
            + Math.sin(2 * Math.PI * 128 * t) * (1 - t2) * 0.35;
        }
      }
      fadeEdges(data, sr, 0.004, 0.008);
      normalize(data, 0.8);
      return data;
    }

    function toBuffer(data) {
      var buf = ctx.createBuffer(1, data.length, ctx.sampleRate || 44100);
      buf.getChannelData(0).set(data);
      return buf;
    }

    function buildSounds() {
      master = ctx.createGain();
      master.gain.value = 0;
      try {
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -3;
        comp.knee.value = 0;
        comp.ratio.value = 12;
        comp.attack.value = 0.001;
        comp.release.value = 0.04;
        master.connect(comp);
        comp.connect(ctx.destination);
      } catch (e) {
        try { master.connect(ctx.destination); } catch (e2) {}
      }
      var i, g;
      for (i = 0; i < VOICES; i++) {
        g = ctx.createGain();
        g.gain.value = 0;
        g.connect(master);
        voices.push(g);
        voiceUntil.push(0);
      }
      dingGain = ctx.createGain();
      dingGain.connect(master);
      zipGain = ctx.createGain();
      zipGain.connect(master);
      var sr = ctx.sampleRate || 44100;
      clacks = [
        toBuffer(makeClack(sr, 11, 1860)),
        toBuffer(makeClack(sr, 29, 2140)),
        toBuffer(makeClack(sr, 47, 2420)),
        toBuffer(makeClack(sr, 71, 1680))
      ];
      thunkBuf = toBuffer(makeThunk(sr));
      dingBuf = toBuffer(makeDing(sr));
      zipBuf = toBuffer(makeZip(sr));
    }

    function canPlay() {
      return !!(audible() && master && !reduceMotion);
    }

    function playVoice(buffer, volMin, volMax, rateMin, rateMax) {
      if (!buffer || !canPlay() || !voices.length) return;
      try {
        var now = ctx.currentTime;
        if (lastKeyAt >= 0 && now - lastKeyAt < CLACK_GAP) return;
        var slot = -1;
        var i;
        for (i = 0; i < voices.length; i++) {
          if (voiceUntil[i] <= now) { slot = i; break; }
        }
        if (slot < 0) return;
        var rate = rateMin + Math.random() * (rateMax - rateMin);
        var vol = volMin + Math.random() * (volMax - volMin);
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        voices[slot].gain.setValueAtTime(vol, now);
        src.connect(voices[slot]);
        src.start(now);
        voiceUntil[slot] = now + buffer.duration / rate;
        lastKeyAt = now;
        src.onended = function () { try { src.disconnect(); } catch (e) {} };
      } catch (e) {}
    }

    function playDirect(buffer, gainNode, when, rate, vol) {
      if (!buffer || !gainNode || !canPlay()) return;
      try {
        var t = when < ctx.currentTime ? ctx.currentTime : when;
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        gainNode.gain.setValueAtTime(vol, t);
        src.connect(gainNode);
        src.start(t);
        src.onended = function () { try { src.disconnect(); } catch (e) {} };
      } catch (e) {}
    }

    function clack() {
      if (!clacks || !clacks.length) return;
      playVoice(clacks[(Math.random() * clacks.length) | 0], 0.4, 0.56, 0.94, 1.07);
    }

    function thunk() {
      playVoice(thunkBuf, 0.2, 0.32, 0.88, 1.0);
    }

    function carriage() {
      if (!canPlay() || !dingBuf) return;
      var now = ctx.currentTime;
      if (lastCarriage >= 0 && now - lastCarriage < 0.45) return;
      lastCarriage = now;
      var bell = 0.98 + Math.random() * 0.05;
      playDirect(dingBuf, dingGain, now, bell, 0.4 + Math.random() * 0.08);
      playDirect(zipBuf, zipGain, now + 0.06, 0.96 + Math.random() * 0.08, 0.26 + Math.random() * 0.08);
    }

    function keys(text, from, to) {
      if (!canPlay() || !text) return;
      var end = to < text.length ? to : text.length;
      if (from < 0) from = 0;
      if (from >= end) return;
      var sawKey = false;
      var sawSpace = false;
      var sawReturn = false;
      var i, ch;
      for (i = from; i < end; i++) {
        ch = text.charAt(i);
        if (ch === "\n" || ch === "\r") {
          if (ch === "\n" && i > 0 && text.charAt(i - 1) === "\r") continue;
          if (i < text.length - 1) sawReturn = true;
        } else if (ch === " " || ch === "\u00a0" || ch === "\t") sawSpace = true;
        else sawKey = true;
      }
      if (sawReturn) carriage();
      if (sawKey) clack();
      else if (sawSpace) thunk();
    }

    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        enabled = !enabled;
        try { localStorage.setItem(KEY, enabled ? "1" : "0"); } catch (e) {}
        paint();
        unlock(function () {
          applyGain();
          if (enabled) clack();
        });
      });
    }

    if (staticBtn) {
      staticBtn.addEventListener("click", function () {
        try {
          unlock();
          if (!ctx) return;
          if (!staticGain) {
            var rate = ctx.sampleRate || 44100;
            var buffer = ctx.createBuffer(1, rate, rate);
            var data = buffer.getChannelData(0);
            var last = 0;
            var i, white;
            for (i = 0; i < rate; i++) {
              white = Math.random() * 2 - 1;
              last = last * 0.97 + white * 0.03;
              data[i] = white * 0.22 + last * 0.78;
            }
            var source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            var high = ctx.createBiquadFilter();
            high.type = "highpass";
            high.frequency.value = 600;
            var low = ctx.createBiquadFilter();
            low.type = "lowpass";
            low.frequency.value = 2800;
            staticGain = ctx.createGain();
            staticGain.gain.value = 0;
            source.connect(high);
            high.connect(low);
            low.connect(staticGain);
            staticGain.connect(ctx.destination);
            source.start();
          }
          if (ctx.state === "suspended" && ctx.resume) {
            var resumed = ctx.resume();
            if (resumed && typeof resumed.catch === "function") resumed.catch(function () {});
          }
          staticOn = !staticOn;
          staticGain.gain.setTargetAtTime(staticOn ? 0.018 : 0, ctx.currentTime, 0.04);
          staticBtn.setAttribute("aria-pressed", staticOn ? "true" : "false");
          staticBtn.setAttribute("aria-label", staticOn ? "Stop radio static" : "Play faint radio static");
        } catch (err) {}
      });
    }

    return { keys: keys, carriage: carriage };
  }
})();
