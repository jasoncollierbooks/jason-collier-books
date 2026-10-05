/* Old Man On The Mountain: illustrated audiobook player.
   - ONE <audio> element; each part is one continuous pre-mixed file (no clip stitching, no gaps).
   - Pictures are chosen from audio.currentTime against storyboard.json (never from wall-clock timers),
     so seeking, lock/unlock and background tabs can't drift or repeat.
   - The next 1-2 pictures are fetched and decoded ahead; 2.5 s crossfades; slow Ken Burns via Web Animations.
   - A tap only toggles play/pause (debounced); nothing ever re-creates the element or reloads the file.
   - Media Session lock-screen controls + artwork; resume position in localStorage.
   - Only Part 1 is playable. Parts 2-6 are locked (no audio on the server). When Part 1
     ends, show the end card. Never set the audio src to a missing part. No video. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const au = $("om-audio"), stage = $("om-stage"), cap = $("om-cap"), playBtn = $("om-play"), seek = $("om-seek"), timeEl = $("om-time");
  const layers = [$("om-a"), $("om-b")];
  const epBtns = [...document.querySelectorAll(".om-ep")];
  const KEY = "om-audiobook", FADE = 2500;
  let SB = null, ep = null, epN = 1, cur = -1, front = 0, seeking = false, lastToggle = 0, idleT = 0, pendingSeek = null;
  const cache = new Map();
  const fmt = s => (isFinite(s) && s >= 0) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(store.get(), o))); } catch (e) {} }
  };
  const savePos = () => { if (ep && au.currentTime > 0) { const p = store.get().pos || {}; p[epN] = au.ended ? 0 : +au.currentTime.toFixed(1); store.set({ ep: epN, pos: p }); } };
  // Parts 2-6 stay in the list for the lock cards, but their files are not on the server.
  const isPlayable = e => !!(e && !e.locked && e.audio && !/om0[2-6]\.m4a/.test(e.audio));
  function showSampleEnd(scroll) {
    const card = $("om-end");
    if (!card) return;
    card.hidden = false;
    ui();
    if (scroll) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }
  function hideSampleEnd() { const card = $("om-end"); if (card) card.hidden = true; }

  function cueIndex(t) {
    const c = ep.cues; let lo = 0, hi = c.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (c[m].t <= t + 0.05) lo = m; else hi = m - 1; }
    return lo;
  }
  function preload(i) {
    if (!ep || i < 0 || i >= ep.cues.length) return Promise.resolve(null);
    const src = ep.cues[i].img;
    if (!cache.has(src)) {
      const im = new Image(); im.decoding = "async"; im.src = src;
      cache.set(src, (im.decode ? im.decode() : new Promise(r => { im.onload = im.onerror = r; })).catch(() => {}).then(() => src));
    }
    return cache.get(src);
  }
  function kenBurns(el, c, offset) {
    el.getAnimations().forEach(a => a.cancel());
    const kb = c.kb || { zoom: [1, 1.06], pan: [[.5, .5], [.5, .5]] };
    const tf = (z, p) => `scale(${z}) translate(${((.5 - p[0]) * 6).toFixed(2)}%, ${((.5 - p[1]) * 6).toFixed(2)}%)`;
    const dur = Math.max(4, c.end - c.t + FADE / 1000) * 1000;
    const a = el.animate([{ transform: tf(kb.zoom[0], kb.pan[0]) }, { transform: tf(kb.zoom[1], kb.pan[1]) }], { duration: dur, fill: "forwards", easing: "linear" });
    a.currentTime = Math.min(dur, Math.max(0, offset * 1000));
    if (au.paused) a.pause();
  }
  async function show(i, instant) {
    if (!ep || i === cur) return;
    cur = i; const c = ep.cues[i], src = await preload(i);
    if (cur !== i || !src) return;                      // a newer seek won the race
    const back = layers[1 - front], fr = layers[front];
    stage.classList.toggle("instant", !!instant);
    back.src = src; back.dataset.art = c.art; back.alt = c.title;
    kenBurns(back, c, au.currentTime - c.t);
    back.classList.add("on"); fr.classList.remove("on"); front = 1 - front;
    stage.dataset.art = c.art;
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("instant")));
    preload(i + 1); preload(i + 2);
  }
  const sync = instant => { if (ep && ep.cues.length) show(cueIndex(au.currentTime || 0), instant); };

  function mediaSession() {
    if (!("mediaSession" in navigator) || !ep) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Part ${epN}: ${ep.title}`, artist: "Jason Collier", album: "Old Man On The Mountain (Audiobook)",
        artwork: [{ src: new URL(ep.artwork, location.href).href, sizes: "512x512", type: "image/jpeg" },
                  { src: new URL(ep.poster, location.href).href, sizes: "640x360", type: "image/jpeg" }]
      });
    } catch (e) {}
  }
  function positionState() {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState || !isFinite(au.duration)) return;
    try { navigator.mediaSession.setPositionState({ duration: au.duration, playbackRate: au.playbackRate, position: Math.min(au.currentTime, au.duration) }); } catch (e) {}
  }
  function loadEpisode(n, { play = false, resume = true } = {}) {
    const next = SB && SB.episodes.find(e => e.n === n);
    if (!isPlayable(next)) { showSampleEnd(false); return; }
    hideSampleEnd();
    savePos();
    ep = next; epN = n; cur = -1; cache.clear();
    epBtns.forEach(b => { const on = +b.dataset.ep === n; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    cap.textContent = `Part ${n}: ${ep.title}`;
    const saved = resume ? (store.get().pos || {})[n] || 0 : 0;
    pendingSeek = saved > 1 && saved < ep.duration - 5 ? saved : null;
    const target = new URL(ep.audio, location.href).href;
    if (au.src !== target) { au.src = ep.audio; au.load(); }     // only when switching parts, never on a tap
    else if (pendingSeek != null && au.readyState >= 1) { au.currentTime = pendingSeek; pendingSeek = null; }
    timeEl.textContent = `${fmt(pendingSeek || 0)} / ${fmt(ep.duration)}`;
    seek.value = pendingSeek ? pendingSeek / ep.duration * 1000 : 0;
    store.set({ ep: n });
    preload(cueIndex(pendingSeek || 0)); preload(cueIndex(pendingSeek || 0) + 1);
    show(cueIndex(pendingSeek || 0), true);
    mediaSession();
    if (play) start();
  }
  function start() { const p = au.play(); if (p && p.catch) p.catch(() => ui()); }
  function toggle() {
    const now = performance.now();
    if (now - lastToggle < 450) return;                 // double-tap / double-click guard
    lastToggle = now;
    if (au.paused || au.ended) start(); else au.pause();
  }
  function ui() {
    const playing = !au.paused && !au.ended;
    stage.classList.toggle("playing", playing);
    playBtn.textContent = playing ? "Pause" : ((au.currentTime > 0 || pendingSeek) ? "Resume" : "Play");
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    layers.forEach(l => l.getAnimations().forEach(a => playing ? a.play() : a.pause()));
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    wake();
  }
  function wake() { stage.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => stage.classList.add("idle"), 3000); }

  au.addEventListener("loadedmetadata", () => {
    if (pendingSeek != null) { au.currentTime = pendingSeek; pendingSeek = null; }
    positionState(); sync(true); ui();
  });
  au.addEventListener("play", () => { hideSampleEnd(); ui(); });
  au.addEventListener("pause", () => { ui(); savePos(); });
  au.addEventListener("timeupdate", () => {
    if (!ep) return;
    if (!seeking) { seek.value = au.duration ? au.currentTime / au.duration * 1000 : 0; timeEl.textContent = `${fmt(au.currentTime)} / ${fmt(au.duration || ep.duration)}`; }
    sync(false);
    if ((au.currentTime | 0) % 5 === 0) savePos();
  });
  au.addEventListener("seeked", () => { sync(true); positionState(); });
  au.addEventListener("ended", () => {
    const p = store.get().pos || {}; p[epN] = 0; store.set({ pos: p });
    const nxt = SB && SB.episodes.find(e => e.n === epN + 1);
    if (isPlayable(nxt)) loadEpisode(nxt.n, { play: true, resume: false });
    else showSampleEnd(true);
  });
  au.addEventListener("error", () => { cap.textContent = `Part ${epN}: this part could not be loaded. Please try again.`; });

  stage.addEventListener("click", toggle);
  stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  playBtn.addEventListener("click", toggle);
  $("om-back15").addEventListener("click", () => { au.currentTime = Math.max(0, au.currentTime - 15); });
  $("om-fwd30").addEventListener("click", () => { au.currentTime = Math.min((au.duration || ep.duration) - 0.5, au.currentTime + 30); });
  seek.addEventListener("input", () => { seeking = true; timeEl.textContent = `${fmt(seek.value / 1000 * (au.duration || ep.duration))} / ${fmt(au.duration || ep.duration)}`; });
  seek.addEventListener("change", () => { seeking = false; const t = seek.value / 1000 * (au.duration || ep.duration); if (au.readyState >= 1) au.currentTime = t; else pendingSeek = t; });
  epBtns.forEach(b => b.addEventListener("click", () => {
    if (b.classList.contains("om-locked") || b.dataset.locked === "true") { showSampleEnd(true); return; }
    const n = +b.dataset.ep;
    const target = SB && SB.episodes.find(e => e.n === n);
    if (!isPlayable(target)) { showSampleEnd(true); return; }
    if (n === epN) { if (au.paused) start(); return; }
    loadEpisode(n, { play: true, resume: true });
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  document.addEventListener("keydown", e => {
    if (e.code !== "Space" || e.target.closest("button, input, select, textarea, a, [role=button]")) return;
    e.preventDefault(); toggle();
  });
  // Lock/unlock, app switch: audio keeps going by itself; on return only re-sync the picture to the audio clock.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { cur = -1; sync(true); } else savePos(); });
  addEventListener("pagehide", savePos);
  ["pointermove", "touchstart"].forEach(t => stage.addEventListener(t, wake, { passive: true }));

  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession, set = (a, f) => { try { ms.setActionHandler(a, f); } catch (e) {} };
    set("play", () => start());
    set("pause", () => au.pause());
    set("seekbackward", d => { au.currentTime = Math.max(0, au.currentTime - (d.seekOffset || 15)); });
    set("seekforward", d => { au.currentTime = Math.min(au.duration - 0.5, au.currentTime + (d.seekOffset || 30)); });
    set("seekto", d => { if (d.seekTime != null) au.currentTime = d.seekTime; });
    set("previoustrack", () => {
      if (au.currentTime > 5 || epN === 1 || !SB) { au.currentTime = 0; return; }
      const prev = SB.episodes.find(e => e.n === epN - 1);
      if (isPlayable(prev)) loadEpisode(prev.n, { play: true, resume: false });
      else au.currentTime = 0;
    });
    set("nexttrack", () => {
      const nxt = SB && SB.episodes.find(e => e.n === epN + 1);
      if (isPlayable(nxt)) loadEpisode(nxt.n, { play: true, resume: false });
      else showSampleEnd(true);
    });
  }

  fetch("storyboard.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
    SB = j;
    const st = store.get();
    const saved = SB.episodes.find(e => e.n === st.ep);
    const n = isPlayable(saved) ? saved.n : 1;
    loadEpisode(n, { play: false, resume: true }); ui();
  }).catch(() => { cap.textContent = "The audiobook could not be loaded. Please refresh the page."; });

  window.__omPlayer = { audio: au, get episode() { return epN; }, get art() { return stage.dataset.art; }, get cue() { return cur; } };  // for tests
})();
