/* Seasonal look from the visitor's month. Override with ?season=halloween|thanksgiving|christmas. */
(function () {
  var override = "";
  try { override = new URLSearchParams(window.location.search).get("season") || ""; }
  catch (e) {}
  var season = "";
  if (override === "halloween" || override === "thanksgiving" || override === "christmas") season = override;
  else {
    var month = new Date().getMonth();
    if (month === 9) season = "halloween";
    else if (month === 10) season = "thanksgiving";
    else if (month === 11) season = "christmas";
  }
  if (!season) return;
  document.documentElement.classList.add("season-" + season);

  var LEAF = {
    halloween: ["#e3943c", "#d85a28", "#a34b22"],
    thanksgiving: ["#e07a2a", "#c4472a", "#8d5a2b", "#b86a32"]
  };

  function still() {
    if (document.documentElement.classList.contains("reduce-motion")) return true;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function spawn(kind, w, h, colors) {
    if (kind === "leaf") {
      var big = season === "thanksgiving";
      return { kind: kind, x: rand(0, w), y: rand(0, h), s: big ? rand(13, 22) : rand(9, 15), vy: rand(16, 30), sway: rand(12, 24), spin: rand(-0.8, 0.8), rot: rand(0, 6.28), t: rand(0, 6), a: rand(0.62, 0.88), color: pick(colors) };
    }
    if (kind === "bat") {
      return { kind: kind, x: rand(0, w), y: rand(h * 0.05, h * 0.8), s: rand(1.35, 1.85), vx: rand(22, 40) * (Math.random() < 0.5 ? -1 : 1), phase: rand(0, 6.28), a: rand(0.78, 0.95) };
    }
    return { kind: kind, x: rand(0, w), y: rand(0, h), s: rand(1.7, 3.3), vy: rand(16, 34), sway: rand(10, 22), t: rand(0, 6), a: rand(0.55, 0.9) };
  }

  function drawLeaf(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.15, p.s * 0.75, p.s * 0.45, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.75, p.s * 0.45, -p.s * 0.95, -p.s * 0.15, 0, -p.s);
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 42, 16, .4)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -p.s * 0.65);
    ctx.lineTo(0, p.s * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawBat(ctx, p, time) {
    var flap = Math.sin(time * 9 + p.phase);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.s, p.s);
    if (p.vx < 0) ctx.scale(-1, 1);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = "#1c1628";
    ctx.strokeStyle = "rgba(196, 176, 220, .45)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -11 - flap * 7, -18, 1);
    ctx.lineTo(-13, 2);
    ctx.quadraticCurveTo(-7, 4 + flap * 2, 0, 1);
    ctx.closePath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -11 - flap * 7, 18, 1);
    ctx.lineTo(13, 2);
    ctx.quadraticCurveTo(7, 4 + flap * 2, 0, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0.7, 2.3, 1.6, 0, 0, Math.PI * 2);
    ctx.moveTo(-1.3, -0.4);
    ctx.lineTo(-0.5, -3.1);
    ctx.lineTo(0.15, -0.2);
    ctx.moveTo(1.3, -0.4);
    ctx.lineTo(0.5, -3.1);
    ctx.lineTo(-0.15, -0.2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnow(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.fillStyle = "#fffaf2";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function Field(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "season-field";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    this.canvas = canvas;
    this.host = host;
    this.ctx = canvas.getContext("2d");
    this.parts = [];
    this.w = 1;
    this.h = 1;
    this.resize();
    this.seed();
  }

  Field.prototype.resize = function () {
    var rect = this.host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Field.prototype.seed = function () {
    var colors = LEAF[season] || LEAF.halloween;
    var plan = season === "christmas" ? { leaf: 0, bat: 0, snow: 12 } : season === "halloween" ? { leaf: 6, bat: 4, snow: 0 } : { leaf: 8, bat: 0, snow: 0 };
    var kind, n, i;
    this.parts = [];
    for (kind in plan) {
      for (i = 0, n = plan[kind]; i < n; i++) this.parts.push(spawn(kind, this.w, this.h, colors));
    }
  };

  Field.prototype.step = function (dt, time) {
    var ctx = this.ctx, w = this.w, h = this.h, i, p;
    ctx.clearRect(0, 0, w, h);
    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i];
      if (p.kind === "leaf") {
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t * 1.3) * p.sway * dt;
        p.rot += p.spin * dt;
        if (p.y > h + 14) { p.y = -14; p.x = rand(0, w); }
        if (p.x < -14) p.x = w + 14;
        if (p.x > w + 14) p.x = -14;
        drawLeaf(ctx, p);
      } else if (p.kind === "bat") {
        p.x += p.vx * dt;
        p.y += Math.sin(time * 1.4 + p.phase) * 8 * dt;
        if (p.x < -18) p.x = w + 18;
        if (p.x > w + 18) p.x = -18;
        if (p.y < 6) p.y = 6;
        if (p.y > h - 6) p.y = h - 6;
        drawBat(ctx, p, time);
      } else {
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t) * p.sway * dt;
        if (p.y > h + 4) { p.y = -4; p.x = rand(0, w); }
        drawSnow(ctx, p);
      }
    }
  };

  function lantern(hue) {
    return '<svg viewBox="0 0 36 42" aria-hidden="true"><ellipse cx="18" cy="38" rx="9" ry="2.4" fill="rgba(255,150,40,.35)"/><path fill="#3c7a34" d="M18 5.2c.4 1.8 1.5 2.8 2.8 3-1.2.2-2 0-2.6-.9-.5 1-1.4 1.1-2.4.9 1-.6 1.6-1.6 2.2-3z"/><path fill="' + hue + '" d="M18 9.2c-2.2 0-3.2.9-3.6 1.8C10.6 12 7.4 15 7.4 21 7.4 27.2 11.6 32.4 18 32.4S28.6 27.2 28.6 21c0-6-3.2-9-7-9.9-.4-.9-1.4-1.9-3.6-1.9z"/><path fill="#2a160c" d="M13 18.2h2.4l-1.2 2.4zm7.6 0H23l-1.2 2.4zM14.6 24c.9 1.3 6 1.3 6.8 0-.9.9-5 .9-5.9 0z"/></svg>';
  }
  function gourd(fill) {
    return '<svg viewBox="0 0 36 42" aria-hidden="true"><path fill="#6d8a3a" d="M18 6c.3 2 1.2 3 2.2 3.2-1 .2-1.6 0-2-.8-.4.8-1 1-1.8.8.8-.5 1.2-1.4 1.6-3.2z"/><path fill="' + fill + '" d="M18 10c-3 0-5 2-5 4.2 0 1.6 1.2 2.6 2.2 3.2-2.4.8-4.2 2.6-4.2 5.4 0 3.6 3.2 6.4 7 6.4s7-2.8 7-6.4c0-2.8-1.8-4.6-4.2-5.4 1-.6 2.2-1.6 2.2-3.2 0-2.2-2-4.2-5-4.2z"/><path fill="rgba(255,255,255,.18)" d="M15 14c.6 1.2.4 4 0 6-1-.4-1.6-1.4-1.6-2.8 0-1.4.6-2.4 1.6-3.2z"/></svg>';
  }
  function wheat() {
    return '<svg viewBox="0 0 36 42" aria-hidden="true"><path stroke="#c4a15a" stroke-width="1.4" fill="none" d="M18 38c.2-8 .2-16 0-26"/><g fill="#e0b45a"><ellipse cx="18" cy="12" rx="2.2" ry="3.4"/><ellipse cx="13.4" cy="16" rx="2.1" ry="3" transform="rotate(-28 13.4 16)"/><ellipse cx="22.6" cy="16" rx="2.1" ry="3" transform="rotate(28 22.6 16)"/><ellipse cx="13.2" cy="21" rx="2" ry="2.8" transform="rotate(-26 13.2 21)"/><ellipse cx="22.8" cy="21" rx="2" ry="2.8" transform="rotate(26 22.8 21)"/><ellipse cx="13.8" cy="26" rx="1.8" ry="2.5" transform="rotate(-22 13.8 26)"/><ellipse cx="22.2" cy="26" rx="1.8" ry="2.5" transform="rotate(22 22.2 26)"/></g></svg>';
  }

  function mountDecor(hero) {
    if (season === "halloween" || season === "thanksgiving") {
      var ledge = document.createElement("div");
      ledge.className = "season-ledge";
      ledge.setAttribute("aria-hidden", "true");
      ledge.innerHTML = season === "halloween"
        ? lantern("#e57a22") + lantern("#d86818") + lantern("#ef8a30") + lantern("#e07020")
        : lantern("#e07a28") + wheat() + gourd("#c46a32") + wheat() + gourd("#7d8f3e");
      hero.appendChild(ledge);
    }
    if (season === "halloween") {
      var fog = document.createElement("div");
      fog.className = "season-fog";
      fog.setAttribute("aria-hidden", "true");
      hero.appendChild(fog);
    }
    if (season === "christmas") {
      var drift = document.createElement("div");
      drift.className = "season-drift";
      drift.setAttribute("aria-hidden", "true");
      hero.appendChild(drift);
    }
  }

  function boot() {
    var hero = document.querySelector(".hero");
    if (hero) mountDecor(hero);
    if (still()) return;
    var hosts = document.querySelectorAll(".hero .testcard, .hero .scene");
    if (!hosts.length) return;
    var fields = [];
    var i;
    for (i = 0; i < hosts.length; i++) fields.push(new Field(hosts[i]));
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () {
        for (i = 0; i < fields.length; i++) fields[i].resize();
      });
      for (i = 0; i < hosts.length; i++) ro.observe(hosts[i]);
    } else {
      window.addEventListener("resize", function () {
        for (i = 0; i < fields.length; i++) fields[i].resize();
      });
    }
    var last = 0;
    var on = true;
    document.addEventListener("visibilitychange", function () { on = document.visibilityState !== "hidden"; });
    function frame(now) {
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (on) {
        for (var n = 0; n < fields.length; n++) fields[n].step(dt, now / 1000);
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
