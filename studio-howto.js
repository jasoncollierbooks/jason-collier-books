/* Oil Studio how-to video. Opens once on the first visit, and any time from
   the "How to paint" button. Painting code is untouched; closing the dialog
   leaves the studio exactly as it was. */
(function () {
  var KEY = "studioHowtoSeen";
  var dlg = document.getElementById("studio-howto");
  var openBtn = document.getElementById("studio-howto-open");
  if (!dlg || !openBtn) return;
  var video = dlg.querySelector("video");
  var playBtn = document.getElementById("studio-howto-play");
  var soundBtn = document.getElementById("studio-howto-sound");
  var againBtn = document.getElementById("studio-howto-again");
  var closeBtn = document.getElementById("studio-howto-close");
  var SRC = {
    p: { mp4: "assets/video/studio-howto-9x16.mp4", poster: "assets/video/studio-howto-9x16.jpg" },
    l: { mp4: "assets/video/studio-howto-16x9.mp4", poster: "assets/video/studio-howto-16x9.jpg" }
  };
  var hasModal = typeof dlg.showModal === "function";
  if (!hasModal) dlg.classList.add("howto-fallback");

  function shape() {
    var portrait = window.matchMedia && window.matchMedia("(orientation: portrait), (max-width: 760px)").matches;
    return portrait ? "p" : "l";
  }
  function show(state) {
    playBtn.hidden = state !== "paused";
    soundBtn.hidden = state !== "muted";
    againBtn.hidden = state !== "ended";
    closeBtn.textContent = state === "ended" ? "Start painting" : "Skip";
    closeBtn.classList.toggle("howto-primary", state === "ended");
  }
  function play(withSound) {
    if (withSound) video.muted = false;
    var p;
    try { p = video.play(); } catch (e) { show("paused"); return; }
    if (p && typeof p.then === "function") {
      p.then(function () { show(video.muted ? "muted" : "playing"); }, function () { show("paused"); });
    } else {
      show(video.muted ? "muted" : "playing");
    }
  }
  function open() {
    var k = shape();
    dlg.setAttribute("data-shape", k);
    if (video.getAttribute("data-k") !== k) {
      video.setAttribute("data-k", k);
      video.poster = SRC[k].poster;
      video.src = SRC[k].mp4;
    }
    try { video.currentTime = 0; } catch (e) { /* not loaded yet */ }
    video.muted = true;
    show("muted");
    if (hasModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    try { localStorage.setItem(KEY, "1"); } catch (e) { /* private mode */ }
    closeBtn.focus();
    play(false);
  }
  function close() {
    try { video.pause(); } catch (e) { /* ignore */ }
    if (hasModal) { if (dlg.open) dlg.close(); } else { dlg.removeAttribute("open"); onClosed(); }
  }
  function onClosed() {
    try { video.pause(); } catch (e) { /* ignore */ }
    openBtn.focus({ preventScroll: true });
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  dlg.addEventListener("close", onClosed);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  playBtn.addEventListener("click", function () { play(true); });
  soundBtn.addEventListener("click", function () {
    try { video.currentTime = 0; } catch (e) { /* ignore */ }
    play(true);
  });
  againBtn.addEventListener("click", function () {
    try { video.currentTime = 0; } catch (e) { /* ignore */ }
    play(!video.muted);
  });
  video.addEventListener("click", function () {
    if (video.paused) play(true);
    else { video.pause(); show("paused"); }
  });
  video.addEventListener("ended", function () { show("ended"); });
  video.addEventListener("pause", function () {
    if (!video.ended && (hasModal ? dlg.open : dlg.hasAttribute("open"))) show("paused");
  });
  video.addEventListener("play", function () { show(video.muted ? "muted" : "playing"); });

  var seen = false;
  try { seen = localStorage.getItem(KEY) === "1"; } catch (e) { seen = true; }
  if (!seen) open();
})();
