/* Guestbook mount helpers.
   Hides the standby sheet once Hakanai Connect renders into #hakanai-connect.
   A soft key clack follows the home-page mute switch (localStorage jc-type-sound). */
(function () {
  var standby = document.getElementById("guestbook-standby");
  var slot = document.getElementById("hakanai-connect");

  function filled(el) {
    if (!el) return false;
    if (el.shadowRoot) return true;
    if (el.childElementCount > 0) return true;
    return !!((el.textContent || "").trim());
  }

  function sync() {
    if (!standby || !slot || !filled(slot)) return false;
    standby.hidden = true;
    slot.classList.add("is-live");
    return true;
  }

  if (slot && !sync()) {
    var mo = new MutationObserver(function () {
      if (sync()) mo.disconnect();
    });
    mo.observe(slot, { childList: true, subtree: true, characterData: true });
  }

  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var paper = document.querySelector(".guestbook-paper");
  if (!paper || reduce) return;

  var ctx = null;
  var last = 0;

  function muted() {
    try { return localStorage.getItem("jc-type-sound") === "0"; } catch (e) { return false; }
  }

  function clack() {
    if (muted()) return;
    var now = performance.now();
    if (now - last < 42) return;
    last = now;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160 + Math.random() * 90, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.028);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.035, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (err) {}
  }

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== " " && event.key !== "Enter" && event.key !== "Backspace" && event.key.length !== 1) return;
    var path = event.composedPath ? event.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      if (path[i] === paper) { clack(); return; }
    }
  });
})();
