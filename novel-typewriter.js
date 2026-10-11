/* The multi-mind novel in a vintage typewriter: a sheet rising out of the platen, a bank of round keys,
   a sliding carriage, a bell near the margin and a return lever. The hidden textarea (#novel-draft)
   stays the single source of truth, so novel.js keeps doing the checking, saving and stacking. */
(function () {
  var $ = function (i) { return document.getElementById(i); };
  var draft = $("novel-draft"), keys = $("tw-keys"), sheet = $("tw-sheet"), win = $("tw-window");
  if (!draft || !keys || !sheet) return;
  var storyEl = $("tw-story"), draftEl = $("tw-draft"), bar = $("tw-bar");
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var shift = false, belled = -1;

  /* ---- sound ---- */
  var AC = null;
  function ctx() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch (e) { return null; } }
  function muted() { try { return localStorage.getItem("jc-type-sound") === "0"; } catch (e) { return false; } }
  function noise(c, len, freq, q, vol, t0) {
    var b = c.createBuffer(1, Math.max(1, c.sampleRate * len | 0), c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0 || c.currentTime); return f;
  }
  function clack(heavy) {
    if (muted()) return; var c = ctx(); if (!c) return; var t = c.currentTime;
    noise(c, 0.035, 2600 + Math.random() * 900, 1.2, heavy ? 0.9 : 0.7, t);
    noise(c, 0.06, 420 + Math.random() * 80, 2, heavy ? 0.7 : 0.45, t + 0.004);
  }
  function ding() {
    if (muted()) return; var c = ctx(); if (!c) return; var t = c.currentTime;
    [2093, 4186 * 1.01].forEach(function (fr, i) {
      var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.03 : 0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1.25);
    });
  }
  function zip() {
    if (muted()) return; var c = ctx(); if (!c) return; var t = c.currentTime;
    var f = noise(c, 0.38, 900, 0.8, 0.5, t); f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.34);
    noise(c, 0.07, 300, 2, 0.8, t + 0.36);
  }

  /* ---- the key bank ---- */
  var ROWS = [
    "1234567890".split(""),
    "qwertyuiop".split(""),
    "asdfghjkl'".split(""),
    ["SHIFT"].concat("zxcvbnm,.".split("")).concat(["BACK"]),
    ["?", "!", "-", "SPACE", "\"", "RETURN"]
  ];
  var LABEL = { SHIFT: "⇧", BACK: "⌫", SPACE: "", RETURN: "⏎" };
  var NAME = { SHIFT: "Shift", BACK: "Backspace", SPACE: "Space", RETURN: "Carriage return" };
  keys.innerHTML = ROWS.map(function (r, ri) {
    return '<div class="tw-row r' + ri + '">' + r.map(function (k) {
      var cls = "tw-key" + (k.length > 1 ? " tw-" + k.toLowerCase() : "");
      var lab = LABEL[k] !== undefined ? LABEL[k] : k;
      return '<button type="button" class="' + cls + '" data-k="' + (k === "\"" ? "&quot;" : k) + '" aria-label="' + (NAME[k] || (k === "\"" ? "quote" : k)) + '"><span>' + (lab === "\"" ? "&quot;" : lab) + "</span></button>";
    }).join("") + "</div>";
  }).join("");

  function autoShift() { var v = draft.value; return !v.trim() || /[.!?]["']?\s+$/.test(v) || /\n$/.test(v); }
  function syncShift() { var on = shift || autoShift(); keys.classList.toggle("caps", on); var s = keys.querySelector(".tw-shift"); if (s) s.classList.toggle("on", shift); }
  function setValue(v) {
    draft.value = v;
    draft.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function strike() {
    if (!bar || reduce) return; bar.classList.remove("hit"); void bar.offsetWidth; bar.classList.add("hit");
  }
  function press(k) {
    var v = draft.value;
    if (k === "SHIFT") { shift = !shift; clack(); syncShift(); return; }
    if (k === "BACK") { if (v) setValue(v.slice(0, -1)); clack(); }
    else if (k === "RETURN") { carriageReturn(); return; }
    else {
      var ch = k === "SPACE" ? " " : k;
      if (ch.length === 1 && /[a-z]/.test(ch) && (shift || autoShift())) ch = ch.toUpperCase();
      var before = v.length; setValue(v + ch);
      if (draft.value.length === before) { clack(true); flashFull(); }   /* the page is full */
      else { clack(k === "SPACE" ? false : true); if (k !== "SPACE") strike(); }
      shift = false;
    }
    syncShift(); render();
  }
  function carriageReturn() {
    var v = draft.value, before = v.length;
    if (v && !/\n$/.test(v)) setValue(v + "\n");
    zip(); setTimeout(ding, 40);
    var lever = $("tw-return"); if (lever && !reduce) { lever.classList.remove("pull"); void lever.offsetWidth; lever.classList.add("pull"); }
    syncShift(); render(true);
  }
  function flashFull() { var m = $("novel-meter"); if (m) { m.classList.remove("flash"); void m.offsetWidth; m.classList.add("flash"); } }

  function keyEl(k) { return keys.querySelector('[data-k="' + (k === "\"" ? '\\"' : k) + '"]'); }
  function down(el) { if (!el) return; el.classList.add("down"); setTimeout(function () { el.classList.remove("down"); }, reduce ? 60 : 110); }
  keys.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".tw-key"); if (!b) return;
    e.preventDefault(); down(b); press(b.getAttribute("data-k"));
  });
  keys.addEventListener("click", function (e) { if (e.detail === 0) { var b = e.target.closest(".tw-key"); if (b) { down(b); press(b.getAttribute("data-k")); } } }); /* keyboard / switch access */
  var lever = $("tw-return"); if (lever) lever.addEventListener("click", carriageReturn);

  /* a real keyboard drives the key bank when the page has focus */
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var a = document.activeElement; if (a && (a === draft || /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
    if (a && a.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
    var k = e.key;
    if (k === "Backspace") k = "BACK"; else if (k === "Enter") k = "RETURN"; else if (k === " ") k = "SPACE";
    else if (k.length !== 1) return;
    e.preventDefault();
    var lower = k.length === 1 ? k.toLowerCase() : k;
    down(keyEl(lower) || keyEl(k));
    if (k.length === 1) {
      var v = draft.value, before = v.length; setValue(v + k);
      if (draft.value.length === before) flashFull(); else { clack(true); strike(); }
      shift = false; syncShift(); render();
    } else press(k);
  });

  /* native keyboard fallback */
  var nat = $("tw-native");
  if (nat) nat.addEventListener("click", function () {
    var on = draft.getAttribute("data-native") !== "1";
    draft.setAttribute("data-native", on ? "1" : "0");
    draft.classList.toggle("tw-hidden-input", !on);
    nat.textContent = on ? "⌨ Back to the typewriter keys" : "⌨ Use my phone’s keyboard instead";
    if (on) draft.focus(); else draft.blur();
  });
  draft.addEventListener("input", function () { syncShift(); render(); });

  /* ---- the paper ---- */
  function cols() { var c = parseInt(getComputedStyle(sheet).getPropertyValue("--cols"), 10); return c > 10 ? c : 32; }
  function wrap(text, n) {
    var out = [];
    text.split("\n").forEach(function (para) {
      var line = "";
      para.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if ((line + w).length <= n) { line += w; return; }
        if (/^\s+$/.test(w)) { out.push(line); line = ""; return; }
        if (line) out.push(line.replace(/\s+$/, ""));
        while (w.length > n) { out.push(w.slice(0, n)); w = w.slice(n); }
        line = w;
      });
      out.push(line);
    });
    return out;
  }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  var chW = 0;
  function measure() { var m = document.createElement("span"); m.className = "tw-measure"; m.textContent = "0000000000"; sheet.appendChild(m); chW = m.getBoundingClientRect().width / 10; m.remove(); }
  var lastStory = "";
  function renderStory() {
    if (!storyEl || !window.JCNovel) return;
    var list = window.JCNovel.pages(), h = "";
    list.forEach(function (p, i) { h += '<p class="tw-pno">— ' + (i + 1) + " —</p><p>" + esc(p.text) + "</p>"; });
    if (h !== lastStory) { storyEl.innerHTML = h; lastStory = h; }
  }
  function render(ret) {
    renderStory();
    var n = cols(), lines = wrap(draft.value, n), last = lines[lines.length - 1] || "", col = last.length;
    draftEl.innerHTML = lines.map(function (l, i) { return "<div>" + (esc(l) || "&nbsp;") + (i === lines.length - 1 ? '<i class="tw-caret"></i>' : "") + "</div>"; }).join("");
    if (col >= n - 5 && belled !== lines.length) { belled = lines.length; ding(); }
    if (col < n - 5 && belled === lines.length) belled = -1;
    if (!chW) measure();
    /* the carriage: the sheet slides so the typing point stays at the type guide */
    var x = (n / 2 - col) * chW;
    sheet.style.transitionDuration = reduce ? "0s" : (ret ? ".38s" : ".07s");
    sheet.style.transform = "translateX(" + x.toFixed(1) + "px)";
    win.scrollTop = win.scrollHeight;
  }
  var mo = window.MutationObserver && new MutationObserver(function () { render(); });
  var pile = $("novel-stack"); if (mo && pile) mo.observe(pile, { childList: true });
  addEventListener("resize", function () { chW = 0; render(); });
  syncShift();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { chW = 0; render(); });
  setTimeout(render, 50);
  window.JCTypewriter = { press: press, render: render };
})();
