/* Multi-mind novel.
   One shared manuscript: the open page is typed, then stacked.
   JCNovelStorage is the shelf. The functions below keep pages in
   localStorage on this browser only. That is not site-wide.
   Replace loadSharedPages and saveSharedPage when a shared host
   is ready (a free guest host, a Cloudflare worker, or similar).
   They should return and append the same page list for every visitor.
   Page shape: { id: string, text: string, at: number } */
(function (root) {
  var STEMS = [
    "fuck", "motherfuck", "shit", "bitch", "asshole", "bastard", "dick",
    "pussy", "cunt", "whore", "slut", "piss", "cock", "nigger", "nigga",
    "faggot", "fag", "retard"
  ];
  var SUFFIXES = ["", "s", "es", "ed", "er", "ers", "ing", "y", "in", "ty", "head"];

  function leet(s) {
    return String(s || "").toLowerCase()
      .replace(/[@4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[$5]/g, "s")
      .replace(/[7]/g, "t");
  }

  function collapse(s) {
    return s.replace(/([a-z])\1{2,}/g, "$1$1");
  }

  function squeeze(s) {
    return s.replace(/([a-z])\1+/g, "$1");
  }

  function wordHits(word) {
    var forms = [word, squeeze(word)];
    var f, i, j, stem, suf;
    for (f = 0; f < forms.length; f++) {
      for (i = 0; i < STEMS.length; i++) {
        stem = STEMS[i];
        for (j = 0; j < SUFFIXES.length; j++) {
          suf = stem + SUFFIXES[j];
          if (forms[f] === suf) return true;
        }
      }
    }
    return false;
  }

  function spacedHit(text) {
    var raw = leet(text);
    var i, stem, pattern, re, parts, p, filled, v, vowels;
    for (i = 0; i < STEMS.length; i++) {
      stem = STEMS[i];
      if (stem.length < 4) continue;
      pattern = stem.split("").join("[^a-z]{0,3}");
      re = new RegExp("(^|[^a-z])" + pattern + "([^a-z]|$)", "i");
      if (re.test(raw)) return true;
    }
    parts = String(text || "").split(/\s+/);
    vowels = ["a", "e", "i", "o", "u"];
    for (p = 0; p < parts.length; p++) {
      if (!/[^a-z]/i.test(parts[p])) continue;
      for (v = 0; v < vowels.length; v++) {
        filled = squeeze(leet(parts[p]).replace(/[^a-z]+/g, vowels[v]));
        if (wordHits(filled)) return true;
      }
    }
    return false;
  }

  function unclean(text) {
    var norm = collapse(leet(text).replace(/[^a-z]+/g, " "));
    var words = norm.split(/\s+/);
    var i;
    for (i = 0; i < words.length; i++) {
      if (words[i] && wordHits(words[i])) return true;
    }
    return spacedHit(text);
  }

  root.JCNovelFilter = { unclean: unclean };

  var SEED = [
    {
      id: "seed-1",
      at: 0,
      seed: true,
      text: "The river was low enough to show the stones. A lantern moved on the far bank, though nobody stood under it. The wagon had stopped where the road gave out, and the paper in the machine was still warm from the day. Whoever finds this page is not the first hand on it, and will not be the last."
    },
    {
      id: "seed-2",
      at: 1,
      seed: true,
      text: "The lantern stopped, as if it were listening. Wind laid the grass down in one direction, the way a sentence leans toward an ending it has not chosen. The next page is blank on purpose. Sit down. Help write it. Keep the story clean."
    }
  ];

  var STORAGE_KEY = "jc-novel-pages-v1";

  root.JCNovelStorage = root.JCNovelStorage || {
    async loadSharedPages() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        var data = raw ? JSON.parse(raw) : [];
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },
    async saveSharedPage(page) {
      var pages = [];
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        var data = raw ? JSON.parse(raw) : [];
        if (Array.isArray(data)) pages = data;
      } catch (e) {}
      pages.push(page);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pages)); } catch (err) {}
      return page;
    }
  };

  if (!root.document) return;

  var MIN_CHARS = 80;
  var MAX_CHARS = 760;
  var draft = document.getElementById("novel-draft");
  var finishBtn = document.getElementById("novel-finish");
  var hearBtn = document.getElementById("novel-hear");
  var stopBtn = document.getElementById("novel-stop");
  var wordsBtn = document.getElementById("novel-words");
  var blockEl = document.getElementById("novel-block");
  var meter = document.getElementById("novel-meter");
  var pageNo = document.getElementById("novel-page-no");
  var pile = document.getElementById("novel-stack");
  var caption = document.getElementById("novel-caption");
  var paper = document.querySelector(".novel-paper");
  var storage = root.JCNovelStorage;
  var extra = [];
  var lastGood = "";
  var locking = false;
  var showWords = false;
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function pages() {
    return SEED.concat(extra);
  }

  function sanitize(list) {
    var out = [];
    var i, item, text;
    if (!Array.isArray(list)) return out;
    for (i = 0; i < list.length; i++) {
      item = list[i];
      if (!item || typeof item.text !== "string") continue;
      text = item.text.replace(/\s+/g, " ").trim();
      if (text.length < MIN_CHARS || unclean(text)) continue;
      if (item.seed || String(item.id || "").indexOf("seed-") === 0) continue;
      out.push({
        id: String(item.id || ("p-" + i)),
        text: text.slice(0, MAX_CHARS),
        at: Number(item.at) || Date.now()
      });
    }
    return out;
  }

  function setBlock(on) {
    if (!blockEl) return;
    blockEl.classList.toggle("is-on", !!on);
    blockEl.hidden = !on;
  }

  function fits() {
    if (!draft) return true;
    if (draft.value.length > MAX_CHARS) return false;
    return draft.scrollHeight <= draft.clientHeight + 2;
  }

  function updateMeter() {
    var left = MAX_CHARS - (draft ? draft.value.length : 0);
    var n = pages().length + 1;
    var dirty = draft && unclean(draft.value);
    if (pageNo) pageNo.textContent = "Open page " + n;
    if (!meter) return;
    if (dirty) {
      meter.textContent = "This page cannot join the stack until the curses are gone.";
      return;
    }
    if (draft && draft.value.trim().length < MIN_CHARS) {
      meter.textContent = "Write a little more, then finish the page. " + left + " characters of room left.";
      return;
    }
    meter.textContent = left + " characters of room left on this page.";
  }

  function updateFinish() {
    if (!finishBtn || !draft) return;
    var text = draft.value.trim();
    var dirty = unclean(draft.value);
    finishBtn.disabled = locking || dirty || text.length < MIN_CHARS;
    setBlock(dirty && draft.value.length > 0);
    updateMeter();
  }

  function trimToFit(value) {
    var previous = draft.value;
    var next = value.slice(0, MAX_CHARS);
    draft.value = next;
    if (fits()) return next;
    while (next.length && !fits()) {
      next = next.slice(0, -1);
      draft.value = next;
    }
    if (!next) draft.value = previous;
    return draft.value;
  }

  function onDraft() {
    if (locking) return;
    var wanted = draft.value;
    if (!fits()) {
      var kept = trimToFit(lastGood.length ? lastGood : wanted);
      if (wanted.length > kept.length && kept.trim().length >= MIN_CHARS && !unclean(kept)) {
        draft.value = kept;
        lastGood = kept;
        updateFinish();
        finishPage(true);
        return;
      }
      draft.value = lastGood && lastGood.length <= wanted.length ? trimToFit(lastGood) : trimToFit(wanted);
    }
    lastGood = draft.value;
    updateFinish();
  }

  function newId() {
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function finishPage(auto) {
    if (locking || !draft) return;
    var text = draft.value.replace(/\s+/g, " ").trim();
    if (unclean(draft.value) || unclean(text)) {
      setBlock(true);
      updateFinish();
      return;
    }
    if (text.length < MIN_CHARS) {
      updateFinish();
      return;
    }
    text = text.slice(0, MAX_CHARS);
    locking = true;
    updateFinish();
    var page = { id: newId(), text: text, at: Date.now() };
    var done = function () {
      extra.push(page);
      draft.value = "";
      lastGood = "";
      locking = false;
      if (paper) {
        paper.classList.remove("is-leaving");
        paper.classList.add("is-fresh");
        window.setTimeout(function () { paper.classList.remove("is-fresh"); }, reduce ? 0 : 500);
      }
      renderPile();
      updateFinish();
      if (draft) draft.focus();
    };
    var run = function () {
      Promise.resolve(storage.saveSharedPage(page)).then(done).catch(done);
    };
    if (paper && !reduce) {
      paper.classList.add("is-leaving");
      window.setTimeout(run, auto ? 420 : 520);
    } else run();
  }

  function firstBit(text, max) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    if (t.length <= max) return t;
    var cut = t.slice(0, max);
    var p = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    if (p > 40) return cut.slice(0, p + 1);
    return cut.replace(/\s+\S*$/, "") + ".";
  }

  function scriptFor(list, index) {
    var bits, i;
    if (!list.length) {
      return "The novel stack is waiting for its first finished page. The open page is ready.";
    }
    if (index == null) {
      bits = [];
      for (i = 0; i < list.length; i++) {
        bits.push("Page " + (i + 1) + ". " + firstBit(list[i].text, 280));
      }
      return "Here is the story so far in the multi-mind novel. " + bits.join(" ") + " The open page is ready for the next writer.";
    }
    var prior = "";
    if (index > 0) {
      bits = [];
      for (i = 0; i < index; i++) {
        bits.push("page " + (i + 1) + " opened with " + firstBit(list[i].text, 140));
      }
      prior = "Before this, " + bits.join(". ") + ". ";
    }
    return "Page " + (index + 1) + " of the shared manuscript. " + prior + "This page says: " + list[index].text.trim();
  }

  function captionOn(text, force) {
    if (!caption) return;
    if (!showWords && !force) {
      caption.classList.remove("is-on");
      caption.hidden = true;
      caption.textContent = "";
      return;
    }
    caption.hidden = false;
    caption.classList.add("is-on");
    caption.textContent = text;
  }

  function setSpeaking(on) {
    if (hearBtn) hearBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (stopBtn) stopBtn.hidden = !on;
    if (hearBtn) hearBtn.hidden = !!on;
  }

  function pickVoice() {
    var synth = root.speechSynthesis;
    if (!synth || !synth.getVoices) return null;
    var voices = synth.getVoices() || [];
    var en = [];
    var i;
    for (i = 0; i < voices.length; i++) {
      if (/^en/i.test(voices[i].lang || "")) en.push(voices[i]);
    }
    for (i = 0; i < en.length; i++) {
      if (/natural|samantha|google uk english female|aria|jenny/i.test(en[i].name || "")) return en[i];
    }
    return en[0] || voices[0] || null;
  }

  function speak(text) {
    captionOn(text, false);
    if (!root.speechSynthesis || !root.SpeechSynthesisUtterance) {
      captionOn(text, true);
      setSpeaking(false);
      return;
    }
    var synth = root.speechSynthesis;
    try { synth.cancel(); } catch (e) {}
    var utter = new root.SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    var voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.onstart = function () { setSpeaking(true); };
    utter.onend = function () { setSpeaking(false); };
    utter.onerror = function () {
      setSpeaking(false);
      if (!document.querySelector(".novel-sheet.is-open")) captionOn(text, true);
    };
    setSpeaking(true);
    try {
      if (synth.resume) synth.resume();
      synth.speak(utter);
    } catch (err) {
      setSpeaking(false);
      captionOn(text, true);
    }
  }

  function stopSpeak() {
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) {}
    setSpeaking(false);
  }

  function renderPile() {
    if (!pile) return;
    var list = pages();
    pile.textContent = "";
    var i, page, btn, no, peek;
    for (i = list.length - 1; i >= 0; i--) {
      page = list[i];
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "novel-sheet";
      btn.style.setProperty("--i", String(i));
      btn.dataset.index = String(i);
      no = document.createElement("span");
      no.className = "novel-sheet-no";
      no.textContent = "Page " + (i + 1);
      peek = document.createElement("span");
      peek.className = "novel-sheet-peek";
      peek.textContent = firstBit(page.text, 90);
      btn.appendChild(no);
      btn.appendChild(peek);
      btn.addEventListener("click", function (event) {
        var button = event.currentTarget;
        var idx = Number(button.dataset.index);
        var open = button.classList.contains("is-open");
        var sheets = pile.querySelectorAll(".novel-sheet");
        var s, leftover;
        for (s = 0; s < sheets.length; s++) {
          sheets[s].classList.remove("is-open");
          leftover = sheets[s].querySelector(".novel-sheet-full");
          if (leftover) leftover.remove();
        }
        if (open) {
          stopSpeak();
          return;
        }
        button.classList.add("is-open");
        var full = document.createElement("span");
        full.className = "novel-sheet-full";
        full.textContent = list[idx].text;
        button.appendChild(full);
        speak(scriptFor(list, idx));
      });
      pile.appendChild(btn);
    }
  }

  function mutedType() {
    try { return localStorage.getItem("jc-type-sound") === "0"; } catch (e) { return false; }
  }

  var audioCtx = null;
  var lastClack = 0;
  function clack() {
    if (reduce || mutedType()) return;
    var now = performance.now();
    if (now - lastClack < 42) return;
    lastClack = now;
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended" && audioCtx.resume) audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160 + Math.random() * 90, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.028);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (err) {}
  }

  if (draft) {
    draft.addEventListener("input", function () {
      if (!showWords) captionOn("", false);
      onDraft();
    });
    draft.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        finishPage(false);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " || event.key === "Enter" || event.key === "Backspace" || event.key.length === 1) clack();
    });
  }
  if (finishBtn) finishBtn.addEventListener("click", function () { finishPage(false); });
  if (hearBtn) hearBtn.addEventListener("click", function () { speak(scriptFor(pages(), null)); });
  if (stopBtn) stopBtn.addEventListener("click", stopSpeak);
  if (wordsBtn) {
    wordsBtn.addEventListener("click", function () {
      showWords = !showWords;
      wordsBtn.setAttribute("aria-pressed", showWords ? "true" : "false");
      wordsBtn.textContent = showWords ? "Hide the words" : "Show the words";
      if (!showWords) captionOn("", false);
    });
  }
  if (root.speechSynthesis && root.speechSynthesis.addEventListener) {
    root.speechSynthesis.addEventListener("voiceschanged", function () {});
  }

  updateFinish();
  Promise.resolve(storage.loadSharedPages()).then(function (list) {
    extra = sanitize(list);
    renderPile();
    updateFinish();
  }).catch(function () {
    extra = [];
    renderPile();
    updateFinish();
  });
})(typeof window !== "undefined" ? window : globalThis);
