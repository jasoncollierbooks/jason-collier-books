/* Station breaks: one short sponsor spot on the television.
   BREAK_INTERVAL_MS is the only timing constant. Change it here. */
(function () {
  var BREAK_INTERVAL_MS = 4 * 60 * 1000;
  var STATIC_MS = 850;
  var CARD_MS = 2300;
  var BACK_MS = 1700;
  var IDLE_MS = 2500;
  var FALLBACK_SPOT_MS = 13000;

  /* Test mode (?breaks=test, kept in localStorage so it follows the visitor
     across pages and into the games). Turn off with ?breaks=off.
     ?breaks=test&breakms=20000 fixes the gap for quick checks. Live
     behaviour without the flag is unchanged. */
  var TEST_KEY = "jc-breaks-test";
  var TEST_MS_KEY = "jc-breaks-ms";
  var TEST = (function () {
    try {
      var p = new URLSearchParams(location.search);
      var b = p.get("breaks");
      if (b === "test") {
        localStorage.setItem(TEST_KEY, "1");
        var fixed = parseInt(p.get("breakms"), 10);
        if (fixed > 0) localStorage.setItem(TEST_MS_KEY, String(fixed));
        else localStorage.removeItem(TEST_MS_KEY);
        sessionStorage.removeItem("jc-break-elapsed");
        sessionStorage.removeItem("jc-break-target");
        sessionStorage.removeItem("jc-break-scrolled");
      } else if (b === "off") {
        localStorage.removeItem(TEST_KEY);
        localStorage.removeItem(TEST_MS_KEY);
      }
      return localStorage.getItem(TEST_KEY) === "1";
    } catch (e) { return false; }
  })();
  var TEST_MIN_MS = 2 * 60 * 1000;
  var TEST_MAX_MS = 3 * 60 * 1000;
  var SKIP_AFTER_MS = 5000;
  var TEST_CAP_MS = 40000;
  var SCROLL_DELAY_MS = 2500;
  var KEY_TARGET = "jc-break-target";
  var KEY_SCROLLED = "jc-break-scrolled";

  var KEY_ELAPSED = "jc-break-elapsed";
  var KEY_DUE = "jc-break-due";
  var KEY_QUEUE = "jc-break-queue";
  var SOUND_KEY = "jc-type-sound";

  var rootUrl = (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (/commercials\.js(\?|$)/.test(src)) return src.replace(/commercials\.js(\?.*)?$/, "");
    }
    return "";
  })();

  function asset(path) {
    try { return new URL(path, rootUrl || document.baseURI).href; }
    catch (e) { return path; }
  }

  /* Remember every Web Audio context the page makes so a break can hush it. */
  var audioContexts = window.__jcAudioContexts || [];
  window.__jcAudioContexts = audioContexts;
  if (TEST) {
    ["AudioContext", "webkitAudioContext"].forEach(function (name) {
      var Native = window[name];
      if (!Native || Native.__jcTracked) return;
      var Tracked = function (opts) {
        var ctx = opts === undefined ? new Native() : new Native(opts);
        audioContexts.push(ctx);
        return ctx;
      };
      Tracked.prototype = Native.prototype;
      Tracked.__jcTracked = true;
      try { window[name] = Tracked; } catch (e) {}
    });
  }

  /* Copy stays inside what the site already says. On-screen text is the
     title plus the button. The pitch is spoken. */
  var SPOTS = {
    jangtom: {
      title: "Jang & Tom",
      look: "is-color",
      image: "images/jang-and-tom-wagon-masters.jpg",
      alt: "Cover of Jang and Tom: Wagon Masters by Jason Collier",
      audio: "audio/commercials/jangtom.mp3",
      skipOn: ["jang-and-tom.html"],
      buttons: [{ label: "Get it on Amazon", href: "https://www.amazon.com/dp/B0HFCF11YP", external: true }]
    },
    oldman: {
      title: "Old Man On The Mountain",
      look: "is-bw",
      image: "images/old-man-on-the-mountain.jpg",
      alt: "Cover of Old Man On The Mountain by Jason Collier",
      audio: "audio/commercials/oldman.mp3",
      skipOn: ["old-man-on-the-mountain.html"],
      buttons: [{ label: "Get it on Amazon", href: "https://www.amazon.com/dp/B0HDJWYNNJ", external: true }]
    },
    pulse: {
      title: "The First Pulse",
      look: "is-cool",
      image: "images/the-first-pulse.jpg",
      alt: "Cover of The First Pulse by Jason Collier",
      audio: "audio/commercials/pulse.mp3",
      skipOn: ["first-pulse.html"],
      buttons: [{ label: "Get it on Amazon", href: "https://www.amazon.com/dp/B0GD4W3159", external: true }]
    },
    rusty: {
      title: "The Rusty Stack",
      look: "is-brass",
      image: "images/the-rusty-stack.jpg",
      alt: "Cover of The Rusty Stack Adventures by Jason Collier",
      audio: "audio/commercials/rusty.mp3",
      skipOn: ["rusty-stack.html"],
      buttons: [{ label: "Coming soon", href: "rusty-stack.html" }]
    },
    worlds: {
      title: "Book Worlds",
      look: "is-pan",
      image: "book-worlds/assets/play-cover.webp",
      alt: "Painted title card of a keeper with a brass key beside a wagon at dusk",
      audio: "audio/commercials/worlds.mp3",
      skipOn: ["book-worlds"],
      buttons: [{ label: "Play now", href: "book-worlds/" }]
    },
    oldmangame: {
      title: "Old Man On The Mountain",
      look: "is-bw",
      image: "old-man-game/assets/title.jpg",
      alt: "A campfire at dusk below a dark forested mountain",
      audio: "audio/commercials/oldmangame.mp3",
      skipOn: ["old-man-game"],
      buttons: [{ label: "Play now", href: "old-man-game/" }]
    },
    audiobooks: {
      title: "Audiobooks",
      look: "is-color",
      image: "media/firstpulse_part4of7_poster.jpg",
      alt: "A still from the animated audiobooks",
      audio: "audio/commercials/audiobooks.mp3",
      skipOn: ["audiobooks.html", "old-man-audiobook"],
      buttons: [{ label: "Listen free", href: "audiobooks.html" }]
    },
    radio: {
      title: "The Radio Hour",
      look: "is-bw",
      dial: true,
      audio: "audio/commercials/radio.mp3",
      skipOn: ["past-inspirations.html"],
      buttons: [{ label: "Tune in", href: "past-inspirations.html#radio" }]
    },
    kids: {
      title: "I Spy & Coloring",
      look: "is-color",
      pair: ["images/scenes/transcon-s46.jpg", "coloring/thumbs/runaway-horse.png"],
      alt: "A picture from the books, and a coloring page of a runaway horse",
      audio: "audio/commercials/kids.mp3",
      skipOn: ["i-spy.html", "coloring.html"],
      buttons: [
        { label: "Play", href: "i-spy.html" },
        { label: "Color", href: "coloring.html" }
      ]
    },
    x: {
      title: "@jascol235175",
      look: "is-pan",
      image: "images/author-as-jang.jpg",
      alt: "Portrait of Jang, from the Jang and Tom game",
      audio: "audio/commercials/x.mp3",
      skipOn: [],
      buttons: [{ label: "Follow Jason on X", href: "https://x.com/jascol235175", external: true }]
    }
  };

  var BLOCKED = [
    "i-spy.html",
    "coloring.html",
    "audiobooks.html",
    "old-man-audiobook",
    "past-inspirations.html",
    "book-worlds",
    "old-man-game",
    "studio.html"
  ];

  var ids = Object.keys(SPOTS);

  function newTarget() {
    if (!TEST) return BREAK_INTERVAL_MS;
    var fixed = 0;
    try { fixed = parseInt(localStorage.getItem(TEST_MS_KEY), 10) || 0; } catch (e) {}
    if (fixed > 0) return fixed;
    return Math.round(TEST_MIN_MS + Math.random() * (TEST_MAX_MS - TEST_MIN_MS));
  }
  var elapsed = readNum(KEY_ELAPSED);
  var due = sessionGet(KEY_DUE) === "1";
  var target = parseFloat(sessionGet(KEY_TARGET) || "0");
  if (!(target > 0) || !TEST) target = newTarget();
  var queue = readQueue();
  var lastTick = Date.now();
  var lastInteract = Date.now();
  var active = false;
  var phase = "";
  var overlay = null;
  var timers = [];
  var returnFocus = null;
  var noiseTimer = 0;
  var spotWatch = 0;
  var currentSpot = null;
  var held = false;
  var unlocked = false;
  var pool = [];
  var POOL_SIZE = 2;
  /* Short silent clip so the first gesture can bless an element without a noise. */
  var SILENT_SRC = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

  function sessionGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function sessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }
  function readNum(key) {
    var n = parseFloat(sessionGet(key) || "0");
    return isFinite(n) && n > 0 ? n : 0;
  }
  function readQueue() {
    try {
      var parsed = JSON.parse(sessionGet(KEY_QUEUE) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (id) { return SPOTS[id]; });
    } catch (e) { return []; }
  }
  function saveClock() {
    sessionSet(KEY_ELAPSED, String(Math.round(elapsed)));
    sessionSet(KEY_DUE, due ? "1" : "0");
    sessionSet(KEY_QUEUE, JSON.stringify(queue));
    sessionSet(KEY_TARGET, String(target));
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function here() {
    return (location.pathname || "") + (location.hash || "");
  }

  function onBlockedPage() {
    var path = here();
    for (var i = 0; i < BLOCKED.length; i++) {
      if (path.indexOf(BLOCKED[i]) !== -1) return true;
    }
    return false;
  }

  function advertisesThisPage(spot) {
    var path = here();
    var list = spot.skipOn || [];
    for (var i = 0; i < list.length; i++) {
      if (path.indexOf(list[i]) !== -1) return true;
    }
    return false;
  }

  function typing() {
    var el = document.activeElement;
    if (!el || el === document.body) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return !!el.isContentEditable;
  }

  var looseMedia = [];
  var nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this.getAttribute("data-jc-break") !== "1" && looseMedia.indexOf(this) === -1) {
      looseMedia.push(this);
    }
    return nativePlay.apply(this, arguments);
  };

  function mediaPlaying() {
    var nodes = document.querySelectorAll("audio, video");
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-jc-break") === "1") continue;
      if (!nodes[i].paused && !nodes[i].ended) return true;
    }
    for (i = 0; i < looseMedia.length; i++) {
      if (!looseMedia[i].paused && !looseMedia[i].ended) return true;
    }
    return false;
  }

  /* The home-page Sound button (typewriter clack) is the site-wide quiet switch.
     localStorage "jc-type-sound" and #type-sound aria-pressed drive both. */
  function siteMuted() {
    try {
      if (localStorage.getItem(SOUND_KEY) === "0") return true;
    } catch (e) {}
    var button = document.getElementById("type-sound");
    if (button && button.getAttribute("aria-pressed") === "false") return true;
    return false;
  }

  function idle() {
    return !typing() && (Date.now() - lastInteract) >= IDLE_MS;
  }

  /* A film playing inside a cross-origin player (the Archive embed) cannot be
     paused from here. Focus inside it means it is probably playing. */
  function framePlaying() {
    var el = document.activeElement;
    return !!(el && (el.tagName || "").toLowerCase() === "iframe");
  }

  function canStart() {
    if (active) return false;
    if (document.visibilityState === "hidden") return false;
    if (TEST) return !typing() && !framePlaying();
    if (onBlockedPage()) return false;
    if (mediaPlaying()) return false;
    if (!idle()) return false;
    return true;
  }

  function takeSpot() {
    if (!queue.length) queue = shuffle(ids);
    var skipped = [];
    var chosen = null;
    var guard = queue.length;
    while (guard--) {
      var id = queue.shift();
      if (!SPOTS[id]) continue;
      if (advertisesThisPage(SPOTS[id])) {
        skipped.push(id);
        continue;
      }
      chosen = id;
      break;
    }
    queue = skipped.concat(queue);
    if (chosen && !queue.length) {
      queue = shuffle(ids);
      if (queue.length > 1 && queue[0] === chosen) queue.push(queue.shift());
    }
    saveClock();
    return chosen;
  }

  function css() {
    if (document.getElementById("jc-break-css")) return;
    var link = document.createElement("link");
    link.id = "jc-break-css";
    link.rel = "stylesheet";
    link.href = asset("commercials.css");
    document.head.appendChild(link);
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (noiseTimer) cancelAnimationFrame(noiseTimer);
    noiseTimer = 0;
    if (spotWatch) clearInterval(spotWatch);
    spotWatch = 0;
  }

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  /* Phones only allow play() on an element that already played inside a user
     gesture. One pair is primed on the first tap and reused (src swapped). */
  function createPlayer() {
    var audio = document.createElement("audio");
    audio.setAttribute("data-jc-break", "1");
    audio.setAttribute("playsinline", "");
    audio.playsInline = true;
    audio.preload = "auto";
    audio._jcBusy = false;
    audio._jcGen = 0;
    if (document.body) document.body.appendChild(audio);
    return audio;
  }

  function ensurePool() {
    while (pool.length < POOL_SIZE) pool.push(createPlayer());
  }

  function primeElement(audio) {
    if (!audio || audio._jcBusy) return;
    var gen = audio._jcGen || 0;
    audio.muted = false;
    audio.volume = 1;
    audio.loop = false;
    audio.src = SILENT_SRC;
    var pending;
    try { pending = audio.play(); } catch (e) { return; }
    var settle = function () {
      if (audio._jcBusy) return;
      if ((audio._jcGen || 0) !== gen) return;
      if ((audio.currentSrc || audio.src || "").indexOf("data:audio/wav") === -1) return;
      try { audio.pause(); } catch (e) {}
    };
    if (pending && typeof pending.then === "function") pending.then(settle, settle);
  }

  function unlockFromGesture() {
    if (!document.body) return;
    if (!unlocked) {
      unlocked = true;
      ensurePool();
    }
    var i;
    for (i = 0; i < pool.length; i++) primeElement(pool[i]);
  }

  function removeGestureListeners() {
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("touchend", onFirstGesture, true);
    window.removeEventListener("keydown", onFirstGesture, true);
  }

  function onFirstGesture(event) {
    if (!document.body) return;
    unlockFromGesture();
    var type = event && event.type;
    var touch = false;
    try { touch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0; }
    catch (e) { touch = false; }
    /* pointerdown alone does not unlock iOS; touchend does. A mouse has no touchend. */
    if (type === "touchend" || type === "keydown" || (type === "pointerdown" && !touch)) {
      removeGestureListeners();
    }
  }

  function takePlayer() {
    ensurePool();
    var i, audio = null;
    for (i = 0; i < pool.length; i++) {
      if (!pool[i]._jcBusy) { audio = pool[i]; break; }
    }
    if (!audio) audio = pool[0];
    audio._jcGen = (audio._jcGen || 0) + 1;
    audio._jcBusy = true;
    audio.muted = false;
    audio.volume = 1;
    return audio;
  }

  function stopClips() {
    var i, audio;
    for (i = 0; i < pool.length; i++) {
      audio = pool[i];
      audio._jcGen = (audio._jcGen || 0) + 1;
      audio._jcBusy = false;
      audio.loop = false;
      try { audio.pause(); } catch (e) {}
      audio.removeAttribute("src");
      try { audio.load(); } catch (e) {}
    }
  }

  function playClip(name, loop) {
    if (siteMuted()) return null;
    var audio = takePlayer();
    var gen = audio._jcGen;
    audio.loop = !!loop;
    audio.src = asset("audio/commercials/" + name + ".mp3");
    var pending;
    try { pending = audio.play(); }
    catch (e) {
      noteBlocked(gen, audio, e);
      return audio;
    }
    if (pending && typeof pending.then === "function") {
      pending.then(function () {}).catch(function (err) {
        noteBlocked(gen, audio, err);
      });
    }
    return audio;
  }

  function noteBlocked(gen, audio, err) {
    if (!audio || audio._jcGen !== gen) return;
    if (!active || held || phase === "back") return;
    if (err && err.name && err.name !== "NotAllowedError") return;
    holdForTune();
  }

  function holdForTune() {
    if (!active || !overlay || held || phase === "back") return;
    held = true;
    clearTimers();
    if (noiseTimer) cancelAnimationFrame(noiseTimer);
    noiseTimer = 0;
    stopClips();
    overlay.classList.add("is-held");
    if (overlay.querySelector(".jc-break-tune")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jc-break-tune";
    btn.textContent = "TAP TO TUNE IN";
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      tuneIn();
    });
    overlay.appendChild(btn);
    try { btn.focus(); } catch (e) {}
  }

  function tuneIn() {
    if (!active || !overlay || !currentSpot || !held) return;
    var spot = currentSpot;
    held = false;
    overlay.classList.remove("is-held");
    var btn = overlay.querySelector(".jc-break-tune");
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    clearTimers();
    stopClips();
    if (!unlocked) unlocked = true;
    ensurePool();
    phase = "spot";
    showSpot(spot, false);
    var i;
    for (i = 0; i < pool.length; i++) {
      if (!pool[i]._jcBusy) primeElement(pool[i]);
    }
  }

  function buttonLink(spec) {
    var link = document.createElement("a");
    link.className = "jc-break-cta";
    link.textContent = spec.label;
    if (spec.external) {
      link.href = spec.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else {
      link.href = asset(spec.href);
    }
    return link;
  }

  function fillStage(phase, spot) {
    var stage = overlay.querySelector(".jc-break-stage");
    stage.textContent = "";
    overlay.classList.remove("is-color", "is-pan", "is-cool", "is-bw", "is-brass");

    if (phase === "static") {
      var canvas = document.createElement("canvas");
      canvas.className = "jc-break-snow";
      canvas.setAttribute("aria-hidden", "true");
      stage.appendChild(canvas);
      stage.appendChild(scan());
      snow(canvas);
      return;
    }

    if (phase === "card" || phase === "back") {
      var card = document.createElement("div");
      card.className = "jc-break-card";
      var kicker = document.createElement("p");
      kicker.className = "jc-break-card-kicker";
      var title = document.createElement("p");
      title.className = "jc-break-card-title";
      if (phase === "card") {
        kicker.textContent = "We'll be right back";
        title.textContent = "Station break";
      } else {
        kicker.textContent = "Now back";
        title.textContent = "to our program";
      }
      card.appendChild(kicker);
      card.appendChild(title);
      card.appendChild(scan());
      stage.appendChild(card);
      return;
    }

    overlay.classList.add(spot.look || "is-color");
    if (spot.dial) {
      var dial = document.createElement("div");
      dial.className = "jc-break-dial";
      dial.setAttribute("aria-hidden", "true");
      var face = document.createElement("div");
      face.className = "jc-break-dial-face";
      dial.appendChild(face);
      stage.appendChild(dial);
    } else if (spot.pair) {
      var pair = document.createElement("div");
      pair.className = "jc-break-kids";
      spot.pair.forEach(function (src) {
        var img = document.createElement("img");
        img.src = asset(src);
        img.alt = "";
        pair.appendChild(img);
      });
      stage.appendChild(pair);
    } else {
      var photo = document.createElement("img");
      photo.className = "jc-break-photo";
      photo.src = asset(spot.image);
      photo.alt = spot.alt || "";
      stage.appendChild(photo);
    }
    stage.appendChild(scan());
    var flicker = document.createElement("div");
    flicker.className = "jc-break-flicker";
    flicker.setAttribute("aria-hidden", "true");
    stage.appendChild(flicker);
    var vignette = document.createElement("div");
    vignette.className = "jc-break-vignette";
    vignette.setAttribute("aria-hidden", "true");
    stage.appendChild(vignette);

    var copy = document.createElement("div");
    copy.className = "jc-break-copy";
    var heading = document.createElement("h2");
    heading.className = "jc-break-title";
    heading.textContent = spot.title;
    var actions = document.createElement("div");
    actions.className = "jc-break-actions";
    (spot.buttons || []).forEach(function (spec) {
      actions.appendChild(buttonLink(spec));
    });
    copy.appendChild(heading);
    copy.appendChild(actions);
    stage.appendChild(copy);
  }

  function reducedMotion() {
    if (document.documentElement.classList.contains("reduce-motion")) return true;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  /* Test mode: freeze the program under the break, then bring it back. */
  var heldMedia = [];
  var heldContexts = [];
  var heldSpeech = false;
  var heldGame = false;
  var hushTimer = 0;

  function hushContexts() {
    for (var i = 0; i < audioContexts.length; i++) {
      var ctx = audioContexts[i];
      if (ctx && ctx.state === "running") {
        if (heldContexts.indexOf(ctx) === -1) heldContexts.push(ctx);
        try { ctx.suspend(); } catch (e) {}
      }
    }
  }

  function holdProgram() {
    heldMedia = [];
    heldContexts = [];
    var seen = [];
    var nodes = Array.prototype.slice.call(document.querySelectorAll("audio, video")).concat(looseMedia);
    for (var i = 0; i < nodes.length; i++) {
      var m = nodes[i];
      if (!m || seen.indexOf(m) !== -1 || m.getAttribute("data-jc-break") === "1") continue;
      seen.push(m);
      if (!m.paused && !m.ended) {
        heldMedia.push(m);
        try { m.pause(); } catch (e) {}
      }
    }
    hushContexts();
    if (hushTimer) clearInterval(hushTimer);
    hushTimer = setInterval(hushContexts, 400);
    heldSpeech = false;
    try {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        heldSpeech = true;
      }
    } catch (e) {}
    window.__jcBreakHold = true;
    heldGame = false;
    var om = window.__oldman;
    if (om && typeof om.holdSim === "function") {
      try { om.holdSim(true); heldGame = true; } catch (e) {}
      try { if (om.keys && om.keys.clear) om.keys.clear(); } catch (e) {}
    }
    try { window.dispatchEvent(new Event("blur")); } catch (e) {}
  }

  function releaseProgram() {
    if (hushTimer) clearInterval(hushTimer);
    hushTimer = 0;
    window.__jcBreakHold = false;
    if (heldGame && window.__oldman) {
      try { window.__oldman.holdSim(false); } catch (e) {}
    }
    heldGame = false;
    var media = heldMedia, ctxs = heldContexts, speech = heldSpeech;
    heldMedia = [];
    heldContexts = [];
    heldSpeech = false;
    function go() {
      var i;
      for (i = 0; i < ctxs.length; i++) {
        try { if (ctxs[i].state === "suspended") ctxs[i].resume(); } catch (e) {}
      }
      for (i = 0; i < media.length; i++) {
        try {
          var p = media[i].play();
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      }
      if (speech) { try { window.speechSynthesis.resume(); } catch (e) {} }
    }
    if (document.visibilityState === "hidden") {
      var onBack = function () {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", onBack);
        go();
      };
      document.addEventListener("visibilitychange", onBack);
    } else {
      go();
    }
  }

  function scan() {
    var el = document.createElement("div");
    el.className = "jc-break-scan";
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function snow(canvas) {
    var ctx = canvas.getContext("2d", { alpha: false });
    var w = 160;
    var h = 280;
    canvas.width = w;
    canvas.height = h;
    var frame = ctx.createImageData(w, h);
    var reduce = reducedMotion();
    function draw() {
      var data = frame.data;
      for (var i = 0; i < data.length; i += 4) {
        var n = (Math.random() * 255) | 0;
        data[i] = data[i + 1] = data[i + 2] = n;
        data[i + 3] = 255;
      }
      ctx.putImageData(frame, 0, 0);
      if (!reduce && overlay && !overlay.classList.contains("is-still") && !overlay.classList.contains("is-held")) {
        noiseTimer = requestAnimationFrame(draw);
      }
    }
    draw();
  }

  function closeBreak() {
    if (!active && !overlay) return;
    active = false;
    phase = "";
    held = false;
    currentSpot = null;
    clearTimers();
    stopClips();
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    if (skipTimer) clearInterval(skipTimer);
    skipTimer = 0;
    if (capTimer) clearTimeout(capTimer);
    capTimer = 0;
    document.documentElement.classList.remove("jc-break-open");
    if (programHeld) {
      programHeld = false;
      releaseProgram();
    }
    if (returnFocus && typeof returnFocus.focus === "function") {
      try { returnFocus.focus(); } catch (e) {}
    }
    returnFocus = null;
  }

  function finishToProgram() {
    if (!active || phase === "back") return;
    phase = "back";
    fillStage("back");
    stopClips();
    playClip("click");
    later(closeBreak, BACK_MS);
  }

  function bindClip(audio, type, fn) {
    var key = "_jcon" + type;
    if (audio[key]) audio.removeEventListener(type, audio[key]);
    audio[key] = fn;
    audio.addEventListener(type, fn);
  }

  function showSpot(spot, hold) {
    fillStage("spot", spot);
    if (hold) return;
    var voice = playClip(spotKey(spot));
    if (!voice) {
      later(finishToProgram, FALLBACK_SPOT_MS);
      return;
    }
    var gen = voice._jcGen;
    var started = false;
    function alive() {
      return active && !held && voice._jcGen === gen;
    }
    function arm(ms) {
      if (!alive() || started) return;
      started = true;
      var wait = Math.max(8000, Math.min(ms + 700, 22000));
      later(finishToProgram, wait);
    }
    bindClip(voice, "loadedmetadata", function () {
      if (!alive()) return;
      if (voice.duration && isFinite(voice.duration)) arm(voice.duration * 1000);
    });
    bindClip(voice, "ended", function () {
      if (!alive()) return;
      clearTimers();
      finishToProgram();
    });
    bindClip(voice, "error", function () {
      if (!alive()) return;
      if (!started) arm(FALLBACK_SPOT_MS);
    });
    later(function () {
      if (!alive() || started) return;
      arm(voice.duration && isFinite(voice.duration) ? voice.duration * 1000 : FALLBACK_SPOT_MS);
    }, 1200);
  }

  function spotKey(spot) {
    for (var id in SPOTS) {
      if (SPOTS[id] === spot) return id;
    }
    return "oldman";
  }

  var skipTimer = 0;
  var capTimer = 0;
  var programHeld = false;
  var skipReadyAt = 0;

  function openBreak(id, options) {
    options = options || {};
    var testBreak = TEST && !options.frame;
    var spot = SPOTS[id] || SPOTS.oldman;
    if (active) closeBreak();
    currentSpot = spot;
    held = false;
    css();
    active = true;
    returnFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "jc-break";
    if (options.frame) overlay.classList.add("is-still");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Station break");
    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "jc-break-skip";
    skip.textContent = "Skip";
    overlay.appendChild(skip);
    skipReadyAt = 0;
    if (testBreak) {
      overlay.classList.add("is-test");
      if (!programHeld) { holdProgram(); programHeld = true; }
      skipReadyAt = Date.now() + SKIP_AFTER_MS;
      skip.classList.add("is-waiting");
      skip.setAttribute("aria-disabled", "true");
      var paintSkip = function () {
        var left = Math.ceil((skipReadyAt - Date.now()) / 1000);
        if (left > 0) {
          skip.textContent = "Skip in " + left;
          return;
        }
        skip.textContent = "Skip";
        skip.classList.remove("is-waiting");
        skip.removeAttribute("aria-disabled");
        if (skipTimer) clearInterval(skipTimer);
        skipTimer = 0;
      };
      paintSkip();
      skipTimer = setInterval(paintSkip, 250);
      /* Never trap anyone: the break always ends on its own. */
      capTimer = setTimeout(closeBreak, TEST_CAP_MS);
    }
    var stage = document.createElement("div");
    stage.className = "jc-break-stage";
    overlay.appendChild(stage);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("jc-break-open");
    skip.focus();

    overlay.addEventListener("click", function (event) {
      var waiting = skipReadyAt && Date.now() < skipReadyAt;
      if (event.target.closest(".jc-break-skip")) {
        event.preventDefault();
        if (waiting) return;
        closeBreak();
        return;
      }
      if (event.target.closest(".jc-break-tune")) {
        event.preventDefault();
        tuneIn();
        return;
      }
      if (event.target.closest(".jc-break-cta")) {
        setTimeout(closeBreak, 0);
        return;
      }
      if (waiting) return;
      closeBreak();
    });

    var frame = options.frame;
    if (frame === "spot") {
      showSpot(spot, true);
      return;
    }
    if (frame === "card") {
      fillStage("card");
      return;
    }
    if (frame === "back") {
      fillStage("back");
      return;
    }
    if (frame === "static") {
      fillStage("static");
      return;
    }

    var staticMs = STATIC_MS;
    if (testBreak && reducedMotion()) staticMs = 0;
    phase = "static";
    if (staticMs) {
      fillStage("static");
      playClip("static");
    }
    later(function () {
      if (!active || held) return;
      stopClips();
      playClip("click");
      phase = "card";
      fillStage("card");
      playClip("chime");
      later(function () {
        if (!active || held) return;
        stopClips();
        phase = "spot";
        showSpot(spot, false);
      }, CARD_MS);
    }, staticMs);
  }

  function beginScheduled() {
    if (!due || !canStart()) return;
    var id = takeSpot();
    if (!id) return;
    due = false;
    elapsed = 0;
    saveClock();
    openBreak(id);
  }

  function tick() {
    var now = Date.now();
    var dt = Math.min(5000, now - lastTick);
    lastTick = now;
    if (document.visibilityState === "hidden" || active) {
      saveClock();
      return;
    }
    if (due) {
      beginScheduled();
      return;
    }
    elapsed += dt;
    if (elapsed >= target) {
      elapsed = 0;
      target = newTarget();
      due = true;
      saveClock();
      beginScheduled();
      return;
    }
    saveClock();
  }

  function previewFromUrl() {
    var params;
    try { params = new URLSearchParams(location.search); }
    catch (e) { return; }
    var which = params.get("commercial");
    if (!which) return;
    var frame = params.get("frame");
    var id = which === "1" ? ids[Math.floor(Math.random() * ids.length)] : which;
    if (!SPOTS[id]) return;
    openBreak(id, { frame: frame || "" });
  }

  function markInteract() {
    lastInteract = Date.now();
  }

  window.addEventListener("pointerdown", onFirstGesture, true);
  window.addEventListener("touchend", onFirstGesture, true);
  window.addEventListener("keydown", onFirstGesture, true);

  ["pointerdown", "keydown", "touchstart", "wheel", "scroll", "input"].forEach(function (type) {
    window.addEventListener(type, markInteract, { passive: true, capture: true });
  });

  document.addEventListener("keydown", function (event) {
    if (!active || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeBreak();
  }, true);

  document.addEventListener("click", function (event) {
    var button = event.target.closest && event.target.closest("#type-sound");
    if (!button || !active) return;
    later(function () {
      if (siteMuted()) stopClips();
    }, 0);
  }, true);

  window.addEventListener("pagehide", saveClock);

  /* Test mode, home page: one break soon after the first scroll. */
  function onHome() {
    var path = location.pathname || "/";
    return /\/$/.test(path) || /\/index\.html$/.test(path);
  }
  if (TEST && onHome() && sessionGet(KEY_SCROLLED) !== "1") {
    var scrollArmed = false;
    var onScroll = function () {
      if (scrollArmed || (window.scrollY || window.pageYOffset || 0) < 40) return;
      scrollArmed = true;
      window.removeEventListener("scroll", onScroll);
      setTimeout(function tryScrollBreak() {
        if (!canStart()) { setTimeout(tryScrollBreak, 1000); return; }
        var id = takeSpot();
        if (!id) return;
        sessionSet(KEY_SCROLLED, "1");
        elapsed = 0;
        due = false;
        target = newTarget();
        saveClock();
        openBreak(id);
      }, SCROLL_DELAY_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Leaving the tab mid-break ends it; the program resumes when the tab returns. */
  document.addEventListener("visibilitychange", function () {
    if (TEST && active && document.visibilityState === "hidden") closeBreak();
  });

  css();
  previewFromUrl();
  setInterval(tick, 500);

  window.JCBreaks = {
    interval: BREAK_INTERVAL_MS,
    test: TEST,
    get target() { return target; },
    get elapsed() { return elapsed; },
    spots: SPOTS,
    open: openBreak
  };
})();
